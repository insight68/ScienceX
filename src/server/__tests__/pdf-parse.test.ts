import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { handleApiRequest } from '../router.js'

const originalFetch = globalThis.fetch

const GROBID_TEI = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title level="a" type="main">Attention Is All You Need</title>
      </titleStmt>
    </fileDesc>
    <profileDesc>
      <abstract>
        <div>
          <p>The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.</p>
        </div>
      </abstract>
    </profileDesc>
    <sourceDesc>
      <biblStruct>
        <idno type="DOI">10.5555/3295222.3295349</idno>
      </biblStruct>
    </sourceDesc>
  </teiHeader>
  <text>
    <front>
      <div>
        <author>
          <persName>
            <forename type="first">Ashish</forename>
            <surname>Vaswani</surname>
          </persName>
        </author>
        <author>
          <persName>
            <forename type="first">Noam</forename>
            <surname>Shazeer</surname>
          </persName>
        </author>
      </div>
    </front>
  </text>
</TEI>`

type ApiResult = {
  status: number
  body: Record<string, any>
}

async function callApi(
  pathname: string,
  options?: { method?: string; body?: unknown },
): Promise<ApiResult> {
  const url = new URL(`http://localhost:3456${pathname}`)
  const request = new Request(url, {
    method: options?.method ?? 'GET',
    headers: options?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const response = await handleApiRequest(request, url)
  return {
    status: response.status,
    body: await response.json() as Record<string, any>,
  }
}

function stubGrobid(
  handler: (url: string, init?: RequestInit) => { status?: number; body: string } | undefined,
) {
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const result = handler(url, init)
    if (!result) return new Response('Not found', { status: 404 })
    return new Response(result.body, {
      status: result.status ?? 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }) as typeof fetch
}

let tmpDir: string
let pdfPath: string

beforeEach(async () => {
  // Use /tmp (not os.tmpdir()) so isAllowedFilesystemPath permits the path.
  tmpDir = await fs.mkdtemp('/tmp/pdf-parse-test-')
  pdfPath = path.join(tmpDir, 'paper.pdf')
  await fs.writeFile(pdfPath, Buffer.from('%PDF-1.4 fake pdf content'))
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('GET /api/pdf-parse/health', () => {
  it('returns available=true when GROBID is reachable', async () => {
    stubGrobid(url => {
      if (url.includes('/api/isalive')) return { body: 'true' }
      return undefined
    })

    const { status, body } = await callApi('/api/pdf-parse/health')
    expect(status).toBe(200)
    expect(body.available).toBe(true)
  })

  it('returns available=false when GROBID is unreachable', async () => {
    stubGrobid(() => undefined)

    const { status, body } = await callApi('/api/pdf-parse/health')
    expect(status).toBe(200)
    expect(body.available).toBe(false)
  })
})

describe('POST /api/pdf-parse', () => {
  it('returns 503 when GROBID is unavailable', async () => {
    stubGrobid(url => {
      if (url.includes('/api/isalive')) return { status: 500, body: '' }
      return undefined
    })

    const { status, body } = await callApi('/api/pdf-parse', {
      method: 'POST',
      body: { filePath: pdfPath },
    })
    expect(status).toBe(503)
    expect(body.error).toBe('GROBID_UNAVAILABLE')
  })

  it('returns 403 for a path outside allowed directories', async () => {
    stubGrobid(url => {
      if (url.includes('/api/isalive')) return { body: 'true' }
      return undefined
    })

    const { status, body } = await callApi('/api/pdf-parse', {
      method: 'POST',
      body: { filePath: '/etc/passwd' },
    })
    expect(status).toBe(403)
    expect(body.error).toBe('FORBIDDEN')
  })

  it('returns 400 when filePath is missing', async () => {
    const { status, body } = await callApi('/api/pdf-parse', {
      method: 'POST',
      body: {},
    })
    expect(status).toBe(400)
    expect(body.error).toBe('BAD_REQUEST')
  })

  it('parses a PDF and extracts title, authors, abstract, and DOI', async () => {
    stubGrobid(url => {
      if (url.includes('/api/isalive')) return { body: 'true' }
      if (url.includes('/api/processFulltextDocument')) return { body: GROBID_TEI }
      return undefined
    })

    const { status, body } = await callApi('/api/pdf-parse', {
      method: 'POST',
      body: { filePath: pdfPath },
    })

    expect(status).toBe(200)
    expect(body.parsed.title).toBe('Attention Is All You Need')
    expect(body.parsed.authors).toEqual(['Ashish Vaswani', 'Noam Shazeer'])
    expect(body.parsed.abstract).toContain('dominant sequence transduction models')
    expect(body.parsed.doi).toBe('10.5555/3295222.3295349')
    expect(body.parsed.rawTei).toContain('<TEI')
  })

  it('returns 502 when GROBID returns non-TEI output', async () => {
    stubGrobid(url => {
      if (url.includes('/api/isalive')) return { body: 'true' }
      if (url.includes('/api/processFulltextDocument')) return { body: 'not xml' }
      return undefined
    })

    const { status, body } = await callApi('/api/pdf-parse', {
      method: 'POST',
      body: { filePath: pdfPath },
    })
    expect(status).toBe(502)
    expect(body.error).toBe('GROBID_INVALID_OUTPUT')
  })
})
