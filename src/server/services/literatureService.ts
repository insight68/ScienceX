/**
 * Literature search service — aggregates Semantic Scholar, OpenAlex, and arXiv
 * into a unified PaperVO. All upstream calls go through globalThis.fetch so
 * tests can stub them via the same pattern used in market-api.test.ts.
 *
 * Upstream docs:
 * - Semantic Scholar: https://api.semanticscholar.org/graph/v1
 * - OpenAlex: https://api.openalex.org/works
 * - arXiv: https://export.arxiv.org/api/query (Atom XML)
 */

import { ApiError } from '../middleware/errorHandler.js'

export type LiteratureSource = 'semantic-scholar' | 'openalex' | 'arxiv'

export type PaperVO = {
  id: string
  source: LiteratureSource
  title: string
  abstract?: string
  tldr?: string
  authors: string[]
  year?: number
  venue?: string
  doi?: string
  url?: string
  citationCount?: number
  referenceCount?: number
  externalIds?: Record<string, string>
}

export type LiteratureSearchResult = {
  papers: PaperVO[]
  total: number
  source: LiteratureSource | 'aggregated'
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const SEMANTIC_SCHOLAR_BASE =
  process.env.SCIENCEX_SEMANTIC_SCHOLAR_BASE ?? 'https://api.semanticscholar.org/graph/v1'
const OPENALEX_BASE = process.env.SCIENCEX_OPENALEX_BASE ?? 'https://api.openalex.org'
const ARXIV_BASE = process.env.SCIENCEX_ARXIV_BASE ?? 'https://export.arxiv.org/api'

function getSemanticScholarApiKey(): string | undefined {
  return process.env.SCIENCEX_SEMANTIC_SCHOLAR_API_KEY?.trim() || undefined
}

function withTimeout(signal?: AbortSignal, ms = DEFAULT_TIMEOUT_MS): AbortSignal {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('literature request timeout')), ms)
  timer.unref?.()
  if (signal?.aborted) controller.abort(signal.reason)
  else signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  return controller.signal
}

function safeFetch(url: string, init: RequestInit = {}, ms?: number): Promise<Response> {
  return fetch(url, { ...init, signal: withTimeout(init.signal, ms) })
}

function clampLimit(limit?: number): number {
  const n = limit ?? DEFAULT_LIMIT
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
}

function normalizeYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

// --- Semantic Scholar ---

const S2_FIELDS = [
  'paperId',
  'title',
  'abstract',
  'tldr',
  'authors',
  'year',
  'venue',
  'externalIds',
  'citationCount',
  'referenceCount',
  'openAccessPdf',
  'url',
].join(',')

type S2Paper = {
  paperId: string
  title?: string
  abstract?: string
  tldr?: { text?: string } | null
  authors?: Array<{ name?: string }>
  year?: number | string | null
  venue?: string
  externalIds?: Record<string, string>
  citationCount?: number
  referenceCount?: number
  openAccessPdf?: { url?: string } | null
  url?: string
}

function mapS2Paper(p: S2Paper): PaperVO {
  return {
    id: `semantic-scholar:${p.paperId}`,
    source: 'semantic-scholar',
    title: p.title ?? '(untitled)',
    abstract: p.abstract,
    tldr: p.tldr?.text ?? undefined,
    authors: (p.authors ?? []).map(a => a.name ?? '').filter(Boolean),
    year: normalizeYear(p.year),
    venue: p.venue || undefined,
    doi: p.externalIds?.DOI,
    url: p.openAccessPdf?.url ?? p.url ?? undefined,
    citationCount: p.citationCount,
    referenceCount: p.referenceCount,
    externalIds: p.externalIds,
  }
}

async function searchSemanticScholar(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{ papers: PaperVO[]; total: number }> {
  const url = new URL(`${SEMANTIC_SCHOLAR_BASE}/paper/search`)
  url.searchParams.set('query', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('fields', S2_FIELDS)
  const headers: Record<string, string> = {}
  const apiKey = getSemanticScholarApiKey()
  if (apiKey) headers['x-api-key'] = apiKey
  const res = await safeFetch(url.toString(), { headers, signal })
  if (!res.ok) {
    throw new ApiError(res.status, `Semantic Scholar search failed: ${res.status}`, 'UPSTREAM_ERROR')
  }
  const body = (await res.json()) as { data?: S2Paper[]; total?: number }
  return {
    papers: (body.data ?? []).map(mapS2Paper),
    total: body.total ?? 0,
  }
}

async function getSemanticScholarPaper(
  paperId: string,
  signal?: AbortSignal,
): Promise<PaperVO> {
  const url = new URL(`${SEMANTIC_SCHOLAR_BASE}/paper/${encodeURIComponent(paperId)}`)
  url.searchParams.set('fields', S2_FIELDS)
  const headers: Record<string, string> = {}
  const apiKey = getSemanticScholarApiKey()
  if (apiKey) headers['x-api-key'] = apiKey
  const res = await safeFetch(url.toString(), { headers, signal })
  if (!res.ok) {
    throw new ApiError(res.status, `Semantic Scholar get failed: ${res.status}`, 'UPSTREAM_ERROR')
  }
  return mapS2Paper((await res.json()) as S2Paper)
}

async function getSemanticScholarLinks(
  paperId: string,
  kind: 'references' | 'citations',
  limit: number,
  signal?: AbortSignal,
): Promise<PaperVO[]> {
  const url = new URL(`${SEMANTIC_SCHOLAR_BASE}/paper/${encodeURIComponent(paperId)}/${kind}`)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('fields', S2_FIELDS)
  const headers: Record<string, string> = {}
  const apiKey = getSemanticScholarApiKey()
  if (apiKey) headers['x-api-key'] = apiKey
  const res = await safeFetch(url.toString(), { headers, signal })
  if (!res.ok) {
    throw new ApiError(res.status, `Semantic Scholar ${kind} failed: ${res.status}`, 'UPSTREAM_ERROR')
  }
  const body = (await res.json()) as {
    data?: Array<{ citingPaper?: S2Paper; reference?: S2Paper }>
  }
  const key = kind === 'citations' ? 'citingPaper' : 'reference'
  return (body.data ?? [])
    .map(entry => entry[key])
    .filter((p): p is S2Paper => !!p)
    .map(mapS2Paper)
}

// --- OpenAlex ---

type OpenAlexWork = {
  id: string
  doi?: string | null
  title?: string
  display_name?: string
  abstract_inverted_index?: Record<string, number[]> | null
  authorships?: Array<{ author?: { display_name?: string } }>
  publication_year?: number | null
  host_venue?: { display_name?: string } | null
  primary_location?: { source?: { display_name?: string } | null }
  cited_by_count?: number
  referenced_works?: string[]
  ids?: { doi?: string | null; openalex?: string | null }
  id_url?: string
}

function reconstructAbstract(inverted?: Record<string, number[]> | null): string | undefined {
  if (!inverted) return undefined
  const positions: Array<{ word: string; pos: number }> = []
  for (const [word, indices] of Object.entries(inverted)) {
    for (const pos of indices) positions.push({ word, pos })
  }
  if (positions.length === 0) return undefined
  positions.sort((a, b) => a.pos - b.pos)
  return positions.map(p => p.word).join(' ')
}

function extractOpenAlexId(workId: string): string {
  const match = workId.match(/W\d+$/)
  return match ? match[0] : workId
}

function mapOpenAlexWork(w: OpenAlexWork): PaperVO {
  const openalexId = extractOpenAlexId(w.id)
  return {
    id: `openalex:${openalexId}`,
    source: 'openalex',
    title: w.display_name ?? w.title ?? '(untitled)',
    abstract: reconstructAbstract(w.abstract_inverted_index),
    authors: (w.authorships ?? [])
      .map(a => a.author?.display_name ?? '')
      .filter(Boolean),
    year: w.publication_year ?? undefined,
    venue:
      w.primary_location?.source?.display_name ??
      w.host_venue?.display_name ??
      undefined,
    doi: w.doi ?? w.ids?.doi ?? undefined,
    url: w.doi ?? w.id ?? undefined,
    citationCount: w.cited_by_count,
    referenceCount: w.referenced_works?.length,
    externalIds: {
      openalex: openalexId,
      ...(w.doi ? { doi: w.doi } : {}),
    },
  }
}

async function searchOpenAlex(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{ papers: PaperVO[]; total: number }> {
  const url = new URL(`${OPENALEX_BASE}/works`)
  url.searchParams.set('search', query)
  url.searchParams.set('per-page', String(limit))
  url.searchParams.set('mailto', process.env.SCIENCEX_OPENALEX_MAILTO ?? 'sciencex@localhost')
  const res = await safeFetch(url.toString(), { signal })
  if (!res.ok) {
    throw new ApiError(res.status, `OpenAlex search failed: ${res.status}`, 'UPSTREAM_ERROR')
  }
  const body = (await res.json()) as { results?: OpenAlexWork[]; meta?: { count?: number } }
  return {
    papers: (body.results ?? []).map(mapOpenAlexWork),
    total: body.meta?.count ?? 0,
  }
}

// --- arXiv ---

type ArxivEntry = {
  id?: string
  title?: string
  summary?: string
  author?: Array<{ name?: string }>
  published?: string
  link?: Array<{ href?: string; rel?: string }>
  'arxiv:primary_category'?: { term?: string }
}

function mapArxivEntry(entry: ArxivEntry): PaperVO {
  const rawId = entry.id ?? ''
  const arxivId = rawId.split('/abs/').pop() ?? rawId
  const pdfLink = entry.link?.find(l => l.rel === 'related' && l.href?.includes('pdf'))
  const absLink = entry.link?.find(l => l.rel === 'alternate')
  const year = entry.published ? Number.parseInt(entry.published.slice(0, 4), 10) : undefined
  return {
    id: `arxiv:${arxivId}`,
    source: 'arxiv',
    title: (entry.title ?? '(untitled)').replace(/\s+/g, ' ').trim(),
    abstract: entry.summary?.replace(/\s+/g, ' ').trim(),
    authors: (entry.author ?? []).map(a => a.name ?? '').filter(Boolean),
    year,
    venue: entry['arxiv:primary_category']?.term
      ? `arXiv [${entry['arxiv:primary_category'].term}]`
      : 'arXiv',
    url: absLink?.href ?? rawId,
    externalIds: { arxiv: arxivId },
  }
}

function parseArxivAtom(xml: string): { entries: ArxivEntry[]; total: number } {
  const entries: ArxivEntry[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1]
    const pick = (tag: string): string | undefined => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
      return m ? m[1].trim() : undefined
    }
    const pickAttr = (tag: string, attr: string): string | undefined => {
      const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`))
      return m ? m[1] : undefined
    }
    const id = pick('id')
    const title = pick('title')
    const summary = pick('summary')
    const published = pick('published')
    const authors: Array<{ name?: string }> = []
    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g
    let am: RegExpExecArray | null
    while ((am = authorRegex.exec(block)) !== null) {
      authors.push({ name: am[1].trim() })
    }
    const links: Array<{ href?: string; rel?: string }> = []
    const linkRegex = /<link\s+([^/]+)\/>/g
    let lm: RegExpExecArray | null
    while ((lm = linkRegex.exec(block)) !== null) {
      const attrs = lm[1]
      const href = attrs.match(/href="([^"]*)"/)?.[1]
      const rel = attrs.match(/rel="([^"]*)"/)?.[1]
      if (href) links.push({ href, rel })
    }
    const primaryCategory = pickAttr('arxiv:primary_category', 'term')
    entries.push({
      id,
      title,
      summary,
      author: authors,
      published,
      link: links,
      'arxiv:primary_category': primaryCategory ? { term: primaryCategory } : undefined,
    })
  }
  const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/)
  const total = totalMatch ? Number.parseInt(totalMatch[1], 10) : entries.length
  return { entries, total }
}

async function searchArxiv(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{ papers: PaperVO[]; total: number }> {
  const url = new URL(`${ARXIV_BASE}/query`)
  url.searchParams.set('search_query', `all:${query}`)
  url.searchParams.set('start', '0')
  url.searchParams.set('max_results', String(limit))
  const res = await safeFetch(url.toString(), { signal })
  if (!res.ok) {
    throw new ApiError(res.status, `arXiv search failed: ${res.status}`, 'UPSTREAM_ERROR')
  }
  const xml = await res.text()
  const { entries, total } = parseArxivAtom(xml)
  return { papers: entries.map(mapArxivEntry), total }
}

// --- Public API ---

function parsePaperId(id: string): { source: LiteratureSource; originalId: string } {
  const idx = id.indexOf(':')
  if (idx <= 0) {
    throw ApiError.badRequest(`Invalid paper id: ${id}`)
  }
  const source = id.slice(0, idx) as LiteratureSource
  const originalId = id.slice(idx + 1)
  if (!['semantic-scholar', 'openalex', 'arxiv'].includes(source) || !originalId) {
    throw ApiError.badRequest(`Invalid paper id: ${id}`)
  }
  return { source, originalId }
}

export async function searchLiterature(params: {
  query: string
  source?: LiteratureSource | 'aggregated'
  limit?: number
  signal?: AbortSignal
}): Promise<LiteratureSearchResult> {
  const query = params.query.trim()
  if (!query) {
    throw ApiError.badRequest('Query must not be empty')
  }
  const limit = clampLimit(params.limit)
  const source = params.source ?? 'aggregated'

  if (source === 'semantic-scholar') {
    const r = await searchSemanticScholar(query, limit, params.signal)
    return { papers: r.papers, total: r.total, source }
  }
  if (source === 'openalex') {
    const r = await searchOpenAlex(query, limit, params.signal)
    return { papers: r.papers, total: r.total, source }
  }
  if (source === 'arxiv') {
    const r = await searchArxiv(query, limit, params.signal)
    return { papers: r.papers, total: r.total, source }
  }

  // Aggregated: race all three, never let one failure blank the others.
  const results = await Promise.allSettled([
    searchSemanticScholar(query, limit, params.signal),
    searchOpenAlex(query, limit, params.signal),
    searchArxiv(query, limit, params.signal),
  ])
  const papers: PaperVO[] = []
  let total = 0
  for (const r of results) {
    if (r.status === 'fulfilled') {
      papers.push(...r.value.papers)
      total += r.value.total
    }
  }
  // Sort by citationCount desc (missing → treat as 0), then by title for stability.
  papers.sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0) || a.title.localeCompare(b.title))
  // De-dup by DOI when present
  const seen = new Set<string>()
  const deduped = papers.filter(p => {
    if (!p.doi) return true
    const key = p.doi.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { papers: deduped.slice(0, limit), total, source: 'aggregated' }
}

export async function getPaper(id: string, signal?: AbortSignal): Promise<PaperVO> {
  const { source, originalId } = parsePaperId(id)
  if (source === 'semantic-scholar') {
    return getSemanticScholarPaper(originalId, signal)
  }
  if (source === 'openalex') {
    const url = new URL(`${OPENALEX_BASE}/works/${encodeURIComponent(originalId)}`)
    url.searchParams.set('mailto', process.env.SCIENCEX_OPENALEX_MAILTO ?? 'sciencex@localhost')
    const res = await safeFetch(url.toString(), { signal })
    if (!res.ok) {
      throw new ApiError(res.status, `OpenAlex get failed: ${res.status}`, 'UPSTREAM_ERROR')
    }
    return mapOpenAlexWork((await res.json()) as OpenAlexWork)
  }
  // arXiv
  const url = new URL(`${ARXIV_BASE}/query`)
  url.searchParams.set('id_list', originalId)
  const res = await safeFetch(url.toString(), { signal })
  if (!res.ok) {
    throw new ApiError(res.status, `arXiv get failed: ${res.status}`, 'UPSTREAM_ERROR')
  }
  const { entries } = parseArxivAtom(await res.text())
  if (entries.length === 0) {
    throw ApiError.notFound(`arXiv paper not found: ${originalId}`)
  }
  return mapArxivEntry(entries[0])
}

export async function getReferences(
  id: string,
  limit: number,
  signal?: AbortSignal,
): Promise<PaperVO[]> {
  const { source, originalId } = parsePaperId(id)
  if (source !== 'semantic-scholar') {
    throw ApiError.badRequest('References are only available for Semantic Scholar papers')
  }
  return getSemanticScholarLinks(originalId, 'references', clampLimit(limit), signal)
}

export async function getCitations(
  id: string,
  limit: number,
  signal?: AbortSignal,
): Promise<PaperVO[]> {
  const { source, originalId } = parsePaperId(id)
  if (source !== 'semantic-scholar') {
    throw ApiError.badRequest('Citations are only available for Semantic Scholar papers')
  }
  return getSemanticScholarLinks(originalId, 'citations', clampLimit(limit), signal)
}
