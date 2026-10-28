import { DAYS, PAUSES, N_MS, msDoneAt, GAP, adslDay, safetyDay } from './lib/model.js'

const W = 1100, H = 480
const M = { l: 70, r: 120, t: 170, b: 40 }
const X = (d) => M.l + (d / (DAYS + 1)) * (W - M.l - M.r)
const Y = (v) => H - M.b - (v / (N_MS * 1.08)) * (H - M.t - M.b)
const fmt = (d) => `Day ${d.toFixed(1)}`

const eod = Array.from({ length: DAYS }, (_, i) => ({ d: i + 1, v: msDoneAt(i + 1) }))

export default function BurnUp({ t }) {
  const shown = eod.filter((p) => p.d <= t)
  const live = { d: t, v: msDoneAt(t) }
  const pts = [...shown, ...(t > (shown.at(-1)?.d ?? 0) ? [live] : [])]
  const line = (ps) => ps.map((p, i) => `${i ? 'L' : 'M'}${X(p.d)} ${Y(p.v)}`).join(' ')
  const ann = [
    { d: adslDay, text: `${fmt(adslDay)}: §6 ADSL branch validated`, row: 2, end: false },
    { d: GAP.found, text: `${fmt(GAP.found)}: ADTTE censoring conflicts with SAP §9.4.2`, row: 1, end: false },
    { d: GAP.fixed, text: `${fmt(GAP.fixed)}: SAP v2.1 branch re-derived and re-validated`, row: 0, end: true },
    { d: safetyDay, text: `${fmt(safetyDay)}: safety tables QC-complete`, row: 3, end: true },
  ]
  const ticks = [0, 4, 8, 12, 16, 20, 24]
  const yt = [0, 20, 40, 60, 80, 100]
  const done = live.v >= N_MS
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="burnup">
      <text x={M.l - 40} y={36} className="bu-title">
        <tspan fontWeight="700">Milestones completed, out of {N_MS}:</tspan>
        <tspan fill="#555"> end-of-day counts toward CSR-ready outputs, Days 1–{DAYS}</tspan>
      </text>
      {PAUSES.map((p) => (
        <g key={p.from}>
          <rect x={X(p.from)} y={M.t - 10} width={X(p.to) - X(p.from)} height={H - M.b - M.t + 10} fill="#e9e9e9" />
          <text x={(X(p.from) + X(p.to)) / 2} y={H - M.b - 10} textAnchor="middle" className="bu-small">Paused</text>
        </g>
      ))}
      {yt.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} stroke="#e6e6e6" />
          <text x={M.l - 10} y={Y(v) + 4} textAnchor="end" className="bu-axis">{v}</text>
        </g>
      ))}
      <line x1={M.l} x2={W - M.r + 30} y1={Y(N_MS)} y2={Y(N_MS)} stroke="#2b4a8b" strokeDasharray="6 4" />
      <text x={M.l - 10} y={Y(N_MS) + 4} textAnchor="end" className="bu-axis" fill="#2b4a8b" fontWeight="600">{N_MS}</text>
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#999" />
      {ticks.map((d) => (
        <text key={d} x={X(d)} y={H - M.b + 22} textAnchor="middle" className="bu-axis">Day {d}</text>
      ))}
      {ann.map((a) => (
        <g key={a.text} opacity={t >= a.d ? 1 : 0.3}>
          <line x1={X(a.d)} x2={X(a.d)} y1={70 + a.row * 22} y2={Y(msDoneAt(a.d)) - 6} stroke="#777" strokeDasharray="2 3" />
          <text x={X(a.d)} y={66 + a.row * 22} className="bu-ann" textAnchor={a.end ? 'end' : 'start'} dx={a.end ? 4 : -4}>{a.text}</text>
        </g>
      ))}
      {/* ghost of the full replay */}
      <path d={line(eod)} fill="none" stroke="#dfe6f5" strokeWidth="2" />
      <path d={line(pts)} fill="none" stroke="#4f86e8" strokeWidth="2.5" />
      {shown.map((p) => <circle key={p.d} cx={X(p.d)} cy={Y(p.v)} r="4" fill="#4f86e8" stroke="#fff" />)}
      <line x1={X(t)} x2={X(t)} y1={M.t - 10} y2={H - M.b} stroke="#1d3f8f" strokeWidth="1" opacity=".35" />
      <circle cx={X(t)} cy={Y(live.v)} r={done ? 7 : 5.5} fill="#1d3f8f" stroke="#fff" strokeWidth="1.5" />
      <text x={X(t) + 10} y={Y(live.v) + (done ? 26 : -10)} className="bu-live" textAnchor={done ? 'middle' : 'start'}>
        {done ? '' : `${live.v} / ${N_MS}`}
      </text>
      {done && (
        <g>
          <line x1={X(t)} x2={X(t)} y1={Y(live.v)} y2={Y(live.v) + 60} stroke="#1d3f8f" strokeDasharray="2 3" />
          <text x={X(t) + 4} y={Y(live.v) + 80} textAnchor="middle" className="bu-live">Day {t.toFixed(0)}</text>
          <text x={X(t) + 4} y={Y(live.v) + 98} textAnchor="middle" className="bu-ann" fill="#2b4a8b">All {N_MS} complete</text>
        </g>
      )}
    </svg>
  )
}
