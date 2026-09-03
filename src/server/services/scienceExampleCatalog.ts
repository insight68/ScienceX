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

export type ScienceExampleScenario = 'success' | 'version-change' | 'missing-well' | 'weak-response'

export function generateCellViabilityExampleCsv(variant: ScienceExampleScenario = 'success'): string {
  const wells = variant === 'missing-well' ? design.wells.filter(well => well.well !== 'A4') : design.wells
  const rows = wells.map(well => {
    let viability = exampleViabilityPercent(well)
    if (well.role === 'treatment' && variant === 'version-change') {
      viability = 100 / (1 + (((well.concentration ?? 0) / 3) ** 1.2))
    }
    if (well.role === 'treatment' && variant === 'weak-response') viability = 85 + viability * 0.05
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
  const doses = protocol.concentrations.join(', ')
  const zhSteps = `\n## 演示顺序\n\n1. 查看研究问题、实验蓝图和 96 孔板中已分配的 24 孔。\n2. 查看 well / signal 列，运行 4PL 分析，检查相对 IC50、曲线和技术证据。\n3. 查看报告、归一化 CSV、结果 JSON 与运行事件。\n4. 重放为新运行，核对父运行、输入版本与一致性。\n5. 若创建时包含答辩对照，可点击“运行完整演示”：依次执行正常分析与重放、数据更新场景与重放、缺孔拦截、证据不足。每次点击都会产生真实新 Run。\n6. 保存演示记录；按需要打开 AI 审阅，检查提示词后主动发送。\n\n## 协议与输入\n\nHepG2 / 虚构 SX-101 / CCK-8 OD450 / 48 h / 4000 cells per well。浓度：${doses} µM，每组 3 个技术复孔；空白、DMSO 0.1% 与 Staurosporine 对照。A–C 行对应技术复孔，1–3 列为对照，4–8 列为处理组。data 下的各场景相互独立。\n\n## 预期与反例\n\n- 正常：模拟相对 IC50 约 1 µM（允许误差 0.2）、Hill slope 约 1.2、R² > 0.99；3 个产物。\n- 数据更新：先登记 V1 并锁定实验，再写入模拟 IC50 为 3 µM 的 V2。分析仍使用 V1，结果约 1 µM，重放一致。不要重新关联实验，否则会更改锁定输入。\n- 缺孔：CSV 删除 A4，完整板图保留；预期生成 failed Run，无成功产物。\n- 证据不足：处理响应约 85–90%，动态范围不足；预期 completed 但技术证据 inconclusive。\n\n## 答辩讲述\n\n研究问题 → 版本化设计 → 数据快照 → 确定性计算 → 证据边界 → 结果重放。技术复孔不是独立生物学重复；R² 高不是药效证据；本项目技术判据不是行业统一标准。输入和结果一致性检查不等于完整历史环境重建。\n\n## 量化与 AI\n\n演示记录从真实 Run 提取耗时、参数误差、状态和产物哈希。耗时不代表相对人工流程的提升，人工对照表需另行实测。AI 用于证据解释和下一步设计建议；打开会话仅填入提示词，发送才会调用所选模型。保存真实回复并核对引用，不能把提示词准备完成当作 AI 验证通过。\n\n## 重新演示与失败恢复\n\n重新开始请选择父目录创建新副本，已有目录不会被覆盖。创建失败时部分文件会保留并标记 provisioning-failed.json，正常情况下项目登记会撤销；重试会使用新目录。若错误提示登记清理失败，请先检查该部分项目。\n`
  const enSteps = `\n## Demonstration\n\n1. Inspect the research question, protocol and 24 assigned wells on the 96-well plate.\n2. Inspect well / signal, run 4PL, and review the curve, relative IC50 and technical evidence.\n3. Inspect the report, normalized CSV, JSON, and run events.\n4. Replay as a new run and compare inputs and results.\n5. With optional defense challenges, “Run complete demonstration” runs the success case and replay, changed-data case and replay, missing-well case, and weak-response case. Each click creates actual new Runs.\n6. Save evidence in the project and optionally open AI review, inspect the prompt, then send it yourself.\n\n## Protocol\n\nHepG2 / fictional SX-101 / CCK-8 OD450 / 48 h / 4000 cells per well. Doses: ${doses} µM. Three technical replicates, blank, DMSO 0.1%, and Staurosporine controls. Rows A–C are replicates; columns 1–3 are controls and 4–8 treatments. Each scenario under data is independent.\n\n## Expected outcomes\n\n- Success: simulated relative IC50 ≈ 1 µM (tolerance 0.2), Hill slope ≈ 1.2, R² > 0.99, three artifacts.\n- Changed data: the experiment pins V1 before V2 (simulated IC50 3 µM) is registered. Analysis still returns ≈ 1 µM and replay agrees. Do not relink the experiment during this demonstration.\n- Missing well: A4 is removed from the CSV, not the design. A failed Run and no successful artifacts are expected.\n- Weak response: responses span approximately 85–90%; execution completes but technical evidence is inconclusive.\n\n## Presentation and boundaries\n\nQuestion → versioned design → data snapshot → deterministic computation → bounded evidence → replay. Technical replicates are not independent biological replicates. High R² is not efficacy evidence. These technical criteria are product rules, not a universal scientific standard. Replay comparison does not reconstruct every historical environment.\n\n## Measurement and AI\n\nThe saved report derives elapsed execution, parameter error, statuses and hashes from actual Runs. It does not establish a human productivity improvement; fill the human comparison separately. AI explains evidence and suggests follow-up design. Opening review only prefills a prompt; sending invokes the selected model. Preserve the real response and check its references. Prompt preparation is not completed AI validation.\n\n## Retry\n\nCreate a new copy to start again; existing directories are never overwritten. Partial failed provisioning is retained with provisioning-failed.json, and its project registration is normally removed. A retry reserves a new directory. If registration cleanup failed, inspect the partial project first.\n`
  return {
    zh: `# ${CELL_VIABILITY_EXAMPLE.localized.zh.title}\n\n` +
      `${CELL_VIABILITY_EXAMPLE.localized.zh.summary}\n\n` +
      `> 模拟数据 · 教学用途。本案例不能证明真实化合物药效，也不替代湿实验、生物学重复或统计审阅。\n${zhSteps}`,
    en: `# ${CELL_VIABILITY_EXAMPLE.localized.en.title}\n\n` +
      `${CELL_VIABILITY_EXAMPLE.localized.en.summary}\n\n` +
      `> Simulated data for teaching. This case does not establish real compound efficacy and does not replace wet-lab execution, biological replication, or statistical review.\n${enSteps}`,
  }
}
