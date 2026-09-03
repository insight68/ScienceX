import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { Database } from 'bun:sqlite'
import { ApiError } from '../middleware/errorHandler.js'
import {
  scienceWorkspaceService,
  type ScienceProject,
} from './scienceWorkspaceService.js'

export type ScienceExperimentStatus = 'draft' | 'ready'
export type ScienceAssayReadout = 'cck-8' | 'celltiter-glo'
export type ScienceConcentrationUnit = 'nM' | 'µM' | 'mM'
export type SciencePlateWellRole = 'blank' | 'vehicle-control' | 'positive-control' | 'treatment'

export type ScienceCellViabilityProtocol = {
  cellLine: string
  compoundName: string
  readout: ScienceAssayReadout
  treatmentDurationHours: number
  seedingDensityCellsPerWell: number
  concentrationUnit: ScienceConcentrationUnit | null
  concentrations: number[]
  replicateCount: number
  includeBlankControl: boolean
  vehicleControl: {
    name: string
    finalPercent: number
  } | null
  positiveControl: string
}

export type SciencePlateWell = {
  well: string
  role: SciencePlateWellRole
  label: string
  concentration: number | null
  concentrationUnit: ScienceConcentrationUnit | null
  replicate: number
}

export type SciencePlateDesign = {
  plateFormat: 96
  wells: SciencePlateWell[]
}

export type ScienceExperimentIssueCode =
  | 'missing-cell-line'
  | 'missing-compound'
  | 'invalid-duration'
  | 'invalid-seeding-density'
  | 'missing-concentration-unit'
  | 'insufficient-dose-levels'
  | 'invalid-dose'
  | 'duplicate-dose'
  | 'insufficient-replicates'
  | 'missing-blank-control'
  | 'missing-vehicle-control'
  | 'plate-capacity-exceeded'
  | 'invalid-well'
  | 'duplicate-well'
  | 'duplicate-replicate'
  | 'incomplete-layout'
  | 'missing-positive-control'

export type ScienceExperimentIssue = {
  code: ScienceExperimentIssueCode
  severity: 'blocking' | 'warning'
  message: string
}

export type ScienceExperimentReadiness = {
  blockingCount: number
  warningCount: number
  issues: ScienceExperimentIssue[]
}

export type ScienceExperiment = {
  id: string
  projectId: string
  name: string
  objective: string
  assayType: 'cell-viability-dose-response'
  status: ScienceExperimentStatus
  linkedDatasetId: string | null
  linkedDatasetVersionId: string | null
  protocolVersion: {
    id: string
    ordinal: number
    protocol: ScienceCellViabilityProtocol
    createdAt: string
  }
  designVersion: {
    id: string
    ordinal: number
    design: SciencePlateDesign
    createdAt: string
  }
  readiness: ScienceExperimentReadiness
  createdAt: string
  updatedAt: string
}

export type CreateScienceExperimentInput = {
  projectId: string
  name: string
  objective?: string
  assayType: 'cell-viability-dose-response'
  linkedDatasetId?: string | null
  protocol: ScienceCellViabilityProtocol
  design?: SciencePlateDesign
}

type ExperimentRow = {
  id: string
  project_id: string
  name: string
  objective: string
  assay_type: 'cell-viability-dose-response'
  status: ScienceExperimentStatus
  linked_dataset_id: string | null
  linked_dataset_version_id: string | null
  created_at: string
  updated_at: string
  protocol_version_id: string
  protocol_ordinal: number
  protocol_json: string
  protocol_created_at: string
  design_version_id: string
  design_ordinal: number
  plate_format: 96
  layout_json: string
  design_created_at: string
}

const EXPERIMENT_SELECT = `
  SELECT
    experiment.id,
    experiment.project_id,
    experiment.name,
    experiment.objective,
    experiment.assay_type,
    experiment.status,
    experiment.linked_dataset_id,
    experiment.linked_dataset_version_id,
    experiment.created_at,
    experiment.updated_at,
    protocol.id AS protocol_version_id,
    protocol.ordinal AS protocol_ordinal,
    protocol.protocol_json,
    protocol.created_at AS protocol_created_at,
    design.id AS design_version_id,
    design.ordinal AS design_ordinal,
    design.plate_format,
    design.layout_json,
    design.created_at AS design_created_at
  FROM science_experiments experiment
  JOIN science_protocol_versions protocol ON protocol.experiment_id = experiment.id
  JOIN science_design_versions design ON design.experiment_id = experiment.id
  WHERE protocol.ordinal = (
    SELECT MAX(latest_protocol.ordinal)
    FROM science_protocol_versions latest_protocol
    WHERE latest_protocol.experiment_id = experiment.id
  )
  AND design.ordinal = (
    SELECT MAX(latest_design.ordinal)
    FROM science_design_versions latest_design
    WHERE latest_design.experiment_id = experiment.id
  )
`

function openProjectDatabase(project: ScienceProject): Database {
  const database = new Database(path.join(project.rootDir, '.sciencex', 'research.sqlite'), {
    readwrite: true,
  })
  database.exec('PRAGMA busy_timeout = 5000')
  database.exec('PRAGMA journal_mode = WAL')
  database.exec('PRAGMA synchronous = NORMAL')
  database.exec('PRAGMA foreign_keys = ON')
  return database
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    throw ApiError.internal(`Stored ${label} is malformed`)
  }
}

function normalizeProtocol(protocol: ScienceCellViabilityProtocol): ScienceCellViabilityProtocol {
  return {
    ...protocol,
    cellLine: protocol.cellLine.trim(),
    compoundName: protocol.compoundName.trim(),
    concentrations: [...protocol.concentrations],
    vehicleControl: protocol.vehicleControl
      ? {
          name: protocol.vehicleControl.name.trim(),
          finalPercent: protocol.vehicleControl.finalPercent,
        }
      : null,
    positiveControl: protocol.positiveControl.trim(),
  }
}

function normalizeDesign(design: SciencePlateDesign): SciencePlateDesign {
  return {
    plateFormat: 96,
    wells: design.wells.map(well => ({
      ...well,
      well: well.well.trim().toUpperCase(),
      label: well.label.trim(),
    })),
  }
}

export function generateSciencePlateDesign(protocol: ScienceCellViabilityProtocol): SciencePlateDesign {
  const groups: Array<{
    role: SciencePlateWellRole
    label: string
    concentration: number | null
    concentrationUnit: ScienceConcentrationUnit | null
  }> = []
  if (protocol.includeBlankControl) {
    groups.push({
      role: 'blank',
      label: 'Blank',
      concentration: null,
      concentrationUnit: null,
    })
  }
  if (protocol.vehicleControl) {
    groups.push({
      role: 'vehicle-control',
      label: protocol.vehicleControl.name || 'Vehicle control',
      concentration: null,
      concentrationUnit: null,
    })
  }
  if (protocol.positiveControl) {
    groups.push({
      role: 'positive-control',
      label: protocol.positiveControl,
      concentration: null,
      concentrationUnit: null,
    })
  }
  for (const concentration of protocol.concentrations) {
    groups.push({
      role: 'treatment',
      label: `${protocol.compoundName || 'Treatment'} · ${concentration} ${protocol.concentrationUnit ?? ''}`.trim(),
      concentration,
      concentrationUnit: protocol.concentrationUnit,
    })
  }

  const rowNames = 'ABCDEFGH'
  const wells: SciencePlateWell[] = []
  groups.forEach((group, groupIndex) => {
    for (let replicateIndex = 0; replicateIndex < protocol.replicateCount; replicateIndex += 1) {
      wells.push({
        well: `${rowNames[replicateIndex] ?? '?'}${groupIndex + 1}`,
        role: group.role,
        label: group.label,
        concentration: group.concentration,
        concentrationUnit: group.concentrationUnit,
        replicate: replicateIndex + 1,
      })
    }
  })
  return { plateFormat: 96, wells }
}

export function validateScienceExperimentDesign(
  protocol: ScienceCellViabilityProtocol,
  design: SciencePlateDesign,
): ScienceExperimentReadiness {
  const issues: ScienceExperimentIssue[] = []
  const blocking = (code: ScienceExperimentIssueCode, message: string) => {
    issues.push({ code, severity: 'blocking', message })
  }
  const warning = (code: ScienceExperimentIssueCode, message: string) => {
    issues.push({ code, severity: 'warning', message })
  }

  if (!protocol.cellLine) blocking('missing-cell-line', 'Record the cell line before execution.')
  if (!protocol.compoundName) blocking('missing-compound', 'Record the tested compound before execution.')
  if (!Number.isFinite(protocol.treatmentDurationHours) || protocol.treatmentDurationHours <= 0) {
    blocking('invalid-duration', 'Treatment duration must be greater than zero hours.')
  }
  if (!Number.isInteger(protocol.seedingDensityCellsPerWell) || protocol.seedingDensityCellsPerWell <= 0) {
    blocking('invalid-seeding-density', 'Seeding density must be a positive whole number.')
  }
  if (!protocol.concentrationUnit) {
    blocking('missing-concentration-unit', 'Choose one concentration unit for all treatment wells.')
  }

  const validDoses = protocol.concentrations.filter(value => Number.isFinite(value) && value > 0)
  if (validDoses.length !== protocol.concentrations.length) {
    blocking('invalid-dose', 'Every treatment concentration must be finite and greater than zero.')
  }
  const uniqueDoses = new Set(validDoses.map(value => String(value)))
  if (uniqueDoses.size < 4) {
    blocking('insufficient-dose-levels', 'At least four unique non-zero dose levels are required.')
  }
  if (uniqueDoses.size !== validDoses.length) {
    blocking('duplicate-dose', 'Treatment concentrations must not be duplicated.')
  }
  if (!Number.isInteger(protocol.replicateCount) || protocol.replicateCount < 3) {
    blocking('insufficient-replicates', 'At least three replicate wells per group are required.')
  }
  if (!protocol.includeBlankControl) {
    blocking('missing-blank-control', 'A blank control group is required for background correction.')
  }
  if (
    !protocol.vehicleControl ||
    !protocol.vehicleControl.name ||
    !Number.isFinite(protocol.vehicleControl.finalPercent) ||
    protocol.vehicleControl.finalPercent < 0 ||
    protocol.vehicleControl.finalPercent > 100
  ) {
    blocking('missing-vehicle-control', 'Record a valid vehicle control and final percentage.')
  }
  if (!protocol.positiveControl) {
    warning('missing-positive-control', 'Add a positive control when the assay interpretation requires one.')
  }

  const expectedGroups = protocol.concentrations.length +
    (protocol.includeBlankControl ? 1 : 0) +
    (protocol.vehicleControl ? 1 : 0) +
    (protocol.positiveControl ? 1 : 0)
  if (expectedGroups > 12 || protocol.replicateCount > 8 || design.wells.length > 96) {
    blocking('plate-capacity-exceeded', 'The design does not fit in one 96-well plate.')
  }

  const seenWells = new Set<string>()
  const seenReplicates = new Set<string>()
  let hasDuplicateWell = false
  let hasDuplicateReplicate = false
  let hasInvalidWell = false
  for (const well of design.wells) {
    if (!/^[A-H](?:[1-9]|1[0-2])$/.test(well.well)) hasInvalidWell = true
    if (seenWells.has(well.well)) hasDuplicateWell = true
    seenWells.add(well.well)
    const replicateKey = `${well.role}:${well.concentration ?? ''}:${well.replicate}`
    if (seenReplicates.has(replicateKey)) hasDuplicateReplicate = true
    seenReplicates.add(replicateKey)
  }
  if (hasInvalidWell) blocking('invalid-well', 'Every assignment must use a well from A1 through H12.')
  if (hasDuplicateWell) blocking('duplicate-well', 'A physical well can only have one assignment.')
  if (hasDuplicateReplicate) {
    blocking('duplicate-replicate', 'Replicate numbers must be unique within each experimental group.')
  }

  const countRole = (role: SciencePlateWellRole) => design.wells.filter(well => well.role === role).length
  let incomplete = false
  if (protocol.includeBlankControl && countRole('blank') < protocol.replicateCount) incomplete = true
  if (protocol.vehicleControl && countRole('vehicle-control') < protocol.replicateCount) incomplete = true
  if (protocol.positiveControl && countRole('positive-control') < protocol.replicateCount) incomplete = true
  for (const concentration of protocol.concentrations) {
    const treatmentCount = design.wells.filter(well => (
      well.role === 'treatment' &&
      well.concentration === concentration &&
      well.concentrationUnit === protocol.concentrationUnit
    )).length
    if (treatmentCount < protocol.replicateCount) incomplete = true
  }
  if (incomplete || design.wells.length === 0) {
    blocking('incomplete-layout', 'The plate layout is missing one or more required replicate assignments.')
  }

  return {
    blockingCount: issues.filter(issue => issue.severity === 'blocking').length,
    warningCount: issues.filter(issue => issue.severity === 'warning').length,
    issues,
  }
}

function mapExperiment(row: ExperimentRow): ScienceExperiment {
  const protocol = parseJson<ScienceCellViabilityProtocol>(row.protocol_json, 'experiment protocol')
  const design = parseJson<SciencePlateDesign>(row.layout_json, 'plate design')
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    objective: row.objective,
    assayType: row.assay_type,
    status: row.status,
    linkedDatasetId: row.linked_dataset_id,
    linkedDatasetVersionId: row.linked_dataset_version_id,
    protocolVersion: {
      id: row.protocol_version_id,
      ordinal: row.protocol_ordinal,
      protocol,
      createdAt: row.protocol_created_at,
    },
    designVersion: {
      id: row.design_version_id,
      ordinal: row.design_ordinal,
      design,
      createdAt: row.design_created_at,
    },
    readiness: validateScienceExperimentDesign(protocol, design),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ScienceExperimentService {
  async listExperiments(projectId: string): Promise<ScienceExperiment[]> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const database = openProjectDatabase(project)
    try {
      return (database
        .query(`${EXPERIMENT_SELECT} AND experiment.project_id = ? ORDER BY experiment.updated_at DESC`)
        .all(project.id) as ExperimentRow[]).map(mapExperiment)
    } finally {
      database.close()
    }
  }

  async getExperiment(projectId: string, experimentId: string): Promise<ScienceExperiment> {
    const project = await scienceWorkspaceService.getProject(projectId)
    const database = openProjectDatabase(project)
    try {
      const row = database
        .query(`${EXPERIMENT_SELECT} AND experiment.id = ? AND experiment.project_id = ?`)
        .get(experimentId, project.id) as ExperimentRow | null
      if (!row) throw ApiError.notFound(`Experiment not found in research project: ${experimentId}`)
      return mapExperiment(row)
    } finally {
      database.close()
    }
  }

  async createExperiment(input: CreateScienceExperimentInput): Promise<ScienceExperiment> {
    const project = await scienceWorkspaceService.getProject(input.projectId)
    let linkedDatasetVersionId: string | null = null
    if (input.linkedDatasetId) {
      const dataset = await scienceWorkspaceService.getDatasetVersion({
        projectId: project.id,
        datasetId: input.linkedDatasetId,
      })
      linkedDatasetVersionId = dataset.currentVersion.id
    }

    const protocol = normalizeProtocol(input.protocol)
    const design = input.design
      ? normalizeDesign(input.design)
      : generateSciencePlateDesign(protocol)
    const readiness = validateScienceExperimentDesign(protocol, design)
    const status: ScienceExperimentStatus = readiness.blockingCount === 0 ? 'ready' : 'draft'
    const now = new Date().toISOString()
    const experimentId = randomUUID()
    const protocolVersionId = randomUUID()
    const designVersionId = randomUUID()
    const database = openProjectDatabase(project)
    let row: ExperimentRow | null = null
    try {
      const insert = database.transaction(() => {
        database
          .query(`
            INSERT INTO science_experiments (
              id, project_id, name, objective, assay_type, status,
              linked_dataset_id, linked_dataset_version_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            experimentId,
            project.id,
            input.name.trim(),
            input.objective?.trim() ?? '',
            input.assayType,
            status,
            input.linkedDatasetId ?? null,
            linkedDatasetVersionId,
            now,
            now,
          )
        database
          .query(`
            INSERT INTO science_protocol_versions (
              id, experiment_id, ordinal, protocol_json, created_at
            ) VALUES (?, ?, 1, ?, ?)
          `)
          .run(protocolVersionId, experimentId, JSON.stringify(protocol), now)
        database
          .query(`
            INSERT INTO science_design_versions (
              id, experiment_id, ordinal, plate_format, layout_json, created_at
            ) VALUES (?, ?, 1, 96, ?, ?)
          `)
          .run(designVersionId, experimentId, JSON.stringify(design), now)
      })
      insert()
      row = database
        .query(`${EXPERIMENT_SELECT} AND experiment.id = ?`)
        .get(experimentId) as ExperimentRow | null
    } finally {
      database.close()
    }

    if (!row) throw ApiError.internal('Created experiment could not be read back')
    await scienceWorkspaceService.touchProject(project.id, now)
    return mapExperiment(row)
  }

  async linkDataset(input: {
    projectId: string
    experimentId: string
    datasetId: string
  }): Promise<ScienceExperiment> {
    const project = await scienceWorkspaceService.getProject(input.projectId)
    const dataset = await scienceWorkspaceService.getDatasetVersion({
      projectId: project.id,
      datasetId: input.datasetId,
    })
    const now = new Date().toISOString()
    const database = openProjectDatabase(project)
    let row: ExperimentRow | null = null
    try {
      const updated = database
        .query(`
          UPDATE science_experiments
          SET linked_dataset_id = ?, linked_dataset_version_id = ?, updated_at = ?
          WHERE id = ? AND project_id = ?
        `)
        .run(
          dataset.id,
          dataset.currentVersion.id,
          now,
          input.experimentId,
          project.id,
        )
      if (updated.changes !== 1) {
        throw ApiError.notFound(`Experiment not found in research project: ${input.experimentId}`)
      }
      row = database
        .query(`${EXPERIMENT_SELECT} AND experiment.id = ? AND experiment.project_id = ?`)
        .get(input.experimentId, project.id) as ExperimentRow | null
    } finally {
      database.close()
    }

    if (!row) throw ApiError.internal('Updated experiment could not be read back')
    await scienceWorkspaceService.touchProject(project.id, now)
    return mapExperiment(row)
  }
}

export const scienceExperimentService = new ScienceExperimentService()
