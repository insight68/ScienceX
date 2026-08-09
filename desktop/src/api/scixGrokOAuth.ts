import { api, getBaseUrl } from './client'

export type scixGrokOAuthStatus =
  | { loggedIn: false }
  | {
      loggedIn: true
      expiresAt: number | null
      email: string | null
    }

function currentServerPort(): number {
  const port = new URL(getBaseUrl()).port
  const parsed = Number.parseInt(port, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Cannot determine server port from baseUrl: ${getBaseUrl()}`)
  }
  return parsed
}

export const scixGrokOAuthApi = {
  start() {
    return api.post<{ authorizeUrl: string; state: string }>(
      '/api/scix-grok-oauth/start',
      { serverPort: currentServerPort() },
    )
  },

  status() {
    return api.get<scixGrokOAuthStatus>('/api/scix-grok-oauth')
  },

  successUrl() {
    return `${getBaseUrl()}/api/scix-grok-oauth/success`
  },

  logout() {
    return api.delete<{ ok: true }>('/api/scix-grok-oauth')
  },
}
