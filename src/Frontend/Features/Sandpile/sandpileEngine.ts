/** Threshold-failure grid: stress builds, cells fail, neighbors take the load. */

export const DEFAULT_GRID_SIZE = 81

export interface SimRules {
  /** Cell fails when its stress reaches this value. */
  failureThreshold: number
  /** Stress added by each random drop. Only drops add stress to the system. */
  stressInput: number
}

export const DEFAULT_RULES: SimRules = {
  failureThreshold: 4,
  stressInput: 1,
}

export type Grid = Uint16Array

export interface ToppleResult {
  /** Number of failure events in this cascade (a cell may fail more than once). */
  avalancheSize: number
  /** Flat indices of cells that failed at least once. */
  toppledCells: number[]
  /** Flat index where the triggering drop landed (uniform random cell). */
  dropIndex: number
}

export function createGrid(size: number = DEFAULT_GRID_SIZE): Grid {
  return new Uint16Array(size * size)
}

export function gridIndex(size: number, x: number, y: number): number {
  return y * size + x
}

export function drop(
  grid: Grid,
  size: number,
  x: number,
  y: number,
  stressInput: number,
): void {
  const i = gridIndex(size, x, y)
  grid[i] = Math.min(65535, grid[i]! + stressInput)
}

export function totalStress(grid: Grid): number {
  let sum = 0
  for (let i = 0; i < grid.length; i++) {
    sum += grid[i]!
  }
  return sum
}

/**
 * Resolve all unstable cells via a queue (avalanche).
 *
 * When a cell fails it collapses to 0 and sheds its *entire* stress load,
 * split across N/E/S/W. Neighbors that then reach the threshold also fail
 * and shed their full load — that chain reaction is the avalanche.
 *
 * Only random drops add stress. Stress that would tumble off the grid edge
 * leaves the system (open boundary).
 */
export function toppleUntilStable(
  grid: Grid,
  size: number,
  rules: SimRules,
): ToppleResult {
  const { failureThreshold } = rules
  const queue: number[] = []
  const toppledSet = new Set<number>()
  let avalancheSize = 0

  for (let i = 0; i < grid.length; i++) {
    if (grid[i]! >= failureThreshold) {
      queue.push(i)
    }
  }

  let head = 0
  while (head < queue.length) {
    const i = queue[head++]!
    if (grid[i]! < failureThreshold) continue

    // Aggressive empty: capture the whole pile, then clear the cell.
    const load = grid[i]!
    grid[i] = 0
    avalancheSize += 1
    toppledSet.add(i)

    const x = i % size
    const y = (i / size) | 0

    const neighbors: Array<[number, number]> = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ]

    // Conserve the shed load: split evenly toward all four directions.
    const base = Math.floor(load / 4)
    let remainder = load % 4

    for (let k = 0; k < 4; k++) {
      const give = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder -= 1
      if (give <= 0) continue

      const [nx, ny] = neighbors[k]!
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue // leaves system

      const ni = gridIndex(size, nx, ny)
      grid[ni] = Math.min(65535, grid[ni]! + give)

      // Neighbor over the limit → it also avalanches and sheds its amount.
      if (grid[ni]! >= failureThreshold) {
        queue.push(ni)
      }
    }
  }

  return {
    avalancheSize,
    toppledCells: Array.from(toppledSet),
    dropIndex: -1,
  }
}

export function randomDropAndResolve(
  grid: Grid,
  size: number,
  rules: SimRules,
): ToppleResult {
  // Independent uniform pick each time — repeats near the same spot are normal chance.
  const x = (Math.random() * size) | 0
  const y = (Math.random() * size) | 0
  const dropIndex = gridIndex(size, x, y)
  drop(grid, size, x, y, rules.stressInput)
  const result = toppleUntilStable(grid, size, rules)
  return { ...result, dropIndex }
}
