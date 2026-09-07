import { createHash, randomUUID } from 'node:crypto'
import type { Database } from 'bun:sqlite'
import type { ScienceExecution, ScienceExecutionInput, ScienceReview, ScienceReviewInput } from './scienceWorkflowTypes.js'
import { ApiError } from '../middleware/errorHandler.js'
import { openProjectDatabase, scienceWorkspaceService } from './scienceWorkspaceService.js'
import { scienceExperimentService } from './scienceExperimentService.js'

type ExecutionRow = { id: string; record_json: string }

function mapExecution(db: Database, row: ExecutionRow): ScienceExecution {
  return {
    ...JSON.parse(row.record_json),
    datasets: db.query(`SELECT d.id AS datasetId, v.id AS datasetVersionId, d.name,
      v.ordinal, v.content_hash AS contentHash FROM science_execution_datasets link
      JOIN datasets d ON d.id = link.dataset_id JOIN dataset_versions v ON v.id = link.dataset_version_id
      WHERE link.execution_id = ? ORDER BY link.rowid`).all(row.id),
  }
}

export class ScienceWorkflowService {
  async listExecutions(projectId: string): Promise<ScienceExecution[]> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const db = openProjectDatabase(project.rootDir)
    try {
      const rows = db.query('SELECT * FROM science_executions WHERE project_id = ? ORDER BY created_at DESC, rowid DESC')
        .all(project.id) as ExecutionRow[]
      return rows.map(row => mapExecution(db, row))
    } finally { db.close() }
  }

  async getExecution(projectId: string, executionId: string): Promise<ScienceExecution> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const db = openProjectDatabase(project.rootDir)
    try {
      const row = db.query('SELECT id, record_json FROM science_executions WHERE id = ? AND project_id = ?')
        .get(executionId, project.id) as ExecutionRow | null
      if (!row) throw ApiError.notFound('Execution not found in this project')
      return mapExecution(db, row)
    } finally { db.close() }
  }

  async createExecution(projectId: string, input: ScienceExecutionInput): Promise<ScienceExecution> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const experiment = input.experimentId
      ? await scienceExperimentService.getExperiment(project.id, input.experimentId) : null
    const execution: ScienceExecution = {
      ...input, id: randomUUID(), projectId: project.id, experimentId: experiment?.id ?? null,
      protocolVersionId: experiment?.protocolVersion.id ?? null,
      designVersionId: experiment?.designVersion.id ?? null,
      createdAt: new Date().toISOString(), datasets: [],
    }
    const db = openProjectDatabase(project.rootDir)
    try {
      db.query(`INSERT INTO science_executions
        (id, project_id, experiment_id, protocol_version_id, design_version_id, record_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(execution.id, project.id, execution.experimentId, execution.protocolVersionId,
          execution.designVersionId, JSON.stringify(execution), execution.createdAt)
    } finally { db.close() }
    return execution
  }

  async bindDataset(projectId: string, executionId: string, datasetId: string, versionId: string): Promise<ScienceExecution> {
    await this.getExecution(projectId, executionId)
    const dataset = await scienceWorkspaceService.getDatasetVersion({ projectId, datasetId, versionId })
    const project = await scienceWorkspaceService.getProject(projectId)
    const db = openProjectDatabase(project.rootDir)
    try {
      db.query(`INSERT OR IGNORE INTO science_execution_datasets (execution_id, dataset_id, dataset_version_id)
        VALUES (?, ?, ?)`).run(executionId, dataset.id, dataset.currentVersion.id)
    } finally { db.close() }
    return this.getExecution(projectId, executionId)
  }

  async requireDatasetBinding(projectId: string, executionId: string, datasetId: string, versionId: string): Promise<void> {
    const execution = await this.getExecution(projectId, executionId)
    if (!execution.datasets.some(item => item.datasetId === datasetId && item.datasetVersionId === versionId)) {
      throw ApiError.conflict('Bind this exact dataset version to the execution before analysis')
    }
  }

  async listReviews(projectId: string, runId: string): Promise<ScienceReview[]> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const db = openProjectDatabase(project.rootDir)
    try {
      return (db.query('SELECT record_json FROM science_reviews WHERE project_id = ? AND run_id = ? ORDER BY created_at DESC, rowid DESC')
        .all(project.id, runId) as Array<{ record_json: string }>).map(row => JSON.parse(row.record_json))
    } finally { db.close() }
  }

  async createReview(projectId: string, input: ScienceReviewInput): Promise<ScienceReview> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const db = openProjectDatabase(project.rootDir)
    try {
      return db.transaction(() => {
        const run = db.query(`SELECT id, status, dataset_version_id, input_hash, recipe_hash,
          execution_id, summary_json, evidence_json, error_message, experiment_snapshot_json
          FROM analysis_runs WHERE id = ? AND project_id = ?`).get(input.runId, project.id) as {
          status: string; input_hash: string; recipe_hash: string
        } | null
        if (!run) throw ApiError.notFound('Run not found in this project')
        if (run.status === 'queued' || run.status === 'running') throw ApiError.conflict('Wait for the run to finish before reviewing')
        if (input.supersedesReviewId && !db.query('SELECT id FROM science_reviews WHERE id = ? AND project_id = ? AND run_id = ?')
          .get(input.supersedesReviewId, project.id, input.runId)) throw ApiError.conflict('The previous review belongs to a different result')
        const review: ScienceReview = {
          ...input, id: randomUUID(), projectId: project.id,
          inputHash: run.input_hash, recipeHash: run.recipe_hash,
          reviewedContentHash: createHash('sha256').update(JSON.stringify(run)).digest('hex'),
          createdAt: new Date().toISOString(),
        }
        db.query(`INSERT INTO science_reviews (id, project_id, run_id, supersedes_review_id, record_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`)
          .run(review.id, project.id, input.runId, input.supersedesReviewId ?? null, JSON.stringify(review), review.createdAt)
        return review
      })()
    } finally { db.close() }
  }
}

export const scienceWorkflowService = new ScienceWorkflowService()
