/**
 * Literature API handler — exposes /api/literature/* endpoints backed by
 * literatureService. Follows the same handler pattern as science.ts and
 * open-targets.ts.
 *
 * Endpoints:
 *   GET  /api/literature/search?q=&source=&limit=
 *   GET  /api/literature/papers/:id
 *   GET  /api/literature/papers/:id/references?limit=
 *   GET  /api/literature/papers/:id/citations?limit=
 */

import { z } from 'zod'
import { ApiError, errorResponse } from '../middleware/errorHandler.js'
import {
  getCitations,
  getPaper,
  getReferences,
  searchLiterature,
  type LiteratureSource,
} from '../services/literatureService.js'

const VALID_SOURCES = ['semantic-scholar', 'openalex', 'arxiv', 'aggregated'] as const

const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(500),
  source: z.enum(VALID_SOURCES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

function methodNotAllowed(req: Request): ApiError {
  return new ApiError(405, `Method ${req.method} not allowed`, 'METHOD_NOT_ALLOWED')
}

function parseLimit(value: string | null): number {
  if (value === null) return 20
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1 || n > 100) {
    throw ApiError.badRequest('limit must be an integer between 1 and 100')
  }
  return n
}

export async function handleLiteratureApi(
  req: Request,
  url: URL,
  segments: string[],
): Promise<Response> {
  try {
    const resource = segments[1] // 'literature'

    if (resource === 'literature') {
      const action = segments[2]

      if (!action) {
        throw ApiError.notFound(`Unknown literature endpoint: ${url.pathname}`)
      }

      if (action === 'search') {
        if (req.method !== 'GET') throw methodNotAllowed(req)
        const params = SearchQuerySchema.safeParse({
          q: url.searchParams.get('q'),
          source: url.searchParams.get('source') ?? undefined,
          limit: url.searchParams.get('limit') ?? undefined,
        })
        if (!params.success) {
          throw ApiError.badRequest(params.error.issues.map(i => i.message).join('; '))
        }
        const result = await searchLiterature({
          query: params.data.q,
          source: params.data.source as LiteratureSource | 'aggregated' | undefined,
          limit: params.data.limit,
        })
        return Response.json(result)
      }

      if (action === 'papers') {
        const paperId = segments[3]
        if (!paperId) {
          throw ApiError.badRequest('Missing paper id')
        }
        const decodedId = decodeURIComponent(paperId)
        const subAction = segments[4]

        if (!subAction) {
          if (req.method !== 'GET') throw methodNotAllowed(req)
          const paper = await getPaper(decodedId)
          return Response.json({ paper })
        }

        if (subAction === 'references' || subAction === 'citations') {
          if (req.method !== 'GET') throw methodNotAllowed(req)
          const limit = parseLimit(url.searchParams.get('limit'))
          const papers =
            subAction === 'references'
              ? await getReferences(decodedId, limit)
              : await getCitations(decodedId, limit)
          return Response.json({ papers })
        }

        throw ApiError.notFound(`Unknown papers sub-endpoint: ${subAction}`)
      }

      throw ApiError.notFound(`Unknown literature endpoint: ${url.pathname}`)
    }

    throw ApiError.notFound(`Unknown literature endpoint: ${url.pathname}`)
  } catch (error) {
    return errorResponse(error)
  }
}
