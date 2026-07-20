import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scienceApi } from '../api/science'
import type {
  ScienceAnalysisRun,
  ScienceArtifact,
  ScienceDataset,
  ScienceDatasetPreview,
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
    listRuns: vi.fn(),
    createQualityRun: vi.fn(),
    replayRun: vi.fn(),
    listArtifacts: vi.fn(),
    getRunEvents: vi.fn(),
  },
}))

const project: ScienceProject = {
  id: 'project-1',
  schemaVersion: 2,
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

const run: ScienceAnalysisRun = {
  id: 'run-1',
  projectId: project.id,
  datasetId: dataset.id,
  datasetVersionId: dataset.currentVersion.id,
  parentRunId: null,
  recipe: 'table-quality-v1',
  status: 'completed',
  reproducibilityStatus: 'reproducible',
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
})
