import { useEffect, useRef } from 'react'
import {
  buildGrSeries,
  fitGutenbergRichter,
  type GrPoint,
} from './gutenbergRichter'
import type { PowerLawPoint } from './PowerLawChart'

interface GutenbergRichterChartProps {
  data: PowerLawPoint[]
  eventCount: number
  large?: boolean
}

function niceLogTicks(minV: number, maxV: number): number[] {
  if (!(minV > 0) || !(maxV > 0) || maxV < minV) return [1]
  const start = Math.floor(Math.log10(minV))
  const end = Math.ceil(Math.log10(maxV))
  const ticks: number[] = []
  for (let e = start; e <= end; e++) {
    ticks.push(10 ** e)
  }
  return ticks.length > 0 ? ticks : [1]
}

function niceLinearTicks(minV: number, maxV: number): number[] {
  const span = Math.max(0.5, maxV - minV)
  const step = span <= 1.5 ? 0.5 : span <= 3 ? 1 : 1
  const ticks: number[] = []
  const start = Math.floor(minV / step) * step
  for (let v = start; v <= maxV + 1e-9; v += step) {
    if (v >= minV - 1e-9) ticks.push(Number(v.toFixed(2)))
  }
  return ticks.length > 0 ? ticks : [minV]
}

function paintChart(
  canvas: HTMLCanvasElement,
  points: GrPoint[],
  eventCount: number,
  large: boolean,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (cssW < 8 || cssH < 8) return

  canvas.width = Math.floor(cssW * dpr)
  canvas.height = Math.floor(cssH * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const pad = large
    ? { top: 40, right: 28, bottom: 64, left: 86 }
    : { top: 28, right: 16, bottom: 52, left: 72 }
  const plotW = cssW - pad.left - pad.right
  const plotH = cssH - pad.top - pad.bottom

  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#141820'
  ctx.fillRect(0, 0, cssW, cssH)

  if (points.length === 0 || eventCount === 0) {
    ctx.fillStyle = '#6b7a8a'
    ctx.font = `${large ? 15 : 13}px "Segoe UI", sans-serif`
    ctx.fillText(
      'No quakes yet — let the simulation run, then open this chart again.',
      pad.left,
      pad.top + plotH / 2,
    )
    return
  }

  let minM = Math.min(...points.map((p) => p.magnitude))
  let maxM = Math.max(...points.map((p) => p.magnitude))
  if (maxM - minM < 0.2) {
    minM -= 0.1
    maxM += 0.1
  }

  let maxN = Math.max(...points.map((p) => p.cumulativeCount), 1)
  let minN = Math.max(
    1,
    Math.min(...points.map((p) => p.cumulativeCount)),
  )

  const fit = fitGutenbergRichter(points)
  if (fit) {
    const y1 = fit.predict(minM)
    const y2 = fit.predict(maxM)
    maxN = Math.max(maxN, y1, y2)
    minN = Math.max(1, Math.min(minN, ...[y1, y2].filter((v) => v >= 1)))
  }

  const spanM = Math.max(1e-6, maxM - minM)
  const logMinY = Math.log10(minN)
  const logMaxY = Math.log10(maxN)
  const spanY = Math.max(1e-6, logMaxY - logMinY)

  const xOf = (m: number) => pad.left + ((m - minM) / spanM) * plotW
  const yOf = (n: number) =>
    pad.top + plotH - ((Math.log10(n) - logMinY) / spanY) * plotH

  ctx.strokeStyle = '#2a3340'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, pad.top + plotH)
  ctx.lineTo(pad.left + plotW, pad.top + plotH)
  ctx.stroke()

  const tickFont = large ? 12 : 10
  ctx.font = `${tickFont}px "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  for (const t of niceLinearTicks(minM, maxM)) {
    const x = xOf(t)
    ctx.strokeStyle = '#1e2630'
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, pad.top + plotH)
    ctx.stroke()
    ctx.fillStyle = '#6b7a8a'
    ctx.fillText(t.toFixed(1), x, pad.top + plotH + 16)
  }

  ctx.textAlign = 'right'
  for (const t of niceLogTicks(minN, maxN)) {
    if (t < minN * 0.9 || t > maxN * 1.1) continue
    const y = yOf(t)
    ctx.strokeStyle = '#1e2630'
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + plotW, y)
    ctx.stroke()
    ctx.fillStyle = '#6b7a8a'
    ctx.fillText(String(t), pad.left - 8, y + 4)
  }

  const labelFont = large ? 14 : 12
  ctx.fillStyle = '#c5d0dc'
  ctx.font = `600 ${labelFont}px "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(
    'Model magnitude →',
    pad.left + plotW / 2,
    cssH - (large ? 18 : 14),
  )

  ctx.save()
  ctx.translate(large ? 24 : 18, pad.top + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Quakes this big or bigger →', 0, 0)
  ctx.restore()

  if (fit) {
    const y1 = Math.max(1, fit.predict(minM))
    const y2 = Math.max(1, fit.predict(maxM))
    ctx.strokeStyle = '#5ec8ff'
    ctx.lineWidth = large ? 2.5 : 2
    ctx.beginPath()
    ctx.moveTo(xOf(minM), yOf(y1))
    ctx.lineTo(xOf(maxM), yOf(y2))
    ctx.stroke()

    ctx.fillStyle = '#5ec8ff'
    ctx.font = `${large ? 12 : 11}px "Segoe UI", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(
      `Gutenberg–Richter fit  ·  b ≈ ${fit.b.toFixed(2)}`,
      pad.left + 8,
      pad.top + 16,
    )
  }

  const r = large ? 4.5 : 3.2
  for (const point of points) {
    const x = xOf(point.magnitude)
    const y = yOf(point.cumulativeCount)
    ctx.fillStyle = '#ffc440'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.stroke()
  }
}

/**
 * Gutenberg–Richter-style chart: model magnitude vs cumulative count.
 */
export function GutenbergRichterChart({
  data,
  eventCount,
  large = false,
}: GutenbergRichterChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const points = buildGrSeries(data)
    const draw = () => paintChart(canvas, points, eventCount, large)
    draw()

    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [data, eventCount, large])

  return (
    <canvas
      ref={canvasRef}
      className={
        large
          ? 'power-law-chart power-law-chart--large gr-chart'
          : 'power-law-chart gr-chart'
      }
      role="img"
      aria-label="Gutenberg-Richter style chart of model magnitude versus quakes this big or bigger"
    />
  )
}
