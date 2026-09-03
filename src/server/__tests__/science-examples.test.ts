import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { handleApiRequest } from '../router.js'
import { scienceWorkspaceService } from '../services/scienceWorkspaceService.js'
import { scienceExperimentService } from '../services/scienceExperimentService.js'
import { parseScienceExampleMetadata } from '../services/scienceExampleMetadata.js'

let root: string
let previousConfig: string | undefined
let previousScienceHome: string | undefined
const restorers: Array<() => void> = []
const exampleId = 'cell-viability-dose-response-v1'

async function api(urlPath: string, body?: unknown) {
  const url = new URL(`http://localhost${urlPath}`)
  const response = await handleApiRequest(new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), url)
  return { status: response.status, body: await response.json() as any }
}

async function materialize(includeChallenges = false, parentDir = root) {
  return api(`/api/science-examples/${exampleId}/materialize`, { parentDir, locale: 'zh-CN', includeChallenges })
}

beforeEach(async () => {
  root = await fs.mkdtemp('/tmp/science-examples-test-')
  previousConfig = process.env.CLAUDE_CONFIG_DIR
  previousScienceHome = process.env.SCIENCEX_HOME
  process.env.CLAUDE_CONFIG_DIR = path.join(root, 'config')
  process.env.SCIENCEX_HOME = path.join(root, 'science-home')
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Network is forbidden in an offline example') })
  restorers.push(() => fetchSpy.mockRestore())
})

afterEach(async () => {
  for (const restore of restorers.splice(0)) restore()
  if (previousConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = previousConfig
  if (previousScienceHome === undefined) delete process.env.SCIENCEX_HOME
  else process.env.SCIENCEX_HOME = previousScienceHome
  await fs.rm(root, { recursive: true, force: true })
})

describe('ScienceX complete example', () => {
  it('lists localized examples without touching the filesystem and creates real inputs with no runs', async () => {
    const before = await fs.readdir(root)
    expect((await api('/api/science-examples?locale=zh-TW')).body.examples[0].title).toContain('模拟')
    expect((await api('/api/science-examples?locale=xx')).body.examples[0].title).toContain('simulated')
    expect(await fs.readdir(root)).toEqual(before)
    const created = await materialize()
    expect(created.status).toBe(201)
    expect(created.body.project.example.scenarios).toHaveLength(1)
    expect(created.body.experiment.status).toBe('ready')
    expect(created.body.experiment.linkedDatasetVersionId).toBe(created.body.dataset.currentVersion.id)
    expect((await api(`/api/research-projects/${created.body.project.id}/runs`)).body.runs).toEqual([])
    expect((await api(`/api/research-projects/${created.body.project.id}/artifacts`)).body.artifacts).toEqual([])
    const guide = await fs.readFile(path.join(created.body.project.rootDir, 'README.zh-CN.md'), 'utf8')
    expect(guide).toContain('技术复孔不是独立生物学重复')
  })

  it('reserves distinct directories concurrently and never overwrites existing files', async () => {
    const reserved = path.join(root, 'sciencex-cell-viability-demo')
    await fs.mkdir(reserved)
    await fs.writeFile(path.join(reserved, 'keep.txt'), 'user data')
    const [a, b] = await Promise.all([materialize(), materialize()])
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(a.body.project.rootDir).not.toBe(b.body.project.rootDir)
    expect(await fs.readFile(path.join(reserved, 'keep.txt'), 'utf8')).toBe('user data')
  })

  it('rejects invalid ids, outside paths, symlink escapes, missing and non-directory parents', async () => {
    expect((await api('/api/science-examples/unknown/materialize', { parentDir: root })).status).toBe(404)
    expect((await materialize(false, '/etc')).status).toBe(403)
    await fs.symlink('/etc', path.join(root, 'outside'))
    expect((await materialize(false, path.join(root, 'outside'))).status).toBe(403)
    expect((await materialize(false, path.join(root, 'missing'))).status).toBe(400)
    await fs.writeFile(path.join(root, 'file'), '')
    expect((await materialize(false, path.join(root, 'file'))).status).toBe(400)
  })

  it.each(['dataset', 'experiment'] as const)('unregisters a partially created %s failure and preserves files for inspection', async stage => {
    const spy = stage === 'dataset'
      ? spyOn(scienceWorkspaceService, 'registerDataset').mockRejectedValueOnce(new Error('injected failure'))
      : spyOn(scienceExperimentService, 'createExperiment').mockRejectedValueOnce(new Error('injected failure'))
    restorers.push(() => spy.mockRestore())
    const failed = await materialize()
    expect(failed.status).toBe(500)
    expect((await scienceWorkspaceService.listProjects())).toEqual([])
    const preserved = path.join(root, 'sciencex-cell-viability-demo')
    expect(JSON.parse(await fs.readFile(path.join(preserved, 'provisioning-failed.json'), 'utf8')).unregistered).toBe(true)
    const retry = await materialize()
    expect(retry.status).toBe(201)
    expect(retry.body.project.rootDir).not.toBe(preserved)
  })

  it('executes all four scenarios through real APIs and derives measured evidence without a model', async () => {
    const created = await materialize(true)
    expect(created.status).toBe(201)
    const projectId = created.body.project.id
    const marker = created.body.project.example
    expect(marker.scenarios).toHaveLength(4)
    const datasets = (await api(`/api/research-projects/${projectId}/datasets`)).body.datasets
    expect(datasets.find((item: any) => item.versionCount === 2).name).toBe('数据更新与旧版本重放')
    const before = await api(`/api/research-projects/${projectId}/example-report?locale=zh`)
    expect(before.body.checks.every((check: any) => check.status === 'not-run' && !check.passed)).toBe(true)
    for (const scenario of marker.scenarios) {
      const result = await api(`/api/research-projects/${projectId}/experiments/${scenario.experimentId}/runs`, {
        recipe: exampleId, parameters: { wellColumn: 'well', signalColumn: 'signal' },
      })
      if (scenario.id === 'missing-well') {
        expect(result.status).toBe(409)
        expect(result.body.message).toBe('Linked table is missing 1 assigned wells: A4')
      } else {
        expect(result.status).toBe(201)
        expect(result.body.run.evidence.verdict).toBe(scenario.id === 'weak-response' ? 'inconclusive' : 'supported')
        if (scenario.id !== 'weak-response') {
          const replay = await api(`/api/runs/${result.body.run.id}/replay`, {})
          expect(replay.body.run.reproducibilityStatus).toBe('reproducible')
        }
      }
    }
    const report = await api(`/api/research-projects/${projectId}/example-report?locale=zh`)
    expect(report.status).toBe(200)
    expect(report.body.checks.map((check: any) => [check.id, check.passed])).toEqual([
      ['success', true], ['version-change', true], ['missing-well', true], ['weak-response', true],
    ])
    expect(report.body.checks[0].relativeIc50AbsoluteError).toBeLessThan(0.2)
    expect(report.body.checks[1].inputCurrentness).toBe('superseded')
    expect(report.body.checks[2].artifactCount).toBe(0)
    expect(report.body.markdown).toContain('人工对照记录（待实测）')
    expect(report.body.markdown).toContain('SHA-256=')
    expect(report.body.aiPrompt).toContain('只读审阅')
  })

  it('keeps pre-feature projects and unknown marker fields unchanged on reload', async () => {
    const oldRoot = path.join(root, 'old-project')
    await fs.mkdir(oldRoot)
    const old = await scienceWorkspaceService.createProject({ rootDir: oldRoot, name: 'Old project' })
    const manifestPath = path.join(oldRoot, '.sciencex', 'project.yaml')
    const before = await fs.readFile(manifestPath, 'utf8')
    expect((await scienceWorkspaceService.getProject(old.id)).example).toBeNull()
    expect(await fs.readFile(manifestPath, 'utf8')).toBe(before)
    expect((await api(`/api/research-projects/${old.id}/example-report`)).status).toBe(404)
    const created = await materialize()
    const markerPath = path.join(created.body.project.rootDir, '.sciencex', 'example.json')
    const marker = { ...created.body.project.example, futureMetadata: { keep: true } }
    await fs.writeFile(markerPath, JSON.stringify(marker))
    expect((await scienceWorkspaceService.getProject(created.body.project.id)).example?.futureMetadata).toEqual({ keep: true })
    expect(JSON.parse(await fs.readFile(markerPath, 'utf8'))).toEqual(marker)
    expect(parseScienceExampleMetadata({ ...marker, schemaVersion: 99 })).toBeNull()
    await fs.writeFile(markerPath, JSON.stringify({ ...marker, schemaVersion: 99 }))
    expect((await scienceWorkspaceService.getProject(created.body.project.id)).example).toBeNull()
    expect(JSON.parse(await fs.readFile(markerPath, 'utf8')).schemaVersion).toBe(99)
  })

  it('saves reports in the selected project without overwriting and rejects report-directory symlinks', async () => {
    const { body } = await materialize()
    const endpoint = `/api/research-projects/${body.project.id}/example-report?locale=zh`
    const first = await api(endpoint, {})
    const second = await api(endpoint, {})
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(first.body.savedPath).not.toBe(second.body.savedPath)
    expect(await fs.readFile(first.body.savedPath, 'utf8')).toBe(first.body.markdown)
    expect(first.body.markdown).toContain('not-run')
    const reportsDir = path.join(body.project.rootDir, 'sciencex-demo-reports')
    await fs.rename(reportsDir, `${reportsDir}-original`)
    await fs.symlink(root, reportsDir)
    expect((await api(endpoint, {})).status).toBe(409)
  })
})
