import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scienceApi } from '../api/science'
import { useChatStore } from '../stores/chatStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useScienceStore } from '../stores/scienceStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTabStore } from '../stores/tabStore'
import { useUIStore } from '../stores/uiStore'
import type {
  ScienceAnalysisRun,
  ScienceArtifact,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceExperiment,
  ScienceProject,
  ScienceRunEvent,
} from '../types/science'
import { ScienceWorkspace } from './ScienceWorkspace'

const dialogOpen = vi.fn()

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

vi.mock('../lib/desktopHost', () => ({
  getDesktopHost: () => ({
    isDesktop: true,
    capabilities: { dialogs: true },
    dialogs: { open: dialogOpen },
  }),
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
    sizeBytes: 52,
    contentHash: 'abcdef1234567890',
    modifiedAtMs: 1,
    snapshotPath: '.sciencex/objects/sha256/ab/abcdef1234567890.csv',
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
  sizeBytes: 52,
  contentHash: 'abcdef1234567890',
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
      concentrations: [0.01, 0.1, 1, 5, 25, 100],
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
      wells: [
        { well: 'A1', role: 'blank', label: 'Blank', concentration: null, concentrationUnit: null, replicate: 1 },
        { well: 'A2', role: 'vehicle-control', label: 'DMSO', concentration: null, concentrationUnit: null, replicate: 1 },
        { well: 'A3', role: 'treatment', label: 'X-402 · 0.01 µM', concentration: 0.01, concentrationUnit: 'µM', replicate: 1 },
      ],
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
  id: 'run-1234567890',
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
  environment: { runtime: 'bun', runtimeVersion: '1.3.10', platform: 'darwin', architecture: 'arm64', localOnly: true },
  inputHash: dataset.currentVersion.contentHash,
  recipeHash: 'recipe-abcdef',
  eventLogPath: '.sciencex/runs/run-1234567890/events.jsonl',
  manifestPath: '.sciencex/runs/run-1234567890/run.json',
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
    warnings: [{ code: 'missing-values', severity: 'warning', message: '1 missing cell was observed.', columns: ['value'] }],
  },
  errorMessage: null,
  exitCode: 0,
  createdAt: '2026-07-19T01:02:00.000Z',
  startedAt: '2026-07-19T01:02:00.000Z',
  completedAt: '2026-07-19T01:02:00.100Z',
}

const doseRun: ScienceAnalysisRun = {
  ...run,
  id: 'dose-run-1234',
  experimentId: experiment.id,
  recipe: 'cell-viability-dose-response-v1',
  parameters: { experimentId: experiment.id, wellColumn: 'well', signalColumn: 'signal' },
  inputHash: 'dose-input-hash',
  evaluationContract: {
    schemaVersion: 1,
    id: 'cell-viability-dose-response-technical-v1',
    version: 1,
    recipe: 'cell-viability-dose-response-v1',
    evidenceLevel: 'evaluated',
    claim: 'technical-interpretability',
    requiredArtifacts: ['dose-response-report', 'normalized-wells', 'dose-response-result'],
    criteria: [],
    limitations: ['biological-replication', 'statistical-significance'],
  },
  evidence: {
    schemaVersion: 1,
    contractId: 'cell-viability-dose-response-technical-v1',
    contractVersion: 1,
    contractHash: 'a'.repeat(64),
    evaluator: {
      id: 'cell-viability-dose-response-technical-evaluator',
      version: 1,
      hash: 'b'.repeat(64),
    },
    level: 'evaluated',
    verdict: 'supported',
    evaluatedAt: '2026-07-19T01:02:00.050Z',
    metrics: [],
    artifactIds: ['artifact-a'],
    failedCriterionIds: [],
    claimBoundary: {
      canClaim: [
        'deterministic-fit-evaluated',
        'technical-criteria-met',
        'relative-ic50-within-tested-range',
      ],
      cannotClaim: [
        'statistical-significance',
        'biological-replication',
        'external-verification',
        'clinical-efficacy-or-safety',
      ],
    },
  },
  summary: {
    scope: 'full-linked-plate',
    wellColumn: 'well',
    signalColumn: 'signal',
    assignedWellCount: 24,
    ignoredRowCount: 0,
    blankMeanSignal: 10,
    blankStandardDeviation: 0.4,
    vehicleMeanBlankCorrectedSignal: 100,
    vehicleStandardDeviation: 0.8,
    positiveControlMeanViabilityPercent: 8,
    normalizedWells: [],
    points: [
      { concentration: 0.01, replicateCount: 3, meanViabilityPercent: 99, standardDeviation: 1, coefficientOfVariationPercent: 1.01 },
      { concentration: 0.1, replicateCount: 3, meanViabilityPercent: 91, standardDeviation: 1.2, coefficientOfVariationPercent: 1.32 },
      { concentration: 1, replicateCount: 3, meanViabilityPercent: 50, standardDeviation: 1.5, coefficientOfVariationPercent: 3 },
      { concentration: 5, replicateCount: 3, meanViabilityPercent: 17, standardDeviation: 0.9, coefficientOfVariationPercent: 5.29 },
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
        { concentration: 0.1, viabilityPercent: 91 },
        { concentration: 1, viabilityPercent: 50 },
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
  relativePath: 'artifacts/sciencex/run-1234567890/quality-report.md',
  mimeType: 'text/markdown',
  contentHash: 'artifact-abcdef',
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
  vi.clearAllMocks()
  useScienceStore.getState().reset()
  useSessionStore.setState(useSessionStore.getInitialState(), true)
  useChatStore.setState(useChatStore.getInitialState(), true)
  useTabStore.setState(useTabStore.getInitialState(), true)
  useUIStore.setState(useUIStore.getInitialState(), true)
  useSettingsStore.setState({ locale: 'en' })
  vi.mocked(scienceApi.listProjects).mockResolvedValue([project])
  vi.mocked(scienceApi.listDatasets).mockResolvedValue([dataset])
  vi.mocked(scienceApi.previewDataset).mockResolvedValue(preview)
  vi.mocked(scienceApi.listExperiments).mockResolvedValue([])
  vi.mocked(scienceApi.listRuns).mockResolvedValue([])
  vi.mocked(scienceApi.listArtifacts).mockResolvedValue([])
  vi.mocked(scienceApi.getRunEvents).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  useScienceStore.getState().reset()
  useSessionStore.setState(useSessionStore.getInitialState(), true)
  useChatStore.setState(useChatStore.getInitialState(), true)
  useTabStore.setState(useTabStore.getInitialState(), true)
  useUIStore.setState(useUIStore.getInitialState(), true)
})

describe('ScienceWorkspace', () => {
  it('renders the project, column profiles, sample rows, and explicit model boundary', async () => {
    render(<ScienceWorkspace />)

    expect(await screen.findByText('control')).toBeInTheDocument()
    expect(screen.getByText('treated')).toBeInTheDocument()
    expect(screen.getAllByText('Viability pilot')).toHaveLength(3)
    expect(screen.getByText('Not sent to a model')).toBeInTheDocument()
    expect(screen.getByText('Table processing stays local')).toBeInTheDocument()
    expect(screen.getByText(/A model thread may send the context you choose/)).toBeInTheDocument()
    expect(screen.getByText('missing 1')).toBeInTheDocument()
    expect(screen.getByText('unique 2')).toBeInTheDocument()
    expect(screen.getByText('abcdef1234')).toBeInTheDocument()
  })

  it('uses the desktop file picker and registers the selected CSV in the active project', async () => {
    dialogOpen.mockResolvedValue('/tmp/viability/new-run.csv')
    const newDataset = {
      ...dataset,
      id: 'dataset-2',
      name: 'new-run.csv',
      canonicalPath: '/tmp/viability/new-run.csv',
    }
    vi.mocked(scienceApi.registerDataset).mockResolvedValue({
      dataset: newDataset,
      versionCreated: true,
    })
    vi.mocked(scienceApi.previewDataset).mockResolvedValue({
      ...preview,
      datasetId: newDataset.id,
      datasetName: newDataset.name,
    })
    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getAllByRole('button', { name: 'Add table' })[0]!)

    await waitFor(() => {
      expect(scienceApi.registerDataset).toHaveBeenCalledWith({
        projectId: project.id,
        filePath: '/tmp/viability/new-run.csv',
        name: undefined,
      })
    })
    expect(dialogOpen).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: project.rootDir,
      filters: [{ name: 'Experimental tables', extensions: ['csv', 'tsv'] }],
    }))
  })

  it('creates a checked cell viability blueprint and renders its plate map', async () => {
    vi.mocked(scienceApi.createExperiment).mockResolvedValue(experiment)
    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getByRole('tab', { name: 'Experiments 0' }))
    fireEvent.change(screen.getByLabelText(/Experiment name/), {
      target: { value: experiment.name },
    })
    fireEvent.change(screen.getByLabelText(/Cell line/), {
      target: { value: 'A549' },
    })
    fireEvent.change(screen.getByLabelText(/Compound/), {
      target: { value: 'X-402' },
    })
    fireEvent.change(screen.getByLabelText('Registered readout table'), {
      target: { value: dataset.id },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save assay blueprint' }))

    await waitFor(() => {
      expect(scienceApi.createExperiment).toHaveBeenCalledWith(expect.objectContaining({
        projectId: project.id,
        name: experiment.name,
        linkedDatasetId: dataset.id,
        protocol: expect.objectContaining({
          cellLine: 'A549',
          compoundName: 'X-402',
          concentrations: [0.01, 0.1, 1, 5, 25, 100],
          replicateCount: 3,
          includeBlankControl: true,
        }),
      }))
    })
    expect(await screen.findByText('Ready for wet-lab execution')).toBeInTheDocument()
    expect(screen.getByText('96-well plate map')).toBeInTheDocument()
    expect(screen.getByText('Protocol v1')).toBeInTheDocument()
    expect(screen.getByText('Positive control is optional here; include one when the assay interpretation requires it.')).toBeInTheDocument()
  })

  it('runs a deterministic profile and exposes reproducibility, provenance, and artifacts', async () => {
    vi.mocked(scienceApi.createQualityRun).mockResolvedValue({ run, artifacts: [artifact] })
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([event])
    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getByRole('button', { name: 'Run quality profile' }))

    expect(await screen.findByText('Quality summary')).toBeInTheDocument()
    expect(screen.getByText('Replay verified')).toBeInTheDocument()
    expect(screen.getByText('Current input')).toBeInTheDocument()
    expect(screen.getByText('Provenance timeline')).toBeInTheDocument()
    expect(screen.getByText('run.completed')).toBeInTheDocument()
    expect(screen.getByText('Missing cells')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Artifacts 1' }))
    expect(await screen.findByText('Data quality profile')).toBeInTheDocument()
    expect(screen.getByText(artifact.relativePath)).toBeInTheDocument()
    expect(screen.getByText('artifact-a')).toBeInTheDocument()
  })

  it('maps explicit plate columns and renders the traced 4PL dose-response result', async () => {
    vi.mocked(scienceApi.listExperiments).mockResolvedValue([experiment])
    vi.mocked(scienceApi.previewDataset).mockResolvedValue({
      ...preview,
      headers: ['well', 'signal'],
      columns: [
        { name: 'well', inferredType: 'string', missingCount: 0, uniqueCount: 24 },
        { name: 'signal', inferredType: 'number', missingCount: 0, uniqueCount: 20 },
      ],
      rows: [['A1', '10'], ['A2', '110']],
    })
    vi.mocked(scienceApi.createDoseResponseRun).mockResolvedValue({ run: doseRun, artifacts: [] })
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([{ ...event, runId: doseRun.id }])
    render(<ScienceWorkspace />)
    await screen.findByText('A1')

    fireEvent.click(screen.getByRole('tab', { name: 'Experiments 1' }))
    expect(await screen.findByLabelText('Well column')).toHaveValue('well')
    expect(screen.getByLabelText('Signal column')).toHaveValue('signal')
    fireEvent.click(screen.getByRole('button', { name: 'Run 4PL analysis' }))

    await waitFor(() => {
      expect(scienceApi.createDoseResponseRun).toHaveBeenCalledWith({
        projectId: project.id,
        experimentId: experiment.id,
        wellColumn: 'well',
        signalColumn: 'signal',
      })
    })
    expect(await screen.findByText('Dose-response result')).toBeInTheDocument()
    expect(screen.getByText('1 µM')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Dose-response curve with replicate mean and standard deviation' })).toBeInTheDocument()
    expect(screen.getByText('Automated checks passed')).toBeInTheDocument()
    expect(screen.getByText('Scientific evidence')).toBeInTheDocument()
    expect(screen.getByText('Technical criteria supported')).toBeInTheDocument()
    expect(screen.getByText('Evaluated evidence')).toBeInTheDocument()
    expect(screen.getByText('Does not establish statistical significance')).toBeInTheDocument()
    expect(screen.getByText(/no confidence interval or biological-replicate inference/)).toBeInTheDocument()
  })

  it('keeps runs and artifacts scoped to the selected dataset', async () => {
    const secondDataset: ScienceDataset = {
      ...dataset,
      id: 'dataset-2',
      name: 'secondary.csv',
      canonicalPath: '/tmp/viability/secondary.csv',
      currentVersion: {
        ...dataset.currentVersion,
        id: 'version-2',
        contentHash: 'fedcba9876543210',
        snapshotPath: '.sciencex/objects/sha256/fe/fedcba9876543210.csv',
      },
    }
    const secondRun: ScienceAnalysisRun = {
      ...run,
      id: 'run-secondary',
      datasetId: secondDataset.id,
      datasetVersionId: secondDataset.currentVersion.id,
      inputHash: secondDataset.currentVersion.contentHash,
    }
    const secondArtifact: ScienceArtifact = {
      ...artifact,
      id: 'artifact-secondary',
      producingRunId: secondRun.id,
      name: 'Secondary profile',
    }
    vi.mocked(scienceApi.listDatasets).mockResolvedValue([dataset, secondDataset])
    vi.mocked(scienceApi.listRuns).mockResolvedValue([secondRun, run])
    vi.mocked(scienceApi.listArtifacts).mockResolvedValue([secondArtifact, artifact])
    vi.mocked(scienceApi.previewDataset).mockImplementation(async datasetId => ({
      ...preview,
      datasetId,
      datasetName: datasetId === secondDataset.id ? secondDataset.name : dataset.name,
    }))

    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getByRole('tab', { name: 'Artifacts 1' }))
    expect(await screen.findByText('Data quality profile')).toBeInTheDocument()
    expect(screen.queryByText('Secondary profile')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /secondary\.csv/ }))
    expect(await screen.findByText('Secondary profile')).toBeInTheDocument()
    expect(screen.queryByText('Data quality profile')).not.toBeInTheDocument()
  })

  it('opens a project-scoped research thread with a traceable starter prompt', async () => {
    const createSession = vi.fn().mockResolvedValue('research-session-1')
    const connectToSession = vi.fn()
    const queueComposerPrefill = vi.fn()
    useSessionStore.setState({ createSession })
    useChatStore.setState({ connectToSession, queueComposerPrefill })

    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getByRole('button', { name: 'Open model thread' }))

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith(project.rootDir)
      expect(connectToSession).toHaveBeenCalledWith('research-session-1')
      expect(queueComposerPrefill).toHaveBeenCalledWith('research-session-1', {
        text: expect.stringContaining(project.question),
        mode: 'replace',
      })
    })
    expect(useTabStore.getState().activeTabId).toBe('research-session-1')
    expect(useTabStore.getState().tabs[0]?.title).toBe('Viability pilot · Research')
  })

  it('consumes the global new-research intent and closes it with the project modal', async () => {
    useUIStore.setState({ activeModal: 'createScienceProject' })

    render(<ScienceWorkspace />)

    expect(await screen.findByRole('dialog', { name: 'Create research project' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(useUIStore.getState().activeModal).toBeNull()
  })
})
