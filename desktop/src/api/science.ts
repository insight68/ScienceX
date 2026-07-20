import type {
  ScienceAnalysisRun,
  ScienceArtifact,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceProject,
  ScienceRunEvent,
} from '../types/science'
import { api } from './client'

export const scienceApi = {
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
