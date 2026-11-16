import { useEffect, useRef } from 'react'

interface GridCanvasProps {
  grid: Uint16Array
  size: number
  toppledCells: number[]
  /** Flat index of the latest random drop; drawn as a soft marker. */
  dropIndex?: number
  /** Cells at or above this height are drawn as near-critical (default 4). */
  threshold?: number
  /** How long a cascade flash stays visible (ms). */
  flashMs?: number
}

/**
 * Soft sequential palette: similar lightness steps, low neon.
 * Distinct enough to read stress, calm enough for long viewing.
 */
export const STRESS_COLORS = [
  '#1a1816', // 0 empty — warm charcoal
  '#5a7a8c', // 1 muted steel
  '#6f9a86', // 2 sage
  '#c4a46a', // 3 sand gold
  '#c48462', // 4 soft clay
  '#a66b6b', // 5+ dusty rose
] as const

/** Avalanche: soft crimson (clearly red, not neon). */
const FLASH_RGB = { r: 190, g: 64, b: 72 }
const FLASH_HOT_RGB = { r: 240, g: 170, b: 168 }

function stressColor(value: number): string {
  if (value <= 0) return STRESS_COLORS[0]!
  const idx = Math.min(STRESS_COLORS.length - 1, value)
  return STRESS_COLORS[idx]!
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function flashColor(intensity: number): string {
  const t = Math.min(1, intensity)
  const hot = t * t
  const r = lerpChannel(FLASH_RGB.r, FLASH_HOT_RGB.r, hot)
  const g = lerpChannel(FLASH_RGB.g, FLASH_HOT_RGB.g, hot)
  const b = lerpChannel(FLASH_RGB.b, FLASH_HOT_RGB.b, hot)
  const a = 0.4 + 0.55 * t
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function GridCanvas({
  grid,
  size,
  toppledCells,
  dropIndex = -1,
  threshold = 4,
  flashMs = 480,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef(grid)
  const dropRef = useRef(dropIndex)
  const flashRef = useRef<Float32Array>(new Float32Array(size * size))
  const sizeRef = useRef(size)

  gridRef.current = grid
  dropRef.current = dropIndex

  useEffect(() => {
    if (sizeRef.current !== size) {
      sizeRef.current = size
      flashRef.current = new Float32Array(size * size)
    }
  }, [size])

  useEffect(() => {
    const flash = flashRef.current
    if (toppledCells.length === 0) {
      let any = false
      for (let i = 0; i < grid.length; i++) {
        if (grid[i]) {
          any = true
          break
        }
      }
      if (!any) flash.fill(0)
      return
    }
    for (const i of toppledCells) {
      if (i >= 0 && i < flash.length) {
        flash[i] = 1
      }
    }
  }, [toppledCells, grid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    const decayPerMs = 1 / flashMs

    const paint = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now

      const flash = flashRef.current
      const currentGrid = gridRef.current
      const n = size

      for (let i = 0; i < flash.length; i++) {
        const v = flash[i]!
        if (v > 0) {
          flash[i] = Math.max(0, v - decayPerMs * dt)
        }
      }

      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.clientWidth
      const cssHeight = canvas.clientHeight
      const pixelW = Math.floor(cssWidth * dpr)
      const pixelH = Math.floor(cssHeight * dpr)
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW
        canvas.height = pixelH
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cellW = cssWidth / n
      const cellH = cssHeight / n

      ctx.fillStyle = STRESS_COLORS[0]
      ctx.fillRect(0, 0, cssWidth, cssHeight)

      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = y * n + x
          const raw = currentGrid[i] ?? 0
          const intensity = flash[i]!

          const x0 = Math.floor(x * cellW)
          const y0 = Math.floor(y * cellH)
          const w = Math.ceil(cellW) + 0.5
          const hgt = Math.ceil(cellH) + 0.5

          ctx.fillStyle = stressColor(raw)
          ctx.fillRect(x0, y0, w, hgt)

          if (intensity > 0.02) {
            ctx.fillStyle = flashColor(intensity)
            ctx.fillRect(x0, y0, w, hgt)
          }
        }
      }

      // Soft marker for the latest random drop (not the whole cascade).
      const di = dropRef.current
      if (di >= 0 && di < n * n) {
        const dx = di % n
        const dy = (di / n) | 0
        const x0 = dx * cellW
        const y0 = dy * cellH
        const pulse = 0.55 + 0.45 * Math.sin(now / 180)
        ctx.strokeStyle = `rgba(243, 236, 220, ${0.35 + 0.4 * pulse})`
        ctx.lineWidth = Math.max(1.25, Math.min(cellW, cellH) * 0.18)
        ctx.strokeRect(
          x0 + ctx.lineWidth * 0.35,
          y0 + ctx.lineWidth * 0.35,
          cellW - ctx.lineWidth * 0.7,
          cellH - ctx.lineWidth * 0.7,
        )
      }

      raf = requestAnimationFrame(paint)
    }

    raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [size, threshold, flashMs])

  return (
    <canvas
      ref={canvasRef}
      className="grid-canvas"
      role="img"
      aria-label={`Sandpile grid ${size} by ${size}, failure threshold ${threshold}`}
    />
  )
}
