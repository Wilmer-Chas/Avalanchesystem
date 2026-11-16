import type { PowerLawPoint } from './PowerLawChart'

export interface PowerLawFit {
  /** Intercept in log10 space: log10(P) = intercept + slope * log10(size) */
  intercept: number
  /** Slope on log–log axes (negative for a typical power law). */
  slope: number
  /** Convenient positive exponent: P(s) ∝ s^(-alpha). */
  alpha: number
  /** Predicted normalized frequency at a given size. */
  predict: (size: number) => number
  pointCount: number
}

/**
 * Fit P(s) ∝ s^(-α) by ordinary least squares on log10(size) vs log10(P),
 * where P is count / totalAvalanches (normalized frequency).
 */
export function fitPowerLaw(
  data: PowerLawPoint[],
  totalAvalanches: number,
): PowerLawFit | null {
  if (totalAvalanches <= 0 || data.length < 2) return null

  // Prefer sizes seen more than once when possible — rare singles are noisy.
  let points = data.filter((d) => d.size >= 1 && d.count >= 2)
  if (points.length < 2) {
    points = data.filter((d) => d.size >= 1 && d.count >= 1)
  }
  if (points.length < 2) return null

  let sumX = 0
  let sumY = 0
  let sumXX = 0
  let sumXY = 0
  const n = points.length

  for (const p of points) {
    const x = Math.log10(p.size)
    const y = Math.log10(p.count / totalAvalanches)
    sumX += x
    sumY += y
    sumXX += x * x
    sumXY += x * y
  }

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-12) return null

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  return {
    intercept,
    slope,
    alpha: -slope,
    pointCount: n,
    predict: (size: number) => 10 ** (intercept + slope * Math.log10(size)),
  }
}
