import { useState } from 'react'

// Dual-thumb range slider with editable min/max boxes (inventory-style).
export default function RangeSlider({ min, max, value, onChange, step = 1, unit = '', label }) {
  const [lo, hi] = value
  const [draft, setDraft] = useState([String(lo), String(hi)])
  const [prev, setPrev] = useState([lo, hi])
  if (prev[0] !== lo || prev[1] !== hi) {
    setPrev([lo, hi])
    setDraft([String(lo), String(hi)])
  }
  const pct = (v) => ((v - min) / (max - min)) * 100

  const commit = (idx, raw) => {
    let n = Number(raw)
    if (!Number.isFinite(n)) n = idx === 0 ? lo : hi
    n = Math.max(min, Math.min(max, Math.round(n)))
    const next = idx === 0 ? [Math.min(n, hi), hi] : [lo, Math.max(n, lo)]
    onChange(next)
    setDraft(next.map(String))
  }

  return (
    <div className="range">
      <div className="range-boxes">
        {[0, 1].map((i) => (
          <label key={i} className="range-box">
            <span className="sr-only">{label} {i === 0 ? 'minimum' : 'maximum'}</span>
            <input
              inputMode="numeric"
              value={draft[i]}
              onChange={(e) => setDraft((d) => (i === 0 ? [e.target.value, d[1]] : [d[0], e.target.value]))}
              onBlur={(e) => commit(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commit(i, e.currentTarget.value)}
            />
            {unit && <span className="unit">{unit}</span>}
          </label>
        ))}
      </div>
      <div className="range-track-wrap">
        <div className="range-track" />
        <div className="range-fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${label} minimum`}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          style={{ zIndex: lo > max - (max - min) * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${label} maximum`}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="range-ends">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
