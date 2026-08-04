/**
 * PDF parsing service — calls a GROBID HTTP sidecar to extract structured
 * metadata (title, authors, abstract) from PDF files. GROBID is the academic
 * standard for PDF→TEI/XML conversion.
 *
 * GROBID docs: https://grobid.readthedocs.io/en/latest/
 * API: POST /api/processFulltextDocument (multipart/form-data, field "input")
 *
 * Configure via env:
 *   SCIENCEX_GROBID_URL (default http://localhost:8070)
 */

import * as fs from 'node:fs/promises'
import { ApiError } from '../middleware/errorHandler.js'

export type ParsedPdf = {
  title: string | null
  authors: string[]
  abstract: string | null
  doi: string | null
  rawTei: string
  grobidVersion: string | null
}

const GROBID_URL = process.env.SCIENCEX_GROBID_URL ?? 'http://localhost:8070'
const GROBID_TIMEOUT_MS = 120_000

async function checkGrobidHealth(): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)
  timer.unref?.()
  try {
    const res = await fetch(`${GROBID_URL}/api/isalive`, {
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new ApiError(
        503,
        `GROBID health check failed (${res.status}). Ensure GROBID is running at ${GROBID_URL}.`,
        'GROBID_UNAVAILABLE',
      )
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      503,
      `GROBID is not reachable at ${GROBID_URL}. Start it with: docker run -p 8070:8070 lfoppiano/grobid:0.8.1`,
      'GROBID_UNAVAILABLE',
    )
  } finally {
    clearTimeout(timer)
  }
}

// --- TEI XML extraction (regex-based to avoid an XML parser dependency) ---

function extractTag(xml: string, tag: string): string | null {
  // Match <tag ...>content</tag>, handling the TEI namespace.
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(re)
  return match ? match[1].trim() : null
}

function extractTitle(tei: string): string | null {
  const titleStmt = extractTag(tei, 'titleStmt')
  if (!titleStmt) return null
  // Prefer <title type="main" level="a">
  const mainMatch = titleStmt.match(
    /<title[^>]*type=["']main["'][^>]*level=["']a["'][^>]*>([\s\S]*?)<\/title>/i,
  )
  if (mainMatch) return cleanText(mainMatch[1])
  // Fallback: first <title> in titleStmt
  const anyMatch = titleStmt.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return anyMatch ? cleanText(anyMatch[1]) : null
}

function extractAuthors(tei: string): string[] {
  const authors: string[] = []
  // <author><persName><forename>...</forename><surname>...</surname></persName></author>
  const authorRegex =
    /<author[^>]*>[\s\S]*?<persName[^>]*>([\s\S]*?)<\/persName>[\s\S]*?<\/author>/gi
  let match: RegExpExecArray | null
  while ((match = authorRegex.exec(tei)) !== null) {
    const persName = match[1]
    const forenames = [...persName.matchAll(/<forename[^>]*>([\s\S]*?)<\/forename>/gi)].map(m =>
      cleanText(m[1]),
    )
    const surnames = [...persName.matchAll(/<surname[^>]*>([\s\S]*?)<\/surname>/gi)].map(m =>
      cleanText(m[1]),
    )
    const name = [...forenames, ...surnames].filter(Boolean).join(' ')
    if (name) authors.push(name)
  }
  return authors
}

function extractAbstract(tei: string): string | null {
  const abstractBlock = extractTag(tei, 'abstract')
  if (!abstractBlock) return null
  // Concatenate all <p> inside the abstract
  const paragraphs = [...abstractBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m =>
    cleanText(m[1]),
  )
  return paragraphs.filter(Boolean).join(' ') || null
}

function extractDoi(tei: string): string | null {
  // <idno type="DOI">10.xxxx/yyyy</idno>
  const match = tei.match(/<idno[^>]*type=["']DOI["'][^>]*>([\s\S]*?)<\/idno>/i)
  if (match) return cleanText(match[1])
  return null
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function parsePdf(filePath: string): Promise<ParsedPdf> {
  await checkGrobidHealth()

  const pdfBuffer = await fs.readFile(filePath)
  if (pdfBuffer.length === 0) {
    throw ApiError.badRequest('PDF file is empty')
  }

  // GROBID expects multipart/form-data with field "input" containing the PDF.
  const formData = new FormData()
  formData.append('input', new Blob([pdfBuffer], { type: 'application/pdf' }), 'paper.pdf')

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new Error('GROBID processing timeout')),
    GROBID_TIMEOUT_MS,
  )
  timer.unref?.()

  let response: Response
  try {
    response = await fetch(`${GROBID_URL}/api/processFulltextDocument`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      502,
      `GROBID request failed: ${error instanceof Error ? error.message : String(error)}`,
      'GROBID_REQUEST_FAILED',
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new ApiError(
      502,
      `GROBID returned ${response.status}: ${text.slice(0, 500)}`,
      'GROBID_PROCESSING_FAILED',
    )
  }

  const rawTei = await response.text()
  if (!rawTei.includes('<TEI')) {
    throw new ApiError(
      502,
      'GROBID returned non-TEI output — the PDF may be scanned or unparseable',
      'GROBID_INVALID_OUTPUT',
    )
  }

  return {
    title: extractTitle(rawTei),
    authors: extractAuthors(rawTei),
    abstract: extractAbstract(rawTei),
    doi: extractDoi(rawTei),
    rawTei,
    grobidVersion: response.headers.get('X-GROBID-Version') ?? null,
  }
}

export async function isGrobidAvailable(): Promise<boolean> {
  try {
    await checkGrobidHealth()
    return true
  } catch {
    return false
  }
}
