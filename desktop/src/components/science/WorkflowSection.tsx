import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function WorkflowSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <section className="flex min-h-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-primary)]">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full shrink-0 items-center gap-2 px-5 py-3 text-left font-semibold hover:bg-[var(--color-surface-hover)]">
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{title}
    </button>
    {open && <div className="min-h-0 max-h-[65vh] overflow-y-auto px-5 pb-5">{children}</div>}
  </section>
}

export function WorkflowError({ error }: { error: string | null }) {
  return error ? <p role="alert" className="my-2 text-xs text-[var(--color-error)]">{error}</p> : null
}

export const workflowSelectClass = 'h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text-primary)]'
export function WorkflowSelect({ label, value, onChange, children, disabled }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; disabled?: boolean }) {
  return <label className="flex flex-col gap-1 text-sm font-medium">{label}<select aria-label={label} className={workflowSelectClass} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{children}</select></label>
}
