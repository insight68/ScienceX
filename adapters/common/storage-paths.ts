import * as os from 'node:os'
import * as path from 'node:path'

function usesLegacyLayout(): boolean {
  return !process.env.SCIENCEX_HOME && Boolean(process.env.CLAUDE_CONFIG_DIR)
}

function scienceXHome(): string {
  return process.env.SCIENCEX_HOME || path.join(os.homedir(), '.sciencex')
}

function legacyConfigRoot(): string {
  return process.env.CLAUDE_CONFIG_DIR!
}

export function adapterConfigPath(): string {
  return usesLegacyLayout()
    ? path.join(legacyConfigRoot(), 'adapters.json')
    : path.join(scienceXHome(), 'config', 'adapters.json')
}

export function adapterSessionPath(): string {
  return usesLegacyLayout()
    ? path.join(legacyConfigRoot(), 'adapter-sessions.json')
    : path.join(scienceXHome(), 'state', 'adapter-sessions.json')
}

export function adapterDownloadsDir(): string {
  return usesLegacyLayout()
    ? path.join(legacyConfigRoot(), 'im-downloads')
    : path.join(scienceXHome(), 'data', 'im-downloads')
}

export function whatsappAuthDir(): string {
  return usesLegacyLayout()
    ? path.join(legacyConfigRoot(), 'whatsapp-auth', 'default')
    : path.join(scienceXHome(), 'credentials', 'whatsapp-auth', 'default')
}
