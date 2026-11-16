import { STRESS_COLORS } from './GridCanvas'

interface StressLegendProps {
  threshold: number
}

export function StressLegend({ threshold }: StressLegendProps) {
  const levels = Array.from({ length: threshold }, (_, stress) => stress)

  return (
    <div className="stress-legend" aria-label="Colour key for stress on each cell">
      <h2 className="panel-title">What the colours mean</h2>
      <ul className="stress-legend-list">
        {levels.map((stress) => (
          <li key={stress}>
            <span
              className="stress-swatch"
              style={{
                background:
                  STRESS_COLORS[Math.min(stress, STRESS_COLORS.length - 1)],
              }}
            />
            <span>
              {stress === 0
                ? '0 — empty'
                : stress === threshold - 1
                  ? `${stress} — almost ready to collapse`
                  : `${stress}`}
            </span>
          </li>
        ))}
        <li>
          <span className="stress-swatch stress-swatch--flash" />
          <span>Soft red — avalanche (cells that just collapsed)</span>
        </li>
        <li>
          <span className="stress-swatch stress-swatch--drop" />
          <span>Cream outline — where the latest drop landed</span>
        </li>
      </ul>
      <p className="stress-legend-note">
        Drops are truly random (each cell equally likely). Seeing activity in
        one area often means a cascade spreading — not the rain stuck on one
        spot. True repeats can still happen by chance.
      </p>
    </div>
  )
}
