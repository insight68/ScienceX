import { create } from 'zustand'
import { scienceApi } from '../api/science'
import type {
  CreateScienceExperimentInput,
  ScienceAnalysisRun,
  ScienceArtifact,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceExperiment,
  ScienceProject,
  ScienceRunEvent,
} from '../types/science'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

type ScienceStore = {
  projects: ScienceProject[]
  selectedProjectId: string | null
  datasets: ScienceDataset[]
  selectedDatasetId: string | null
  preview: ScienceDatasetPreview | null
  experiments: ScienceExperiment[]
  selectedExperimentId: string | null
  runs: ScienceAnalysisRun[]
  selectedRunId: string | null
  runEvents: ScienceRunEvent[]
  artifacts: ScienceArtifact[]
  projectsState: LoadState
  datasetsState: LoadState
  previewState: LoadState
  experimentsState: LoadState
  experimentActionState: LoadState
  runsState: LoadState
  eventsState: LoadState
  artifactsState: LoadState
  runActionState: LoadState
  error: string | null
  loadProjects: () => Promise<void>
  createProject: (input: { name: string; question?: string; rootDir: string }) => Promise<ScienceProject>
  selectProject: (projectId: string) => Promise<void>
  registerDataset: (filePath: string, name?: string) => Promise<ScienceDataset>
  selectDataset: (datasetId: string) => Promise<void>
  selectExperiment: (experimentId: string) => void
  createExperiment: (
    input: Omit<CreateScienceExperimentInput, 'projectId'>,
  ) => Promise<ScienceExperiment>
  linkExperimentDataset: (experimentId: string, datasetId: string) => Promise<ScienceExperiment>
  selectRun: (runId: string) => Promise<void>
  runQualityProfile: () => Promise<ScienceAnalysisRun>
  runDoseResponse: (
    experimentId: string,
    wellColumn: string,
    signalColumn: string,
  ) => Promise<ScienceAnalysisRun>
  replayRun: (runId: string) => Promise<ScienceAnalysisRun>
  reset: () => void
}

const initialState = {
  projects: [] as ScienceProject[],
  selectedProjectId: null as string | null,
  datasets: [] as ScienceDataset[],
  selectedDatasetId: null as string | null,
  preview: null as ScienceDatasetPreview | null,
  experiments: [] as ScienceExperiment[],
  selectedExperimentId: null as string | null,
  runs: [] as ScienceAnalysisRun[],
  selectedRunId: null as string | null,
  runEvents: [] as ScienceRunEvent[],
  artifacts: [] as ScienceArtifact[],
  projectsState: 'idle' as LoadState,
  datasetsState: 'idle' as LoadState,
  previewState: 'idle' as LoadState,
  experimentsState: 'idle' as LoadState,
  experimentActionState: 'idle' as LoadState,
  runsState: 'idle' as LoadState,
  eventsState: 'idle' as LoadState,
  artifactsState: 'idle' as LoadState,
  runActionState: 'idle' as LoadState,
  error: null as string | null,
}

let projectsRequest = 0
let datasetsRequest = 0
let previewRequest = 0
let experimentsRequest = 0
let runsRequest = 0
let eventsRequest = 0

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useScienceStore = create<ScienceStore>((set, get) => ({
  ...initialState,

  loadProjects: async () => {
    const request = ++projectsRequest
    set({ projectsState: 'loading', error: null })
    try {
      const projects = await scienceApi.listProjects()
      if (request !== projectsRequest) return
      const currentSelection = get().selectedProjectId
      const selectedProjectId = projects.some(
        project => project.id === currentSelection && project.rootAvailable,
      )
        ? currentSelection
        : projects.find(project => project.rootAvailable)?.id ?? null
      set({ projects, selectedProjectId, projectsState: 'ready' })
      if (selectedProjectId) await get().selectProject(selectedProjectId)
      else {
        set({
          datasets: [],
          selectedDatasetId: null,
          preview: null,
          experiments: [],
          selectedExperimentId: null,
          runs: [],
          selectedRunId: null,
          runEvents: [],
          artifacts: [],
          datasetsState: 'idle',
          previewState: 'idle',
          experimentsState: 'idle',
          experimentActionState: 'idle',
          runsState: 'idle',
          eventsState: 'idle',
          artifactsState: 'idle',
        })
      }
    } catch (error) {
      if (request !== projectsRequest) return
      set({ projectsState: 'error', error: errorMessage(error) })
    }
  },

  createProject: async input => {
    set({ error: null })
    try {
      const project = await scienceApi.createProject(input)
      set(state => ({
        projects: [project, ...state.projects.filter(current => current.id !== project.id)],
        selectedProjectId: project.id,
        projectsState: 'ready',
      }))
      await get().selectProject(project.id)
      return project
    } catch (error) {
      set({ error: errorMessage(error) })
      throw error
    }
  },

  selectProject: async projectId => {
    const request = ++datasetsRequest
    const experimentRequest = ++experimentsRequest
    previewRequest += 1
    const analysisRequest = ++runsRequest
    eventsRequest += 1
    set({
      selectedProjectId: projectId,
      datasets: [],
      selectedDatasetId: null,
      preview: null,
      experiments: [],
      selectedExperimentId: null,
      runs: [],
      selectedRunId: null,
      runEvents: [],
      artifacts: [],
      datasetsState: 'loading',
      previewState: 'idle',
      experimentsState: 'loading',
      experimentActionState: 'idle',
      runsState: 'loading',
      eventsState: 'idle',
      artifactsState: 'loading',
      runActionState: 'idle',
      error: null,
    })
    try {
      const [datasets, experiments, runs, artifacts] = await Promise.all([
        scienceApi.listDatasets(projectId),
        scienceApi.listExperiments(projectId),
        scienceApi.listRuns(projectId),
        scienceApi.listArtifacts(projectId),
      ])
      if (
        request !== datasetsRequest ||
        experimentRequest !== experimentsRequest ||
        analysisRequest !== runsRequest ||
        get().selectedProjectId !== projectId
      ) return
      const selectedDatasetId = datasets[0]?.id ?? null
      const selectedRunId = runs.find(run => run.datasetId === selectedDatasetId)?.id ?? null
      set({
        datasets,
        selectedDatasetId,
        datasetsState: 'ready',
        experiments,
        selectedExperimentId: experiments[0]?.id ?? null,
        experimentsState: 'ready',
        runs,
        selectedRunId,
        runsState: 'ready',
        artifacts,
        artifactsState: 'ready',
      })
      if (selectedDatasetId) await get().selectDataset(selectedDatasetId)
    } catch (error) {
      if (request !== datasetsRequest) return
      set({
        datasetsState: 'error',
        experimentsState: 'error',
        runsState: 'error',
        artifactsState: 'error',
        error: errorMessage(error),
      })
    }
  },

  registerDataset: async (filePath, name) => {
    const projectId = get().selectedProjectId
    if (!projectId) throw new Error('Select a research project before registering a table')
    set({ error: null })
    try {
      const { dataset } = await scienceApi.registerDataset({ projectId, filePath, name })
      set(state => ({
        datasets: [dataset, ...state.datasets.filter(current => current.id !== dataset.id)],
        selectedDatasetId: dataset.id,
        datasetsState: 'ready',
      }))
      await get().selectDataset(dataset.id)
      const currentProjectId = get().selectedProjectId
      if (currentProjectId) {
        const runs = await scienceApi.listRuns(currentProjectId)
        const selectedRun = runs.find(run => run.datasetId === dataset.id) ?? null
        set({ runs, selectedRunId: selectedRun?.id ?? null, runsState: 'ready' })
        if (selectedRun) await get().selectRun(selectedRun.id)
      }
      return dataset
    } catch (error) {
      set({ error: errorMessage(error) })
      throw error
    }
  },

  selectDataset: async datasetId => {
    const request = ++previewRequest
    eventsRequest += 1
    const selectedRunId = get().runs.find(run => run.datasetId === datasetId)?.id ?? null
    set({
      selectedDatasetId: datasetId,
      selectedRunId,
      preview: null,
      runEvents: [],
      previewState: 'loading',
      eventsState: selectedRunId ? 'loading' : 'idle',
      error: null,
    })
    try {
      const preview = await scienceApi.previewDataset(datasetId)
      if (request !== previewRequest || get().selectedDatasetId !== datasetId) return
      set({ preview, previewState: 'ready' })
    } catch (error) {
      if (request !== previewRequest) return
      set({ previewState: 'error', error: errorMessage(error) })
    } finally {
      if (selectedRunId && request === previewRequest && get().selectedDatasetId === datasetId) {
        await get().selectRun(selectedRunId)
      }
    }
  },

  selectExperiment: experimentId => {
    if (!get().experiments.some(experiment => experiment.id === experimentId)) return
    set({ selectedExperimentId: experimentId, error: null })
  },

  createExperiment: async input => {
    const projectId = get().selectedProjectId
    if (!projectId) throw new Error('Select a research project before creating an experiment')
    set({ experimentActionState: 'loading', error: null })
    try {
      const experiment = await scienceApi.createExperiment({ projectId, ...input })
      set(state => ({
        experiments: [
          experiment,
          ...state.experiments.filter(current => current.id !== experiment.id),
        ],
        selectedExperimentId: experiment.id,
        experimentsState: 'ready',
        experimentActionState: 'ready',
      }))
      return experiment
    } catch (error) {
      set({ experimentActionState: 'error', error: errorMessage(error) })
      throw error
    }
  },

  linkExperimentDataset: async (experimentId, datasetId) => {
    const projectId = get().selectedProjectId
    if (!projectId) throw new Error('Select a research project before linking experiment data')
    set({ experimentActionState: 'loading', error: null })
    try {
      const experiment = await scienceApi.linkExperimentDataset({
        projectId,
        experimentId,
        datasetId,
      })
      set(state => ({
        experiments: state.experiments.map(current => (
          current.id === experiment.id ? experiment : current
        )),
        selectedExperimentId: experiment.id,
        experimentActionState: 'ready',
      }))
      return experiment
    } catch (error) {
      set({ experimentActionState: 'error', error: errorMessage(error) })
      throw error
    }
  },

  selectRun: async runId => {
    const request = ++eventsRequest
    set({ selectedRunId: runId, runEvents: [], eventsState: 'loading', error: null })
    try {
      const runEvents = await scienceApi.getRunEvents(runId)
      if (request !== eventsRequest || get().selectedRunId !== runId) return
      set({ runEvents, eventsState: 'ready' })
    } catch (error) {
      if (request !== eventsRequest) return
      set({ eventsState: 'error', error: errorMessage(error) })
    }
  },

  runQualityProfile: async () => {
    const projectId = get().selectedProjectId
    const datasetId = get().selectedDatasetId
    if (!projectId || !datasetId) throw new Error('Select a registered table before starting analysis')
    set({ runActionState: 'loading', error: null })
    try {
      const result = await scienceApi.createQualityRun({ projectId, datasetId, maxRows: 100 })
      set(state => ({
        runs: [result.run, ...state.runs.filter(run => run.id !== result.run.id)],
        selectedRunId: result.run.id,
        artifacts: [...result.artifacts, ...state.artifacts.filter(artifact => (
          !result.artifacts.some(created => created.id === artifact.id)
        ))],
        runsState: 'ready',
        artifactsState: 'ready',
        runActionState: 'ready',
      }))
      await get().selectRun(result.run.id)
      return result.run
    } catch (error) {
      try {
        const [runs, artifacts] = await Promise.all([
          scienceApi.listRuns(projectId),
          scienceApi.listArtifacts(projectId),
        ])
        set({
          runs,
          selectedRunId: runs[0]?.id ?? null,
          artifacts,
          runsState: 'ready',
          artifactsState: 'ready',
        })
        if (runs[0]) await get().selectRun(runs[0].id)
      } catch {
        // Preserve the original run failure as the actionable error.
      }
      set({ runActionState: 'error', error: errorMessage(error) })
      throw error
    }
  },

  runDoseResponse: async (experimentId, wellColumn, signalColumn) => {
    const projectId = get().selectedProjectId
    if (!projectId) throw new Error('Select a research project before starting analysis')
    set({ runActionState: 'loading', error: null })
    try {
      const result = await scienceApi.createDoseResponseRun({
        projectId,
        experimentId,
        wellColumn,
        signalColumn,
      })
      set(state => ({
        runs: [result.run, ...state.runs.filter(run => run.id !== result.run.id)],
        selectedRunId: result.run.id,
        artifacts: [...result.artifacts, ...state.artifacts.filter(artifact => (
          !result.artifacts.some(created => created.id === artifact.id)
        ))],
        runsState: 'ready',
        artifactsState: 'ready',
        runActionState: 'ready',
      }))
      await get().selectRun(result.run.id)
      return result.run
    } catch (error) {
      try {
        const [runs, artifacts] = await Promise.all([
          scienceApi.listRuns(projectId),
          scienceApi.listArtifacts(projectId),
        ])
        set({
          runs,
          selectedRunId: runs[0]?.id ?? null,
          artifacts,
          runsState: 'ready',
          artifactsState: 'ready',
        })
        if (runs[0]) await get().selectRun(runs[0].id)
      } catch {
        // Preserve the original dose-response failure as the actionable error.
      }
      set({ runActionState: 'error', error: errorMessage(error) })
      throw error
    }
  },

  replayRun: async runId => {
    set({ runActionState: 'loading', error: null })
    try {
      const result = await scienceApi.replayRun(runId)
      set(state => ({
        runs: [result.run, ...state.runs.filter(run => run.id !== result.run.id)],
        selectedRunId: result.run.id,
        artifacts: [...result.artifacts, ...state.artifacts.filter(artifact => (
          !result.artifacts.some(created => created.id === artifact.id)
        ))],
        runsState: 'ready',
        artifactsState: 'ready',
        runActionState: 'ready',
      }))
      await get().selectRun(result.run.id)
      return result.run
    } catch (error) {
      const projectId = get().selectedProjectId
      if (projectId) {
        try {
          const [runs, artifacts] = await Promise.all([
            scienceApi.listRuns(projectId),
            scienceApi.listArtifacts(projectId),
          ])
          set({
            runs,
            selectedRunId: runs[0]?.id ?? null,
            artifacts,
            runsState: 'ready',
            artifactsState: 'ready',
          })
          if (runs[0]) await get().selectRun(runs[0].id)
        } catch {
          // Preserve the original replay failure as the actionable error.
        }
      }
      set({ runActionState: 'error', error: errorMessage(error) })
      throw error
    }
  },

  reset: () => {
    projectsRequest += 1
    datasetsRequest += 1
    previewRequest += 1
    experimentsRequest += 1
    runsRequest += 1
    eventsRequest += 1
    set(initialState)
  },
}))
