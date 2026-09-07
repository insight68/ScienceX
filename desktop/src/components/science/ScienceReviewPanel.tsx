import { useEffect, useRef, useState } from 'react'
import { scienceWorkflowApi, type ScienceReview, type ScienceReviewInput } from '../../api/scienceWorkflow'
import type { CreateScienceExperimentInput, ScienceAnalysisRun } from '../../types/science'
import { useTranslation } from '../../i18n'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Textarea } from '../shared/Textarea'
import { WorkflowError, WorkflowSection, WorkflowSelect } from './WorkflowSection'

export type ScienceNextExperimentDraft = Omit<CreateScienceExperimentInput, 'projectId'>
type Props = { run: ScienceAnalysisRun; onDraft: (draft: ScienceNextExperimentDraft) => void }
export function ScienceReviewPanel(props: Props) {
  const t = useTranslation()
  return <WorkflowSection title={t('science.workflow.review')}><ReviewContent key={props.run.id} {...props} /></WorkflowSection>
}
function ReviewContent({ run, onDraft }: Props) {
  const t = useTranslation()
  const [reviews, setReviews] = useState<ScienceReview[]>([])
  const [reviewer, setReviewer] = useState('')
  const [decision, setDecision] = useState<ScienceReviewInput['decision']>('revise')
  const [rationale, setRationale] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [supersedesReviewId, setSupersedesReviewId] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    scienceWorkflowApi.listReviews(run.projectId, run.id).then(items => {
      if (alive.current) {
        setReviews(items)
        setLoaded(true)
      }
    }).catch(reason => { if (alive.current) setError(String(reason)) })
    return () => { alive.current = false }
  }, [run.projectId, run.id])
  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const review = await scienceWorkflowApi.createReview(run.projectId, { runId: run.id, reviewer, decision, rationale, nextStep, supersedesReviewId: supersedesReviewId || null })
      if (alive.current) {
        setReviews(items => [review, ...items])
        setRationale('')
        setNextStep('')
        setSupersedesReviewId('')
      }
    } catch (reason) { if (alive.current) setError(String(reason)) }
    finally { if (alive.current) setBusy(false) }
  }
  const terminal = run.status !== 'queued' && run.status !== 'running'
  return <div className="space-y-4">
    <p className="text-[var(--color-text-secondary)]">{t('science.workflow.reviewHint')}</p>
    {run.evidence && <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{(['criterion', 'observed', 'threshold', 'result'] as const).map(key => <th key={key} className="border-b border-[var(--color-border)] p-2">{t(`science.workflow.${key}`)}</th>)}</tr></thead>
      <tbody>{run.evidence.metrics.map(metric => {
        const criterion = run.evaluationContract?.criteria.find(item => item.id === metric.criterionId)
        return <tr key={metric.criterionId}><td className="p-2 font-mono">{metric.metric}</td><td className="p-2">{JSON.stringify(metric.observed)}</td><td className="p-2">{criterion ? `${criterion.operator} ${JSON.stringify(criterion.threshold)}` : '—'}</td><td className={`p-2 ${metric.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>{t(metric.passed ? 'science.workflow.passed' : 'science.workflow.needsReview')}</td></tr>
      })}</tbody></table></div>}
    <WorkflowError error={error} />
    {!loaded && !error && <p>{t('common.loading')}</p>}
    {terminal && loaded && <form className="space-y-3" onSubmit={event => {
      event.preventDefault()
      void submit()
    }}>
      <div className="grid gap-3 xl:grid-cols-2"><Input label={t('science.workflow.reviewer')} value={reviewer} maxLength={160} onChange={event => setReviewer(event.target.value)} required />
        <WorkflowSelect label={t('science.workflow.decision')} value={decision} onChange={value => setDecision(value as ScienceReviewInput['decision'])}>{(['accept', 'revise', 'repeat'] as const).map(value => <option key={value} value={value}>{t(`science.workflow.${value}`)}</option>)}</WorkflowSelect></div>
      {reviews.length > 0 && <WorkflowSelect label={t('science.workflow.corrects')} value={supersedesReviewId} onChange={setSupersedesReviewId}><option value="">{t('science.workflow.newReview')}</option>{reviews.map(review => <option key={review.id} value={review.id}>{review.reviewer} · {new Date(review.createdAt).toLocaleString()} · {review.id.slice(0, 8)}</option>)}</WorkflowSelect>}
      <Textarea label={t('science.workflow.rationale')} value={rationale} maxLength={8000} onChange={event => setRationale(event.target.value)} required />
      <Textarea label={t('science.workflow.nextStep')} value={nextStep} maxLength={2000} onChange={event => setNextStep(event.target.value)} />
      <Button type="submit" size="sm" loading={busy} disabled={!reviewer.trim() || !rationale.trim()}>{t('science.workflow.saveReview')}</Button>
    </form>}
    {!terminal && <p>{t('science.workflow.waitRun')}</p>}
    <div className="space-y-3">{reviews.map(review => <article key={review.id} className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex flex-wrap justify-between gap-2 font-semibold"><span>{review.reviewer} · {t(`science.workflow.${review.decision}`)}</span><time className="font-normal text-[var(--color-text-tertiary)]">{new Date(review.createdAt).toLocaleString()}</time></div>
      {review.supersedesReviewId && <p className="mt-1 text-[var(--color-text-tertiary)]">{t('science.workflow.corrects')}: {review.supersedesReviewId.slice(0, 8)}</p>}
      <p className="mt-2 whitespace-pre-wrap break-words">{review.rationale}</p>
      {review.nextStep && <div className="mt-3 border-l-2 border-[var(--color-brand)] pl-3"><div className="font-semibold">{t('science.workflow.nextStep')}</div><p className="mt-1 whitespace-pre-wrap break-words">{review.nextStep}</p></div>}
      <p className="mt-2 break-all font-mono text-[10px] text-[var(--color-text-tertiary)]">{t('science.workflow.fingerprint')}: {review.reviewedContentHash}</p>
      {review.nextStep && run.experimentSnapshot && <Button className="mt-3" size="sm" variant="secondary" onClick={() => onDraft({ name: `${run.experimentSnapshot!.name} · ${t('science.workflow.followUp')}`.slice(0, 160), objective: review.nextStep, protocol: structuredClone(run.experimentSnapshot!.protocolVersion.protocol), linkedDatasetId: null, sourceReviewId: review.id })}>{t('science.workflow.useDraft')}</Button>}
    </article>)}</div>
  </div>
}
