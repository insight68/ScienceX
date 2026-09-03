import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scienceApi } from '../api/science'
import type {
  ScienceAnalysisRun,
  ScienceArtifact,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceExperiment,
  ScienceProject,
  ScienceRunEvent,
} from '../types/science'
import { useScienceStore } from './scienceStore'

vi.mock('../api/science', () => ({
  scienceApi: {
    listProjects: vi.fn(),
    createProject: vi.fn(),
    listDatasets: vi.fn(),
    registerDataset: vi.fn(),
    previewDataset: vi.fn(),
    listExperiments: vi.fn(),
    createExperiment: vi.fn(),
    linkExperimentDataset: vi.fn(),
    listRuns: vi.fn(),
    createQualityRun: vi.fn(),
    createDoseResponseRun: vi.fn(),
    replayRun: vi.fn(),
    listArtifacts: vi.fn(),
    getRunEvents: vi.fn(),
  },
}))

const project: ScienceProject = {
  id: 'project-1',
  schemaVersion: 6,
  name: 'Viability pilot',
  question: 'Does treatment alter viability?',
  rootDir: '/tmp/viability',
  createdAt: '2026-07-19T01:00:00.000Z',
  updatedAt: '2026-07-19T01:00:00.000Z',
  rootAvailable: true,
}

const dataset: ScienceDataset = {
  id: 'dataset-1',
  projectId: project.id,
  name: 'viability.csv',
  canonicalPath: '/tmp/viability/viability.csv',
  format: 'csv',
  createdAt: '2026-07-19T01:01:00.000Z',
  updatedAt: '2026-07-19T01:01:00.000Z',
  versionCount: 1,
  currentVersion: {
    id: 'version-1',
    ordinal: 1,
    sizeBytes: 42,
    contentHash: 'abc123',
    modifiedAtMs: 1,
    snapshotPath: '.sciencex/objects/sha256/ab/abc123.csv',
    createdAt: '2026-07-19T01:01:00.000Z',
  },
}

const preview: ScienceDatasetPreview = {
  datasetId: dataset.id,
  datasetName: dataset.name,
  format: 'csv',
  delimiter: ',',
  headers: ['sample', 'value'],
  columns: [
    { name: 'sample', inferredType: 'string', missingCount: 0, uniqueCount: 2 },
    { name: 'value', inferredType: 'number', missingCount: 1, uniqueCount: 1 },
  ],
  rows: [['control', '1.5'], ['treated', '']],
  sampledRowCount: 2,
  truncated: false,
  sizeBytes: 42,
  contentHash: 'abc123',
  localOnly: true,
}

const experiment: ScienceExperiment = {
  id: 'experiment-1',
  projectId: project.id,
  name: 'X-402 · A549 · 48 h',
  objective: 'Estimate the dose-response window.',
  assayType: 'cell-viability-dose-response',
  status: 'ready',
  linkedDatasetId: dataset.id,
  linkedDatasetVersionId: dataset.currentVersion.id,
  protocolVersion: {
    id: 'protocol-1',
    ordinal: 1,
    createdAt: '2026-07-19T01:01:30.000Z',
    protocol: {
      cellLine: 'A549',
      compoundName: 'X-402',
      readout: 'cck-8',
      treatmentDurationHours: 48,
      seedingDensityCellsPerWell: 4000,
      concentrationUnit: 'µM',
      concentrations: [0.01, 0.1, 1, 5],
      replicateCount: 3,
      includeBlankControl: true,
      vehicleControl: { name: 'DMSO', finalPercent: 0.1 },
      positiveControl: '',
    },
  },
  designVersion: {
    id: 'design-1',
    ordinal: 1,
    createdAt: '2026-07-19T01:01:30.000Z',
    design: {
      plateFormat: 96,
      wells: [],
    },
  },
  readiness: {
    blockingCount: 0,
    warningCount: 1,
    issues: [{
      code: 'missing-positive-control',
      severity: 'warning',
      message: 'Add a positive control when required.',
    }],
  },
  createdAt: '2026-07-19T01:01:30.000Z',
  updatedAt: '2026-07-19T01:01:30.000Z',
}

const run: ScienceAnalysisRun = {
  id: 'run-1',
  projectId: project.id,
  datasetId: dataset.id,
  datasetVersionId: dataset.currentVersion.id,
  datasetVersionOrdinal: dataset.currentVersion.ordinal,
  inputCurrentness: 'current',
  experimentId: null,
  parentRunId: null,
  recipe: 'table-quality-v1',
  status: 'completed',
  reproducibilityStatus: 'reproducible',
  evaluationContract: null,
  evidence: null,
  parameters: { maxRows: 100 },
  environment: {
    runtime: 'bun',
    runtimeVersion: '1.3.10',
    platform: 'darwin',
    architecture: 'arm64',
    localOnly: true,
  },
  inputHash: dataset.currentVersion.contentHash,
  recipeHash: 'recipe-hash',
  eventLogPath: '.sciencex/runs/run-1/events.jsonl',
  manifestPath: '.sciencex/runs/run-1/run.json',
  summary: {
    scope: 'preview-sample',
    sampledRowCount: 2,
    columnCount: 2,
    missingCellCount: 1,
    missingRate: 0.25,
    completeRowCount: 1,
    numericColumnCount: 1,
    truncated: false,
    columns: preview.columns,
    warnings: [{
      code: 'missing-values',
      severity: 'warning',
      message: '1 missing cell was observed in the local sample.',
      columns: ['value'],
    }],
  },
  errorMessage: null,
  exitCode: 0,
  createdAt: '2026-07-19T01:02:00.000Z',
  startedAt: '2026-07-19T01:02:00.000Z',
  completedAt: '2026-07-19T01:02:00.100Z',
}

const doseRun: ScienceAnalysisRun = {
  ...run,
  id: 'dose-run-1',
  experimentId: experiment.id,
  recipe: 'cell-viability-dose-response-v1',
  parameters: { experimentId: experiment.id, wellColumn: 'well', signalColumn: 'signal' },
  inputHash: 'dose-input-hash',
  summary: {
    scope: 'full-linked-plate',
    wellColumn: 'well',
    signalColumn: 'signal',
    assignedWellCount: 24,
    ignoredRowCount: 0,
    blankMeanSignal: 10,
    blankStandardDeviation: 0.4,
    vehicleMeanBlankCorrectedSignal: 100,
    vehicleStandardDeviation: 0.4,
    positiveControlMeanViabilityPercent: 8,
    normalizedWells: [],
    points: [
      { concentration: 0.01, replicateCount: 3, meanViabilityPercent: 99, standardDeviation: 0.4, coefficientOfVariationPercent: 0.4 },
      { concentration: 0.1, replicateCount: 3, meanViabilityPercent: 91, standardDeviation: 0.4, coefficientOfVariationPercent: 0.44 },
      { concentration: 1, replicateCount: 3, meanViabilityPercent: 50, standardDeviation: 0.4, coefficientOfVariationPercent: 0.8 },
      { concentration: 5, replicateCount: 3, meanViabilityPercent: 17, standardDeviation: 0.4, coefficientOfVariationPercent: 2.35 },
    ],
    fit: {
      model: '4pl',
      top: 100,
      bottom: 0,
      relativeIc50: 1,
      hillSlope: 1.2,
      rSquared: 0.998,
      rmse: 0.6,
      testedRangePosition: 'within-range',
      reviewStatus: 'acceptable',
      curve: [
        { concentration: 0.01, viabilityPercent: 99 },
        { concentration: 5, viabilityPercent: 17 },
      ],
    },
    warnings: [],
  },
}

const artifact: ScienceArtifact = {
  id: 'artifact-1',
  projectId: project.id,
  producingRunId: run.id,
  kind: 'report',
  name: 'Data quality profile',
  relativePath: 'artifacts/sciencex/run-1/quality-report.md',
  mimeType: 'text/markdown',
  contentHash: 'artifact-hash',
  sizeBytes: 512,
  createdAt: run.completedAt!,
}

const event: ScienceRunEvent = {
  id: 'event-1',
  runId: run.id,
  type: 'run.completed',
  at: run.completedAt!,
  data: { exitCode: 0, reproducibilityStatus: 'reproducible' },
}

beforeEach(() => {
  useScienceStore.getState().reset()
  vi.clearAllMocks()
  vi.mocked(scienceApi.listProjects).mockResolvedValue([project])
  vi.mocked(scienceApi.listDatasets).mockResolvedValue([dataset])
  vi.mocked(scienceApi.previewDataset).mockResolvedValue(preview)
  vi.mocked(scienceApi.listExperiments).mockResolvedValue([])
  vi.mocked(scienceApi.listRuns).mockResolvedValue([])
  vi.mocked(scienceApi.listArtifacts).mockResolvedValue([])
  vi.mocked(scienceApi.getRunEvents).mockResolvedValue([])
})

describe('scienceStore', () => {
  it('loads the first available project, its datasets, and a local preview', async () => {
    await useScienceStore.getState().loadProjects()

    expect(scienceApi.listDatasets).toHaveBeenCalledWith(project.id)
    expect(scienceApi.previewDataset).toHaveBeenCalledWith(dataset.id)
    expect(useScienceStore.getState()).toMatchObject({
      projects: [project],
      selectedProjectId: project.id,
      datasets: [dataset],
      selectedDatasetId: dataset.id,
      preview,
      projectsState: 'ready',
      datasetsState: 'ready',
      previewState: 'ready',
      runs: [],
      artifacts: [],
      runsState: 'ready',
      artifactsState: 'ready',
      error: null,
    })
  })

  it('registers a selected table and immediately refreshes its versioned preview', async () => {
    await useScienceStore.getState().loadProjects()
    const versionTwo = {
      ...dataset,
      versionCount: 2,
      currentVersion: { ...dataset.currentVersion, id: 'version-2', ordinal: 2 },
    }
    vi.mocked(scienceApi.registerDataset).mockResolvedValue({
      dataset: versionTwo,
      versionCreated: true,
    })
    vi.mocked(scienceApi.previewDataset).mockResolvedValue({
      ...preview,
      contentHash: 'def456',
    })

    await useScienceStore.getState().registerDataset('/tmp/viability/viability.csv')

    expect(scienceApi.registerDataset).toHaveBeenCalledWith({
      projectId: project.id,
      filePath: '/tmp/viability/viability.csv',
      name: undefined,
    })
    expect(useScienceStore.getState().datasets[0]?.currentVersion.ordinal).toBe(2)
    expect(useScienceStore.getState().preview?.contentHash).toBe('def456')
  })

  it('creates and selects a versioned cell viability experiment blueprint', async () => {
    vi.mocked(scienceApi.createExperiment).mockResolvedValue(experiment)
    await useScienceStore.getState().loadProjects()

    const created = await useScienceStore.getState().createExperiment({
      name: experiment.name,
      objective: experiment.objective,
      linkedDatasetId: dataset.id,
      protocol: experiment.protocolVersion.protocol,
    })

    expect(created).toBe(experiment)
    expect(scienceApi.createExperiment).toHaveBeenCalledWith({
      projectId: project.id,
      name: experiment.name,
      objective: experiment.objective,
      linkedDatasetId: dataset.id,
      protocol: experiment.protocolVersion.protocol,
    })
    expect(useScienceStore.getState()).toMatchObject({
      experiments: [experiment],
      selectedExperimentId: experiment.id,
      experimentsState: 'ready',
      experimentActionState: 'ready',
    })
  })

  it('links a later instrument table without replacing protocol or design versions', async () => {
    const unlinked = {
      ...experiment,
      linkedDatasetId: null,
      linkedDatasetVersionId: null,
    }
    vi.mocked(scienceApi.listExperiments).mockResolvedValue([unlinked])
    vi.mocked(scienceApi.linkExperimentDataset).mockResolvedValue(experiment)
    await useScienceStore.getState().loadProjects()

    await useScienceStore.getState().linkExperimentDataset(experiment.id, dataset.id)

    expect(scienceApi.linkExperimentDataset).toHaveBeenCalledWith({
      projectId: project.id,
      experimentId: experiment.id,
      datasetId: dataset.id,
    })
    expect(useScienceStore.getState().experiments[0]).toBe(experiment)
    expect(useScienceStore.getState().selectedExperimentId).toBe(experiment.id)
  })

  it('keeps an unavailable project visible without trying to open its local database', async () => {
    const unavailable = { ...project, rootAvailable: false }
    vi.mocked(scienceApi.listProjects).mockResolvedValue([unavailable])

    await useScienceStore.getState().loadProjects()

    expect(scienceApi.listDatasets).not.toHaveBeenCalled()
    expect(scienceApi.listRuns).not.toHaveBeenCalled()
    expect(useScienceStore.getState()).toMatchObject({
      projects: [unavailable],
      selectedProjectId: null,
      datasets: [],
      projectsState: 'ready',
    })
  })

  it('starts a traced quality run and loads its append-only events and artifacts', async () => {
    vi.mocked(scienceApi.createQualityRun).mockResolvedValue({ run, artifacts: [artifact] })
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([event])
    await useScienceStore.getState().loadProjects()

    const completed = await useScienceStore.getState().runQualityProfile()

    expect(completed).toBe(run)
    expect(scienceApi.createQualityRun).toHaveBeenCalledWith({
      projectId: project.id,
      datasetId: dataset.id,
      maxRows: 100,
    })
    expect(scienceApi.getRunEvents).toHaveBeenCalledWith(run.id)
    expect(useScienceStore.getState()).toMatchObject({
      runs: [run],
      selectedRunId: run.id,
      runEvents: [event],
      artifacts: [artifact],
      runActionState: 'ready',
      eventsState: 'ready',
    })
  })

  it('starts a dose-response run from an experiment and selects its traced result', async () => {
    vi.mocked(scienceApi.listExperiments).mockResolvedValue([experiment])
    vi.mocked(scienceApi.createDoseResponseRun).mockResolvedValue({
      run: doseRun,
      artifacts: [{ ...artifact, id: 'dose-artifact', producingRunId: doseRun.id }],
    })
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([{ ...event, runId: doseRun.id }])
    await useScienceStore.getState().loadProjects()

    const completed = await useScienceStore.getState().runDoseResponse(
      experiment.id,
      'well',
      'signal',
    )

    expect(completed).toBe(doseRun)
    expect(scienceApi.createDoseResponseRun).toHaveBeenCalledWith({
      projectId: project.id,
      experimentId: experiment.id,
      wellColumn: 'well',
      signalColumn: 'signal',
    })
    expect(useScienceStore.getState()).toMatchObject({
      runs: [doseRun],
      selectedRunId: doseRun.id,
      runActionState: 'ready',
      eventsState: 'ready',
    })
  })

  it('replays a historical run as a new child without replacing the original', async () => {
    const replayed = { ...run, id: 'run-2', parentRunId: run.id }
    vi.mocked(scienceApi.listRuns).mockResolvedValue([run])
    vi.mocked(scienceApi.listArtifacts).mockResolvedValue([artifact])
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([event])
    vi.mocked(scienceApi.replayRun).mockResolvedValue({ run: replayed, artifacts: [] })
    await useScienceStore.getState().loadProjects()

    await useScienceStore.getState().replayRun(run.id)

    expect(scienceApi.replayRun).toHaveBeenCalledWith(run.id)
    expect(useScienceStore.getState().runs.map(current => current.id)).toEqual(['run-2', 'run-1'])
    expect(useScienceStore.getState().selectedRunId).toBe('run-2')
  })

  it('selects run context from the active dataset instead of the whole project', async () => {
    const secondDataset: ScienceDataset = {
      ...dataset,
      id: 'dataset-2',
      name: 'secondary.csv',
      canonicalPath: '/tmp/viability/secondary.csv',
      currentVersion: {
        ...dataset.currentVersion,
        id: 'version-2',
        ordinal: 1,
        contentHash: 'def456',
        snapshotPath: '.sciencex/objects/sha256/de/def456.csv',
      },
    }
    const secondRun: ScienceAnalysisRun = {
      ...run,
      id: 'run-secondary',
      datasetId: secondDataset.id,
      datasetVersionId: secondDataset.currentVersion.id,
      datasetVersionOrdinal: secondDataset.currentVersion.ordinal,
      inputHash: secondDataset.currentVersion.contentHash,
    }
    vi.mocked(scienceApi.listDatasets).mockResolvedValue([dataset, secondDataset])
    vi.mocked(scienceApi.listRuns).mockResolvedValue([secondRun, run])
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([event])
    vi.mocked(scienceApi.previewDataset).mockImplementation(async datasetId => ({
      ...preview,
      datasetId,
      datasetName: datasetId === secondDataset.id ? secondDataset.name : dataset.name,
    }))

    await useScienceStore.getState().loadProjects()
    expect(useScienceStore.getState().selectedDatasetId).toBe(dataset.id)
    expect(useScienceStore.getState().selectedRunId).toBe(run.id)

    await useScienceStore.getState().selectDataset(secondDataset.id)
    expect(useScienceStore.getState().selectedRunId).toBe(secondRun.id)
    expect(scienceApi.getRunEvents).toHaveBeenLastCalledWith(secondRun.id)
  })
})
