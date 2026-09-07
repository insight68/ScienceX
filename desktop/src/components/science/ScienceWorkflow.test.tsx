import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScienceExecutionPanel } from './ScienceExecutionPanel'
import { ScienceReviewPanel } from './ScienceReviewPanel'
import { ScienceDataQualityPanel } from './ScienceDataQualityPanel'
import { ScienceRunComparisonPanel, comparisonIssues } from './ScienceRunComparisonPanel'
import { CellViabilityExperimentPanel } from './CellViabilityExperimentPanel'
import { scienceWorkflowApi, type ScienceExecution, type ScienceReview } from '../../api/scienceWorkflow'
import { useSettingsStore } from '../../stores/settingsStore'
import type { ScienceAnalysisRun, ScienceDataset, ScienceDatasetPreview, ScienceExperiment, ScienceProject } from '../../types/science'

vi.mock('../../api/scienceWorkflow', () => ({ scienceWorkflowApi: { listExecutions: vi.fn(), createExecution: vi.fn(), bindDataset: vi.fn(), previewVersion: vi.fn(), analyze: vi.fn(), listReviews: vi.fn(), createReview: vi.fn() } }))
const project: ScienceProject = { id: 'project', name: 'Test', question: '', rootDir: '/tmp/test', schemaVersion: 7, createdAt: '', updatedAt: '', rootAvailable: true }
const dataset: ScienceDataset = { id: 'data', projectId: project.id, name: 'plate.csv', canonicalPath: '/tmp/test/plate.csv', format: 'csv', createdAt: '', updatedAt: '', versionCount: 2, currentVersion: { id: 'version2', ordinal: 2, contentHash: 'newhash', sizeBytes: 50, modifiedAtMs: 0, snapshotPath: 'snapshot', createdAt: '' } }
const experiment: ScienceExperiment = { id: 'experiment', projectId: project.id, name: 'A549 response', objective: '', assayType: 'cell-viability-dose-response', status: 'ready', linkedDatasetId: 'data', linkedDatasetVersionId: 'version2', protocolVersion: { id: 'protocol1', ordinal: 1, createdAt: '', protocol: { cellLine: 'A549', compoundName: 'SX', readout: 'cck-8', treatmentDurationHours: 48, seedingDensityCellsPerWell: 4000, concentrationUnit: 'µM', concentrations: [0.01, 0.1, 1, 10, 100], replicateCount: 3, includeBlankControl: true, vehicleControl: { name: 'DMSO', finalPercent: 0.1 }, positiveControl: 'Control' } }, designVersion: { id: 'design1', ordinal: 1, createdAt: '', design: { plateFormat: 96, wells: [] } }, readiness: { blockingCount: 0, warningCount: 0, issues: [] }, createdAt: '', updatedAt: '' }
const execution: ScienceExecution = { id: 'execution', projectId: project.id, experimentId: experiment.id, protocolVersionId: 'protocol1', designVersionId: 'design1', name: 'Day 1', performedBy: 'Lin', performedAt: '2026-09-07T02:00:00Z', sourceType: 'simulated', sampleBatch: 'batch-1', instrument: 'Reader-1', actualConditions: '37 C', deviations: 'None', biologicalReplicateId: 'culture-1', createdAt: '2026-09-07T02:00:00Z', datasets: [{ datasetId: 'data', datasetVersionId: 'version1', name: 'plate.csv', ordinal: 1, contentHash: 'oldhash' }] }
const preview: ScienceDatasetPreview = { datasetId: 'data', datasetName: 'plate.csv', format: 'csv', delimiter: ',', headers: ['well', 'signal'], columns: [], rows: [['A1', '10']], sampledRowCount: 1, truncated: false, sizeBytes: 20, contentHash: 'oldhash', localOnly: true }
const run: ScienceAnalysisRun = { id: 'run-original', projectId: project.id, datasetId: 'data', datasetVersionId: 'version1', datasetVersionOrdinal: 1, inputCurrentness: 'superseded', experimentId: experiment.id, executionId: execution.id, experimentSnapshot: experiment, parentRunId: null, recipe: 'cell-viability-dose-response-v1', status: 'completed', reproducibilityStatus: 'unchecked', parameters: { experimentId: experiment.id, wellColumn: 'well', signalColumn: 'signal' }, environment: { runtime: 'bun', runtimeVersion: '1', platform: 'test', architecture: 'test', localOnly: true }, inputHash: 'input', recipeHash: 'recipe', eventLogPath: '', manifestPath: '', errorMessage: null, exitCode: 0, createdAt: '', startedAt: null, completedAt: null,
  summary: { scope: 'full-linked-plate', wellColumn: 'well', signalColumn: 'signal', assignedWellCount: 1, ignoredRowCount: 0, blankMeanSignal: 10, blankStandardDeviation: 0, vehicleMeanBlankCorrectedSignal: 100, vehicleStandardDeviation: 0, positiveControlMeanViabilityPercent: 8, normalizedWells: [{ well: 'A1', role: 'treatment', label: 'SX', concentration: 1, replicate: 1, rawSignal: 60, blankCorrectedSignal: 50, normalizedViabilityPercent: 50 }], points: [], fit: { model: '4pl', top: 100, bottom: 0, relativeIc50: 1, hillSlope: 1, rSquared: 0.99, rmse: 1.5, testedRangePosition: 'within-range', reviewStatus: 'acceptable', curve: [] }, warnings: [{ code: 'high-replicate-variation', severity: 'warning', message: 'Review variance at 1 µM', concentrations: [1] }] },
  evaluationContract: { schemaVersion: 1, id: 'contract', version: 1, recipe: 'cell-viability-dose-response-v1', evidenceLevel: 'evaluated', claim: 'technical-interpretability', requiredArtifacts: [], criteria: [{ id: 'fit', metric: 'r_squared', operator: 'gte', threshold: 0.95 }], limitations: [] },
  evidence: { schemaVersion: 1, contractId: 'contract', contractVersion: 1, contractHash: 'contracthash', evaluator: { id: 'evaluator', version: 1, hash: 'hash' }, level: 'evaluated', verdict: 'supported', evaluatedAt: '', metrics: [{ criterionId: 'fit', metric: 'r_squared', observed: 0.99, passed: true }], artifactIds: [], failedCriterionIds: [], claimBoundary: { canClaim: [], cannotClaim: [] } },
}
const review: ScienceReview = { id: 'review1', runId: run.id, projectId: project.id, reviewer: 'Lin', decision: 'repeat', rationale: 'Need another culture', nextStep: 'Repeat at 72 hours', inputHash: run.inputHash, recipeHash: run.recipeHash, reviewedContentHash: 'fingerprint', createdAt: '2026-09-07T02:00:00Z' }
beforeEach(() => {
  vi.resetAllMocks()
  useSettingsStore.setState({ locale: 'en' })
  vi.mocked(scienceWorkflowApi.listExecutions).mockResolvedValue([execution])
  vi.mocked(scienceWorkflowApi.previewVersion).mockResolvedValue(preview)
  vi.mocked(scienceWorkflowApi.listReviews).mockResolvedValue([review])
})
afterEach(cleanup)

describe('Research workflow views', () => {
  it('loads on expansion and analyzes the bound old version instead of the dataset’s latest version', async () => {
    const onRunCreated = vi.fn().mockResolvedValue(undefined)
    vi.mocked(scienceWorkflowApi.analyze).mockResolvedValue({ run, artifacts: [] })
    render(<ScienceExecutionPanel project={project} experiments={[experiment]} datasets={[dataset]} selectedExperimentId={experiment.id} onRunCreated={onRunCreated} />)
    expect(scienceWorkflowApi.listExecutions).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Experiment executions' }))
    await waitFor(() => expect(scienceWorkflowApi.previewVersion).toHaveBeenCalledWith('project', 'data', 'version1'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze execution data' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Analyze execution data' }))
    await waitFor(() => expect(onRunCreated).toHaveBeenCalledWith(run))
    expect(scienceWorkflowApi.analyze).toHaveBeenCalledWith('project', expect.objectContaining({ executionId: 'execution', datasetVersionId: 'version1', wellColumn: 'well', signalColumn: 'signal' }))
    vi.mocked(scienceWorkflowApi.bindDataset).mockResolvedValue({ ...execution, datasets: [...execution.datasets, { datasetId: 'data', datasetVersionId: 'version2', ordinal: 2, name: 'plate.csv', contentHash: 'newhash' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Bind version' }))
    await waitFor(() => expect(scienceWorkflowApi.previewVersion).toHaveBeenCalledWith('project', 'data', 'version2'))
  })

  it('registers a general execution with explicit source and preserves input on a server error', async () => {
    vi.mocked(scienceWorkflowApi.listExecutions).mockResolvedValue([])
    vi.mocked(scienceWorkflowApi.createExecution).mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce({ ...execution, experimentId: null, datasets: [] })
    render(<ScienceExecutionPanel project={project} experiments={[experiment]} datasets={[]} selectedExperimentId={null} onRunCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Experiment executions' }))
    await screen.findByText('No executions yet. You can register one before collecting data.')
    fireEvent.click(screen.getByRole('button', { name: 'Register execution' }))
    expect(screen.getByLabelText('Declared data source')).toHaveValue('unknown')
    fireEvent.change(screen.getByLabelText(/Execution name/), { target: { value: 'Day 1' } })
    fireEvent.change(screen.getByLabelText(/Performed by/), { target: { value: 'Lin' } })
    fireEvent.change(screen.getByLabelText('Declared data source'), { target: { value: 'simulated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable')
    expect(screen.getByLabelText(/Execution name/)).toHaveValue('Day 1')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(scienceWorkflowApi.createExecution).toHaveBeenLastCalledWith(project.id, expect.objectContaining({ experimentId: null, sourceType: 'simulated', performedBy: 'Lin' })))
    await waitFor(() => expect(screen.queryByLabelText(/Execution name/)).not.toBeInTheDocument())
  })

  it('ignores late data after changing projects', async () => {
    let resolve!: (items: ScienceExecution[]) => void
    vi.mocked(scienceWorkflowApi.listExecutions).mockReturnValueOnce(new Promise(done => { resolve = done })).mockResolvedValueOnce([])
    const props = { project, experiments: [], datasets: [], selectedExperimentId: null, onRunCreated: vi.fn() }
    const view = render(<ScienceExecutionPanel {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Experiment executions' }))
    view.rerender(<ScienceExecutionPanel {...props} project={{ ...project, id: 'project2' }} />)
    await screen.findByText('No executions yet. You can register one before collecting data.')
    await act(async () => resolve([execution]))
    expect(screen.queryByText('batch-1')).not.toBeInTheDocument()
  })

  it('inspects raw and normalized wells without modifying or excluding measurements', () => {
    const original = structuredClone(run)
    render(<ScienceDataQualityPanel run={run} />)
    fireEvent.click(screen.getByRole('button', { name: 'Plate quality and well inspection' }))
    expect(screen.getByText(/version1/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'A1: 50.00' }))
    expect(screen.getByText('60.000')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Signal view'), { target: { value: 'rawSignal' } })
    expect(screen.getByRole('button', { name: 'A1: 60.00' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'A2: —' })).toBeDisabled()
    expect(screen.getByText('Review variance at 1 µM')).toBeInTheDocument()
    expect(run).toEqual(original)
  })

  it('compares across datasets while flagging reanalysis and incompatible frozen conditions', () => {
    const replay = { ...run, id: 'run-replay' }
    const other = { ...run, id: 'run-other', datasetId: 'other-data', datasetVersionId: 'other-version', executionId: 'other-execution', experimentSnapshot: { ...experiment, protocolVersion: { ...experiment.protocolVersion, protocol: { ...experiment.protocolVersion.protocol, concentrationUnit: 'nM' as const } } } }
    render(<ScienceRunComparisonPanel runs={[run, replay, other]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }))
    screen.getAllByRole('checkbox').forEach(box => fireEvent.click(box))
    expect(screen.getByText(/Includes reanalysis/)).toBeInTheDocument()
    expect(screen.getByText(/Protocols, units, or methods differ/)).toBeInTheDocument()
    expect(screen.getByText('1.000 nM')).toBeInTheDocument()
    expect(comparisonIssues([{ ...run, experimentSnapshot: null }, other]).missingConditions).toBe(true)
    expect(comparisonIssues([{ ...run, datasetContentHash: 'copied-data' }, { ...other, datasetContentHash: 'copied-data' }]).sameData).toBe(true)
    expect(comparisonIssues([run, { ...run, id: 'independent', datasetVersionId: 'new-data', executionId: 'new-execution' }])).toEqual({ sameData: false, sameExecution: false, missingConditions: false, differentConditions: false })
  })

  it('appends a correction, displays evaluation thresholds, and creates an editable unbound draft', async () => {
    const onDraft = vi.fn()
    vi.mocked(scienceWorkflowApi.createReview).mockResolvedValue({ ...review, id: 'review2', rationale: 'Corrected interpretation', supersedesReviewId: review.id })
    render(<ScienceReviewPanel run={run} onDraft={onDraft} />)
    fireEvent.click(screen.getByRole('button', { name: 'Evidence review and next step' }))
    await screen.findByText('Need another culture')
    expect(screen.getByText('gte 0.95')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Reviewer/), { target: { value: 'Chen' } })
    fireEvent.change(screen.getByLabelText(/Rationale/), { target: { value: 'Corrected interpretation' } })
    fireEvent.change(screen.getByLabelText('Corrects review'), { target: { value: review.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Save review and draft' }))
    await screen.findByText('Corrected interpretation')
    expect(screen.getByText('Need another culture')).toBeInTheDocument()
    expect(scienceWorkflowApi.createReview).toHaveBeenCalledWith(project.id, expect.objectContaining({ runId: run.id, supersedesReviewId: review.id, reviewer: 'Chen' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Use in a new experiment' })[1]!)
    expect(onDraft).toHaveBeenCalledWith(expect.objectContaining({ sourceReviewId: review.id, linkedDatasetId: null, objective: review.nextStep, protocol: experiment.protocolVersion.protocol }))
  })

  it('keeps pending runs unreviewable and surfaces load errors', async () => {
    render(<ScienceReviewPanel run={{ ...run, status: 'running' }} onDraft={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Evidence review and next step' }))
    expect(screen.getByText('Wait for the run to finish before reviewing.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save review and draft' })).not.toBeInTheDocument()
    await waitFor(() => expect(scienceWorkflowApi.listReviews).toHaveBeenCalled())
  })

  it('saves the next experiment only after editing and retains review provenance without inheriting data', async () => {
    const onCreate = vi.fn().mockResolvedValue(experiment)
    render(<CellViabilityExperimentPanel experiments={[experiment]} datasets={[dataset]} selectedDataset={dataset} preview={null} selectedExperimentId={experiment.id} state="ready" actionState="idle" runActionState="idle" onSelect={vi.fn()} onCreate={onCreate} onLinkDataset={vi.fn()} onSelectDataset={vi.fn()} onRunDoseResponse={vi.fn()} initialDraft={{ name: 'Follow-up', objective: review.nextStep, protocol: experiment.protocolVersion.protocol, sourceReviewId: review.id, linkedDatasetId: null }} />)
    expect(screen.getByLabelText(/Experiment name/)).toHaveValue('Follow-up')
    expect(onCreate).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Experiment name/), { target: { value: 'Follow-up edited' } })
    const buttons = screen.getAllByRole('button')
    const save = buttons.find(button => /Save assay blueprint/.test(button.textContent ?? ''))
    expect(save).toBeDefined()
    fireEvent.click(save!)
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Follow-up edited', sourceReviewId: review.id, linkedDatasetId: null })))
  })
})
