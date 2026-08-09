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
    listRuns: vi.fn(),
    createQualityRun: vi.fn(),
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
    sizeBytes: 52,
    contentHash: 'abcdef1234567890',
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
  sizeBytes: 52,
  contentHash: 'abcdef1234567890',
  localOnly: true,
}

const run: ScienceAnalysisRun = {
  id: 'run-1234567890',
  projectId: project.id,
  datasetId: dataset.id,
  datasetVersionId: dataset.currentVersion.id,
  parentRunId: null,
  recipe: 'table-quality-v1',
  status: 'completed',
  reproducibilityStatus: 'reproducible',
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
  it('renders the project, column profiles, sample rows, and local-only boundary', async () => {
    render(<ScienceWorkspace />)

    expect(await screen.findByText('control')).toBeInTheDocument()
    expect(screen.getByText('treated')).toBeInTheDocument()
    expect(screen.getAllByText('Viability pilot')).toHaveLength(3)
    expect(screen.getByText('Not sent to a model')).toBeInTheDocument()
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

  it('runs a deterministic profile and exposes reproducibility, provenance, and artifacts', async () => {
    vi.mocked(scienceApi.createQualityRun).mockResolvedValue({ run, artifacts: [artifact] })
    vi.mocked(scienceApi.getRunEvents).mockResolvedValue([event])
    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getByRole('button', { name: 'Run quality profile' }))

    expect(await screen.findByText('Quality summary')).toBeInTheDocument()
    expect(screen.getByText('Reproducible')).toBeInTheDocument()
    expect(screen.getByText('Provenance timeline')).toBeInTheDocument()
    expect(screen.getByText('run.completed')).toBeInTheDocument()
    expect(screen.getByText('Missing cells')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Artifacts 1' }))
    expect(await screen.findByText('Data quality profile')).toBeInTheDocument()
    expect(screen.getByText(artifact.relativePath)).toBeInTheDocument()
    expect(screen.getByText('artifact-a')).toBeInTheDocument()
  })

  it('opens a project-scoped research thread with a traceable starter prompt', async () => {
    const createSession = vi.fn().mockResolvedValue('research-session-1')
    const connectToSession = vi.fn()
    const queueComposerPrefill = vi.fn()
    useSessionStore.setState({ createSession })
    useChatStore.setState({ connectToSession, queueComposerPrefill })

    render(<ScienceWorkspace />)
    await screen.findByText('control')

    fireEvent.click(screen.getByRole('button', { name: 'Open research thread' }))

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
