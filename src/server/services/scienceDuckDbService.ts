import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import duckdb from 'duckdb'
import type { ScienceColumnProfile } from './scienceWorkspaceService.js'

export type DuckDbPreviewResult = {
  headers: string[]
  columns: ScienceColumnProfile[]
  rows: string[][]
  totalRowCount: number
  sampledRowCount: number
  truncated: boolean
  format: string
  sizeBytes: number
  contentHash: string
}

export type HistogramBin = {
  binStart: number
  binEnd: number
  count: number
}

export type ColumnHistogram = {
  columnName: string
  min: number
  max: number
  bins: HistogramBin[]
}

export type CorrelationMatrixResult = {
  columns: string[]
  matrix: number[][]
}

export type MissingDistributionResult = {
  columns: string[]
  missingCounts: number[]
  missingRates: number[]
  totalRows: number
  completeRows: number
}

export type ScienceAnalyticsResult = {
  datasetId: string
  totalRows: number
  totalColumns: number
  histograms: ColumnHistogram[]
  correlationMatrix: CorrelationMatrixResult
  missingDistribution: MissingDistributionResult
}

export class ScienceDuckDbService {
  private db: duckdb.Database

  constructor() {
    this.db = new duckdb.Database(':memory:')
  }

  private async runQuery<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const conn = this.db.connect()
      conn.all(sql, ...params, (err, rows) => {
        conn.close()
        if (err) {
          reject(err)
        } else {
          resolve(rows as T[])
        }
      })
    })
  }

  private getTableReadFunction(filePath: string, format: string): { readSql: string; sanitizedPath: string } {
    const escapedPath = filePath.replace(/'/g, "''")
    const ext = path.extname(filePath).toLowerCase()

    if (format === 'parquet' || ext === '.parquet') {
      return { readSql: `read_parquet('${escapedPath}')`, sanitizedPath: escapedPath }
    }
    if (format === 'json' || ext === '.json' || ext === '.jsonl') {
      return { readSql: `read_json_auto('${escapedPath}')`, sanitizedPath: escapedPath }
    }
    if (format === 'tsv' || ext === '.tsv') {
      return { readSql: `read_csv_auto('${escapedPath}', delim='\t', header=true)`, sanitizedPath: escapedPath }
    }
    return { readSql: `read_csv_auto('${escapedPath}', header=true)`, sanitizedPath: escapedPath }
  }

  async previewDataset(
    filePath: string,
    format: string,
    limit = 100,
    offset = 0,
    search = '',
  ): Promise<{
    headers: string[]
    columns: ScienceColumnProfile[]
    rows: string[][]
    totalRowCount: number
    sampledRowCount: number
    truncated: boolean
  }> {
    const { readSql } = this.getTableReadFunction(filePath, format)

    // Get total count
    const countResult = await this.runQuery<{ total: number | bigint }>(
      `SELECT COUNT(*) AS total FROM ${readSql}`,
    )
    const totalRowCount = Number(countResult[0]?.total ?? 0)

    // Get column names and types using LIMIT 0 describe
    const sampleRows = await this.runQuery<Record<string, unknown>>(
      `SELECT * FROM ${readSql} LIMIT ${Math.max(1, limit)} OFFSET ${offset}`,
    )

    if (sampleRows.length === 0 && totalRowCount === 0) {
      return {
        headers: [],
        columns: [],
        rows: [],
        totalRowCount: 0,
        sampledRowCount: 0,
        truncated: false,
      }
    }

    const rawKeys = Object.keys(sampleRows[0] ?? {})
    let rawHeadersFromFile: string[] = rawKeys
    if (format === 'csv' || format === 'tsv') {
      try {
        const content = await fs.readFile(filePath, 'utf8')
        const firstLine = content.split(/\r?\n/)[0]
        if (firstLine) {
          const delim = format === 'tsv' ? '\t' : ','
          // Simple split matching dsvFormat header count
          const splitted = firstLine.split(delim).map(h => h.trim().replace(/^["']|["']$/g, ''))
          if (splitted.length === rawKeys.length) {
            rawHeadersFromFile = splitted
          }
        }
      } catch {
        // Fallback to DuckDB keys
      }
    }

    const occurrences = new Map<string, number>()
    const headers = rawHeadersFromFile.map((h, idx) => {
      const raw = h || `Column ${idx + 1}`
      const count = (occurrences.get(raw) ?? 0) + 1
      occurrences.set(raw, count)
      return count === 1 ? raw : `${raw} (${count})`
    })

    // Infer column profiles across sampled rows
    const columns: ScienceColumnProfile[] = await Promise.all(
      headers.map(async col => {
        const escapedCol = `"${col.replace(/"/g, '""')}"`
        try {
          const stats = await this.runQuery<{
            missing: number | bigint
            uniq: number | bigint
          }>(
            `SELECT 
              COUNT(*) - COUNT(${escapedCol}) AS missing, 
              COUNT(DISTINCT ${escapedCol}) AS uniq 
             FROM ${readSql}`,
          )
          const missingCount = Number(stats[0]?.missing ?? 0)
          const uniqueCount = Number(stats[0]?.uniq ?? 0)

          // Infer type from sample rows
          let inferredType: ScienceColumnProfile['inferredType'] = 'string'
          const nonNullValues = sampleRows
            .map(r => r[col])
            .filter(v => v !== null && v !== undefined && String(v).trim() !== '')

          if (nonNullValues.length === 0) {
            inferredType = 'empty'
          } else {
            const allBool = nonNullValues.every(
              v => String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'false' || v === 1 || v === 0,
            )
            const allInt = nonNullValues.every(v => Number.isInteger(Number(v)) && !Number.isNaN(Number(v)))
            const allNum = nonNullValues.every(v => !Number.isNaN(Number(v)))
            const allDate = nonNullValues.every(v => !Number.isNaN(Date.parse(String(v))))

            if (allBool) inferredType = 'boolean'
            else if (allInt) inferredType = 'integer'
            else if (allNum) inferredType = 'number'
            else if (allDate && String(nonNullValues[0]).length >= 8) inferredType = 'datetime'
          }

          return {
            name: col,
            inferredType,
            missingCount,
            uniqueCount,
          }
        } catch {
          return {
            name: col,
            inferredType: 'string',
            missingCount: 0,
            uniqueCount: 0,
          }
        }
      }),
    )

    let rows: string[][] = sampleRows.map(row =>
      headers.map(h => (row[h] === null || row[h] === undefined ? '' : String(row[h]))),
    )

    if (search.trim()) {
      const term = search.trim().toLowerCase()
      rows = rows.filter(r => r.some(cell => cell.toLowerCase().includes(term)))
    }

    return {
      headers,
      columns,
      rows,
      totalRowCount,
      sampledRowCount: rows.length,
      truncated: offset + rows.length < totalRowCount,
    }
  }

  async computeAnalytics(
    datasetId: string,
    filePath: string,
    format: string,
  ): Promise<ScienceAnalyticsResult> {
    const { readSql } = this.getTableReadFunction(filePath, format)

    // Total count
    const countResult = await this.runQuery<{ total: number | bigint }>(
      `SELECT COUNT(*) AS total FROM ${readSql}`,
    )
    const totalRows = Number(countResult[0]?.total ?? 0)

    if (totalRows === 0) {
      return {
        datasetId,
        totalRows: 0,
        totalColumns: 0,
        histograms: [],
        correlationMatrix: { columns: [], matrix: [] },
        missingDistribution: { columns: [], missingCounts: [], missingRates: [], totalRows: 0, completeRows: 0 },
      }
    }

    // Get 100 sample rows to identify numeric columns & column names
    const sampleRows = await this.runQuery<Record<string, unknown>>(`SELECT * FROM ${readSql} LIMIT 200`)
    const headers = Object.keys(sampleRows[0] ?? {})

    const numericColumns: string[] = []
    const missingCounts: number[] = []
    const missingRates: number[] = []

    // Calculate missing value distribution per column
    for (const col of headers) {
      const escapedCol = `"${col.replace(/"/g, '""')}"`
      try {
        const stats = await this.runQuery<{ missing: number | bigint }>(
          `SELECT COUNT(*) - COUNT(${escapedCol}) AS missing FROM ${readSql}`,
        )
        const missing = Number(stats[0]?.missing ?? 0)
        missingCounts.push(missing)
        missingRates.push(totalRows > 0 ? Number((missing / totalRows).toFixed(4)) : 0)

        // Check if numeric
        const values = sampleRows
          .map(r => r[col])
          .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        if (values.length > 0 && values.every(v => !Number.isNaN(Number(v)))) {
          numericColumns.push(col)
        }
      } catch {
        missingCounts.push(0)
        missingRates.push(0)
      }
    }

    // Compute complete rows (rows with 0 nulls across headers)
    let completeRows = totalRows
    if (headers.length > 0) {
      try {
        const notNullConditions = headers.map(c => `"${c.replace(/"/g, '""')}" IS NOT NULL`).join(' AND ')
        const compRes = await this.runQuery<{ comp: number | bigint }>(
          `SELECT COUNT(*) AS comp FROM ${readSql} WHERE ${notNullConditions}`,
        )
        completeRows = Number(compRes[0]?.comp ?? 0)
      } catch {
        completeRows = totalRows
      }
    }

    // Calculate Histograms for numeric columns (up to top 6 numeric columns)
    const histograms: ColumnHistogram[] = []
    const targetNumericCols = numericColumns.slice(0, 6)

    for (const col of targetNumericCols) {
      const escapedCol = `"${col.replace(/"/g, '""')}"`
      try {
        const rangeRes = await this.runQuery<{ min_val: number; max_val: number }>(
          `SELECT MIN(CAST(${escapedCol} AS DOUBLE)) AS min_val, MAX(CAST(${escapedCol} AS DOUBLE)) AS max_val FROM ${readSql} WHERE ${escapedCol} IS NOT NULL`,
        )
        const minVal = Number(rangeRes[0]?.min_val ?? 0)
        const maxVal = Number(rangeRes[0]?.max_val ?? 0)

        if (!Number.isNaN(minVal) && !Number.isNaN(maxVal) && minVal < maxVal) {
          const numBins = 10
          const binWidth = (maxVal - minVal) / numBins
          const bins: HistogramBin[] = []

          // Query counts per bin
          const binQueries: string[] = []
          for (let i = 0; i < numBins; i++) {
            const bStart = minVal + i * binWidth
            const bEnd = i === numBins - 1 ? maxVal + 0.00001 : minVal + (i + 1) * binWidth
            binQueries.push(
              `SUM(CASE WHEN CAST(${escapedCol} AS DOUBLE) >= ${bStart} AND CAST(${escapedCol} AS DOUBLE) < ${bEnd} THEN 1 ELSE 0 END) AS b_${i}`,
            )
          }

          const binRes = await this.runQuery<Record<string, number | bigint>>(
            `SELECT ${binQueries.join(', ')} FROM ${readSql}`,
          )

          for (let i = 0; i < numBins; i++) {
            const bStart = minVal + i * binWidth
            const bEnd = minVal + (i + 1) * binWidth
            const count = Number(binRes[0]?.[`b_${i}`] ?? 0)
            bins.push({
              binStart: Number(bStart.toFixed(2)),
              binEnd: Number(bEnd.toFixed(2)),
              count,
            })
          }

          histograms.push({
            columnName: col,
            min: Number(minVal.toFixed(2)),
            max: Number(maxVal.toFixed(2)),
            bins,
          })
        }
      } catch {
        // Skip col if histogram computation encounters an error
      }
    }

    // Compute Correlation Matrix for top 8 numeric columns
    const corrCols = numericColumns.slice(0, 8)
    const matrix: number[][] = Array.from({ length: corrCols.length }, () =>
      Array.from({ length: corrCols.length }, () => 0),
    )

    if (corrCols.length >= 2) {
      for (let i = 0; i < corrCols.length; i++) {
        matrix[i][i] = 1.0
        for (let j = i + 1; j < corrCols.length; j++) {
          const colA = `"${corrCols[i].replace(/"/g, '""')}"`
          const colB = `"${corrCols[j].replace(/"/g, '""')}"`
          try {
            const corrRes = await this.runQuery<{ corr_val: number }>(
              `SELECT CORR(CAST(${colA} AS DOUBLE), CAST(${colB} AS DOUBLE)) AS corr_val FROM ${readSql}`,
            )
            const val = Number(corrRes[0]?.corr_val ?? 0)
            const roundedVal = Number.isNaN(val) ? 0 : Number(val.toFixed(3))
            matrix[i][j] = roundedVal
            matrix[j][i] = roundedVal
          } catch {
            matrix[i][j] = 0
            matrix[j][i] = 0
          }
        }
      }
    } else if (corrCols.length === 1) {
      matrix[0][0] = 1.0
    }

    return {
      datasetId,
      totalRows,
      totalColumns: headers.length,
      histograms,
      correlationMatrix: {
        columns: corrCols,
        matrix,
      },
      missingDistribution: {
        columns: headers,
        missingCounts,
        missingRates,
        totalRows,
        completeRows,
      },
    }
  }

  close(): void {
    this.db.close()
  }
}

export const scienceDuckDbService = new ScienceDuckDbService()
