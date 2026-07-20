import { afterEach, describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  getClaudeConfigHomeDir,
  getScienceXConfigDir,
  getScienceXCredentialsDir,
  getScienceXDataDir,
  getScienceXDiagnosticsDir,
  getScienceXHomeDir,
  getScienceXProjectRegistryDir,
  getScienceXRuntimeDir,
  getScienceXStateDir,
} from './envUtils.js'

const originalScienceXHome = process.env.SCIENCEX_HOME
const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

afterEach(() => {
  if (originalScienceXHome === undefined) delete process.env.SCIENCEX_HOME
  else process.env.SCIENCEX_HOME = originalScienceXHome
  if (originalClaudeConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
})

describe('ScienceX storage paths', () => {
  test('uses ~/.sciencex without changing the Claude compatibility home', () => {
    delete process.env.SCIENCEX_HOME
    delete process.env.CLAUDE_CONFIG_DIR

    expect(getScienceXHomeDir()).toBe(join(homedir(), '.sciencex'))
    expect(getScienceXConfigDir()).toBe(join(homedir(), '.sciencex', 'config'))
    expect(getScienceXCredentialsDir()).toBe(join(homedir(), '.sciencex', 'credentials'))
    expect(getScienceXDataDir()).toBe(join(homedir(), '.sciencex', 'data'))
    expect(getScienceXStateDir()).toBe(join(homedir(), '.sciencex', 'state'))
    expect(getScienceXRuntimeDir()).toBe(join(homedir(), '.sciencex', 'runtime'))
    expect(getScienceXDiagnosticsDir()).toBe(join(homedir(), '.sciencex', 'diagnostics'))
    expect(getScienceXProjectRegistryDir()).toBe(join(homedir(), '.sciencex', 'data', 'science'))
    expect(getClaudeConfigHomeDir()).toBe(join(homedir(), '.sciencex', 'claude'))
  })

  test('uses SCIENCEX_HOME for the new layout', () => {
    process.env.SCIENCEX_HOME = '/tmp/sciencex-home'
    process.env.CLAUDE_CONFIG_DIR = '/tmp/sciencex-home/claude'

    expect(getScienceXConfigDir()).toBe('/tmp/sciencex-home/config')
    expect(getScienceXDataDir()).toBe('/tmp/sciencex-home/data')
    expect(getClaudeConfigHomeDir()).toBe('/tmp/sciencex-home/claude')
  })

  test('keeps the historical layout for CLAUDE_CONFIG_DIR-only callers', () => {
    delete process.env.SCIENCEX_HOME
    process.env.CLAUDE_CONFIG_DIR = '/tmp/legacy-claude'

    expect(getScienceXConfigDir()).toBe('/tmp/legacy-claude/sciencex')
    expect(getScienceXCredentialsDir()).toBe('/tmp/legacy-claude/sciencex')
    expect(getScienceXDataDir()).toBe('/tmp/legacy-claude/sciencex')
    expect(getScienceXStateDir()).toBe('/tmp/legacy-claude')
    expect(getScienceXDiagnosticsDir()).toBe('/tmp/legacy-claude/sciencex/diagnostics')
    expect(getScienceXProjectRegistryDir()).toBe('/tmp/legacy-claude/science')
  })
})
