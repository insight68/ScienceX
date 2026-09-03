import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'

const scenarioSchema = z.object({
  id: z.enum(['success', 'version-change', 'missing-well', 'weak-response']),
  datasetId: z.string().min(1),
  datasetVersionId: z.string().min(1),
  experimentId: z.string().min(1),
}).passthrough()

const exampleSchema = z.object({
  schemaVersion: z.literal(1),
  exampleId: z.literal('cell-viability-dose-response-v1'),
  templateVersion: z.literal(1),
  simulatedData: z.literal(true),
  locale: z.enum(['zh', 'en']),
  materializedAt: z.string().datetime(),
  projectId: z.string().min(1),
  scenarios: z.array(scenarioSchema).min(1).max(4),
}).passthrough()

export type ScienceExampleMetadata = z.infer<typeof exampleSchema>

// The pre-feature shape is an absent marker. Existing projects remain byte-for-byte
// unchanged; unknown versions are left to a future reader, never rewritten here.
export function parseScienceExampleMetadata(value: unknown): ScienceExampleMetadata | null {
  const result = exampleSchema.safeParse(value)
  if (!result.success) return null
  const ids = result.data.scenarios.map(scenario => scenario.id)
  if (ids[0] !== 'success' || new Set(ids).size !== ids.length) return null
  return result.data
}

export async function readScienceExampleMetadata(rootDir: string): Promise<ScienceExampleMetadata | null> {
  try {
    const directory = path.join(rootDir, '.sciencex')
    const marker = path.join(directory, 'example.json')
    const [directoryStat, markerStat] = await Promise.all([fs.lstat(directory), fs.lstat(marker)])
    if (!directoryStat.isDirectory() || !markerStat.isFile() || markerStat.size > 32_768) return null
    return parseScienceExampleMetadata(JSON.parse(await fs.readFile(marker, 'utf8')))
  } catch {
    return null
  }
}
