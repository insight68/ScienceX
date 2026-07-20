import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useTabStore } from '../../stores/tabStore'
import { EmptySession } from '../../pages/EmptySession'
import { ActiveSession } from '../../pages/ActiveSession'
import { TerminalSettings } from '../../pages/TerminalSettings'
import { TraceList } from '../../pages/TraceList'
import { TraceSession } from '../../pages/TraceSession'
import { SubagentRunPage } from '../../pages/SubagentRunPage'
import { previewBridge } from '../../lib/previewBridge'
import { useTranslation } from '../../i18n'

const ScheduledTasks = lazy(() => import('../../pages/ScheduledTasks').then(module => ({ default: module.ScheduledTasks })))
const Market = lazy(() => import('../../pages/Market').then(module => ({ default: module.Market })))
const ScienceWorkspace = lazy(() => import('../../pages/ScienceWorkspace').then(module => ({ default: module.ScienceWorkspace })))
const Settings = lazy(() => import('../../pages/Settings').then(module => ({ default: module.Settings })))
const WorkbenchTab = lazy(() => import('../workbench/WorkbenchTab').then(module => ({ default: module.WorkbenchTab })))

export function ContentRouter() {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabs = useTabStore((s) => s.tabs)
  const activeTabType = tabs.find((t) => t.sessionId === activeTabId)?.type
  const terminalTabs = tabs.filter((tab) => tab.type === 'terminal')

  useEffect(() => {
    if (activeTabType === 'session' || activeTabType === 'workbench') return
    void previewBridge.close()
  }, [activeTabType])

  let page: ReactNode = null
  if (!activeTabId || !activeTabType) {
    page = <EmptySession />
  } else if (activeTabType === 'settings') {
    page = <Settings />
  } else if (activeTabType === 'scheduled') {
    page = <ScheduledTasks />
  } else if (activeTabType === 'market') {
    page = <Market />
  } else if (activeTabType === 'science') {
    page = <ScienceWorkspace />
  } else if (activeTabType === 'trace') {
    const traceSessionId = tabs.find((t) => t.sessionId === activeTabId)?.traceSessionId
    page = traceSessionId ? <TraceSession sessionId={traceSessionId} /> : <EmptySession />
  } else if (activeTabType === 'traces') {
    page = <TraceList />
  } else if (activeTabType === 'subagent') {
    const subagentTab = tabs.find((t) => t.sessionId === activeTabId)
    page = subagentTab?.sourceSessionId && subagentTab.subagentToolUseId
      ? (
        <SubagentRunPage
          sourceSessionId={subagentTab.sourceSessionId}
          toolUseId={subagentTab.subagentToolUseId}
          title={subagentTab.title}
        />
      )
      : <EmptySession />
  } else if (activeTabType === 'workbench') {
    const workbenchTab = tabs.find((t) => t.sessionId === activeTabId)
    page = workbenchTab?.workbenchSessionId
      ? <WorkbenchTab tabId={activeTabId} sessionId={workbenchTab.workbenchSessionId} />
      : <EmptySession />
  } else if (activeTabType !== 'terminal') {
    page = <ActiveSession />
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {page && (
        <div className="absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden">
          <Suspense fallback={<RouteLoading />}>
            {page}
          </Suspense>
        </div>
      )}
      {terminalTabs.map((tab) => {
        const active = tab.sessionId === activeTabId
        const visible = activeTabType === 'terminal' && active
        return (
          <div
            key={tab.sessionId}
            aria-hidden={!visible}
            data-testid={`terminal-tab-panel-${tab.sessionId}`}
            className={`absolute inset-0 flex min-h-0 flex-col overflow-hidden ${
              visible ? 'z-20 opacity-100' : 'pointer-events-none z-0 opacity-0'
            }`}
          >
            <TerminalSettings
              active={active}
              cwd={tab.terminalCwd}
              runtimeId={tab.terminalRuntimeId ?? tab.sessionId}
              workspace
              testId={`terminal-host-${tab.sessionId}`}
              onNewTerminal={() => useTabStore.getState().openTerminalTab(tab.terminalCwd)}
            />
          </div>
        )
      })}
    </div>
  )
}

function RouteLoading() {
  const t = useTranslation()
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--color-surface)]" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]" aria-hidden="true" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
