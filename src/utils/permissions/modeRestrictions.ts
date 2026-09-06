import { lstat, realpath } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import type { Tool, ToolUseContext } from '../../Tool.js'
import { bashCommandIsSafe_DEPRECATED } from '../../tools/BashTool/bashSecurity.js'
import { stripWrappersFromArgv } from '../../tools/BashTool/pathValidation.js'
import { resolveToCanonical } from '../../tools/PowerShellTool/readOnlyValidation.js'
import { parseForSecurity } from '../bash/ast.js'
import { tryParseShellCommand } from '../bash/shellQuote.js'
import { getPlanFilePath } from '../plans.js'
import { getAllCommands, parsePowerShellCommand } from '../powershell/parser.js'
import { DANGEROUS_BASH_PATTERNS } from './dangerousPatterns.js'
import type { PermissionDecision } from './PermissionResult.js'

const PLANNING_INTERACTIONS = new Set(['EnterPlanMode', 'ExitPlanMode', 'AskUserQuestion', 'TodoWrite'])
const DELETION_COMMANDS = new Set(['rm', 'rmdir', 'unlink', 'shred', 'trash', 'remove-item', 'clear-content'])
const EXTERNAL_COMMANDS = new Set(['curl', 'wget', 'http', 'https', 'scp', 'rsync', 'mail', 'mailx', 'sendmail', 'send-mailmessage', 'invoke-restmethod', 'invoke-webrequest'])

function argvNeedsApproval(rawArgv: string[]): boolean {
  const argv = stripWrappersFromArgv(rawArgv)
  const command = basename(argv[0] || '').toLowerCase().replace(/\.(exe|cmd|bat|com)$/, '')
  const args = argv.slice(1)
  if (DELETION_COMMANDS.has(command) || EXTERNAL_COMMANDS.has(command)) return true
  if (['pwsh', 'powershell', 'cmd', 'wsl', 'invoke-expression', 'invoke-command', 'start-process'].includes(command)) return true
  if (DANGEROUS_BASH_PATTERNS.some(pattern => {
    const [name, subcommand] = pattern.split(' ')
    return command === name && (!subcommand || args.includes(subcommand))
  })) return true
  if ((argv[0] || '').includes('/') || (argv[0] || '').includes('\\')) return true
  if (command === 'find' && args.some(arg => ['-delete', '-exec', '-execdir', '-ok', '-okdir'].includes(arg))) return true
  if (command === 'git' && args.some(arg => ['rm', 'clean', 'reset', 'restore', 'checkout', 'push', 'send-email'].includes(arg))) return true
  if (['npm', 'pnpm', 'yarn', 'bun', 'cargo', 'uv', 'poetry', 'dotnet'].includes(command) && args.some(arg => ['publish', 'unpublish', 'deploy'].includes(arg))) return true
  // These clients can write remote state or execute code through subcommands.
  if (['gh', 'glab', 'aws', 'gcloud', 'gsutil', 'kubectl', 'vercel', 'netlify', 'wrangler'].includes(command)) return true
  return false
}

async function shellNeedsApproval(tool: Tool, input: Record<string, unknown>): Promise<boolean> {
  const command = typeof input.command === 'string' ? input.command : ''
  if (!command) return true
  if (tool.name === 'PowerShell') {
    const parsed = await parsePowerShellCommand(command)
    if (!parsed.valid) return true
    if (parsed.hasStopParsing || parsed.hasUsingStatements || parsed.hasScriptRequirements || parsed.typeLiterals?.length) return true
    if (parsed.statements.some(statement => Object.values(statement.securityPatterns || {}).some(Boolean))) return true
    const commands = getAllCommands(parsed)
    return commands.length === 0 || commands.some(cmd => argvNeedsApproval([resolveToCanonical(cmd.name), ...cmd.args]))
  }
  const parsed = await parseForSecurity(command)
  if (parsed.kind === 'simple') {
    return parsed.commands.some(cmd => argvNeedsApproval(cmd.argv))
  }
  if (parsed.kind === 'too-complex') return true
  // External builds may not contain tree-sitter. Use the existing shell parser
  // only for literal, single commands; substitutions and operators need a human.
  if (bashCommandIsSafe_DEPRECATED(command).behavior !== 'passthrough') return true
  const fallback = tryParseShellCommand(command, name => `$${name}`)
  if (!fallback.success || fallback.tokens.some(token => typeof token !== 'string')) return true
  return argvNeedsApproval(fallback.tokens as string[])
}

async function isCurrentPlanFile(input: Record<string, unknown>, context: ToolUseContext): Promise<boolean> {
  if (typeof input.file_path !== 'string') return false
  const expected = resolve(getPlanFilePath(context.agentId))
  if (resolve(input.file_path) !== expected) return false
  try {
    // A plan file must not redirect a permitted write into a project file.
    const stat = await lstat(expected)
    if (stat.isSymbolicLink() || stat.nlink > 1) return false
    return await realpath(expected) === resolve(await realpath(dirname(expected)), basename(expected))
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
  }
}

/** Product-mode restrictions apply after rules and before any auto-allow path. */
export async function checkModeRestrictions(
  tool: Tool,
  input: Record<string, unknown>,
  context: ToolUseContext,
): Promise<PermissionDecision | null> {
  const permissions = context.getAppState().toolPermissionContext
  if (permissions.mode !== 'auto' && permissions.mode !== 'plan') return null
  const readOnly = tool.isReadOnly?.(input) === true && tool.isDestructive?.(input) !== true
  const shell = tool.name === 'Bash' || tool.name === 'PowerShell'

  if (permissions.mode === 'plan') {
    if (PLANNING_INTERACTIONS.has(tool.name)) return null
    if ((tool.name === 'Edit' || tool.name === 'Write') && await isCurrentPlanFile(input, context)) return null
    // Agent can create worktrees and override its parent's permission mode.
    if (tool.name !== 'Agent' && readOnly) return null
    return {
      behavior: 'deny',
      message: 'Planning does not allow project changes or non-read-only operations. Ask the user to approve the plan before executing it.',
      decisionReason: { type: 'mode', mode: 'plan' },
    }
  }

  const requiresApproval = tool.isDestructive?.(input) === true ||
    (tool.isMcp === true && !readOnly) ||
    (shell && !readOnly && await shellNeedsApproval(tool, input))
  if (!requiresApproval) return null
  return {
    behavior: permissions.shouldAvoidPermissionPrompts ? 'deny' : 'ask',
    updatedInput: input,
    message: 'This operation may delete files, publish or send data, or execute code whose effects need review. Please approve this operation explicitly.',
    decisionReason: { type: 'safetyCheck', reason: 'Automatic approval requires a human for this operation', classifierApprovable: false },
  }
}
