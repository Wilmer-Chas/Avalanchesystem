import type { PowerLawPoint } from './PowerLawChart'

export interface GrPoint {
  /** Model magnitude M = log10(avalanche size). */
  magnitude: number
  /** Avalanche size that produced this magnitude. */
  size: number
  /** Number of quakes at least this big. */
  cumulativeCount: number
}

export interface GrFit {
  /** Intercept: log10(N) = a - b * M */
  a: number
  /** Gutenberg–Richter b-value (positive when N falls as M rises). */
  b: number
  pointCount: number
  predict: (magnitude: number) => number
}

/** Model magnitude from avalanche size (teaching stand-in for Richter). */
export function modelMagnitude(size: number): number {
  return Math.log10(Math.max(1, size))
}

/**
 * Build cumulative N(≥M) from exact-size frequency bins.
 * Points are ordered by increasing magnitude (size).
 */
export function buildGrSeries(data: PowerLawPoint[]): GrPoint[] {
  const sorted = data
    .filter((d) => d.size >= 1 && d.count > 0)
    .slice()
    .sort((a, b) => a.size - b.size)

  if (sorted.length === 0) return []

  let totalFromHere = 0
  // Walk from largest → smallest so we can accumulate N(≥s).
  const fromLarge: GrPoint[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const bin = sorted[i]!
    totalFromHere += bin.count
    fromLarge.push({
      size: bin.size,
      magnitude: modelMagnitude(bin.size),
      cumulativeCount: totalFromHere,
    })
  }

  return fromLarge.reverse()
}

/**
 * Fit log10(N(≥M)) = a - b M by OLS.
 * Prefers points with N ≥ 2 so the single-event floor does not dominate.
 */
export function fitGutenbergRichter(points: GrPoint[]): GrFit | null {
  let sample = points.filter((p) => p.cumulativeCount >= 2)
  if (sample.length < 2) {
    sample = points.filter((p) => p.cumulativeCount >= 1)
  }
  if (sample.length < 2) return null

  let sumX = 0
  let sumY = 0
  let sumXX = 0
  let sumXY = 0
  const n = sample.length

  for (const p of sample) {
    const x = p.magnitude
    const y = Math.log10(p.cumulativeCount)
    sumX += x
    sumY += y
    sumXX += x * x
    sumXY += x * y
  }

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-12) return null

  const slope = (n * sumXY - sumX * sumY) / denom // = -b
  const a = (sumY - slope * sumX) / n
  const b = -slope

  return {
    a,
    b,
    pointCount: n,
    predict: (magnitude: number) => 10 ** (a - b * magnitude),
  }
}
