export type ScienceExecutionSource = 'measured' | 'simulated' | 'unknown'

export type ScienceExecutionInput = {
  name: string
  experimentId?: string | null
  performedBy: string
  performedAt: string
  sourceType: ScienceExecutionSource
  sampleBatch: string
  instrument: string
  actualConditions: string
  deviations: string
  biologicalReplicateId: string
}

export type ScienceExecutionDataset = {
  datasetId: string
  datasetVersionId: string
  name: string
  ordinal: number
  contentHash: string
}

export type ScienceExecution = ScienceExecutionInput & {
  id: string
  projectId: string
  experimentId: string | null
  protocolVersionId: string | null
  designVersionId: string | null
  createdAt: string
  datasets: ScienceExecutionDataset[]
}

export type ScienceReviewInput = {
  runId: string
  reviewer: string
  decision: 'accept' | 'revise' | 'repeat'
  rationale: string
  nextStep: string
  supersedesReviewId?: string | null
}

export type ScienceReview = ScienceReviewInput & {
  id: string
  projectId: string
  inputHash: string
  recipeHash: string
  reviewedContentHash: string
  createdAt: string
}
