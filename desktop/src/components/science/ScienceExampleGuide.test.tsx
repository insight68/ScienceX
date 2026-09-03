import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scienceApi } from '../../api/science'
import { runScienceExampleDemo } from '../../lib/scienceExampleDemo'
import { useSettingsStore } from '../../stores/settingsStore'
import type { ScienceExampleReport, ScienceProject } from '../../types/science'
import { ScienceExamplePanel } from './ScienceExampleGuide'

vi.mock('../../api/science', () => ({ scienceApi: { exampleReport: vi.fn(), saveExampleReport: vi.fn() } }))
vi.mock('../../lib/scienceExampleDemo', () => ({ runScienceExampleDemo: vi.fn() }))

const project: ScienceProject = {
  id: 'project', schemaVersion: 6, name: '模拟', question: '', rootDir: '/tmp/example', createdAt: '', updatedAt: '', rootAvailable: true,
  example: { schemaVersion: 1, exampleId: 'cell-viability-dose-response-v1', templateVersion: 1, projectId: 'project',
    simulatedData: true, locale: 'zh', materializedAt: '', scenarios: [{ id: 'missing-well', datasetId: 'd', datasetVersionId: 'v', experimentId: 'e' }] },
}
const report: ScienceExampleReport = {
  fileName: 'measured.md', markdown: '# actual run evidence', aiPrompt: 'Read run.json and cite the actual Run ID.',
  checks: [{ id: 'missing-well', title: '缺孔', passed: true, runId: 'failed-real-run', replayRunId: null,
    status: 'failed', verdict: null, datasetVersionId: 'v', inputCurrentness: 'current', relativeIc50: null,
    relativeIc50AbsoluteError: null, durationMs: 12, artifactCount: 0, errorMessage: 'A4 is missing' }],
}

beforeEach(() => { vi.resetAllMocks(); useSettingsStore.setState({ locale: 'zh' }) })
afterEach(cleanup)

describe('example evidence guide', () => {
  it('shows a verified rejection from actual report evidence and opens a separate review prompt', async () => {
    vi.mocked(scienceApi.exampleReport).mockResolvedValue(report)
    vi.mocked(scienceApi.saveExampleReport).mockResolvedValue({ ...report, savedPath: '/tmp/example/sciencex-demo-reports/actual.md' })
    const onSelect = vi.fn().mockResolvedValue(undefined)
    const onOpenReview = vi.fn().mockResolvedValue(undefined)
    render(<ScienceExamplePanel project={project} runCount={1} onSelect={onSelect} onOpenReview={onOpenReview} onRefresh={vi.fn()} />)
    expect(await screen.findByText('已验证')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /缺孔拦截/ }))
    expect(onSelect).toHaveBeenCalledWith('missing-well', 'failed-real-run')
    fireEvent.click(await screen.findByRole('button', { name: '展开演示步骤' }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AI 证据审阅' }))
    await waitFor(() => expect(onOpenReview).toHaveBeenCalledWith(report.aiPrompt))
    expect(runScienceExampleDemo).not.toHaveBeenCalled()
    expect(screen.getByText(/你发送后才调用所选模型/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存演示记录' }))
    expect(await screen.findByRole('status')).toHaveTextContent('/tmp/example/sciencex-demo-reports/actual.md')
    expect(scienceApi.saveExampleReport).toHaveBeenCalledWith('project', 'zh')
  })

  it('marks no steps complete before execution and retains unexpected failures for inspection', async () => {
    vi.mocked(scienceApi.exampleReport).mockResolvedValue({ ...report, checks: [] })
    vi.mocked(runScienceExampleDemo).mockRejectedValue(new Error('Snapshot integrity failed'))
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<ScienceExamplePanel project={project} runCount={0} onSelect={vi.fn()} onOpenReview={vi.fn()} onRefresh={refresh} />)
    expect(screen.getByText('待运行')).toBeInTheDocument()
    expect(screen.queryByText('已验证')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '运行完整演示' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Snapshot integrity failed')
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('已验证')).not.toBeInTheDocument()
  })
})
