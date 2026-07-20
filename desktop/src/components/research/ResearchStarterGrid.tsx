import { memo } from 'react'
import { BookOpenText, ChartNoAxesCombined, Microscope, RefreshCcw, type LucideIcon } from 'lucide-react'
import { useTranslation, type TranslationKey } from '../../i18n'

type ResearchStarter = {
  id: string
  icon: LucideIcon
  title: TranslationKey
  description: TranslationKey
  prompt: TranslationKey
}

const researchStarters: ResearchStarter[] = [
  {
    id: 'literature',
    icon: BookOpenText,
    title: 'empty.starter.literature.title',
    description: 'empty.starter.literature.description',
    prompt: 'empty.starter.literature.prompt',
  },
  {
    id: 'dataset',
    icon: ChartNoAxesCombined,
    title: 'empty.starter.dataset.title',
    description: 'empty.starter.dataset.description',
    prompt: 'empty.starter.dataset.prompt',
  },
  {
    id: 'reproduce',
    icon: RefreshCcw,
    title: 'empty.starter.reproduce.title',
    description: 'empty.starter.reproduce.description',
    prompt: 'empty.starter.reproduce.prompt',
  },
  {
    id: 'experiment',
    icon: Microscope,
    title: 'empty.starter.experiment.title',
    description: 'empty.starter.experiment.description',
    prompt: 'empty.starter.experiment.prompt',
  },
]

export const ResearchStarterGrid = memo(function ResearchStarterGrid({
  onSelect,
}: {
  onSelect: (prompt: string) => void
}) {
  const t = useTranslation()

  return (
    <div className="mt-8 grid w-full grid-cols-2 gap-3" aria-label={t('empty.startersLabel')}>
      {researchStarters.map((starter, index) => {
        const Icon = starter.icon
        return (
          <button
            key={starter.id}
            type="button"
            className="research-starter-card group min-h-[112px] text-left"
            onClick={() => onSelect(t(starter.prompt))}
            aria-label={t(starter.title)}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] text-[var(--color-brand)] shadow-sm">
                <Icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden={true} />
              </span>
              <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[var(--color-text-tertiary)]">
                0{index + 1}
              </span>
            </span>
            <span className="mt-3 block text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
              {t(starter.title)}
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {t(starter.description)}
            </span>
          </button>
        )
      })}
    </div>
  )
})
