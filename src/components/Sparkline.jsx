// Lab sparkline with shaded reference-range band and out-of-range points highlighted.
export default function Sparkline({ points, def, width = 280, height = 84 }) {
  if (!points.length) return <div className="spark-empty">No results yet</div>
  const vals = points.map((p) => p.value)
  const lo = Math.min(def.low, ...vals)
  const hi = Math.max(def.high, ...vals)
  const pad = (hi - lo) * 0.12 || 1
  const yMin = lo - pad
  const yMax = hi + pad
  const px = 8
  const x = (i) => (points.length === 1 ? width / 2 : px + (i * (width - px * 2)) / (points.length - 1))
  const y = (v) => height - 6 - ((v - yMin) / (yMax - yMin)) * (height - 12)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const out = (v) => v < def.low || v > def.high
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${def.key} trend`}>
      <rect x="0" y={y(def.high)} width={width} height={Math.max(1, y(def.low) - y(def.high))} className="ref-band" />
      <line x1="0" x2={width} y1={y(def.high)} y2={y(def.high)} className="ref-line" />
      <line x1="0" x2={width} y1={y(def.low)} y2={y(def.low)} className="ref-line" />
      <path d={d} className="spark-path" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={out(p.value) ? 4.2 : 3} className={out(p.value) ? 'pt out' : 'pt'}>
          <title>{`${p.visit} · ${p.date}: ${p.value} ${def.unit}`}</title>
        </circle>
      ))}
    </svg>
  )
}
