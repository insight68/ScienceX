import {
  generateSciencePlateDesign,
  type ScienceCellViabilityProtocol,
  type SciencePlateDesign,
} from './scienceExperimentService.js'

export type ScienceExampleLocale = 'en' | 'zh'

export type ScienceExampleManifest = {
  schemaVersion: 1
  id: 'cell-viability-dose-response-v1'
  templateVersion: 1
  assayType: 'cell-viability-dose-response'
  localOnly: true
  simulatedData: true
  estimatedMinutes: number
  localized: Record<ScienceExampleLocale, {
    title: string
    summary: string
    researchQuestion: string
    experimentName: string
    experimentObjective: string
  }>
  source: {
    kind: 'deterministic-generator'
    generatorId: string
    sourceNote: string
    licenseNote: string
  }
  dataset: {
    fileName: 'plate-reader.csv'
    format: 'csv'
    columns: ['well', 'signal']
    generatorId: string
    contentHash: string
  }
  guides: Array<{
    locale: ScienceExampleLocale
    fileName: string
  }>
  protocol: ScienceCellViabilityProtocol
  design: SciencePlateDesign
  expected: {
    assignedWellCount: 24
    ignoredRowCount: 0
    relativeIc50: { approximately: 1; tolerance: 0.2 }
    minimumRSquared: 0.99
    testedRangePosition: 'within-range'
    artifactCount: 3
  }
}

const protocol: ScienceCellViabilityProtocol = {
  cellLine: 'HepG2',
  compoundName: 'SX-101',
  readout: 'cck-8',
  treatmentDurationHours: 48,
  seedingDensityCellsPerWell: 4000,
  concentrationUnit: 'µM',
  concentrations: [0.01, 0.1, 1, 10, 100],
  replicateCount: 3,
  includeBlankControl: true,
  vehicleControl: { name: 'DMSO', finalPercent: 0.1 },
  positiveControl: 'Staurosporine',
}

const design = generateSciencePlateDesign(protocol)
const GENERATOR_ID = 'sciencex:cell-viability-dose-response-example:v1'

function trimFixed(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '')
}

function exampleViabilityPercent(well: SciencePlateDesign['wells'][number]): number {
  if (well.role === 'blank') return 0
  if (well.role === 'vehicle-control') return 100
  if (well.role === 'positive-control') return 8
  return 100 / (1 + ((well.concentration ?? 0) ** 1.2))
}

export function generateCellViabilityExampleCsv(): string {
  const rows = design.wells.map(well => {
    const viability = exampleViabilityPercent(well)
    const replicateDirection = well.replicate - 2
    const variation = well.role === 'treatment'
      ? viability * replicateDirection * 0.004
      : replicateDirection * 0.4
    return `${well.well},${trimFixed(10 + viability + variation)}`
  })
  return `well,signal\n${rows.join('\n')}\n`
}

export const CELL_VIABILITY_EXAMPLE: ScienceExampleManifest = {
  schemaVersion: 1,
  id: 'cell-viability-dose-response-v1',
  templateVersion: 1,
  assayType: 'cell-viability-dose-response',
  localOnly: true,
  simulatedData: true,
  estimatedMinutes: 3,
  localized: {
    en: {
      title: 'SX-101 and HepG2 viability (simulated)',
      summary: 'A local teaching case for a deterministic CCK-8 dose-response workflow.',
      researchQuestion: 'In a simulated CCK-8 assay, does SX-101 reduce HepG2 relative viability as concentration increases, with the relative IC50 inside the tested range?',
      experimentName: 'SX-101 · HepG2 · 48 h (simulated)',
      experimentObjective: 'Estimate a technically reviewable relative IC50 from a versioned plate design.',
    },
    zh: {
      title: 'SX-101 对 HepG2 细胞活力的影响（模拟）',
      summary: '用于学习确定性 CCK-8 剂量反应流程的本地教学案例。',
      researchQuestion: '在模拟的 CCK-8 实验条件下，SX-101 是否随浓度升高降低 HepG2 细胞的相对活力，其相对 IC50 是否位于已测试浓度范围内？',
      experimentName: 'SX-101 · HepG2 · 48 小时（模拟）',
      experimentObjective: '基于带版本的板图估算可进行技术审阅的相对 IC50。',
    },
  },
  source: {
    kind: 'deterministic-generator',
    generatorId: GENERATOR_ID,
    sourceNote: 'Synthetic plate-reader values generated locally for teaching; not observational or wet-lab data.',
    licenseNote: 'Generated as part of the ScienceX teaching fixture; no external dataset is bundled.',
  },
  dataset: {
    fileName: 'plate-reader.csv',
    format: 'csv',
    columns: ['well', 'signal'],
    generatorId: GENERATOR_ID,
    contentHash: '54460ad6550df4eace67cb2da0465971da2f3261b76b59fb37b04f323b99f89d',
  },
  guides: [
    { locale: 'zh', fileName: 'README.zh-CN.md' },
    { locale: 'en', fileName: 'README.en.md' },
  ],
  protocol,
  design,
  expected: {
    assignedWellCount: 24,
    ignoredRowCount: 0,
    relativeIc50: { approximately: 1, tolerance: 0.2 },
    minimumRSquared: 0.99,
    testedRangePosition: 'within-range',
    artifactCount: 3,
  },
}

export function generateCellViabilityExampleGuides(): Record<ScienceExampleLocale, string> {
  return {
    zh: `# ${CELL_VIABILITY_EXAMPLE.localized.zh.title}\n\n` +
      `${CELL_VIABILITY_EXAMPLE.localized.zh.summary}\n\n` +
      `> 模拟数据 · 教学用途。本案例不能证明真实化合物药效，也不替代湿实验、生物学重复或统计审阅。\n`,
    en: `# ${CELL_VIABILITY_EXAMPLE.localized.en.title}\n\n` +
      `${CELL_VIABILITY_EXAMPLE.localized.en.summary}\n\n` +
      `> Simulated data for teaching. This case does not establish real compound efficacy and does not replace wet-lab execution, biological replication, or statistical review.\n`,
  }
}
