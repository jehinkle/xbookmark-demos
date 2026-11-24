// Thin-line SVG graphics. All values are made-up example data.

export function ForestPlot() {
  const rows = [
    ['Overall', 0.72, 0.6, 0.86],
    ['Age < 65', 0.68, 0.52, 0.89],
    ['Age ≥ 65', 0.79, 0.6, 1.04],
    ['Female', 0.7, 0.53, 0.92],
    ['Male', 0.75, 0.58, 0.97],
    ['ECOG 0', 0.66, 0.49, 0.88],
    ['ECOG 1', 0.81, 0.61, 1.08],
  ]
  const x = (v) => 90 + ((Math.log(v) - Math.log(0.4)) / (Math.log(1.6) - Math.log(0.4))) * 190
  return (
    <svg viewBox="0 0 300 180" className="g g-forest" role="img" aria-label="Forest plot of hazard ratios with 95% confidence intervals (example data)">
      <line x1={x(1)} y1="8" x2={x(1)} y2="168" className="g-axis" strokeDasharray="2 3" />
      {rows.map(([lab, hr, lo, hi], i) => {
        const y = 18 + i * 22
        return (
          <g key={lab} className="g-row" style={{ animationDelay: `${i * 0.12}s` }}>
            <text x="4" y={y + 3} className="g-label">{lab}</text>
            <line x1={x(lo)} y1={y} x2={x(hi)} y2={y} className={i === 0 ? 'g-accent' : 'g-line'} />
            <rect x={x(hr) - (i === 0 ? 4 : 3)} y={y - (i === 0 ? 4 : 3)} width={i === 0 ? 8 : 6} height={i === 0 ? 8 : 6} className={i === 0 ? 'g-fill-accent' : 'g-fill'} />
          </g>
        )
      })}
      <text x={x(1) - 4} y="178" className="g-label">1.0</text>
    </svg>
  )
}

export function Timeline() {
  const bars = [
    ['SAP', 0, 0.28], ['SDTM', 0.12, 0.5], ['ADaM', 0.3, 0.7], ['TFLs', 0.5, 0.9], ['CSR', 0.78, 1],
  ]
  return (
    <svg viewBox="0 0 300 180" className="g g-timeline" role="img" aria-label="Study timeline whose bars resize to fit the schedule (illustrative)">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={60 + t * 230} y1="10" x2={60 + t * 230} y2="160" className="g-axis" strokeDasharray="1 4" />
      ))}
      {bars.map(([lab, a, b], i) => {
        const y = 22 + i * 28
        return (
          <g key={lab}>
            <text x="4" y={y + 4} className="g-label">{lab}</text>
            <rect x={60 + a * 230} y={y - 6} width={(b - a) * 230} height="12" rx="1" className={i === 3 ? 'g-bar g-bar-accent' : 'g-bar'} style={{ animationDelay: `${i * 0.35}s`, transformOrigin: `${60 + a * 230}px ${y}px` }} />
          </g>
        )
      })}
      <line x1="60" y1="168" x2="290" y2="168" className="g-line" />
      <circle cx="290" cy="168" r="3" className="g-fill-accent" />
      <text x="244" y="160" className="g-label">LOCK</text>
    </svg>
  )
}

export function Checklist() {
  const items = ['Define-XML validates', 'ADaM traceability', 'Double programming match', 'Pinnacle 21 clean', 'Reviewer guide drafted']
  return (
    <svg viewBox="0 0 300 180" className="g g-check" role="img" aria-label="Checklist validating line by line (illustrative)">
      {items.map((t, i) => {
        const y = 24 + i * 32
        return (
          <g key={t} className="g-check-row" style={{ '--d': `${i * 0.7}s` }}>
            <rect x="6" y={y - 10} width="16" height="16" rx="2" className="g-line g-nofill" />
            <path d={`M9 ${y - 2} l4 4 l7 -9`} className="g-tick" pathLength="1" />
            <text x="34" y={y + 3} className="g-label g-label-lg">{t}</text>
            <line x1="34" y1={y + 10} x2="290" y2={y + 10} className="g-axis" />
          </g>
        )
      })}
    </svg>
  )
}

export function Waterfall() {
  // Best % change in tumor size per patient, sorted descending (example data).
  const vals = [62, 48, 35, 28, 21, 15, 9, 4, 0, -6, -12, -18, -24, -31, -33, -38, -42, -47, -55, -61, -68, -74, -82, -90]
  const zero = 70, sc = 0.62, bw = 260 / vals.length
  return (
    <svg viewBox="0 0 300 150" className="g" role="img" aria-label="Waterfall plot of best percent change in tumor size (example data)">
      <line x1="20" y1={zero + 30 * sc} x2="290" y2={zero + 30 * sc} className="g-axis" strokeDasharray="2 3" />
      <line x1="20" y1={zero} x2="290" y2={zero} className="g-line" />
      {vals.map((v, i) => (
        <rect key={i} x={24 + i * bw} width={bw - 3} y={v > 0 ? zero - v * sc : zero} height={Math.abs(v) * sc} className={v <= -30 ? 'g-fill-accent' : 'g-fill-dim'} />
      ))}
      <text x="22" y="12" className="g-label">BEST % CHANGE</text>
      <text x="24" y={zero + 30 * sc + 11} className="g-label">−30% · PR THRESHOLD</text>
    </svg>
  )
}

export function GSBoundary() {
  // O'Brien-Fleming-like efficacy bounds and a futility bound at 4 looks (illustrative values).
  const looks = [0.25, 0.5, 0.75, 1]
  const eff = [4.33, 2.96, 2.36, 2.01]
  const fut = [-0.5, 0.4, 1.2, 2.01]
  const X = (t) => 30 + t * 250, Y = (z) => 130 - (z + 1) * 22
  const path = (arr) => arr.map((z, i) => `${i ? 'L' : 'M'}${X(looks[i])} ${Y(z)}`).join(' ')
  return (
    <svg viewBox="0 0 300 150" className="g" role="img" aria-label="Group-sequential efficacy and futility boundaries (illustrative)">
      <line x1="30" y1="10" x2="30" y2="134" className="g-axis" />
      <line x1="30" y1={Y(0)} x2="290" y2={Y(0)} className="g-axis" strokeDasharray="2 3" />
      <path d={path(eff)} className="g-accent g-nofill g-draw" pathLength="1" />
      <path d={path(fut)} className="g-line g-nofill g-draw" pathLength="1" />
      {looks.map((t, i) => (
        <g key={t}>
          <circle cx={X(t)} cy={Y(eff[i])} r="3" className="g-fill-accent" />
          <circle cx={X(t)} cy={Y(fut[i])} r="2.5" className="g-fill" />
          <text x={X(t) - 10} y="146" className="g-label">{Math.round(t * 100)}%</text>
        </g>
      ))}
      <text x="36" y="16" className="g-label">Z · EFFICACY / FUTILITY</text>
    </svg>
  )
}

export function TflShell() {
  return (
    <div className="tfl" role="img" aria-label="Mock TFL table shell">
      <div className="tfl-h">Table 14.2.1 · Summary of Overall Survival</div>
      <div className="tfl-sub">Full Analysis Set · EXAMPLE SHELL</div>
      <div className="tfl-grid">
        <span />
        <span>Placebo<br />(N=xx)</span>
        <span>Active<br />(N=xx)</span>
        <span>Events, n (%)</span><span>xx (xx.x)</span><span>xx (xx.x)</span>
        <span>Median (95% CI)</span><span>xx.x (xx.x, xx.x)</span><span>xx.x (xx.x, xx.x)</span>
        <span>HR (95% CI)</span><span /><span>x.xx (x.xx, x.xx)</span>
        <span>Log-rank p</span><span /><span>x.xxxx</span>
      </div>
    </div>
  )
}
