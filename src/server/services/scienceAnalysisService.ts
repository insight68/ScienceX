import { createHash, randomBytes, randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Database } from 'bun:sqlite'
import { ApiError } from '../middleware/errorHandler.js'
import {
  analyzeCellViabilityDoseResponse,
  ScienceDoseResponseAnalysisError,
  type ScienceDoseResponseSummary,
} from './scienceDoseResponseAnalysis.js'
import {
  scienceExperimentService,
  type ScienceExperiment,
} from './scienceExperimentService.js'
import {
  CELL_VIABILITY_EVALUATION_CONTRACT,
  evaluateCellViabilityEvidence,
  type ScienceEvaluationContract,
  type ScienceEvidence,
} from './scienceEvidence.js'
import {
  scienceWorkspaceService,
  type ScienceColumnProfile,
  type ScienceDataset,
  type ScienceDatasetPreview,
  type ScienceProject,
} from './scienceWorkspaceService.js'

const QUALITY_RECIPE = 'table-quality-v1' as const
const QUALITY_RECIPE_SOURCE = 'sciencex:table-quality-v1:preview-profile:2026-07-19'
const DOSE_RESPONSE_RECIPE = 'cell-viability-dose-response-v1' as const
const DOSE_RESPONSE_RECIPE_SOURCE = 'sciencex:cell-viability-dose-response-v1:4pl-nelder-mead:2026-08-30'
const MAX_EVENT_LOG_BYTES = 2 * 1024 * 1024

export type ScienceRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'
export type ScienceReproducibilityStatus = 'unchecked' | 'reproducible' | 'failed' | 'stale'
export type ScienceInputCurrentness = 'current' | 'superseded'
export type ScienceArtifactKind = 'table' | 'report' | 'other'
export type ScienceAnalysisRecipe = typeof QUALITY_RECIPE | typeof DOSE_RESPONSE_RECIPE
export type ScienceAnalysisParameters =
  | { maxRows: number }
  | { experimentId: string; wellColumn: string; signalColumn: string }

export type ScienceQualityWarning = {
  code: 'sampled-profile' | 'missing-values' | 'empty-column' | 'identifier-candidate'
  severity: 'warning' | 'info'
  message: string
  columns: string[]
}

export type ScienceQualitySummary = {
  scope: 'preview-sample'
  sampledRowCount: number
  columnCount: number
  missingCellCount: number
  missingRate: number
  completeRowCount: number
  numericColumnCount: number
  truncated: boolean
  columns: ScienceColumnProfile[]
  warnings: ScienceQualityWarning[]
}

export type ScienceAnalysisRun = {
  id: string
  projectId: string
  datasetId: string
  datasetVersionId: string
  datasetVersionOrdinal: number
  inputCurrentness: ScienceInputCurrentness
  experimentId: string | null
  parentRunId: string | null
  recipe: ScienceAnalysisRecipe
  status: ScienceRunStatus
  reproducibilityStatus: ScienceReproducibilityStatus
  evaluationContract: ScienceEvaluationContract | null
  evidence: ScienceEvidence | null
  parameters: ScienceAnalysisParameters
  environment: {
    runtime: 'bun'
    runtimeVersion: string
    platform: string
    architecture: string
    localOnly: true
  }
  inputHash: string
  recipeHash: string
  eventLogPath: string
  manifestPath: string
  summary: ScienceQualitySummary | ScienceDoseResponseSummary | null
  errorMessage: string | null
  exitCode: number | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export type ScienceArtifact = {
  id: string
  projectId: string
  producingRunId: string
  kind: ScienceArtifactKind
  name: string
  relativePath: string
  mimeType: string
  contentHash: string
  sizeBytes: number
  createdAt: string
}

export type ScienceRunEvent = {
  id: string
  runId: string
  type: 'run.created' | 'run.started' | 'artifact.created' | 'run.evaluated' | 'run.completed' | 'run.failed' | 'run.interrupted'
  at: string
  data: Record<string, unknown>
}

type RunRow = {
  id: string
  project_id: string
  dataset_id: string
  dataset_version_id: string
  dataset_version_ordinal?: number
  input_currentness?: ScienceInputCurrentness
  experiment_id?: string | null
  parent_run_id: string | null
  recipe: ScienceAnalysisRecipe
  status: ScienceRunStatus
  reproducibility_status: ScienceReproducibilityStatus
  evaluation_contract_json: string | null
  evidence_json: string | null
  parameters_json: string
  environment_json: string
  input_hash: string
  recipe_hash: string
  event_log_path: string
  manifest_path: string
  summary_json: string | null
  error_message: string | null
  exit_code: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

type ArtifactRow = {
  id: string
  project_id: string
  producing_run_id: string
  kind: ScienceArtifactKind
  name: string
  relative_path: string
  mime_type: string
  content_hash: string
  size_bytes: number
  created_at: string
}

type RunLocation = {
  project: ScienceProject
  run: ScienceAnalysisRun
}

type AnalysisArtifactInput = {
  kind: ScienceArtifactKind
  name: string
  relativePath: string
  mimeType: string
  contents: string
}

type AnalysisOutput = {
  summary: ScienceQualitySummary | ScienceDoseResponseSummary
  evidence?: ScienceEvidence
  artifacts: AnalysisArtifactInput[]
}

const RUN_SELECT = `
  SELECT
    analysis_runs.*,
    input_version.ordinal AS dataset_version_ordinal,
    CASE WHEN analysis_runs.dataset_version_id = (
      SELECT latest.id
      FROM dataset_versions latest
      WHERE latest.dataset_id = analysis_runs.dataset_id
      ORDER BY latest.ordinal DESC
      LIMIT 1
    ) THEN 'current' ELSE 'superseded' END AS input_currentness
  FROM analysis_runs
  JOIN dataset_versions input_version ON input_version.id = analysis_runs.dataset_version_id
`

function projectDatabasePath(project: ScienceProject): string {
  return path.join(project.rootDir, '.sciencex', 'research.sqlite')
}

function openProjectDatabase(project: ScienceProject): Database {
  const database = new Database(projectDatabasePath(project), { readwrite: true })
  database.exec('PRAGMA busy_timeout = 5000')
  database.exec('PRAGMA journal_mode = WAL')
  database.exec('PRAGMA synchronous = NORMAL')
  database.exec('PRAGMA foreign_keys = ON')
  return database
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    throw ApiError.internal(`Science ${label} metadata is malformed`)
  }
}

function mapRun(row: RunRow): ScienceAnalysisRun {
  return {
    id: row.id,
    projectId: row.project_id,
    datasetId: row.dataset_id,
    datasetVersionId: row.dataset_version_id,
    datasetVersionOrdinal: row.dataset_version_ordinal ?? 0,
    inputCurrentness: row.input_currentness ?? 'current',
    experimentId: row.experiment_id ?? null,
    parentRunId: row.parent_run_id,
    recipe: row.recipe,
    status: row.status,
    reproducibilityStatus: row.reproducibility_status,
    evaluationContract: row.evaluation_contract_json
      ? parseJson(row.evaluation_contract_json, 'evaluation contract')
      : null,
    evidence: row.evidence_json ? parseJson(row.evidence_json, 'evidence') : null,
    parameters: parseJson(row.parameters_json, 'run parameters'),
    environment: parseJson(row.environment_json, 'run environment'),
    inputHash: row.input_hash,
    recipeHash: row.recipe_hash,
    eventLogPath: row.event_log_path,
    manifestPath: row.manifest_path,
    summary: row.summary_json ? parseJson(row.summary_json, 'run summary') : null,
    errorMessage: row.error_message,
    exitCode: row.exit_code,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

function mapArtifact(row: ArtifactRow): ScienceArtifact {
  return {
    id: row.id,
    projectId: row.project_id,
    producingRunId: row.producing_run_id,
    kind: row.kind,
    name: row.name,
    relativePath: row.relative_path,
    mimeType: row.mime_type,
    contentHash: row.content_hash,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }
}

function sha256(contents: string | Buffer): string {
  return createHash('sha256').update(contents).digest('hex')
}

async function writeFileAtomically(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.tmp.${process.pid}.${randomBytes(6).toString('hex')}`
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 })
  try {
    await fs.writeFile(temporaryPath, contents, { encoding: 'utf8', mode: 0o600 })
    await fs.rename(temporaryPath, filePath)
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

async function appendEvent(
  project: ScienceProject,
  relativePath: string,
  runId: string,
  type: ScienceRunEvent['type'],
  data: Record<string, unknown>,
  at = new Date().toISOString(),
): Promise<ScienceRunEvent> {
  const event: ScienceRunEvent = { id: randomUUID(), runId, type, at, data }
  const absolutePath = path.join(project.rootDir, relativePath)
  const previous = await fs.readFile(absolutePath, 'utf8').catch(error => {
    if (error?.code === 'ENOENT') return ''
    throw error
  })
  // Publish complete JSONL snapshots so interrupted writes cannot leave half an event.
  const separator = previous && !previous.endsWith('\n') ? '\n' : ''
  await writeFileAtomically(absolutePath, `${previous}${separator}${JSON.stringify(event)}\n`)
  return event
}

function qualitySummary(preview: ScienceDatasetPreview): ScienceQualitySummary {
  const missingCellCount = preview.columns.reduce((sum, column) => sum + column.missingCount, 0)
  const totalCells = preview.sampledRowCount * preview.columns.length
  const warnings: ScienceQualityWarning[] = []
  if (preview.truncated) {
    warnings.push({
      code: 'sampled-profile',
      severity: 'warning',
      message: `Profile uses the first ${preview.sampledRowCount} safely parsed rows; it is not a full-dataset conclusion.`,
      columns: [],
    })
  }
  const missingColumns = preview.columns.filter(column => column.missingCount > 0).map(column => column.name)
  if (missingColumns.length > 0) {
    warnings.push({
      code: 'missing-values',
      severity: 'warning',
      message: `${missingCellCount} missing cells were observed in the local sample.`,
      columns: missingColumns,
    })
  }
  const emptyColumns = preview.columns.filter(column => column.inferredType === 'empty').map(column => column.name)
  if (emptyColumns.length > 0) {
    warnings.push({
      code: 'empty-column',
      severity: 'warning',
      message: 'One or more columns contain no values in the sampled rows.',
      columns: emptyColumns,
    })
  }
  const identifierCandidates = preview.columns
    .filter(column => preview.sampledRowCount > 1 && column.missingCount === 0 && column.uniqueCount === preview.sampledRowCount)
    .map(column => column.name)
  if (identifierCandidates.length > 0) {
    warnings.push({
      code: 'identifier-candidate',
      severity: 'info',
      message: 'These columns are unique in the sample and may be identifiers rather than analytical features.',
      columns: identifierCandidates,
    })
  }

  return {
    scope: 'preview-sample',
    sampledRowCount: preview.sampledRowCount,
    columnCount: preview.columns.length,
    missingCellCount,
    missingRate: totalCells === 0 ? 0 : missingCellCount / totalCells,
    completeRowCount: preview.rows.filter(row => row.every(value => value.trim() !== '')).length,
    numericColumnCount: preview.columns.filter(column => column.inferredType === 'integer' || column.inferredType === 'number').length,
    truncated: preview.truncated,
    columns: preview.columns,
    warnings,
  }
}

function markdownCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function qualityReport(input: {
  project: ScienceProject
  dataset: ScienceDataset
  runId: string
  summary: ScienceQualitySummary
  createdAt: string
}): string {
  const { project, dataset, runId, summary, createdAt } = input
  const warningLines = summary.warnings.length === 0
    ? '- No deterministic warnings were raised for the sampled rows.'
    : summary.warnings.map(warning => {
      const columns = warning.columns.length > 0 ? ` Columns: ${warning.columns.join(', ')}.` : ''
      return `- **${warning.severity.toUpperCase()} — ${warning.code}:** ${warning.message}${columns}`
    }).join('\n')
  const columnRows = summary.columns.map(column => (
    `| ${markdownCell(column.name)} | ${column.inferredType} | ${column.missingCount} | ${column.uniqueCount} |`
  )).join('\n')

  return `# Data quality profile\n\n` +
    `- Project: ${project.name}\n` +
    `- Dataset: ${dataset.name}\n` +
    `- Dataset version: ${dataset.currentVersion.ordinal}\n` +
    `- Input SHA-256: \`${dataset.currentVersion.contentHash}\`\n` +
    `- Run: \`${runId}\`\n` +
    `- Recipe: \`${QUALITY_RECIPE}\`\n` +
    `- Generated locally: ${createdAt}\n\n` +
    `## Scope\n\n` +
    `This deterministic profile inspected ${summary.sampledRowCount} safely parsed rows and ${summary.columnCount} columns. ` +
    `${summary.truncated ? 'The source was sampled, so the results must not be treated as full-dataset statistics.' : 'The registered table fit within the safe local preview boundary.'}\n\n` +
    `## Summary\n\n` +
    `- Complete rows: ${summary.completeRowCount}\n` +
    `- Missing cells: ${summary.missingCellCount} (${(summary.missingRate * 100).toFixed(2)}%)\n` +
    `- Numeric columns: ${summary.numericColumnCount}\n\n` +
    `## Column profile\n\n` +
    `| Column | Inferred type | Missing | Unique |\n` +
    `| --- | --- | ---: | ---: |\n${columnRows}\n\n` +
    `## Deterministic checks\n\n${warningLines}\n\n` +
    `## Limitations\n\n` +
    `This report describes structure and data quality only. It does not establish scientific validity, treatment effects, or statistical significance. No table contents were sent to a model.\n`
}

function csvCell(value: string | number): string {
  const rendered = String(value)
  return /[",\n]/.test(rendered) ? `"${rendered.replaceAll('"', '""')}"` : rendered
}

function normalizedDoseResponseCsv(summary: ScienceDoseResponseSummary): string {
  const header = [
    'well',
    'role',
    'label',
    'concentration',
    'replicate',
    'raw_signal',
    'blank_corrected_signal',
    'normalized_viability_percent',
  ]
  const rows = summary.normalizedWells.map(well => [
    well.well,
    well.role,
    well.label,
    well.concentration ?? '',
    well.replicate,
    well.rawSignal,
    well.blankCorrectedSignal,
    well.normalizedViabilityPercent,
  ].map(csvCell).join(','))
  return `${header.join(',')}\n${rows.join('\n')}\n`
}

function doseResponseReport(input: {
  project: ScienceProject
  dataset: ScienceDataset
  experiment: ScienceExperiment
  runId: string
  summary: ScienceDoseResponseSummary
  evidence: ScienceEvidence
  createdAt: string
}): string {
  const { project, dataset, experiment, runId, summary, evidence, createdAt } = input
  const unit = experiment.protocolVersion.protocol.concentrationUnit ?? ''
  const warningLines = summary.warnings.length === 0
    ? '- No deterministic review flags were raised.'
    : summary.warnings.map(warning => {
      const concentrations = warning.concentrations.length > 0
        ? ` Concentrations: ${warning.concentrations.join(', ')} ${unit}.`
        : ''
      return `- **${warning.severity.toUpperCase()} — ${warning.code}:** ${warning.message}${concentrations}`
    }).join('\n')
  const pointRows = summary.points.map(point => (
    `| ${point.concentration} | ${point.replicateCount} | ${point.meanViabilityPercent.toFixed(4)} | ` +
    `${point.standardDeviation.toFixed(4)} | ${point.coefficientOfVariationPercent?.toFixed(2) ?? '—'} |`
  )).join('\n')

  return `# Cell viability dose-response analysis\n\n` +
    `- Project: ${project.name}\n` +
    `- Experiment: ${experiment.name}\n` +
    `- Dataset: ${dataset.name}\n` +
    `- Dataset version: ${dataset.currentVersion.ordinal}\n` +
    `- Protocol version: ${experiment.protocolVersion.ordinal}\n` +
    `- Design version: ${experiment.designVersion.ordinal}\n` +
    `- Input SHA-256: \`${dataset.currentVersion.contentHash}\`\n` +
    `- Run: \`${runId}\`\n` +
    `- Recipe: \`${DOSE_RESPONSE_RECIPE}\`\n` +
    `- Generated locally: ${createdAt}\n\n` +
    `## Mapping and normalization\n\n` +
    `- Well column: \`${summary.wellColumn}\`\n` +
    `- Signal column: \`${summary.signalColumn}\`\n` +
    `- Assigned wells: ${summary.assignedWellCount}\n` +
    `- Ignored unassigned rows: ${summary.ignoredRowCount}\n` +
    `- Blank mean signal: ${summary.blankMeanSignal.toFixed(6)}\n` +
    `- Vehicle mean after blank correction: ${summary.vehicleMeanBlankCorrectedSignal.toFixed(6)}\n\n` +
    `Normalized viability is calculated as 100 × (raw signal − blank mean) / ` +
    `(vehicle mean − blank mean). Control wells are used for normalization and are not included in the 4PL treatment fit.\n\n` +
    `## Replicate summary\n\n` +
    `| Concentration (${unit}) | n | Mean viability % | SD | CV % |\n` +
    `| ---: | ---: | ---: | ---: | ---: |\n${pointRows}\n\n` +
    `## Four-parameter logistic fit\n\n` +
    `- Relative IC50: ${summary.fit.relativeIc50.toPrecision(6)} ${unit}\n` +
    `- Tested-range position: ${summary.fit.testedRangePosition}\n` +
    `- Top: ${summary.fit.top.toFixed(4)}%\n` +
    `- Bottom: ${summary.fit.bottom.toFixed(4)}%\n` +
    `- Hill slope: ${summary.fit.hillSlope.toFixed(4)}\n` +
    `- R²: ${summary.fit.rSquared.toFixed(6)}\n` +
    `- RMSE: ${summary.fit.rmse.toFixed(6)}\n` +
    `- Review status: ${summary.fit.reviewStatus}\n\n` +
    `## Deterministic review flags\n\n${warningLines}\n\n` +
    `## Scientific evidence\n\n` +
    `- Evidence level: ${evidence.level}\n` +
    `- Technical verdict: ${evidence.verdict}\n` +
    `- Evaluation contract: \`${evidence.contractId}@${evidence.contractVersion}\`\n` +
    `- Passed criteria: ${evidence.metrics.filter(metric => metric.passed).length}/${evidence.metrics.length}\n` +
    `${evidence.failedCriterionIds.length > 0 ? `- Failed criteria: ${evidence.failedCriterionIds.join(', ')}\n` : ''}\n` +
    `The verdict applies only to the versioned deterministic technical criteria. It is separate from run completion and does not constitute external verification.\n\n` +
    `## Limitations\n\n` +
    `The relative IC50 is the fitted midpoint between the 4PL top and bottom. A value outside the tested ` +
    `concentration range is an extrapolation. This deterministic output does not provide confidence intervals, ` +
    `statistical sign-off, biological replication, or a scientific conclusion. No table contents were sent to a model.\n`
}

export class ScienceAnalysisService {
  private activeRuns = new Set<string>()
  private runExportPromises = new Map<string, Promise<void>>()

  async listRuns(projectId: string): Promise<ScienceAnalysisRun[]> {
    const project = await scienceWorkspaceService.getProject(projectId)
    await this.recoverInterruptedRuns(project)
    const database = openProjectDatabase(project)
    try {
      return (database
        .query(`${RUN_SELECT} WHERE analysis_runs.project_id = ? ORDER BY analysis_runs.created_at DESC`)
        .all(project.id) as RunRow[]).map(mapRun)
    } finally {
      database.close()
    }
  }

  async listArtifacts(projectId: string): Promise<ScienceArtifact[]> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const database = openProjectDatabase(project)
    try {
      return (database
        .query('SELECT * FROM science_artifacts WHERE project_id = ? ORDER BY created_at DESC')
        .all(project.id) as ArtifactRow[]).map(mapArtifact)
    } finally {
      database.close()
    }
  }

  async createQualityRun(input: {
    projectId: string
    datasetId: string
    datasetVersionId?: string
    maxRows?: number
    parentRunId?: string
  }): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    const project = await scienceWorkspaceService.getProject(input.projectId)
    const dataset = await scienceWorkspaceService.getDatasetVersion({
      projectId: project.id,
      datasetId: input.datasetId,
      versionId: input.datasetVersionId,
    })
    const maxRows = Math.max(10, Math.min(input.maxRows ?? 100, 100))
    return this.executeAnalysisRun({
      project,
      dataset,
      experimentId: null,
      recipe: QUALITY_RECIPE,
      recipeSource: QUALITY_RECIPE_SOURCE,
      parameters: { maxRows },
      inputHash: dataset.currentVersion.contentHash,
      parentRunId: input.parentRunId,
      buildOutput: async ({ runId, createdAt, recipeHash, environment }) => {
        const preview = await scienceWorkspaceService.previewDatasetVersion(
          project.id,
          dataset.id,
          dataset.currentVersion.id,
          { maxRows },
        )
        const summary = qualitySummary(preview)
        const artifactDirectory = path.join('artifacts', 'sciencex', runId)
        const reportContents = qualityReport({ project, dataset, runId, summary, createdAt })
        const profileContents = `${JSON.stringify({
          schemaVersion: 1,
          runId,
          projectId: project.id,
          datasetId: dataset.id,
          datasetVersionId: dataset.currentVersion.id,
          inputHash: dataset.currentVersion.contentHash,
          recipe: QUALITY_RECIPE,
          recipeHash,
          environment,
          summary,
        }, null, 2)}\n`
        return {
          summary,
          artifacts: [
            {
              kind: 'report',
              name: 'Data quality profile',
              relativePath: path.join(artifactDirectory, 'quality-report.md'),
              mimeType: 'text/markdown',
              contents: reportContents,
            },
            {
              kind: 'table',
              name: 'Column profile data',
              relativePath: path.join(artifactDirectory, 'profile.json'),
              mimeType: 'application/json',
              contents: profileContents,
            },
          ],
        }
      },
    })
  }

  async createDoseResponseRun(input: {
    projectId: string
    experimentId: string
    wellColumn: string
    signalColumn: string
    parentRunId?: string
  }): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    const project = await scienceWorkspaceService.getProject(input.projectId)
    const experiment = await scienceExperimentService.getExperiment(project.id, input.experimentId)
    const parent = input.parentRunId ? (await this.findRun(input.parentRunId)).run : null
    if (parent && (parent.projectId !== project.id || parent.experimentId !== experiment.id ||
      parent.recipe !== DOSE_RESPONSE_RECIPE || parent.status !== 'completed')) {
      throw ApiError.conflict('Replay must reference a completed run of this experiment')
    }
    if (experiment.status !== 'ready') {
      throw ApiError.conflict('Only an execution-ready experiment can start dose-response analysis')
    }
    const datasetId = parent?.datasetId ?? experiment.linkedDatasetId
    const datasetVersionId = parent?.datasetVersionId ?? experiment.linkedDatasetVersionId
    if (!datasetId || !datasetVersionId) {
      throw ApiError.conflict('Link a registered dataset version before starting dose-response analysis')
    }
    const dataset = await scienceWorkspaceService.getDatasetVersion({
      projectId: project.id,
      datasetId,
      versionId: datasetVersionId,
    })
    const wellColumn = input.wellColumn.trim()
    const signalColumn = input.signalColumn.trim()
    if (!wellColumn || !signalColumn) {
      throw ApiError.badRequest('Well and signal column names are required')
    }
    const parameters: ScienceAnalysisParameters = {
      experimentId: experiment.id,
      wellColumn,
      signalColumn,
    }
    const inputHash = sha256(JSON.stringify({
      datasetHash: dataset.currentVersion.contentHash,
      datasetVersionId: dataset.currentVersion.id,
      protocolVersionId: experiment.protocolVersion.id,
      designVersionId: experiment.designVersion.id,
      parameters,
    }))
    if (parent && inputHash !== parent.inputHash) {
      throw ApiError.conflict('The original experiment inputs are unavailable for exact replay')
    }
    return this.executeAnalysisRun({
      project,
      dataset,
      experimentId: experiment.id,
      recipe: DOSE_RESPONSE_RECIPE,
      recipeSource: DOSE_RESPONSE_RECIPE_SOURCE,
      evaluationContract: CELL_VIABILITY_EVALUATION_CONTRACT,
      parameters,
      inputHash,
      parentRunId: input.parentRunId,
      buildOutput: async ({ runId, createdAt, recipeHash, environment }) => {
        const preview = await scienceWorkspaceService.previewDatasetVersion(
          project.id,
          dataset.id,
          dataset.currentVersion.id,
          { maxRows: 100 },
        )
        if (preview.truncated) {
          throw new ScienceDoseResponseAnalysisError(
            'The linked plate table exceeds the 100-row deterministic analysis boundary',
          )
        }
        const summary = analyzeCellViabilityDoseResponse({
          protocol: experiment.protocolVersion.protocol,
          design: experiment.designVersion.design,
          headers: preview.headers,
          rows: preview.rows,
          wellColumn,
          signalColumn,
        })
        const evidence = evaluateCellViabilityEvidence({
          summary,
          artifactIds: [],
          evaluatedAt: createdAt,
        })
        const artifactDirectory = path.join('artifacts', 'sciencex', runId)
        const reportContents = doseResponseReport({
          project,
          dataset,
          experiment,
          runId,
          summary,
          evidence,
          createdAt,
        })
        const resultContents = `${JSON.stringify({
          schemaVersion: 1,
          runId,
          projectId: project.id,
          experimentId: experiment.id,
          protocolVersionId: experiment.protocolVersion.id,
          designVersionId: experiment.designVersion.id,
          datasetId: dataset.id,
          datasetVersionId: dataset.currentVersion.id,
          inputHash,
          recipe: DOSE_RESPONSE_RECIPE,
          recipeHash,
          environment,
          summary,
        }, null, 2)}\n`
        return {
          summary,
          evidence,
          artifacts: [
            {
              kind: 'report',
              name: 'Dose-response analysis report',
              relativePath: path.join(artifactDirectory, 'dose-response-report.md'),
              mimeType: 'text/markdown',
              contents: reportContents,
            },
            {
              kind: 'table',
              name: 'Normalized well responses',
              relativePath: path.join(artifactDirectory, 'normalized-wells.csv'),
              mimeType: 'text/csv',
              contents: normalizedDoseResponseCsv(summary),
            },
            {
              kind: 'table',
              name: 'Dose-response result data',
              relativePath: path.join(artifactDirectory, 'dose-response.json'),
              mimeType: 'application/json',
              contents: resultContents,
            },
          ],
        }
      },
    })
  }

  private async executeAnalysisRun(input: {
    project: ScienceProject
    dataset: ScienceDataset
    experimentId: string | null
    recipe: ScienceAnalysisRecipe
    recipeSource: string
    evaluationContract?: ScienceEvaluationContract
    parameters: ScienceAnalysisParameters
    inputHash: string
    parentRunId?: string
    buildOutput: (context: {
      runId: string
      createdAt: string
      recipeHash: string
      environment: ScienceAnalysisRun['environment']
    }) => Promise<AnalysisOutput>
  }): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    const {
      project,
      dataset,
      experimentId,
      recipe,
      recipeSource,
      evaluationContract,
      parameters,
      inputHash,
      parentRunId,
      buildOutput,
    } = input
    const runId = randomUUID()
    const createdAt = new Date().toISOString()
    const eventLogPath = path.join('.sciencex', 'runs', runId, 'events.jsonl')
    const manifestPath = path.join('.sciencex', 'runs', runId, 'run.json')
    const environment: ScienceAnalysisRun['environment'] = {
      runtime: 'bun',
      runtimeVersion: Bun.version,
      platform: process.platform,
      architecture: process.arch,
      localOnly: true,
    }
    const evaluationContractJson = evaluationContract ? JSON.stringify(evaluationContract) : null
    const recipeHash = sha256(evaluationContractJson
      ? `${recipeSource}\n${evaluationContractJson}`
      : recipeSource)
    const database = openProjectDatabase(project)
    this.activeRuns.add(runId)

    try {
      database
        .query(`
          INSERT INTO analysis_runs (
            id, project_id, dataset_id, dataset_version_id, experiment_id, parent_run_id, recipe, status,
            reproducibility_status, evaluation_contract_json, evidence_json,
            parameters_json, environment_json, input_hash, recipe_hash,
            event_log_path, manifest_path, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 'unchecked', ?, NULL, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          runId,
          project.id,
          dataset.id,
          dataset.currentVersion.id,
          experimentId,
          parentRunId ?? null,
          recipe,
          evaluationContractJson,
          JSON.stringify(parameters),
          JSON.stringify(environment),
          inputHash,
          recipeHash,
          eventLogPath,
          manifestPath,
          createdAt,
        )

      await appendEvent(project, eventLogPath, runId, 'run.created', {
        recipe,
        experimentId,
        datasetId: dataset.id,
        datasetVersionId: dataset.currentVersion.id,
        inputHash,
        parameters,
      })
      const startedAt = new Date().toISOString()
      this.transition(database, runId, 'queued', 'running', startedAt)
      await appendEvent(project, eventLogPath, runId, 'run.started', { environment, recipeHash })
      const output = await buildOutput({ runId, createdAt, recipeHash, environment })
      const summary = output.summary
      const artifactInputs = output.artifacts
      if (Boolean(output.evidence) !== Boolean(evaluationContract)) {
        throw ApiError.internal('Science evaluation output does not match the registered contract')
      }
      for (const artifact of artifactInputs) {
        await writeFileAtomically(path.join(project.rootDir, artifact.relativePath), artifact.contents)
      }
      const artifacts = artifactInputs.map(artifact => ({
        id: randomUUID(),
        projectId: project.id,
        producingRunId: runId,
        kind: artifact.kind,
        name: artifact.name,
        relativePath: artifact.relativePath,
        mimeType: artifact.mimeType,
        contentHash: sha256(artifact.contents),
        sizeBytes: Buffer.byteLength(artifact.contents),
        createdAt: new Date().toISOString(),
      }))
      const insertArtifacts = () => {
        for (const artifact of artifacts) {
          database
            .query(`
              INSERT INTO science_artifacts (
                id, project_id, producing_run_id, kind, name, relative_path, mime_type,
                content_hash, size_bytes, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              artifact.id,
              artifact.projectId,
              artifact.producingRunId,
              artifact.kind,
              artifact.name,
              artifact.relativePath,
              artifact.mimeType,
              artifact.contentHash,
              artifact.sizeBytes,
              artifact.createdAt,
            )
        }
      }

      const evidence = output.evidence
        ? { ...output.evidence, artifactIds: artifacts.map(artifact => artifact.id) }
        : null

      let reproducibilityStatus: ScienceReproducibilityStatus = 'unchecked'
      if (parentRunId) {
        const parent = database
          .query(`${RUN_SELECT} WHERE analysis_runs.id = ?`)
          .get(parentRunId) as RunRow | null
        const comparable = parent?.status === 'completed' &&
          parent.recipe === recipe &&
          (parent.experiment_id ?? null) === experimentId &&
          parent.dataset_version_id === dataset.currentVersion.id &&
          parent.input_hash === inputHash &&
          parent.recipe_hash === recipeHash &&
          parent.parameters_json === JSON.stringify(parameters) &&
          parent.summary_json !== null &&
          sha256(parent.summary_json) === sha256(JSON.stringify(summary))
        reproducibilityStatus = comparable ? 'reproducible' : 'failed'
      }

      const completedAt = new Date().toISOString()
      const completeRun = database.transaction(() => {
        insertArtifacts()
        if (parentRunId) {
          database
            .query('UPDATE analysis_runs SET reproducibility_status = ? WHERE id = ?')
            .run(reproducibilityStatus, parentRunId)
        }
        const result = database
          .query(`
            UPDATE analysis_runs
            SET status = 'completed', reproducibility_status = ?,
                summary_json = ?, evidence_json = ?, exit_code = 0, completed_at = ?
            WHERE id = ? AND status = 'running'
          `)
          .run(
            reproducibilityStatus,
            JSON.stringify(summary),
            evidence ? JSON.stringify(evidence) : null,
            completedAt,
            runId,
          )
        if (result.changes !== 1) {
          throw ApiError.conflict('Analysis run left the running state unexpectedly')
        }
      })
      completeRun()
      const row = database
        .query(`${RUN_SELECT} WHERE analysis_runs.id = ?`)
        .get(runId) as RunRow
      const run = mapRun(row)
      await this.syncRunExports(project, run, artifacts).catch(error => {
        console.warn(`[Science] Run ${runId} completed; exports will be retried when read:`, error)
      })
      return { run, artifacts }
    } catch (error) {
      const completedAt = new Date().toISOString()
      const message = error instanceof Error ? error.message : String(error)
      const failed = database
        .query(`
          UPDATE analysis_runs
          SET status = 'failed', reproducibility_status = 'failed', error_message = ?,
              exit_code = 1, completed_at = ?
          WHERE id = ? AND status IN ('queued', 'running')
        `)
        .run(message, completedAt, runId)
      if (failed.changes === 1) {
        const row = database.query(`${RUN_SELECT} WHERE analysis_runs.id = ?`).get(runId) as RunRow
        await this.syncRunExports(project, mapRun(row), []).catch(exportError => {
          console.warn(`[Science] Run ${runId} failed; exports will be retried when read:`, exportError)
        })
      }
      if (error instanceof ScienceDoseResponseAnalysisError) {
        throw ApiError.conflict(error.message)
      }
      throw error
    } finally {
      this.activeRuns.delete(runId)
      database.close()
    }
  }

  async replayRun(runId: string): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    const location = await this.findRun(runId)
    if (location.run.status !== 'completed' || !location.run.summary) {
      throw ApiError.conflict('Only completed analysis runs can be replayed')
    }
    if (location.run.recipe === QUALITY_RECIPE) {
      const parameters = location.run.parameters as { maxRows: number }
      return this.createQualityRun({
        projectId: location.project.id,
        datasetId: location.run.datasetId,
        datasetVersionId: location.run.datasetVersionId,
        maxRows: parameters.maxRows,
        parentRunId: location.run.id,
      })
    }
    const parameters = location.run.parameters as {
      experimentId: string
      wellColumn: string
      signalColumn: string
    }
    return this.createDoseResponseRun({
      projectId: location.project.id,
      experimentId: parameters.experimentId,
      wellColumn: parameters.wellColumn,
      signalColumn: parameters.signalColumn,
      parentRunId: location.run.id,
    })
  }

  async getRunEvents(runId: string): Promise<ScienceRunEvent[]> {
    const { project, run } = await this.findRun(runId)
    if (run.status !== 'queued' && run.status !== 'running') {
      const database = openProjectDatabase(project)
      let artifacts: ScienceArtifact[]
      try {
        artifacts = (database.query('SELECT * FROM science_artifacts WHERE producing_run_id = ? ORDER BY rowid')
          .all(runId) as ArtifactRow[]).map(mapArtifact)
      } finally { database.close() }
      await this.syncRunExports(project, run, artifacts).catch(error => {
        console.warn(`[Science] Run ${run.id} exports are unavailable; returning existing events:`, error)
      })
    }
    return this.readRunEvents(project, run)
  }

  private async readRunEvents(project: ScienceProject, run: ScienceAnalysisRun): Promise<ScienceRunEvent[]> {
    const eventLogPath = path.join(project.rootDir, run.eventLogPath)
    const snapshot = await fs.stat(eventLogPath).catch(() => null)
    if (!snapshot) return []
    if (!snapshot.isFile() || snapshot.size > MAX_EVENT_LOG_BYTES) {
      throw ApiError.conflict('Science run event log is unavailable or exceeds the safe read limit')
    }
    const contents = await fs.readFile(eventLogPath, 'utf8')
    return contents.split('\n').filter(Boolean).map((line, index) => {
      try {
        return JSON.parse(line) as ScienceRunEvent
      } catch {
        throw ApiError.internal(`Science run event ${index + 1} is malformed`)
      }
    })
  }

  private transition(
    database: Database,
    runId: string,
    from: ScienceRunStatus,
    to: ScienceRunStatus,
    startedAt: string,
  ): void {
    const result = database
      .query('UPDATE analysis_runs SET status = ?, started_at = ? WHERE id = ? AND status = ?')
      .run(to, startedAt, runId, from)
    if (result.changes !== 1) {
      throw ApiError.conflict(`Analysis run cannot transition from ${from} to ${to}`)
    }
  }

  private async findRun(runId: string): Promise<RunLocation> {
    const projects = await scienceWorkspaceService.listProjects()
    for (const project of projects) {
      if (!project.rootAvailable) continue
      await scienceWorkspaceService.getProject(project.id)
      const database = openProjectDatabase(project)
      try {
        const row = database
          .query(`${RUN_SELECT} WHERE analysis_runs.id = ?`)
          .get(runId) as RunRow | null
        if (row) return { project, run: mapRun(row) }
      } finally {
        database.close()
      }
    }
    throw ApiError.notFound(`Analysis run not found: ${runId}`)
  }

  private async recoverInterruptedRuns(project: ScienceProject): Promise<void> {
    const database = openProjectDatabase(project)
    try {
      const pending = database
        .query("SELECT * FROM analysis_runs WHERE status IN ('queued', 'running')")
        .all() as RunRow[]
      for (const row of pending) {
        if (this.activeRuns.has(row.id)) continue
        const completedAt = new Date().toISOString()
        const result = database
          .query(`
            UPDATE analysis_runs
            SET status = 'interrupted', reproducibility_status = 'failed',
                error_message = 'Run was interrupted before completion', completed_at = ?
            WHERE id = ? AND status IN ('queued', 'running')
          `)
          .run(completedAt, row.id)
        if (result.changes === 1) {
          await appendEvent(project, row.event_log_path, row.id, 'run.interrupted', {
            message: 'Run was interrupted before completion',
          })
        }
      }
    } finally {
      database.close()
    }
  }

  private async syncRunExports(
    project: ScienceProject,
    run: ScienceAnalysisRun,
    artifacts: ScienceArtifact[],
  ): Promise<void> {
    const previous = this.runExportPromises.get(run.id)
    const pending = (async () => {
      await previous?.catch(() => undefined)
      const events = await this.readRunEvents(project, run)
      const hasTerminalEvent = events.some(event =>
        event.type === 'run.completed' || event.type === 'run.failed' || event.type === 'run.interrupted')
      const ensureEvent = async (type: ScienceRunEvent['type'], data: Record<string, unknown>, at: string) => {
        // Preserve historical logs; recovery only appends an unfinished export suffix.
        if (hasTerminalEvent) return
        if (events.some(event => event.type === type &&
          (type !== 'artifact.created' || event.data.artifactId === data.artifactId))) return
        events.push(await appendEvent(project, run.eventLogPath, run.id, type, data, at))
      }
      await ensureEvent('run.created', {
        recipe: run.recipe,
        experimentId: run.experimentId,
        datasetId: run.datasetId,
        datasetVersionId: run.datasetVersionId,
        inputHash: run.inputHash,
        parameters: run.parameters,
      }, run.createdAt)
      if (run.startedAt) await ensureEvent('run.started', {
        environment: run.environment, recipeHash: run.recipeHash,
      }, run.startedAt)
      for (const artifact of artifacts) {
        await ensureEvent('artifact.created', {
          artifactId: artifact.id, kind: artifact.kind,
          relativePath: artifact.relativePath, contentHash: artifact.contentHash,
        }, artifact.createdAt)
      }
      const completedAt = run.completedAt ?? run.createdAt
      if (run.status === 'completed') {
        const evidence = run.evidence
        if (evidence) await ensureEvent('run.evaluated', {
          evidenceLevel: evidence.level, verdict: evidence.verdict,
          contractId: evidence.contractId, contractVersion: evidence.contractVersion,
          contractHash: evidence.contractHash, failedCriterionIds: evidence.failedCriterionIds,
          artifactIds: evidence.artifactIds,
        }, completedAt)
        await ensureEvent('run.completed', {
          exitCode: 0, reproducibilityStatus: run.reproducibilityStatus,
          evidenceVerdict: evidence?.verdict ?? null, artifactIds: artifacts.map(artifact => artifact.id),
        }, completedAt)
      } else if (run.status === 'failed') {
        await ensureEvent('run.failed', { exitCode: 1, message: run.errorMessage }, completedAt)
      } else if (run.status === 'interrupted') {
        await ensureEvent('run.interrupted', { message: run.errorMessage }, completedAt)
      }
      await this.writeManifest(project, run, artifacts)
    })()
    this.runExportPromises.set(run.id, pending)
    try {
      await pending
    } finally {
      if (this.runExportPromises.get(run.id) === pending) this.runExportPromises.delete(run.id)
    }
  }

  private async writeManifest(
    project: ScienceProject,
    run: ScienceAnalysisRun,
    artifacts: ScienceArtifact[],
  ): Promise<void> {
    const manifestPath = path.join(project.rootDir, run.manifestPath)
    const previous = await fs.readFile(manifestPath, 'utf8').catch(error => {
      if (error?.code === 'ENOENT') return null
      throw error
    })
    const existing = previous ? parseJson<{
      [key: string]: unknown
      run?: Record<string, unknown>
      artifacts?: ScienceArtifact[]
    }>(previous, 'run manifest') : {}
    const existingArtifacts = new Map((Array.isArray(existing.artifacts) ? existing.artifacts : [])
      .map((artifact: ScienceArtifact) => [artifact.id, artifact]))
    const contents = `${JSON.stringify({
      ...existing,
      schemaVersion: 2,
      run: { ...existing.run, ...run },
      artifacts: artifacts.map(artifact => ({ ...existingArtifacts.get(artifact.id), ...artifact })),
    }, null, 2)}\n`
    if (contents !== previous) await writeFileAtomically(manifestPath, contents)
  }
}

export const scienceAnalysisService = new ScienceAnalysisService()
