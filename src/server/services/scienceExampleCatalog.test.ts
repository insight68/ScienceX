import { createHash } from 'node:crypto'
import { describe, expect, it } from 'bun:test'
import { analyzeCellViabilityDoseResponse } from './scienceDoseResponseAnalysis.js'
import { validateScienceExperimentDesign } from './scienceExperimentService.js'
import {
  CELL_VIABILITY_EXAMPLE,
  generateCellViabilityExampleCsv,
} from './scienceExampleCatalog.js'

describe('Science example catalog', () => {
  it('defines one deterministic, execution-ready offline teaching case', () => {
    const first = generateCellViabilityExampleCsv()
    const second = generateCellViabilityExampleCsv()
    const lines = first.trimEnd().split('\n')
    const rows = lines.slice(1).map(line => line.split(','))

    expect(first).toBe(second)
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      CELL_VIABILITY_EXAMPLE.dataset.contentHash,
    )
    expect(CELL_VIABILITY_EXAMPLE).toMatchObject({
      schemaVersion: 1,
      id: 'cell-viability-dose-response-v1',
      templateVersion: 1,
      assayType: 'cell-viability-dose-response',
      localOnly: true,
      simulatedData: true,
    })
    expect(lines[0]).toBe('well,signal')
    expect(rows).toHaveLength(24)
    expect(rows.map(row => row[0])).toEqual(
      CELL_VIABILITY_EXAMPLE.design.wells.map(well => well.well),
    )
    expect(validateScienceExperimentDesign(
      CELL_VIABILITY_EXAMPLE.protocol,
      CELL_VIABILITY_EXAMPLE.design,
    )).toEqual({ blockingCount: 0, warningCount: 0, issues: [] })

    const summary = analyzeCellViabilityDoseResponse({
      protocol: CELL_VIABILITY_EXAMPLE.protocol,
      design: CELL_VIABILITY_EXAMPLE.design,
      headers: ['well', 'signal'],
      rows,
      wellColumn: 'well',
      signalColumn: 'signal',
    })
    expect(summary.assignedWellCount).toBe(24)
    expect(summary.blankMeanSignal).toBeCloseTo(10, 6)
    expect(summary.vehicleMeanBlankCorrectedSignal).toBeCloseTo(100, 6)
    expect(summary.fit.relativeIc50).toBeCloseTo(1, 1)
    expect(summary.fit.rSquared).toBeGreaterThan(0.99)
    expect(summary.fit.testedRangePosition).toBe('within-range')
  })
})
