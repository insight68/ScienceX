import { afterEach, describe, expect, it, vi } from 'vitest'
import { scienceWorkflowApi } from './scienceWorkflow'
import { scienceApi } from './science'
import { getDefaultBaseUrl, setBaseUrl } from './client'

afterEach(() => { setBaseUrl(getDefaultBaseUrl()); vi.restoreAllMocks() })
describe('Research workflow transport', () => {
  it('carries exact version, execution and review provenance through project-scoped endpoints', async () => {
    setBaseUrl('http://127.0.0.1:49317')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ executions: [], execution: { id: 'ex' }, preview: {}, run: {}, reviews: [], review: { id: 'review' }, experiment: {} })))
    await scienceWorkflowApi.listExecutions('p/id')
    await scienceWorkflowApi.createExecution('p/id', { name: 'Run', performedBy: 'Lin', performedAt: '2026-09-07T00:00:00Z', sourceType: 'unknown', sampleBatch: '', instrument: '', actualConditions: '', deviations: '', biologicalReplicateId: '' })
    await scienceWorkflowApi.bindDataset('p/id', 'ex/id', 'data', 'oldversion')
    await scienceWorkflowApi.previewVersion('p/id', 'data/id', 'old/version')
    await scienceWorkflowApi.analyze('p/id', { executionId: 'ex', datasetId: 'data', datasetVersionId: 'oldversion', experimentId: 'exp/id', wellColumn: 'well', signalColumn: 'signal' })
    await scienceWorkflowApi.analyze('p/id', { executionId: 'ex', datasetId: 'data', datasetVersionId: 'oldversion', wellColumn: '', signalColumn: '' })
    await scienceWorkflowApi.listReviews('p/id', 'run/id')
    await scienceWorkflowApi.createReview('p/id', { runId: 'run/id', reviewer: 'Lin', rationale: 'Reviewed', decision: 'repeat', nextStep: 'Next', supersedesReviewId: 'prior' })
    expect(fetchMock.mock.calls.map(call => String(call[0]).replace('http://127.0.0.1:49317', ''))).toEqual([
      '/api/research-projects/p%2Fid/executions', '/api/research-projects/p%2Fid/executions',
      '/api/research-projects/p%2Fid/executions/ex%2Fid/datasets',
      '/api/research-projects/p%2Fid/datasets/data%2Fid/versions/old%2Fversion/preview',
      '/api/research-projects/p%2Fid/experiments/exp%2Fid/runs', '/api/research-projects/p%2Fid/runs',
      '/api/research-projects/p%2Fid/reviews?runId=run%2Fid', '/api/research-projects/p%2Fid/reviews',
    ])
    const bodies = fetchMock.mock.calls.map(call => call[1]?.body ? JSON.parse(String(call[1].body)) : null)
    expect(bodies[4]).toEqual({ executionId: 'ex', datasetId: 'data', datasetVersionId: 'oldversion', recipe: 'cell-viability-dose-response-v1', parameters: { wellColumn: 'well', signalColumn: 'signal' } })
    expect(bodies[5]).toMatchObject({ recipe: 'table-quality-v1', datasetVersionId: 'oldversion', parameters: { maxRows: 100 } })
    expect(bodies[7].supersedesReviewId).toBe('prior')
  })
  it('preserves the source review when saving a follow-up experiment', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ experiment: { id: 'new', sourceReviewId: 'review-source' } })))
    const experiment = await scienceApi.createExperiment({ projectId: 'p', name: 'Follow-up', objective: 'New culture', sourceReviewId: 'review-source', linkedDatasetId: null, protocol: {
      cellLine: 'A549', compoundName: 'SX', readout: 'cck-8', treatmentDurationHours: 48, seedingDensityCellsPerWell: 4000, concentrationUnit: 'µM', concentrations: [0.1, 1, 10, 100], replicateCount: 3, includeBlankControl: true, vehicleControl: { name: 'DMSO', finalPercent: 0.1 }, positiveControl: '',
    } })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ sourceReviewId: 'review-source', linkedDatasetId: null, objective: 'New culture' })
    expect(experiment.sourceReviewId).toBe('review-source')
  })

})
