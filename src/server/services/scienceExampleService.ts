import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'
import { isAllowedFilesystemPath } from '../api/filesystem.js'
import { ApiError } from '../middleware/errorHandler.js'
import { scienceAnalysisService } from './scienceAnalysisService.js'
import { scienceExperimentService } from './scienceExperimentService.js'
import { scienceWorkspaceService } from './scienceWorkspaceService.js'
import {
  CELL_VIABILITY_EXAMPLE,
  generateCellViabilityExampleCsv,
  generateCellViabilityExampleGuides,
  type ScienceExampleLocale,
  type ScienceExampleScenario,
} from './scienceExampleCatalog.js'
import type { ScienceExampleMetadata } from './scienceExampleMetadata.js'

export function scienceExampleLocale(locale?: string): ScienceExampleLocale {
  return locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const titles: Record<ScienceExampleLocale, Record<ScienceExampleScenario, string>> = {
  zh: { success: '正常剂量反应', 'version-change': '数据更新与旧版本重放', 'missing-well': '缺孔拦截', 'weak-response': '证据不足' },
  en: { success: 'Dose-response analysis', 'version-change': 'Changed data and pinned replay', 'missing-well': 'Missing well rejection', 'weak-response': 'Inconclusive evidence' },
}

export function listScienceExamples(locale?: string) {
  const localized = CELL_VIABILITY_EXAMPLE.localized[scienceExampleLocale(locale)]
  return [{
    id: CELL_VIABILITY_EXAMPLE.id,
    templateVersion: CELL_VIABILITY_EXAMPLE.templateVersion,
    ...localized,
    assayType: CELL_VIABILITY_EXAMPLE.assayType,
    localOnly: true,
    simulatedData: true,
    estimatedMinutes: CELL_VIABILITY_EXAMPLE.estimatedMinutes,
  }]
}

async function reserveExampleDirectory(parentDir: string): Promise<string> {
  if (!isAllowedFilesystemPath(parentDir)) throw new ApiError(403, 'Example parent is outside allowed directories')
  let canonicalParent: string
  try {
    canonicalParent = await fs.realpath(parentDir)
  } catch {
    throw ApiError.badRequest('Choose an existing parent directory')
  }
  if (!isAllowedFilesystemPath(canonicalParent)) throw new ApiError(403, 'Example parent resolves outside allowed directories')
  if (!(await fs.stat(canonicalParent)).isDirectory()) throw ApiError.badRequest('Example parent must be a directory')
  await fs.access(canonicalParent, fs.constants.W_OK)
  for (let ordinal = 1; ordinal <= 1000; ordinal += 1) {
    const rootDir = path.join(canonicalParent, `sciencex-cell-viability-demo${ordinal === 1 ? '' : `-${ordinal}`}`)
    try {
      await fs.mkdir(rootDir, { mode: 0o700 })
      return rootDir
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  throw ApiError.conflict('Choose another parent directory; too many example copies already exist')
}

export async function materializeScienceExample(input: {
  exampleId: string
  parentDir: string
  locale?: string
  includeChallenges?: boolean
}) {
  if (input.exampleId !== CELL_VIABILITY_EXAMPLE.id) throw ApiError.notFound('Unknown ScienceX example')
  const locale = scienceExampleLocale(input.locale)
  const localized = CELL_VIABILITY_EXAMPLE.localized[locale]
  const rootDir = await reserveExampleDirectory(input.parentDir)
  let projectId: string | undefined
  try {
    const project = await scienceWorkspaceService.createProject({
      rootDir,
      name: localized.title,
      question: localized.researchQuestion,
    })
    projectId = project.id
    const guides = generateCellViabilityExampleGuides()
    await Promise.all([
      fs.writeFile(path.join(rootDir, 'README.zh-CN.md'), guides.zh, { flag: 'wx' }),
      fs.writeFile(path.join(rootDir, 'README.en.md'), guides.en, { flag: 'wx' }),
    ])
    const scenarioIds: ScienceExampleScenario[] = input.includeChallenges
      ? ['success', 'version-change', 'missing-well', 'weak-response']
      : ['success']
    const scenarios: ScienceExampleMetadata['scenarios'] = []
    for (const id of scenarioIds) {
      const directory = path.join(rootDir, 'data', id)
      await fs.mkdir(directory, { recursive: true, mode: 0o700 })
      const filePath = path.join(directory, 'plate-reader.csv')
      await fs.writeFile(filePath, generateCellViabilityExampleCsv(id === 'version-change' ? 'success' : id), { flag: 'wx' })
      const { dataset } = await scienceWorkspaceService.registerDataset({ projectId, filePath, name: titles[locale][id] })
      const experiment = await scienceExperimentService.createExperiment({
        projectId,
        name: `${titles[locale][id]} · SX-101 / HepG2`,
        objective: localized.experimentObjective,
        assayType: CELL_VIABILITY_EXAMPLE.assayType,
        linkedDatasetId: dataset.id,
        protocol: CELL_VIABILITY_EXAMPLE.protocol,
        design: CELL_VIABILITY_EXAMPLE.design,
      })
      scenarios.push({ id, datasetId: dataset.id, datasetVersionId: dataset.currentVersion.id, experimentId: experiment.id })
      if (id === 'version-change') {
        // Only this newly created scenario's source is changed. The experiment
        // keeps V1, while re-registration preserves both immutable snapshots.
        await fs.writeFile(filePath, generateCellViabilityExampleCsv('version-change'))
        await scienceWorkspaceService.registerDataset({ projectId, filePath, name: titles[locale][id] })
      }
    }
    const example: ScienceExampleMetadata = {
      schemaVersion: 1,
      exampleId: CELL_VIABILITY_EXAMPLE.id,
      templateVersion: 1,
      simulatedData: true,
      locale,
      materializedAt: new Date().toISOString(),
      projectId,
      scenarios,
    }
    await fs.writeFile(path.join(rootDir, '.sciencex', 'example.json'), `${JSON.stringify(example, null, 2)}\n`, { flag: 'wx' })
    return {
      project: await scienceWorkspaceService.getProject(projectId),
      dataset: await scienceWorkspaceService.getDatasetVersion({ projectId, datasetId: scenarios[0].datasetId }),
      experiment: await scienceExperimentService.getExperiment(projectId, scenarios[0].experimentId),
    }
  } catch (error) {
    // Preserve partial files for inspection; never recursively delete a directory
    // that another actor may have populated while provisioning was in flight.
    let unregistered = !projectId
    if (projectId) {
      await scienceWorkspaceService.unregisterFailedExample(projectId, rootDir)
        .then(() => { unregistered = true })
        .catch(() => undefined)
    }
    const message = error instanceof Error ? error.message : String(error)
    await fs.writeFile(path.join(rootDir, 'provisioning-failed.json'), JSON.stringify({
      schemaVersion: 1, status: 'provisioning-failed', unregistered, message,
    }, null, 2), { flag: 'wx' }).catch(() => undefined)
    throw ApiError.internal(`Example creation failed: ${message}. Partial files preserved at ${rootDir}. ${unregistered ? 'Retry creates a new copy.' : 'Project registration cleanup failed; inspect the partial project before retrying.'}`)
  }
}

export async function scienceExampleReport(projectId: string, requestedLocale?: string) {
  const project = await scienceWorkspaceService.getProject(projectId)
  const example = project.example
  if (!example) throw ApiError.notFound('This project has no supported example marker')
  const locale = scienceExampleLocale(requestedLocale ?? example.locale)
  const zh = locale === 'zh'
  const [runs, artifacts, experiments, datasets] = await Promise.all([
    scienceAnalysisService.listRuns(projectId),
    scienceAnalysisService.listArtifacts(projectId),
    scienceExperimentService.listExperiments(projectId),
    scienceWorkspaceService.listDatasets(projectId),
  ])
  const checks = example.scenarios.map(scenario => {
    const experiment = experiments.find(item => item.id === scenario.experimentId)
    const dataset = datasets.find(item => item.id === scenario.datasetId)
    const linked = experiment?.linkedDatasetId === scenario.datasetId &&
      experiment.linkedDatasetVersionId === scenario.datasetVersionId && Boolean(dataset)
    const run = runs.find(item => item.experimentId === scenario.experimentId && !item.parentRunId)
    const replay = run && runs.find(item => item.parentRunId === run.id)
    const summary = run?.summary?.scope === 'full-linked-plate' ? run.summary : null
    const runArtifacts = artifacts.filter(item => item.producingRunId === run?.id)
    let passed = false
    if (linked && run?.datasetVersionId === scenario.datasetVersionId) {
      if (scenario.id === 'missing-well') {
        passed = run.status === 'failed' && run.errorMessage === 'Linked table is missing 1 assigned wells: A4' && runArtifacts.length === 0
      } else if (scenario.id === 'weak-response') {
        passed = run.status === 'completed' && run.evidence?.verdict === 'inconclusive' && runArtifacts.length === 3
      } else {
        passed = run.status === 'completed' && run.evidence?.verdict === 'supported' &&
          Boolean(summary && Math.abs(summary.fit.relativeIc50 - 1) <= 0.2) && runArtifacts.length === 3 &&
          replay?.reproducibilityStatus === 'reproducible' &&
          (scenario.id !== 'version-change' || (dataset!.versionCount > 1 && run.inputCurrentness === 'superseded'))
      }
    }
    return {
      id: scenario.id,
      title: titles[locale][scenario.id],
      passed,
      runId: run?.id ?? null,
      replayRunId: replay?.id ?? null,
      status: run?.status ?? 'not-run',
      verdict: run?.evidence?.verdict ?? null,
      datasetVersionId: run?.datasetVersionId ?? null,
      inputCurrentness: run?.inputCurrentness ?? null,
      relativeIc50: summary?.fit.relativeIc50 ?? null,
      relativeIc50AbsoluteError: summary && (scenario.id === 'success' || scenario.id === 'version-change')
        ? Math.abs(summary.fit.relativeIc50 - 1) : null,
      durationMs: run?.startedAt && run.completedAt ? Date.parse(run.completedAt) - Date.parse(run.startedAt) : null,
      artifactCount: runArtifacts.length,
      errorMessage: run?.errorMessage ?? null,
    }
  })
  const heading = zh ? 'ScienceX 答辩演示记录' : 'ScienceX demonstration evidence'
  const boundary = zh
    ? '模拟数据 · 教学用途。指标来自本项目真实运行记录；运行耗时不是人工任务耗时，也不是相对其他工具的效率提升。尚无真实湿实验、生物学重复、统计显著性或外部验证。'
    : 'Simulated teaching data. Metrics come from actual project runs. Execution time is not human task time or a speedup over other tools. No wet-lab, biological-replication, statistical-significance, or external-validation evidence is claimed.'
  const aiPrompt = zh
    ? `请对当前 ScienceX 模拟细胞活力项目进行证据审阅。先读取 README.zh-CN.md、.sciencex/example.json，以及 .sciencex/runs 中的 run.json 和对应 artifacts。引用具体 Run ID、数据版本和产物路径，分别说明正常分析、旧版本重放、缺孔失败、证据不足。解释为什么运行完成不等于技术证据充分、为什么模拟 IC50 不能证明真实药效。提出下一步实验设计建议并标注需要研究者确认的假设。只读审阅，不修改文件、不重新运行分析、不访问网络。不要将自己的解释写成独立实验验证。最后给出一段 60 秒答辩陈述。`
    : 'Review this simulated ScienceX cell-viability project. Read README.en.md, .sciencex/example.json, run.json files under .sciencex/runs, and their artifacts. Cite concrete Run IDs, dataset versions and artifact paths. Explain normal analysis, pinned replay, missing-well failure and inconclusive evidence. Distinguish execution from technical support and simulation from real efficacy. Propose follow-up design questions for human confirmation. Stay read-only: do not change files, run analysis or access the network. Do not describe your interpretation as independent experimental verification. Finish with a 60-second presentation script.'
  const markdown = [
    `# ${heading}`, '', `> ${boundary}`, '',
    `Project: ${project.id}`, `Template: ${example.exampleId}@${example.templateVersion}`,
    `Generated: ${new Date().toISOString()}`, '',
    zh ? '## 实测结果' : '## Observed results', '',
    '| Scenario | Check | Run status | Evidence | IC50 | Absolute error (µM) | Execution (ms) | Artifacts |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...checks.map(item => `| ${item.title} | ${item.passed ? 'passed' : item.runId ? 'not-passed' : 'not-run'} | ${item.status} | ${item.verdict ?? '—'} | ${item.relativeIc50 ?? '—'} | ${item.relativeIc50AbsoluteError ?? '—'} | ${item.durationMs ?? '—'} | ${item.artifactCount} |`), '',
    zh ? '## 运行与输入依据' : '## Run and input evidence', '',
    ...runs.map(run => `- Run ${run.id}: ${run.status}; parent=${run.parentRunId ?? 'none'}; dataset=${run.datasetVersionId}; input=${run.inputHash}; replay=${run.reproducibilityStatus}; manifest=${run.manifestPath}; environment=${JSON.stringify(run.environment)}`), '',
    zh ? '## 产物' : '## Artifacts', '',
    ...artifacts.map(artifact => `- ${artifact.relativePath} · run=${artifact.producingRunId} · SHA-256=${artifact.contentHash}`), '',
    zh ? '## AI 审阅演示（需单独执行）' : '## AI review (requires a separate run)', '',
    zh ? '此记录不验证 AI 会话。打开 AI 审阅只填入提示词，发送后才调用所选模型。保留真实回复，并核对其引用。AI 提供解释和建议，数值由确定性分析器计算。' : 'This report does not verify an AI session. Opening review only prefills a prompt; sending it invokes the selected model. Preserve the actual response and check its citations. AI explains and suggests; the deterministic analyzer calculates.', '',
    aiPrompt, '',
    zh ? '## 人工对照记录（待实测）' : '## Human comparison (not measured)', '',
    zh ? '对同一原始表、相同方法和输出要求，分别记录手工流程与 ScienceX 的总耗时、操作数、错误和遗漏。使用相同熟练度，交替执行顺序。未填写前不能宣称提效百分比。' : 'For the same table, method and required outputs, record human elapsed time, actions, errors and omissions in a manual workflow and ScienceX. Keep proficiency comparable and alternate order. Do not claim a speedup before measurement.', '',
    '| Participant | Order | Workflow | Elapsed seconds | Actions | Errors / omissions |',
    '| --- | --- | --- | --- | --- | --- |',
    '| not measured | — | manual | — | — | — |',
    '| not measured | — | ScienceX | — | — | — |', '',
  ].join('\n')
  return { checks, markdown, aiPrompt, fileName: `sciencex-demo-${project.id}.md` }
}

export async function saveScienceExampleReport(projectId: string, locale?: string) {
  const report = await scienceExampleReport(projectId, locale)
  const project = await scienceWorkspaceService.getProject(projectId)
  const rootDir = await fs.realpath(project.rootDir)
  if (!isAllowedFilesystemPath(rootDir)) throw new ApiError(403, 'Project is outside allowed directories')
  const directory = path.join(rootDir, 'sciencex-demo-reports')
  await fs.mkdir(directory, { mode: 0o700 }).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  })
  if (!(await fs.lstat(directory)).isDirectory() || await fs.realpath(directory) !== directory) {
    throw ApiError.conflict('The demonstration report directory must not be a symbolic link')
  }
  const fileName = `demonstration-${randomUUID()}.md`
  const savedPath = path.join(directory, fileName)
  await fs.writeFile(savedPath, report.markdown, { flag: 'wx', mode: 0o600 })
  return { ...report, fileName, savedPath }
}
