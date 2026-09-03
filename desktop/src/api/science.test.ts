import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultBaseUrl, setBaseUrl } from './client'
import { scienceApi } from './science'

afterEach(() => { setBaseUrl(getDefaultBaseUrl()); vi.restoreAllMocks() })

describe('Science example transport', () => {
  it('lists, materializes and exports a project report without starting analysis or a model', async () => {
    setBaseUrl('http://127.0.0.1:49317')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const responses = [{ examples: [{ id: 'case', title: 'Local example' }] }, { project: { id: 'p' }, dataset: { id: 'd' }, experiment: { id: 'e' } }, { markdown: '# real report', checks: [], aiPrompt: 'review', fileName: 'report.md' }, { markdown: '# saved report', savedPath: '/tmp/example/report.md' }]
    for (const body of responses) fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }))
    expect((await scienceApi.listExamples('zh-CN'))[0]?.id).toBe('case')
    expect((await scienceApi.materializeExample({ exampleId: 'case/id', parentDir: '/tmp/example parent', locale: 'zh-CN', includeChallenges: true })).project.id).toBe('p')
    expect((await scienceApi.exampleReport('project/id', 'zh-CN')).markdown).toBe('# real report')
    expect((await scienceApi.saveExampleReport('project/id', 'zh-CN')).savedPath).toBe('/tmp/example/report.md')
    expect(fetchMock.mock.calls.map(call => String(call[0]))).toEqual([
      'http://127.0.0.1:49317/api/science-examples?locale=zh-CN',
      'http://127.0.0.1:49317/api/science-examples/case%2Fid/materialize',
      'http://127.0.0.1:49317/api/research-projects/project%2Fid/example-report?locale=zh-CN',
      'http://127.0.0.1:49317/api/research-projects/project%2Fid/example-report?locale=zh-CN',
    ])
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ parentDir: '/tmp/example parent', locale: 'zh-CN', includeChallenges: true })
  })

  it('preserves the actionable server error when creation fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Partial files preserved; retry creates a new copy.' }), { status: 500 }))
    await expect(scienceApi.materializeExample({ exampleId: 'case', parentDir: '/tmp/p', locale: 'en', includeChallenges: false })).rejects.toThrow('Partial files preserved')
  })
})
