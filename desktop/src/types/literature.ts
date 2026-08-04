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
