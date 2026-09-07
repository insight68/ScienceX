import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Beaker,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Grid3X3,
  Link2,
  Plus,
} from 'lucide-react'
import { useTranslation } from '../../i18n'
import type {
  CreateScienceExperimentInput,
  ScienceAssayReadout,
  ScienceConcentrationUnit,
  ScienceDataset,
  ScienceDatasetPreview,
  ScienceExperiment,
  SciencePlateWell,
  SciencePlateWellRole,
} from '../../types/science'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Textarea } from '../shared/Textarea'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

type CellViabilityExperimentPanelProps = {
  initialDraft?: Omit<CreateScienceExperimentInput, 'projectId'>
  onDraftConsumed?: () => void
  experiments: ScienceExperiment[]
  datasets: ScienceDataset[]
  selectedDataset: ScienceDataset | null
  preview: ScienceDatasetPreview | null
  selectedExperimentId: string | null
  state: LoadState
  actionState: LoadState
  runActionState: LoadState
  onSelect: (experimentId: string) => void
  onCreate: (
    input: Omit<CreateScienceExperimentInput, 'projectId'>,
  ) => Promise<ScienceExperiment>
  onLinkDataset: (experimentId: string, datasetId: string) => Promise<ScienceExperiment>
  onSelectDataset: (datasetId: string) => Promise<void>
  onRunDoseResponse: (
    experimentId: string,
    wellColumn: string,
    signalColumn: string,
  ) => Promise<void>
}

export function CellViabilityExperimentPanel({
  initialDraft,
  onDraftConsumed,
  experiments,
  datasets,
  selectedDataset,
  preview,
  selectedExperimentId,
  state,
  actionState,
  runActionState,
  onSelect,
  onCreate,
  onLinkDataset,
  onSelectDataset,
  onRunDoseResponse,
}: CellViabilityExperimentPanelProps) {
  const t = useTranslation()
  const [creating, setCreating] = useState(Boolean(initialDraft))
  const selected = experiments.find(experiment => experiment.id === selectedExperimentId) ??
    experiments[0] ??
    null

  if (state === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
        {t('science.loadingExperiments')}
      </div>
    )
  }

  const showForm = creating || experiments.length === 0
  return (
    <section className="flex h-full min-w-0 overflow-hidden">
      {experiments.length > 0 && (
        <aside className="flex w-[224px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] 2xl:w-[272px]">
          <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                {t('science.experiments')}
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-[var(--color-text-tertiary)]">
                {experiments.length.toString().padStart(2, '0')} blueprints
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              aria-label={t('science.newExperiment')}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {experiments.map(experiment => (
              <button
                key={experiment.id}
                type="button"
                onClick={() => {
                  setCreating(false)
                  onDraftConsumed?.()
                  onSelect(experiment.id)
                }}
                className={`mb-1 w-full rounded-[10px] border px-3 py-3 text-left transition-colors ${
                  !showForm && experiment.id === selected?.id
                    ? 'border-[var(--color-brand)]/25 bg-[var(--color-surface-selected)]'
                    : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span className="flex items-start gap-2">
                  <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-[var(--color-text-primary)]">
                      {experiment.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[9px] text-[var(--color-text-tertiary)]">
                      <span>{experiment.protocolVersion.protocol.cellLine}</span>
                      <span>·</span>
                      <span>{experiment.protocolVersion.protocol.treatmentDurationHours} h</span>
                    </span>
                  </span>
                </span>
                <span className="mt-2 flex items-center justify-between pl-5">
                  <ExperimentStatus status={experiment.status} />
                  <span className="font-mono text-[8px] text-[var(--color-text-tertiary)]">
                    {experiment.designVersion.design.wells.length}/96
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-surface-container-lowest)]">
        {showForm ? (
          <ExperimentForm
            initialDraft={initialDraft}
            datasets={datasets}
            saving={actionState === 'loading'}
            canCancel={experiments.length > 0}
            onCancel={() => { setCreating(false); onDraftConsumed?.() }}
            onCreate={async input => {
              await onCreate(input)
              setCreating(false)
              onDraftConsumed?.()
            }}
          />
        ) : selected ? (
          <ExperimentDetail
            experiment={selected}
            datasets={datasets}
            selectedDataset={selectedDataset}
            preview={preview}
            linking={actionState === 'loading'}
            running={runActionState === 'loading'}
            onLinkDataset={onLinkDataset}
            onSelectDataset={onSelectDataset}
            onRunDoseResponse={onRunDoseResponse}
          />
        ) : (
          <EmptyExperiment onCreate={() => setCreating(true)} />
        )}
      </div>
    </section>
  )
}

function ExperimentForm({
  initialDraft,
  datasets,
  saving,
  canCancel,
  onCancel,
  onCreate,
}: {
  initialDraft?: Omit<CreateScienceExperimentInput, 'projectId'>
  datasets: ScienceDataset[]
  saving: boolean
  canCancel: boolean
  onCancel: () => void
  onCreate: (input: Omit<CreateScienceExperimentInput, 'projectId'>) => Promise<void>
}) {
  const t = useTranslation()
  const protocol = initialDraft?.protocol
  const [name, setName] = useState(initialDraft?.name ?? '')
  const [objective, setObjective] = useState(initialDraft?.objective ?? '')
  const [cellLine, setCellLine] = useState(protocol?.cellLine ?? '')
  const [compoundName, setCompoundName] = useState(protocol?.compoundName ?? '')
  const [readout, setReadout] = useState<ScienceAssayReadout>(protocol?.readout ?? 'cck-8')
  const [durationHours, setDurationHours] = useState(String(protocol?.treatmentDurationHours ?? 48))
  const [seedingDensity, setSeedingDensity] = useState(String(protocol?.seedingDensityCellsPerWell ?? 4000))
  const [unit, setUnit] = useState<ScienceConcentrationUnit>(protocol?.concentrationUnit ?? 'µM')
  const [doseText, setDoseText] = useState(protocol?.concentrations.join(', ') ?? '0.01, 0.1, 1, 5, 25, 100')
  const [replicates, setReplicates] = useState(String(protocol?.replicateCount ?? 3))
  const [includeBlank, setIncludeBlank] = useState(protocol?.includeBlankControl ?? true)
  const [includeVehicle, setIncludeVehicle] = useState(protocol ? Boolean(protocol.vehicleControl) : true)
  const [vehicleName, setVehicleName] = useState(protocol?.vehicleControl?.name ?? 'DMSO')
  const [vehiclePercent, setVehiclePercent] = useState(String(protocol?.vehicleControl?.finalPercent ?? 0.1))
  const [positiveControl, setPositiveControl] = useState(protocol?.positiveControl ?? '')
  const [linkedDatasetId, setLinkedDatasetId] = useState('')

  const doseParse = useMemo(() => parseDoses(doseText), [doseText])
  const replicateCount = Number(replicates)
  const groupCount = doseParse.values.length +
    (includeBlank ? 1 : 0) +
    (includeVehicle ? 1 : 0) +
    (positiveControl.trim() ? 1 : 0)
  const estimatedWellCount = groupCount * replicateCount
  const biologicalReady = Boolean(name.trim() && cellLine.trim() && compoundName.trim()) &&
    Number(durationHours) > 0 &&
    Number.isInteger(Number(seedingDensity)) &&
    Number(seedingDensity) > 0
  const dosesReady = doseParse.valid &&
    doseParse.values.length >= 4 &&
    doseParse.values.length <= 8
  const replicatesReady = Number.isInteger(replicateCount) && replicateCount >= 3 && replicateCount <= 8
  const controlsReady = includeBlank && includeVehicle && Boolean(vehicleName.trim()) &&
    Number(vehiclePercent) >= 0 &&
    Number(vehiclePercent) <= 100
  const plateReady = estimatedWellCount > 0 && estimatedWellCount <= 96 && groupCount <= 12
  const ready = biologicalReady && dosesReady && replicatesReady && controlsReady && plateReady

  const submit = async () => {
    if (!ready) return
    await onCreate({
      name: name.trim(),
      objective: objective.trim(),
      linkedDatasetId: linkedDatasetId || null,
      sourceReviewId: initialDraft?.sourceReviewId,
      protocol: {
        cellLine: cellLine.trim(),
        compoundName: compoundName.trim(),
        readout,
        treatmentDurationHours: Number(durationHours),
        seedingDensityCellsPerWell: Number(seedingDensity),
        concentrationUnit: unit,
        concentrations: doseParse.values,
        replicateCount,
        includeBlankControl: includeBlank,
        vehicleControl: includeVehicle
          ? { name: vehicleName.trim(), finalPercent: Number(vehiclePercent) }
          : null,
        positiveControl: positiveControl.trim(),
      },
    })
  }

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-6 2xl:px-10 2xl:py-8">
      {initialDraft?.sourceReviewId && <p className="mb-4 text-xs text-[var(--color-text-secondary)]">{t('science.workflow.draftHint')} · {initialDraft.sourceReviewId.slice(0, 8)}</p>}
      <div className="relative overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--color-brand)]" />
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
              <Beaker className="h-3.5 w-3.5" strokeWidth={2} />
              Cell viability · 96 well
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
              {t('science.experimentBlueprint')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {t('science.experimentBlueprintBody')}
            </p>
          </div>
          <PreflightSummary ready={ready} wellCount={Number.isFinite(estimatedWellCount) ? estimatedWellCount : 0} />
        </div>

        <div className="grid gap-0 xl:grid-cols-2">
          <fieldset className="border-b border-[var(--color-border)] p-6 xl:border-b-0 xl:border-r">
            <legend className="px-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              {t('science.protocolSetup')}
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  id="science-experiment-name"
                  label={t('science.experimentName')}
                  placeholder={t('science.experimentNamePlaceholder')}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  required
                />
              </div>
              <Input
                id="science-cell-line"
                label={t('science.cellLine')}
                placeholder={t('science.cellLinePlaceholder')}
                value={cellLine}
                onChange={event => setCellLine(event.target.value)}
                required
              />
              <Input
                id="science-compound"
                label={t('science.compound')}
                placeholder={t('science.compoundPlaceholder')}
                value={compoundName}
                onChange={event => setCompoundName(event.target.value)}
                required
              />
              <SelectField
                id="science-readout"
                label={t('science.assayReadout')}
                value={readout}
                onChange={value => setReadout(value as ScienceAssayReadout)}
                options={[
                  { value: 'cck-8', label: t('science.readout.cck8') },
                  { value: 'celltiter-glo', label: t('science.readout.celltiterGlo') },
                ]}
              />
              <Input
                id="science-duration"
                type="number"
                min="1"
                label={t('science.durationHours')}
                value={durationHours}
                onChange={event => setDurationHours(event.target.value)}
              />
              <Input
                id="science-density"
                type="number"
                min="1"
                step="1"
                label={t('science.seedingDensity')}
                value={seedingDensity}
                onChange={event => setSeedingDensity(event.target.value)}
              />
              <SelectField
                id="science-dataset-link"
                label={t('science.linkedDataset')}
                value={linkedDatasetId}
                onChange={setLinkedDatasetId}
                options={[
                  { value: '', label: t('science.noLinkedDataset') },
                  ...datasets.map(dataset => ({ value: dataset.id, label: dataset.name })),
                ]}
              />
              <div className="sm:col-span-2">
                <Textarea
                  id="science-experiment-objective"
                  label={t('science.experimentObjective')}
                  placeholder={t('science.experimentObjectivePlaceholder')}
                  value={objective}
                  onChange={event => setObjective(event.target.value)}
                  className="min-h-[82px]"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="p-6">
            <legend className="px-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              {t('science.controlSetup')}
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  id="science-dose-levels"
                  label={t('science.doseLevels')}
                  value={doseText}
                  onChange={event => setDoseText(event.target.value)}
                  error={doseText && !dosesReady ? t('science.preflightBlocked') : undefined}
                />
                <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-text-tertiary)]">
                  {t('science.doseLevelsHint')}
                </p>
              </div>
              <SelectField
                id="science-unit"
                label={t('science.concentrationUnit')}
                value={unit}
                onChange={value => setUnit(value as ScienceConcentrationUnit)}
                options={['nM', 'µM', 'mM'].map(value => ({ value, label: value }))}
              />
              <Input
                id="science-replicates"
                type="number"
                min="3"
                max="8"
                step="1"
                label={t('science.replicates')}
                value={replicates}
                onChange={event => setReplicates(event.target.value)}
              />

              <ControlToggle
                checked={includeBlank}
                label={t('science.blankControl')}
                onChange={setIncludeBlank}
              />
              <ControlToggle
                checked={includeVehicle}
                label={t('science.vehicleControl')}
                onChange={setIncludeVehicle}
              />

              <Input
                id="science-vehicle-name"
                label={t('science.vehicleName')}
                value={vehicleName}
                onChange={event => setVehicleName(event.target.value)}
                disabled={!includeVehicle}
              />
              <Input
                id="science-vehicle-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                label={t('science.vehiclePercent')}
                value={vehiclePercent}
                onChange={event => setVehiclePercent(event.target.value)}
                disabled={!includeVehicle}
              />
              <div className="sm:col-span-2">
                <Input
                  id="science-positive-control"
                  label={t('science.positiveControl')}
                  placeholder={t('science.positiveControlPlaceholder')}
                  value={positiveControl}
                  onChange={event => setPositiveControl(event.target.value)}
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-6 py-4">
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>{t('science.wellsAssigned', { count: Number.isFinite(estimatedWellCount) ? estimatedWellCount : 0 })}</span>
            <span>·</span>
            <span>{t('science.doseLevelsCount', { count: doseParse.values.length })}</span>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => void submit().catch(() => undefined)}
              disabled={!ready}
              loading={saving}
              icon={<ClipboardCheck className="h-3.5 w-3.5" />}
            >
              {t('science.createExperiment')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExperimentDetail({
  experiment,
  datasets,
  selectedDataset,
  preview,
  linking,
  running,
  onLinkDataset,
  onSelectDataset,
  onRunDoseResponse,
}: {
  experiment: ScienceExperiment
  datasets: ScienceDataset[]
  selectedDataset: ScienceDataset | null
  preview: ScienceDatasetPreview | null
  linking: boolean
  running: boolean
  onLinkDataset: (experimentId: string, datasetId: string) => Promise<ScienceExperiment>
  onSelectDataset: (datasetId: string) => Promise<void>
  onRunDoseResponse: (
    experimentId: string,
    wellColumn: string,
    signalColumn: string,
  ) => Promise<void>
}) {
  const t = useTranslation()
  const protocol = experiment.protocolVersion.protocol
  const design = experiment.designVersion.design
  const linkedDataset = datasets.find(dataset => dataset.id === experiment.linkedDatasetId) ?? null

  return (
    <div className="science-experiment-detail-panel mx-auto max-w-[1120px] px-6 py-6 2xl:px-10 2xl:py-8">
      <div className="overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="relative border-b border-[var(--color-border)] px-6 py-5">
          <div className="absolute left-0 top-0 h-full w-1 bg-[var(--color-brand)]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ExperimentStatus status={experiment.status} />
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                  cell viability · 96 well
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                {experiment.name}
              </h2>
              {experiment.sourceReviewId && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('science.workflow.review')}: <span className="font-mono">{experiment.sourceReviewId}</span></p>}
              {experiment.objective && (
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {experiment.objective}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <VersionChip label={t('science.protocolVersion', { count: experiment.protocolVersion.ordinal })} />
              <VersionChip label={t('science.designVersion', { count: experiment.designVersion.ordinal })} />
            </div>
          </div>
        </div>

        <div className="grid border-b border-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
          <ProtocolMetric label={t('science.cellLine')} value={protocol.cellLine || '—'} />
          <ProtocolMetric label={t('science.compound')} value={protocol.compoundName || '—'} />
          <ProtocolMetric
            label={t('science.assayReadout')}
            value={protocol.readout === 'cck-8' ? t('science.readout.cck8') : t('science.readout.celltiterGlo')}
          />
          <ProtocolMetric label={t('science.durationHours')} value={`${protocol.treatmentDurationHours} h`} />
        </div>

        <div className="science-experiment-detail-layout grid gap-0">
          <div className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">
                  <Grid3X3 className="h-3.5 w-3.5" />
                  {t('science.plateMap')}
                </div>
                <div className="mt-1 flex gap-3 font-mono text-[9px] text-[var(--color-text-tertiary)]">
                  <span>{t('science.wellsAssigned', { count: design.wells.length })}</span>
                  <span>{t('science.doseLevelsCount', { count: protocol.concentrations.length })}</span>
                  <span>{protocol.replicateCount}× replicates</span>
                </div>
              </div>
              <PlateLegend />
            </div>
            <PlateMap wells={design.wells} />
          </div>

          <aside className="science-experiment-readiness border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] p-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              {t('science.readiness')}
            </div>
            <ReadinessCard experiment={experiment} />

            <dl className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-4 text-[10px]">
              <DetailRow label={t('science.seedingDensity')} value={protocol.seedingDensityCellsPerWell.toLocaleString()} />
              <DetailRow label={t('science.vehicleControl')} value={protocol.vehicleControl ? `${protocol.vehicleControl.name} · ${protocol.vehicleControl.finalPercent}%` : '—'} />
              <DetailRow label={t('science.positiveControl')} value={protocol.positiveControl || '—'} />
              <DetailRow label={t('science.linkedDataset')} value={linkedDataset?.name ?? t('science.noLinkedDataset')} />
            </dl>
            {datasets.length > 0 && (
              <DatasetLinker
                experiment={experiment}
                datasets={datasets}
                linking={linking}
                onLinkDataset={onLinkDataset}
              />
            )}
            {experiment.linkedDatasetId && (
              <DoseResponseLauncher
                experiment={experiment}
                selectedDataset={selectedDataset}
                preview={preview}
                running={running}
                onSelectDataset={onSelectDataset}
                onRun={onRunDoseResponse}
              />
            )}

            <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--color-text-primary)]">
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                {t('science.nextStage')}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
                {t('science.nextStageBody')}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function DoseResponseLauncher({
  experiment,
  selectedDataset,
  preview,
  running,
  onSelectDataset,
  onRun,
}: {
  experiment: ScienceExperiment
  selectedDataset: ScienceDataset | null
  preview: ScienceDatasetPreview | null
  running: boolean
  onSelectDataset: (datasetId: string) => Promise<void>
  onRun: (experimentId: string, wellColumn: string, signalColumn: string) => Promise<void>
}) {
  const t = useTranslation()
  const linkedSelected = selectedDataset?.id === experiment.linkedDatasetId
  const headers = linkedSelected && preview?.datasetId === experiment.linkedDatasetId
    ? preview.headers
    : []
  const numericHeaders = linkedSelected && preview?.datasetId === experiment.linkedDatasetId
    ? preview.columns
      .filter(column => column.inferredType === 'number' || column.inferredType === 'integer')
      .map(column => column.name)
    : []
  const preferredWell = headers.find(header => (
    ['well', 'well_id', 'wellid', 'position'].includes(header.trim().toLowerCase())
  )) ?? headers[0] ?? ''
  const signalAliases = experiment.protocolVersion.protocol.readout === 'cck-8'
    ? ['signal', 'od450', 'od', 'absorbance', 'value']
    : ['signal', 'rlu', 'luminescence', 'value']
  const preferredSignal = headers.find(header => signalAliases.includes(header.trim().toLowerCase())) ??
    numericHeaders.find(header => header !== preferredWell) ??
    headers.find(header => header !== preferredWell) ??
    ''
  const [wellColumn, setWellColumn] = useState(preferredWell)
  const [signalColumn, setSignalColumn] = useState(preferredSignal)

  useEffect(() => {
    setWellColumn(preferredWell)
    setSignalColumn(preferredSignal)
  }, [experiment.id, preferredSignal, preferredWell])

  return (
    <div className="mt-4 rounded-[12px] border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/5 p-3">
      <div className="flex items-center gap-2 text-[9px] font-semibold text-[var(--color-text-primary)]">
        <Activity className="h-3.5 w-3.5 text-[var(--color-brand)]" />
        {t('science.doseResponseAnalysis')}
      </div>
      <p className="mt-1.5 text-[9px] leading-relaxed text-[var(--color-text-secondary)]">
        {t('science.doseResponseAnalysisBody')}
      </p>
      {!linkedSelected ? (
        <Button
          className="mt-3 w-full"
          size="sm"
          variant="secondary"
          onClick={() => void onSelectDataset(experiment.linkedDatasetId!).catch(() => undefined)}
        >
          {t('science.selectLinkedDataset')}
        </Button>
      ) : headers.length === 0 ? (
        <div className="mt-3 text-[9px] text-[var(--color-text-tertiary)]">
          {t('science.loadingAnalysisColumns')}
        </div>
      ) : (
        <>
          <label className="mt-3 block text-[9px] font-medium text-[var(--color-text-secondary)]">
            {t('science.wellColumn')}
            <select
              aria-label={t('science.wellColumn')}
              value={wellColumn}
              onChange={event => setWellColumn(event.target.value)}
              className="mt-1 h-8 w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[10px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
            >
              {headers.map(header => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
          <label className="mt-2 block text-[9px] font-medium text-[var(--color-text-secondary)]">
            {t('science.signalColumn')}
            <select
              aria-label={t('science.signalColumn')}
              value={signalColumn}
              onChange={event => setSignalColumn(event.target.value)}
              className="mt-1 h-8 w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[10px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
            >
              {headers.map(header => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
          <Button
            className="mt-3 w-full"
            size="sm"
            loading={running}
            disabled={!wellColumn || !signalColumn || wellColumn === signalColumn}
            onClick={() => void onRun(experiment.id, wellColumn, signalColumn).catch(() => undefined)}
          >
            {t('science.runDoseResponse')}
          </Button>
        </>
      )}
    </div>
  )
}

function DatasetLinker({
  experiment,
  datasets,
  linking,
  onLinkDataset,
}: {
  experiment: ScienceExperiment
  datasets: ScienceDataset[]
  linking: boolean
  onLinkDataset: (experimentId: string, datasetId: string) => Promise<ScienceExperiment>
}) {
  const t = useTranslation()
  const [datasetId, setDatasetId] = useState(experiment.linkedDatasetId ?? datasets[0]?.id ?? '')
  return (
    <div className="mt-4 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2 text-[9px] font-semibold text-[var(--color-text-primary)]">
        <Link2 className="h-3.5 w-3.5 text-[var(--color-brand)]" />
        {t('science.linkedDataset')}
      </div>
      <select
        aria-label={t('science.linkedDataset')}
        value={datasetId}
        onChange={event => setDatasetId(event.target.value)}
        className="mt-2 h-8 w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-2 text-[10px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
      >
        {datasets.map(dataset => (
          <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
        ))}
      </select>
      <Button
        className="mt-2 w-full"
        size="sm"
        variant="secondary"
        loading={linking}
        disabled={!datasetId || datasetId === experiment.linkedDatasetId}
        onClick={() => void onLinkDataset(experiment.id, datasetId).catch(() => undefined)}
      >
        {t('common.save')}
      </Button>
    </div>
  )
}

function PlateMap({ wells }: { wells: SciencePlateWell[] }) {
  const wellMap = new Map(wells.map(well => [well.well, well]))
  const rows = [...'ABCDEFGH']
  const columns = Array.from({ length: 12 }, (_, index) => index + 1)
  return (
    <div className="mt-5 overflow-x-auto rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-3 shadow-inner">
      <div className="grid min-w-[650px] grid-cols-[24px_repeat(12,minmax(38px,1fr))] gap-1.5">
        <span />
        {columns.map(column => (
          <span key={column} className="text-center font-mono text-[8px] text-[var(--color-text-tertiary)]">
            {column}
          </span>
        ))}
        {rows.flatMap(row => [
          <span key={`${row}-label`} className="flex items-center justify-center font-mono text-[9px] font-semibold text-[var(--color-text-tertiary)]">
            {row}
          </span>,
          ...columns.map(column => (
            <PlateWellCell key={`${row}${column}`} well={wellMap.get(`${row}${column}`)} />
          )),
        ])}
      </div>
    </div>
  )
}

function PlateWellCell({ well }: { well: SciencePlateWell | undefined }) {
  const roleStyles: Record<SciencePlateWellRole, string> = {
    blank: 'border-slate-400/35 bg-slate-400/15 text-[var(--color-text-secondary)]',
    'vehicle-control': 'border-cyan-500/35 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    'positive-control': 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
    treatment: 'border-[var(--color-brand)]/35 bg-[var(--color-brand)]/10 text-[var(--color-brand)]',
  }
  if (!well) {
    return <span className="aspect-square rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50" />
  }
  const display = well.role === 'treatment'
    ? String(well.concentration)
    : well.role === 'blank'
      ? 'B'
      : well.role === 'vehicle-control'
        ? 'V'
        : 'P'
  return (
    <span
      title={`${well.well} · ${well.label} · replicate ${well.replicate}`}
      className={`flex aspect-square items-center justify-center rounded-full border font-mono text-[7px] font-semibold shadow-sm ${roleStyles[well.role]}`}
    >
      {display}
    </span>
  )
}

function PlateLegend() {
  const t = useTranslation()
  const entries: Array<{ role: SciencePlateWellRole; label: string; color: string }> = [
    { role: 'blank', label: t('science.role.blank'), color: 'bg-slate-400' },
    { role: 'vehicle-control', label: t('science.role.vehicle'), color: 'bg-cyan-500' },
    { role: 'positive-control', label: t('science.role.positive'), color: 'bg-amber-500' },
    { role: 'treatment', label: t('science.role.treatment'), color: 'bg-[var(--color-brand)]' },
  ]
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
      {entries.map(entry => (
        <span key={entry.role} className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-tertiary)]">
          <span className={`h-2 w-2 rounded-full ${entry.color}`} />
          {entry.label}
        </span>
      ))}
    </div>
  )
}

function ReadinessCard({ experiment }: { experiment: ScienceExperiment }) {
  const t = useTranslation()
  const ready = experiment.status === 'ready'
  return (
    <div className={`mt-3 rounded-[12px] border p-3.5 ${
      ready
        ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10'
        : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10'
    }`}>
      <div className="flex items-start gap-2.5">
        {ready
          ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
          : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />}
        <div>
          <div className="text-[11px] font-semibold text-[var(--color-text-primary)]">
            {ready ? t('science.readyForExecution') : t('science.draftNeedsAttention')}
          </div>
          {ready && (
            <p className="mt-1 text-[9px] leading-relaxed text-[var(--color-text-secondary)]">
              {t('science.readyForExecutionBody')}
            </p>
          )}
        </div>
      </div>
      {experiment.readiness.issues.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-current/10 pt-3">
          {experiment.readiness.issues.map(issue => (
            <li key={issue.code} className="flex gap-2 text-[9px] leading-relaxed text-[var(--color-text-secondary)]">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current" />
              {issue.code === 'missing-positive-control' ? t('science.missingPositiveControl') : issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PreflightSummary({ ready, wellCount }: { ready: boolean; wellCount: number }) {
  const t = useTranslation()
  return (
    <div className={`min-w-[220px] rounded-[12px] border px-3.5 py-3 ${
      ready
        ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10'
        : 'border-[var(--color-border)] bg-[var(--color-surface-container-low)]'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">
          {t('science.preflight')}
        </span>
        <span className="font-mono text-[9px] text-[var(--color-text-tertiary)]">{wellCount}/96</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-[var(--color-text-primary)]">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${
          ready ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-container-high)] text-[var(--color-text-tertiary)]'
        }`}>
          {ready ? <Check className="h-3 w-3" /> : <Grid3X3 className="h-3 w-3" />}
        </span>
        {ready ? t('science.preflightReady') : t('science.preflightBlocked')}
      </div>
    </div>
  )
}

function ExperimentStatus({ status }: { status: ScienceExperiment['status'] }) {
  const t = useTranslation()
  const ready = status === 'ready'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${
      ready
        ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
        : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
    }`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(`science.experiment.status.${status}`)}
    </span>
  )
}

function EmptyExperiment({ onCreate }: { onCreate: () => void }) {
  const t = useTranslation()
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <FlaskConical className="h-8 w-8 text-[var(--color-brand)]" strokeWidth={1.5} />
        </div>
        <h2 className="mt-5 text-base font-semibold text-[var(--color-text-primary)]">
          {t('science.noExperimentsTitle')}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          {t('science.noExperimentsBody')}
        </p>
        <Button className="mt-5" onClick={onCreate} icon={<Plus className="h-4 w-4" />}>
          {t('science.newExperiment')}
        </Button>
      </div>
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)] focus:shadow-[var(--shadow-focus-ring)]"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

function ControlToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[11px] font-medium transition-colors ${
      checked
        ? 'border-[var(--color-brand)]/25 bg-[var(--color-surface-selected)] text-[var(--color-text-primary)]'
        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--color-brand)]"
      />
      {label}
    </label>
  )
}

function ProtocolMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--color-border)] px-5 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="mt-1 truncate text-[11px] font-semibold text-[var(--color-text-primary)]" title={value}>{value}</dd>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="max-w-[150px] text-right font-medium text-[var(--color-text-primary)]">{value}</dd>
    </div>
  )
}

function VersionChip({ label }: { label: string }) {
  return (
    <span className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-2 py-1 font-mono text-[8px] text-[var(--color-text-tertiary)]">
      {label}
    </span>
  )
}

function parseDoses(value: string): { values: number[]; valid: boolean } {
  const tokens = value.split(/[,，;；\s]+/).map(token => token.trim()).filter(Boolean)
  const values = tokens.map(Number)
  const valid = tokens.length > 0 &&
    values.every(dose => Number.isFinite(dose) && dose > 0) &&
    new Set(values.map(dose => String(dose))).size === values.length
  return { values, valid }
}
