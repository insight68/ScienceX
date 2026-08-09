import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

describe('sciencex --version', () => {
  test('reports the ScienceX product identity', () => {
    const repositoryRoot = resolve(import.meta.dir, '../..')
    const result = Bun.spawnSync(['./bin/sciencex', '--version'], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CLAUDE_CODE_FORCE_RECOVERY_CLI: '0',
        SCIX_SKIP_DOTENV: '1',
      },
    })
    const stdout = result.stdout.toString().trim()

    expect(result.exitCode).toBe(0)
    expect(stdout).toMatch(/^\S+ \(ScienceX\)$/)
    expect(stdout).not.toContain('Claude Code')
  })
})
