import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { handleApiRequest } from '../router.js'

const originalFetch = globalThis.fetch

type ApiResult = {
  status: number
  body: Record<string, any>
}

async function callApi(
  pathname: string,
  options?: { method?: string },
): Promise<ApiResult> {
  const url = new URL(`http://localhost:3456${pathname}`)
  const request = new Request(url, { method: options?.method ?? 'GET' })
  const response = await handleApiRequest(request, url)
  return {
    status: response.status,
    body: await response.json() as Record<string, any>,
  }
}

function stubUpstreams(handler: (url: string) => { status?: number; body: string } | undefined) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const result = handler(url)
    if (!result) return new Response('Not found', { status: 404 })
    return new Response(result.body, { status: result.status ?? 200 })
  }) as typeof fetch
}

const S2_SEARCH_BODY = JSON.stringify({
  total: 1,
  data: [
    {
      paperId: 'abc123',
      title: 'Attention Is All You Need',
      abstract: 'We propose a new network architecture...',
      tldr: { text: 'Transformers replace recurrence with attention.' },
      authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
      year: 2017,
      venue: 'NeurIPS',
      externalIds: { DOI: '10.5555/3295222.3295349' },
      citationCount: 90000,
      referenceCount: 40,
      openAccessPdf: { url: 'https://example.org/attention.pdf' },
      url: 'https://example.org/attention',
    },
  ],
})

const S2_PAPER_BODY = JSON.stringify({
  paperId: 'abc123',
  title: 'Attention Is All You Need',
  abstract: 'We propose a new network architecture...',
  tldr: { text: 'Transformers replace recurrence with attention.' },
  authors: [{ name: 'Ashish Vaswani' }],
  year: 2017,
  venue: 'NeurIPS',
  externalIds: { DOI: '10.5555/3295222.3295349' },
  citationCount: 90000,
  referenceCount: 40,
})

const S2_REFERENCES_BODY = JSON.stringify({
  data: [
    {
      reference: {
        paperId: 'ref1',
        title: 'Sequence to Sequence Learning',
        authors: [{ name: 'Ilya Sutskever' }],
        year: 2014,
      },
    },
  ],
})

const S2_CITATIONS_BODY = JSON.stringify({
  data: [
    {
      citingPaper: {
        paperId: 'cite1',
        title: 'BERT: Pre-training of Deep Transformers',
        authors: [{ name: 'Jacob Devlin' }],
        year: 2019,
      },
    },
  ],
})

const OPENALEX_SEARCH_BODY = JSON.stringify({
  meta: { count: 1 },
  results: [
    {
      id: 'https://openalex.org/W2951003811',
      doi: 'https://doi.org/10.5555/3295222.3295349',
      display_name: 'Attention Is All You Need',
      abstract_inverted_index: { We: [0], propose: [1] },
      authorships: [{ author: { display_name: 'Ashish Vaswani' } }],
      publication_year: 2017,
      primary_location: { source: { display_name: 'NeurIPS' } },
      cited_by_count: 90000,
      referenced_works: ['https://openalex.org/W1', 'https://openalex.org/W2'],
    },
  ],
})

const ARXIV_SEARCH_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">1</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/1706.03762v5</id>
    <title>Attention Is All You Need</title>
    <summary>The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.</summary>
    <published>2017-06-12T00:00:00Z</published>
    <author><name>Ashish Vaswani</name></author>
    <link href="http://arxiv.org/abs/1706.03762v5" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/1706.03762v5" rel="related" type="application/pdf"/>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" />
  </entry>
</feed>`

beforeEach(() => {
  // Ensure no real API key leaks into tests.
  delete process.env.SCIENCEX_SEMANTIC_SCHOLAR_API_KEY
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /api/literature/search', () => {
  it('returns 400 when query is missing', async () => {
    const { status, body } = await callApi('/api/literature/search')
    expect(status).toBe(400)
    expect(body.error).toBe('BAD_REQUEST')
  })

  it('returns aggregated results from all three sources', async () => {
    stubUpstreams(url => {
      if (url.includes('api.semanticscholar.org')) return { body: S2_SEARCH_BODY }
      if (url.includes('api.openalex.org')) return { body: OPENALEX_SEARCH_BODY }
      if (url.includes('export.arxiv.org')) return { body: ARXIV_SEARCH_BODY }
      return undefined
    })

    const { status, body } = await callApi('/api/literature/search?q=attention+transformer&limit=10')
    expect(status).toBe(200)
    expect(body.source).toBe('aggregated')
    expect(body.papers.length).toBeGreaterThan(0)

    const sources = new Set(body.papers.map((p: any) => p.source))
    expect(sources.has('semantic-scholar')).toBe(true)
    expect(sources.has('openalex')).toBe(true)
    expect(sources.has('arxiv')).toBe(true)
  })

  it('de-duplicates by DOI across sources', async () => {
    stubUpstreams(url => {
      if (url.includes('api.semanticscholar.org')) return { body: S2_SEARCH_BODY }
      if (url.includes('api.openalex.org')) return { body: OPENALEX_SEARCH_BODY }
      if (url.includes('export.arxiv.org')) return { body: ARXIV_SEARCH_BODY }
      return undefined
    })

    const { body } = await callApi('/api/literature/search?q=test&limit=10')
    const dois = body.papers.map((p: any) => p.doi).filter(Boolean)
    const unique = new Set(dois.map((d: string) => d.toLowerCase()))
    expect(unique.size).toBe(dois.length)
  })

  it('returns partial results when one upstream fails', async () => {
    stubUpstreams(url => {
      if (url.includes('api.semanticscholar.org')) return { status: 500, body: '{}' }
      if (url.includes('api.openalex.org')) return { body: OPENALEX_SEARCH_BODY }
      if (url.includes('export.arxiv.org')) return { body: ARXIV_SEARCH_BODY }
      return undefined
    })

    const { status, body } = await callApi('/api/literature/search?q=test&limit=5')
    expect(status).toBe(200)
    expect(body.papers.length).toBeGreaterThan(0)
    expect(body.papers.some((p: any) => p.source === 'openalex')).toBe(true)
  })

  it('queries a single source when source=arxiv', async () => {
    let arxivHit = false
    let s2Hit = false
    stubUpstreams(url => {
      if (url.includes('export.arxiv.org')) {
        arxivHit = true
        return { body: ARXIV_SEARCH_BODY }
      }
      if (url.includes('api.semanticscholar.org')) {
        s2Hit = true
        return { body: '{}' }
      }
      return undefined
    })

    const { status, body } = await callApi('/api/literature/search?q=test&source=arxiv')
    expect(status).toBe(200)
    expect(body.source).toBe('arxiv')
    expect(arxivHit).toBe(true)
    expect(s2Hit).toBe(false)
  })
})

describe('GET /api/literature/papers/:id', () => {
  it('returns a single Semantic Scholar paper', async () => {
    stubUpstreams(url => {
      if (url.includes('api.semanticscholar.org/graph/v1/paper/abc123')) {
        return { body: S2_PAPER_BODY }
      }
      return undefined
    })

    const { status, body } = await callApi('/api/literature/papers/semantic-scholar%3Aabc123')
    expect(status).toBe(200)
    expect(body.paper.id).toBe('semantic-scholar:abc123')
    expect(body.paper.title).toBe('Attention Is All You Need')
    expect(body.paper.tldr).toBe('Transformers replace recurrence with attention.')
  })

  it('returns 400 for an invalid paper id', async () => {
    const { status } = await callApi('/api/literature/papers/invalid-no-prefix')
    expect(status).toBe(400)
  })

  it('returns 404 when arXiv paper is not found', async () => {
    stubUpstreams(url => {
      if (url.includes('export.arxiv.org')) {
        return { body: '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>' }
      }
      return undefined
    })

    const { status } = await callApi('/api/literature/papers/arxiv%3A0000.0000')
    expect(status).toBe(404)
  })
})

describe('GET /api/literature/papers/:id/references', () => {
  it('returns references for a Semantic Scholar paper', async () => {
    stubUpstreams(url => {
      if (url.includes('api.semanticscholar.org/graph/v1/paper/abc123/references')) {
        return { body: S2_REFERENCES_BODY }
      }
      return undefined
    })

    const { status, body } = await callApi(
      '/api/literature/papers/semantic-scholar%3Aabc123/references?limit=10',
    )
    expect(status).toBe(200)
    expect(body.papers).toHaveLength(1)
    expect(body.papers[0].title).toBe('Sequence to Sequence Learning')
  })

  it('rejects references for an arXiv paper', async () => {
    const { status, body } = await callApi(
      '/api/literature/papers/arxiv%3A1706.03762/references',
    )
    expect(status).toBe(400)
    expect(body.message).toContain('Semantic Scholar')
  })
})

describe('GET /api/literature/papers/:id/citations', () => {
  it('returns citations for a Semantic Scholar paper', async () => {
    stubUpstreams(url => {
      if (url.includes('api.semanticscholar.org/graph/v1/paper/abc123/citations')) {
        return { body: S2_CITATIONS_BODY }
      }
      return undefined
    })

    const { status, body } = await callApi(
      '/api/literature/papers/semantic-scholar%3Aabc123/citations?limit=5',
    )
    expect(status).toBe(200)
    expect(body.papers).toHaveLength(1)
    expect(body.papers[0].title).toBe('BERT: Pre-training of Deep Transformers')
  })
})
