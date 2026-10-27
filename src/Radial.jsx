import { useEffect, useMemo, useRef, useState } from 'react'
import { nodes, SECTIONS, stateAt, ancestors, R1, GAP, sapVersionAt } from './lib/model.js'

const S = 760
const C = S / 2
const BAND0 = R1 + 22
const BAND1 = BAND0 + 20
const COL = { todo: '#d4d9e2', wip: '#3b6fe0', prog: '#9cb8f0', valid: '#2a58d4', mismatch: '#ee8a2a', gap: '#e0393b' }

function arcPath(r, a0, a1, flip) {
  const p = (a) => `${C + Math.cos(a) * r} ${C + Math.sin(a) * r}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return flip ? `M ${p(a1)} A ${r} ${r} 0 ${large} 0 ${p(a0)}` : `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)}`
}
function bandPath(a0, a1) {
  const q = (r, a) => `${C + Math.cos(a) * r} ${C + Math.sin(a) * r}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${q(BAND0, a0)} A ${BAND0} ${BAND0} 0 ${large} 1 ${q(BAND0, a1)} L ${q(BAND1, a1)} A ${BAND1} ${BAND1} 0 ${large} 0 ${q(BAND1, a0)} Z`
}
function wedgePath(a0, a1) {
  const q = (r, a) => `${C + Math.cos(a) * r} ${C + Math.sin(a) * r}`
  return `M ${q(30, a0)} L ${q(BAND0 - 4, a0)} A ${BAND0 - 4} ${BAND0 - 4} 0 0 1 ${q(BAND0 - 4, a1)} L ${q(30, a1)} A 30 30 0 0 0 ${q(30, a0)} Z`
}

export default function Radial({ t, onHover, hover, selected, onSelect, ringPct }) {
  const ref = useRef(null)
  const [dpr] = useState(() => Math.min(2, window.devicePixelRatio || 1))
  const smallSecs = SECTIONS.filter((s) => s.small)
  const lump = smallSecs.length ? { a0: smallSecs[0].a0, a1: smallSecs[smallSecs.length - 1].a1 } : null
  const hoverPath = useMemo(() => (hover != null ? ancestors(hover) : []), [hover])
  const selPath = useMemo(() => (selected != null ? ancestors(selected) : []), [selected])

  useEffect(() => {
    const cv = ref.current
    const g = cv.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, S, S)
    g.save(); g.translate(C, C)
    const dim = hover != null
    // dots
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.milestone) continue
      const st = stateAt(n, t)
      const big = Math.min(1.6, Math.log10(n.size) * 0.7)
      let r = st === 'todo' ? 1.5 : st === 'prog' ? 2.0 + big * 0.6 : 2.3 + big
      if (st === 'mismatch' || st === 'gap') r = 2.8 + big
      g.globalAlpha = dim ? 0.35 : 1
      if (st === 'wip') {
        g.strokeStyle = COL.wip; g.lineWidth = 1.2
        g.beginPath(); g.arc(n.x, n.y, 2.6, 0, 7); g.stroke()
      } else {
        g.fillStyle = COL[st]
        g.beginPath(); g.arc(n.x, n.y, r, 0, 7); g.fill()
        if (st === 'valid' && r > 2.6) { g.strokeStyle = '#ffffff'; g.lineWidth = 0.6; g.stroke() }
      }
    }
    g.globalAlpha = 1
    // milestones (gold diamonds)
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (!n.milestone) continue
      const st = stateAt(n, t)
      const done = st === 'valid'
      const s = done ? 8.5 : 6.5
      g.save(); g.translate(n.x, n.y); g.rotate(Math.PI / 4)
      g.globalAlpha = dim ? 0.45 : 1
      if (done) { g.fillStyle = '#c8913a'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(-s / 2, -s / 2, s, s) }
      else if (st === 'gap') { g.fillStyle = '#fbe0df'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = COL.gap; g.lineWidth = 1.3; g.strokeRect(-s / 2, -s / 2, s, s) }
      else { g.fillStyle = '#ffffff'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = '#d8bf8f'; g.lineWidth = 1.2; g.strokeRect(-s / 2, -s / 2, s, s) }
      g.restore()
    }
    g.globalAlpha = 1
    const drawPath = (path, color, w) => {
      g.strokeStyle = color; g.lineWidth = w
      g.beginPath()
      path.forEach((i, k) => { const n = nodes[i]; k ? g.lineTo(n.x, n.y) : g.moveTo(n.x, n.y) })
      g.stroke()
    }
    const drawNodes = (path, focus, edge) => {
      for (const i of path) {
        const n = nodes[i]; if (!i) continue
        const st = stateAt(n, t)
        g.fillStyle = n.milestone ? '#c8913a' : st === 'todo' ? '#8d96a8' : COL[st]
        g.strokeStyle = edge; g.lineWidth = 1.2
        g.beginPath(); g.arc(n.x, n.y, i === focus ? 5.5 : 3.4, 0, 7); g.fill(); g.stroke()
      }
    }
    // gap: light the path from the SAP section that changed
    if (t >= GAP.found && t < GAP.fixed) {
      g.setLineDash([4, 3]); drawPath(ancestors(GAP.rootIdx), '#e0393b', 2); g.setLineDash([])
    }
    // selected (pinned) dependency chain
    if (selPath.length) {
      const h = nodes[selected]
      g.strokeStyle = 'rgba(200,145,58,.55)'; g.lineWidth = 1
      g.setLineDash([3, 3])
      for (const i of selPath) for (const j of nodes[i].extra) { g.beginPath(); g.moveTo(nodes[i].x, nodes[i].y); g.lineTo(nodes[j].x, nodes[j].y); g.stroke() }
      g.setLineDash([])
      g.strokeStyle = 'rgba(27,42,74,.4)'; g.lineWidth = 0.8
      for (const c of h.children) { g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(nodes[c].x, nodes[c].y); g.stroke() }
      drawPath(selPath, '#1b2a4a', 2.4)
      drawNodes(selPath.flatMap((i) => [i, ...nodes[i].extra]), selected, '#1b2a4a')
      if (selected) { g.strokeStyle = '#c8913a'; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, 9, 0, 7); g.stroke() }
    }
    // hover path to the SAP
    if (hoverPath.length && hover !== selected) {
      drawPath(hoverPath, '#5d6f96', 1.4)
      drawNodes(hoverPath, hover, '#3b4a6b')
    }
    g.restore()
  }, [t, hover, hoverPath, selected, selPath, dpr])

  const onMove = (e) => {
    const b = e.currentTarget.getBoundingClientRect()
    onHover(nearest(e), e.clientX - b.left, e.clientY - b.top)
  }

  const nearest = (e) => {
    const b = e.currentTarget.getBoundingClientRect()
    const k = S / b.width
    const x = (e.clientX - b.left) * k - C, y = (e.clientY - b.top) * k - C
    if (x * x + y * y < 26 * 26) return 0
    let best = null, bd = 64
    for (let i = 1; i < nodes.length; i++) {
      const dx = nodes[i].x - x, dy = nodes[i].y - y, d = dx * dx + dy * dy
      if (d < bd) { bd = d; best = i }
    }
    return best
  }
  const label = (s) => (s.small ? '' : s.name)
  return (
    <div className="radial" onMouseMove={onMove} onMouseLeave={() => onHover(null)} onClick={(e) => onSelect(nearest(e))}>
      <svg className="radial-bg" viewBox={`0 0 ${S} ${S}`}>
        {[0.25, 0.45, 0.65, 0.85, 1].map((f) => (
          <circle key={f} cx={C} cy={C} r={44 + f * (R1 - 44)} fill="none" stroke="#e7eaf0" strokeWidth="1" />
        ))}
        {SECTIONS.map((s, i) => (i % 2 === 0 && !s.small ? <path key={'w' + s.key} d={wedgePath(s.a0, s.a1)} fill="#eef1f8" opacity="0.75" /> : null))}
        {SECTIONS.map((s) => <path key={s.key} d={bandPath(s.a0, s.a1)} fill={s.color} />)}
        <defs>
          {SECTIONS.map((s) => {
            const mid = (s.a0 + s.a1) / 2
            const flip = Math.sin(mid) > 0.05
            return <path key={'p' + s.key} id={'lp-' + s.key} d={arcPath(flip ? BAND1 + 15 : BAND1 + 7, s.a0, s.a1, flip)} />
          })}
          {lump && <path id="lp-lump" d={arcPath(BAND1 + 7, lump.a0, lump.a1, false)} />}
        </defs>
        {SECTIONS.map((s) => (
          <text key={'t' + s.key} className="arc-label">
            <textPath href={'#lp-' + s.key} startOffset="50%" textAnchor="middle">{label(s)}</textPath>
          </text>
        ))}
        {lump && (
          <text className="arc-label">
            <textPath href="#lp-lump" startOffset="50%" textAnchor="middle">{smallSecs.length} smaller SAP sections</textPath>
          </text>
        )}
      </svg>
      <canvas ref={ref} width={S * dpr} height={S * dpr} style={{ width: '100%', aspectRatio: '1 / 1' }} />
      <svg className="radial-fg" viewBox={`0 0 ${S} ${S}`}>
        <circle cx={C} cy={C} r={24} fill="#fff" stroke="#e3d3b4" strokeWidth="3" />
        <circle cx={C} cy={C} r={24} fill="none" stroke="#c8913a" strokeWidth="3"
          strokeDasharray={`${ringPct * 2 * Math.PI * 24} 999`} transform={`rotate(-90 ${C} ${C})`} />
        <circle cx={C} cy={C} r={15} fill="#111" />
        <circle cx={C} cy={C} r={4.5} fill={ringPct >= 1 ? '#e2b04f' : '#8a6a32'} />
        <rect x={C - 38} y={C + 30} width="76" height="32" rx="4" fill="rgba(255,255,255,.88)" />
        <text x={C} y={C + 46} textAnchor="middle" className="csr-label">SAP</text>
        <text x={C} y={C + 57} textAnchor="middle" className="csr-sub">XYZ-101 · {sapVersionAt(t)}</text>
      </svg>
    </div>
  )
}
