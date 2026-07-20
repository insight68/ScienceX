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
  temporaryRoot = await fs.mkdtemp('/tmp/science-workspace-test-')
  configDir = path.join(temporaryRoot, 'config')
  projectRoot = path.join(temporaryRoot, 'experiment')
  await fs.mkdir(projectRoot, { recursive: true })
  originalConfigDir = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = configDir
})

afterEach(async () => {
  if (originalConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalConfigDir
  await fs.rm(temporaryRoot, { recursive: true, force: true })
})

describe('Science workspace API', () => {
  it('creates a portable project manifest and lists the registered project', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: {
        name: 'Cell viability pilot',
        question: 'Does treatment A alter viability after 24 hours?',
        rootDir: projectRoot,
      },
    })

    expect(created.status).toBe(201)
    expect(created.body.project).toMatchObject({
      name: 'Cell viability pilot',
      question: 'Does treatment A alter viability after 24 hours?',
      rootDir: await fs.realpath(projectRoot),
      rootAvailable: true,
      schemaVersion: 2,
    })

    const scienceDirectory = path.join(projectRoot, '.sciencex')
    const manifest = await fs.readFile(path.join(scienceDirectory, 'project.yaml'), 'utf8')
    expect(manifest).toContain('schemaVersion: 2')
    expect(manifest).toContain('name: Cell viability pilot')
    expect((await fs.stat(path.join(scienceDirectory, 'research.sqlite'))).isFile()).toBe(true)

    const listed = await callApi('/api/research-projects')
    expect(listed.status).toBe(200)
    expect(listed.body.projects).toHaveLength(1)
    expect(listed.body.projects[0].id).toBe(created.body.project.id)
  })

  it('parses quoted CSV rows and profiles generic experimental columns locally', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Plate reader run', rootDir: projectRoot },
    })
    const tablePath = path.join(projectRoot, 'viability.csv')
    await fs.writeFile(
      tablePath,
      [
        'sample,value,value,observed_at,active,note',
        'control,1,1.5,2026-01-02,true,"baseline, untreated"',
        'treated,,2,2026-01-03,false,"two-line',
        'observation"',
      ].join('\n'),
      'utf8',
    )

    const registered = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath, name: 'Viability observations' } },
    )
    expect(registered.status).toBe(201)
    expect(registered.body.versionCreated).toBe(true)
    expect(registered.body.dataset).toMatchObject({
      name: 'Viability observations',
      format: 'csv',
      versionCount: 1,
    })

    const previewed = await callApi(
      `/api/datasets/${registered.body.dataset.id}/preview?maxRows=10`,
    )
    expect(previewed.status).toBe(200)
    expect(previewed.body.preview).toMatchObject({
      headers: ['sample', 'value', 'value (2)', 'observed_at', 'active', 'note'],
      sampledRowCount: 2,
      localOnly: true,
      truncated: false,
    })
    expect(previewed.body.preview.rows[0][5]).toBe('baseline, untreated')
    expect(previewed.body.preview.rows[1][5]).toBe('two-line\nobservation')
    expect(previewed.body.preview.columns).toEqual([
      { name: 'sample', inferredType: 'string', missingCount: 0, uniqueCount: 2 },
      { name: 'value', inferredType: 'integer', missingCount: 1, uniqueCount: 1 },
      { name: 'value (2)', inferredType: 'number', missingCount: 0, uniqueCount: 2 },
      { name: 'observed_at', inferredType: 'datetime', missingCount: 0, uniqueCount: 2 },
      { name: 'active', inferredType: 'boolean', missingCount: 0, uniqueCount: 2 },
      { name: 'note', inferredType: 'string', missingCount: 0, uniqueCount: 2 },
    ])
  })

  it('requires an explicit re-registration after a source changes and records a new version', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Versioned experiment', rootDir: projectRoot },
    })
    const tablePath = path.join(projectRoot, 'measurements.tsv')
    await fs.writeFile(tablePath, 'sample\tvalue\nA\t1\n', 'utf8')

    const first = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath } },
    )
    expect(first.status).toBe(201)

    const unchanged = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath } },
    )
    expect(unchanged.status).toBe(200)
    expect(unchanged.body.versionCreated).toBe(false)
    expect(unchanged.body.dataset.versionCount).toBe(1)

    await fs.writeFile(tablePath, 'sample\tvalue\nA\t1\nB\t2\n', 'utf8')
    const stalePreview = await callApi(`/api/datasets/${first.body.dataset.id}/preview`)
    expect(stalePreview.status).toBe(409)
    expect(stalePreview.body.message).toContain('register it again')

    const second = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath } },
    )
    expect(second.status).toBe(201)
    expect(second.body.dataset.id).toBe(first.body.dataset.id)
    expect(second.body.dataset.versionCount).toBe(2)
    expect(second.body.dataset.currentVersion.ordinal).toBe(2)

    const currentPreview = await callApi(`/api/datasets/${first.body.dataset.id}/preview`)
    expect(currentPreview.status).toBe(200)
    expect(currentPreview.body.preview.rows).toEqual([['A', '1'], ['B', '2']])
  })

  it('creates a reproducible local quality run with append-only events and traced artifacts', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Quality run project', rootDir: projectRoot },
    })
    const tablePath = path.join(projectRoot, 'assay.csv')
    await fs.writeFile(
      tablePath,
      'sample,condition,value\nS1,control,1.2\nS2,treated,\nS3,treated,2.4\n',
      'utf8',
    )
    const registered = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath, name: 'Assay measurements' } },
    )

    const started = await callApi(`/api/research-projects/${created.body.project.id}/runs`, {
      method: 'POST',
      body: {
        datasetId: registered.body.dataset.id,
        recipe: 'table-quality-v1',
        parameters: { maxRows: 100 },
      },
    })

    expect(started.status).toBe(201)
    expect(started.body.run).toMatchObject({
      projectId: created.body.project.id,
      datasetId: registered.body.dataset.id,
      datasetVersionId: registered.body.dataset.currentVersion.id,
      recipe: 'table-quality-v1',
      status: 'completed',
      reproducibilityStatus: 'reproducible',
      inputHash: registered.body.dataset.currentVersion.contentHash,
      exitCode: 0,
      summary: {
        scope: 'preview-sample',
        sampledRowCount: 3,
        columnCount: 3,
        missingCellCount: 1,
        completeRowCount: 2,
        numericColumnCount: 1,
        truncated: false,
      },
    })
    expect(started.body.run.environment).toMatchObject({ runtime: 'bun', localOnly: true })
    expect(started.body.artifacts).toHaveLength(2)
    expect(started.body.artifacts.map((artifact: any) => artifact.kind).sort()).toEqual(['report', 'table'])

    for (const artifact of started.body.artifacts) {
      expect((await fs.stat(path.join(projectRoot, artifact.relativePath))).isFile()).toBe(true)
      expect(artifact.contentHash).toHaveLength(64)
    }
    const reportArtifact = started.body.artifacts.find((artifact: any) => artifact.kind === 'report')
    const report = await fs.readFile(path.join(projectRoot, reportArtifact.relativePath), 'utf8')
    expect(report).toContain('Data quality profile')
    expect(report).toContain('No table contents were sent to a model')

    const events = await callApi(`/api/runs/${started.body.run.id}/events`)
    expect(events.status).toBe(200)
    expect(events.body.events.map((event: any) => event.type)).toEqual([
      'run.created',
      'run.started',
      'artifact.created',
      'artifact.created',
      'run.completed',
    ])
    const eventLog = await fs.readFile(path.join(projectRoot, started.body.run.eventLogPath), 'utf8')
    expect(eventLog.trim().split('\n')).toHaveLength(5)

    const listedRuns = await callApi(`/api/research-projects/${created.body.project.id}/runs`)
    const listedArtifacts = await callApi(`/api/research-projects/${created.body.project.id}/artifacts`)
    expect(listedRuns.body.runs).toHaveLength(1)
    expect(listedArtifacts.body.artifacts).toHaveLength(2)

    const replayed = await callApi(`/api/runs/${started.body.run.id}/replay`, { method: 'POST' })
    expect(replayed.status).toBe(201)
    expect(replayed.body.run).toMatchObject({
      parentRunId: started.body.run.id,
      status: 'completed',
      reproducibilityStatus: 'reproducible',
    })
    expect(replayed.body.run.id).not.toBe(started.body.run.id)

    await fs.appendFile(tablePath, 'S4,control,3.1\n', 'utf8')
    await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath, name: 'Assay measurements' } },
    )
    const staleRuns = await callApi(`/api/research-projects/${created.body.project.id}/runs`)
    expect(staleRuns.body.runs).toHaveLength(2)
    expect(staleRuns.body.runs.every((run: any) => run.reproducibilityStatus === 'stale')).toBe(true)
  })

  it('records a failed run when the registered source changes before analysis', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Changed input project', rootDir: projectRoot },
    })
    const tablePath = path.join(projectRoot, 'changed.csv')
    await fs.writeFile(tablePath, 'sample,value\nA,1\n', 'utf8')
    const registered = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath } },
    )
    await fs.writeFile(tablePath, 'sample,value\nA,1\nB,2\n', 'utf8')

    const failed = await callApi(`/api/research-projects/${created.body.project.id}/runs`, {
      method: 'POST',
      body: { datasetId: registered.body.dataset.id, recipe: 'table-quality-v1' },
    })
    expect(failed.status).toBe(409)
    expect(failed.body.message).toContain('register it again')

    const listed = await callApi(`/api/research-projects/${created.body.project.id}/runs`)
    expect(listed.body.runs).toHaveLength(1)
    expect(listed.body.runs[0]).toMatchObject({
      status: 'failed',
      reproducibilityStatus: 'failed',
      exitCode: 1,
    })
  })

  it('recovers an abandoned running record as interrupted and preserves its event history', async () => {
    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Interrupted run project', rootDir: projectRoot },
    })
    const tablePath = path.join(projectRoot, 'interrupt.csv')
    await fs.writeFile(tablePath, 'sample,value\nA,1\n', 'utf8')
    const registered = await callApi(
      `/api/research-projects/${created.body.project.id}/datasets`,
      { method: 'POST', body: { filePath: tablePath } },
    )
    const runId = 'abandoned-run'
    const eventLogPath = path.join('.sciencex', 'runs', runId, 'events.jsonl')
    const manifestPath = path.join('.sciencex', 'runs', runId, 'run.json')
    const now = '2026-07-19T00:00:00.000Z'
    const database = new Database(path.join(projectRoot, '.sciencex', 'research.sqlite'))
    database.query(`
      INSERT INTO analysis_runs (
        id, project_id, dataset_id, dataset_version_id, parent_run_id, recipe, status,
        reproducibility_status, parameters_json, environment_json, input_hash, recipe_hash,
        event_log_path, manifest_path, created_at, started_at
      ) VALUES (?, ?, ?, ?, NULL, 'table-quality-v1', 'running', 'unchecked', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      created.body.project.id,
      registered.body.dataset.id,
      registered.body.dataset.currentVersion.id,
      JSON.stringify({ maxRows: 100 }),
      JSON.stringify({ runtime: 'bun', runtimeVersion: 'test', platform: 'test', architecture: 'test', localOnly: true }),
      registered.body.dataset.currentVersion.contentHash,
      'recipe-hash',
      eventLogPath,
      manifestPath,
      now,
      now,
    )
    database.close()
    await fs.mkdir(path.dirname(path.join(projectRoot, eventLogPath)), { recursive: true })
    await fs.writeFile(
      path.join(projectRoot, eventLogPath),
      `${JSON.stringify({ id: 'created-event', runId, type: 'run.created', at: now, data: {} })}\n`,
      'utf8',
    )

    const listed = await callApi(`/api/research-projects/${created.body.project.id}/runs`)
    expect(listed.status).toBe(200)
    expect(listed.body.runs[0]).toMatchObject({
      id: runId,
      status: 'interrupted',
      reproducibilityStatus: 'failed',
      errorMessage: 'Run was interrupted before completion',
    })
    const events = await callApi(`/api/runs/${runId}/events`)
    expect(events.body.events.map((event: any) => event.type)).toEqual([
      'run.created',
      'run.interrupted',
    ])
  })

  it('rejects paths outside the local filesystem allowlist before creating metadata', async () => {
    const result = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Forbidden', rootDir: '/var' },
    })

    expect(result.status).toBe(403)
    expect(result.body.error).toBe('FORBIDDEN')
    await expect(fs.stat(path.join(projectRoot, '.sciencex'))).rejects.toThrow()
  })

  it('migrates an empty schema-zero project registry before preserving new data', async () => {
    const databasePath = path.join(configDir, 'science', 'projects-v1.sqlite')
    await fs.mkdir(path.dirname(databasePath), { recursive: true })
    const database = new Database(databasePath)
    database.exec(`
      CREATE TABLE science_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO science_meta (key, value) VALUES ('schema_version', '0');
    `)
    database.close()

    const created = await callApi('/api/research-projects', {
      method: 'POST',
      body: { name: 'Migrated registry project', rootDir: projectRoot },
    })
    expect(created.status).toBe(201)

    const inspected = new Database(databasePath, { readonly: true })
    try {
      expect(
        inspected.query("SELECT value FROM science_meta WHERE key = 'schema_version'").get(),
      ).toEqual({ value: '1' })
      expect(inspected.query('SELECT id FROM projects').all()).toHaveLength(1)
    } finally {
      inspected.close()
    }
  })

  it('migrates a schema-one project database and manifest without losing unknown metadata', async () => {
    const projectId = 'legacy-project'
    const now = '2026-01-01T00:00:00.000Z'
    const registryPath = path.join(configDir, 'science', 'projects-v1.sqlite')
    await fs.mkdir(path.dirname(registryPath), { recursive: true })
    const registry = new Database(registryPath)
    registry.exec(`
      CREATE TABLE science_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO science_meta (key, value) VALUES ('schema_version', '1');
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        root_dir TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)
    registry.query('INSERT INTO projects VALUES (?, ?, ?, ?)').run(projectId, projectRoot, now, now)
    registry.close()

    const scienceDirectory = path.join(projectRoot, '.sciencex')
    await fs.mkdir(scienceDirectory, { recursive: true })
    await fs.writeFile(
      path.join(scienceDirectory, 'project.yaml'),
      `schemaVersion: 1\nid: ${projectId}\nname: Legacy project\nquestion: Old question\nrootDir: ${projectRoot}\ncreatedAt: ${now}\nupdatedAt: ${now}\nlabNote: preserve-me\n`,
      'utf8',
    )
    const projectDatabasePath = path.join(scienceDirectory, 'research.sqlite')
    const projectDatabase = new Database(projectDatabasePath)
    projectDatabase.exec(`
      CREATE TABLE science_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO science_meta (key, value) VALUES ('schema_version', '1');
      CREATE TABLE project (
        id TEXT PRIMARY KEY, schema_version INTEGER NOT NULL, name TEXT NOT NULL,
        question TEXT NOT NULL, root_dir TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE datasets (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL,
        canonical_path TEXT NOT NULL UNIQUE, format TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE dataset_versions (
        id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL, ordinal INTEGER NOT NULL,
        size_bytes INTEGER NOT NULL, content_hash TEXT NOT NULL,
        modified_at_ms REAL NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(dataset_id, ordinal)
      );
    `)
    projectDatabase
      .query('INSERT INTO project VALUES (?, 1, ?, ?, ?, ?, ?)')
      .run(projectId, 'Legacy project', 'Old question', projectRoot, now, now)
    projectDatabase.close()

    const listed = await callApi('/api/research-projects')
    expect(listed.status).toBe(200)
    expect(listed.body.projects[0]).toMatchObject({ id: projectId, schemaVersion: 2 })

    const inspected = new Database(projectDatabasePath, { readonly: true })
    try {
      expect(inspected.query("SELECT value FROM science_meta WHERE key = 'schema_version'").get())
        .toEqual({ value: '2' })
      expect(inspected.query('SELECT schema_version FROM project').get()).toEqual({ schema_version: 2 })
      expect(inspected.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'analysis_runs'").get())
        .toEqual({ name: 'analysis_runs' })
      expect(inspected.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'science_artifacts'").get())
        .toEqual({ name: 'science_artifacts' })
    } finally {
      inspected.close()
    }
    const migratedManifest = await fs.readFile(path.join(scienceDirectory, 'project.yaml'), 'utf8')
    expect(migratedManifest).toContain('schemaVersion: 2')
    expect(migratedManifest).toContain('labNote: preserve-me')
  })
})
