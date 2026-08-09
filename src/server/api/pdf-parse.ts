/**
 * PDF parse API handler — exposes /api/pdf-parse/* backed by pdfParseService.
 * Reuses the canonicalAllowedPath pattern from science.ts to ensure the
 * requested file is inside an allowed filesystem directory.
 *
 * Endpoints:
 *   GET  /api/pdf-parse/health           → GROBID availability check
 *   POST /api/pdf-parse                   → parse a PDF file
 */

import * as fs from 'node:fs/promises'
import { z } from 'zod'
import { ApiError, errorResponse } from '../middleware/errorHandler.js'
import { isAllowedFilesystemPath } from './filesystem.js'
import { isGrobidAvailable, parsePdf } from '../services/pdfParseService.js'

const ParseRequestSchema = z.object({
  filePath: z.string().trim().min(1).max(4096),
})

async function canonicalAllowedPath(inputPath: string): Promise<string> {
  if (!isAllowedFilesystemPath(inputPath)) {
    throw new ApiError(403, 'Access denied: path outside allowed directories', 'FORBIDDEN')
  }
  let canonicalPath: string
  try {
    canonicalPath = await fs.realpath(inputPath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw ApiError.badRequest(`Path does not exist: ${inputPath}`)
    }
    throw error
  }
  if (!isAllowedFilesystemPath(canonicalPath)) {
    throw new ApiError(403, 'Access denied: symlink target outside allowed directories', 'FORBIDDEN')
  }
  return canonicalPath
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw ApiError.badRequest('Invalid JSON body')
  }
}

export async function handlePdfParseApi(
  req: Request,
  url: URL,
  segments: string[],
): Promise<Response> {
  try {
    const resource = segments[1] // 'pdf-parse'
    if (resource !== 'pdf-parse') {
      throw ApiError.notFound(`Unknown pdf-parse endpoint: ${url.pathname}`)
    }

    const action = segments[2]

    if (!action) {
      if (req.method !== 'POST') {
        throw new ApiError(405, `Method ${req.method} not allowed`, 'METHOD_NOT_ALLOWED')
      }
      const parsed = ParseRequestSchema.safeParse(await parseJsonBody(req))
      if (!parsed.success) {
        throw ApiError.badRequest(parsed.error.issues.map(i => i.message).join('; '))
      }
      const canonicalPath = await canonicalAllowedPath(parsed.data.filePath)
      const result = await parsePdf(canonicalPath)
      return Response.json({ parsed: result })
    }

    if (action === 'health') {
      if (req.method !== 'GET') {
        throw new ApiError(405, `Method ${req.method} not allowed`, 'METHOD_NOT_ALLOWED')
      }
      const available = await isGrobidAvailable()
      return Response.json({ available })
    }

    throw ApiError.notFound(`Unknown pdf-parse endpoint: ${url.pathname}`)
  } catch (error) {
    return errorResponse(error)
  }
}
