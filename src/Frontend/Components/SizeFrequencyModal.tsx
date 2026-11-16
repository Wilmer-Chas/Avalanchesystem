import { useEffect, useMemo } from 'react'
import { GutenbergRichterChart } from './GutenbergRichterChart'
import {
  buildGrSeries,
  fitGutenbergRichter,
  formatGrEquation,
} from './gutenbergRichter'
import { PowerLawChart, type PowerLawPoint } from './PowerLawChart'
import { fitPowerLaw, formatPowerLawEquation } from './powerLawFit'

interface SizeFrequencyModalProps {
  open: boolean
  onClose: () => void
  data: PowerLawPoint[]
  eventCount: number
}

export function SizeFrequencyModal({
  open,
  onClose,
  data,
  eventCount,
}: SizeFrequencyModalProps) {
  const powerFit = useMemo(
    () => fitPowerLaw(data, eventCount),
    [data, eventCount],
  )
  const grFit = useMemo(
    () => fitGutenbergRichter(buildGrSeries(data)),
    [data],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="chart-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-modal-title"
    >
      <button
        type="button"
        className="chart-modal-backdrop"
        aria-label="Close chart"
        onClick={onClose}
      />
      <div className="chart-modal-panel">
        <header className="chart-modal-header">
          <div>
            <h2 id="chart-modal-title">Avalanche statistics</h2>
            <p className="chart-modal-sub">
              {eventCount.toLocaleString()} avalanches recorded
              {powerFit
                ? ` · power-law α ≈ ${powerFit.alpha.toFixed(2)}`
                : ''}
              {grFit ? ` · GR b ≈ ${grFit.b.toFixed(2)}` : ''}
            </p>
          </div>
          <button type="button" className="ctrl-btn" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="chart-key" aria-hidden="true">
          <span className="chart-key-item">
            <span className="chart-key-dot" /> Yellow dots = your measured data
          </span>
          <span className="chart-key-item">
            <span className="chart-key-line" /> Blue line = fit to those dots
          </span>
        </div>

        <section className="chart-section" aria-labelledby="power-law-heading">
          <h3 id="power-law-heading" className="chart-section-title">
            Size distribution (power law)
          </h3>
          <PowerLawChart data={data} eventCount={eventCount} large />
          {powerFit && (
            <div className="chart-equation" aria-label="Power-law equation">
              <span className="chart-equation-label">Fitted equation</span>
              <code className="chart-equation-math">
                {formatPowerLawEquation(powerFit)}
              </code>
              <span className="chart-equation-hint">
                In plain words: small quakes show up a lot; big ones show up
                much less often. If one quake is 10 times bigger, you should see
                it about {Math.pow(10, powerFit.alpha).toFixed(1)} times less
                often (from this fit).
              </span>
            </div>
          )}
          <div className="chart-modal-legend">
            <p>
              <strong>Across → Avalanche size</strong> — how many cells broke in
              one cascade.
            </p>
            <p>
              <strong>Up → Share of all quakes</strong> — out of every quake
              recorded, what fraction had this size. Example: 0.10 means about 1
              in 10 quakes was this big.
            </p>
          </div>
        </section>

        <section className="chart-section" aria-labelledby="gr-heading">
          <h3 id="gr-heading" className="chart-section-title">
            Gutenberg–Richter style (model magnitude)
            {grFit ? ` · b ≈ ${grFit.b.toFixed(2)}` : ''}
          </h3>
          <GutenbergRichterChart data={data} eventCount={eventCount} large />
          {grFit && (
            <div className="chart-equation" aria-label="Gutenberg-Richter equation">
              <span className="chart-equation-label">Fitted equation</span>
              <code className="chart-equation-math">
                {formatGrEquation(grFit)}
              </code>
              <span className="chart-equation-hint">
                In plain words: for each step up in magnitude, there are fewer
                quakes that big or bigger. The number b ≈ {grFit.b.toFixed(2)}{' '}
                says how quickly that drop-off happens.
              </span>
            </div>
          )}
          <div className="chart-modal-legend">
            <p>
              <strong>Across → Model magnitude</strong> —{' '}
              <em>M = log10(avalanche size)</em>. Bigger cascade → higher M.
              Teaching stand-in, not a real seismograph reading.
            </p>
            <p>
              <strong>Up → Quakes this big or bigger</strong> — cumulative count
              of avalanches at least that magnitude.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
