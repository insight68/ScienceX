import { describe, expect, it } from 'bun:test'
import type { ScienceDoseResponseSummary } from './scienceDoseResponseAnalysis.js'
import {
  CELL_VIABILITY_EVALUATION_CONTRACT,
  evaluateCellViabilityEvidence,
} from './scienceEvidence.js'

function doseResponseSummary(): ScienceDoseResponseSummary {
  return {
    scope: 'full-linked-plate',
    wellColumn: 'well',
    signalColumn: 'signal',
    assignedWellCount: 24,
    ignoredRowCount: 0,
    blankMeanSignal: 10,
    blankStandardDeviation: 0.4,
    vehicleMeanBlankCorrectedSignal: 100,
    vehicleStandardDeviation: 0.4,
    positiveControlMeanViabilityPercent: 8,
    normalizedWells: [],
    points: [
      { concentration: 0.01, replicateCount: 3, meanViabilityPercent: 99, standardDeviation: 1, coefficientOfVariationPercent: 1.01 },
      { concentration: 0.1, replicateCount: 3, meanViabilityPercent: 91, standardDeviation: 1.2, coefficientOfVariationPercent: 1.32 },
      { concentration: 1, replicateCount: 3, meanViabilityPercent: 50, standardDeviation: 1.5, coefficientOfVariationPercent: 3 },
      { concentration: 10, replicateCount: 3, meanViabilityPercent: 9, standardDeviation: 0.9, coefficientOfVariationPercent: 10 },
    ],
    fit: {
      model: '4pl',
      top: 100,
      bottom: 0,
      relativeIc50: 1,
      hillSlope: 1.2,
      rSquared: 0.998,
      rmse: 0.6,
      testedRangePosition: 'within-range',
      reviewStatus: 'acceptable',
      curve: [],
    },
    warnings: [],
  }
}

describe('Science evidence evaluation', () => {
  it('turns an acceptable dose-response result into evaluated, bounded evidence', () => {
    const evidence = evaluateCellViabilityEvidence({
      summary: doseResponseSummary(),
      artifactIds: ['report-1', 'table-1', 'result-1'],
      evaluatedAt: '2026-09-03T08:00:00.000Z',
    })

    expect(CELL_VIABILITY_EVALUATION_CONTRACT).toMatchObject({
      schemaVersion: 1,
      id: 'cell-viability-dose-response-technical-v1',
      version: 1,
      recipe: 'cell-viability-dose-response-v1',
      evidenceLevel: 'evaluated',
    })
    expect(evidence).toMatchObject({
      schemaVersion: 1,
      contractId: CELL_VIABILITY_EVALUATION_CONTRACT.id,
      contractVersion: 1,
      level: 'evaluated',
      verdict: 'supported',
      artifactIds: ['report-1', 'table-1', 'result-1'],
      failedCriterionIds: [],
      claimBoundary: {
        canClaim: [
          'deterministic-fit-evaluated',
          'technical-criteria-met',
          'relative-ic50-within-tested-range',
        ],
      },
    })
    expect(evidence.contractHash).toHaveLength(64)
    expect(evidence.evaluator.hash).toHaveLength(64)
    expect(evidence.metrics).toHaveLength(CELL_VIABILITY_EVALUATION_CONTRACT.criteria.length)
    expect(evidence.metrics.every(metric => metric.passed)).toBe(true)
  })

  it('keeps a completed but weak fit as inconclusive evidence', () => {
    const summary = doseResponseSummary()
    summary.fit.rSquared = 0.61
    summary.fit.testedRangePosition = 'above-range'
    summary.fit.reviewStatus = 'review-required'

    const evidence = evaluateCellViabilityEvidence({
      summary,
      artifactIds: [],
      evaluatedAt: '2026-09-03T08:00:00.000Z',
    })

    expect(evidence.verdict).toBe('inconclusive')
    expect(evidence.failedCriterionIds).toEqual([
      'model-fit',
      'relative-ic50-within-tested-range',
    ])
    expect(evidence.claimBoundary.canClaim).toEqual(['deterministic-fit-evaluated'])
    expect(evidence.claimBoundary.cannotClaim).toContain('technical-criteria-met')
  })
})
