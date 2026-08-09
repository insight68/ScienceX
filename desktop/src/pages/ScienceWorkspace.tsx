import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  Beaker,
  CheckCircle2,
  Columns3,
  Database,
  FileJson,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Folder,
  History,
  MessageSquareText,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Rows3,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Button } from '../components/shared/Button'
import { DirectoryPicker } from '../components/shared/DirectoryPicker'
import { Input } from '../components/shared/Input'
import { Modal } from '../components/shared/Modal'
import { Textarea } from '../components/shared/Textarea'
import { useTranslation } from '../i18n'
import { getDesktopHost } from '../lib/desktopHost'
import { useChatStore } from '../stores/chatStore'
import { useScienceStore } from '../stores/scienceStore'
import { useProjectContextStore } from '../stores/projectContextStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTabStore } from '../stores/tabStore'
import { useUIStore } from '../stores/uiStore'
import type {
  ScienceAnalysisRun,
  ScienceArtifact,
  ScienceColumnProfile,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceProject,
  ScienceRunEvent,
} from '../types/science'

type ScienceCanvasTab = 'data' | 'runs' | 'artifacts'

export function ScienceWorkspace() {
  const t = useTranslation()
  const projects = useScienceStore(state => state.projects)
  const selectedProjectId = useScienceStore(state => state.selectedProjectId)
  const datasets = useScienceStore(state => state.datasets)
  const selectedDatasetId = useScienceStore(state => state.selectedDatasetId)
  const preview = useScienceStore(state => state.preview)
  const runs = useScienceStore(state => state.runs)
  const selectedRunId = useScienceStore(state => state.selectedRunId)
  const runEvents = useScienceStore(state => state.runEvents)
  const artifacts = useScienceStore(state => state.artifacts)
  const projectsState = useScienceStore(state => state.projectsState)
  const datasetsState = useScienceStore(state => state.datasetsState)
  const previewState = useScienceStore(state => state.previewState)
  const runsState = useScienceStore(state => state.runsState)
  const eventsState = useScienceStore(state => state.eventsState)
  const artifactsState = useScienceStore(state => state.artifactsState)
  const runActionState = useScienceStore(state => state.runActionState)
  const error = useScienceStore(state => state.error)
  const loadProjects = useScienceStore(state => state.loadProjects)
  const selectProject = useScienceStore(state => state.selectProject)
  const registerDataset = useScienceStore(state => state.registerDataset)
  const selectDataset = useScienceStore(state => state.selectDataset)
  const selectRun = useScienceStore(state => state.selectRun)
  const runQualityProfile = useScienceStore(state => state.runQualityProfile)
  const replayRun = useScienceStore(state => state.replayRun)
  const createSession = useSessionStore(state => state.createSession)
  const selectProjectContext = useProjectContextStore(state => state.selectProject)
  const connectToSession = useChatStore(state => state.connectToSession)
  const queueComposerPrefill = useChatStore(state => state.queueComposerPrefill)
  const activeModal = useUIStore(state => state.activeModal)
  const closeGlobalModal = useUIStore(state => state.closeModal)
  const addToast = useUIStore(state => state.addToast)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [registeringTable, setRegisteringTable] = useState(false)
  const [openingResearchThread, setOpeningResearchThread] = useState(false)
  const [canvasTab, setCanvasTab] = useState<ScienceCanvasTab>('data')
  const selectedProject = projects.find(project => project.id === selectedProjectId) ?? null
  const selectedDataset = datasets.find(dataset => dataset.id === selectedDatasetId) ?? null
  const projectModalOpen = createProjectOpen || activeModal === 'createScienceProject'

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!selectedProject?.rootAvailable) return
    selectProjectContext({
      key: selectedProject.id,
      projectId: selectedProject.id,
      name: selectedProject.name,
      rootDir: selectedProject.rootDir,
      source: 'research',
    })
  }, [selectProjectContext, selectedProject])

  const addTable = async () => {
    if (!selectedProject) return
    const host = getDesktopHost()
    if (!host.isDesktop || !host.capabilities.dialogs) return

    setRegisteringTable(true)
    try {
      const selected = await host.dialogs.open({
        directory: false,
        multiple: false,
        title: t('science.addTable'),
        defaultPath: selectedProject.rootDir,
        filters: [{ name: t('science.tableFiles'), extensions: ['csv', 'tsv'] }],
      })
      const filePath = Array.isArray(selected) ? selected[0] : selected
      if (filePath) await registerDataset(filePath)
    } catch {
      // Dataset API failures are surfaced through the workspace store alert.
    } finally {
      setRegisteringTable(false)
    }
  }

  const openResearchThread = async () => {
    if (!selectedProject || openingResearchThread) return
    setOpeningResearchThread(true)
    try {
      const sessionId = await createSession(selectedProject.rootDir)
      connectToSession(sessionId)
      queueComposerPrefill(sessionId, {
        text: t('science.researchThreadPrompt', {
          project: selectedProject.name,
          question: selectedProject.question || t('science.noResearchQuestion'),
        }),
        mode: 'replace',
      })
      useTabStore.getState().openTab(
        sessionId,
        t('science.researchThreadTitle', { project: selectedProject.name }),
        'session',
      )
    } catch (threadError) {
      addToast({
        type: 'error',
        message: t('science.openResearchThreadFailed', {
          message: threadError instanceof Error ? threadError.message : t('common.error'),
        }),
      })
    } finally {
      setOpeningResearchThread(false)
    }
  }

  const closeProjectModal = () => {
    setCreateProjectOpen(false)
    if (activeModal === 'createScienceProject') closeGlobalModal()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-surface)]">
      <header className="science-workspace-header shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              <FlaskConical className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              <span>{t('science.eyebrow')}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
                {t('science.title')}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-success)]/25 bg-[var(--color-success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                <ShieldCheck className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                {t('science.localOnly')}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {t('science.subtitle')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadProjects()}
              disabled={projectsState === 'loading'}
              icon={<RefreshCw className={`h-3.5 w-3.5 ${projectsState === 'loading' ? 'animate-spin' : ''}`} strokeWidth={2} />}
            >
              {t('science.refresh')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCreateProjectOpen(true)}
              icon={<Plus className="h-3.5 w-3.5" strokeWidth={2} />}
            >
              {t('science.newProject')}
            </Button>
          </div>
        </div>
        {selectedProject && (
          <ResearchProjectOverview
            project={selectedProject}
            datasetCount={datasets.length}
            runCount={runs.length}
            artifactCount={artifacts.length}
            openingResearchThread={openingResearchThread}
            registeringTable={registeringTable}
            onOpenResearchThread={() => void openResearchThread()}
            onAddTable={() => void addTable()}
          />
        )}
      </header>

      {error && (
        <div role="alert" className="mx-5 mt-4 flex shrink-0 items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2.5 text-xs text-[var(--color-error)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {projectsState === 'loading' && projects.length === 0 ? (
          <LoadingPanel label={t('science.loadingProjects')} />
        ) : projects.length === 0 ? (
          <EmptyProjects onCreate={() => setCreateProjectOpen(true)} />
        ) : (
          <>
            <ProjectRail
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelect={projectId => void selectProject(projectId)}
            />
            <DatasetRail
              project={selectedProject}
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              state={datasetsState}
              onAdd={() => void addTable()}
              onSelect={datasetId => void selectDataset(datasetId)}
            />
            <ScienceCanvas
              project={selectedProject}
              dataset={selectedDataset}
              preview={preview}
              previewState={previewState}
              runs={runs}
              selectedRunId={selectedRunId}
              runEvents={runEvents}
              runsState={runsState}
              eventsState={eventsState}
              artifacts={artifacts}
              artifactsState={artifactsState}
              runActionState={runActionState}
              activeTab={canvasTab}
              onTabChange={setCanvasTab}
              onRetry={() => {
                if (selectedDatasetId) void selectDataset(selectedDatasetId)
              }}
              onSelectRun={runId => void selectRun(runId)}
              onRun={async () => {
                await runQualityProfile()
                setCanvasTab('runs')
              }}
              onReplay={async runId => {
                await replayRun(runId)
                setCanvasTab('runs')
              }}
            />
          </>
        )}
      </div>

      <CreateProjectModal open={projectModalOpen} onClose={closeProjectModal} />
    </div>
  )
}

function ResearchProjectOverview({
  project,
  datasetCount,
  runCount,
  artifactCount,
  openingResearchThread,
  registeringTable,
  onOpenResearchThread,
  onAddTable,
}: {
  project: ScienceProject
  datasetCount: number
  runCount: number
  artifactCount: number
  openingResearchThread: boolean
  registeringTable: boolean
  onOpenResearchThread: () => void
  onAddTable: () => void
}) {
  const t = useTranslation()
  const canAddTable = getDesktopHost().capabilities.dialogs

  return (
    <section className="mt-4 grid gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-3 shadow-sm backdrop-blur md:grid-cols-[minmax(260px,1fr)_auto]">
      <div className="min-w-0 px-1 py-0.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--color-brand)]">
          {t('science.activeProject')}
        </div>
        <h2 className="mt-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">{project.name}</h2>
        <p className="mt-1 line-clamp-2 max-w-2xl text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          {project.question || t('science.noResearchQuestion')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ProjectMetric label={t('science.datasets')} value={datasetCount} />
        <ProjectMetric label={t('science.tabRuns')} value={runCount} />
        <ProjectMetric label={t('science.tabArtifacts')} value={artifactCount} />
        <Button
          size="sm"
          variant="secondary"
          onClick={onAddTable}
          disabled={!canAddTable}
          loading={registeringTable}
          icon={<Upload className="h-3.5 w-3.5" strokeWidth={2} />}
          title={!canAddTable ? t('science.dialogUnavailable') : undefined}
        >
          {t('science.addTable')}
        </Button>
        <Button
          size="sm"
          onClick={onOpenResearchThread}
          loading={openingResearchThread}
          icon={<MessageSquareText className="h-3.5 w-3.5" strokeWidth={2} />}
        >
          {t('science.openResearchThread')}
        </Button>
      </div>
    </section>
  )
}

function ProjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[64px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-2.5 py-1.5 text-center">
      <div className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  )
}

function ProjectRail({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: ScienceProject[]
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
}) {
  const t = useTranslation()
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-container-lowest)]">
      <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">
          {t('science.projects')}
        </span>
        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">{projects.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {projects.map(project => {
          const selected = project.id === selectedProjectId
          return (
            <button
              key={project.id}
              type="button"
              disabled={!project.rootAvailable}
              onClick={() => onSelect(project.id)}
              className={`mb-1 w-full rounded-[10px] border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'border-[var(--color-brand)]/25 bg-[var(--color-surface-selected)]'
                  : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Beaker className={`h-4 w-4 shrink-0 ${selected ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-tertiary)]'}`} strokeWidth={1.8} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--color-text-primary)]">
                  {project.name}
                </span>
              </span>
              <span className="mt-1.5 block truncate pl-6 font-mono text-[9px] text-[var(--color-text-tertiary)]" title={project.rootDir}>
                {project.rootAvailable ? project.rootDir : t('science.rootUnavailable')}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function DatasetRail({
  project,
  datasets,
  selectedDatasetId,
  state,
  onAdd,
  onSelect,
}: {
  project: ScienceProject | null
  datasets: ScienceDataset[]
  selectedDatasetId: string | null
  state: 'idle' | 'loading' | 'ready' | 'error'
  onAdd: () => void
  onSelect: (datasetId: string) => void
}) {
  const t = useTranslation()
  return (
    <aside className="flex w-[270px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-start gap-2">
          <Folder className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={1.8} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{project?.name}</h2>
            {project?.question && (
              <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
                {project.question}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-between border-b border-[var(--color-border)] px-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">
          {t('science.datasets')}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          aria-label={t('science.addTable')}
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {state === 'loading' && datasets.length === 0 ? (
          <RailMessage>{t('common.loading')}</RailMessage>
        ) : datasets.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-5 text-center">
            <FileSpreadsheet className="h-8 w-8 text-[var(--color-text-tertiary)]" strokeWidth={1.4} aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold text-[var(--color-text-primary)]">{t('science.noDatasetsTitle')}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-tertiary)]">{t('science.noDatasetsBody')}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={onAdd}>
              {t('science.addTable')}
            </Button>
          </div>
        ) : (
          datasets.map(dataset => (
            <DatasetButton
              key={dataset.id}
              dataset={dataset}
              selected={dataset.id === selectedDatasetId}
              onClick={() => onSelect(dataset.id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function DatasetButton({
  dataset,
  selected,
  onClick,
}: {
  dataset: ScienceDataset
  selected: boolean
  onClick: () => void
}) {
  const t = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 w-full rounded-[10px] border p-3 text-left transition-colors ${
        selected
          ? 'border-[var(--color-brand)]/25 bg-[var(--color-surface-selected)]'
          : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <span className="flex items-center gap-2">
        <Database className={`h-4 w-4 shrink-0 ${selected ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-tertiary)]'}`} strokeWidth={1.8} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--color-text-primary)]">{dataset.name}</span>
        <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-1 py-0.5 font-mono text-[8px] uppercase text-[var(--color-text-tertiary)]">
          {dataset.format}
        </span>
      </span>
      <span className="mt-2 flex items-center justify-between pl-6 text-[9px] text-[var(--color-text-tertiary)]">
        <span>{formatBytes(dataset.currentVersion.sizeBytes)}</span>
        <span>{t('science.version', { count: dataset.currentVersion.ordinal })}</span>
      </span>
    </button>
  )
}

function ScienceCanvas({
  project,
  dataset,
  preview,
  previewState,
  runs,
  selectedRunId,
  runEvents,
  runsState,
  eventsState,
  artifacts,
  artifactsState,
  runActionState,
  activeTab,
  onTabChange,
  onRetry,
  onSelectRun,
  onRun,
  onReplay,
}: {
  project: ScienceProject | null
  dataset: ScienceDataset | null
  preview: ScienceDatasetPreview | null
  previewState: 'idle' | 'loading' | 'ready' | 'error'
  runs: ScienceAnalysisRun[]
  selectedRunId: string | null
  runEvents: ScienceRunEvent[]
  runsState: 'idle' | 'loading' | 'ready' | 'error'
  eventsState: 'idle' | 'loading' | 'ready' | 'error'
  artifacts: ScienceArtifact[]
  artifactsState: 'idle' | 'loading' | 'ready' | 'error'
  runActionState: 'idle' | 'loading' | 'ready' | 'error'
  activeTab: ScienceCanvasTab
  onTabChange: (tab: ScienceCanvasTab) => void
  onRetry: () => void
  onSelectRun: (runId: string) => void
  onRun: () => Promise<void>
  onReplay: (runId: string) => Promise<void>
}) {
  const t = useTranslation()
  if (!project || !dataset) {
    return (
      <PreviewPanel
        project={project}
        dataset={dataset}
        preview={preview}
        state={previewState}
        onRetry={onRetry}
      />
    )
  }

  const tabs: Array<{ id: ScienceCanvasTab; label: string; count?: number }> = [
    { id: 'data', label: t('science.tabData') },
    { id: 'runs', label: t('science.tabRuns'), count: runs.length },
    { id: 'artifacts', label: t('science.tabArtifacts'), count: artifacts.length },
  ]
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface-container-lowest)]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3">
        <div className="flex h-full items-center gap-1" role="tablist" aria-label={t('science.canvasTabs')}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex h-full items-center gap-1.5 px-3 text-[10px] font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--color-text-primary)] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[var(--color-brand)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-[var(--color-surface-container-high)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--color-text-tertiary)]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => void onRun().catch(() => undefined)}
          loading={runActionState === 'loading'}
          icon={<Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} />}
        >
          {t('science.runQualityProfile')}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {activeTab === 'data' && (
          <PreviewPanel
            project={project}
            dataset={dataset}
            preview={preview}
            state={previewState}
            onRetry={onRetry}
          />
        )}
        {activeTab === 'runs' && (
          <RunsPanel
            dataset={dataset}
            runs={runs}
            selectedRunId={selectedRunId}
            events={runEvents}
            state={runsState}
            eventsState={eventsState}
            runActionState={runActionState}
            onSelect={onSelectRun}
            onRun={onRun}
            onReplay={onReplay}
          />
        )}
        {activeTab === 'artifacts' && (
          <ArtifactsPanel artifacts={artifacts} state={artifactsState} />
        )}
      </div>
    </main>
  )
}

function RunsPanel({
  dataset,
  runs,
  selectedRunId,
  events,
  state,
  eventsState,
  runActionState,
  onSelect,
  onRun,
  onReplay,
}: {
  dataset: ScienceDataset
  runs: ScienceAnalysisRun[]
  selectedRunId: string | null
  events: ScienceRunEvent[]
  state: 'idle' | 'loading' | 'ready' | 'error'
  eventsState: 'idle' | 'loading' | 'ready' | 'error'
  runActionState: 'idle' | 'loading' | 'ready' | 'error'
  onSelect: (runId: string) => void
  onRun: () => Promise<void>
  onReplay: (runId: string) => Promise<void>
}) {
  const t = useTranslation()
  const selectedRun = runs.find(run => run.id === selectedRunId) ?? runs[0] ?? null
  if (state === 'loading') return <LoadingPanel label={t('science.loadingRuns')} />
  if (runs.length === 0) {
    return (
      <section className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <Activity className="h-7 w-7 text-[var(--color-brand)]" strokeWidth={1.5} />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">{t('science.noRunsTitle')}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">{t('science.noRunsBody')}</p>
          <Button
            className="mt-4"
            onClick={() => void onRun().catch(() => undefined)}
            loading={runActionState === 'loading'}
            icon={<Play className="h-4 w-4" fill="currentColor" />}
          >
            {t('science.runQualityProfile')}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-w-0">
      <aside className="w-[176px] shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] p-2 2xl:w-[238px]">
        <div className="px-2 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">
          {t('science.runHistory')}
        </div>
        {runs.map(run => (
          <button
            key={run.id}
            type="button"
            onClick={() => onSelect(run.id)}
            className={`mb-1 w-full rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
              run.id === selectedRun?.id
                ? 'border-[var(--color-brand)]/25 bg-[var(--color-surface-selected)]'
                : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[9px] font-semibold text-[var(--color-text-primary)]">
                {run.id.slice(0, 8)}
              </span>
              <RunStatusBadge status={run.status} />
            </span>
            <span className="mt-1.5 flex items-center justify-between text-[9px] text-[var(--color-text-tertiary)]">
              <span>{formatTimestamp(run.createdAt)}</span>
              <span>v{run.datasetVersionId === dataset.currentVersion.id ? dataset.currentVersion.ordinal : '—'}</span>
            </span>
          </button>
        ))}
      </aside>
      {selectedRun && (
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[var(--color-brand)]" strokeWidth={1.8} />
                  <h2 className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">{selectedRun.id.slice(0, 12)}</h2>
                  <RunStatusBadge status={selectedRun.status} />
                  <ReproducibilityBadge status={selectedRun.reproducibilityStatus} />
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                  {t('science.recipe')}: <span className="font-mono text-[var(--color-text-secondary)]">{selectedRun.recipe}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void onReplay(selectedRun.id).catch(() => undefined)}
                loading={runActionState === 'loading'}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                {t('science.replayRun')}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--color-border)] bg-[var(--color-border)] 2xl:grid-cols-4">
              <RunMetric label={t('science.inputHash')} value={selectedRun.inputHash.slice(0, 10)} mono />
              <RunMetric label={t('science.runtime')} value={`${selectedRun.environment.runtime} ${selectedRun.environment.runtimeVersion}`} />
              <RunMetric label={t('science.exitCode')} value={selectedRun.exitCode === null ? '—' : String(selectedRun.exitCode)} />
              <RunMetric label={t('science.duration')} value={formatDuration(selectedRun.startedAt, selectedRun.completedAt)} />
            </div>
          </div>
          {selectedRun.summary && <QualitySummary run={selectedRun} />}
          {selectedRun.errorMessage && (
            <div className="mx-5 mt-4 rounded-[10px] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2.5 text-xs text-[var(--color-error)]">
              {selectedRun.errorMessage}
            </div>
          )}
          <RunTimeline events={events} state={eventsState} />
        </div>
      )}
    </section>
  )
}

function QualitySummary({ run }: { run: ScienceAnalysisRun }) {
  const t = useTranslation()
  const summary = run.summary
  if (!summary) return null
  return (
    <div className="border-b border-[var(--color-border)] px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">{t('science.qualitySummary')}</h3>
        {summary.truncated && (
          <span className="rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-[9px] font-semibold text-[var(--color-warning)]">
            {t('science.sampledAnalysis')}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 2xl:grid-cols-4">
        <SummaryCard label={t('science.rows')} value={String(summary.sampledRowCount)} />
        <SummaryCard label={t('science.completeRows')} value={String(summary.completeRowCount)} />
        <SummaryCard label={t('science.missingCells')} value={String(summary.missingCellCount)} tone={summary.missingCellCount > 0 ? 'warning' : 'success'} />
        <SummaryCard label={t('science.numericColumns')} value={String(summary.numericColumnCount)} />
      </div>
      <div className="mt-3 space-y-2">
        {summary.warnings.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[9px] border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 px-3 py-2 text-[10px] text-[var(--color-success)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('science.noQualityWarnings')}
          </div>
        ) : summary.warnings.map(warning => (
          <div key={warning.code} className="flex items-start gap-2 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${warning.severity === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-brand)]'}`} />
            <div className="min-w-0 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">{warning.code}</span> — {warning.code === 'sampled-profile'
                ? t('science.warning.sampledProfile', { count: summary.sampledRowCount })
                : warning.code === 'missing-values'
                  ? t('science.warning.missingValues', { count: summary.missingCellCount })
                  : warning.code === 'empty-column'
                    ? t('science.warning.emptyColumn')
                    : t('science.warning.identifierCandidate')}
              {warning.columns.length > 0 && <span className="ml-1 font-mono text-[var(--color-text-tertiary)]">[{warning.columns.join(', ')}]</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[9px] leading-relaxed text-[var(--color-text-tertiary)]">{t('science.qualityDisclaimer')}</p>
    </div>
  )
}

function ArtifactsPanel({
  artifacts,
  state,
}: {
  artifacts: ScienceArtifact[]
  state: 'idle' | 'loading' | 'ready' | 'error'
}) {
  const t = useTranslation()
  if (state === 'loading') return <LoadingPanel label={t('science.loadingArtifacts')} />
  if (artifacts.length === 0) {
    return (
      <section className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <Archive className="mx-auto h-10 w-10 text-[var(--color-text-tertiary)]" strokeWidth={1.3} />
          <h2 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{t('science.noArtifactsTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{t('science.noArtifactsBody')}</p>
        </div>
      </section>
    )
  }
  return (
    <section className="h-full overflow-y-auto p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('science.artifactRegistry')}</h2>
        <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">{t('science.artifactRegistryBody')}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {artifacts.map(artifact => (
          <article key={artifact.id} className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${artifact.kind === 'report' ? 'bg-[var(--color-brand)]/10 text-[var(--color-brand)]' : 'bg-[var(--color-success)]/10 text-[var(--color-success)]'}`}>
                {artifact.kind === 'report' ? <FileText className="h-4.5 w-4.5" /> : <FileJson className="h-4.5 w-4.5" />}
              </div>
              <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[var(--color-text-tertiary)]">{artifact.kind}</span>
            </div>
            <h3 className="mt-3 text-xs font-semibold text-[var(--color-text-primary)]">{artifact.name}</h3>
            <p className="mt-1.5 break-all font-mono text-[9px] leading-relaxed text-[var(--color-text-tertiary)]">{artifact.relativePath}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-3 text-[9px] text-[var(--color-text-tertiary)]">
              <span>{formatBytes(artifact.sizeBytes)}</span>
              <span className="text-right font-mono">{artifact.contentHash.slice(0, 10)}</span>
              <span className="col-span-2 font-mono">run {artifact.producingRunId.slice(0, 8)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function RunTimeline({
  events,
  state,
}: {
  events: ScienceRunEvent[]
  state: 'idle' | 'loading' | 'ready' | 'error'
}) {
  const t = useTranslation()
  return (
    <div className="px-5 py-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">{t('science.provenanceTimeline')}</h3>
      {state === 'loading' ? (
        <div className="text-xs text-[var(--color-text-tertiary)]">{t('common.loading')}</div>
      ) : (
        <ol className="relative ml-1 border-l border-[var(--color-border)] pl-5">
          {events.map(event => (
            <li key={event.id} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[23px] top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] ring-4 ring-[var(--color-surface-container-lowest)]" />
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] font-semibold text-[var(--color-text-primary)]">{event.type}</span>
                <span className="text-[9px] text-[var(--color-text-tertiary)]">{formatTimestamp(event.at)}</span>
              </div>
              <p className="mt-1 break-all font-mono text-[8px] leading-relaxed text-[var(--color-text-tertiary)]">
                {eventSummary(event)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function RunStatusBadge({ status }: { status: ScienceAnalysisRun['status'] }) {
  const t = useTranslation()
  const tones: Record<ScienceAnalysisRun['status'], string> = {
    queued: 'border-[var(--color-border)] text-[var(--color-text-tertiary)]',
    running: 'border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 text-[var(--color-brand)]',
    completed: 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]',
    failed: 'border-[var(--color-error)]/30 bg-[var(--color-error)]/10 text-[var(--color-error)]',
    interrupted: 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  }
  return <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${tones[status]}`}>{t(`science.status.${status}`)}</span>
}

function ReproducibilityBadge({ status }: { status: ScienceAnalysisRun['reproducibilityStatus'] }) {
  const t = useTranslation()
  const tone = status === 'reproducible'
    ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
    : status === 'stale'
      ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
      : 'border-[var(--color-border)] text-[var(--color-text-tertiary)]'
  return <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${tone}`}>{t(`science.repro.${status}`)}</span>
}

function RunMetric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[var(--color-surface-container-lowest)] px-3 py-2.5">
      <div className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">{label}</div>
      <div className={`mt-1 truncate text-[10px] font-semibold text-[var(--color-text-secondary)] ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'warning' | 'success' }) {
  const color = tone === 'warning'
    ? 'text-[var(--color-warning)]'
    : tone === 'success'
      ? 'text-[var(--color-success)]'
      : 'text-[var(--color-text-primary)]'
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className={`font-mono text-lg font-semibold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[9px] text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  )
}

function PreviewPanel({
  project,
  dataset,
  preview,
  state,
  onRetry,
}: {
  project: ScienceProject | null
  dataset: ScienceDataset | null
  preview: ScienceDatasetPreview | null
  state: 'idle' | 'loading' | 'ready' | 'error'
  onRetry: () => void
}) {
  const t = useTranslation()
  if (!project || !dataset) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-[var(--color-surface-container-lowest)] p-8 text-center">
        <div className="max-w-sm">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-[var(--color-text-tertiary)]" strokeWidth={1.3} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{t('science.selectDatasetTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-tertiary)]">{t('science.selectDatasetBody')}</p>
        </div>
      </main>
    )
  }
  if (state === 'loading') return <LoadingPanel label={t('science.loadingPreview')} />
  if (state === 'error' || !preview) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-[var(--color-surface-container-lowest)] p-8 text-center">
        <div className="max-w-sm">
          <AlertTriangle className="mx-auto h-9 w-9 text-[var(--color-error)]" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{t('science.previewFailed')}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-tertiary)]">{t('science.previewFailedBody')}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>{t('common.retry')}</Button>
        </div>
      </main>
    )
  }

  return <TablePreview dataset={dataset} preview={preview} />
}

function TablePreview({ dataset, preview }: { dataset: ScienceDataset; preview: ScienceDatasetPreview }) {
  const t = useTranslation()
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface-container-lowest)]">
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand)]" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{dataset.name}</h2>
              {preview.truncated && (
                <span className="rounded-full border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-warning)]">
                  {t('science.sampled')}
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-[9px] text-[var(--color-text-tertiary)]" title={dataset.canonicalPath}>
              {dataset.canonicalPath}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-[var(--color-text-tertiary)]">
            <Meta label={t('science.columns')} value={String(preview.columns.length)} icon={<Columns3 />} />
            <Meta label={t('science.rows')} value={String(preview.sampledRowCount)} icon={<Rows3 />} />
            <Meta label={t('science.versionLabel')} value={`v${dataset.currentVersion.ordinal}`} />
            <Meta label="SHA-256" value={preview.contentHash.slice(0, 10)} mono />
          </div>
        </div>
      </div>

      <section className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-5 py-3">
        <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">
          {t('science.columnProfile')}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {preview.columns.map(column => <ColumnCard key={column.name} column={column} />)}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left font-mono text-[10px]">
          <thead className="sticky top-0 z-10 bg-[var(--color-surface)] shadow-[0_1px_0_var(--color-border)]">
            <tr>
              <th className="sticky left-0 z-20 w-12 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-right font-medium text-[var(--color-text-tertiary)]">#</th>
              {preview.headers.map(header => (
                <th key={header} className="min-w-[140px] whitespace-nowrap border-r border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-text-primary)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-[var(--color-surface-hover)]">
                <td className="sticky left-0 border-b border-r border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-right text-[var(--color-text-tertiary)] group-hover:bg-[var(--color-surface-hover)]">
                  {rowIndex + 1}
                </td>
                {row.map((value, columnIndex) => (
                  <td
                    key={`${rowIndex}-${columnIndex}`}
                    className={`max-w-[320px] whitespace-pre-wrap break-words border-b border-r border-[var(--color-border)] px-3 py-2 ${value === '' ? 'italic text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]'}`}
                  >
                    {value === '' ? '∅' : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <footer className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-[9px] text-[var(--color-text-tertiary)]">
        <span>{t('science.previewFootnote', { count: preview.sampledRowCount })}</span>
        <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
          <ShieldCheck className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          {t('science.notSentToModel')}
        </span>
      </footer>
    </main>
  )
}

function ColumnCard({ column }: { column: ScienceColumnProfile }) {
  const t = useTranslation()
  const typeTone: Record<ScienceColumnProfile['inferredType'], string> = {
    boolean: 'border-[var(--color-success)]/25 bg-[var(--color-success)]/8 text-[var(--color-success)]',
    integer: 'border-[var(--color-brand)]/25 bg-[var(--color-brand)]/8 text-[var(--color-brand)]',
    number: 'border-[var(--color-brand)]/25 bg-[var(--color-brand)]/8 text-[var(--color-brand)]',
    datetime: 'border-[var(--color-warning)]/25 bg-[var(--color-warning)]/8 text-[var(--color-warning)]',
    string: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
    empty: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)]',
  }
  return (
    <div className="w-[168px] shrink-0 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-semibold text-[var(--color-text-primary)]" title={column.name}>{column.name}</span>
        <span className={`shrink-0 rounded border px-1 py-0.5 font-mono text-[8px] ${typeTone[column.inferredType]}`}>
          {column.inferredType}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[8px] text-[var(--color-text-tertiary)]">
        <span>{t('science.missing')} {column.missingCount}</span>
        <span>{t('science.unique')} {column.uniqueCount}</span>
      </div>
    </div>
  )
}

function Meta({ label, value, icon, mono = false }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon && <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
      <span>{label}</span>
      <strong className={`${mono ? 'font-mono' : 'font-semibold'} text-[var(--color-text-secondary)]`}>{value}</strong>
    </span>
  )
}

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  const t = useTranslation()
  return (
    <main className="flex min-w-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_38%,var(--color-surface-container-low)_0%,var(--color-surface)_58%)] p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] shadow-[var(--shadow-card)]">
          <FlaskConical className="h-8 w-8 text-[var(--color-brand)]" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-base font-semibold text-[var(--color-text-primary)]">{t('science.noProjectsTitle')}</h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{t('science.noProjectsBody')}</p>
        <Button className="mt-5" onClick={onCreate} icon={<Plus className="h-4 w-4" />}>{t('science.newProject')}</Button>
      </div>
    </main>
  )
}

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation()
  const createProject = useScienceStore(state => state.createProject)
  const error = useScienceStore(state => state.error)
  const [name, setName] = useState('')
  const [question, setQuestion] = useState('')
  const [rootDir, setRootDir] = useState('')
  const [saving, setSaving] = useState(false)

  const valid = name.trim().length > 0 && rootDir.trim().length > 0
  const close = () => {
    if (saving) return
    setName('')
    setQuestion('')
    setRootDir('')
    onClose()
  }
  const submit = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await createProject({ name, question, rootDir })
      close()
    } catch {
      // The store exposes the actionable server message in the page alert.
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('science.createProject')}
      footer={(
        <>
          <Button variant="ghost" onClick={close} disabled={saving}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} loading={saving} disabled={!valid}>{t('science.createProject')}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-3 py-2 text-xs text-[var(--color-error)]">
            {error}
          </div>
        )}
        <Input
          label={t('science.projectName')}
          value={name}
          onChange={event => setName(event.currentTarget.value)}
          placeholder={t('science.projectNamePlaceholder')}
          required
          autoFocus
        />
        <Textarea
          label={t('science.researchQuestion')}
          value={question}
          onChange={event => setQuestion(event.currentTarget.value)}
          placeholder={t('science.researchQuestionPlaceholder')}
          className="min-h-[88px]"
        />
        <div>
          <div className="mb-1 text-sm font-medium text-[var(--color-text-primary)]">
            {t('science.projectFolder')}<span className="ml-0.5 text-[var(--color-error)]">*</span>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-container-low)] p-2">
            <DirectoryPicker value={rootDir} onChange={setRootDir} />
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-text-tertiary)]">{t('science.projectFolderHint')}</p>
        </div>
      </div>
    </Modal>
  )
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center bg-[var(--color-surface-container-lowest)]">
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
        <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}

function RailMessage({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-8 text-center text-xs text-[var(--color-text-tertiary)]">{children}</div>
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '—'
  const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(duration) || duration < 0) return '—'
  if (duration < 1000) return `${duration} ms`
  return `${(duration / 1000).toFixed(1)} s`
}

function eventSummary(event: ScienceRunEvent): string {
  const data = event.data
  if (event.type === 'run.created') {
    return `${String(data.recipe ?? '')} · input ${String(data.inputHash ?? '').slice(0, 10)}`
  }
  if (event.type === 'run.started') {
    const environment = data.environment as { runtime?: string; runtimeVersion?: string } | undefined
    return `${environment?.runtime ?? 'runtime'} ${environment?.runtimeVersion ?? ''} · recipe ${String(data.recipeHash ?? '').slice(0, 10)}`
  }
  if (event.type === 'artifact.created') {
    return `${String(data.kind ?? 'artifact')} · ${String(data.relativePath ?? '')}`
  }
  if (event.type === 'run.completed') {
    return `exit ${String(data.exitCode ?? 0)} · ${String(data.reproducibilityStatus ?? '')}`
  }
  return String(data.message ?? event.type)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
