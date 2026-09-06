import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm, symlink, link } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Tool, ToolUseContext } from '../../Tool.js'
import { getEmptyToolPermissionContext } from '../../Tool.js'

const directory = await mkdtemp(join(tmpdir(), 'sciencex-mode-restrictions-'))
const planFile = join(directory, 'plans', 'current.md')
const actualPlans = await import('../plans.js')
mock.module('../plans.js', () => ({ ...actualPlans, getPlanFilePath: () => planFile }))
const actualPowerShell = await import('../powershell/parser.js')
mock.module('../powershell/parser.js', () => ({
  ...actualPowerShell,
  parsePowerShellCommand: async (command: string) => ({
    valid: command !== 'invalid', errors: [],
    statements: [{
      commands: [{ name: command, args: ['experiment.csv'] }],
      securityPatterns: { hasMemberInvocations: command === 'dotnet-call' },
    }],
    hasUsingStatements: command === 'using-module',
  }),
}))
const { checkModeRestrictions } = await import('./modeRestrictions.js')

function context(mode: 'auto' | 'plan' | 'bypassPermissions', headless = false): ToolUseContext {
  return {
    getAppState: () => ({ toolPermissionContext: {
      ...getEmptyToolPermissionContext(), mode,
      isBypassPermissionsModeAvailable: true,
      shouldAvoidPermissionPrompts: headless,
    } }),
  } as ToolUseContext
}

function tool(name: string, readOnly = false, extra: Partial<Tool> = {}): Tool {
  return { name, isReadOnly: () => readOnly, ...extra } as Tool
}

beforeEach(async () => {
  await rm(join(directory, 'plans'), { recursive: true, force: true })
  await mkdir(join(directory, 'plans'))
})
afterAll(async () => { await rm(directory, { recursive: true, force: true }) })

describe('automatic approval restrictions', () => {
  test.each([
    'rm experiment.csv', 'rm *.csv', 'timeout 5 rm experiment.csv',
    'echo ok && rm experiment.csv', 'echo "$(rm experiment.csv)"',
    'find . -delete', 'git push origin main', 'git rm experiment.csv',
    'npm publish', 'gh issue comment 12 --body hello',
    'curl -X POST https://example.invalid', 'python3 cleanup.py',
    'bash -c "rm experiment.csv"', './custom-script',
  ])('requires human approval for %s', async command => {
    expect(await checkModeRestrictions(tool('Bash'), { command }, context('auto'))).toMatchObject({ behavior: 'ask' })
  })

  test.each(['rm', 'del', 'ri', 'Remove-Item', 'Send-MailMessage', 'invalid', 'dotnet-call', 'using-module'])('handles PowerShell %s through the parser and alias map', async command => {
    expect(await checkModeRestrictions(tool('PowerShell'), { command }, context('auto'))).toMatchObject({ behavior: 'ask' })
  })

  test.each(['echo "rm experiment.csv"', 'mkdir results', 'touch report.md'])('does not confuse literal text or routine file operations with deletion: %s', async command => {
    expect(await checkModeRestrictions(tool('Bash'), { command }, context('auto'))).toBeNull()
  })

  test('retains automatic project edits and ordinary reading', async () => {
    expect(await checkModeRestrictions(tool('Edit'), { file_path: join(directory, 'report.md') }, context('auto'))).toBeNull()
    expect(await checkModeRestrictions(tool('Read', true), {}, context('auto'))).toBeNull()
  })

  test('requires approval for unknown or destructive MCP operations', async () => {
    expect(await checkModeRestrictions(tool('mcp__send', false, { isMcp: true }), {}, context('auto'))).toMatchObject({ behavior: 'ask' })
    expect(await checkModeRestrictions(tool('mcp__delete', true, { isMcp: true, isDestructive: () => true }), {}, context('auto'))).toMatchObject({ behavior: 'ask' })
    expect(await checkModeRestrictions(tool('mcp__read', true, { isMcp: true }), {}, context('auto'))).toBeNull()
  })

  test('denies rather than running a risky action when approval is unavailable', async () => {
    expect(await checkModeRestrictions(tool('Bash'), { command: 'rm experiment.csv' }, context('auto', true))).toMatchObject({ behavior: 'deny' })
  })

  test('leaves full access to the existing system and deny-rule checks', async () => {
    expect(await checkModeRestrictions(tool('Bash'), { command: 'rm experiment.csv' }, context('bypassPermissions'))).toBeNull()
  })
})

describe('planning restrictions', () => {
  test('allows research, questions, and plan approval but blocks project changes and agent escapes', async () => {
    for (const name of ['Read', 'Grep', 'WebSearch']) {
      expect(await checkModeRestrictions(tool(name, true), {}, context('plan'))).toBeNull()
    }
    for (const name of ['ExitPlanMode', 'AskUserQuestion', 'TodoWrite']) {
      expect(await checkModeRestrictions(tool(name), {}, context('plan'))).toBeNull()
    }
    for (const name of ['Edit', 'Write', 'Bash', 'Agent']) {
      expect(await checkModeRestrictions(tool(name, name === 'Agent'), { file_path: join(directory, 'experiment.csv'), command: 'rm experiment.csv' }, context('plan'))).toMatchObject({ behavior: 'deny' })
    }
  })

  test('allows only the current plan file, including its initial creation', async () => {
    expect(await checkModeRestrictions(tool('Write'), { file_path: planFile }, context('plan'))).toBeNull()
    await writeFile(planFile, 'plan')
    expect(await checkModeRestrictions(tool('Edit'), { file_path: planFile }, context('plan'))).toBeNull()
    expect(await checkModeRestrictions(tool('Write'), { file_path: join(directory, 'plans', 'other.md') }, context('plan'))).toMatchObject({ behavior: 'deny' })
  })

  test.each(['symlink', 'hardlink'])('blocks a plan file that is a %s to project data', async kind => {
    const dataFile = join(directory, 'experiment.csv')
    await writeFile(dataFile, 'original')
    if (kind === 'symlink') await symlink(dataFile, planFile)
    else await link(dataFile, planFile)
    expect(await checkModeRestrictions(tool('Write'), { file_path: planFile }, context('plan'))).toMatchObject({ behavior: 'deny' })
  })
})
