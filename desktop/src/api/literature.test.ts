import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultBaseUrl, setBaseUrl } from './client'
import { literatureApi } from './literature'

describe('literatureApi', () => {
  afterEach(() => {
    setBaseUrl(getDefaultBaseUrl())
    vi.restoreAllMocks()
  })

  it('sends a search request with query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          papers: [
            {
              id: 'semantic-scholar:abc',
              source: 'semantic-scholar',
              title: 'Attention Is All You Need',
              authors: ['Ashish Vaswani'],
              year: 2017,
            },
          ],
          total: 1,
          source: 'semantic-scholar',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    setBaseUrl('http://127.0.0.1:49237')
    const result = await literatureApi.search({
      query: 'attention transformer',
      source: 'semantic-scholar',
      limit: 5,
    })

    expect(result.papers).toHaveLength(1)
    const firstPaper = result.papers[0]
    expect(firstPaper).toBeDefined()
    expect(firstPaper!.title).toBe('Attention Is All You Need')
    const firstCall = fetchMock.mock.calls[0]?.[0]
    expect(firstCall).toBeDefined()
    const calledUrl = new URL(firstCall as string)
    expect(calledUrl.pathname).toBe('/api/literature/search')
    expect(calledUrl.searchParams.get('q')).toBe('attention transformer')
    expect(calledUrl.searchParams.get('source')).toBe('semantic-scholar')
    expect(calledUrl.searchParams.get('limit')).toBe('5')
  })

  it('fetches a single paper by encoded id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          paper: {
            id: 'arxiv:1706.03762',
            source: 'arxiv',
            title: 'Attention Is All You Need',
            authors: ['Ashish Vaswani'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    setBaseUrl('http://127.0.0.1:49237')
    const paper = await literatureApi.getPaper('arxiv:1706.03762')

    expect(paper.id).toBe('arxiv:1706.03762')
    const firstCall = fetchMock.mock.calls[0]?.[0]
    expect(firstCall).toBeDefined()
    const calledUrl = new URL(firstCall as string)
    expect(calledUrl.pathname).toBe('/api/literature/papers/arxiv%3A1706.03762')
  })

  it('fetches references for a paper', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          papers: [
            {
              id: 'semantic-scholar:ref1',
              source: 'semantic-scholar',
              title: 'Sequence to Sequence Learning',
              authors: ['Ilya Sutskever'],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    setBaseUrl('http://127.0.0.1:49237')
    const papers = await literatureApi.getReferences('semantic-scholar:abc', 10)

    expect(papers).toHaveLength(1)
    const firstPaper = papers[0]
    expect(firstPaper).toBeDefined()
    expect(firstPaper!.title).toBe('Sequence to Sequence Learning')
    const firstCall = fetchMock.mock.calls[0]?.[0]
    expect(firstCall).toBeDefined()
    const calledUrl = new URL(firstCall as string)
    expect(calledUrl.pathname).toBe('/api/literature/papers/semantic-scholar%3Aabc/references')
    expect(calledUrl.searchParams.get('limit')).toBe('10')
  })
})
