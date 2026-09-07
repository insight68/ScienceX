import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { Database } from 'bun:sqlite'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { ScienceAnalysisService } from '../services/scienceAnalysisService.js'
import { scienceWorkspaceService } from '../services/scienceWorkspaceService.js'

let root: string
let originalConfigDir: string | undefined

beforeEach(async () => {
  root = await fs.mkdtemp('/tmp/science-run-recovery-test-')
  originalConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = path.join(root, 'config')
})

afterEach(async () => {
  mock.restore()
  if (originalConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalConfigDir
  await fs.rm(root, { recursive: true, force: true })
})

async function fixture() {
  const projectRoot = path.join(root, 'project')
  await fs.mkdir(projectRoot)
  const project = await scienceWorkspaceService.createProject({ name: 'Run recovery', rootDir: projectRoot })
  const source = path.join(projectRoot, 'measurements.csv')
  await fs.writeFile(source, 'sample,signal\nA,1\nB,2\n')
  const { dataset } = await scienceWorkspaceService.registerDataset({ projectId: project.id, filePath: source })
  return { project, dataset, databasePath: path.join(project.rootDir, '.sciencex', 'research.sqlite') }
}

describe('Science run commit and export recovery', () => {
  it.each(['manifest', 'terminal-event'])('keeps a committed run completed after a %s write failure and repairs exports', async failure => {
    const { project, dataset, databasePath } = await fixture()
    const analysis = new ScienceAnalysisService()
    let injected = false
    const rename = fs.rename
    if (failure === 'manifest') {
      spyOn(fs, 'rename').mockImplementation(async (from, to) => {
        if (String(to).endsWith('/run.json')) {
          injected = true
          throw new Error('injected manifest write failure')
        }
        return rename(from, to)
      })
    } else {
      spyOn(fs, 'rename').mockImplementation(async (from, to) => {
        if (String(to).endsWith('/events.jsonl')) {
          const database = new Database(databasePath, { readonly: true })
          try {
            if (database.query("SELECT id FROM analysis_runs WHERE status = 'completed'").get()) {
              injected = true
              throw new Error('injected terminal event write failure')
            }
          } finally { database.close() }
        }
        return rename(from, to)
      })
    }
    const completed = await analysis.createQualityRun({ projectId: project.id, datasetId: dataset.id })
    expect(injected).toBe(true)
    expect(completed.run.status).toBe('completed')
    expect(completed.artifacts).toHaveLength(2)
    const availableEvents = await analysis.getRunEvents(completed.run.id)
    expect(availableEvents.map(event => event.type)).toEqual(failure === 'manifest'
      ? ['run.created', 'run.started', 'artifact.created', 'artifact.created', 'run.completed']
      : ['run.created', 'run.started'])
    mock.restore()

    const restarted = new ScienceAnalysisService()
    const [events, concurrentEvents] = await Promise.all([
      restarted.getRunEvents(completed.run.id),
      restarted.getRunEvents(completed.run.id),
    ])
    expect(concurrentEvents).toEqual(events)
    expect(events.map(event => event.type)).toEqual([
      'run.created', 'run.started', 'artifact.created', 'artifact.created', 'run.completed',
    ])
    const listed = await restarted.listRuns(project.id)
    expect(listed[0].status).toBe('completed')
    const manifest = JSON.parse(await fs.readFile(path.join(project.rootDir, completed.run.manifestPath), 'utf8'))
    expect(manifest.run).toEqual(listed[0])
    expect(manifest.artifacts).toEqual(completed.artifacts)
    expect(await restarted.getRunEvents(completed.run.id)).toEqual(events)
  })

  it('rolls back artifact registrations when the completion transaction fails', async () => {
    const { project, dataset, databasePath } = await fixture()
    const database = new Database(databasePath)
    try {
      database.exec(`CREATE TRIGGER reject_completion BEFORE UPDATE OF status ON analysis_runs
        WHEN NEW.status = 'completed' BEGIN SELECT RAISE(ABORT, 'injected commit failure'); END`)
    } finally { database.close() }
    const analysis = new ScienceAnalysisService()
    await expect(analysis.createQualityRun({ projectId: project.id, datasetId: dataset.id })).rejects.toThrow('injected commit failure')
    const [run] = await analysis.listRuns(project.id)
    expect(run.status).toBe('failed')
    expect(await analysis.listArtifacts(project.id)).toEqual([])
    expect((await analysis.getRunEvents(run.id)).map(event => event.type)).toEqual([
      'run.created', 'run.started', 'run.failed',
    ])
  })

  it('keeps the last complete event log when writing its next snapshot fails partway', async () => {
    const { project, dataset, databasePath } = await fixture()
    const writeFile = fs.writeFile
    let injected = false
    spyOn(fs, 'writeFile').mockImplementation(async (file, data, options) => {
      if (String(file).includes('/events.jsonl.tmp.')) {
        const database = new Database(databasePath, { readonly: true })
        try {
          if (database.query("SELECT id FROM analysis_runs WHERE status = 'completed'").get()) {
            injected = true
            await writeFile(file, String(data).slice(0, 17), options)
            throw new Error('injected partial event write')
          }
        } finally { database.close() }
      }
      return writeFile(file, data, options)
    })
    const analysis = new ScienceAnalysisService()
    const { run } = await analysis.createQualityRun({ projectId: project.id, datasetId: dataset.id })
    expect(injected).toBe(true)
    expect(run.status).toBe('completed')
    expect((await analysis.getRunEvents(run.id)).map(event => event.type)).toEqual(['run.created', 'run.started'])
    mock.restore()
    const events = await new ScienceAnalysisService().getRunEvents(run.id)
    expect(events.map(event => event.type)).toEqual([
      'run.created', 'run.started', 'artifact.created', 'artifact.created', 'run.completed',
    ])
  })

  it('does not recover an active run as interrupted while its first event is being written', async () => {
    const { project, dataset } = await fixture()
    const analysis = new ScienceAnalysisService()
    const rename = fs.rename
    let release!: () => void
    let reached!: () => void
    const blocked = new Promise<void>(resolve => { release = resolve })
    const entered = new Promise<void>(resolve => { reached = resolve })
    let first = true
    spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(to).endsWith('/events.jsonl') && first) {
        first = false
        reached()
        await blocked
      }
      return rename(from, to)
    })
    const pending = analysis.createQualityRun({ projectId: project.id, datasetId: dataset.id })
    await entered
    try {
      expect((await analysis.listRuns(project.id))[0].status).toBe('queued')
    } finally { release() }
    expect((await pending).run.status).toBe('completed')
  })

  it('preserves unknown manifest fields and existing event history when refreshing an old export', async () => {
    const { project, dataset } = await fixture()
    const analysis = new ScienceAnalysisService()
    const completed = await analysis.createQualityRun({ projectId: project.id, datasetId: dataset.id })
    const manifestPath = path.join(project.rootDir, completed.run.manifestPath)
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    manifest.futureMetadata = { keep: true }
    manifest.run.futureRunField = 42
    manifest.artifacts[0].futureArtifactField = 'keep'
    await fs.writeFile(manifestPath, JSON.stringify(manifest))
    const eventsPath = path.join(project.rootDir, completed.run.eventLogPath)
    const beforeEvents = await fs.readFile(eventsPath, 'utf8')
    await analysis.getRunEvents(completed.run.id)
    const refreshed = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    expect(refreshed).toMatchObject({ futureMetadata: { keep: true }, run: { futureRunField: 42 } })
    expect(refreshed.artifacts[0].futureArtifactField).toBe('keep')
    expect(await fs.readFile(eventsPath, 'utf8')).toBe(beforeEvents)
  })
})
