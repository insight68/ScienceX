import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scienceApi } from '../api/science'
import type { ScienceAnalysisRun, ScienceProject } from '../types/science'
import { runScienceExampleDemo } from './scienceExampleDemo'

vi.mock('../api/science', () => ({ scienceApi: {
  createDoseResponseRun: vi.fn(), replayRun: vi.fn(), listRuns: vi.fn(), exampleReport: vi.fn(),
} }))

const project: ScienceProject = {
  id: 'p', name: 'Simulated case', question: '', rootDir: '/tmp/example', schemaVersion: 6,
  createdAt: '', updatedAt: '', rootAvailable: true,
  example: {
    schemaVersion: 1, exampleId: 'cell-viability-dose-response-v1', templateVersion: 1,
    simulatedData: true, locale: 'en', materializedAt: '', projectId: 'p',
    scenarios: ['success', 'version-change', 'missing-well', 'weak-response'].map(id => ({
      id, experimentId: id, datasetId: `d-${id}`, datasetVersionId: `v-${id}`,
    })) as NonNullable<ScienceProject['example']>['scenarios'],
  },
}

beforeEach(() => { vi.resetAllMocks() })

describe('complete example demonstration', () => {
  it('uses real analysis/replay endpoints and only accepts a newly recorded expected rejection', async () => {
    const order: string[] = []
    vi.mocked(scienceApi.createDoseResponseRun).mockImplementation(async input => {
      order.push(`run:${input.experimentId}`)
      if (input.experimentId === 'missing-well') throw new Error('Input rejected')
      return { run: { id: input.experimentId } as ScienceAnalysisRun, artifacts: [] }
    })
    vi.mocked(scienceApi.replayRun).mockImplementation(async id => {
      order.push(`replay:${id}`)
      return { run: { id: `replay-${id}` } as ScienceAnalysisRun, artifacts: [] }
    })
    vi.mocked(scienceApi.listRuns).mockResolvedValueOnce([]).mockResolvedValueOnce([{
      id: 'failed-new', experimentId: 'missing-well', status: 'failed',
      errorMessage: 'Linked table is missing 1 assigned wells: A4',
    } as ScienceAnalysisRun])
    vi.mocked(scienceApi.exampleReport).mockResolvedValue({ checks: [], markdown: 'measured', aiPrompt: 'review', fileName: 'report.md' })
    const observed: string[] = []
    const report = await runScienceExampleDemo(project, 'en', id => observed.push(id))
    expect(order).toEqual(['run:success', 'replay:success', 'run:version-change', 'replay:version-change', 'run:missing-well', 'run:weak-response'])
    expect(observed).toEqual(['success', 'version-change', 'missing-well', 'weak-response'])
    expect(report.markdown).toBe('measured')
    expect(scienceApi.exampleReport).toHaveBeenCalledWith('p', 'en')
  })

  it('does not disguise transport failures as a successful missing-well demonstration', async () => {
    const missingOnly = { ...project, example: { ...project.example!, scenarios: [project.example!.scenarios[2]!] } }
    const old = { id: 'old', experimentId: 'missing-well', status: 'failed', errorMessage: 'Linked table is missing 1 assigned wells: A4' } as ScienceAnalysisRun
    vi.mocked(scienceApi.listRuns).mockResolvedValue([old])
    vi.mocked(scienceApi.createDoseResponseRun).mockRejectedValue(new Error('Server unavailable'))
    await expect(runScienceExampleDemo(missingOnly, 'en', () => undefined)).rejects.toThrow('Server unavailable')
    expect(scienceApi.exampleReport).not.toHaveBeenCalled()
  })

  it('stops on an unexpected analysis failure instead of marking later steps complete', async () => {
    vi.mocked(scienceApi.createDoseResponseRun).mockRejectedValue(new Error('Snapshot integrity failed'))
    await expect(runScienceExampleDemo(project, 'en', () => undefined)).rejects.toThrow('Snapshot integrity failed')
    expect(scienceApi.replayRun).not.toHaveBeenCalled()
    expect(scienceApi.createDoseResponseRun).toHaveBeenCalledTimes(1)
  })
})
