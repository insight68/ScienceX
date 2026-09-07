import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { Database } from 'bun:sqlite'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { scienceWorkspaceService } from '../services/scienceWorkspaceService.js'
import { ScienceDuckDbService } from '../services/scienceDuckDbService.js'

let root: string
let originalConfigDir: string | undefined

beforeEach(async () => {
  root = await fs.mkdtemp('/tmp/science-analytics-test-')
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
  const project = await scienceWorkspaceService.createProject({ name: 'Analytics fixture', rootDir: projectRoot })
  const source = path.join(projectRoot, 'measurements.csv')
  const contents = 'sample,signal\nA,1\nB,2\n'
  await fs.writeFile(source, contents)
  const { dataset } = await scienceWorkspaceService.registerDataset({ projectId: project.id, filePath: source })
  const snapshot = path.join(project.rootDir, dataset.currentVersion.snapshotPath!)
  return { project, source: dataset.canonicalPath, snapshot, contents, dataset }
}

describe('Science analytics version boundary', () => {
  it.each(['modified', 'removed'])('uses registered bytes when the source is %s', async change => {
    const { source, snapshot, contents, dataset } = await fixture()
    const compute = spyOn(ScienceDuckDbService.prototype, 'computeAnalytics').mockImplementation(async (datasetId, filePath) => {
      expect(await fs.readFile(filePath, 'utf8')).toBe(contents)
      return { datasetId, totalRows: 2 } as never
    })
    if (change === 'modified') await fs.writeFile(source, 'sample,signal\nC,9\n')
    else await fs.unlink(source)

    expect(await scienceWorkspaceService.getDatasetAnalytics(dataset.id)).toMatchObject({ totalRows: 2 })
    expect(compute).toHaveBeenCalledWith(dataset.id, snapshot, 'csv')
  })

  it.each(['corrupt', 'removed'])('rejects a %s snapshot before querying DuckDB', async change => {
    const { snapshot, contents, dataset } = await fixture()
    const compute = spyOn(ScienceDuckDbService.prototype, 'computeAnalytics').mockResolvedValue({} as never)
    if (change === 'corrupt') {
      await fs.chmod(snapshot, 0o600)
      await fs.writeFile(snapshot, contents.replace('A,1', 'A,9'))
    } else await fs.unlink(snapshot)

    await expect(scienceWorkspaceService.getDatasetAnalytics(dataset.id)).rejects.toThrow(/snapshot/)
    expect(compute).not.toHaveBeenCalled()
  })

  it('only uses a legacy source without a snapshot while its hash matches the registered version', async () => {
    const { project, source, contents, dataset } = await fixture()
    const database = new Database(path.join(project.rootDir, '.sciencex', 'research.sqlite'))
    try {
      database.query('UPDATE dataset_versions SET snapshot_path = NULL WHERE id = ?').run(dataset.currentVersion.id)
    } finally { database.close() }
    const compute = spyOn(ScienceDuckDbService.prototype, 'computeAnalytics').mockResolvedValue({ totalRows: 2 } as never)
    await scienceWorkspaceService.getDatasetAnalytics(dataset.id)
    expect(compute).toHaveBeenCalledWith(dataset.id, source, 'csv')
    compute.mockClear()
    await fs.writeFile(source, contents.replace('A,1', 'A,9'))
    await expect(scienceWorkspaceService.getDatasetAnalytics(dataset.id)).rejects.toThrow(/integrity/)
    expect(compute).not.toHaveBeenCalled()
  })
})
