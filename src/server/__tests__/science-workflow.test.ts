import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { handleApiRequest } from '../router.js'
import { scienceWorkspaceService } from '../services/scienceWorkspaceService.js'
import { scienceExperimentService } from '../services/scienceExperimentService.js'

let root: string
let originalConfig: string | undefined
let projectId: string
let dataset: any
const protocol = {
  cellLine: 'A549', compoundName: 'SX', readout: 'cck-8' as const,
  treatmentDurationHours: 48, seedingDensityCellsPerWell: 4000,
  concentrationUnit: 'µM' as const, concentrations: [0.01, 0.1, 1, 10, 100],
  replicateCount: 3, includeBlankControl: true,
  vehicleControl: { name: 'DMSO', finalPercent: 0.1 }, positiveControl: 'Control',
}
const record = { name: 'Day 1', performedBy: 'Researcher', performedAt: '2026-09-07T10:00:00+08:00', sourceType: 'simulated', biologicalReplicateId: 'batch-A' }
async function api(route: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
  const url = new URL(`http://localhost:3456${route}`)
  const response = await handleApiRequest(new Request(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), url)
  return { status: response.status, ...await response.json() as any }
}
const endpoint = (suffix: string) => `/api/research-projects/${projectId}/${suffix}`
async function execution(experimentId?: string) {
  const result = await api(endpoint('executions'), { ...record, experimentId })
  expect(result.status).toBe(201)
  return result.execution
}
async function bind(id: string, version = dataset.currentVersion.id) {
  return api(endpoint(`executions/${id}/datasets`), { datasetId: dataset.id, versionId: version })
}
async function quality(executionId?: string) {
  return api(endpoint('runs'), { datasetId: dataset.id, datasetVersionId: dataset.currentVersion.id, executionId, recipe: 'table-quality-v1' })
}
beforeEach(async () => {
  root = await fs.mkdtemp('/tmp/science-workflow-test-')
  originalConfig = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = path.join(root, 'config')
  const project = await scienceWorkspaceService.createProject({ name: 'Workflow', rootDir: root })
  projectId = project.id
  const exp = await scienceExperimentService.createExperiment({ projectId, name: 'Plate', assayType: 'cell-viability-dose-response', protocol })
  const rows = exp.designVersion.design.wells.map(well => {
    const viability = well.role === 'blank' ? 0 : well.role === 'vehicle-control' ? 100 : well.role === 'positive-control' ? 8 : 100 / (1 + (well.concentration ?? 1))
    return `${well.well},${10 + viability}`
  })
  await fs.writeFile(path.join(root, 'plate.csv'), `well,signal\n${rows.join('\n')}\n`)
  dataset = (await scienceWorkspaceService.registerDataset({ projectId, filePath: path.join(root, 'plate.csv') })).dataset
})
afterEach(async () => {
  if (originalConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalConfig
  await fs.rm(root, { recursive: true, force: true })
})

describe('Research execution and review workflow', () => {
  it('registers a generic execution before data, binds immutable versions, and replays the same execution', async () => {
    const ex = await execution()
    expect(ex).toMatchObject({ experimentId: null, protocolVersionId: null, datasets: [], sourceType: 'simulated' })
    expect((await quality(ex.id)).status).toBe(409)
    expect((await bind(ex.id)).execution.datasets).toHaveLength(1)
    expect((await bind(ex.id)).execution.datasets).toHaveLength(1)
    const run = (await quality(ex.id)).run
    expect(run).toMatchObject({ status: 'completed', executionId: ex.id, experimentSnapshot: null })
    const replay = await api(`/api/runs/${run.id}/replay`, {})
    expect(replay.run).toMatchObject({ executionId: ex.id, datasetVersionId: run.datasetVersionId, parentRunId: run.id })
    const list = await api(endpoint('executions'))
    expect(list.executions[0].datasets[0].contentHash).toBe(dataset.currentVersion.contentHash)
  })

  it('analyzes frozen execution protocol and data even when the current experiment changes', async () => {
    const exp = (await scienceExperimentService.listExperiments(projectId))[0]
    const ex = await execution(exp.id)
    await bind(ex.id)
    const db = new Database(path.join(root, '.sciencex', 'research.sqlite'))
    db.query('INSERT INTO science_protocol_versions (id, experiment_id, ordinal, protocol_json, created_at) VALUES (?, ?, 2, ?, ?)')
      .run('updated-protocol', exp.id, JSON.stringify({ ...protocol, treatmentDurationHours: 72 }), new Date().toISOString())
    db.close()
    await fs.writeFile(path.join(root, 'plate.csv'), 'well,signal\nA1,9999\n')
    const newer = await scienceWorkspaceService.registerDataset({ projectId, filePath: path.join(root, 'plate.csv') })
    const body = { recipe: 'cell-viability-dose-response-v1', executionId: ex.id, datasetId: dataset.id, datasetVersionId: dataset.currentVersion.id, parameters: { wellColumn: 'well', signalColumn: 'signal' } }
    expect((await api(endpoint(`experiments/${exp.id}/runs`), { ...body, datasetVersionId: newer.dataset.currentVersion.id })).status).toBe(409)
    expect((await api(endpoint(`experiments/${exp.id}/runs`), { ...body, executionId: undefined })).status).toBe(400)
    await expect(scienceExperimentService.getExperimentVersion(projectId, exp.id, 'missing', ex.designVersionId)).rejects.toThrow('frozen experiment versions')
    const result = await api(endpoint(`experiments/${exp.id}/runs`), body)
    expect(result.status).toBe(201)
    expect(result.run.status).toBe('completed')
    expect(result.run.datasetContentHash).toBe(dataset.currentVersion.contentHash)
    expect(result.run.experimentSnapshot.protocolVersion.protocol.treatmentDurationHours).toBe(48)
    expect(result.run.experimentSnapshot.protocolVersion.id).toBe(ex.protocolVersionId)
    const preview = await api(endpoint(`datasets/${dataset.id}/versions/${dataset.currentVersion.id}/preview`))
    expect(preview.preview.rows).toHaveLength(exp.designVersion.design.wells.length)
    const replay = await api(`/api/runs/${result.run.id}/replay`, {})
    expect(replay.run.summary).toEqual(result.run.summary)
    expect(replay.run.executionId).toBe(ex.id)
    expect(replay.run.experimentSnapshot).toEqual(result.run.experimentSnapshot)
    const review = await api(endpoint('reviews'), { runId: result.run.id, reviewer: 'Lin', decision: 'repeat', rationale: 'Need independent culture', nextStep: 'Repeat with a new culture batch' })
    expect(review.status).toBe(201)
    const draft = await api(endpoint('experiments'), { name: 'Follow-up', assayType: 'cell-viability-dose-response', objective: review.review.nextStep, sourceReviewId: review.review.id, protocol })
    expect(draft.experiment).toMatchObject({ sourceReviewId: review.review.id, linkedDatasetId: null })
  })

  it('appends human corrections with evidence fingerprints without modifying machine results', async () => {
    const run = (await quality()).run
    const first = await api(endpoint('reviews'), { runId: run.id, reviewer: 'Lin', decision: 'accept', rationale: 'Columns checked', nextStep: 'Collect another batch' })
    expect(first.status).toBe(201)
    expect(first.review.reviewedContentHash).toHaveLength(64)
    const second = await api(endpoint('reviews'), { runId: run.id, reviewer: 'Chen', decision: 'revise', rationale: 'Missing values need review', supersedesReviewId: first.review.id })
    expect(second.review.reviewedContentHash).toBe(first.review.reviewedContentHash)
    expect((await api(endpoint(`reviews?runId=${run.id}`))).reviews).toEqual([second.review, first.review])
    expect((await api(endpoint('runs'))).runs[0]).toEqual(run)
    expect((await api(endpoint('reviews'), { ...first.review, rationale: '  ' })).status).toBe(400)
    expect((await api(endpoint('reviews'), { ...first.review, nextStep: 'x'.repeat(2001) })).status).toBe(400)
    expect((await api(endpoint('reviews'), { ...first.review, runId: 'missing' })).status).toBe(404)
    const other = (await quality()).run
    expect((await api(endpoint('reviews'), { ...first.review, runId: other.id, supersedesReviewId: first.review.id })).status).toBe(409)
    expect((await api(endpoint('experiments'), { name: 'Invalid', assayType: 'cell-viability-dose-response', sourceReviewId: first.review.id, protocol })).status).toBe(409)
    const db = new Database(path.join(root, '.sciencex', 'research.sqlite'))
    db.query("UPDATE analysis_runs SET status = 'running' WHERE id = ?").run(other.id)
    db.close()
    expect((await api(endpoint('reviews'), { ...first.review, runId: other.id })).status).toBe(409)
  })

  it('rejects cross-project bindings, invalid inputs and unrelated execution protocols', async () => {
    expect((await api(endpoint('executions'), { ...record, performedAt: 'yesterday' })).status).toBe(400)
    expect((await api(endpoint('executions'), { ...record, performedBy: ' ' })).status).toBe(400)
    expect((await api(endpoint('executions'), { ...record, experimentId: 'missing' })).status).toBe(404)
    expect((await bind('missing')).status).toBe(404)
    const ex = await execution()
    expect((await bind(ex.id, 'missing')).status).toBe(404)
    const exp = (await scienceExperimentService.listExperiments(projectId))[0]
    expect((await api(endpoint(`experiments/${exp.id}/runs`), { recipe: 'cell-viability-dose-response-v1', executionId: ex.id, parameters: { wellColumn: 'well', signalColumn: 'signal' } })).status).toBe(409)
    const secondRoot = path.join(root, 'other')
    await fs.mkdir(secondRoot)
    const second = await scienceWorkspaceService.createProject({ name: 'Other', rootDir: secondRoot })
    expect((await api(`/api/research-projects/${second.id}/executions/${ex.id}/datasets`, { datasetId: dataset.id, versionId: dataset.currentVersion.id })).status).toBe(404)
    for (const route of ['executions', 'reviews', `executions/${ex.id}/datasets`, `datasets/${dataset.id}/versions/${dataset.currentVersion.id}/preview`]) {
      expect((await api(endpoint(route), undefined, 'DELETE')).status).toBe(405)
    }
    expect((await api(endpoint('reviews'))).status).toBe(400)
    expect((await api(endpoint('executions/nope'))).status).toBe(404)
    expect((await api(endpoint('datasets/nope'))).status).toBe(404)
  })

  it('upgrades a populated v6 workspace without inventing executions or losing unknown fields', async () => {
    const run = (await quality()).run
    const dbPath = path.join(root, '.sciencex', 'research.sqlite')
    const db = new Database(dbPath)
    db.exec(`PRAGMA foreign_keys = OFF;
      ALTER TABLE analysis_runs DROP COLUMN execution_id;
      ALTER TABLE analysis_runs DROP COLUMN experiment_snapshot_json;
      ALTER TABLE science_experiments DROP COLUMN source_review_id;
      DROP TABLE science_execution_datasets;
      DROP TABLE science_executions;
      DROP TABLE science_reviews;
      UPDATE science_meta SET value = '6' WHERE key = 'schema_version';
      UPDATE project SET schema_version = 6;
      ALTER TABLE analysis_runs ADD COLUMN lab_extension TEXT;
      UPDATE analysis_runs SET lab_extension = 'keep-me';`)
    db.close()
    const listed = await api(endpoint('runs'))
    expect(listed.runs[0]).toEqual(run)
    expect((await api(endpoint('executions'))).executions).toEqual([])
    expect((await api(endpoint(`reviews?runId=${run.id}`))).reviews).toEqual([])
    const upgraded = new Database(dbPath, { readonly: true })
    expect(upgraded.query('SELECT lab_extension FROM analysis_runs').get()).toEqual({ lab_extension: 'keep-me' })
    expect(upgraded.query('SELECT schema_version FROM project').get()).toEqual({ schema_version: 7 })
    upgraded.close()
    expect((await execution()).name).toBe('Day 1')
  })
})
