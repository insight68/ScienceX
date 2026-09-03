import { useEffect, useState } from 'react'
import { CheckCircle2, Download, FlaskConical, MessageSquareText, Play, RefreshCw } from 'lucide-react'
import { scienceApi } from '../../api/science'
import { runScienceExampleDemo } from '../../lib/scienceExampleDemo'
import { useSettingsStore } from '../../stores/settingsStore'
import type { ScienceDataset, ScienceExampleDescriptor, ScienceExampleReport, ScienceExampleScenarioId, ScienceExperiment, ScienceProject } from '../../types/science'
import { Button } from '../shared/Button'
import { DirectoryPicker } from '../shared/DirectoryPicker'
import { Input } from '../shared/Input'
import { Modal } from '../shared/Modal'

const copy = {
  zh: {
    launch: '体验完整实验案例', create: '创建案例副本', cancel: '取消',
    boundary: '模拟数据 · 教学用途 · 本地计算',
    createHint: '选择父目录后创建独立副本，已有文件不会被覆盖。创建只准备输入，分析由你启动。',
    parent: '保存到父目录', challenges: '同时准备答辩对照：数据更新、缺孔、证据不足',
    loadError: '案例目录暂时不可用，请关闭后重试。',
    title: '从研究问题到可复核的结果',
    expand: '展开演示步骤', collapse: '收起演示步骤',
    subtitle: '先查看实验与数据，再运行演示。点击场景卡可检查各自的结果与证据。',
    run: '运行完整演示', running: '正在运行',
    repeat: '再次运行会新增记录，原有输入与结果继续保留。',
    passed: '已验证', pending: '待运行', inspect: '需要检查',
    download: '保存演示记录', saved: '已保存到案例目录', ai: '打开 AI 证据审阅',
    aiHint: 'AI 入口仅准备提示词；你发送后才调用所选模型，并可能传送所选上下文。AI 回复需另行核对。',
    measures: '记录含真实运行耗时、模拟参数误差、判定和产物哈希。人工效率对比仍需实测。',
    incomplete: '部分场景未达到预期，请点击相应场景查看运行记录。',
    success: '正常分析与重放', version: '数据更新与旧版本', missing: '缺孔拦截', weak: '计算完成，证据不足',
    successHint: '24 孔 → 4PL → 三类产物 → 一致重放',
    versionHint: '数据已有 V2，实验仍使用锁定的 V1',
    missingHint: '删除 A4 读数，保留完整实验板图',
    weakHint: '有效输入，但响应范围不足以支持判断',
  },
  en: {
    launch: 'Try a complete experiment', create: 'Create example copy', cancel: 'Cancel',
    boundary: 'Simulated data · Teaching case · Local computation',
    createHint: 'Choose a parent folder for a separate copy. Existing files stay intact. Creation prepares inputs; you start the analysis.',
    parent: 'Parent folder', challenges: 'Include defense challenges: changed data, missing well, inconclusive evidence',
    loadError: 'The example catalog is unavailable. Close and retry.',
    title: 'From a research question to reviewable results',
    expand: 'Show demonstration steps', collapse: 'Hide demonstration steps',
    subtitle: 'Inspect the design and data, then run the demonstration. Select a scenario to inspect its results and evidence.',
    run: 'Run complete demonstration', running: 'Running',
    repeat: 'Running again creates new records and retains previous inputs and results.',
    passed: 'Verified', pending: 'Not run', inspect: 'Needs inspection',
    download: 'Save demonstration evidence', saved: 'Saved in the example project', ai: 'Open AI evidence review',
    aiHint: 'This only prepares a prompt. Sending invokes your selected model and may share the chosen context. Review the actual AI response separately.',
    measures: 'Includes observed execution time, simulated parameter error, verdicts and artifact hashes. Human productivity comparisons still require measurement.',
    incomplete: 'Some scenarios did not meet expectations. Select their cards to inspect the run records.',
    success: 'Analysis and replay', version: 'Changed data, pinned input', missing: 'Missing well rejection', weak: 'Completed, yet inconclusive',
    successHint: '24 wells → 4PL → three artifacts → matching replay',
    versionHint: 'Data has V2; the experiment still uses pinned V1',
    missingHint: 'A4 reading is removed; the full design is retained',
    weakHint: 'Valid input, but too little response range for support',
  },
}

function useExampleCopy() {
  const locale = useSettingsStore(state => state.locale)
  return { locale, text: copy[locale.startsWith('zh') ? 'zh' : 'en'] }
}

export function ScienceExampleLauncher({ onCreated }: {
  onCreated: (result: { project: ScienceProject; dataset: ScienceDataset; experiment: ScienceExperiment }) => Promise<void>
}) {
  const { locale, text } = useExampleCopy()
  const [open, setOpen] = useState(false)
  const [examples, setExamples] = useState<ScienceExampleDescriptor[]>([])
  const [parentDir, setParentDir] = useState('')
  const [includeChallenges, setIncludeChallenges] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    let active = true
    setError(null)
    setExamples([])
    void scienceApi.listExamples(locale).then(result => {
      if (active) setExamples(result)
    }).catch(() => { if (active) setError(text.loadError) })
    return () => { active = false }
  }, [open, locale, text.loadError])

  const create = async () => {
    if (!examples[0] || !parentDir.trim()) return
    setSaving(true)
    setError(null)
    try {
      const result = await scienceApi.materializeExample({ exampleId: examples[0].id, parentDir: parentDir.trim(), locale, includeChallenges })
      await onCreated(result)
      setOpen(false)
      setParentDir('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setSaving(false)
    }
  }

  return <>
    <Button size="sm" onClick={() => setOpen(true)} icon={<FlaskConical className="h-3.5 w-3.5" />}>{text.launch}</Button>
    <Modal open={open} onClose={() => { if (!saving) setOpen(false) }} title={text.create} footer={<>
      <Button variant="ghost" disabled={saving} onClick={() => setOpen(false)}>{text.cancel}</Button>
      <Button onClick={() => void create()} loading={saving} disabled={!examples[0] || !parentDir.trim()}>{text.create}</Button>
    </>}>
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/5 p-4">
          <p className="text-xs font-semibold text-[var(--color-brand)]">{text.boundary}</p>
          <p className="mt-2 text-sm font-semibold">{examples[0]?.title}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{text.createHint}</p>
        </div>
        {error && <p role="alert" className="text-xs text-[var(--color-error)]">{error}</p>}
        <Input label={text.parent} value={parentDir} onChange={event => setParentDir(event.currentTarget.value)} disabled={saving} placeholder="/path/to/your/folder" />
        {!saving && <DirectoryPicker value={parentDir} onChange={setParentDir} />}
        <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <input type="checkbox" className="mt-0.5 accent-[var(--color-brand)]" checked={includeChallenges} disabled={saving} onChange={event => setIncludeChallenges(event.currentTarget.checked)} />
          {text.challenges}
        </label>
      </div>
    </Modal>
  </>
}

export function ScienceExamplePanel({ project, runCount, onRefresh, onSelect, onOpenReview }: {
  project: ScienceProject
  runCount: number
  onRefresh: () => Promise<void>
  onSelect: (scenarioId: ScienceExampleScenarioId, runId: string | null) => Promise<void>
  onOpenReview: (prompt: string) => Promise<void>
}) {
  const { locale, text } = useExampleCopy()
  const [report, setReport] = useState<ScienceExampleReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [activeScenario, setActiveScenario] = useState<ScienceExampleScenarioId | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void scienceApi.exampleReport(project.id, locale).then(result => {
      if (active) setReport(result)
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : String(failure)) })
    return () => { active = false }
  }, [project.id, locale, runCount])
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await runScienceExampleDemo(project, locale, setActiveScenario)
      setReport(result)
      if (result.checks.some(check => !check.passed)) setError(text.incomplete)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      await onRefresh()
      setBusy(false)
      setActiveScenario(null)
    }
  }
  const saveReport = async () => {
    setSavingReport(true)
    setError(null)
    try {
      const result = await scienceApi.saveExampleReport(project.id, locale)
      setReport(result)
      setSavedPath(result.savedPath)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setSavingReport(false)
    }
  }
  const labels = {
    success: [text.success, text.successHint],
    'version-change': [text.version, text.versionHint],
    'missing-well': [text.missing, text.missingHint],
    'weak-response': [text.weak, text.weakHint],
  }
  return <section aria-label={text.title} className="mx-5 mt-3 shrink-0 rounded-xl border border-[var(--color-brand)]/25 bg-[var(--color-surface-container-lowest)] p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold text-[var(--color-brand)]">{text.boundary}</p>
        <h2 className="mt-1 text-sm font-semibold">{text.title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setExpanded(value => !value)}>{expanded ? text.collapse : text.expand}</Button>
        <Button size="sm" onClick={() => void run()} loading={busy} disabled={reviewing} icon={<Play className="h-3.5 w-3.5" />}>{text.run}</Button>
      </div>
    </div>
    {expanded && <>
    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{text.subtitle}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {project.example?.scenarios.map((scenario, index) => {
        const check = report?.checks.find(item => item.id === scenario.id)
        const running = busy && activeScenario === scenario.id
        return <button key={scenario.id} disabled={busy} onClick={() => {
          void onSelect(scenario.id, check?.runId ?? null).then(() => setExpanded(false))
        }} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-low)] p-2.5 text-left transition-colors hover:border-[var(--color-brand)] disabled:opacity-70">
          <span className="flex items-center justify-between gap-2 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="font-mono">0{index + 1}</span>
            <span className={`inline-flex items-center gap-1 ${check?.passed ? 'text-[var(--color-success)]' : ''}`}>
              {running ? <RefreshCw className="h-3 w-3 animate-spin" /> : check?.passed ? <CheckCircle2 className="h-3 w-3" /> : null}
              {running ? text.running : check?.passed ? text.passed : check?.runId ? text.inspect : text.pending}
            </span>
          </span>
          <span className="mt-1 block text-xs font-semibold">{labels[scenario.id][0]}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-[var(--color-text-secondary)]">{labels[scenario.id][1]}</span>
        </button>
      })}
    </div>
    </>}
    {error && <p role="alert" className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={() => void saveReport()} loading={savingReport} disabled={!report || busy} icon={<Download className="h-3.5 w-3.5" />}>{text.download}</Button>
      <Button size="sm" variant="secondary" disabled={!report || busy} loading={reviewing} icon={<MessageSquareText className="h-3.5 w-3.5" />} onClick={() => {
        if (!report) return
        setReviewing(true)
        void onOpenReview(report.aiPrompt).finally(() => setReviewing(false))
      }}>{text.ai}</Button>
      <span className="text-[10px] text-[var(--color-text-tertiary)]">{expanded ? text.repeat : `${report?.checks.filter(check => check.passed).length ?? 0}/${project.example?.scenarios.length ?? 0} ${text.passed}`}</span>
    </div>
    {savedPath && <p role="status" className="mt-2 break-all text-[10px] text-[var(--color-success)]">{text.saved}: {savedPath}</p>}
    {expanded && <details className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
      <summary className="cursor-pointer">{text.measures}</summary>
      <p className="mt-1">{text.aiHint}</p>
    </details>}
  </section>
}
