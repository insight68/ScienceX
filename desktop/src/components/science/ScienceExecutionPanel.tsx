import { useEffect, useRef, useState } from 'react'
import { scienceWorkflowApi, type ScienceExecution, type ScienceExecutionInput } from '../../api/scienceWorkflow'
import type { ScienceAnalysisRun, ScienceDataset, ScienceDatasetPreview, ScienceExperiment, ScienceProject } from '../../types/science'
import { useTranslation } from '../../i18n'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Textarea } from '../shared/Textarea'
import { WorkflowError, WorkflowSection, WorkflowSelect } from './WorkflowSection'

type Props = { project: ScienceProject; experiments: ScienceExperiment[]; datasets: ScienceDataset[]; selectedExperimentId: string | null; onRunCreated: (run: ScienceAnalysisRun) => Promise<void> }
export function ScienceExecutionPanel(props: Props) {
  const t = useTranslation()
  return <WorkflowSection title={t('science.workflow.executions')}><ExecutionContent key={props.project.id} {...props} /></WorkflowSection>
}
function ExecutionContent({ project, experiments, datasets, selectedExperimentId, onRunCreated }: Props) {
  const t = useTranslation()
  const [executions, setExecutions] = useState<ScienceExecution[]>([])
  const [selected, setSelected] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    scienceWorkflowApi.listExecutions(project.id).then(items => {
      if (alive.current) {
        setExecutions(items)
        setSelected(items[0]?.id ?? '')
        setLoaded(true)
      }
    }).catch(reason => { if (alive.current) setError(String(reason)) })
    return () => { alive.current = false }
  }, [project.id])
  const selectedExecution = executions.find(item => item.id === selected)
  async function create(input: ScienceExecutionInput) {
    setBusy(true)
    setError(null)
    try {
      const result = await scienceWorkflowApi.createExecution(project.id, input)
      if (alive.current) {
        setExecutions(items => [result, ...items])
        setSelected(result.id)
        setCreating(false)
      }
    } catch (reason) { if (alive.current) setError(String(reason)) }
    finally { if (alive.current) setBusy(false) }
  }
  return <div className="space-y-4">
    <p className="leading-relaxed text-[var(--color-text-secondary)]">{t('science.workflow.executionHint')}</p>
    <WorkflowError error={error} />
    {!loaded && !error && <p>{t('common.loading')}</p>}
    <div className="flex items-end gap-3">
      {executions.length > 0 && <div className="min-w-0 flex-1"><WorkflowSelect label={t('science.workflow.execution')} value={selected} onChange={value => {
        setSelected(value)
        setCreating(false)
      }}>
        {executions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.performedBy} · {new Date(item.performedAt).toLocaleDateString()}</option>)}
      </WorkflowSelect></div>}
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setCreating(!creating)}>{creating ? t('common.cancel') : t('science.workflow.registerExecution')}</Button>
    </div>
    {creating && <ExecutionForm experiments={experiments} initialExperimentId={selectedExperimentId} simulated={Boolean(project.example)} busy={busy} onCreate={create} />}
    {!creating && loaded && !selectedExecution && <p className="text-[var(--color-text-tertiary)]">{t('science.workflow.noExecutions')}</p>}
    {!creating && selectedExecution && <ExecutionDetail key={selectedExecution.id} execution={selectedExecution} datasets={datasets} onUpdate={item => setExecutions(items => items.map(old => old.id === item.id ? item : old))} onRunCreated={onRunCreated} />}
  </div>
}

function ExecutionForm({ experiments, initialExperimentId, simulated, busy, onCreate }: { experiments: ScienceExperiment[]; initialExperimentId: string | null; simulated: boolean; busy: boolean; onCreate: (input: ScienceExecutionInput) => Promise<void> }) {
  const t = useTranslation()
  const [input, setInput] = useState<ScienceExecutionInput>({ name: '', experimentId: initialExperimentId ?? '', performedBy: '', performedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), sourceType: simulated ? 'simulated' : 'unknown', sampleBatch: '', instrument: '', actualConditions: '', deviations: '', biologicalReplicateId: '' })
  const change = (key: keyof ScienceExecutionInput, value: string) => setInput(old => ({ ...old, [key]: value }))
  return <form className="space-y-3" onSubmit={event => {
    event.preventDefault()
    void onCreate({ ...input, experimentId: input.experimentId || null, performedAt: new Date(input.performedAt).toISOString() })
  }}>
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <Input label={t('science.workflow.executionName')} value={input.name} onChange={e => change('name', e.target.value)} maxLength={160} required />
      <WorkflowSelect label={t('science.workflow.protocol')} value={input.experimentId ?? ''} onChange={value => change('experimentId', value)}><option value="">{t('science.workflow.generic')}</option>{experiments.map(item => <option key={item.id} value={item.id}>{item.name} · v{item.protocolVersion.ordinal}</option>)}</WorkflowSelect>
      <Input label={t('science.workflow.operator')} value={input.performedBy} onChange={e => change('performedBy', e.target.value)} maxLength={160} required />
      <Input label={t('science.workflow.performedAt')} type="datetime-local" value={input.performedAt} onChange={e => change('performedAt', e.target.value)} required />
      <WorkflowSelect label={t('science.workflow.source')} value={input.sourceType} onChange={value => change('sourceType', value)}>{(['unknown', 'measured', 'simulated'] as const).map(source => <option key={source} value={source}>{t(`science.workflow.${source}`)}</option>)}</WorkflowSelect>
      <Input label={t('science.workflow.batch')} value={input.sampleBatch} onChange={e => change('sampleBatch', e.target.value)} maxLength={500} />
      <Input label={t('science.workflow.instrument')} value={input.instrument} onChange={e => change('instrument', e.target.value)} maxLength={500} />
      <Input label={t('science.workflow.biologicalReplicate')} value={input.biologicalReplicateId} onChange={e => change('biologicalReplicateId', e.target.value)} maxLength={160} />
      <Textarea label={t('science.workflow.conditions')} value={input.actualConditions} onChange={e => change('actualConditions', e.target.value)} maxLength={4000} />
      <Textarea label={t('science.workflow.deviations')} value={input.deviations} onChange={e => change('deviations', e.target.value)} maxLength={4000} />
    </div>
    <Button type="submit" loading={busy} disabled={!input.name.trim() || !input.performedBy.trim() || !input.performedAt}>{t('common.save')}</Button>
  </form>
}

function ExecutionDetail({ execution, datasets, onUpdate, onRunCreated }: { execution: ScienceExecution; datasets: ScienceDataset[]; onUpdate: (execution: ScienceExecution) => void; onRunCreated: Props['onRunCreated'] }) {
  const t = useTranslation()
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '')
  const [versionId, setVersionId] = useState(execution.datasets[0]?.datasetVersionId ?? '')
  const [preview, setPreview] = useState<ScienceDatasetPreview | null>(null)
  const [wellColumn, setWellColumn] = useState('')
  const [signalColumn, setSignalColumn] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const binding = execution.datasets.find(item => item.datasetVersionId === versionId)
  const bindingDatasetId = binding?.datasetId
  useEffect(() => {
    let current = true
    setPreview(null)
    setError(null)
    if (bindingDatasetId && versionId) scienceWorkflowApi.previewVersion(execution.projectId, bindingDatasetId, versionId).then(result => {
      if (!current) return
      setPreview(result)
      setWellColumn(result.headers.find(header => /^(well|孔位)$/i.test(header)) ?? result.headers[0] ?? '')
      setSignalColumn(result.headers.find(header => /^(signal|od|luminescence)$/i.test(header)) ?? result.headers[1] ?? '')
    }).catch(reason => { if (current) setError(String(reason)) })
    return () => { current = false }
  }, [execution.projectId, bindingDatasetId, versionId])
  async function action(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try { await task() } catch (reason) { if (alive.current) setError(String(reason)) }
    finally { if (alive.current) setBusy(false) }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-[var(--color-surface-container-high)] p-3 font-mono text-[11px]">
      <span>{t(`science.workflow.${execution.sourceType}`)}</span><span>{execution.performedBy} · {new Date(execution.performedAt).toLocaleString()}</span>
      <span>{t('science.workflow.execution')}: {execution.id.slice(0, 8)}</span>
      {execution.protocolVersionId && <span>{t('science.workflow.protocol')}: {execution.protocolVersionId.slice(0, 8)} / {execution.designVersionId?.slice(0, 8)}</span>}
    </div>
    <dl className="grid grid-cols-1 gap-2 xl:grid-cols-2">{([
      ['batch', execution.sampleBatch], ['instrument', execution.instrument], ['biologicalReplicate', execution.biologicalReplicateId], ['conditions', execution.actualConditions], ['deviations', execution.deviations],
    ] as const).map(([key, value]) => <div key={key}><dt className="text-[var(--color-text-tertiary)]">{t(`science.workflow.${key}`)}</dt><dd className="whitespace-pre-wrap break-words">{value || '—'}</dd></div>)}</dl>
    <div className="flex items-end gap-3"><div className="min-w-0 flex-1"><WorkflowSelect label={t('science.workflow.bindCurrentVersion')} value={datasetId} onChange={setDatasetId} disabled={busy}>
      <option value="">{t('common.select')}</option>{datasets.map(item => <option key={item.id} value={item.id}>{item.name} · v{item.currentVersion.ordinal}</option>)}
    </WorkflowSelect></div><Button size="sm" variant="secondary" disabled={!datasetId || busy} onClick={() => void action(async () => {
      const dataset = datasets.find(item => item.id === datasetId)!
      const updated = await scienceWorkflowApi.bindDataset(execution.projectId, execution.id, dataset.id, dataset.currentVersion.id)
      if (alive.current) {
        onUpdate(updated)
        setVersionId(dataset.currentVersion.id)
      }
    })}>{t('science.workflow.bind')}</Button></div>
    {execution.datasets.length > 0 && <WorkflowSelect label={t('science.workflow.boundVersion')} value={versionId} onChange={setVersionId} disabled={busy}>{execution.datasets.map(item => <option key={item.datasetVersionId} value={item.datasetVersionId}>{item.name} · v{item.ordinal} · {item.contentHash.slice(0, 8)}</option>)}</WorkflowSelect>}
    {preview && execution.experimentId && <div className="grid grid-cols-2 gap-3">{([['wellColumn', wellColumn, setWellColumn], ['signalColumn', signalColumn, setSignalColumn]] as const).map(([key, value, onChange]) => <WorkflowSelect key={key} label={t(`science.${key}`)} value={value} onChange={onChange} disabled={busy}>{preview.headers.map(header => <option key={header}>{header}</option>)}</WorkflowSelect>)}</div>}
    <WorkflowError error={error} />
    <Button size="sm" disabled={!binding || !preview || (Boolean(execution.experimentId) && (!wellColumn || !signalColumn || wellColumn === signalColumn))} loading={busy} onClick={() => void action(async () => {
      if (!binding) return
      const result = await scienceWorkflowApi.analyze(execution.projectId, { executionId: execution.id, experimentId: execution.experimentId, datasetId: binding.datasetId, datasetVersionId: binding.datasetVersionId, wellColumn, signalColumn })
      if (alive.current) await onRunCreated(result.run)
    })}>{t('science.workflow.analyzeExecution')}</Button>
  </div>
}
