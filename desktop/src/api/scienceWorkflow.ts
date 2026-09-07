import { api } from './client'
import type { ScienceExecution, ScienceExecutionInput, ScienceReview, ScienceReviewInput } from '../../../src/server/services/scienceWorkflowTypes'
import type { ScienceAnalysisRun, ScienceArtifact, ScienceDatasetPreview } from '../types/science'
export type { ScienceExecution, ScienceExecutionInput, ScienceReview, ScienceReviewInput }

const projectPath = (id: string) => `/api/research-projects/${encodeURIComponent(id)}`
export const scienceWorkflowApi = {
  async listExecutions(projectId: string) {
    return (await api.get<{ executions: ScienceExecution[] }>(`${projectPath(projectId)}/executions`)).executions
  },
  async createExecution(projectId: string, input: ScienceExecutionInput) {
    return (await api.post<{ execution: ScienceExecution }>(`${projectPath(projectId)}/executions`, input)).execution
  },
  async bindDataset(projectId: string, executionId: string, datasetId: string, versionId: string) {
    return (await api.post<{ execution: ScienceExecution }>(`${projectPath(projectId)}/executions/${encodeURIComponent(executionId)}/datasets`, { datasetId, versionId })).execution
  },
  async previewVersion(projectId: string, datasetId: string, versionId: string) {
    return (await api.get<{ preview: ScienceDatasetPreview }>(`${projectPath(projectId)}/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/preview`)).preview
  },
  async analyze(projectId: string, input: { executionId: string; datasetId: string; datasetVersionId: string; experimentId?: string | null; wellColumn: string; signalColumn: string }) {
    const { experimentId, wellColumn, signalColumn, ...binding } = input
    return api.post<{ run: ScienceAnalysisRun; artifacts: ScienceArtifact[] }>(
      `${projectPath(projectId)}${experimentId ? `/experiments/${encodeURIComponent(experimentId)}` : ''}/runs`,
      {
        ...binding, recipe: experimentId ? 'cell-viability-dose-response-v1' : 'table-quality-v1',
        parameters: experimentId ? { wellColumn, signalColumn } : { maxRows: 100 }
      },
    )
  },
  async listReviews(projectId: string, runId: string) {
    return (await api.get<{ reviews: ScienceReview[] }>(`${projectPath(projectId)}/reviews?runId=${encodeURIComponent(runId)}`)).reviews
  },
  async createReview(projectId: string, input: ScienceReviewInput) {
    return (await api.post<{ review: ScienceReview }>(`${projectPath(projectId)}/reviews`, input)).review
  },
}
