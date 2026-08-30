import type {
  ScienceCellViabilityProtocol,
  SciencePlateDesign,
  SciencePlateWellRole,
} from './scienceExperimentService.js'

export type ScienceDoseResponseWarningCode =
  | 'high-replicate-variation'
  | 'limited-response-range'
  | 'weak-model-fit'
  | 'relative-ic50-outside-tested-range'
  | 'implausible-asymptote'

export type ScienceDoseResponseWarning = {
  code: ScienceDoseResponseWarningCode
  severity: 'warning' | 'info'
  message: string
  concentrations: number[]
}

export type ScienceNormalizedWell = {
  well: string
  role: SciencePlateWellRole
  label: string
  concentration: number | null
  replicate: number
  rawSignal: number
  blankCorrectedSignal: number
  normalizedViabilityPercent: number
}

export type ScienceDoseResponsePoint = {
  concentration: number
  replicateCount: number
  meanViabilityPercent: number
  standardDeviation: number
  coefficientOfVariationPercent: number | null
}

export type ScienceDoseResponseFit = {
  model: '4pl'
  top: number
  bottom: number
  relativeIc50: number
  hillSlope: number
  rSquared: number
  rmse: number
  testedRangePosition: 'within-range' | 'below-range' | 'above-range'
  reviewStatus: 'acceptable' | 'review-required'
  curve: Array<{ concentration: number; viabilityPercent: number }>
}

export type ScienceDoseResponseSummary = {
  scope: 'full-linked-plate'
  wellColumn: string
  signalColumn: string
  assignedWellCount: number
  ignoredRowCount: number
  blankMeanSignal: number
  blankStandardDeviation: number
  vehicleMeanBlankCorrectedSignal: number
  vehicleStandardDeviation: number
  positiveControlMeanViabilityPercent: number | null
  normalizedWells: ScienceNormalizedWell[]
  points: ScienceDoseResponsePoint[]
  fit: ScienceDoseResponseFit
  warnings: ScienceDoseResponseWarning[]
}

export class ScienceDoseResponseAnalysisError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScienceDoseResponseAnalysisError'
  }
}

type FourParameterVector = [bottom: number, logRange: number, logIc50: number, logHill: number]

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const average = mean(values)
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) /
    (values.length - 1)
  return Math.sqrt(variance)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeVector(
  vector: FourParameterVector,
  minimumLogConcentration: number,
  maximumLogConcentration: number,
): FourParameterVector {
  return [
    clamp(vector[0], -100, 200),
    clamp(vector[1], Math.log(1), Math.log(400)),
    clamp(vector[2], minimumLogConcentration - 4, maximumLogConcentration + 4),
    clamp(vector[3], Math.log(0.05), Math.log(10)),
  ]
}

function parametersFromVector(vector: FourParameterVector) {
  const bottom = vector[0]
  return {
    bottom,
    top: bottom + Math.exp(vector[1]),
    logIc50: vector[2],
    hillSlope: Math.exp(vector[3]),
  }
}

function predictViability(logConcentration: number, vector: FourParameterVector): number {
  const parameters = parametersFromVector(vector)
  const ratio = 10 ** ((logConcentration - parameters.logIc50) * parameters.hillSlope)
  return parameters.bottom + ((parameters.top - parameters.bottom) / (1 + ratio))
}

function fitFourParameterLogistic(observations: Array<{ concentration: number; viability: number }>) {
  const logConcentrations = observations.map(observation => Math.log10(observation.concentration))
  const minimumLogConcentration = Math.min(...logConcentrations)
  const maximumLogConcentration = Math.max(...logConcentrations)
  const viabilityValues = observations.map(observation => observation.viability)
  const minimumViability = Math.min(...viabilityValues)
  const maximumViability = Math.max(...viabilityValues)
  const midpoint = (minimumViability + maximumViability) / 2
  const midpointObservation = observations.reduce((closest, observation) => (
    Math.abs(observation.viability - midpoint) < Math.abs(closest.viability - midpoint)
      ? observation
      : closest
  ))
  const midpointLogConcentration = Math.log10(midpointObservation.concentration)

  const objective = (candidate: FourParameterVector): number => {
    const vector = normalizeVector(candidate, minimumLogConcentration, maximumLogConcentration)
    return observations.reduce((sum, observation) => {
      const residual = observation.viability - predictViability(Math.log10(observation.concentration), vector)
      return sum + (residual ** 2)
    }, 0)
  }

  const optimize = (start: FourParameterVector): { vector: FourParameterVector; score: number } => {
    const steps = [8, 0.2, 0.35, 0.18]
    let simplex = [
      normalizeVector(start, minimumLogConcentration, maximumLogConcentration),
      ...steps.map((step, index) => {
        const candidate = [...start] as FourParameterVector
        candidate[index] += step
        return normalizeVector(candidate, minimumLogConcentration, maximumLogConcentration)
      }),
    ]
    let scores = simplex.map(objective)
    for (let iteration = 0; iteration < 600; iteration += 1) {
      const ranked = simplex.map((vector, index) => ({ vector, score: scores[index], index }))
        .sort((left, right) => left.score - right.score || left.index - right.index)
      simplex = ranked.map(entry => entry.vector)
      scores = ranked.map(entry => entry.score)
      if (Math.abs(scores.at(-1)! - scores[0]) < 1e-10) break

      const centroid = [0, 1, 2, 3].map(parameterIndex => (
        simplex.slice(0, 4).reduce((sum, vector) => sum + vector[parameterIndex], 0) / 4
      )) as FourParameterVector
      const worst = simplex[4]
      const reflected = normalizeVector(
        centroid.map((value, index) => value + (value - worst[index])) as FourParameterVector,
        minimumLogConcentration,
        maximumLogConcentration,
      )
      const reflectedScore = objective(reflected)

      if (reflectedScore < scores[0]) {
        const expanded = normalizeVector(
          centroid.map((value, index) => value + (2 * (reflected[index] - value))) as FourParameterVector,
          minimumLogConcentration,
          maximumLogConcentration,
        )
        const expandedScore = objective(expanded)
        simplex[4] = expandedScore < reflectedScore ? expanded : reflected
        scores[4] = Math.min(expandedScore, reflectedScore)
        continue
      }
      if (reflectedScore < scores[3]) {
        simplex[4] = reflected
        scores[4] = reflectedScore
        continue
      }

      const contracted = normalizeVector(
        centroid.map((value, index) => value + (0.5 * (worst[index] - value))) as FourParameterVector,
        minimumLogConcentration,
        maximumLogConcentration,
      )
      const contractedScore = objective(contracted)
      if (contractedScore < scores[4]) {
        simplex[4] = contracted
        scores[4] = contractedScore
        continue
      }

      const best = simplex[0]
      simplex = [best, ...simplex.slice(1).map(vector => normalizeVector(
        best.map((value, index) => value + (0.5 * (vector[index] - value))) as FourParameterVector,
        minimumLogConcentration,
        maximumLogConcentration,
      ))]
      scores = simplex.map(objective)
    }
    const bestIndex = scores.reduce((best, score, index) => score < scores[best] ? index : best, 0)
    return { vector: simplex[bestIndex], score: scores[bestIndex] }
  }

  const observedRange = Math.max(10, maximumViability - minimumViability)
  const starts: FourParameterVector[] = [
    [minimumViability, Math.log(observedRange), midpointLogConcentration, Math.log(1)],
    [minimumViability, Math.log(observedRange), midpointLogConcentration, Math.log(0.5)],
    [minimumViability, Math.log(observedRange), midpointLogConcentration, Math.log(2)],
    [0, Math.log(100), midpointLogConcentration, Math.log(1)],
    [0, Math.log(100), (minimumLogConcentration + maximumLogConcentration) / 2, Math.log(1)],
  ]
  const best = starts.map(optimize).sort((left, right) => left.score - right.score)[0]
  const parameters = parametersFromVector(best.vector)
  const totalSumSquares = viabilityValues.reduce((sum, value) => (
    sum + ((value - mean(viabilityValues)) ** 2)
  ), 0)
  const rSquared = totalSumSquares === 0 ? 0 : 1 - (best.score / totalSumSquares)
  const rmse = Math.sqrt(best.score / observations.length)
  const relativeIc50 = 10 ** parameters.logIc50
  const minimumConcentration = 10 ** minimumLogConcentration
  const maximumConcentration = 10 ** maximumLogConcentration
  const testedRangePosition = relativeIc50 < minimumConcentration
    ? 'below-range' as const
    : relativeIc50 > maximumConcentration
      ? 'above-range' as const
      : 'within-range' as const
  const curve = Array.from({ length: 81 }, (_, index) => {
    const logConcentration = minimumLogConcentration +
      ((maximumLogConcentration - minimumLogConcentration) * index / 80)
    return {
      concentration: 10 ** logConcentration,
      viabilityPercent: predictViability(logConcentration, best.vector),
    }
  })
  return {
    top: parameters.top,
    bottom: parameters.bottom,
    relativeIc50,
    hillSlope: parameters.hillSlope,
    rSquared,
    rmse,
    testedRangePosition,
    curve,
  }
}

export function analyzeCellViabilityDoseResponse(input: {
  protocol: ScienceCellViabilityProtocol
  design: SciencePlateDesign
  headers: string[]
  rows: string[][]
  wellColumn: string
  signalColumn: string
}): ScienceDoseResponseSummary {
  const wellColumnIndex = input.headers.indexOf(input.wellColumn)
  const signalColumnIndex = input.headers.indexOf(input.signalColumn)
  if (wellColumnIndex < 0) {
    throw new ScienceDoseResponseAnalysisError(`Well column not found: ${input.wellColumn}`)
  }
  if (signalColumnIndex < 0) {
    throw new ScienceDoseResponseAnalysisError(`Signal column not found: ${input.signalColumn}`)
  }
  if (wellColumnIndex === signalColumnIndex) {
    throw new ScienceDoseResponseAnalysisError('Well and signal columns must be different')
  }

  const assignedWells = new Map(input.design.wells.map(well => [well.well, well]))
  const observedSignals = new Map<string, number>()
  let ignoredRowCount = 0
  for (const row of input.rows) {
    const well = (row[wellColumnIndex] ?? '').trim().toUpperCase()
    const rawSignal = (row[signalColumnIndex] ?? '').trim()
    if (!well && !rawSignal) continue
    if (!/^[A-H](?:[1-9]|1[0-2])$/.test(well)) {
      throw new ScienceDoseResponseAnalysisError(`Invalid well identifier in linked table: ${well || '(empty)'}`)
    }
    if (observedSignals.has(well)) {
      throw new ScienceDoseResponseAnalysisError(`Duplicate well row in linked table: ${well}`)
    }
    if (!assignedWells.has(well)) {
      ignoredRowCount += 1
      continue
    }
    const signal = Number(rawSignal)
    if (!rawSignal || !Number.isFinite(signal)) {
      throw new ScienceDoseResponseAnalysisError(`Assigned well ${well} has a missing or non-numeric signal`)
    }
    observedSignals.set(well, signal)
  }

  const missingWells = [...assignedWells.keys()].filter(well => !observedSignals.has(well))
  if (missingWells.length > 0) {
    throw new ScienceDoseResponseAnalysisError(
      `Linked table is missing ${missingWells.length} assigned wells: ${missingWells.slice(0, 8).join(', ')}`,
    )
  }

  const roleSignals = (role: SciencePlateWellRole) => input.design.wells
    .filter(well => well.role === role)
    .map(well => observedSignals.get(well.well)!)
  const blankSignals = roleSignals('blank')
  const vehicleSignals = roleSignals('vehicle-control')
  if (blankSignals.length === 0) {
    throw new ScienceDoseResponseAnalysisError('The experiment design has no blank wells for background correction')
  }
  if (vehicleSignals.length === 0) {
    throw new ScienceDoseResponseAnalysisError('The experiment design has no vehicle wells for normalization')
  }
  const blankMeanSignal = mean(blankSignals)
  const vehicleCorrectedSignals = vehicleSignals.map(signal => signal - blankMeanSignal)
  const vehicleMeanBlankCorrectedSignal = mean(vehicleCorrectedSignals)
  if (!Number.isFinite(vehicleMeanBlankCorrectedSignal) || vehicleMeanBlankCorrectedSignal <= 0) {
    throw new ScienceDoseResponseAnalysisError(
      'Vehicle signal must remain positive after blank correction; review the plate mapping and raw signal',
    )
  }

  const normalizedWells = input.design.wells.map(well => {
    const rawSignal = observedSignals.get(well.well)!
    const blankCorrectedSignal = rawSignal - blankMeanSignal
    return {
      well: well.well,
      role: well.role,
      label: well.label,
      concentration: well.concentration,
      replicate: well.replicate,
      rawSignal,
      blankCorrectedSignal,
      normalizedViabilityPercent: (blankCorrectedSignal / vehicleMeanBlankCorrectedSignal) * 100,
    }
  })
  const points = input.protocol.concentrations.map(concentration => {
    const values = normalizedWells
      .filter(well => well.role === 'treatment' && well.concentration === concentration)
      .map(well => well.normalizedViabilityPercent)
    const average = mean(values)
    const deviation = standardDeviation(values)
    return {
      concentration,
      replicateCount: values.length,
      meanViabilityPercent: average,
      standardDeviation: deviation,
      coefficientOfVariationPercent: average === 0 ? null : Math.abs((deviation / average) * 100),
    }
  }).sort((left, right) => left.concentration - right.concentration)
  const treatmentObservations = normalizedWells
    .filter(well => well.role === 'treatment' && well.concentration !== null)
    .map(well => ({ concentration: well.concentration!, viability: well.normalizedViabilityPercent }))
  const fitted = fitFourParameterLogistic(treatmentObservations)
  if (
    !Number.isFinite(fitted.relativeIc50) ||
    !Number.isFinite(fitted.top) ||
    !Number.isFinite(fitted.bottom) ||
    !Number.isFinite(fitted.hillSlope)
  ) {
    throw new ScienceDoseResponseAnalysisError('The 4PL model did not converge to finite parameters')
  }

  const warnings: ScienceDoseResponseWarning[] = []
  const highVariation = points
    .filter(point => (point.coefficientOfVariationPercent ?? 0) > 20)
    .map(point => point.concentration)
  if (highVariation.length > 0) {
    warnings.push({
      code: 'high-replicate-variation',
      severity: 'warning',
      message: 'One or more treatment groups have replicate CV above 20%.',
      concentrations: highVariation,
    })
  }
  const responseRange = Math.max(...points.map(point => point.meanViabilityPercent)) -
    Math.min(...points.map(point => point.meanViabilityPercent))
  if (responseRange < 30) {
    warnings.push({
      code: 'limited-response-range',
      severity: 'warning',
      message: 'The tested concentrations span less than 30 percentage points of normalized viability.',
      concentrations: [],
    })
  }
  if (fitted.rSquared < 0.8) {
    warnings.push({
      code: 'weak-model-fit',
      severity: 'warning',
      message: 'The 4PL fit has R² below 0.80 and requires statistical review.',
      concentrations: [],
    })
  }
  if (fitted.testedRangePosition !== 'within-range') {
    warnings.push({
      code: 'relative-ic50-outside-tested-range',
      severity: 'warning',
      message: 'The fitted relative IC50 is outside the tested concentration range and is an extrapolation.',
      concentrations: [],
    })
  }
  if (fitted.top < 70 || fitted.top > 130 || fitted.bottom < -20 || fitted.bottom > 50) {
    warnings.push({
      code: 'implausible-asymptote',
      severity: 'warning',
      message: 'One or both fitted asymptotes are outside the expected normalized viability range.',
      concentrations: [],
    })
  }

  const positiveControlValues = normalizedWells
    .filter(well => well.role === 'positive-control')
    .map(well => well.normalizedViabilityPercent)
  return {
    scope: 'full-linked-plate',
    wellColumn: input.wellColumn,
    signalColumn: input.signalColumn,
    assignedWellCount: normalizedWells.length,
    ignoredRowCount,
    blankMeanSignal,
    blankStandardDeviation: standardDeviation(blankSignals),
    vehicleMeanBlankCorrectedSignal,
    vehicleStandardDeviation: standardDeviation(vehicleCorrectedSignals),
    positiveControlMeanViabilityPercent: positiveControlValues.length > 0
      ? mean(positiveControlValues)
      : null,
    normalizedWells,
    points,
    fit: {
      model: '4pl',
      ...fitted,
      reviewStatus: warnings.some(warning => warning.severity === 'warning')
        ? 'review-required'
        : 'acceptable',
    },
    warnings,
  }
}
