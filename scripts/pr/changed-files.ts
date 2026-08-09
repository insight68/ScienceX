import { writeFileSync } from 'node:fs'

async function output(cmd: string[], cwd = process.cwd()) {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = await proc.exited

  if (code !== 0) {
    throw new Error(stderr || stdout || `Command failed: ${cmd.join(' ')}`)
  }

  return stdout.trim()
}

async function outputOrEmpty(cmd: string[], cwd = process.cwd()) {
  try {
    return await output(cmd, cwd)
  } catch {
    return ''
  }
}

function splitFiles(output: string) {
  return output.split(/\r?\n/).filter(Boolean)
}

function unique(files: string[]) {
  return [...new Set(files.filter(Boolean))]
}

export async function localChangedFiles() {
  const staged = await outputOrEmpty(['git', 'diff', '--name-only', '--cached'])
  const unstaged = await outputOrEmpty(['git', 'diff', '--name-only'])
  const untracked = await outputOrEmpty(['git', 'ls-files', '--others', '--exclude-standard'])

  return unique([
    ...splitFiles(staged),
    ...splitFiles(unstaged),
    ...splitFiles(untracked),
  ])
}

export async function changedFilesForLocalPrCheck(explicitFiles: string[] = []) {
  if (explicitFiles.length > 0) {
    return unique(explicitFiles)
  }

  const localFiles = await localChangedFiles()
  const explicitBase = process.env.PR_BASE_REF?.trim()
  const branch = await outputOrEmpty(['git', 'branch', '--show-current'])

  if (!explicitBase && !branch && localFiles.length > 0) {
    return localFiles
  }

  const base = explicitBase || 'origin/main'
  try {
    const diff = await output(['git', 'diff', '--name-only', `${base}...HEAD`])
    return unique([...splitFiles(diff), ...localFiles])
  } catch {
    try {
      const diff = await output(['git', 'diff', '--name-only', 'main...HEAD'])
      return unique([...splitFiles(diff), ...localFiles])
    } catch {
      return localFiles
    }
  }
}

const ZERO_SHA = /^0+$/

async function allTrackedFiles(cwd: string) {
  return splitFiles(await output(['git', 'ls-tree', '-r', '--name-only', 'HEAD'], cwd))
}

export async function changedFilesForCi(options: {
  eventName: string
  baseRef?: string
  beforeSha?: string
  cwd?: string
}) {
  const cwd = options.cwd ?? process.cwd()
  if (options.eventName === 'pull_request') {
    const baseRef = options.baseRef?.trim()
    if (!baseRef) {
      throw new Error('GITHUB_BASE_REF is required for pull_request change detection')
    }
    return splitFiles(await output(['git', 'diff', '--name-only', `origin/${baseRef}...HEAD`], cwd))
  }

  const beforeSha = options.beforeSha?.trim()
  if (beforeSha && !ZERO_SHA.test(beforeSha)) {
    const beforeCommit = await outputOrEmpty(['git', 'rev-parse', '--verify', `${beforeSha}^{commit}`], cwd)
    if (beforeCommit) {
      return splitFiles(await output(['git', 'diff', '--name-only', beforeSha, 'HEAD'], cwd))
    }
    return allTrackedFiles(cwd)
  }

  const parent = await outputOrEmpty(['git', 'rev-parse', '--verify', 'HEAD^'], cwd)
  if (parent) {
    return splitFiles(await output(['git', 'diff', '--name-only', 'HEAD^', 'HEAD'], cwd))
  }

  return allTrackedFiles(cwd)
}

if (import.meta.main) {
  const outputIndex = process.argv.indexOf('--ci-output')
  if (outputIndex >= 0) {
    const outputPath = process.argv[outputIndex + 1]
    if (!outputPath) {
      throw new Error('--ci-output requires a file path')
    }
    const files = await changedFilesForCi({
      eventName: process.env.GITHUB_EVENT_NAME ?? '',
      baseRef: process.env.GITHUB_BASE_REF,
      beforeSha: process.env.SCIENCEX_CI_BEFORE_SHA,
    })
    writeFileSync(outputPath, files.length > 0 ? `${files.join('\n')}\n` : '')
  }
}
