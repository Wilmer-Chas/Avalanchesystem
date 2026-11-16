interface SimControlsProps {
  running: boolean
  dropsPerSecond: number
  minDropsPerSecond: number
  maxDropsPerSecond: number
  onToggle: () => void
  onReset: () => void
  onStep: () => void
  onSpeedChange: (value: number) => void
}

export function SimControls({
  running,
  dropsPerSecond,
  minDropsPerSecond,
  maxDropsPerSecond,
  onToggle,
  onReset,
  onStep,
  onSpeedChange,
}: SimControlsProps) {
  return (
    <div className="sim-controls">
      <button type="button" className="ctrl-btn" onClick={onToggle}>
        {running ? 'Pause' : 'Play'}
      </button>
      <button type="button" className="ctrl-btn" onClick={onStep} disabled={running}>
        Step
      </button>
      <button type="button" className="ctrl-btn ctrl-btn--muted" onClick={onReset}>
        Reset
      </button>

      <label className="speed-control">
        <span className="speed-label">
          Speed <strong>{dropsPerSecond}</strong> drops/s
        </span>
        <input
          type="range"
          min={minDropsPerSecond}
          max={maxDropsPerSecond}
          value={dropsPerSecond}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
