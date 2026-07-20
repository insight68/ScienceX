import * as os from 'node:os'
import * as path from 'node:path'

function legacyConfigRoot(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
}

export function adapterConfigPath(): string {
  return process.env.SCIENCEX_HOME
    ? path.join(process.env.SCIENCEX_HOME, 'config', 'adapters.json')
    : path.join(legacyConfigRoot(), 'adapters.json')
}

export function adapterSessionPath(): string {
  return process.env.SCIENCEX_HOME
    ? path.join(process.env.SCIENCEX_HOME, 'state', 'adapter-sessions.json')
    : path.join(legacyConfigRoot(), 'adapter-sessions.json')
}

export function adapterDownloadsDir(): string {
  return process.env.SCIENCEX_HOME
    ? path.join(process.env.SCIENCEX_HOME, 'data', 'im-downloads')
    : path.join(legacyConfigRoot(), 'im-downloads')
}

export function whatsappAuthDir(): string {
  return process.env.SCIENCEX_HOME
    ? path.join(process.env.SCIENCEX_HOME, 'credentials', 'whatsapp-auth', 'default')
    : path.join(legacyConfigRoot(), 'whatsapp-auth', 'default')
}
