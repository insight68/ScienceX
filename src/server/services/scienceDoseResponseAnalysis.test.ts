import { describe, expect, it } from 'bun:test'
import {
  analyzeCellViabilityDoseResponse,
  ScienceDoseResponseAnalysisError,
} from './scienceDoseResponseAnalysis.js'
import type {
  ScienceCellViabilityProtocol,
  SciencePlateDesign,
  SciencePlateWellRole,
} from './scienceExperimentService.js'

const concentrations = [0.01, 0.1, 1, 10, 100]
const protocol: ScienceCellViabilityProtocol = {
  cellLine: 'HepG2',
  compoundName: 'SX-101',
  readout: 'cck-8',
  treatmentDurationHours: 48,
  seedingDensityCellsPerWell: 4000,
  concentrationUnit: 'µM',
  concentrations,
  replicateCount: 3,
  includeBlankControl: true,
  vehicleControl: { name: 'DMSO', finalPercent: 0.1 },
  positiveControl: 'Staurosporine',
}

function design(): SciencePlateDesign {
  const groups: Array<{ role: SciencePlateWellRole; label: string; concentration: number | null }> = [
    { role: 'blank', label: 'Blank', concentration: null },
    { role: 'vehicle-control', label: 'DMSO', concentration: null },
    { role: 'positive-control', label: 'Staurosporine', concentration: null },
    ...concentrations.map(concentration => ({
      role: 'treatment' as const,
      label: `SX-101 · ${concentration} µM`,
      concentration,
    })),
  ]
  return {
    plateFormat: 96,
    wells: groups.flatMap((group, columnIndex) => [0, 1, 2].map(replicateIndex => ({
      well: `${'ABC'[replicateIndex]}${columnIndex + 1}`,
      role: group.role,
      label: group.label,
      concentration: group.concentration,
      concentrationUnit: group.concentration === null ? null : 'µM',
      replicate: replicateIndex + 1,
    }))),
  }
}

function rows(plate: SciencePlateDesign): string[][] {
  return plate.wells.map(well => {
    const viability = well.role === 'blank'
      ? 0
      : well.role === 'vehicle-control'
        ? 100
        : well.role === 'positive-control'
          ? 8
          : 100 / (1 + (well.concentration! ** 1.2))
    const replicateOffset = (well.replicate - 2) * 0.4
    return [well.well, String(10 + viability + replicateOffset)]
  })
}

describe('cell viability dose-response analysis', () => {
  it('maps the plate, normalizes every assigned well, and recovers a deterministic 4PL fit', () => {
    const plate = design()
    const summary = analyzeCellViabilityDoseResponse({
      protocol,
      design: plate,
      headers: ['well', 'signal'],
      rows: [...rows(plate), ['H12', '42']],
      wellColumn: 'well',
      signalColumn: 'signal',
    })

    expect(summary.scope).toBe('full-linked-plate')
    expect(summary.assignedWellCount).toBe(24)
    expect(summary.ignoredRowCount).toBe(1)
    expect(summary.blankMeanSignal).toBeCloseTo(10, 5)
    expect(summary.vehicleMeanBlankCorrectedSignal).toBeCloseTo(100, 5)
    expect(summary.points).toHaveLength(5)
    expect(summary.fit.relativeIc50).toBeCloseTo(1, 1)
    expect(summary.fit.hillSlope).toBeCloseTo(1.2, 1)
    expect(summary.fit.rSquared).toBeGreaterThan(0.99)
    expect(summary.fit.testedRangePosition).toBe('within-range')
    expect(summary.fit.curve).toHaveLength(81)
    expect(summary.positiveControlMeanViabilityPercent).toBeCloseTo(8, 1)
  })

  it('fails closed when an assigned well is missing or duplicated', () => {
    const plate = design()
    const inputRows = rows(plate)
    expect(() => analyzeCellViabilityDoseResponse({
      protocol,
      design: plate,
      headers: ['well', 'signal'],
      rows: inputRows.slice(1),
      wellColumn: 'well',
      signalColumn: 'signal',
    })).toThrow(ScienceDoseResponseAnalysisError)
    expect(() => analyzeCellViabilityDoseResponse({
      protocol,
      design: plate,
      headers: ['well', 'signal'],
      rows: [...inputRows, inputRows[0]],
      wellColumn: 'well',
      signalColumn: 'signal',
    })).toThrow('Duplicate well row')
  })

  it('rejects a non-positive vehicle baseline after blank correction', () => {
    const plate = design()
    const invalidRows = rows(plate).map(row => (
      row[0].endsWith('2') ? [row[0], '9'] : row
    ))
    expect(() => analyzeCellViabilityDoseResponse({
      protocol,
      design: plate,
      headers: ['well', 'signal'],
      rows: invalidRows,
      wellColumn: 'well',
      signalColumn: 'signal',
    })).toThrow('Vehicle signal must remain positive after blank correction')
  })
})
