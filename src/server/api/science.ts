import * as fs from 'node:fs/promises'
import { z } from 'zod'
import { ApiError, errorResponse } from '../middleware/errorHandler.js'
import { scienceAnalysisService } from '../services/scienceAnalysisService.js'
import { scienceWorkspaceService } from '../services/scienceWorkspaceService.js'
import { isAllowedFilesystemPath } from './filesystem.js'

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  question: z.string().trim().max(2000).optional(),
  rootDir: z.string().trim().min(1).max(4096),
})

const RegisterDatasetSchema = z.object({
  filePath: z.string().trim().min(1).max(4096),
  name: z.string().trim().min(1).max(160).optional(),
})

const CreateRunSchema = z.object({
  datasetId: z.string().trim().min(1).max(160),
  recipe: z.literal('table-quality-v1'),
  parameters: z.object({
    maxRows: z.number().int().min(10).max(100).optional(),
  }).optional(),
})

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw ApiError.badRequest('Invalid JSON body')
  }
}

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

function methodNotAllowed(request: Request): ApiError {
  return new ApiError(405, `Method ${request.method} not allowed`, 'METHOD_NOT_ALLOWED')
}

export async function handleScienceApi(
  request: Request,
  url: URL,
  segments: string[],
): Promise<Response> {
  try {
    const resource = segments[1]
    if (resource === 'research-projects') {
      const projectId = segments[2]
      const childResource = segments[3]

      if (!projectId) {
        if (request.method === 'GET') {
          return Response.json({ projects: await scienceWorkspaceService.listProjects() })
        }
        if (request.method === 'POST') {
          const parsed = CreateProjectSchema.safeParse(await parseJsonBody(request))
          if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
          }
          const rootDir = await canonicalAllowedPath(parsed.data.rootDir)
          const project = await scienceWorkspaceService.createProject({ ...parsed.data, rootDir })
          return Response.json({ project }, { status: 201 })
        }
        throw methodNotAllowed(request)
      }

      if (!childResource) {
        if (request.method !== 'GET') throw methodNotAllowed(request)
        return Response.json({ project: await scienceWorkspaceService.getProject(projectId) })
      }

      if (childResource === 'datasets') {
        if (request.method === 'GET') {
          return Response.json({ datasets: await scienceWorkspaceService.listDatasets(projectId) })
        }
        if (request.method === 'POST') {
          const parsed = RegisterDatasetSchema.safeParse(await parseJsonBody(request))
          if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
          }
          const filePath = await canonicalAllowedPath(parsed.data.filePath)
          const result = await scienceWorkspaceService.registerDataset({
            projectId,
            filePath,
            name: parsed.data.name,
          })
          return Response.json(result, { status: result.versionCreated ? 201 : 200 })
        }
        throw methodNotAllowed(request)
      }

      if (childResource === 'runs') {
        if (request.method === 'GET') {
          return Response.json({ runs: await scienceAnalysisService.listRuns(projectId) })
        }
        if (request.method === 'POST') {
          const parsed = CreateRunSchema.safeParse(await parseJsonBody(request))
          if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
          }
          const result = await scienceAnalysisService.createQualityRun({
            projectId,
            datasetId: parsed.data.datasetId,
            maxRows: parsed.data.parameters?.maxRows,
          })
          return Response.json(result, { status: 201 })
        }
        throw methodNotAllowed(request)
      }

      if (childResource === 'artifacts') {
        if (request.method !== 'GET') throw methodNotAllowed(request)
        return Response.json({ artifacts: await scienceAnalysisService.listArtifacts(projectId) })
      }

      throw ApiError.notFound(`Unknown research project endpoint: ${url.pathname}`)
    }

    if (resource === 'datasets') {
      const datasetId = segments[2]
      const action = segments[3]
      if (!datasetId || action !== 'preview') {
        throw ApiError.notFound(`Unknown dataset endpoint: ${url.pathname}`)
      }
      if (request.method !== 'GET') throw methodNotAllowed(request)

      const rawMaxRows = url.searchParams.get('maxRows')
      const maxRows = rawMaxRows === null ? undefined : Number.parseInt(rawMaxRows, 10)
      if (maxRows !== undefined && (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 100)) {
        throw ApiError.badRequest('maxRows must be an integer between 1 and 100')
      }
      return Response.json({
        preview: await scienceWorkspaceService.previewDataset(datasetId, { maxRows }),
      })
    }

    if (resource === 'runs') {
      const runId = segments[2]
      const action = segments[3]
      if (!runId) throw ApiError.notFound(`Unknown analysis run endpoint: ${url.pathname}`)
      if (action === 'events') {
        if (request.method !== 'GET') throw methodNotAllowed(request)
        return Response.json({ events: await scienceAnalysisService.getRunEvents(runId) })
      }
      if (action === 'replay') {
        if (request.method !== 'POST') throw methodNotAllowed(request)
        return Response.json(await scienceAnalysisService.replayRun(runId), { status: 201 })
      }
      throw ApiError.notFound(`Unknown analysis run endpoint: ${url.pathname}`)
    }

    throw ApiError.notFound(`Unknown ScienceX endpoint: ${url.pathname}`)
  } catch (error) {
    return errorResponse(error)
  }
}
