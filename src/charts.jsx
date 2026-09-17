/** Hand-rolled SVG chart primitives — no chart libraries */

export function EnrollmentCurve({
  width = 420,
  height = 180,
  animate = true,
  points,
  label = 'Cumulative enrollment',
}) {
  const pad = { t: 16, r: 12, b: 28, l: 36 }
  const iw = width - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const data =
    points ||
    [
      [0, 0],
      [1, 8],
      [2, 22],
      [3, 45],
      [4, 78],
      [5, 110],
      [6, 148],
      [7, 175],
      [8, 198],
      [9, 215],
      [10, 228],
      [11, 238],
    ]
  const maxX = data[data.length - 1][0]
  const maxY = Math.max(...data.map((d) => d[1])) * 1.08
  const sx = (x) => pad.l + (x / maxX) * iw
  const sy = (y) => pad.t + ih - (y / maxY) * ih
  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(d[0]).toFixed(1)},${sy(d[1]).toFixed(1)}`)
    .join(' ')
  const area =
    line +
    ` L${sx(maxX).toFixed(1)},${(pad.t + ih).toFixed(1)} L${sx(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`
  const pathLen = 900

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={label}
      className="chart-svg"
    >
      <defs>
        <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.l}
          x2={width - pad.r}
          y1={sy(maxY * f)}
          y2={sy(maxY * f)}
          stroke="var(--border)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#enrollFill)" className={animate ? 'enroll-area' : undefined} />
      <path
        d={line}
        fill="none"
        stroke="#0d9488"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'enroll-line' : undefined}
        style={animate ? { strokeDasharray: pathLen, strokeDashoffset: 0 } : undefined}
      />
      <circle
        cx={sx(data[data.length - 1][0])}
        cy={sy(data[data.length - 1][1])}
        r="4.5"
        fill="#0d9488"
        className={animate ? 'enroll-dot' : undefined}
      />
      <text x={pad.l} y={height - 6} fontSize="11" fill="var(--text-muted)">
        Month 0
      </text>
      <text
        x={width - pad.r}
        y={height - 6}
        fontSize="11"
        fill="var(--text-muted)"
        textAnchor="end"
      >
        M{maxX}
      </text>
      <text x={4} y={pad.t + 4} fontSize="10" fill="var(--text-muted)">
        n
      </text>
    </svg>
  )
}

export function ProgressRing({
  value = 72,
  label = 'Tables',
  size = 100,
  stroke = 8,
  color = '#0d9488',
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(100, Math.max(0, value)) / 100)
  return (
    <div className="progress-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${value}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-progress"
        />
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="18"
          fontWeight="700"
          fill="var(--text-h)"
        >
          {value}%
        </text>
      </svg>
      <span className="ring-label">{label}</span>
    </div>
  )
}

export function MilestoneSparkline({
  width = 320,
  height = 56,
  milestones = [
    { label: 'FPI', at: 0.08 },
    { label: '50%', at: 0.42 },
    { label: 'LPI', at: 0.72 },
    { label: 'DBR', at: 0.92 },
  ],
  progress = 0.58,
}) {
  const y = height / 2
  const pad = 18
  const track = width - pad * 2
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Study milestones">
      <line
        x1={pad}
        x2={pad + track}
        y1={y}
        y2={y}
        stroke="var(--border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1={pad}
        x2={pad + track * progress}
        y1={y}
        y2={y}
        stroke="#2b6cb0"
        strokeWidth="3"
        strokeLinecap="round"
        className="spark-progress"
      />
      {milestones.map((m) => {
        const x = pad + track * m.at
        const done = m.at <= progress
        return (
          <g key={m.label}>
            <circle
              cx={x}
              cy={y}
              r="6"
              fill={done ? '#2b6cb0' : '#fff'}
              stroke={done ? '#2b6cb0' : 'var(--border)'}
              strokeWidth="2"
            />
            <text
              x={x}
              y={height - 4}
              fontSize="10"
              fill="var(--text-muted)"
              textAnchor="middle"
            >
              {m.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function ForestPlot({
  width = 440,
  height = 200,
  endpoints = [],
}) {
  const pad = { t: 12, r: 16, b: 28, l: 120 }
  const iw = width - pad.l - pad.r
  const rowH = (height - pad.t - pad.b) / Math.max(endpoints.length, 1)
  // map effect from -0.5..1.5 onto plot (null at 0)
  const xmin = -0.4
  const xmax = 1.2
  const sx = (v) => pad.l + ((v - xmin) / (xmax - xmin)) * iw

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Treatment effect forest plot">
      <line
        x1={sx(0)}
        x2={sx(0)}
        y1={pad.t}
        y2={height - pad.b}
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <text x={sx(0)} y={height - 6} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
        null
      </text>
      {endpoints.map((ep, i) => {
        const cy = pad.t + rowH * i + rowH / 2
        return (
          <g key={ep.name}>
            <text
              x={pad.l - 10}
              y={cy}
              fontSize="12"
              fill="var(--text-h)"
              textAnchor="end"
              dominantBaseline="central"
            >
              {ep.name}
            </text>
            <line
              x1={sx(ep.lo)}
              x2={sx(ep.hi)}
              y1={cy}
              y2={cy}
              stroke="#0d9488"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <rect
              x={sx(ep.est) - 5}
              y={cy - 5}
              width="10"
              height="10"
              fill="#0d9488"
              transform={`rotate(45 ${sx(ep.est)} ${cy})`}
            />
          </g>
        )
      })}
    </svg>
  )
}

export function StatusBars({ items = [] }) {
  return (
    <div className="status-bars">
      {items.map((it) => (
        <div key={it.label} className="status-row">
          <div className="status-meta">
            <span>{it.label}</span>
            <span className="status-pct">{it.pct}%</span>
          </div>
          <div className="status-track">
            <div
              className="status-fill"
              style={{ width: `${it.pct}%`, background: it.color || 'var(--accent)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
