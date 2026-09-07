import { useState } from 'react'
import type { ScienceAnalysisRun } from '../../types/science'
import { useTranslation } from '../../i18n'
import { WorkflowSection } from './WorkflowSection'

export function comparisonIssues(runs: ScienceAnalysisRun[]) {
  const keys = runs.map(run => {
    const protocol = run.experimentSnapshot?.protocolVersion.protocol
    return protocol ? JSON.stringify([run.recipe, run.recipeHash, protocol.cellLine, protocol.compoundName, protocol.readout, protocol.concentrationUnit, protocol.treatmentDurationHours, protocol.seedingDensityCellsPerWell, protocol.vehicleControl, protocol.concentrations, protocol.replicateCount, protocol.includeBlankControl, protocol.positiveControl]) : null
  })
  return {
    missingConditions: keys.some(key => key === null),
    differentConditions: new Set(keys.filter(Boolean)).size > 1,
    sameData: new Set(runs.map(run => run.datasetContentHash ?? run.datasetVersionId)).size < runs.length,
    sameExecution: new Set(runs.map(run => run.executionId).filter(Boolean)).size < runs.filter(run => run.executionId).length,
  }
}
const comparisonFields = ['execution', 'boundVersion', 'protocol', 'relativeIc50', 'rSquared', 'rmse', 'technicalReplicate'] as const

function comparisonValue(run: ScienceAnalysisRun, field: typeof comparisonFields[number]): string | number {
  const summary = run.summary?.scope === 'full-linked-plate' ? run.summary : null
  const protocol = run.experimentSnapshot?.protocolVersion.protocol
  switch (field) {
    case 'execution':
      return run.executionId?.slice(0, 8) ?? '—'
    case 'boundVersion':
      return `${run.datasetId.slice(0, 8)} · v${run.datasetVersionOrdinal} · ${run.datasetVersionId.slice(0, 8)}`
    case 'protocol':
      return protocol
        ? `${protocol.cellLine} / ${protocol.compoundName} / ${protocol.readout} / ${protocol.treatmentDurationHours} h / ${protocol.seedingDensityCellsPerWell} / ${protocol.concentrations.join(', ')} ${protocol.concentrationUnit}`
        : '—'
    case 'technicalReplicate':
      return protocol?.replicateCount ?? '—'
    case 'relativeIc50':
      return summary ? `${summary.fit.relativeIc50.toPrecision(4)} ${protocol?.concentrationUnit ?? '?'}` : '—'
    case 'rSquared':
    case 'rmse':
      return summary?.fit[field].toPrecision(4) ?? '—'
  }
}

export function ScienceRunComparisonPanel({ runs }: { runs: ScienceAnalysisRun[] }) {
  const t = useTranslation()
  return <WorkflowSection title={t('science.workflow.compare')}><ComparisonContent runs={runs} /></WorkflowSection>
}
function ComparisonContent({ runs }: { runs: ScienceAnalysisRun[] }) {
  const t = useTranslation()
  const eligible = runs.filter(run => run.status === 'completed' && run.summary?.scope === 'full-linked-plate')
  const [ids, setIds] = useState<string[]>([])
  const selected = eligible.filter(run => ids.includes(run.id))
  const issues = comparisonIssues(selected)
  return <div className="space-y-3">
    <p className="text-[var(--color-text-secondary)]">{t('science.workflow.compareHint')}</p>
    {eligible.length < 2 && <p>{t('science.workflow.needTwoRuns')}</p>}
    <div className="grid gap-2 xl:grid-cols-2">{eligible.map(run => <label key={run.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] p-2">
      <input type="checkbox" checked={ids.includes(run.id)} disabled={!ids.includes(run.id) && selected.length >= 4} onChange={event => setIds(old => event.target.checked ? [...old, run.id] : old.filter(id => id !== run.id))} />
      <span className="min-w-0 truncate">{run.experimentSnapshot?.name ?? run.experimentId} · v{run.datasetVersionOrdinal} · {run.id.slice(0, 8)}</span>
    </label>)}</div>
    {selected.length >= 2 && <>
      {issues.sameData && <p role="status" className="text-[var(--color-warning)]">{t('science.workflow.sameData')}</p>}
      {issues.sameExecution && <p className="text-[var(--color-warning)]">{t('science.workflow.sameExecution')}</p>}
      {(issues.missingConditions || issues.differentConditions) && <p role="status" className="text-[var(--color-warning)]">{t(issues.missingConditions ? 'science.workflow.missingConditions' : 'science.workflow.differentConditions')}</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">{t('science.workflow.result')}</th>{selected.map(run => <th key={run.id} className="p-2 font-mono">{run.id.slice(0, 8)}</th>)}</tr></thead><tbody>
        {comparisonFields.map(field => <tr key={field} className="border-t border-[var(--color-border)]">
          <th className="p-2 font-medium">{t(`science.workflow.${field}`)}</th>
          {selected.map(run => <td key={run.id} className="p-2 align-top">{comparisonValue(run, field)}</td>)}
        </tr>)}
      </tbody></table></div>
    </>}
  </div>
}
