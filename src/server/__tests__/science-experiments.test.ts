import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { handleApiRequest } from '../router.js'

type ApiResult = {
  status: number
  body: Record<string, any>
}

let temporaryRoot: string
let configDir: string
let projectRoot: string
let originalConfigDir: string | undefined

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

beforeEach(async () => {
  temporaryRoot = await fs.mkdtemp('/tmp/science-experiment-test-')
  configDir = path.join(temporaryRoot, 'config')
  projectRoot = path.join(temporaryRoot, 'project')
  await fs.mkdir(projectRoot, { recursive: true })
  originalConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = configDir
})

afterEach(async () => {
  if (originalConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalConfigDir
  await fs.rm(temporaryRoot, { recursive: true, force: true })
})

describe('Science cell viability experiments API', () => {
  it('creates a versioned ready protocol and deterministic 96-well design', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: {
        name: 'Dose response project',
        question: 'What concentration reduces A549 viability?',
        rootDir: projectRoot,
      },
    })
    const tablePath = path.join(projectRoot, 'plate-reader.csv')
    await fs.writeFile(tablePath, 'well,signal\nA1,0.05\nA2,1.20\n', 'utf8')
    const dataset = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath } },
    )

    const result = await callApi(
      `/api/research-projects/${created.body.project.id}/experiments`,
      {
        method: 'POST',
        body: {
          name: 'X-402 · A549 · 48 h',
          objective: 'Estimate the X-402 dose-response window before confirmatory testing.',
          assayType: 'cell-viability-dose-response',
          protocol: {
            cellLine: 'A549',
            compoundName: 'X-402',
            readout: 'cck-8',
            treatmentDurationHours: 48,
            seedingDensityCellsPerWell: 4000,
            concentrationUnit: 'µM',
            concentrations: [0.01, 0.1, 1, 10, 100],
            replicateCount: 3,
            includeBlankControl: true,
            vehicleControl: { name: 'DMSO', finalPercent: 0.1 },
            positiveControl: 'Staurosporine',
          },
        },
      },
    )

    expect(result.status).toBe(201)
    expect(result.body.experiment).toMatchObject({
      projectId: created.body.project.id,
      name: 'X-402 · A549 · 48 h',
      assayType: 'cell-viability-dose-response',
      status: 'ready',
      linkedDatasetId: null,
      linkedDatasetVersionId: null,
      protocolVersion: {
        ordinal: 1,
        protocol: {
          cellLine: 'A549',
          compoundName: 'X-402',
          concentrationUnit: 'µM',
          replicateCount: 3,
        },
      },
      designVersion: {
        ordinal: 1,
        design: { plateFormat: 96 },
      },
      readiness: { blockingCount: 0, warningCount: 0, issues: [] },
    })
    expect(result.body.experiment.designVersion.design.wells).toHaveLength(24)
    expect(result.body.experiment.designVersion.design.wells.slice(0, 4)).toEqual([
      {
        well: 'A1',
        role: 'blank',
        label: 'Blank',
        concentration: null,
        concentrationUnit: null,
        replicate: 1,
      },
      {
        well: 'B1',
        role: 'blank',
        label: 'Blank',
        concentration: null,
        concentrationUnit: null,
        replicate: 2,
      },
      {
        well: 'C1',
        role: 'blank',
        label: 'Blank',
        concentration: null,
        concentrationUnit: null,
        replicate: 3,
      },
      {
        well: 'A2',
        role: 'vehicle-control',
        label: 'DMSO',
        concentration: null,
        concentrationUnit: null,
        replicate: 1,
      },
    ])

    const linked = await callApi(
      `/api/research-projects/${created.body.project.id}/experiments/${result.body.experiment.id}`,
      { method: 'PATCH', body: { datasetId: dataset.body.dataset.id } },
    )
    expect(linked.status).toBe(200)
    expect(linked.body.experiment).toMatchObject({
      id: result.body.experiment.id,
      linkedDatasetId: dataset.body.dataset.id,
      linkedDatasetVersionId: dataset.body.dataset.currentVersion.id,
      protocolVersion: { ordinal: 1 },
      designVersion: { ordinal: 1 },
    })

    const listed = await callApi(
      `/api/research-projects/${created.body.project.id}/experiments`,
    )
    expect(listed.status).toBe(200)
    expect(listed.body.experiments).toHaveLength(1)
    expect(listed.body.experiments[0].id).toBe(result.body.experiment.id)
    expect(listed.body.experiments[0].linkedDatasetVersionId)
      .toBe(dataset.body.dataset.currentVersion.id)

    const database = new Database(path.join(projectRoot, '.sciencex', 'research.sqlite'), {
      readonly: true,
    })
    try {
      expect(database.query('SELECT COUNT(*) AS count FROM science_protocol_versions').get())
        .toEqual({ count: 1 })
      expect(database.query('SELECT COUNT(*) AS count FROM science_design_versions').get())
        .toEqual({ count: 1 })
    } finally {
      database.close()
    }
  })

  it('saves an incomplete design as a draft and reports blocking readiness issues', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Draft design project', rootDir: projectRoot },
    })

    const result = await callApi(
      `/api/research-projects/${created.body.project.id}/experiments`,
      {
        method: 'POST',
        body: {
          name: 'Incomplete assay',
          assayType: 'cell-viability-dose-response',
          protocol: {
            cellLine: '',
            compoundName: '',
            readout: 'celltiter-glo',
            treatmentDurationHours: 0,
            seedingDensityCellsPerWell: 0,
            concentrationUnit: null,
            concentrations: [1, 1, -1],
            replicateCount: 2,
            includeBlankControl: false,
            vehicleControl: null,
            positiveControl: '',
          },
          design: {
            plateFormat: 96,
            wells: [
              {
                well: 'A1',
                role: 'treatment',
                label: 'Dose',
                concentration: 1,
                concentrationUnit: null,
                replicate: 1,
              },
              {
                well: 'A1',
                role: 'treatment',
                label: 'Dose duplicate',
                concentration: 1,
                concentrationUnit: null,
                replicate: 1,
              },
            ],
          },
        },
      },
    )

    expect(result.status).toBe(201)
    expect(result.body.experiment.status).toBe('draft')
    const issueCodes = result.body.experiment.readiness.issues.map((issue: any) => issue.code)
    expect(issueCodes).toContain('missing-cell-line')
    expect(issueCodes).toContain('missing-compound')
    expect(issueCodes).toContain('invalid-dose')
    expect(issueCodes).toContain('duplicate-dose')
    expect(issueCodes).toContain('insufficient-dose-levels')
    expect(issueCodes).toContain('insufficient-replicates')
    expect(issueCodes).toContain('missing-blank-control')
    expect(issueCodes).toContain('missing-vehicle-control')
    expect(issueCodes).toContain('duplicate-well')
    expect(issueCodes).toContain('duplicate-replicate')
    expect(issueCodes).toContain('incomplete-layout')
    expect(result.body.experiment.readiness.blockingCount).toBeGreaterThan(0)
  })
})
