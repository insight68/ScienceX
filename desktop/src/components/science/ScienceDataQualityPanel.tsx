import { useState } from 'react'
import type { ScienceAnalysisRun } from '../../types/science'
import { useTranslation } from '../../i18n'
import { WorkflowSection, WorkflowSelect } from './WorkflowSection'

type SignalKey = 'rawSignal' | 'blankCorrectedSignal' | 'normalizedViabilityPercent'
export function ScienceDataQualityPanel({ run }: { run: ScienceAnalysisRun }) {
  const t = useTranslation()
  return <WorkflowSection title={t('science.workflow.plateQuality')}><PlateQuality key={run.id} run={run} /></WorkflowSection>
}
function PlateQuality({ run }: { run: ScienceAnalysisRun }) {
  const t = useTranslation()
  const [metric, setMetric] = useState<SignalKey>('normalizedViabilityPercent')
  const [selectedWell, setSelectedWell] = useState<string | null>(null)
  if (run.summary?.scope !== 'full-linked-plate') return <p>{t('science.workflow.noPlateResult')}</p>
  const summary = run.summary
  const wells = new Map(summary.normalizedWells.map(well => [well.well, well]))
  const values = summary.normalizedWells.map(well => well[metric]).filter(Number.isFinite)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const selected = selectedWell ? wells.get(selectedWell) : null
  return <div className="space-y-3">
    <p className="font-mono text-[11px] text-[var(--color-text-secondary)]">{run.id.slice(0, 8)} · v{run.datasetVersionOrdinal} · {run.datasetVersionId}</p>
    <p className="text-[var(--color-text-secondary)]">{t('science.workflow.qualityHint')}</p>
    <WorkflowSelect label={t('science.workflow.signalView')} value={metric} onChange={value => setMetric(value as SignalKey)}>{(['rawSignal', 'blankCorrectedSignal', 'normalizedViabilityPercent'] as const).map(key => <option key={key} value={key}>{t(`science.workflow.${key}`)}</option>)}</WorkflowSelect>
    <div className="overflow-x-auto"><div className="grid min-w-[420px] grid-cols-12 gap-1" role="group" aria-label={t('science.workflow.plateQuality')}>
      {Array.from({ length: 96 }, (_, i) => `${'ABCDEFGH'[Math.floor(i / 12)]}${i % 12 + 1}`).map(position => {
        const well = wells.get(position)
        const value = well?.[metric]
        const intensity = value === undefined || !Number.isFinite(value) ? null : max === min ? 0.5 : (value - min) / (max - min)
        return <button key={position} type="button" disabled={!well} aria-label={`${position}: ${value === undefined ? '—' : value.toFixed(2)}`} aria-pressed={position === selectedWell} onClick={() => setSelectedWell(position)}
          style={intensity === null ? undefined : { backgroundColor: `rgba(14, 116, 144, ${0.12 + intensity * 0.64})` }}
          className={`flex min-h-10 flex-col items-center justify-center rounded border text-[9px] tabular-nums ${position === selectedWell ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]' : 'border-[var(--color-border)]'} disabled:opacity-30`}>
          <span>{position}</span><span>{value === undefined ? '—' : value.toFixed(1)}</span>
        </button>
      })}
    </div></div>
    <p className="text-[var(--color-text-tertiary)]">{Number.isFinite(min) ? `${min.toFixed(2)} → ${max.toFixed(2)}` : '—'} · {t('science.workflow.selectWell')}</p>
    {selected && <dl className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--color-border)] p-3">
      <div><dt>{selected.well} · {selected.label}</dt><dd>{t('science.workflow.technicalReplicate')}: {selected.replicate} · {selected.concentration ?? '—'} {run.experimentSnapshot?.protocolVersion.protocol.concentrationUnit ?? ''}</dd></div>
      {(['rawSignal', 'blankCorrectedSignal', 'normalizedViabilityPercent'] as const).map(key => <div key={key}><dt className="text-[var(--color-text-tertiary)]">{t(`science.workflow.${key}`)}</dt><dd className="font-mono">{selected[key].toFixed(3)}</dd></div>)}
    </dl>}
    {summary.warnings.map(warning => <p key={warning.code} className="text-[var(--color-warning)]">{warning.message}</p>)}
  </div>
}
