import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createSandboxedTestEnvironment } from '../../../scripts/pr/test-environment.js'
import provenance from '../../skills/bundled/tashan/UPSTREAM.json'

test('desktop server startup exposes research skills and survives repeated initialization', async () => {
  const sandboxDir = await mkdtemp(join(tmpdir(), 'sciencex-skills-startup-test-'))
  const repoRoot = resolve(import.meta.dir, '../../..')
  const child = Bun.spawn([
    'bun', '--no-env-file', 'run',
    join(import.meta.dir, 'fixtures/skills-startup.ts'),
  ], {
    cwd: repoRoot,
    env: createSandboxedTestEnvironment(sandboxDir, {
      SCIX_LOCAL_ACCESS_TOKEN: 'skills-startup-fixture-token',
      CLAUDE_CODE_TMPDIR: join(sandboxDir, 'tmp'),
    }),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const timeout = setTimeout(() => child.kill('SIGKILL'), 20_000)
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
    const resultLine = stdout.split('\n').find(line => line.startsWith('SKILLS_STARTUP_RESULT='))
    expect(resultLine).toBeDefined()
    const snapshots = JSON.parse(resultLine!.slice('SKILLS_STARTUP_RESULT='.length)) as Array<{
      status: number
      installed: Array<{ name: string; source: string }>
      details: Array<{ name: string; status: number; entrypointName?: string }>
    }>
    const expectedNames = ['scansci-pdf', 'good-question', ...provenance.skills]
    expect(expectedNames).toHaveLength(20)
    expect(snapshots).toHaveLength(2)
    for (const snapshot of snapshots) {
      expect(snapshot.status).toBe(200)
      const names = snapshot.installed.map(skill => skill.name)
      expect(names).toEqual(expect.arrayContaining(expectedNames))
      expect(new Set(names).size).toBe(names.length)
      expect(snapshot.details).toEqual(expectedNames.map(name => ({
        name,
        status: 200,
        entrypointName: name,
      })))
    }
  } finally {
    clearTimeout(timeout)
    if (child.exitCode === null) child.kill('SIGKILL')
    await child.exited
    await rm(sandboxDir, { recursive: true, force: true })
  }
}, 25_000)
