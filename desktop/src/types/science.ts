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
  snapshotPath: string | null
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

export type ScienceExperimentStatus = 'draft' | 'ready'
export type ScienceAssayReadout = 'cck-8' | 'celltiter-glo'
export type ScienceConcentrationUnit = 'nM' | 'µM' | 'mM'
export type SciencePlateWellRole = 'blank' | 'vehicle-control' | 'positive-control' | 'treatment'

export type ScienceCellViabilityProtocol = {
  cellLine: string
  compoundName: string
  readout: ScienceAssayReadout
  treatmentDurationHours: number
  seedingDensityCellsPerWell: number
  concentrationUnit: ScienceConcentrationUnit | null
  concentrations: number[]
  replicateCount: number
  includeBlankControl: boolean
  vehicleControl: {
    name: string
    finalPercent: number
  } | null
  positiveControl: string
}

export type SciencePlateWell = {
  well: string
  role: SciencePlateWellRole
  label: string
  concentration: number | null
  concentrationUnit: ScienceConcentrationUnit | null
  replicate: number
}

export type SciencePlateDesign = {
  plateFormat: 96
  wells: SciencePlateWell[]
}

export type ScienceExperimentIssueCode =
  | 'missing-cell-line'
  | 'missing-compound'
  | 'invalid-duration'
  | 'invalid-seeding-density'
  | 'missing-concentration-unit'
  | 'insufficient-dose-levels'
  | 'invalid-dose'
  | 'duplicate-dose'
  | 'insufficient-replicates'
  | 'missing-blank-control'
  | 'missing-vehicle-control'
  | 'plate-capacity-exceeded'
  | 'invalid-well'
  | 'duplicate-well'
  | 'duplicate-replicate'
  | 'incomplete-layout'
  | 'missing-positive-control'

export type ScienceExperiment = {
  id: string
  projectId: string
  name: string
  objective: string
  assayType: 'cell-viability-dose-response'
  status: ScienceExperimentStatus
  linkedDatasetId: string | null
  linkedDatasetVersionId: string | null
  protocolVersion: {
    id: string
    ordinal: number
    protocol: ScienceCellViabilityProtocol
    createdAt: string
  }
  designVersion: {
    id: string
    ordinal: number
    design: SciencePlateDesign
    createdAt: string
  }
  readiness: {
    blockingCount: number
    warningCount: number
    issues: Array<{
      code: ScienceExperimentIssueCode
      severity: 'blocking' | 'warning'
      message: string
    }>
  }
  createdAt: string
  updatedAt: string
}

export type CreateScienceExperimentInput = {
  projectId: string
  name: string
  objective?: string
  linkedDatasetId?: string | null
  protocol: ScienceCellViabilityProtocol
}

export type ScienceRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'
export type ScienceReproducibilityStatus = 'unchecked' | 'reproducible' | 'failed' | 'stale'
export type ScienceInputCurrentness = 'current' | 'superseded'

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

export type ScienceDoseResponseWarning = {
  code:
    | 'high-replicate-variation'
    | 'limited-response-range'
    | 'weak-model-fit'
    | 'relative-ic50-outside-tested-range'
    | 'implausible-asymptote'
  severity: 'warning' | 'info'
  message: string
  concentrations: number[]
}

export type ScienceDoseResponseSummary = {
  scope: 'full-linked-plate'
  wellColumn: string
  signalColumn: string
  assignedWellCount: number
  ignoredRowCount: number
  blankMeanSignal: number
  blankStandardDeviation: number
  vehicleMeanBlankCorrectedSignal: number
  vehicleStandardDeviation: number
  positiveControlMeanViabilityPercent: number | null
  normalizedWells: Array<{
    well: string
    role: SciencePlateWellRole
    label: string
    concentration: number | null
    replicate: number
    rawSignal: number
    blankCorrectedSignal: number
    normalizedViabilityPercent: number
  }>
  points: Array<{
    concentration: number
    replicateCount: number
    meanViabilityPercent: number
    standardDeviation: number
    coefficientOfVariationPercent: number | null
  }>
  fit: {
    model: '4pl'
    top: number
    bottom: number
    relativeIc50: number
    hillSlope: number
    rSquared: number
    rmse: number
    testedRangePosition: 'within-range' | 'below-range' | 'above-range'
    reviewStatus: 'acceptable' | 'review-required'
    curve: Array<{ concentration: number; viabilityPercent: number }>
  }
  warnings: ScienceDoseResponseWarning[]
}

export type ScienceAnalysisRun = {
  id: string
  projectId: string
  datasetId: string
  datasetVersionId: string
  datasetVersionOrdinal: number
  inputCurrentness: ScienceInputCurrentness
  experimentId: string | null
  parentRunId: string | null
  recipe: 'table-quality-v1' | 'cell-viability-dose-response-v1'
  status: ScienceRunStatus
  reproducibilityStatus: ScienceReproducibilityStatus
  parameters:
    | { maxRows: number }
    | { experimentId: string; wellColumn: string; signalColumn: string }
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
  summary: ScienceQualitySummary | ScienceDoseResponseSummary | null
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
