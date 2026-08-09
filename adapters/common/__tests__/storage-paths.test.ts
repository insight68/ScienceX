import { afterEach, describe, expect, it } from 'bun:test'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  adapterConfigPath,
  adapterDownloadsDir,
  adapterSessionPath,
  whatsappAuthDir,
} from '../storage-paths.js'

describe('adapter storage paths', () => {
  const originalScienceXHome = process.env.SCIENCEX_HOME
  const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

  afterEach(() => {
    restoreEnv('SCIENCEX_HOME', originalScienceXHome)
    restoreEnv('CLAUDE_CONFIG_DIR', originalClaudeConfigDir)
  })

  it('uses the structured ScienceX home when SCIENCEX_HOME is set', () => {
    process.env.SCIENCEX_HOME = '/tmp/sciencex-home'
    process.env.CLAUDE_CONFIG_DIR = '/tmp/sciencex-home/claude'

    expect(adapterConfigPath()).toBe(path.join('/tmp/sciencex-home', 'config', 'adapters.json'))
    expect(adapterSessionPath()).toBe(path.join('/tmp/sciencex-home', 'state', 'adapter-sessions.json'))
    expect(adapterDownloadsDir()).toBe(path.join('/tmp/sciencex-home', 'data', 'im-downloads'))
    expect(whatsappAuthDir()).toBe(path.join('/tmp/sciencex-home', 'credentials', 'whatsapp-auth', 'default'))
  })

  it('keeps CLAUDE_CONFIG_DIR-only launches on the legacy layout', () => {
    delete process.env.SCIENCEX_HOME
    process.env.CLAUDE_CONFIG_DIR = '/tmp/legacy-claude'

    expect(adapterConfigPath()).toBe(path.join('/tmp/legacy-claude', 'adapters.json'))
    expect(adapterSessionPath()).toBe(path.join('/tmp/legacy-claude', 'adapter-sessions.json'))
    expect(adapterDownloadsDir()).toBe(path.join('/tmp/legacy-claude', 'im-downloads'))
    expect(whatsappAuthDir()).toBe(path.join('/tmp/legacy-claude', 'whatsapp-auth', 'default'))
  })

  it('uses ~/.sciencex when no storage environment override is set', () => {
    delete process.env.SCIENCEX_HOME
    delete process.env.CLAUDE_CONFIG_DIR

    const scienceXHome = path.join(os.homedir(), '.sciencex')
    expect(adapterConfigPath()).toBe(path.join(scienceXHome, 'config', 'adapters.json'))
    expect(adapterSessionPath()).toBe(path.join(scienceXHome, 'state', 'adapter-sessions.json'))
    expect(adapterDownloadsDir()).toBe(path.join(scienceXHome, 'data', 'im-downloads'))
    expect(whatsappAuthDir()).toBe(path.join(scienceXHome, 'credentials', 'whatsapp-auth', 'default'))
  })
})

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}
