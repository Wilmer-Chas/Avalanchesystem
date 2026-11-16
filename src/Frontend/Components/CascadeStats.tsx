interface CascadeStatsProps {
  totalDrops: number
  eventCount: number
  lastAvalancheSize: number
  maxAvalancheSize: number
  stress: number
}

export function CascadeStats({
  totalDrops,
  eventCount,
  lastAvalancheSize,
  maxAvalancheSize,
  stress,
}: CascadeStatsProps) {
  return (
    <dl className="cascade-stats">
      <div>
        <dt>Stress drops</dt>
        <dd>{totalDrops.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Quakes</dt>
        <dd>{eventCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Last quake size</dt>
        <dd>{lastAvalancheSize.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Largest so far</dt>
        <dd>{maxAvalancheSize.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Total stress on grid</dt>
        <dd>{stress.toLocaleString()}</dd>
      </div>
    </dl>
  )
}
