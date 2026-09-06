import { useState, useRef, useEffect, useId } from 'react'
import { ShieldQuestion, ShieldCheck, ShieldAlert, ClipboardList, Check, ChevronDown, Folder } from 'lucide-react'
import DOMPurify from 'dompurify'
import { useSettingsStore } from '../../stores/settingsStore'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useTabStore } from '../../stores/tabStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from '../../i18n'
import type { PermissionMode } from '../../types/settings'
import { useMobileViewport } from '../../hooks/useMobileViewport'
import { isDesktopRuntime } from '../../lib/desktopRuntime'
import { MobileBottomSheet } from '../shared/MobileBottomSheet'
import { ActionDialog } from '../shared/ActionDialog'
import { AutoModeOptInDialog } from './AutoModeOptInDialog'

const MODE_ICONS = {
  default: ShieldQuestion,
  acceptEdits: ShieldCheck,
  auto: ShieldCheck,
  plan: ClipboardList,
  bypassPermissions: ShieldAlert,
  dontAsk: ShieldQuestion,
}

type Props = {
  workDir?: string
  compact?: boolean
  showPlanControl?: boolean
  prePlanMode?: PermissionMode
  menuPlacement?: 'top' | 'bottom'
  /** Controlled mode: override current value */
  value?: PermissionMode
  /** Controlled mode: called on change instead of updating global store */
  onChange?: (mode: PermissionMode) => void
}

export function PermissionModeSelector({ workDir: workDirProp, compact = false, showPlanControl = false, prePlanMode, menuPlacement = 'top', value, onChange }: Props = {}) {
  const t = useTranslation()
  const isMobile = useMobileViewport() && !isDesktopRuntime()
  const {
    permissionMode: storeMode,
    autoModeOptInAccepted,
    acceptAutoModeOptIn,
  } = useSettingsStore()
  const setSessionPermissionMode = useChatStore((s) => s.setSessionPermissionMode)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const sessions = useSessionStore((s) => s.sessions)
  const sessionPrePlanMode = useChatStore((s) => activeTabId ? s.sessions[activeTabId]?.prePlanPermissionMode : undefined)
  const chatState = useChatStore((s) =>
    activeTabId ? s.sessions[activeTabId]?.chatState ?? 'idle' : 'idle',
  )
  const isTurnActive = chatState !== 'idle'
  const isTurnActiveNow = (tabId: string | null) => {
    if (!tabId) return false
    return (useChatStore.getState().sessions[tabId]?.chatState ?? 'idle') !== 'idle'
  }
  const [open, setOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [autoDialog, setAutoDialog] = useState(false)
  const [autoConsentPending, setAutoConsentPending] = useState(false)
  const interactionTabIdRef = useRef<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isControlled = value !== undefined
  const PERMISSION_ITEMS: Array<{
    value: PermissionMode
    label: string
    description: string
    icon: typeof ShieldCheck
    color?: string
  }> = [
    {
      value: 'default',
      label: t('permMode.askPermissions'),
      description: t('permMode.askPermDesc'),
      icon: ShieldQuestion,
    },
    {
      value: 'auto',
      label: t('permMode.autoMode'),
      description: t('permMode.autoModeDesc'),
      icon: ShieldCheck,
      color: 'text-[var(--color-brand)]',
    },
    {
      value: 'bypassPermissions',
      label: t('permMode.bypass'),
      description: t('permMode.bypassDesc'),
      icon: ShieldAlert,
      color: 'text-[var(--color-error)]',
    },
  ]

  const MODE_LABELS: Record<PermissionMode, string> = {
    default: t('permMode.label.default'),
    acceptEdits: t('permMode.label.acceptEdits'),
    auto: t('permMode.label.auto'),
    plan: t('permMode.label.plan'),
    bypassPermissions: t('permMode.label.bypassPermissions'),
    dontAsk: t('permMode.label.dontAsk'),
  }

  const activeSession = activeTabId
    ? sessions.find((s) => s.id === activeTabId)
    : null
  const currentMode = isControlled
    ? value
    : (activeSession?.permissionMode as PermissionMode | undefined) || storeMode
  const workDir = workDirProp || activeSession?.workDir || '~'
  const modeBeforePlan = useRef(new Map<string, PermissionMode>())
  const contextKey = isControlled ? `draft:${workDir}` : activeTabId || 'default'
  if (currentMode !== 'plan') modeBeforePlan.current.set(contextKey, currentMode)
  const executionMode = currentMode === 'plan'
    ? prePlanMode || sessionPrePlanMode || modeBeforePlan.current.get(contextKey) || 'default'
    : currentMode
  const CurrentIcon = MODE_ICONS[executionMode]
  const isPlanning = currentMode === 'plan'
  const compactButtonClass = `${isMobile ? 'min-h-11' : compact ? 'h-8' : ''} gap-1.5 rounded-full px-2.5 py-1.5 text-xs`
  const menuPlacementClass = menuPlacement === 'bottom'
    ? 'top-full mt-2'
    : 'bottom-full mb-2'
  const menuId = useId()

  useEffect(() => {
    if (isTurnActive) {
      setOpen(false)
      setConfirmDialog(false)
      setAutoDialog(false)
      interactionTabIdRef.current = null
    }
  }, [isTurnActive])

  useEffect(() => {
    if (
      (open || confirmDialog || autoDialog) &&
      activeTabId !== interactionTabIdRef.current
    ) {
      setOpen(false)
      setConfirmDialog(false)
      setAutoDialog(false)
      interactionTabIdRef.current = null
    }
  }, [activeTabId, autoDialog, confirmDialog, open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const permissionOptions = (
    <div id={menuId} ref={menuRef} role="menu">
      {PERMISSION_ITEMS.map((item) => (
        <button
          key={item.value}
          role="menuitem"
          onClick={() => {
            const actionTabId = useTabStore.getState().activeTabId
            if (
              actionTabId !== interactionTabIdRef.current ||
              isTurnActiveNow(actionTabId)
            ) {
              setOpen(false)
              setConfirmDialog(false)
              setAutoDialog(false)
              interactionTabIdRef.current = null
              return
            }
            if (item.value === 'auto' && !autoModeOptInAccepted && item.value !== currentMode) {
              setOpen(false)
              setAutoDialog(true)
              return
            }
            if (item.value === 'bypassPermissions' && currentMode !== 'bypassPermissions') {
              setOpen(false)
              setConfirmDialog(true)
              return
            }
            if (isControlled) {
              onChange?.(item.value)
            } else {
              if (actionTabId) setSessionPermissionMode(actionTabId, item.value)
            }
            setOpen(false)
            interactionTabIdRef.current = null
          }}
          className={`
            flex w-full items-start gap-3 px-4 py-3 text-left transition-colors
            hover:bg-[var(--color-surface-hover)]
            ${item.value === executionMode ? 'bg-[var(--color-surface-selected)]' : ''}
          `}
        >
          <item.icon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${item.color || 'text-[var(--color-text-secondary)]'}`} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</div>
            <div className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{item.description}</div>
          </div>
          {item.value === executionMode && (
            <Check size={16} aria-hidden="true" className="mt-0.5 text-[var(--color-brand)]" />
          )}
        </button>
      ))}
    </div>
  )

  const menuContent = (
    <>
      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-outline)]">
        {t('permMode.executionPermissions')}
      </div>
      {currentMode === 'acceptEdits' || currentMode === 'dontAsk' ? (
        <p className="mx-4 mb-2 text-xs leading-5 text-[var(--color-text-secondary)]" role="status">
          {t('permMode.legacyModeHint')}
        </p>
      ) : null}
      {permissionOptions}
    </>
  )

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      {showPlanControl && (
        <button
          type="button"
          aria-pressed={isPlanning}
          disabled={isTurnActive}
          title={isPlanning ? t('permMode.exitPlanDesc', { mode: MODE_LABELS[executionMode] }) : t('permMode.planModeDesc')}
          onClick={() => {
            const tabId = useTabStore.getState().activeTabId
            if (tabId !== activeTabId || isTurnActiveNow(tabId)) return
            const nextMode = isPlanning ? executionMode : 'plan'
            if (isControlled) onChange?.(nextMode)
            else if (tabId) setSessionPermissionMode(tabId, nextMode)
          }}
          className={`flex items-center ${compactButtonClass} font-medium transition-colors ${isPlanning ? 'bg-[var(--color-surface-selected)] text-[var(--color-brand)]' : 'bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]'} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <ClipboardList size={14} aria-hidden="true" />
          <span>{t(isPlanning ? 'permMode.planning' : 'permMode.planMode')}</span>
        </button>
      )}
      <button
        onClick={() => {
          const actionTabId = useTabStore.getState().activeTabId
          if (isTurnActiveNow(actionTabId) || (isPlanning && showPlanControl)) return
          if (open) {
            setOpen(false)
            interactionTabIdRef.current = null
            return
          }
          interactionTabIdRef.current = actionTabId
          setOpen(true)
        }}
        disabled={isTurnActive || (isPlanning && showPlanControl)}
        aria-label={MODE_LABELS[executionMode]}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={isTurnActive ? t('permMode.disabledDuringTurn') : isPlanning ? t('permMode.planPermissionsHint') : MODE_LABELS[executionMode]}
        className={`flex items-center bg-[var(--color-surface-container-low)] font-medium text-[var(--color-text-secondary)] transition-colors ${
          isTurnActive || (isPlanning && showPlanControl) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--color-surface-hover)]'
        } ${compactButtonClass} ${executionMode === 'bypassPermissions' ? '!text-[var(--color-error)] ring-1 ring-[var(--color-error)]/30' : ''}`}
      >
        <CurrentIcon size={14} aria-hidden="true" />
        <span>{MODE_LABELS[executionMode]}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open && (
        isMobile ? (
          <MobileBottomSheet
            open={open}
            onClose={() => setOpen(false)}
            title={t('permMode.executionPermissions')}
            closeLabel={t('tabs.close')}
            ariaLabel={t('permMode.executionPermissions')}
            contentClassName="py-2"
          >
            {menuContent}
          </MobileBottomSheet>
        ) : (
          <div className={`absolute left-0 ${menuPlacementClass} w-[320px] rounded-xl bg-[var(--color-surface-container-lowest)] border border-[var(--color-border)] shadow-[var(--shadow-dropdown)] z-50 py-2`}>
            {menuContent}
          </div>
        )
      )}

      <ActionDialog
        open={confirmDialog}
        onClose={() => {
          setConfirmDialog(false)
          interactionTabIdRef.current = null
        }}
        title={t('permMode.enableBypassTitle')}
        width={420}
        body={(
          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--color-error)]">
              {t('permMode.enableBypassSubtitle')}
            </p>
            <p
              className="text-xs leading-relaxed text-[var(--color-text-secondary)]"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('permMode.enableBypassBody')) }}
            />
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container)] px-3 py-2" title={workDir}>
              <Folder size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]" />
              <code className="truncate text-xs font-[var(--font-mono)] text-[var(--color-text-primary)]">{workDir}</code>
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
              <li className="flex items-start gap-2">
                <Check size={14} aria-hidden="true" className="mt-0.5 text-[var(--color-error)]" />
                {t('permMode.permReadWrite')}
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} aria-hidden="true" className="mt-0.5 text-[var(--color-error)]" />
                {t('permMode.permShell')}
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} aria-hidden="true" className="mt-0.5 text-[var(--color-error)]" />
                {t('permMode.permPackages')}
              </li>
            </ul>
          </div>
        )}
        actions={[
          {
            label: t('common.cancel'),
            onClick: () => {
              setConfirmDialog(false)
              interactionTabIdRef.current = null
            },
            variant: 'secondary',
          },
          {
            label: t('permMode.enableBypassBtn'),
            onClick: () => {
              const actionTabId = useTabStore.getState().activeTabId
              if (
                actionTabId !== interactionTabIdRef.current ||
                isTurnActiveNow(actionTabId)
              ) {
                setConfirmDialog(false)
                interactionTabIdRef.current = null
                return
              }
              if (isControlled) {
                onChange?.('bypassPermissions')
              } else if (actionTabId) {
                setSessionPermissionMode(actionTabId, 'bypassPermissions')
              }
              setConfirmDialog(false)
              interactionTabIdRef.current = null
            },
            variant: 'danger',
          },
        ]}
      />

      <AutoModeOptInDialog
        open={autoDialog}
        loading={autoConsentPending}
        onClose={() => {
          if (autoConsentPending) return
          setAutoDialog(false)
          interactionTabIdRef.current = null
        }}
        onConfirm={async () => {
          const actionTabId = useTabStore.getState().activeTabId
          if (
            actionTabId !== interactionTabIdRef.current ||
            isTurnActiveNow(actionTabId)
          ) {
            setAutoDialog(false)
            interactionTabIdRef.current = null
            return
          }

          setAutoConsentPending(true)
          try {
            if (!autoModeOptInAccepted) {
              await acceptAutoModeOptIn()
            }
            const confirmedTabId = useTabStore.getState().activeTabId
            if (
              confirmedTabId !== interactionTabIdRef.current ||
              isTurnActiveNow(confirmedTabId)
            ) {
              return
            }
            if (isControlled) {
              onChange?.('auto')
            } else if (confirmedTabId) {
              setSessionPermissionMode(confirmedTabId, 'auto')
            }
            setAutoDialog(false)
            interactionTabIdRef.current = null
          } catch (err) {
            useUIStore.getState().addToast({
              type: 'error',
              message: err instanceof Error ? err.message : t('common.error'),
            })
          } finally {
            setAutoConsentPending(false)
          }
        }}
      />
    </div>
  )
}
