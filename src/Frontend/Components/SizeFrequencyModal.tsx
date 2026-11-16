import { useEffect, useMemo } from 'react'
import { PowerLawChart, type PowerLawPoint } from './PowerLawChart'
import { fitPowerLaw } from './powerLawFit'

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
  const fit = useMemo(
    () => fitPowerLaw(data, eventCount),
    [data, eventCount],
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
            <h2 id="chart-modal-title">Avalanche size distribution</h2>
            <p className="chart-modal-sub">
              {eventCount.toLocaleString()} avalanches recorded
              {fit
                ? ` · fitted exponent α ≈ ${fit.alpha.toFixed(2)}`
                : ' · need a bit more data to fit a line'}
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
            <span className="chart-key-line" /> Blue line = power-law fit to those
            dots
          </span>
        </div>

        <PowerLawChart data={data} eventCount={eventCount} large />

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
          <p>
            <strong>Blue line</strong> is calculated from the yellow dots: the
            best straight line on this log–log chart, which means{' '}
            <em>
              share ≈ constant / size
              {fit ? `^${fit.alpha.toFixed(2)}` : '^α'}
            </em>
            . When the dots hug that line, the model is showing a clear power
            law — many small avalanches, few large ones.
          </p>
        </div>
      </div>
    </div>
  )
}
