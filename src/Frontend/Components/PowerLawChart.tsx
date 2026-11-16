import { useEffect, useRef } from 'react'
import { fitPowerLaw } from './powerLawFit'

export interface PowerLawPoint {
  size: number
  count: number
}

interface PowerLawChartProps {
  data: PowerLawPoint[]
  eventCount: number
  /** Larger padding/fonts when shown in the modal. */
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

function formatShare(v: number): string {
  if (v >= 0.1) return v.toFixed(2)
  if (v >= 0.01) return v.toFixed(3)
  return v.toExponential(0)
}

function paintChart(
  canvas: HTMLCanvasElement,
  data: PowerLawPoint[],
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

  if (data.length === 0 || eventCount === 0) {
    ctx.fillStyle = '#6b7a8a'
    ctx.font = `${large ? 15 : 13}px "Segoe UI", sans-serif`
    ctx.fillText(
      'No quakes yet — let the simulation run, then open this chart again.',
      pad.left,
      pad.top + plotH / 2,
    )
    return
  }

  const shares = data.map((d) => ({
    size: d.size,
    share: d.count / eventCount,
  }))

  const maxSize = Math.max(...shares.map((d) => d.size), 1)
  const minSize = Math.max(1, Math.min(...shares.map((d) => d.size)))
  let maxShare = Math.max(...shares.map((d) => d.share), 1e-6)
  let minShare = Math.max(
    1e-6,
    Math.min(...shares.map((d) => d.share).filter((s) => s > 0)),
  )

  const fit = fitPowerLaw(data, eventCount)
  if (fit) {
    const fitAtMin = fit.predict(minSize)
    const fitAtMax = fit.predict(maxSize)
    maxShare = Math.max(maxShare, fitAtMin, fitAtMax)
    minShare = Math.min(
      minShare,
      ...[fitAtMin, fitAtMax].filter((v) => v > 0),
    )
    minShare = Math.max(1e-6, minShare)
  }

  const logMinX = Math.log10(minSize)
  const logMaxX = Math.log10(maxSize)
  const logMinY = Math.log10(minShare)
  const logMaxY = Math.log10(maxShare)
  const spanX = Math.max(1e-6, logMaxX - logMinX)
  const spanY = Math.max(1e-6, logMaxY - logMinY)

  const xOf = (size: number) =>
    pad.left + ((Math.log10(size) - logMinX) / spanX) * plotW
  const yOf = (share: number) =>
    pad.top + plotH - ((Math.log10(share) - logMinY) / spanY) * plotH

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
  for (const t of niceLogTicks(minSize, maxSize)) {
    if (t < minSize * 0.9 || t > maxSize * 1.1) continue
    const x = xOf(t)
    ctx.strokeStyle = '#1e2630'
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, pad.top + plotH)
    ctx.stroke()
    ctx.fillStyle = '#6b7a8a'
    ctx.fillText(String(t), x, pad.top + plotH + 16)
  }

  ctx.textAlign = 'right'
  for (const t of niceLogTicks(minShare, maxShare)) {
    if (t < minShare * 0.9 || t > maxShare * 1.1) continue
    const y = yOf(t)
    ctx.strokeStyle = '#1e2630'
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + plotW, y)
    ctx.stroke()
    ctx.fillStyle = '#6b7a8a'
    ctx.fillText(formatShare(t), pad.left - 8, y + 4)
  }

  const labelFont = large ? 14 : 12
  ctx.fillStyle = '#c5d0dc'
  ctx.font = `600 ${labelFont}px "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(
    'Avalanche size →',
    pad.left + plotW / 2,
    cssH - (large ? 18 : 14),
  )

  ctx.save()
  ctx.translate(large ? 24 : 18, pad.top + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Share of all quakes →', 0, 0)
  ctx.restore()

  // Fitted power law from the dots: P(s) ∝ s^(-α)
  if (fit) {
    const y1 = Math.max(minShare, fit.predict(minSize))
    const y2 = Math.max(minShare, fit.predict(maxSize))
    ctx.strokeStyle = '#5ec8ff'
    ctx.lineWidth = large ? 2.5 : 2
    ctx.beginPath()
    ctx.moveTo(xOf(minSize), yOf(y1))
    ctx.lineTo(xOf(maxSize), yOf(y2))
    ctx.stroke()

    ctx.fillStyle = '#5ec8ff'
    ctx.font = `${large ? 12 : 11}px "Segoe UI", sans-serif`
    ctx.textAlign = 'left'
    const label = `Power-law fit  ·  share ∝ 1 / size^${fit.alpha.toFixed(2)}`
    ctx.fillText(label, pad.left + 8, pad.top + 16)
  }

  // Measured data: each dot is normalized frequency for that size.
  const r = large ? 4.5 : 3.2
  for (const point of shares) {
    const x = xOf(point.size)
    const y = yOf(point.share)
    ctx.fillStyle = '#ffc440'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.stroke()
  }
}

/**
 * Normalized avalanche frequency vs size, with a fitted power-law line.
 */
export function PowerLawChart({
  data,
  eventCount,
  large = false,
}: PowerLawChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => paintChart(canvas, data, eventCount, large)
    draw()

    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [data, eventCount, large])

  return (
    <canvas
      ref={canvasRef}
      className={
        large ? 'power-law-chart power-law-chart--large' : 'power-law-chart'
      }
      role="img"
      aria-label="Normalized avalanche frequency versus avalanche size, with power-law fit"
    />
  )
}
