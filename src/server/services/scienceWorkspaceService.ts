import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Database } from 'bun:sqlite'
import { dsvFormat } from 'd3-dsv'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { getScienceXProjectRegistryDir } from '../../utils/envUtils.js'
import { ApiError } from '../middleware/errorHandler.js'

const SCIENCE_PROJECT_SCHEMA_VERSION = 2
const SCIENCE_REGISTRY_SCHEMA_VERSION = 1
const PROJECT_DIRECTORY_NAME = '.sciencex'
const PROJECT_DATABASE_NAME = 'research.sqlite'
const PROJECT_MANIFEST_NAME = 'project.yaml'
const REGISTRY_DATABASE_NAME = 'projects-v1.sqlite'
const MAX_TABLE_SIZE_BYTES = 2 * 1024 * 1024 * 1024
const DEFAULT_PREVIEW_BYTES = 4 * 1024 * 1024
const DEFAULT_PREVIEW_ROWS = 50
const MAX_PREVIEW_ROWS = 100

export type ScienceProject = {
  id: string
  schemaVersion: number
  name: string
  question: string
  rootDir: string
  createdAt: string
  updatedAt: string
  rootAvailable: boolean
}

export type ScienceDatasetVersion = {
  id: string
  ordinal: number
  sizeBytes: number
  contentHash: string
  modifiedAtMs: number
  createdAt: string
}

export type ScienceDataset = {
  id: string
  projectId: string
  name: string
  canonicalPath: string
  format: 'csv' | 'tsv'
  createdAt: string
  updatedAt: string
  versionCount: number
  currentVersion: ScienceDatasetVersion
}

export type ScienceDatasetRegistration = {
  dataset: ScienceDataset
  versionCreated: boolean
}

export type ScienceColumnProfile = {
  name: string
  inferredType: 'boolean' | 'integer' | 'number' | 'datetime' | 'string' | 'empty'
  missingCount: number
  uniqueCount: number
}

export type ScienceDatasetPreview = {
  datasetId: string
  datasetName: string
  format: 'csv' | 'tsv'
  delimiter: ',' | '\t'
  headers: string[]
  columns: ScienceColumnProfile[]
  rows: string[][]
  sampledRowCount: number
  truncated: boolean
  sizeBytes: number
  contentHash: string
  localOnly: true
}

type RegistryProjectRow = {
  id: string
  root_dir: string
  created_at: string
  updated_at: string
}

type ProjectRow = {
  id: string
  schema_version: number
  name: string
  question: string
  root_dir: string
  created_at: string
  updated_at: string
}

type DatasetRow = {
  id: string
  project_id: string
  name: string
  canonical_path: string
  format: 'csv' | 'tsv'
  created_at: string
  updated_at: string
  version_count: number
  version_id: string
  version_ordinal: number
  size_bytes: number
  content_hash: string
  modified_at_ms: number
  version_created_at: string
}

type DatasetLocation = {
  project: ScienceProject
  dataset: ScienceDataset
}

function errnoCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined
}

function configureDatabase(database: Database): void {
  database.exec('PRAGMA busy_timeout = 5000')
  database.exec('PRAGMA journal_mode = WAL')
  database.exec('PRAGMA synchronous = NORMAL')
  database.exec('PRAGMA foreign_keys = ON')
}

function readSchemaVersion(database: Database, supportedVersion: number): number {
  database.exec(`
    CREATE TABLE IF NOT EXISTS science_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  const row = database
    .query("SELECT value FROM science_meta WHERE key = 'schema_version'")
    .get() as { value: string } | null
  if (!row) return 0

  const version = Number.parseInt(row.value, 10)
  if (!Number.isInteger(version) || version < 0) {
    throw ApiError.internal('Science workspace database has an invalid schema version')
  }
  if (version > supportedVersion) {
    throw ApiError.conflict(
      `Science workspace schema ${version} is newer than supported schema ${supportedVersion}`,
    )
  }
  return version
}

function setSchemaVersion(database: Database, version: number): void {
  database
    .query(`
      INSERT INTO science_meta (key, value)
      VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    .run(String(version))
}

function migrateRegistryDatabase(database: Database): void {
  const currentVersion = readSchemaVersion(database, SCIENCE_REGISTRY_SCHEMA_VERSION)
  if (currentVersion < 1) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        root_dir TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    setSchemaVersion(database, 1)
  }
}

function migrateProjectDatabase(database: Database): void {
  const currentVersion = readSchemaVersion(database, SCIENCE_PROJECT_SCHEMA_VERSION)
  if (currentVersion < 1) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS project (
        id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        name TEXT NOT NULL,
        question TEXT NOT NULL,
        root_dir TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        canonical_path TEXT NOT NULL UNIQUE,
        format TEXT NOT NULL CHECK (format IN ('csv', 'tsv')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS dataset_versions (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        size_bytes INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        modified_at_ms REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
        UNIQUE(dataset_id, ordinal)
      );

      CREATE INDEX IF NOT EXISTS dataset_versions_latest_idx
        ON dataset_versions(dataset_id, ordinal DESC);
    `)
    setSchemaVersion(database, 1)
  }
  if (currentVersion < 2) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS analysis_runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        dataset_version_id TEXT NOT NULL,
        parent_run_id TEXT,
        recipe TEXT NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN ('queued', 'running', 'completed', 'failed', 'interrupted')
        ),
        reproducibility_status TEXT NOT NULL CHECK (
          reproducibility_status IN ('unchecked', 'reproducible', 'failed', 'stale')
        ),
        parameters_json TEXT NOT NULL,
        environment_json TEXT NOT NULL,
        input_hash TEXT NOT NULL,
        recipe_hash TEXT NOT NULL,
        event_log_path TEXT NOT NULL,
        manifest_path TEXT NOT NULL,
        summary_json TEXT,
        error_message TEXT,
        exit_code INTEGER,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
        FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE RESTRICT,
        FOREIGN KEY(dataset_version_id) REFERENCES dataset_versions(id) ON DELETE RESTRICT,
        FOREIGN KEY(parent_run_id) REFERENCES analysis_runs(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS analysis_runs_project_created_idx
        ON analysis_runs(project_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS science_artifacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        producing_run_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('table', 'report', 'other')),
        name TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
        FOREIGN KEY(producing_run_id) REFERENCES analysis_runs(id) ON DELETE RESTRICT,
        UNIQUE(producing_run_id, relative_path)
      );

      CREATE INDEX IF NOT EXISTS science_artifacts_project_created_idx
        ON science_artifacts(project_id, created_at DESC);

      UPDATE project SET schema_version = 2;
    `)
    setSchemaVersion(database, 2)
  }
}

function registryDatabasePath(): string {
  return path.join(getScienceXProjectRegistryDir(), REGISTRY_DATABASE_NAME)
}

function projectScienceDirectory(rootDir: string): string {
  return path.join(rootDir, PROJECT_DIRECTORY_NAME)
}

function projectDatabasePath(rootDir: string): string {
  return path.join(projectScienceDirectory(rootDir), PROJECT_DATABASE_NAME)
}

async function openRegistryDatabase(): Promise<Database> {
  const databasePath = registryDatabasePath()
  await fs.mkdir(path.dirname(databasePath), { recursive: true, mode: 0o700 })
  const database = new Database(databasePath, { create: true })
  try {
    configureDatabase(database)
    migrateRegistryDatabase(database)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}

function openProjectDatabase(rootDir: string, create = false): Database {
  const database = new Database(
    projectDatabasePath(rootDir),
    create ? { create: true } : { readwrite: true },
  )
  try {
    configureDatabase(database)
    migrateProjectDatabase(database)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const snapshot = await fs.stat(filePath)
    return snapshot.isFile()
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') return false
    throw error
  }
}

async function writeFileAtomically(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.tmp.${process.pid}.${randomBytes(6).toString('hex')}`
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  try {
    await fs.writeFile(temporaryPath, contents, { encoding: 'utf8', mode: 0o600 })
    await fs.rename(temporaryPath, filePath)
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

async function writeProjectManifest(project: ScienceProject, updatedAt: string): Promise<void> {
  const manifestPath = path.join(projectScienceDirectory(project.rootDir), PROJECT_MANIFEST_NAME)
  let existing: Record<string, unknown> = {}
  try {
    const parsed = parseYaml(await fs.readFile(manifestPath, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>
    }
  } catch (error) {
    if (errnoCode(error) !== 'ENOENT') {
      throw ApiError.conflict(`ScienceX project manifest is unreadable: ${manifestPath}`)
    }
  }
  await writeFileAtomically(
    manifestPath,
    stringifyYaml({
      ...existing,
      schemaVersion: SCIENCE_PROJECT_SCHEMA_VERSION,
      id: project.id,
      name: project.name,
      question: project.question,
      rootDir: project.rootDir,
      createdAt: project.createdAt,
      updatedAt,
    }),
  )
}

async function canonicalDirectory(directoryPath: string): Promise<string> {
  let canonicalPath: string
  try {
    canonicalPath = await fs.realpath(directoryPath)
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      throw ApiError.badRequest(`Project directory does not exist: ${directoryPath}`)
    }
    throw error
  }
  const snapshot = await fs.stat(canonicalPath)
  if (!snapshot.isDirectory()) {
    throw ApiError.badRequest(`Project root is not a directory: ${directoryPath}`)
  }
  return canonicalPath
}

async function canonicalTableFile(filePath: string): Promise<{
  canonicalPath: string
  sizeBytes: number
  modifiedAtMs: number
  format: 'csv' | 'tsv'
}> {
  let canonicalPath: string
  try {
    canonicalPath = await fs.realpath(filePath)
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      throw ApiError.badRequest(`Table file does not exist: ${filePath}`)
    }
    throw error
  }
  const snapshot = await fs.stat(canonicalPath)
  if (!snapshot.isFile()) {
    throw ApiError.badRequest(`Dataset path is not a file: ${filePath}`)
  }
  if (snapshot.size > MAX_TABLE_SIZE_BYTES) {
    throw ApiError.badRequest('Table file exceeds the 2 GB registration limit')
  }

  const extension = path.extname(canonicalPath).toLowerCase()
  if (extension !== '.csv' && extension !== '.tsv') {
    throw ApiError.badRequest('The first ScienceX slice supports CSV and TSV tables only')
  }
  return {
    canonicalPath,
    sizeBytes: snapshot.size,
    modifiedAtMs: snapshot.mtimeMs,
    format: extension === '.csv' ? 'csv' : 'tsv',
  }
}

async function calculateSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer)
  }
  return hash.digest('hex')
}

function mapProject(row: ProjectRow, rootAvailable = true): ScienceProject {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    name: row.name,
    question: row.question,
    rootDir: row.root_dir,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rootAvailable,
  }
}

function unavailableProject(row: RegistryProjectRow): ScienceProject {
  return {
    id: row.id,
    schemaVersion: SCIENCE_PROJECT_SCHEMA_VERSION,
    name: path.basename(row.root_dir),
    question: '',
    rootDir: row.root_dir,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rootAvailable: false,
  }
}

function mapDataset(row: DatasetRow): ScienceDataset {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    canonicalPath: row.canonical_path,
    format: row.format,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versionCount: row.version_count,
    currentVersion: {
      id: row.version_id,
      ordinal: row.version_ordinal,
      sizeBytes: row.size_bytes,
      contentHash: row.content_hash,
      modifiedAtMs: row.modified_at_ms,
      createdAt: row.version_created_at,
    },
  }
}

const DATASET_SELECT = `
  SELECT
    d.id,
    d.project_id,
    d.name,
    d.canonical_path,
    d.format,
    d.created_at,
    d.updated_at,
    (SELECT COUNT(*) FROM dataset_versions count_versions WHERE count_versions.dataset_id = d.id)
      AS version_count,
    v.id AS version_id,
    v.ordinal AS version_ordinal,
    v.size_bytes,
    v.content_hash,
    v.modified_at_ms,
    v.created_at AS version_created_at
  FROM datasets d
  JOIN dataset_versions v ON v.dataset_id = d.id
  WHERE v.ordinal = (
    SELECT MAX(latest.ordinal)
    FROM dataset_versions latest
    WHERE latest.dataset_id = d.id
  )
`

async function readRegistryProjects(): Promise<RegistryProjectRow[]> {
  const database = await openRegistryDatabase()
  try {
    return database
      .query('SELECT id, root_dir, created_at, updated_at FROM projects ORDER BY updated_at DESC')
      .all() as RegistryProjectRow[]
  } finally {
    database.close()
  }
}

async function readLocalProject(rootDir: string): Promise<ScienceProject | null> {
  if (!(await fileExists(projectDatabasePath(rootDir)))) return null
  const database = openProjectDatabase(rootDir)
  try {
    const row = database.query('SELECT * FROM project LIMIT 1').get() as ProjectRow | null
    if (!row) return null
    const project = mapProject(row)
    const manifestPath = path.join(projectScienceDirectory(rootDir), PROJECT_MANIFEST_NAME)
    const manifest = await fs.readFile(manifestPath, 'utf8').catch(error => {
      if (errnoCode(error) === 'ENOENT') return ''
      throw error
    })
    let manifestVersion = 0
    if (manifest) {
      try {
        const parsed = parseYaml(manifest)
        manifestVersion = typeof parsed?.schemaVersion === 'number' ? parsed.schemaVersion : 0
      } catch {
        throw ApiError.conflict(`ScienceX project manifest is unreadable: ${manifestPath}`)
      }
    }
    if (manifestVersion < SCIENCE_PROJECT_SCHEMA_VERSION) {
      await writeProjectManifest(project, project.updatedAt)
    }
    return project
  } finally {
    database.close()
  }
}

async function registryProject(projectId: string): Promise<RegistryProjectRow> {
  const database = await openRegistryDatabase()
  try {
    const row = database
      .query('SELECT id, root_dir, created_at, updated_at FROM projects WHERE id = ?')
      .get(projectId) as RegistryProjectRow | null
    if (!row) throw ApiError.notFound(`Research project not found: ${projectId}`)
    return row
  } finally {
    database.close()
  }
}

async function requiredProject(projectId: string): Promise<ScienceProject> {
  const registry = await registryProject(projectId)
  const project = await readLocalProject(registry.root_dir)
  if (!project) {
    throw ApiError.conflict(`Research project root is unavailable: ${registry.root_dir}`)
  }
  if (project.id !== projectId) {
    throw ApiError.conflict('Research project registry does not match the project database')
  }
  return project
}

async function findDataset(datasetId: string): Promise<DatasetLocation> {
  const registry = await readRegistryProjects()
  for (const entry of registry) {
    const project = await readLocalProject(entry.root_dir)
    if (!project) continue

    const database = openProjectDatabase(project.rootDir)
    try {
      const row = database
        .query(`${DATASET_SELECT} AND d.id = ?`)
        .get(datasetId) as DatasetRow | null
      if (row) return { project, dataset: mapDataset(row) }
    } finally {
      database.close()
    }
  }
  throw ApiError.notFound(`Dataset not found: ${datasetId}`)
}

async function readFilePrefix(filePath: string, sizeBytes: number, maxBytes: number): Promise<Buffer> {
  const bytesToRead = Math.min(sizeBytes, maxBytes)
  if (bytesToRead === 0) return Buffer.alloc(0)

  const handle = await fs.open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(bytesToRead)
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

function trimToCompleteRecords(contents: string): string {
  let insideQuotes = false
  let lastCompleteBreak = -1
  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]
    if (character === '"') {
      if (insideQuotes && contents[index + 1] === '"') {
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
    } else if ((character === '\n' || character === '\r') && !insideQuotes) {
      lastCompleteBreak = index
      if (character === '\r' && contents[index + 1] === '\n') index += 1
    }
  }
  return lastCompleteBreak >= 0 ? contents.slice(0, lastCompleteBreak + 1) : contents
}

function normalizeHeaders(rawHeaders: string[], columnCount: number): string[] {
  const occurrences = new Map<string, number>()
  return Array.from({ length: columnCount }, (_, index) => {
    const raw = rawHeaders[index]?.trim() || `Column ${index + 1}`
    const count = (occurrences.get(raw) ?? 0) + 1
    occurrences.set(raw, count)
    return count === 1 ? raw : `${raw} (${count})`
  })
}

function inferValueType(value: string): Exclude<ScienceColumnProfile['inferredType'], 'empty'> {
  const trimmed = value.trim()
  if (/^(true|false)$/i.test(trimmed)) return 'boolean'
  if (/^[+-]?\d+$/.test(trimmed)) return 'integer'
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return 'number'
  if (
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed) &&
    !Number.isNaN(Date.parse(trimmed))
  ) {
    return 'datetime'
  }
  return 'string'
}

function profileColumns(headers: string[], rows: string[][]): ScienceColumnProfile[] {
  return headers.map((name, columnIndex) => {
    const values = rows.map(row => row[columnIndex] ?? '')
    const presentValues = values.filter(value => value.trim() !== '')
    const types = new Set(presentValues.map(inferValueType))
    let inferredType: ScienceColumnProfile['inferredType']
    if (types.size === 0) {
      inferredType = 'empty'
    } else if (types.size === 1) {
      inferredType = [...types][0]
    } else if ([...types].every(type => type === 'integer' || type === 'number')) {
      inferredType = 'number'
    } else {
      inferredType = 'string'
    }

    return {
      name,
      inferredType,
      missingCount: values.length - presentValues.length,
      uniqueCount: new Set(presentValues).size,
    }
  })
}

export class ScienceWorkspaceService {
  async createProject(input: {
    name: string
    question?: string
    rootDir: string
  }): Promise<ScienceProject> {
    const rootDir = await canonicalDirectory(input.rootDir)
    const registry = await openRegistryDatabase()
    try {
      const existing = registry
        .query('SELECT id FROM projects WHERE root_dir = ?')
        .get(rootDir) as { id: string } | null
      if (existing) {
        throw ApiError.conflict(`A research project is already registered at ${rootDir}`)
      }
    } finally {
      registry.close()
    }

    const scienceDirectory = projectScienceDirectory(rootDir)
    const databasePath = projectDatabasePath(rootDir)
    const manifestPath = path.join(scienceDirectory, PROJECT_MANIFEST_NAME)
    if ((await fileExists(databasePath)) || (await fileExists(manifestPath))) {
      throw ApiError.conflict(`ScienceX project metadata already exists in ${scienceDirectory}`)
    }

    await fs.mkdir(scienceDirectory, { recursive: true, mode: 0o700 })
    const id = randomUUID()
    const now = new Date().toISOString()
    const project: ScienceProject = {
      id,
      schemaVersion: SCIENCE_PROJECT_SCHEMA_VERSION,
      name: input.name.trim(),
      question: input.question?.trim() ?? '',
      rootDir,
      createdAt: now,
      updatedAt: now,
      rootAvailable: true,
    }

    try {
      const projectDatabase = openProjectDatabase(rootDir, true)
      try {
        projectDatabase
          .query(`
            INSERT INTO project (
              id, schema_version, name, question, root_dir, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .run(id, SCIENCE_PROJECT_SCHEMA_VERSION, project.name, project.question, rootDir, now, now)
      } finally {
        projectDatabase.close()
      }

      await writeProjectManifest(project, now)

      const registryDatabase = await openRegistryDatabase()
      try {
        registryDatabase
          .query('INSERT INTO projects (id, root_dir, created_at, updated_at) VALUES (?, ?, ?, ?)')
          .run(id, rootDir, now, now)
      } finally {
        registryDatabase.close()
      }
    } catch (error) {
      await Promise.all([
        fs.unlink(databasePath).catch(() => undefined),
        fs.unlink(`${databasePath}-wal`).catch(() => undefined),
        fs.unlink(`${databasePath}-shm`).catch(() => undefined),
        fs.unlink(manifestPath).catch(() => undefined),
      ])
      throw error
    }
    return project
  }

  async listProjects(): Promise<ScienceProject[]> {
    const registry = await readRegistryProjects()
    const projects: ScienceProject[] = []
    for (const entry of registry) {
      const project = await readLocalProject(entry.root_dir)
      projects.push(project ?? unavailableProject(entry))
    }
    return projects
  }

  async getProject(projectId: string): Promise<ScienceProject> {
    return requiredProject(projectId)
  }

  async listDatasets(projectId: string): Promise<ScienceDataset[]> {
    const project = await requiredProject(projectId)
    const database = openProjectDatabase(project.rootDir)
    try {
      return (database.query(`${DATASET_SELECT} ORDER BY d.updated_at DESC`).all() as DatasetRow[])
        .map(mapDataset)
    } finally {
      database.close()
    }
  }

  async registerDataset(input: {
    projectId: string
    filePath: string
    name?: string
  }): Promise<ScienceDatasetRegistration> {
    const project = await requiredProject(input.projectId)
    const table = await canonicalTableFile(input.filePath)
    const contentHash = await calculateSha256(table.canonicalPath)
    const now = new Date().toISOString()
    const database = openProjectDatabase(project.rootDir)
    let datasetId = randomUUID()
    let versionCreated = true

    try {
      const transaction = database.transaction(() => {
        const existing = database
          .query('SELECT id FROM datasets WHERE canonical_path = ?')
          .get(table.canonicalPath) as { id: string } | null

        if (existing) {
          datasetId = existing.id
          const currentVersion = database
            .query(`
              SELECT content_hash, size_bytes, modified_at_ms
              FROM dataset_versions
              WHERE dataset_id = ?
              ORDER BY ordinal DESC
              LIMIT 1
            `)
            .get(datasetId) as {
              content_hash: string
              size_bytes: number
              modified_at_ms: number
            } | null
          database
            .query('UPDATE datasets SET name = ?, updated_at = ? WHERE id = ?')
            .run(input.name?.trim() || path.basename(table.canonicalPath), now, datasetId)
          if (
            currentVersion?.content_hash === contentHash &&
            currentVersion.size_bytes === table.sizeBytes &&
            Math.abs(currentVersion.modified_at_ms - table.modifiedAtMs) <= 0.5
          ) {
            versionCreated = false
          }
        } else {
          database
            .query(`
              INSERT INTO datasets (
                id, project_id, name, canonical_path, format, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              datasetId,
              project.id,
              input.name?.trim() || path.basename(table.canonicalPath),
              table.canonicalPath,
              table.format,
              now,
              now,
            )
        }

        if (versionCreated) {
          const ordinalRow = database
            .query(`
              SELECT COALESCE(MAX(ordinal), 0) + 1 AS ordinal
              FROM dataset_versions
              WHERE dataset_id = ?
            `)
            .get(datasetId) as { ordinal: number }
          database
            .query(`
              INSERT INTO dataset_versions (
                id, dataset_id, ordinal, size_bytes, content_hash, modified_at_ms, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              randomUUID(),
              datasetId,
              ordinalRow.ordinal,
              table.sizeBytes,
              contentHash,
              table.modifiedAtMs,
              now,
            )
        }

        database
          .query('UPDATE project SET updated_at = ? WHERE id = ?')
          .run(now, project.id)
      })
      transaction()

      await writeProjectManifest(project, now)
      const registry = await openRegistryDatabase()
      try {
        registry
          .query('UPDATE projects SET updated_at = ? WHERE id = ?')
          .run(now, project.id)
      } finally {
        registry.close()
      }

      const row = database
        .query(`${DATASET_SELECT} AND d.id = ?`)
        .get(datasetId) as DatasetRow | null
      if (!row) throw ApiError.internal('Registered dataset could not be read back')
      return { dataset: mapDataset(row), versionCreated }
    } finally {
      database.close()
    }
  }

  async previewDataset(
    datasetId: string,
    options?: { maxRows?: number; maxBytes?: number },
  ): Promise<ScienceDatasetPreview> {
    const { dataset } = await findDataset(datasetId)
    const maxRows = Math.max(
      1,
      Math.min(options?.maxRows ?? DEFAULT_PREVIEW_ROWS, MAX_PREVIEW_ROWS),
    )
    const maxBytes = Math.max(
      1024,
      Math.min(options?.maxBytes ?? DEFAULT_PREVIEW_BYTES, DEFAULT_PREVIEW_BYTES),
    )
    const before = await fs.stat(dataset.canonicalPath).catch(error => {
      if (errnoCode(error) === 'ENOENT') {
        throw ApiError.conflict(`Dataset source file is unavailable: ${dataset.canonicalPath}`)
      }
      throw error
    })
    if (!before.isFile()) throw ApiError.conflict('Dataset source path is no longer a file')

    const current = dataset.currentVersion
    if (before.size !== current.sizeBytes || Math.abs(before.mtimeMs - current.modifiedAtMs) > 0.5) {
      throw ApiError.conflict(
        'Dataset source changed after registration; register it again to create a new version',
      )
    }

    const buffer = await readFilePrefix(dataset.canonicalPath, before.size, maxBytes)
    const after = await fs.stat(dataset.canonicalPath)
    if (after.size !== before.size || Math.abs(after.mtimeMs - before.mtimeMs) > 0.5) {
      throw ApiError.conflict('Dataset source changed while the preview was being read')
    }
    if (buffer.includes(0)) {
      throw ApiError.badRequest('Dataset preview requires a UTF-8 text table')
    }

    const sourceWasTruncated = buffer.length < before.size
    let contents = buffer.toString('utf8').replace(/^\uFEFF/, '')
    if (sourceWasTruncated) contents = trimToCompleteRecords(contents)
    const delimiter = dataset.format === 'csv' ? ',' : '\t'
    let parsedRows: string[][]
    try {
      parsedRows = dsvFormat(delimiter).parseRows(contents)
    } catch (error) {
      throw ApiError.badRequest(
        `Could not parse ${dataset.format.toUpperCase()} table: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    if (parsedRows.length === 0) {
      throw ApiError.badRequest('Dataset table is empty')
    }

    const rawHeaders = parsedRows[0]
    const availableRows = parsedRows.slice(1)
    const columnCount = Math.max(rawHeaders.length, ...availableRows.map(row => row.length), 1)
    const headers = normalizeHeaders(rawHeaders, columnCount)
    const rows = availableRows.slice(0, maxRows).map(row =>
      Array.from({ length: columnCount }, (_, columnIndex) => row[columnIndex] ?? ''),
    )

    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      format: dataset.format,
      delimiter,
      headers,
      columns: profileColumns(headers, rows),
      rows,
      sampledRowCount: rows.length,
      truncated: sourceWasTruncated || availableRows.length > maxRows,
      sizeBytes: before.size,
      contentHash: current.contentHash,
      localOnly: true,
    }
  }
}

export const scienceWorkspaceService = new ScienceWorkspaceService()
