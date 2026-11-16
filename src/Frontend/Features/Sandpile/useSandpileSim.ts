import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createGrid,
  DEFAULT_GRID_SIZE,
  DEFAULT_RULES,
  randomDropAndResolve,
  totalStress,
  type Grid,
  type SimRules,
} from './sandpileEngine'

export interface SizeFrequencyBin {
  size: number
  count: number
}

export interface SandpileSimState {
  grid: Grid
  size: number
  running: boolean
  dropsPerSecond: number
  totalDrops: number
  eventCount: number
  lastAvalancheSize: number
  maxAvalancheSize: number
  stress: number
  lastToppledCells: number[]
  /** Flat index of the most recent random drop (-1 if none). */
  lastDropIndex: number
  rules: SimRules
  /** Frequency of cascade sizes (for the power-law chart). */
  sizeFrequency: SizeFrequencyBin[]
}

export interface SandpileSimControls {
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  step: () => void
  setDropsPerSecond: (value: number) => void
  setFailureThreshold: (value: number) => void
  setStressInput: (value: number) => void
}

export const MIN_DROPS_PER_SEC = 1
export const MAX_DROPS_PER_SEC = 500
export const MIN_THRESHOLD = 2
export const MAX_THRESHOLD = 12
export const MIN_STRESS_INPUT = 1
export const MAX_STRESS_INPUT = 4

const DEFAULT_DROPS_PER_SEC = 10
/** Cap work per animation frame so the UI stays responsive at high speed. */
const MAX_DROPS_PER_FRAME = 80

function cloneGrid(grid: Grid): Grid {
  return new Uint16Array(grid)
}

function binsFromCounts(counts: Map<number, number>): SizeFrequencyBin[] {
  return Array.from(counts.entries())
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => a.size - b.size)
}

export function useSandpileSim(
  size: number = DEFAULT_GRID_SIZE,
): SandpileSimState & SandpileSimControls {
  const gridRef = useRef<Grid>(createGrid(size))
  const runningRef = useRef(true)
  const speedRef = useRef(DEFAULT_DROPS_PER_SEC)
  const rulesRef = useRef<SimRules>({ ...DEFAULT_RULES })
  const accumRef = useRef(0)
  const lastFrameRef = useRef<number | null>(null)
  const maxAvalancheRef = useRef(0)
  const eventCountRef = useRef(0)
  const sizeCountsRef = useRef(new Map<number, number>())

  const [running, setRunning] = useState(true)
  const [dropsPerSecond, setDropsPerSecondState] = useState(DEFAULT_DROPS_PER_SEC)
  const [rules, setRules] = useState<SimRules>({ ...DEFAULT_RULES })
  const [totalDrops, setTotalDrops] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [lastAvalancheSize, setLastAvalancheSize] = useState(0)
  const [maxAvalancheSize, setMaxAvalancheSize] = useState(0)
  const [stress, setStress] = useState(0)
  const [lastToppledCells, setLastToppledCells] = useState<number[]>([])
  const [lastDropIndex, setLastDropIndex] = useState(-1)
  const [gridSnapshot, setGridSnapshot] = useState<Grid>(() => createGrid(size))
  const [sizeFrequency, setSizeFrequency] = useState<SizeFrequencyBin[]>([])

  const recordAvalanche = useCallback((avalancheSize: number) => {
    if (avalancheSize <= 0) return
    eventCountRef.current += 1
    const prev = sizeCountsRef.current.get(avalancheSize) ?? 0
    sizeCountsRef.current.set(avalancheSize, prev + 1)
    if (avalancheSize > maxAvalancheRef.current) {
      maxAvalancheRef.current = avalancheSize
    }
  }, [])

  const publishFrame = useCallback(
    (
      dropsThisFrame: number,
      lastSize: number,
      toppledCells: number[],
      dropIndex: number,
    ) => {
      if (dropsThisFrame <= 0) return
      setGridSnapshot(cloneGrid(gridRef.current))
      setStress(totalStress(gridRef.current))
      setTotalDrops((n) => n + dropsThisFrame)
      setLastAvalancheSize(lastSize)
      setEventCount(eventCountRef.current)
      setMaxAvalancheSize(maxAvalancheRef.current)
      setSizeFrequency(binsFromCounts(sizeCountsRef.current))
      if (dropIndex >= 0) setLastDropIndex(dropIndex)
      if (lastSize > 0 && toppledCells.length > 0) {
        setLastToppledCells(toppledCells)
      }
    },
    [],
  )

  const stepOnce = useCallback(() => {
    const result = randomDropAndResolve(
      gridRef.current,
      size,
      rulesRef.current,
    )
    recordAvalanche(result.avalancheSize)
    publishFrame(
      1,
      result.avalancheSize,
      result.toppledCells,
      result.dropIndex,
    )
  }, [publishFrame, recordAvalanche, size])

  const play = useCallback(() => {
    runningRef.current = true
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    runningRef.current = false
    setRunning(false)
  }, [])

  const toggle = useCallback(() => {
    if (runningRef.current) pause()
    else play()
  }, [pause, play])

  const reset = useCallback(() => {
    gridRef.current = createGrid(size)
    accumRef.current = 0
    lastFrameRef.current = null
    maxAvalancheRef.current = 0
    eventCountRef.current = 0
    sizeCountsRef.current = new Map()
    setTotalDrops(0)
    setEventCount(0)
    setLastAvalancheSize(0)
    setMaxAvalancheSize(0)
    setStress(0)
    setLastToppledCells([])
    setLastDropIndex(-1)
    setSizeFrequency([])
    setGridSnapshot(createGrid(size))
  }, [size])

  const setDropsPerSecond = useCallback((value: number) => {
    const clamped = Math.min(
      MAX_DROPS_PER_SEC,
      Math.max(MIN_DROPS_PER_SEC, value),
    )
    speedRef.current = clamped
    setDropsPerSecondState(clamped)
  }, [])

  const patchRules = useCallback((patch: Partial<SimRules>) => {
    const next = { ...rulesRef.current, ...patch }
    rulesRef.current = next
    setRules(next)
  }, [])

  const setFailureThreshold = useCallback(
    (value: number) => {
      patchRules({
        failureThreshold: Math.min(
          MAX_THRESHOLD,
          Math.max(MIN_THRESHOLD, Math.round(value)),
        ),
      })
    },
    [patchRules],
  )

  const setStressInput = useCallback(
    (value: number) => {
      patchRules({
        stressInput: Math.min(
          MAX_STRESS_INPUT,
          Math.max(MIN_STRESS_INPUT, Math.round(value)),
        ),
      })
    },
    [patchRules],
  )

  useEffect(() => {
    let raf = 0

    const tick = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now
      }
      const dt = Math.min(0.1, (now - lastFrameRef.current) / 1000)
      lastFrameRef.current = now

      if (runningRef.current) {
        accumRef.current += dt * speedRef.current
        let drops = 0
        let lastSize = 0
        let toppled: number[] = []
        let lastDrop = -1
        let bestSize = 0
        let bestToppled: number[] = []

        while (accumRef.current >= 1 && drops < MAX_DROPS_PER_FRAME) {
          accumRef.current -= 1
          const result = randomDropAndResolve(
            gridRef.current,
            size,
            rulesRef.current,
          )
          drops += 1
          lastSize = result.avalancheSize
          toppled = result.toppledCells
          lastDrop = result.dropIndex
          recordAvalanche(result.avalancheSize)
          if (
            result.avalancheSize >= bestSize &&
            result.toppledCells.length > 0
          ) {
            bestSize = result.avalancheSize
            bestToppled = result.toppledCells
          }
        }

        publishFrame(
          drops,
          bestSize > 0 ? bestSize : lastSize,
          bestSize > 0 ? bestToppled : toppled,
          lastDrop,
        )
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [publishFrame, recordAvalanche, size])

  return {
    grid: gridSnapshot,
    size,
    running,
    dropsPerSecond,
    totalDrops,
    eventCount,
    lastAvalancheSize,
    maxAvalancheSize,
    stress,
    lastToppledCells,
    lastDropIndex,
    rules,
    sizeFrequency,
    play,
    pause,
    toggle,
    reset,
    step: stepOnce,
    setDropsPerSecond,
    setFailureThreshold,
    setStressInput,
  }
}
