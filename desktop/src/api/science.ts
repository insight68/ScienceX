import type {
  ScienceAnalysisRun,
  ScienceArtifact,
  CreateScienceExperimentInput,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceExperiment,
  ScienceProject,
  ScienceRunEvent,
  ScienceExampleDescriptor,
  ScienceExampleReport,
} from '../types/science'
import { api } from './client'

export const scienceApi = {
  async listExamples(locale: string): Promise<ScienceExampleDescriptor[]> {
    const response = await api.get<{ examples: ScienceExampleDescriptor[] }>(`/api/science-examples?locale=${encodeURIComponent(locale)}`)
    return response.examples
  },

  async materializeExample(input: { exampleId: string; parentDir: string; locale: string; includeChallenges: boolean }) {
    return api.post<{ project: ScienceProject; dataset: ScienceDataset; experiment: ScienceExperiment }>(
      `/api/science-examples/${encodeURIComponent(input.exampleId)}/materialize`,
      { parentDir: input.parentDir, locale: input.locale, includeChallenges: input.includeChallenges },
    )
  },

  async exampleReport(projectId: string, locale: string): Promise<ScienceExampleReport> {
    return api.get<ScienceExampleReport>(`/api/research-projects/${encodeURIComponent(projectId)}/example-report?locale=${encodeURIComponent(locale)}`)
  },

  async saveExampleReport(projectId: string, locale: string): Promise<ScienceExampleReport & { savedPath: string }> {
    return api.post<ScienceExampleReport & { savedPath: string }>(`/api/research-projects/${encodeURIComponent(projectId)}/example-report?locale=${encodeURIComponent(locale)}`, {})
  },

  async listProjects(): Promise<ScienceProject[]> {
    const response = await api.get<{ projects: ScienceProject[] }>('/api/research-projects')
    return response.projects
  },

  async createProject(input: {
    name: string
    question?: string
    rootDir: string
  }): Promise<ScienceProject> {
    const response = await api.post<{ project: ScienceProject }>('/api/research-projects', input)
    return response.project
  },

  async listDatasets(projectId: string): Promise<ScienceDataset[]> {
    const response = await api.get<{ datasets: ScienceDataset[] }>(
      `/api/research-projects/${encodeURIComponent(projectId)}/datasets`,
    )
    return response.datasets
  },

  async registerDataset(input: {
    projectId: string
    filePath: string
    name?: string
  }): Promise<{ dataset: ScienceDataset; versionCreated: boolean }> {
    return api.post<{ dataset: ScienceDataset; versionCreated: boolean }>(
      `/api/research-projects/${encodeURIComponent(input.projectId)}/datasets`,
      { filePath: input.filePath, name: input.name },
    )
  },

  async previewDataset(datasetId: string, maxRows = 50): Promise<ScienceDatasetPreview> {
    const response = await api.get<{ preview: ScienceDatasetPreview }>(
      `/api/datasets/${encodeURIComponent(datasetId)}/preview?maxRows=${maxRows}`,
    )
    return response.preview
  },

  async listExperiments(projectId: string): Promise<ScienceExperiment[]> {
    const response = await api.get<{ experiments: ScienceExperiment[] }>(
      `/api/research-projects/${encodeURIComponent(projectId)}/experiments`,
    )
    return response.experiments
  },

  async createExperiment(input: CreateScienceExperimentInput): Promise<ScienceExperiment> {
    const response = await api.post<{ experiment: ScienceExperiment }>(
      `/api/research-projects/${encodeURIComponent(input.projectId)}/experiments`,
      {
        name: input.name,
        objective: input.objective,
        assayType: 'cell-viability-dose-response',
        linkedDatasetId: input.linkedDatasetId,
        sourceReviewId: input.sourceReviewId,
        protocol: input.protocol,
      },
    )
    return response.experiment
  },

  async linkExperimentDataset(input: {
    projectId: string
    experimentId: string
    datasetId: string
  }): Promise<ScienceExperiment> {
    const response = await api.patch<{ experiment: ScienceExperiment }>(
      `/api/research-projects/${encodeURIComponent(input.projectId)}/experiments/${encodeURIComponent(input.experimentId)}`,
      { datasetId: input.datasetId },
    )
    return response.experiment
  },

  async listRuns(projectId: string): Promise<ScienceAnalysisRun[]> {
    const response = await api.get<{ runs: ScienceAnalysisRun[] }>(
      `/api/research-projects/${encodeURIComponent(projectId)}/runs`,
    )
    return response.runs
  },

  async createQualityRun(input: {
    projectId: string
    datasetId: string
    maxRows?: number
  }): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    return api.post<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }>(
      `/api/research-projects/${encodeURIComponent(input.projectId)}/runs`,
      {
        datasetId: input.datasetId,
        recipe: 'table-quality-v1',
        parameters: { maxRows: input.maxRows ?? 100 },
      },
    )
  },

  async createDoseResponseRun(input: {
    projectId: string
    experimentId: string
    wellColumn: string
    signalColumn: string
  }): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    return api.post<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }>(
      `/api/research-projects/${encodeURIComponent(input.projectId)}/experiments/${encodeURIComponent(input.experimentId)}/runs`,
      {
        recipe: 'cell-viability-dose-response-v1',
        parameters: {
          wellColumn: input.wellColumn,
          signalColumn: input.signalColumn,
        },
      },
    )
  },

  async replayRun(runId: string): Promise<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }> {
    return api.post<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }>(
      `/api/runs/${encodeURIComponent(runId)}/replay`,
      {},
    )
  },

  async listArtifacts(projectId: string): Promise<ScienceArtifact[]> {
    const response = await api.get<{ artifacts: ScienceArtifact[] }>(
      `/api/research-projects/${encodeURIComponent(projectId)}/artifacts`,
    )
    return response.artifacts
  },

  async getRunEvents(runId: string): Promise<ScienceRunEvent[]> {
    const response = await api.get<{ events: ScienceRunEvent[] }>(
      `/api/runs/${encodeURIComponent(runId)}/events`,
    )
    return response.events
  },
}
