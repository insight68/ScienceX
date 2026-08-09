export type ScienceProject = {
  id: string
  schemaVersion: number
  name: string
  question: string
  rootDir: string
  createdAt: string
  updatedAt: string
  rootAvailable: boolean
}

export type ScienceDatasetVersion = {
  id: string
  ordinal: number
  sizeBytes: number
  contentHash: string
  modifiedAtMs: number
  createdAt: string
}

export type ScienceDataset = {
  id: string
  projectId: string
  name: string
  canonicalPath: string
  format: 'csv' | 'tsv'
  createdAt: string
  updatedAt: string
  versionCount: number
  currentVersion: ScienceDatasetVersion
}

export type ScienceColumnProfile = {
  name: string
  inferredType: 'boolean' | 'integer' | 'number' | 'datetime' | 'string' | 'empty'
  missingCount: number
  uniqueCount: number
}

export type ScienceDatasetPreview = {
  datasetId: string
  datasetName: string
  format: 'csv' | 'tsv'
  delimiter: ',' | '\t'
  headers: string[]
  columns: ScienceColumnProfile[]
  rows: string[][]
  sampledRowCount: number
  truncated: boolean
  sizeBytes: number
  contentHash: string
  localOnly: true
}

export type ScienceRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'
export type ScienceReproducibilityStatus = 'unchecked' | 'reproducible' | 'failed' | 'stale'

export type ScienceQualityWarning = {
  code: 'sampled-profile' | 'missing-values' | 'empty-column' | 'identifier-candidate'
  severity: 'warning' | 'info'
  message: string
  columns: string[]
}

export type ScienceQualitySummary = {
  scope: 'preview-sample'
  sampledRowCount: number
  columnCount: number
  missingCellCount: number
  missingRate: number
  completeRowCount: number
  numericColumnCount: number
  truncated: boolean
  columns: ScienceColumnProfile[]
  warnings: ScienceQualityWarning[]
}

export type ScienceAnalysisRun = {
  id: string
  projectId: string
  datasetId: string
  datasetVersionId: string
  parentRunId: string | null
  recipe: 'table-quality-v1'
  status: ScienceRunStatus
  reproducibilityStatus: ScienceReproducibilityStatus
  parameters: { maxRows: number }
  environment: {
    runtime: 'bun'
    runtimeVersion: string
    platform: string
    architecture: string
    localOnly: true
  }
  inputHash: string
  recipeHash: string
  eventLogPath: string
  manifestPath: string
  summary: ScienceQualitySummary | null
  errorMessage: string | null
  exitCode: number | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export type ScienceArtifact = {
  id: string
  projectId: string
  producingRunId: string
  kind: 'table' | 'report' | 'other'
  name: string
  relativePath: string
  mimeType: string
  contentHash: string
  sizeBytes: number
  createdAt: string
}

export type ScienceRunEvent = {
  id: string
  runId: string
  type: 'run.created' | 'run.started' | 'artifact.created' | 'run.completed' | 'run.failed' | 'run.interrupted'
  at: string
  data: Record<string, unknown>
}
