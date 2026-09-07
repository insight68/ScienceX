import * as fs from 'node:fs/promises'
import { z } from 'zod'
import { ApiError, errorResponse } from '../middleware/errorHandler.js'
import { scienceAnalysisService } from '../services/scienceAnalysisService.js'
import { scienceExperimentService } from '../services/scienceExperimentService.js'
import { scienceWorkspaceService } from '../services/scienceWorkspaceService.js'
import { scienceWorkflowService } from '../services/scienceWorkflowService.js'
import { isAllowedFilesystemPath } from './filesystem.js'
import { listScienceExamples, materializeScienceExample, scienceExampleReport, saveScienceExampleReport } from '../services/scienceExampleService.js'

const MaterializeExampleSchema = z.object({
  parentDir: z.string().trim().min(1).max(4096),
  locale: z.string().max(20).optional(),
  includeChallenges: z.boolean().optional(),
})

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
  datasetVersionId: z.string().trim().min(1).max(160).optional(),
  executionId: z.string().trim().min(1).max(160).optional(),
  recipe: z.literal('table-quality-v1'),
  parameters: z.object({
    maxRows: z.number().int().min(10).max(100).optional(),
  }).optional(),
})

const ConcentrationUnitSchema = z.enum(['nM', 'µM', 'mM'])

const PlateWellSchema = z.object({
  well: z.string().trim().min(1).max(4),
  role: z.enum(['blank', 'vehicle-control', 'positive-control', 'treatment']),
  label: z.string().trim().max(160),
  concentration: z.number().finite().nullable(),
  concentrationUnit: ConcentrationUnitSchema.nullable(),
  replicate: z.number().int().min(1).max(8),
})

const CreateExperimentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  objective: z.string().trim().max(2000).optional(),
  assayType: z.literal('cell-viability-dose-response'),
  linkedDatasetId: z.string().trim().min(1).max(160).nullable().optional(),
  sourceReviewId: z.string().trim().min(1).max(160).nullable().optional(),
  protocol: z.object({
    cellLine: z.string().trim().max(160),
    compoundName: z.string().trim().max(160),
    readout: z.enum(['cck-8', 'celltiter-glo']),
    treatmentDurationHours: z.number().finite().min(0).max(10000),
    seedingDensityCellsPerWell: z.number().int().min(0).max(1000000000),
    concentrationUnit: ConcentrationUnitSchema.nullable(),
    concentrations: z.array(z.number().finite()).max(8),
    replicateCount: z.number().int().min(1).max(8),
    includeBlankControl: z.boolean(),
    vehicleControl: z.object({
      name: z.string().trim().max(160),
      finalPercent: z.number().finite().min(0).max(100),
    }).nullable(),
    positiveControl: z.string().trim().max(160),
  }),
  design: z.object({
    plateFormat: z.literal(96),
    wells: z.array(PlateWellSchema).max(96),
  }).optional(),
})

const LinkExperimentDatasetSchema = z.object({
  datasetId: z.string().trim().min(1).max(160),
})

const CreateDoseResponseRunSchema = z.object({
  recipe: z.literal('cell-viability-dose-response-v1'),
  executionId: z.string().trim().min(1).max(160).optional(),
  datasetId: z.string().trim().min(1).max(160).optional(),
  datasetVersionId: z.string().trim().min(1).max(160).optional(),
  parameters: z.object({
    wellColumn: z.string().trim().min(1).max(160),
    signalColumn: z.string().trim().min(1).max(160),
  }),
})

const IdSchema = z.string().trim().min(1).max(160)
const CreateExecutionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  experimentId: IdSchema.nullable().optional(),
  performedBy: z.string().trim().min(1).max(160),
  performedAt: z.string().datetime({ offset: true }),
  sourceType: z.enum(['measured', 'simulated', 'unknown']),
  sampleBatch: z.string().trim().max(500).default(''),
  instrument: z.string().trim().max(500).default(''),
  actualConditions: z.string().trim().max(4000).default(''),
  deviations: z.string().trim().max(4000).default(''),
  biologicalReplicateId: z.string().trim().max(160).default(''),
})
const BindExecutionDatasetSchema = z.object({ datasetId: IdSchema, versionId: IdSchema })
const CreateReviewSchema = z.object({
  runId: IdSchema,
  reviewer: z.string().trim().min(1).max(160),
  decision: z.enum(['accept', 'revise', 'repeat']),
  rationale: z.string().trim().min(1).max(8000),
  nextStep: z.string().trim().max(2000).default(''),
  supersedesReviewId: IdSchema.nullable().optional(),
})

async function parseWorkflowBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await parseJsonBody(request))
  if (!parsed.success) throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
  return parsed.data
}

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
    if (resource === 'science-examples') {
      if (!segments[2] && request.method === 'GET') {
        return Response.json({ examples: listScienceExamples(url.searchParams.get('locale') ?? undefined) })
      }
      if (segments[2] && segments[3] === 'materialize' && segments.length === 4) {
        if (request.method !== 'POST') throw methodNotAllowed(request)
        const parsed = MaterializeExampleSchema.safeParse(await parseJsonBody(request))
        if (!parsed.success) throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
        return Response.json(await materializeScienceExample({ exampleId: segments[2], ...parsed.data }), { status: 201 })
      }
      throw ApiError.notFound('Unknown example endpoint')
    }
    if (resource === 'research-projects') {
      const projectId = segments[2]
      const childResource = segments[3]

      if (projectId && childResource === 'example-report' && segments.length === 4) {
        const locale = url.searchParams.get('locale') ?? undefined
        if (request.method === 'GET') return Response.json(await scienceExampleReport(projectId, locale))
        if (request.method === 'POST') return Response.json(await saveScienceExampleReport(projectId, locale), { status: 201 })
        throw methodNotAllowed(request)
      }

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

      if (childResource === 'executions') {
        if (segments.length === 6 && segments[5] === 'datasets') {
          if (request.method !== 'POST') throw methodNotAllowed(request)
          const input = await parseWorkflowBody(request, BindExecutionDatasetSchema)
          return Response.json({ execution: await scienceWorkflowService.bindDataset(projectId, segments[4], input.datasetId, input.versionId) })
        }
        if (segments.length !== 4) throw ApiError.notFound('Unknown execution endpoint')
        if (request.method === 'GET') return Response.json({ executions: await scienceWorkflowService.listExecutions(projectId) })
        if (request.method === 'POST') return Response.json({ execution: await scienceWorkflowService.createExecution(projectId,
          await parseWorkflowBody(request, CreateExecutionSchema)) }, { status: 201 })
        throw methodNotAllowed(request)
      }

      if (childResource === 'reviews' && segments.length === 4) {
        if (request.method === 'GET') {
          const runId = IdSchema.safeParse(url.searchParams.get('runId'))
          if (!runId.success) throw ApiError.badRequest('runId is required')
          return Response.json({ reviews: await scienceWorkflowService.listReviews(projectId, runId.data) })
        }
        if (request.method === 'POST') return Response.json({ review: await scienceWorkflowService.createReview(projectId,
          await parseWorkflowBody(request, CreateReviewSchema)) }, { status: 201 })
        throw methodNotAllowed(request)
      }

      if (childResource === 'datasets' && segments.length === 8 && segments[5] === 'versions' && segments[7] === 'preview') {
        if (request.method !== 'GET') throw methodNotAllowed(request)
        return Response.json({ preview: await scienceWorkspaceService.previewDatasetVersion(projectId, segments[4], segments[6], { maxRows: 100 }) })
      }

      if (childResource === 'datasets') {
        if (segments.length !== 4) throw ApiError.notFound('Unknown dataset endpoint')
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
            datasetVersionId: parsed.data.datasetVersionId,
            executionId: parsed.data.executionId,
            maxRows: parsed.data.parameters?.maxRows,
          })
          return Response.json(result, { status: 201 })
        }
        throw methodNotAllowed(request)
      }

      if (childResource === 'experiments') {
        const experimentId = segments[4]
        const experimentAction = segments[5]
        if (experimentId && experimentAction === 'runs') {
          if (request.method !== 'POST') throw methodNotAllowed(request)
          const parsed = CreateDoseResponseRunSchema.safeParse(await parseJsonBody(request))
          if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
          }
          return Response.json(await scienceAnalysisService.createDoseResponseRun({
            projectId,
            experimentId,
            executionId: parsed.data.executionId,
            datasetId: parsed.data.datasetId,
            datasetVersionId: parsed.data.datasetVersionId,
            wellColumn: parsed.data.parameters.wellColumn,
            signalColumn: parsed.data.parameters.signalColumn,
          }), { status: 201 })
        }
        if (experimentId) {
          if (request.method !== 'PATCH') throw methodNotAllowed(request)
          const parsed = LinkExperimentDatasetSchema.safeParse(await parseJsonBody(request))
          if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
          }
          const experiment = await scienceExperimentService.linkDataset({
            projectId,
            experimentId,
            datasetId: parsed.data.datasetId,
          })
          return Response.json({ experiment })
        }
        if (request.method === 'GET') {
          return Response.json({
            experiments: await scienceExperimentService.listExperiments(projectId),
          })
        }
        if (request.method === 'POST') {
          const parsed = CreateExperimentSchema.safeParse(await parseJsonBody(request))
          if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues.map(issue => issue.message).join('; '))
          }
          const experiment = await scienceExperimentService.createExperiment({
            projectId,
            ...parsed.data,
          })
          return Response.json({ experiment }, { status: 201 })
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
      if (!datasetId || (action !== 'preview' && action !== 'analytics')) {
        throw ApiError.notFound(`Unknown dataset endpoint: ${url.pathname}`)
      }
      if (request.method !== 'GET') throw methodNotAllowed(request)

      if (action === 'analytics') {
        return Response.json({
          analytics: await scienceWorkspaceService.getDatasetAnalytics(datasetId),
        })
      }

      const rawMaxRows = url.searchParams.get('maxRows')
      const maxRows = rawMaxRows === null ? undefined : Number.parseInt(rawMaxRows, 10)
      if (maxRows !== undefined && (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 10000)) {
        throw ApiError.badRequest('maxRows must be an integer between 1 and 10000')
      }

      const rawOffset = url.searchParams.get('offset')
      const offset = rawOffset === null ? undefined : Math.max(0, Number.parseInt(rawOffset, 10) || 0)

      const search = url.searchParams.get('search') ?? undefined

      return Response.json({
        preview: await scienceWorkspaceService.previewDataset(datasetId, { maxRows, offset, search }),
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
