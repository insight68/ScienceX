import type {
  LiteratureSearchResult,
  LiteratureSource,
  PaperVO,
} from '../types/literature'
import { api } from './client'

export const literatureApi = {
  async search(params: {
    query: string
    source?: LiteratureSource | 'aggregated'
    limit?: number
  }): Promise<LiteratureSearchResult> {
    const search = new URLSearchParams({ q: params.query })
    if (params.source) search.set('source', params.source)
    if (params.limit) search.set('limit', String(params.limit))
    return api.get<LiteratureSearchResult>(`/api/literature/search?${search.toString()}`)
  },

  async getPaper(id: string): Promise<PaperVO> {
    const response = await api.get<{ paper: PaperVO }>(
      `/api/literature/papers/${encodeURIComponent(id)}`,
    )
    return response.paper
  },

  async getReferences(id: string, limit = 20): Promise<PaperVO[]> {
    const response = await api.get<{ papers: PaperVO[] }>(
      `/api/literature/papers/${encodeURIComponent(id)}/references?limit=${limit}`,
    )
    return response.papers
  },

  async getCitations(id: string, limit = 20): Promise<PaperVO[]> {
    const response = await api.get<{ papers: PaperVO[] }>(
      `/api/literature/papers/${encodeURIComponent(id)}/citations?limit=${limit}`,
    )
    return response.papers
  },
}
