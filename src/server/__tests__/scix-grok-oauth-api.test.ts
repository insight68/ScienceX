import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { handlescixGrokOAuthApi } from '../api/scix-grok-oauth.js'
import { scixGrokOAuthService } from '../services/scixGrokOAuthService.js'

let tempDir: string
let previousConfigDir: string | undefined

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scix-grok-oauth-api-'))
  previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = tempDir
})

afterEach(async () => {
  scixGrokOAuthService.dispose()
  if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe('scix Grok OAuth API', () => {
  test('serves a clear local success page after browser authorization', async () => {
    const response = await handlescixGrokOAuthApi(
      new Request('http://localhost/api/scix-grok-oauth/success'),
      new URL('http://localhost/api/scix-grok-oauth/success'),
      ['api', 'scix-grok-oauth', 'success'],
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/html')
    expect(await response.text()).toContain('Grok Login Successful')
  })

  test('returns status without exposing token material and logs out', async () => {
    await scixGrokOAuthService.saveTokens({
      accessToken: 'secret-access',
      refreshToken: 'secret-refresh',
      expiresAt: Date.now() + 3600_000,
      email: 'user@example.com',
    })
    const statusResponse = await handlescixGrokOAuthApi(
      new Request('http://localhost/api/scix-grok-oauth'),
      new URL('http://localhost/api/scix-grok-oauth'),
      ['api', 'scix-grok-oauth'],
    )
    const statusText = await statusResponse.text()
    expect(statusText).toContain('user@example.com')
    expect(statusText).not.toContain('secret-access')
    expect(statusText).not.toContain('secret-refresh')

    const logoutResponse = await handlescixGrokOAuthApi(
      new Request('http://localhost/api/scix-grok-oauth', { method: 'DELETE' }),
      new URL('http://localhost/api/scix-grok-oauth'),
      ['api', 'scix-grok-oauth'],
    )
    expect(logoutResponse.status).toBe(200)
    await expect(scixGrokOAuthService.loadTokens()).resolves.toBeNull()
  })
})
