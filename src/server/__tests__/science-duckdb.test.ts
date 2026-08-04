import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { ScienceDuckDbService } from '../services/scienceDuckDbService.js'

describe('ScienceDuckDbService', () => {
  let tempDir: string
  let csvPath: string
  let tsvPath: string
  let duckDbService: ScienceDuckDbService

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'science-duckdb-test-'))
    csvPath = path.join(tempDir, 'experiment.csv')
    tsvPath = path.join(tempDir, 'data.tsv')

    const csvData = [
      'sample_id,cell_type,viability_score,dose,is_control',
      'S1,T-Cell,95.4,10.0,true',
      'S2,T-Cell,88.2,20.0,false',
      'S3,B-Cell,72.1,30.0,false',
      'S4,B-Cell,,40.0,false',
      'S5,Monocyte,99.0,0.0,true',
      'S6,Monocyte,65.3,50.0,false',
    ].join('\n')

    const tsvData = [
      'gene\texpression\tp_value',
      'BRCA1\t12.4\t0.001',
      'TP53\t45.8\t0.0001',
      'EGFR\t3.2\t0.05',
    ].join('\n')

    await fs.writeFile(csvPath, csvData, 'utf8')
    await fs.writeFile(tsvPath, tsvData, 'utf8')

    duckDbService = new ScienceDuckDbService()
  })

  afterAll(async () => {
    duckDbService.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test('previews CSV dataset with column types and pagination', async () => {
    const result = await duckDbService.previewDataset(csvPath, 'csv', 3, 0)
    expect(result.headers).toEqual(['sample_id', 'cell_type', 'viability_score', 'dose', 'is_control'])
    expect(result.totalRowCount).toBe(6)
    expect(result.sampledRowCount).toBe(3)
    expect(result.rows.length).toBe(3)
    expect(result.rows[0]).toEqual(['S1', 'T-Cell', '95.4', '10', 'true'])

    const viabilityCol = result.columns.find(c => c.name === 'viability_score')
    expect(viabilityCol).toBeDefined()
    expect(viabilityCol?.missingCount).toBe(1)
  })

  test('previews TSV dataset accurately', async () => {
    const result = await duckDbService.previewDataset(tsvPath, 'tsv', 10, 0)
    expect(result.headers).toEqual(['gene', 'expression', 'p_value'])
    expect(result.totalRowCount).toBe(3)
    expect(result.rows.length).toBe(3)
    expect(result.rows[0]).toEqual(['BRCA1', '12.4', '0.001'])
  })

  test('computes analytics including histograms, missing distribution, and correlation matrix', async () => {
    const analytics = await duckDbService.computeAnalytics('ds-123', csvPath, 'csv')

    expect(analytics.totalRows).toBe(6)
    expect(analytics.totalColumns).toBe(5)

    // Missing distribution
    expect(analytics.missingDistribution.columns).toContain('viability_score')
    const viabilityIndex = analytics.missingDistribution.columns.indexOf('viability_score')
    expect(analytics.missingDistribution.missingCounts[viabilityIndex]).toBe(1)
    expect(analytics.missingDistribution.completeRows).toBe(5)

    // Histograms
    expect(analytics.histograms.length).toBeGreaterThan(0)
    const viabilityHist = analytics.histograms.find(h => h.columnName === 'viability_score')
    expect(viabilityHist).toBeDefined()
    expect(viabilityHist?.bins.length).toBe(10)

    // Correlation matrix
    expect(analytics.correlationMatrix.columns.length).toBeGreaterThanOrEqual(2)
    expect(analytics.correlationMatrix.matrix.length).toBe(analytics.correlationMatrix.columns.length)
  })
})
