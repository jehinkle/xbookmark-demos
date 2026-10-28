import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { nodes, SECTIONS, stateAt, ancestors, R1, GAP, sapVersionAt } from './lib/model.js'

const S = 760
const C = S / 2
const BAND0 = R1 + 22 // world radius where the section band starts
const BAND_W = 20 // band thickness in screen units (does not grow with zoom)
const KMIN = 1, KMAX = 12
const COL = { todo: '#d4d9e2', wip: '#3b6fe0', prog: '#9cb8f0', valid: '#2a58d4', mismatch: '#ee8a2a', gap: '#e0393b' }
const LABEL_K = 4 // show node labels past this zoom

// ---- view transform: screen(760-space) = k * world(760-space) + t ----
const clampView = ({ k, tx, ty }) => {
  k = Math.min(KMAX, Math.max(KMIN, k))
  const lo = S - k * S
  return { k, tx: Math.min(0, Math.max(lo, tx)), ty: Math.min(0, Math.max(lo, ty)) }
}
const zoomAt = (v, f, px, py) => {
  const k = Math.min(KMAX, Math.max(KMIN, v.k * f))
  return clampView({ k, tx: px - (px - v.tx) * (k / v.k), ty: py - (py - v.ty) * (k / v.k) })
}
const centerOn = (n, k) => clampView({ k, tx: S / 2 - k * (C + n.x), ty: S / 2 - k * (C + n.y) })

// screen-space arcs around the (moving) center
function arc(cx, cy, r, a0, a1, flip) {
  const p = (a) => `${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return flip ? `M ${p(a1)} A ${r} ${r} 0 ${large} 0 ${p(a0)}` : `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)}`
}
function band(cx, cy, r0, r1, a0, a1) {
  const q = (r, a) => `${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${q(r0, a0)} A ${r0} ${r0} 0 ${large} 1 ${q(r0, a1)} L ${q(r1, a1)} A ${r1} ${r1} 0 ${large} 0 ${q(r1, a0)} Z`
}
function wedgePath(a0, a1) {
  const q = (r, a) => `${C + Math.cos(a) * r} ${C + Math.sin(a) * r}`
  return `M ${q(30, a0)} L ${q(BAND0 - 4, a0)} A ${BAND0 - 4} ${BAND0 - 4} 0 0 1 ${q(BAND0 - 4, a1)} L ${q(30, a1)} A 30 30 0 0 0 ${q(30, a0)} Z`
}
const shortLabel = (n) => {
  const m = n.title.match(/^([TLF]-[\d.]+)/)
  if (m) return m[1]
  return n.title.length > 24 ? n.title.slice(0, 23) + '…' : n.title
}
// label priority: milestones, then bigger subtrees
const LABEL_ORDER = nodes.map((_, i) => i).filter((i) => i > 0)
  .sort((a, b) => (nodes[b].milestone ? 1e6 : 0) + nodes[b].size - ((nodes[a].milestone ? 1e6 : 0) + nodes[a].size))

export default function Radial({ t, onHover, hover, selected, onSelect, ringPct, focus }) {
  const wrap = useRef(null)
  const ref = useRef(null)
  const [dpr] = useState(() => Math.min(2, window.devicePixelRatio || 1))
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 })
  const viewRef = useRef(view)
  useLayoutEffect(() => { viewRef.current = view; window.__tflView = view }, [view])
  const [css, setCss] = useState(1) // screen px per 760-unit
  const anim = useRef(0)
  const smallSecs = SECTIONS.filter((s) => s.small)
  const lump = smallSecs.length ? { a0: smallSecs[0].a0, a1: smallSecs[smallSecs.length - 1].a1 } : null
  const hoverPath = useMemo(() => (hover != null ? ancestors(hover) : []), [hover])
  const selPath = useMemo(() => (selected != null ? ancestors(selected) : []), [selected])

  const animateTo = useCallback((target, ms = 380) => {
    cancelAnimationFrame(anim.current)
    const from = viewRef.current, t0 = performance.now()
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms), e = 1 - (1 - u) ** 3
      // interpolate in log-zoom so it feels even
      const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e)
      setView({ k, tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e })
      if (u < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [])

  // external "zoom to node" requests
  useEffect(() => {
    if (!focus) return
    const n = nodes[focus.i]
    animateTo(centerOn(n, Math.max(viewRef.current.k, focus.k || 6)))
  }, [focus, animateTo])
  // when zoomed in, keep a newly selected node in view (pan only if it is near/outside the edge)
  useEffect(() => {
    if (selected == null) return
    const v = viewRef.current
    if (v.k < 1.2) return
    const n = nodes[selected]
    const sx = v.k * (C + n.x) + v.tx, sy = v.k * (C + n.y) + v.ty
    if (sx < S * 0.2 || sx > S * 0.8 || sy < S * 0.2 || sy > S * 0.8) animateTo(centerOn(n, v.k))
  }, [selected, animateTo])

  useEffect(() => {
    const el = wrap.current
    const ro = new ResizeObserver(() => setCss(el.getBoundingClientRect().width / S))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- drawing ----
  useEffect(() => {
    const cv = ref.current
    const g = cv.getContext('2d')
    const { k, tx, ty } = view
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, S, S)
    g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (tx + k * C), dpr * (ty + k * C))
    const grow = k ** 0.4 / k // dot radius: on-screen size grows only ~k^0.4
    const lw = 1 / k
    // world-space visible box (for culling)
    const x0 = -tx / k - C - 10, x1 = (S - tx) / k - C + 10, y0 = -ty / k - C - 10, y1 = (S - ty) / k - C + 10
    const vis = (n) => n.x > x0 && n.x < x1 && n.y > y0 && n.y < y1
    const dim = hover != null || selected != null
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.milestone || !vis(n)) continue
      const st = stateAt(n, t)
      const big = Math.min(1.6, Math.log10(n.size) * 0.7)
      let r = st === 'todo' ? 1.5 : st === 'prog' ? 2.0 + big * 0.6 : 2.3 + big
      if (st === 'mismatch' || st === 'gap') r = 2.8 + big
      g.globalAlpha = dim ? 0.4 : 1
      if (st === 'wip') {
        g.strokeStyle = COL.wip; g.lineWidth = 1.2 * lw
        g.beginPath(); g.arc(n.x, n.y, 2.6 * grow, 0, 7); g.stroke()
      } else {
        g.fillStyle = COL[st]
        g.beginPath(); g.arc(n.x, n.y, r * grow, 0, 7); g.fill()
        if (st === 'valid' && r > 2.6) { g.strokeStyle = '#ffffff'; g.lineWidth = 0.6 * lw; g.stroke() }
      }
    }
    g.globalAlpha = 1
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i]
      if (!n.milestone || !vis(n)) continue
      const st = stateAt(n, t)
      const done = st === 'valid'
      const s = (done ? 8.5 : 6.5) * grow
      g.save(); g.translate(n.x, n.y); g.rotate(Math.PI / 4)
      g.globalAlpha = dim ? 0.5 : 1
      g.lineWidth = 1.2 * lw
      if (done) { g.fillStyle = '#c8913a'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = '#fff'; g.strokeRect(-s / 2, -s / 2, s, s) }
      else if (st === 'gap') { g.fillStyle = '#fbe0df'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = COL.gap; g.strokeRect(-s / 2, -s / 2, s, s) }
      else { g.fillStyle = '#ffffff'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = '#d8bf8f'; g.strokeRect(-s / 2, -s / 2, s, s) }
      g.restore()
    }
    g.globalAlpha = 1
    const drawPath = (path, color, w) => {
      g.strokeStyle = color; g.lineWidth = w * lw
      g.beginPath()
      path.forEach((i, j) => { const n = nodes[i]; if (j) g.lineTo(n.x, n.y); else g.moveTo(n.x, n.y) })
      g.stroke()
    }
    const drawNodes = (path, focusI, edge) => {
      for (const i of path) {
        const n = nodes[i]; if (!i) continue
        const st = stateAt(n, t)
        g.fillStyle = n.milestone ? '#c8913a' : st === 'todo' ? '#8d96a8' : COL[st]
        g.strokeStyle = edge; g.lineWidth = 1.2 * lw
        g.beginPath(); g.arc(n.x, n.y, (i === focusI ? 5.5 : 3.4) * grow, 0, 7); g.fill(); g.stroke()
      }
    }
    if (t >= GAP.found && t < GAP.fixed) {
      g.setLineDash([4 * lw, 3 * lw]); drawPath(ancestors(GAP.rootIdx), '#e0393b', 2); g.setLineDash([])
    }
    if (selPath.length) {
      const h = nodes[selected]
      g.strokeStyle = 'rgba(200,145,58,.6)'; g.lineWidth = lw
      g.setLineDash([3 * lw, 3 * lw])
      for (const i of selPath) for (const j of nodes[i].extra) { g.beginPath(); g.moveTo(nodes[i].x, nodes[i].y); g.lineTo(nodes[j].x, nodes[j].y); g.stroke() }
      g.setLineDash([])
      g.strokeStyle = 'rgba(27,42,74,.45)'; g.lineWidth = 0.8 * lw
      for (const c of h.children) { g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(nodes[c].x, nodes[c].y); g.stroke() }
      drawPath(selPath, '#1b2a4a', 2.4)
      drawNodes(selPath.flatMap((i) => [i, ...nodes[i].extra]), selected, '#1b2a4a')
      if (selected) { g.strokeStyle = '#c8913a'; g.lineWidth = 2 * lw; g.beginPath(); g.arc(h.x, h.y, 9 * grow, 0, 7); g.stroke() }
    }
    if (hoverPath.length && hover !== selected) {
      drawPath(hoverPath, '#5d6f96', 1.4)
      drawNodes(hoverPath, hover, '#3b4a6b')
    }
    // ---- labels (screen space, fixed size, collision-culled) ----
    if (k >= LABEL_K) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const fs = 10.5 / css
      g.font = `${fs}px -apple-system, Segoe UI, Roboto, sans-serif`
      g.textBaseline = 'middle'
      const CELL = 40 / css
      const grid = new Map() // cell -> rects
      const pad = 2 / css
      const hit = (r) => {
        for (let gx = Math.floor(r.x0 / CELL); gx <= Math.floor(r.x1 / CELL); gx++)
          for (let gy = Math.floor(r.y0 / CELL); gy <= Math.floor(r.y1 / CELL); gy++)
            for (const o of grid.get(gx + ',' + gy) || []) if (r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0) return true
        return false
      }
      const put = (r) => {
        for (let gx = Math.floor(r.x0 / CELL); gx <= Math.floor(r.x1 / CELL); gx++)
          for (let gy = Math.floor(r.y0 / CELL); gy <= Math.floor(r.y1 / CELL); gy++) {
            const key = gx + ',' + gy; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(r)
          }
      }
      const must = new Set([...selPath, ...(selected != null ? nodes[selected].extra : [])])
      if (hover != null) must.add(hover)
      const order = [...must, ...LABEL_ORDER]
      let drawn = 0
      for (const i of order) {
        if (!i) continue
        const n = nodes[i]
        if (!vis(n)) continue
        const sx = k * (C + n.x) + tx, sy = k * (C + n.y) + ty
        if (sx < 0 || sx > S || sy < 0 || sy > S) continue
        const txt = shortLabel(n)
        const w = g.measureText(txt).width
        const lx = sx + 6 / css
        const r = { x0: lx - pad, x1: lx + w + pad, y0: sy - fs * 0.65 - pad, y1: sy + fs * 0.65 + pad }
        if (!must.has(i) && hit(r)) continue
        put(r)
        g.fillStyle = 'rgba(255,255,255,.82)'
        g.fillRect(lx - 1.5 / css, sy - fs * 0.62, w + 3 / css, fs * 1.24)
        g.fillStyle = must.has(i) ? '#1b2a4a' : n.milestone ? '#8a6a32' : '#3a4252'
        g.fillText(txt, lx, sy)
        if (++drawn > 180) break
      }
    }
  }, [t, hover, hoverPath, selected, selPath, dpr, view, css])

  // ---- pointer handling: hover, click-to-pin, drag-to-pan, pinch ----
  const toLocal = (e) => {
    const b = wrap.current.getBoundingClientRect()
    const kk = S / b.width
    return { x: (e.clientX - b.left) * kk, y: (e.clientY - b.top) * kk, cx: e.clientX - b.left, cy: e.clientY - b.top }
  }
  const nearest = (p) => {
    const { k, tx, ty } = viewRef.current
    const x = (p.x - tx) / k - C, y = (p.y - ty) / k - C
    const thr = Math.max(8, 4 * k ** 0.4) / k
    const sap = 24 / k
    if (x * x + y * y < sap * sap) return 0
    let best = null, bd = thr * thr
    for (let i = 1; i < nodes.length; i++) {
      const dx = nodes[i].x - x, dy = nodes[i].y - y, d = dx * dx + dy * dy
      if (d < bd) { bd = d; best = i }
    }
    return best
  }
  const ptrs = useRef(new Map())
  const drag = useRef(null)
  const onDown = (e) => {
    wrap.current.setPointerCapture?.(e.pointerId)
    const p = toLocal(e)
    ptrs.current.set(e.pointerId, p)
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      drag.current = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), v0: viewRef.current, moved: true }
    } else drag.current = { x: p.x, y: p.y, sx: e.clientX, sy: e.clientY, v0: viewRef.current, moved: false }
    cancelAnimationFrame(anim.current)
  }
  const onMove = (e) => {
    const p = toLocal(e)
    const d = drag.current
    if (d && ptrs.current.has(e.pointerId)) {
      ptrs.current.set(e.pointerId, p)
      if (d.pinch && ptrs.current.size === 2) {
        const [a, b] = [...ptrs.current.values()]
        const f = Math.hypot(a.x - b.x, a.y - b.y) / d.d0
        setView(zoomAt(d.v0, f, (a.x + b.x) / 2, (a.y + b.y) / 2))
        return
      }
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true
      if (d.moved) {
        setView(clampView({ k: d.v0.k, tx: d.v0.tx + (p.x - d.x), ty: d.v0.ty + (p.y - d.y) }))
        onHover(null)
        return
      }
    }
    onHover(nearest(p), p.cx, p.cy)
  }
  const onUp = (e) => {
    const d = drag.current
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size === 0) drag.current = null
    if (d && !d.moved && !d.pinch) onSelect(nearest(toLocal(e))) // a real click (not a drag): pin or close
  }
  const onDbl = (e) => { const p = toLocal(e); animateTo(zoomAt(viewRef.current, 2, p.x, p.y), 260) }
  useEffect(() => {
    const el = wrap.current
    const wheel = (e) => {
      e.preventDefault()
      const b = el.getBoundingClientRect()
      const px = ((e.clientX - b.left) * S) / b.width, py = ((e.clientY - b.top) * S) / b.height
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018))
      cancelAnimationFrame(anim.current)
      setView((v) => zoomAt(v, f, px, py))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])
  const btn = (f) => (e) => { e.stopPropagation(); animateTo(zoomAt(viewRef.current, f, S / 2, S / 2), 220) }

  // ---- frame (bands/labels) in screen space: follows the zoom but keeps fixed thickness & font ----
  const { k, tx, ty } = view
  const cx = tx + k * C, cy = ty + k * C
  const rb0 = k * BAND0, rb1 = rb0 + BAND_W
  const fsArc = 11 / Math.max(0.75, css)
  const label = (s) => (s.small ? '' : s.name)
  const vb = { x: -tx / k, y: -ty / k, w: S / k }
  return (
    <div className={'radial' + (k > 1.01 ? ' zoomed' : '')} ref={wrap}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onPointerLeave={() => { if (!drag.current) onHover(null) }} onDoubleClick={onDbl}>
      <svg className="radial-bg" viewBox={`0 0 ${S} ${S}`}>
        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          {[0.25, 0.45, 0.65, 0.85, 1].map((f) => (
            <circle key={f} cx={C} cy={C} r={44 + f * (R1 - 44)} fill="none" stroke="#e7eaf0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {SECTIONS.map((s, i) => (i % 2 === 0 && !s.small ? <path key={'w' + s.key} d={wedgePath(s.a0, s.a1)} fill="#eef1f8" opacity="0.75" /> : null))}
        </g>
        {SECTIONS.map((s) => <path key={s.key} d={band(cx, cy, rb0, rb1, s.a0, s.a1)} fill={s.color} />)}
        <defs>
          {SECTIONS.map((s) => {
            const flip = Math.sin((s.a0 + s.a1) / 2) > 0.05
            return <path key={'p' + s.key} id={'lp-' + s.key} d={arc(cx, cy, flip ? rb1 + 4 + fsArc : rb1 + 7, s.a0, s.a1, flip)} />
          })}
          {lump && <path id="lp-lump" d={arc(cx, cy, rb1 + 7, lump.a0, lump.a1, false)} />}
        </defs>
        {SECTIONS.map((s) => (
          <text key={'t' + s.key} className="arc-label" style={{ fontSize: fsArc }}>
            <textPath href={'#lp-' + s.key} startOffset="50%" textAnchor="middle">{label(s)}</textPath>
          </text>
        ))}
        {lump && (
          <text className="arc-label" style={{ fontSize: fsArc }}>
            <textPath href="#lp-lump" startOffset="50%" textAnchor="middle">{smallSecs.length} smaller SAP sections</textPath>
          </text>
        )}
      </svg>
      <canvas ref={ref} width={S * dpr} height={S * dpr} style={{ width: '100%', aspectRatio: '1 / 1' }} />
      <svg className="radial-fg" viewBox={`0 0 ${S} ${S}`}>
        <g transform={`translate(${cx} ${cy})`}>
          <circle r={24} fill="#fff" stroke="#e3d3b4" strokeWidth="3" />
          <circle r={24} fill="none" stroke="#c8913a" strokeWidth="3" strokeDasharray={`${ringPct * 2 * Math.PI * 24} 999`} transform="rotate(-90)" />
          <circle r={15} fill="#111" />
          <circle r={4.5} fill={ringPct >= 1 ? '#e2b04f' : '#8a6a32'} />
          <rect x={-38} y={30} width="76" height="32" rx="4" fill="rgba(255,255,255,.88)" />
          <text y={46} textAnchor="middle" className="csr-label">SAP</text>
          <text y={57} textAnchor="middle" className="csr-sub">XYZ-101 · {sapVersionAt(t)}</text>
        </g>
        {k > 1.01 && (
          <g className="minimap" transform={`translate(8 ${S - 98}) scale(0.75)`} opacity="0.92">
            <rect width="120" height="120" rx="8" fill="rgba(255,255,255,.92)" stroke="#d5dae4" />
            {SECTIONS.map((s) => <path key={'m' + s.key} d={band(60, 60, 50, 56, s.a0, s.a1)} fill={s.color} />)}
            <circle cx="60" cy="60" r="3" fill="#111" />
            <rect x={(vb.x / S) * 120} y={(vb.y / S) * 120} width={(vb.w / S) * 120} height={(vb.w / S) * 120}
              fill="rgba(42,88,212,.12)" stroke="#2a58d4" strokeWidth="1.2" />
          </g>
        )}
      </svg>
      <div className="zoom-ctl" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button onClick={btn(1.6)} aria-label="Zoom in">+</button>
        <button onClick={btn(1 / 1.6)} aria-label="Zoom out">−</button>
        <button onClick={(e) => { e.stopPropagation(); animateTo({ k: 1, tx: 0, ty: 0 }) }} aria-label="Reset zoom" title="Fit">⤢</button>
        <span className="zoom-k">{k.toFixed(1)}×</span>
      </div>
      {k <= 1.01 && <div className="zoom-hint">Scroll or pinch to zoom · drag to pan · double-click to zoom in</div>}
    </div>
  )
}
