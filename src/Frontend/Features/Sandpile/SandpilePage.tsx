import { useState } from 'react'
import { CascadeStats } from '../../Components/CascadeStats'
import { FundamentalsPanel } from '../../Components/FundamentalsPanel'
import { GridCanvas } from '../../Components/GridCanvas'
import { ModelParams } from '../../Components/ModelParams'
import { SimControls } from '../../Components/SimControls'
import { StressLegend } from '../../Components/StressLegend'
import { SizeFrequencyModal } from '../../Components/SizeFrequencyModal'
import {
  MAX_DROPS_PER_SEC,
  MAX_STRESS_INPUT,
  MAX_THRESHOLD,
  MIN_DROPS_PER_SEC,
  MIN_STRESS_INPUT,
  MIN_THRESHOLD,
  useSandpileSim,
} from './useSandpileSim'

export function SandpilePage() {
  const sim = useSandpileSim()
  const [chartOpen, setChartOpen] = useState(false)

  return (
    <div className="sandpile-page">
      <header className="sandpile-header">
        <h1>Sandpile Earthquake Grid</h1>
        <p>
          A simple teaching model of how earthquakes can cascade: stress builds
          until somewhere breaks, then neighbors can break too — many small
          events, occasional big ones.
        </p>
      </header>

      <div className="sandpile-body">
        <aside className="sandpile-sidebar">
          <FundamentalsPanel />
          <ModelParams
            failureThreshold={sim.rules.failureThreshold}
            stressInput={sim.rules.stressInput}
            minThreshold={MIN_THRESHOLD}
            maxThreshold={MAX_THRESHOLD}
            minStressInput={MIN_STRESS_INPUT}
            maxStressInput={MAX_STRESS_INPUT}
            onFailureThreshold={sim.setFailureThreshold}
            onStressInput={sim.setStressInput}
          />
          <StressLegend threshold={sim.rules.failureThreshold} />
        </aside>

        <div className="sandpile-main sandpile-main--solo">
          <div className="sandpile-stage">
            <GridCanvas
              grid={sim.grid}
              size={sim.size}
              toppledCells={sim.lastToppledCells}
              dropIndex={sim.lastDropIndex}
              threshold={sim.rules.failureThreshold}
            />
          </div>
        </div>
      </div>

      <footer className="sandpile-footer">
        <div className="footer-actions">
          <SimControls
            running={sim.running}
            dropsPerSecond={sim.dropsPerSecond}
            minDropsPerSecond={MIN_DROPS_PER_SEC}
            maxDropsPerSecond={MAX_DROPS_PER_SEC}
            onToggle={sim.toggle}
            onReset={sim.reset}
            onStep={sim.step}
            onSpeedChange={sim.setDropsPerSecond}
          />
          <button
            type="button"
            className="ctrl-btn ctrl-btn--accent"
            onClick={() => setChartOpen(true)}
          >
            View size chart
          </button>
        </div>
        <CascadeStats
          totalDrops={sim.totalDrops}
          eventCount={sim.eventCount}
          lastAvalancheSize={sim.lastAvalancheSize}
          maxAvalancheSize={sim.maxAvalancheSize}
          stress={sim.stress}
        />
      </footer>

      <SizeFrequencyModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        data={sim.sizeFrequency}
        eventCount={sim.eventCount}
      />
    </div>
  )
}
