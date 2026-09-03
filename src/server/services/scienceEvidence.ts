import { createHash } from 'node:crypto'

export type ScienceEvidenceLevel = 'design' | 'ran' | 'evaluated' | 'externally_verified'
export type ScienceEvidenceVerdict = 'supported' | 'refuted' | 'inconclusive'
export type ScienceClaimCode =
  | 'deterministic-fit-evaluated'
  | 'technical-criteria-met'
  | 'relative-ic50-within-tested-range'
  | 'statistical-significance'
  | 'biological-replication'
  | 'external-verification'
  | 'clinical-efficacy-or-safety'

export type ScienceEvaluationCriterion = {
  id: string
  metric: string
  operator: 'lte' | 'gte' | 'equals' | 'within'
  threshold: number | string | Record<string, number>
}

export type ScienceEvaluationContract = {
  schemaVersion: 1
  id: string
  version: number
  recipe: 'cell-viability-dose-response-v1'
  evidenceLevel: 'evaluated'
  claim: 'technical-interpretability'
  requiredArtifacts: string[]
  criteria: ScienceEvaluationCriterion[]
  limitations: ScienceClaimCode[]
}

export type ScienceEvidenceMetric = {
  criterionId: string
  metric: string
  observed: number | string | Record<string, number>
  passed: boolean
}

export type ScienceEvidence = {
  schemaVersion: 1
  contractId: string
  contractVersion: number
  contractHash: string
  evaluator: {
    id: string
    version: number
    hash: string
  }
  level: ScienceEvidenceLevel
  verdict: ScienceEvidenceVerdict
  evaluatedAt: string
  metrics: ScienceEvidenceMetric[]
  artifactIds: string[]
  failedCriterionIds: string[]
  claimBoundary: {
    canClaim: ScienceClaimCode[]
    cannotClaim: ScienceClaimCode[]
  }
}

export const CELL_VIABILITY_TECHNICAL_THRESHOLDS = {
  maximumReplicateCvPercent: 20,
  minimumResponseRangePercent: 30,
  minimumRSquared: 0.8,
  minimumTopPercent: 70,
  maximumTopPercent: 130,
  minimumBottomPercent: -20,
  maximumBottomPercent: 50,
} as const

export const CELL_VIABILITY_EVALUATION_CONTRACT: ScienceEvaluationContract = {
  schemaVersion: 1,
  id: 'cell-viability-dose-response-technical-v1',
  version: 1,
  recipe: 'cell-viability-dose-response-v1',
  evidenceLevel: 'evaluated',
  claim: 'technical-interpretability',
  requiredArtifacts: [
    'dose-response-report',
    'normalized-wells',
    'dose-response-result',
  ],
  criteria: [
    {
      id: 'replicate-variation',
      metric: 'maximum-replicate-cv-percent',
      operator: 'lte',
      threshold: CELL_VIABILITY_TECHNICAL_THRESHOLDS.maximumReplicateCvPercent,
    },
    {
      id: 'response-range',
      metric: 'treatment-response-range-percent',
      operator: 'gte',
      threshold: CELL_VIABILITY_TECHNICAL_THRESHOLDS.minimumResponseRangePercent,
    },
    {
      id: 'model-fit',
      metric: 'r-squared',
      operator: 'gte',
      threshold: CELL_VIABILITY_TECHNICAL_THRESHOLDS.minimumRSquared,
    },
    {
      id: 'relative-ic50-within-tested-range',
      metric: 'relative-ic50-tested-range-position',
      operator: 'equals',
      threshold: 'within-range',
    },
    {
      id: 'plausible-asymptotes',
      metric: 'four-parameter-logistic-asymptotes-percent',
      operator: 'within',
      threshold: {
        minimumTop: CELL_VIABILITY_TECHNICAL_THRESHOLDS.minimumTopPercent,
        maximumTop: CELL_VIABILITY_TECHNICAL_THRESHOLDS.maximumTopPercent,
        minimumBottom: CELL_VIABILITY_TECHNICAL_THRESHOLDS.minimumBottomPercent,
        maximumBottom: CELL_VIABILITY_TECHNICAL_THRESHOLDS.maximumBottomPercent,
      },
    },
  ],
  limitations: [
    'statistical-significance',
    'biological-replication',
    'external-verification',
    'clinical-efficacy-or-safety',
  ],
}

const CELL_VIABILITY_EVALUATOR_SOURCE =
  'sciencex:cell-viability-dose-response-technical-evaluator:v1:2026-09-03'

function sha256(contents: string): string {
  return createHash('sha256').update(contents).digest('hex')
}

function maximum(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values)
}

function minimum(values: number[]): number {
  return values.length === 0 ? 0 : Math.min(...values)
}

export function scienceEvaluationContractHash(contract: ScienceEvaluationContract): string {
  return sha256(JSON.stringify(contract))
}

export function evaluateCellViabilityEvidence(input: {
  summary: {
    points: Array<{
      meanViabilityPercent: number
      coefficientOfVariationPercent: number | null
    }>
    fit: {
      top: number
      bottom: number
      rSquared: number
      testedRangePosition: 'within-range' | 'below-range' | 'above-range'
    }
  }
  artifactIds: string[]
  evaluatedAt: string
}): ScienceEvidence {
  const pointMeans = input.summary.points.map(point => point.meanViabilityPercent)
  const maximumReplicateCvPercent = maximum(input.summary.points
    .map(point => point.coefficientOfVariationPercent)
    .filter((value): value is number => value !== null))
  const responseRangePercent = maximum(pointMeans) - minimum(pointMeans)
  const { fit } = input.summary
  const thresholds = CELL_VIABILITY_TECHNICAL_THRESHOLDS
  const metrics: ScienceEvidenceMetric[] = [
    {
      criterionId: 'replicate-variation',
      metric: 'maximum-replicate-cv-percent',
      observed: maximumReplicateCvPercent,
      passed: maximumReplicateCvPercent <= thresholds.maximumReplicateCvPercent,
    },
    {
      criterionId: 'response-range',
      metric: 'treatment-response-range-percent',
      observed: responseRangePercent,
      passed: responseRangePercent >= thresholds.minimumResponseRangePercent,
    },
    {
      criterionId: 'model-fit',
      metric: 'r-squared',
      observed: fit.rSquared,
      passed: fit.rSquared >= thresholds.minimumRSquared,
    },
    {
      criterionId: 'relative-ic50-within-tested-range',
      metric: 'relative-ic50-tested-range-position',
      observed: fit.testedRangePosition,
      passed: fit.testedRangePosition === 'within-range',
    },
    {
      criterionId: 'plausible-asymptotes',
      metric: 'four-parameter-logistic-asymptotes-percent',
      observed: { top: fit.top, bottom: fit.bottom },
      passed: fit.top >= thresholds.minimumTopPercent &&
        fit.top <= thresholds.maximumTopPercent &&
        fit.bottom >= thresholds.minimumBottomPercent &&
        fit.bottom <= thresholds.maximumBottomPercent,
    },
  ]
  const failedCriterionIds = metrics.filter(metric => !metric.passed).map(metric => metric.criterionId)
  const supported = failedCriterionIds.length === 0
  const cannotClaim: ScienceClaimCode[] = [
    ...CELL_VIABILITY_EVALUATION_CONTRACT.limitations,
    ...(supported ? [] : ['technical-criteria-met' as const]),
  ]

  return {
    schemaVersion: 1,
    contractId: CELL_VIABILITY_EVALUATION_CONTRACT.id,
    contractVersion: CELL_VIABILITY_EVALUATION_CONTRACT.version,
    contractHash: scienceEvaluationContractHash(CELL_VIABILITY_EVALUATION_CONTRACT),
    evaluator: {
      id: 'cell-viability-dose-response-technical-evaluator',
      version: 1,
      hash: sha256(CELL_VIABILITY_EVALUATOR_SOURCE),
    },
    level: 'evaluated',
    verdict: supported ? 'supported' : 'inconclusive',
    evaluatedAt: input.evaluatedAt,
    metrics,
    artifactIds: [...input.artifactIds],
    failedCriterionIds,
    claimBoundary: {
      canClaim: supported
        ? [
            'deterministic-fit-evaluated',
            'technical-criteria-met',
            'relative-ic50-within-tested-range',
          ]
        : ['deterministic-fit-evaluated'],
      cannotClaim,
    },
  }
}
