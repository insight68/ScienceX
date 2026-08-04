import { api } from './client'

export type ParsedPdf = {
  title: string | null
  authors: string[]
  abstract: string | null
  doi: string | null
  rawTei: string
  grobidVersion: string | null
}

export const pdfParseApi = {
  async parse(filePath: string): Promise<ParsedPdf> {
    const response = await api.post<{ parsed: ParsedPdf }>('/api/pdf-parse', { filePath })
    return response.parsed
  },

  async health(): Promise<{ available: boolean }> {
    return api.get<{ available: boolean }>('/api/pdf-parse/health')
  },
}
