import {
  GROK_OAUTH_SUCCESS_HTML,
  scixGrokOAuthService,
} from '../services/scixGrokOAuthService.js'
import { errorResponse } from '../middleware/errorHandler.js'

export async function handlescixGrokOAuthApi(
  req: Request,
  _url: URL,
  segments: string[],
): Promise<Response> {
  try {
    const action = segments[2]
    if (action === 'start' && req.method === 'POST') {
      const session = await scixGrokOAuthService.startSession()
      return Response.json({
        authorizeUrl: session.authorizeUrl,
        state: session.state,
      })
    }

    if (action === 'success' && req.method === 'GET') {
      return new Response(GROK_OAUTH_SUCCESS_HTML, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    if (action === undefined && req.method === 'GET') {
      const tokens = await scixGrokOAuthService.ensureFreshTokens()
      if (!tokens) return Response.json({ loggedIn: false })
      return Response.json({
        loggedIn: true,
        expiresAt: tokens.expiresAt,
        email: tokens.email,
      })
    }

    if (action === undefined && req.method === 'DELETE') {
      scixGrokOAuthService.dispose()
      await scixGrokOAuthService.deleteTokens()
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Not Found' }, { status: 404 })
  } catch (error) {
    return errorResponse(error)
  }
}
