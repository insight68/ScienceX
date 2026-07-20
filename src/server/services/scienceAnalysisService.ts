import { createHash, randomBytes, randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Database } from 'bun:sqlite'
import { ApiError } from '../middleware/errorHandler.js'
import {
  scienceWorkspaceService,
  type ScienceColumnProfile,
  type ScienceDataset,
  type ScienceDatasetPreview,
  type ScienceProject,
} from './scienceWorkspaceService.js'

const QUALITY_RECIPE = 'table-quality-v1' as const
const QUALITY_RECIPE_SOURCE = 'sciencex:table-quality-v1:preview-profile:2026-07-19'
const MAX_EVENT_LOG_BYTES = 2 * 1024 * 1024

export type ScienceRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'
export type ScienceReproducibilityStatus = 'unchecked' | 'reproducible' | 'failed' | 'stale'
export type ScienceArtifactKind = 'table' | 'report' | 'other'

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
  parentRunId: string | null
  recipe: typeof QUALITY_RECIPE
  status: ScienceRunStatus
  reproducibilityStatus: ScienceReproducibilityStatus
  parameters: { maxRows: number }
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
  summary: ScienceQualitySummary | null
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
  type: 'run.created' | 'run.started' | 'artifact.created' | 'run.completed' | 'run.failed' | 'run.interrupted'
  at: string
  data: Record<string, unknown>
}

type RunRow = {
  id: string
  project_id: string
  dataset_id: string
  dataset_version_id: string
  parent_run_id: string | null
  recipe: typeof QUALITY_RECIPE
  status: ScienceRunStatus
  reproducibility_status: ScienceReproducibilityStatus
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
    parentRunId: row.parent_run_id,
    recipe: row.recipe,
    status: row.status,
    reproducibilityStatus: row.reproducibility_status,
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
): Promise<ScienceRunEvent> {
  const event: ScienceRunEvent = { id: randomUUID(), runId, type, at: new Date().toISOString(), data }
  const absolutePath = path.join(project.rootDir, relativePath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 })
  const handle = await fs.open(absolutePath, 'a', 0o600)
  try {
    await handle.appendFile(`${JSON.stringify(event)}\n`, 'utf8')
  } finally {
    await handle.close()
  }
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

export class ScienceAnalysisService {
  private activeRuns = new Set<string>()

  async listRuns(projectId: string): Promise<ScienceAnalysisRun[]> {
    const project = await scienceWorkspaceService.getProject(projectId)
    await this.recoverInterruptedRuns(project)
    const database = openProjectDatabase(project)
    try {
      database.query(`
        UPDATE analysis_runs
        SET reproducibility_status = 'stale'
        WHERE project_id = ?
          AND status = 'completed'
          AND reproducibility_status = 'reproducible'
          AND dataset_version_id NOT IN (
            SELECT latest.id
            FROM dataset_versions latest
            WHERE latest.dataset_id = analysis_runs.dataset_id
              AND latest.ordinal = (
                SELECT MAX(candidate.ordinal)
                FROM dataset_versions candidate
                WHERE candidate.dataset_id = latest.dataset_id
              )
          )
      `).run(project.id)
      return (database
        .query('SELECT * FROM analysis_runs WHERE project_id = ? ORDER BY created_at DESC')
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
    maxRows?: number
    parentRunId?: string
  }): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    const project = await scienceWorkspaceService.getProject(input.projectId)
    const dataset = (await scienceWorkspaceService.listDatasets(project.id))
      .find(candidate => candidate.id === input.datasetId)
    if (!dataset) throw ApiError.notFound(`Dataset not found in research project: ${input.datasetId}`)

    const maxRows = Math.max(10, Math.min(input.maxRows ?? 100, 100))
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
    const parameters = { maxRows }
    const recipeHash = sha256(QUALITY_RECIPE_SOURCE)
    const database = openProjectDatabase(project)
    database
      .query(`
        INSERT INTO analysis_runs (
          id, project_id, dataset_id, dataset_version_id, parent_run_id, recipe, status,
          reproducibility_status, parameters_json, environment_json, input_hash, recipe_hash,
          event_log_path, manifest_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'queued', 'unchecked', ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        runId,
        project.id,
        dataset.id,
        dataset.currentVersion.id,
        input.parentRunId ?? null,
        QUALITY_RECIPE,
        JSON.stringify(parameters),
        JSON.stringify(environment),
        dataset.currentVersion.contentHash,
        recipeHash,
        eventLogPath,
        manifestPath,
        createdAt,
      )

    await appendEvent(project, eventLogPath, runId, 'run.created', {
      recipe: QUALITY_RECIPE,
      datasetId: dataset.id,
      datasetVersionId: dataset.currentVersion.id,
      inputHash: dataset.currentVersion.contentHash,
      parameters,
    })
    this.activeRuns.add(runId)

    try {
      const startedAt = new Date().toISOString()
      this.transition(database, runId, 'queued', 'running', startedAt)
      await appendEvent(project, eventLogPath, runId, 'run.started', { environment, recipeHash })

      const preview = await scienceWorkspaceService.previewDataset(dataset.id, { maxRows })
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
      const artifactInputs = [
        {
          kind: 'report' as const,
          name: 'Data quality profile',
          relativePath: path.join(artifactDirectory, 'quality-report.md'),
          mimeType: 'text/markdown',
          contents: reportContents,
        },
        {
          kind: 'table' as const,
          name: 'Column profile data',
          relativePath: path.join(artifactDirectory, 'profile.json'),
          mimeType: 'application/json',
          contents: profileContents,
        },
      ]
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
      const insertArtifacts = database.transaction(() => {
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
      })
      insertArtifacts()
      for (const artifact of artifacts) {
        await appendEvent(project, eventLogPath, runId, 'artifact.created', {
          artifactId: artifact.id,
          kind: artifact.kind,
          relativePath: artifact.relativePath,
          contentHash: artifact.contentHash,
        })
      }

      const completedAt = new Date().toISOString()
      const result = database
        .query(`
          UPDATE analysis_runs
          SET status = 'completed', reproducibility_status = 'reproducible',
              summary_json = ?, exit_code = 0, completed_at = ?
          WHERE id = ? AND status = 'running'
        `)
        .run(JSON.stringify(summary), completedAt, runId)
      if (result.changes !== 1) throw ApiError.conflict('Analysis run left the running state unexpectedly')
      await appendEvent(project, eventLogPath, runId, 'run.completed', {
        exitCode: 0,
        reproducibilityStatus: 'reproducible',
        artifactIds: artifacts.map(artifact => artifact.id),
      })

      const row = database.query('SELECT * FROM analysis_runs WHERE id = ?').get(runId) as RunRow
      const run = mapRun(row)
      await this.writeManifest(project, run, artifacts)
      return { run, artifacts }
    } catch (error) {
      const completedAt = new Date().toISOString()
      const message = error instanceof Error ? error.message : String(error)
      database
        .query(`
          UPDATE analysis_runs
          SET status = 'failed', reproducibility_status = 'failed', error_message = ?,
              exit_code = 1, completed_at = ?
          WHERE id = ? AND status IN ('queued', 'running')
        `)
        .run(message, completedAt, runId)
      await appendEvent(project, eventLogPath, runId, 'run.failed', { exitCode: 1, message })
        .catch(() => undefined)
      const row = database.query('SELECT * FROM analysis_runs WHERE id = ?').get(runId) as RunRow | null
      if (row) await this.writeManifest(project, mapRun(row), []).catch(() => undefined)
      throw error
    } finally {
      this.activeRuns.delete(runId)
      database.close()
    }
  }

  async replayRun(runId: string): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    const location = await this.findRun(runId)
    return this.createQualityRun({
      projectId: location.project.id,
      datasetId: location.run.datasetId,
      maxRows: location.run.parameters.maxRows,
      parentRunId: location.run.id,
    })
  }

  async getRunEvents(runId: string): Promise<ScienceRunEvent[]> {
    const { project, run } = await this.findRun(runId)
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
        const row = database.query('SELECT * FROM analysis_runs WHERE id = ?').get(runId) as RunRow | null
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

  private async writeManifest(
    project: ScienceProject,
    run: ScienceAnalysisRun,
    artifacts: ScienceArtifact[],
  ): Promise<void> {
    await writeFileAtomically(
      path.join(project.rootDir, run.manifestPath),
      `${JSON.stringify({ schemaVersion: 1, run, artifacts }, null, 2)}\n`,
    )
  }
}

export const scienceAnalysisService = new ScienceAnalysisService()
