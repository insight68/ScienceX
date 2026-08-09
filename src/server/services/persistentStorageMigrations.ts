import * as fs from 'fs/promises'
import { constants as fsConstants } from 'node:fs'
import * as path from 'path'
import { randomBytes } from 'node:crypto'
import { normalizeLegacyDeepSeekManagedEnv } from '../../utils/providerManagedEnvCompat.js'
import { isOpenAIOfficialProviderId } from './openaiOfficialProvider.js'
import { isGrokOfficialProviderId } from './grokOfficialProvider.js'
import { BUILT_IN_PROVIDER_IDS } from '../types/provider.js'
import {
  getClaudeConfigHomeDir,
  getLegacyScienceXConfigRoot,
  getScienceXConfigDir,
  getScienceXComputerUseRuntimeDir,
  getScienceXCredentialsDir,
  getScienceXDataDir,
  getScienceXDiagnosticsDir,
  getScienceXHomeDir,
  getScienceXProjectRegistryDir,
  getScienceXStateDir,
  usesLegacyScienceXLayout,
} from '../../utils/envUtils.js'

export const CURRENT_PROVIDER_INDEX_SCHEMA_VERSION = 2

type MigrationReport = {
  migratedEntries: string[]
  failures: string[]
}

type JsonObject = Record<string, unknown>
type LegacyProviderModel = {
  id: string
  name?: string
}
type LegacyRootProvider = {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: LegacyProviderModel[]
  isActive?: boolean
  notes?: string
}

let migrationPromise: Promise<MigrationReport> | null = null
let migrationStorageKey: string | null = null

function isRecord(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isProviderModels(value: unknown): value is JsonObject {
  return (
    isRecord(value) &&
    typeof value.main === 'string' &&
    typeof value.haiku === 'string' &&
    typeof value.sonnet === 'string' &&
    typeof value.opus === 'string'
  )
}

function isSavedProvider(value: unknown): value is JsonObject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.presetId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.apiKey === 'string' &&
    typeof value.baseUrl === 'string' &&
    isProviderModels(value.models)
  )
}

function isLegacyProviderModel(value: unknown): value is LegacyProviderModel {
  return isRecord(value) && typeof value.id === 'string'
}

function isLegacyRootProvider(value: unknown): value is LegacyRootProvider {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.baseUrl === 'string' &&
    typeof value.apiKey === 'string' &&
    Array.isArray(value.models) &&
    value.models.every(isLegacyProviderModel)
  )
}

function defaultProviderOrder(providers: JsonObject[]): string[] {
  return [
    ...providers
      .map((provider) => provider.id)
      .filter((id): id is string => typeof id === 'string'),
    ...BUILT_IN_PROVIDER_IDS,
  ]
}

function normalizeProviderOrder(value: unknown, providers: JsonObject[]): string[] {
  const knownIds = new Set<string>(defaultProviderOrder(providers))
  const source = Array.isArray(value) ? value : defaultProviderOrder(providers)
  const seen = new Set<string>()
  const order: string[] = []

  for (const id of source) {
    if (typeof id !== 'string' || !knownIds.has(id) || seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }

  for (const id of defaultProviderOrder(providers)) {
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
  }

  return order
}

function errnoCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}

async function readJsonFile(filePath: string): Promise<{ missing: boolean; value: unknown; raw: string }> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return { missing: false, value: JSON.parse(raw), raw }
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return { missing: true, value: undefined, raw: '' }
    }
    throw error
  }
}

async function backupFile(filePath: string, suffix: string): Promise<void> {
  const backupPath = `${filePath}.${suffix}-${Date.now()}-${randomBytes(3).toString('hex')}`
  await fs.copyFile(filePath, backupPath)
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp.${Date.now()}-${randomBytes(3).toString('hex')}`
  try {
    await fs.writeFile(tmpPath, stableStringify(value), 'utf-8')
    await fs.rename(tmpPath, filePath)
  } catch (error) {
    await fs.unlink(tmpPath).catch(() => {})
    throw error
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') return false
    throw error
  }
}

async function copyEntryIfTargetMissing(
  sourcePath: string,
  targetPath: string,
  entryName: string,
  report: MigrationReport,
): Promise<void> {
  if (path.resolve(sourcePath) === path.resolve(targetPath)) return
  try {
    if (!await pathExists(sourcePath) || await pathExists(targetPath)) return
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    const temporaryPath = `${targetPath}.tmp.${process.pid}.${Date.now()}-${randomBytes(3).toString('hex')}`
    try {
      const source = await fs.lstat(sourcePath)
      if (source.isSymbolicLink()) {
        throw new Error('refusing to migrate symbolic link')
      }
      if (source.isDirectory()) {
        await fs.cp(sourcePath, temporaryPath, {
          recursive: true,
          errorOnExist: true,
          force: false,
          preserveTimestamps: true,
        })
      } else if (source.isFile()) {
        await fs.copyFile(sourcePath, temporaryPath, fsConstants.COPYFILE_EXCL)
        await fs.chmod(temporaryPath, source.mode & 0o777)
      } else {
        throw new Error('unsupported filesystem entry')
      }
      await fs.rename(temporaryPath, targetPath)
      report.migratedEntries.push(entryName)
    } catch (error) {
      await fs.rm(temporaryPath, { recursive: true, force: true }).catch(() => {})
      throw error
    }
  } catch (error) {
    report.failures.push(`${entryName}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function migrateScienceXOwnedStorage(
  legacyRoot: string,
  report: MigrationReport,
): Promise<void> {
  if (usesLegacyScienceXLayout()) return

  const legacyScienceXDir = path.join(legacyRoot, 'sciencex')
  const claudeRuntimeDir = getClaudeConfigHomeDir()
  const mappings: Array<[string, string, string]> = [
    [path.join(legacyScienceXDir, 'providers.json'), path.join(getScienceXConfigDir(), 'providers.json'), 'legacy sciencex/providers.json'],
    [path.join(legacyScienceXDir, 'settings.json'), path.join(getScienceXConfigDir(), 'settings.json'), 'legacy sciencex/settings.json'],
    [path.join(legacyScienceXDir, 'desktop-ui.json'), path.join(getScienceXConfigDir(), 'desktop-ui.json'), 'legacy sciencex/desktop-ui.json'],
    [path.join(legacyScienceXDir, 'profile'), path.join(getScienceXConfigDir(), 'profile'), 'legacy sciencex/profile'],
    [path.join(legacyScienceXDir, 'oauth.json'), path.join(getScienceXCredentialsDir(), 'oauth.json'), 'legacy sciencex/oauth.json'],
    [path.join(legacyScienceXDir, 'openai-oauth.json'), path.join(getScienceXCredentialsDir(), 'openai-oauth.json'), 'legacy sciencex/openai-oauth.json'],
    [path.join(legacyScienceXDir, 'grok-oauth.json'), path.join(getScienceXCredentialsDir(), 'grok-oauth.json'), 'legacy sciencex/grok-oauth.json'],
    [path.join(legacyScienceXDir, 'openai-oauth-file-backed'), path.join(getScienceXCredentialsDir(), 'openai-oauth-file-backed'), 'legacy sciencex/openai-oauth-file-backed'],
    [path.join(legacyScienceXDir, 'db'), path.join(getScienceXDataDir(), 'db'), 'legacy sciencex/db'],
    [path.join(legacyScienceXDir, 'traces'), path.join(getScienceXDataDir(), 'traces'), 'legacy sciencex/traces'],
    [path.join(legacyScienceXDir, 'diagnostics'), getScienceXDiagnosticsDir(), 'legacy sciencex/diagnostics'],
    [path.join(legacyRoot, 'science'), getScienceXProjectRegistryDir(), 'legacy science registry'],
    [path.join(legacyRoot, 'adapters.json'), path.join(getScienceXConfigDir(), 'adapters.json'), 'legacy adapters.json'],
    [path.join(legacyRoot, 'adapter-sessions.json'), path.join(getScienceXStateDir(), 'adapter-sessions.json'), 'legacy adapter-sessions.json'],
    [path.join(legacyRoot, 'window-state.json'), path.join(getScienceXStateDir(), 'window-state.json'), 'legacy window-state.json'],
    [path.join(legacyRoot, 'terminal-config.json'), path.join(getScienceXStateDir(), 'terminal-config.json'), 'legacy terminal-config.json'],
    [path.join(legacyRoot, 'scheduled_tasks.json'), path.join(getScienceXStateDir(), 'scheduled_tasks.json'), 'legacy scheduled_tasks.json'],
    [path.join(legacyRoot, 'im-downloads'), path.join(getScienceXDataDir(), 'im-downloads'), 'legacy im-downloads'],
    [path.join(legacyRoot, '.runtime'), getScienceXComputerUseRuntimeDir(), 'legacy computer-use runtime'],
    [path.join(legacyRoot, 'settings.json'), path.join(claudeRuntimeDir, 'settings.json'), 'legacy Claude settings'],
    [path.join(legacyRoot, 'CLAUDE.md'), path.join(claudeRuntimeDir, 'CLAUDE.md'), 'legacy Claude instructions'],
    [path.join(legacyRoot, 'rules'), path.join(claudeRuntimeDir, 'rules'), 'legacy Claude rules'],
    [path.join(legacyRoot, 'skills'), path.join(claudeRuntimeDir, 'skills'), 'legacy Claude skills'],
    [path.join(legacyRoot, 'agents'), path.join(claudeRuntimeDir, 'agents'), 'legacy Claude agents'],
    [path.join(legacyRoot, 'plugins'), path.join(claudeRuntimeDir, 'plugins'), 'legacy Claude plugins'],
    [path.join(legacyRoot, 'projects'), path.join(claudeRuntimeDir, 'projects'), 'legacy Claude sessions'],
    [path.join(legacyRoot, 'teams'), path.join(claudeRuntimeDir, 'teams'), 'legacy Claude teams'],
    [path.join(legacyRoot, 'tasks'), path.join(claudeRuntimeDir, 'tasks'), 'legacy Claude tasks'],
    [path.join(legacyRoot, 'history.jsonl'), path.join(claudeRuntimeDir, 'history.jsonl'), 'legacy Claude history'],
    [path.join(legacyRoot, 'keybindings.json'), path.join(claudeRuntimeDir, 'keybindings.json'), 'legacy Claude keybindings'],
  ]

  for (const [sourcePath, targetPath, entryName] of mappings) {
    await copyEntryIfTargetMissing(sourcePath, targetPath, entryName, report)
  }
}

async function quarantineMalformedFile(filePath: string): Promise<void> {
  const invalidPath = `${filePath}.invalid-${Date.now()}-${randomBytes(3).toString('hex')}`
  await fs.rename(filePath, invalidPath)
}

function migrateProvidersIndex(value: unknown): JsonObject {
  if (!isRecord(value) || !Array.isArray(value.providers)) {
    return {
      schemaVersion: CURRENT_PROVIDER_INDEX_SCHEMA_VERSION,
      activeId: null,
      providers: [],
      providerOrder: [...BUILT_IN_PROVIDER_IDS],
    }
  }

  const {
    activeProviderId: _legacyActiveProviderId,
    providerOrder: rawProviderOrder,
    ...rest
  } = value
  const providers = value.providers.filter(isSavedProvider)
  const rawActiveId =
    typeof value.activeId === 'string'
      ? value.activeId
      : typeof _legacyActiveProviderId === 'string'
        ? _legacyActiveProviderId
        : null
  const activeId = rawActiveId && (
    providers.some((provider) => provider.id === rawActiveId) ||
    isOpenAIOfficialProviderId(rawActiveId) ||
    isGrokOfficialProviderId(rawActiveId)
  )
    ? rawActiveId
    : null

  return {
    ...rest,
    schemaVersion: CURRENT_PROVIDER_INDEX_SCHEMA_VERSION,
    activeId,
    providers,
    providerOrder: normalizeProviderOrder(rawProviderOrder, providers),
  }
}

function migrateManagedSettings(value: unknown): JsonObject {
  if (!isRecord(value)) return {}
  if (value.env !== undefined && !isRecord(value.env)) {
    return { ...value, env: {} }
  }
  if (isRecord(value.env)) {
    const { env, changed } = normalizeLegacyDeepSeekManagedEnv(value.env as Record<string, string>)
    if (changed) return { ...value, env }
  }
  return value
}

async function migrateJsonEntry(
  filePath: string,
  entryName: string,
  report: MigrationReport,
  migrate: (value: unknown) => JsonObject,
): Promise<void> {
  try {
    const current = await readJsonFile(filePath)
    if (current.missing) return

    const migrated = migrate(current.value)
    if (stableStringify(migrated) === stableStringify(current.value)) return

    await backupFile(filePath, 'bak-before-migration')
    await writeJsonFile(filePath, migrated)
    report.migratedEntries.push(entryName)
  } catch (error) {
    if (error instanceof SyntaxError) {
      try {
        await quarantineMalformedFile(filePath)
        await writeJsonFile(filePath, {})
        report.migratedEntries.push(entryName)
        return
      } catch (recoveryError) {
        report.failures.push(`${entryName}: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`)
        return
      }
    }

    report.failures.push(`${entryName}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function legacyProviderModelId(
  provider: LegacyRootProvider,
  preferredModelId: unknown,
): string {
  if (
    typeof preferredModelId === 'string' &&
    provider.models.some((model) => model.id === preferredModelId)
  ) {
    return preferredModelId
  }

  return provider.models[0]?.id ?? ''
}

function migrateLegacyRootProvidersConfig(value: unknown): JsonObject | null {
  if (!isRecord(value) || !Array.isArray(value.providers)) {
    return null
  }

  const providers = value.providers
    .filter(isLegacyRootProvider)
    .map((provider) => {
      const main = legacyProviderModelId(provider, value.activeModel)
      return {
        id: provider.id,
        presetId: 'custom',
        name: provider.name,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        apiFormat: 'anthropic',
        models: {
          main,
          haiku: main,
          sonnet: main,
          opus: main,
        },
        ...(provider.notes !== undefined && { notes: provider.notes }),
      }
    })

  if (providers.length === 0) {
    return null
  }

  const activeLegacyProvider = value.providers
    .filter(isLegacyRootProvider)
    .find((provider) =>
      provider.isActive === true ||
      (typeof value.activeModel === 'string' &&
        provider.models.some((model) => model.id === value.activeModel)),
    )
  const activeId =
    activeLegacyProvider && providers.some((provider) => provider.id === activeLegacyProvider.id)
      ? activeLegacyProvider.id
      : null

  return {
    schemaVersion: CURRENT_PROVIDER_INDEX_SCHEMA_VERSION,
    activeId,
    providers,
    providerOrder: normalizeProviderOrder(undefined, providers),
  }
}

function buildManagedSettingsForMigratedProvider(provider: JsonObject | undefined): JsonObject | null {
  if (!provider || !isProviderModels(provider.models)) return null
  const apiKey = typeof provider.apiKey === 'string' ? provider.apiKey : ''
  const baseUrl = typeof provider.baseUrl === 'string' ? provider.baseUrl : ''
  if (!apiKey || !baseUrl) return null

  return {
    env: {
      ANTHROPIC_BASE_URL: baseUrl,
      ANTHROPIC_AUTH_TOKEN: apiKey,
      ANTHROPIC_MODEL: provider.models.main,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: provider.models.haiku,
      ANTHROPIC_DEFAULT_SONNET_MODEL: provider.models.sonnet,
      ANTHROPIC_DEFAULT_OPUS_MODEL: provider.models.opus,
    },
  }
}

async function migrateLegacyRootProviders(
  configDir: string,
  scixDir: string,
  report: MigrationReport,
): Promise<void> {
  const targetPath = path.join(scixDir, 'providers.json')
  try {
    await fs.access(targetPath)
    return
  } catch (error) {
    if (errnoCode(error) !== 'ENOENT') {
      report.failures.push(`sciencex/providers.json: ${error instanceof Error ? error.message : String(error)}`)
      return
    }
  }

  const legacyPath = path.join(configDir, 'providers.json')

  try {
    const legacy = await readJsonFile(legacyPath)
    if (legacy.missing) return

    const migrated = migrateLegacyRootProvidersConfig(legacy.value)
    if (!migrated) return

    await writeJsonFile(targetPath, migrated)
    report.migratedEntries.push('providers.json -> sciencex/providers.json')

    const settingsPath = path.join(scixDir, 'settings.json')
    const settings = await readJsonFile(settingsPath).catch(() => ({ missing: false, value: undefined, raw: '' }))
    if (!settings.missing) return

    const activeId = typeof migrated.activeId === 'string' ? migrated.activeId : null
    const activeProvider = Array.isArray(migrated.providers)
      ? migrated.providers.find((provider) => isRecord(provider) && provider.id === activeId)
      : undefined
    const managedSettings = buildManagedSettingsForMigratedProvider(
      isRecord(activeProvider) ? activeProvider : undefined,
    )
    if (managedSettings) {
      await writeJsonFile(settingsPath, managedSettings)
      report.migratedEntries.push('providers.json -> sciencex/settings.json')
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      report.failures.push(`providers.json: ${error.message}`)
      return
    }
    report.failures.push(`providers.json: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function runPersistentStorageMigrations(
  legacyRoot: string,
  configDir: string,
): Promise<MigrationReport> {
  const report: MigrationReport = { migratedEntries: [], failures: [] }
  await migrateScienceXOwnedStorage(legacyRoot, report)

  await migrateLegacyRootProviders(legacyRoot, configDir, report)

  await migrateJsonEntry(
    path.join(configDir, 'providers.json'),
    'sciencex/providers.json',
    report,
    migrateProvidersIndex,
  )
  await migrateJsonEntry(
    path.join(configDir, 'settings.json'),
    'sciencex/settings.json',
    report,
    migrateManagedSettings,
  )

  if (!usesLegacyScienceXLayout()) {
    await writeJsonFile(path.join(getScienceXStateDir(), 'migration-v1.json'), {
      schemaVersion: 1,
      source: legacyRoot,
      completedAt: new Date().toISOString(),
      migratedEntries: report.migratedEntries,
      failures: report.failures,
    }).catch((error) => {
      report.failures.push(`migration-v1.json: ${error instanceof Error ? error.message : String(error)}`)
    })
  }

  return report
}

export function ensurePersistentStorageUpgraded(): Promise<MigrationReport> {
  const legacyRoot = getLegacyScienceXConfigRoot()
  const configDir = getScienceXConfigDir()
  const storageKey = `${getScienceXHomeDir()}\0${legacyRoot}\0${configDir}`
  if (!migrationPromise || migrationStorageKey !== storageKey) {
    migrationStorageKey = storageKey
    migrationPromise = runPersistentStorageMigrations(legacyRoot, configDir)
  }
  return migrationPromise
}

export function resetPersistentStorageMigrationsForTests(): void {
  migrationPromise = null
  migrationStorageKey = null
}
