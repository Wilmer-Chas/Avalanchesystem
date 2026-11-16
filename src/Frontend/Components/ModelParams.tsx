interface ModelParamsProps {
  failureThreshold: number
  stressInput: number
  minThreshold: number
  maxThreshold: number
  minStressInput: number
  maxStressInput: number
  onFailureThreshold: (value: number) => void
  onStressInput: (value: number) => void
}

export function ModelParams({
  failureThreshold,
  stressInput,
  minThreshold,
  maxThreshold,
  minStressInput,
  maxStressInput,
  onFailureThreshold,
  onStressInput,
}: ModelParamsProps) {
  return (
    <div className="model-params">
      <h2 className="panel-title">What you can change</h2>

      <label className="param-control">
        <span className="param-label">
          Failure threshold <strong>{failureThreshold}</strong>
        </span>
        <span className="param-hint">
          How much stress a cell can hold before it collapses to 0 and sheds
          everything to its neighbors.
        </span>
        <input
          type="range"
          min={minThreshold}
          max={maxThreshold}
          value={failureThreshold}
          onChange={(e) => onFailureThreshold(Number(e.target.value))}
        />
      </label>

      <label className="param-control">
        <span className="param-label">
          Stress input <strong>{stressInput}</strong>
        </span>
        <span className="param-hint">
          How much stress each drop adds. Drops are the only way new stress
          enters the system.
        </span>
        <input
          type="range"
          min={minStressInput}
          max={maxStressInput}
          value={stressInput}
          onChange={(e) => onStressInput(Number(e.target.value))}
        />
      </label>
    </div>
  )
}
