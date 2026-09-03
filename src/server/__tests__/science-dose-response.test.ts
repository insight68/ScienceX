import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
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

function plateCsv(signalOffset = 0): string {
  const concentrations = [0.01, 0.1, 1, 10, 100]
  const rows: string[] = ['well,signal']
  const roles = [
    { column: 1, viability: 0 },
    { column: 2, viability: 100 },
    { column: 3, viability: 8 },
    ...concentrations.map((concentration, index) => ({
      column: index + 4,
      viability: 100 / (1 + (concentration ** 1.2)),
    })),
  ]
  for (const role of roles) {
    for (let replicateIndex = 0; replicateIndex < 3; replicateIndex += 1) {
      const well = `${'ABC'[replicateIndex]}${role.column}`
      const replicateDirection = replicateIndex - 1
      const variation = role.column >= 4
        ? role.viability * replicateDirection * 0.004
        : replicateDirection * 0.4
      const signal = 10 + role.viability + variation + signalOffset
      rows.push(`${well},${signal}`)
    }
  }
  return `${rows.join('\n')}\n`
}

beforeEach(async () => {
  temporaryRoot = await fs.mkdtemp('/tmp/science-dose-response-test-')
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

describe('Science dose-response run API', () => {
  it('analyzes the experiment-locked plate version and replays it deterministically', async () => {
    const createdProject = await callApi('/api/research-projects', {
      method: 'POST',
      body: {
        name: 'HepG2 response project',
        question: 'Does SX-101 reduce viability?',
        rootDir: projectRoot,
      },
    })
    const projectId = createdProject.body.project.id
    const tablePath = path.join(projectRoot, 'plate-reader.csv')
    await fs.writeFile(tablePath, plateCsv(), 'utf8')
    const registered = await callApi(`/api/research-projects/${projectId}/datasets`, {
      method: 'POST',
      body: { filePath: tablePath, name: 'CCK-8 plate reader' },
    })
    const datasetId = registered.body.dataset.id
    const lockedVersionId = registered.body.dataset.currentVersion.id

    const createdExperiment = await callApi(`/api/research-projects/${projectId}/experiments`, {
      method: 'POST',
      body: {
        name: 'SX-101 · HepG2 · 48 h',
        objective: 'Estimate the relative IC50 from a reviewed plate design.',
        assayType: 'cell-viability-dose-response',
        linkedDatasetId: datasetId,
        protocol: {
          cellLine: 'HepG2',
          compoundName: 'SX-101',
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
    })
    const experimentId = createdExperiment.body.experiment.id

    await fs.writeFile(tablePath, plateCsv(999), 'utf8')
    const secondVersion = await callApi(`/api/research-projects/${projectId}/datasets`, {
      method: 'POST',
      body: { filePath: tablePath },
    })
    expect(secondVersion.body.dataset.currentVersion.ordinal).toBe(2)

    const analyzed = await callApi(
      `/api/research-projects/${projectId}/experiments/${experimentId}/runs`,
      {
        method: 'POST',
        body: {
          recipe: 'cell-viability-dose-response-v1',
          parameters: { wellColumn: 'well', signalColumn: 'signal' },
        },
      },
    )
    expect(analyzed.status).toBe(201)
    expect(analyzed.body.run).toMatchObject({
      projectId,
      experimentId,
      datasetId,
      datasetVersionId: lockedVersionId,
      datasetVersionOrdinal: 1,
      inputCurrentness: 'superseded',
      recipe: 'cell-viability-dose-response-v1',
      status: 'completed',
      reproducibilityStatus: 'unchecked',
      evaluationContract: {
        id: 'cell-viability-dose-response-technical-v1',
        version: 1,
        evidenceLevel: 'evaluated',
      },
      evidence: {
        level: 'evaluated',
        verdict: 'supported',
        failedCriterionIds: [],
      },
      parameters: { experimentId, wellColumn: 'well', signalColumn: 'signal' },
      summary: {
        scope: 'full-linked-plate',
        assignedWellCount: 24,
        blankMeanSignal: 10,
        vehicleMeanBlankCorrectedSignal: 100,
        fit: {
          model: '4pl',
          testedRangePosition: 'within-range',
        },
      },
    })
    expect(analyzed.body.run.summary.fit.relativeIc50).toBeCloseTo(1, 1)
    expect(analyzed.body.run.summary.fit.rSquared).toBeGreaterThan(0.99)
    expect(analyzed.body.run.evidence.artifactIds).toEqual(
      analyzed.body.artifacts.map((artifact: any) => artifact.id),
    )
    expect(analyzed.body.run.evidence.contractHash).toHaveLength(64)
    expect(analyzed.body.artifacts.map((artifact: any) => artifact.name)).toEqual([
      'Dose-response analysis report',
      'Normalized well responses',
      'Dose-response result data',
    ])
    for (const artifact of analyzed.body.artifacts) {
      expect(await fs.readFile(path.join(projectRoot, artifact.relativePath), 'utf8')).not.toBe('')
    }
    const reportArtifact = analyzed.body.artifacts.find((artifact: any) => (
      artifact.name === 'Dose-response analysis report'
    ))
    const report = await fs.readFile(path.join(projectRoot, reportArtifact.relativePath), 'utf8')
    expect(report).toContain('## Scientific evidence')
    expect(report).toContain('Technical verdict: supported')
    expect(report).toContain('cell-viability-dose-response-technical-v1@1')
    const runManifest = JSON.parse(await fs.readFile(
      path.join(projectRoot, analyzed.body.run.manifestPath),
      'utf8',
    ))
    expect(runManifest).toMatchObject({
      schemaVersion: 2,
      run: {
        id: analyzed.body.run.id,
        evidence: { verdict: 'supported' },
      },
    })

    const replayed = await callApi(`/api/runs/${analyzed.body.run.id}/replay`, {
      method: 'POST',
      body: {},
    })
    expect(replayed.status).toBe(201)
    expect(replayed.body.run).toMatchObject({
      parentRunId: analyzed.body.run.id,
      experimentId,
      datasetVersionId: lockedVersionId,
      recipe: 'cell-viability-dose-response-v1',
      status: 'completed',
      reproducibilityStatus: 'reproducible',
      evidence: { level: 'evaluated', verdict: 'supported' },
    })
    expect(replayed.body.run.summary).toEqual(analyzed.body.run.summary)

    const originalEvents = await callApi(`/api/runs/${analyzed.body.run.id}/events`)
    expect(originalEvents.body.events.map((event: any) => event.type)).toEqual([
      'run.created',
      'run.started',
      'artifact.created',
      'artifact.created',
      'artifact.created',
      'run.evaluated',
      'run.completed',
    ])
  })
})
