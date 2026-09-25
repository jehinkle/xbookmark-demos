import { useCallback, useMemo, useRef, useState } from 'react'
import { edgesForModule, heatFill, isViolation } from './ir.js'
import {
  PKG_PAD,
  HEADER_H,
  HUB_W,
  HUB_H,
  defaultLayout,
  fanLocals,
} from './layout.js'

const EXPLODE_BTN = 22
const DRAG_THRESHOLD = 4
const EXPAND_W = 260
const EXPAND_H = 210

function edgePath(a, b) {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const tA = Math.min(
    a.w / 2 / (Math.abs(ux) || 1e-6),
    a.h / 2 / (Math.abs(uy) || 1e-6),
  )
  const tB = Math.min(
    b.w / 2 / (Math.abs(ux) || 1e-6),
    b.h / 2 / (Math.abs(uy) || 1e-6),
  )
  const start = {
    x: a.cx + ux * Math.max(tA - 2, 0),
    y: a.cy + uy * Math.max(tA - 2, 0),
  }
  const end = {
    x: b.cx - ux * Math.max(tB + 4, 0),
    y: b.cy - uy * Math.max(tB + 4, 0),
  }
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const px = -uy * 28
  const py = ux * 28
  return {
    d: `M ${start.x} ${start.y} Q ${mx + px} ${my + py} ${end.x} ${end.y}`,
  }
}

function clientToWorld(svg, clientX, clientY, pan, zoom) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const sp = pt.matrixTransform(ctm.inverse())
  return {
    x: (sp.x - pan.x) / zoom,
    y: (sp.y - pan.y) / zoom,
  }
}

export default function Canvas({
  view,
  hideArrows,
  edgeKindFilter,
  explodedPkgs,
  onToggleExplode,
  expandedModId,
  onToggleExpandMod,
  pkgOffsets,
  modOffsets,
  onMovePackage,
  onMoveModule,
  onResetLayout,
  animating,
}) {
  const [pan, setPan] = useState({ x: 20, y: 10 })
  const [zoom, setZoom] = useState(0.92)
  const svgRef = useRef(null)
  const drag = useRef(null)

  const base = useMemo(() => defaultLayout(view.packages), [view.packages])

  const resolved = useMemo(() => {
    const modPos = new Map()
    const pkgBoxes = []

    for (const basePkg of base.pkgBoxes) {
      const pkg = view.packages.find((p) => p.id === basePkg.id)
      if (!pkg) continue
      const off = pkgOffsets[basePkg.id] || { x: 0, y: 0 }
      const px = basePkg.x + off.x
      const py = basePkg.y + off.y
      const exploded = explodedPkgs.has(basePkg.id)

      if (exploded) {
        const fan = fanLocals(pkg.modules || [])
        // Exploded: modOffsets are absolute world top-left (independent of package hub).
        const absMods = fan.map((lm) => {
          const mo = modOffsets[lm.id]
          const ax = mo ? mo.x : px + lm.lx
          const ay = mo ? mo.y : py + lm.ly
          return { ...lm, ax, ay }
        })

        let minX = px
        let minY = py
        let maxX = px + HUB_W
        let maxY = py + HUB_H
        for (const m of absMods) {
          const w = expandedModId === m.id ? EXPAND_W : m.w
          const h = expandedModId === m.id ? EXPAND_H : m.h
          minX = Math.min(minX, m.ax)
          minY = Math.min(minY, m.ay)
          maxX = Math.max(maxX, m.ax + w)
          maxY = Math.max(maxY, m.ay + h)
        }
        const pad = 20

        pkgBoxes.push({
          id: basePkg.id,
          label: basePkg.label,
          x: px,
          y: py,
          // Hull in package-local space so it still wraps free-floating modules
          hullX: minX - pad - px,
          hullY: minY - pad - py,
          hullW: maxX - minX + pad * 2,
          hullH: maxY - minY + pad * 2,
          hubW: HUB_W,
          hubH: HUB_H,
          exploded: true,
          locals: absMods.map((m) => ({
            id: m.id,
            lx: m.ax - px,
            ly: m.ay - py,
            w: m.w,
            h: m.h,
          })),
        })

        for (const m of absMods) {
          const expanded = expandedModId === m.id
          const w = expanded ? EXPAND_W : m.w
          const h = expanded ? EXPAND_H : m.h
          modPos.set(m.id, {
            x: m.ax,
            y: m.ay,
            w,
            h,
            cx: m.ax + w / 2,
            cy: m.ay + h / 2,
            pkgId: basePkg.id,
            expanded,
            independent: true,
          })
        }
      } else {
        const locals = basePkg.localMods.map((lm) => {
          const mo = modOffsets[lm.id] || { x: 0, y: 0 }
          return { ...lm, lx: lm.lx + mo.x, ly: lm.ly + mo.y }
        })
        let maxX = basePkg.w
        let maxY = basePkg.h
        for (const lm of locals) {
          const w = expandedModId === lm.id ? EXPAND_W : lm.w
          const h = expandedModId === lm.id ? EXPAND_H : lm.h
          maxX = Math.max(maxX, lm.lx + w + PKG_PAD)
          maxY = Math.max(maxY, lm.ly + h + PKG_PAD)
        }
        pkgBoxes.push({
          id: basePkg.id,
          label: basePkg.label,
          x: px,
          y: py,
          hullX: 0,
          hullY: 0,
          hullW: maxX,
          hullH: maxY,
          hubW: maxX,
          hubH: HEADER_H + 4,
          exploded: false,
          locals,
        })
        for (const lm of locals) {
          const absX = px + lm.lx
          const absY = py + lm.ly
          const expanded = expandedModId === lm.id
          const w = expanded ? EXPAND_W : lm.w
          const h = expanded ? EXPAND_H : lm.h
          modPos.set(lm.id, {
            x: absX,
            y: absY,
            w,
            h,
            cx: absX + w / 2,
            cy: absY + h / 2,
            pkgId: basePkg.id,
            expanded,
            independent: false,
          })
        }
      }
    }

    return { modPos, pkgBoxes }
  }, [base, view.packages, pkgOffsets, modOffsets, explodedPkgs, expandedModId])

  const edges = useMemo(() => {
    if (hideArrows) return []
    const kinds = edgeKindFilter
    return view.edges
      .filter((e) => !kinds || kinds.size === 0 || kinds.has(e.kind))
      .map((e) => {
        const a = resolved.modPos.get(e.from)
        const b = resolved.modPos.get(e.to)
        if (!a || !b) return null
        const path = edgePath(a, b)
        const viol = isViolation(e, view.moduleToPkg, view.levelByPkg)
        return { ...e, ...path, viol }
      })
      .filter(Boolean)
  }, [view, resolved, hideArrows, edgeKindFilter])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((z) => Math.min(2.5, Math.max(0.35, z + delta)))
  }, [])

  const endDrag = useCallback(() => {
    drag.current = null
  }, [])

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return
      const svg = svgRef.current
      if (!svg) return

      // Explode control handles its own click — don't start a drag
      if (e.target.closest('[data-explode-btn]')) return

      const interactive = e.target.closest('[data-drag]')
      const altPan = e.altKey

      if (altPan || !interactive) {
        drag.current = {
          kind: 'pan',
          px: e.clientX,
          py: e.clientY,
          ox: pan.x,
          oy: pan.y,
        }
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }

      const kind = interactive.getAttribute('data-drag')
      const id = interactive.getAttribute('data-id')
      const world = clientToWorld(svg, e.clientX, e.clientY, pan, zoom)

      drag.current = {
        kind,
        id,
        px: e.clientX,
        py: e.clientY,
        startWorld: world,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      e.stopPropagation()
    },
    [pan, zoom],
  )

  const onPointerMove = useCallback(
    (e) => {
      const d = drag.current
      if (!d) return

      if (d.kind === 'pan') {
        setPan({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) })
        return
      }

      const dist = Math.hypot(e.clientX - d.px, e.clientY - d.py)
      if (!d.moved && dist < DRAG_THRESHOLD) return
      d.moved = true

      const svg = svgRef.current
      if (!svg) return
      const world = clientToWorld(svg, e.clientX, e.clientY, pan, zoom)
      const dx = world.x - d.startWorld.x
      const dy = world.y - d.startWorld.y

      if (d.kind === 'pkg') onMovePackage(d.id, dx, dy, { phase: 'move' })
      else if (d.kind === 'mod') onMoveModule(d.id, dx, dy, { phase: 'move' })
    },
    [pan, zoom, onMovePackage, onMoveModule],
  )

  const onPointerUp = useCallback(
    (e) => {
      const d = drag.current
      if (!d) return

      if (d.kind === 'pan') {
        endDrag()
        return
      }

      if (d.moved) {
        const svg = svgRef.current
        if (svg) {
          const world = clientToWorld(svg, e.clientX, e.clientY, pan, zoom)
          const dx = world.x - d.startWorld.x
          const dy = world.y - d.startWorld.y
          if (d.kind === 'pkg') onMovePackage(d.id, dx, dy, { phase: 'end' })
          else if (d.kind === 'mod') onMoveModule(d.id, dx, dy, { phase: 'end' })
        } else {
          if (d.kind === 'pkg') onMovePackage(d.id, 0, 0, { phase: 'end' })
          else if (d.kind === 'mod') onMoveModule(d.id, 0, 0, { phase: 'end' })
        }
      }
      endDrag()
    },
    [pan, zoom, onMovePackage, onMoveModule, endDrag],
  )

  const transitionStyle = animating
    ? { transition: 'transform 0.32s ease' }
    : undefined

  return (
    <div className="uml-canvas-wrap" onWheel={onWheel}>
      <svg
        ref={svgRef}
        className="uml-canvas"
        width="100%"
        height="100%"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <marker
            id="arrow-ok"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
          <marker
            id="arrow-viol"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {resolved.pkgBoxes.map((box) => (
            <g
              key={box.id}
              className={`pkg-box ${box.exploded ? 'exploded' : ''}`}
              transform={`translate(${box.x},${box.y})`}
              style={transitionStyle}
            >
              <rect
                x={box.hullX}
                y={box.hullY}
                width={box.hullW}
                height={box.hullH}
                rx={14}
                ry={14}
                className={`pkg-rect ${box.exploded ? 'pkg-rect-exploded' : ''}`}
                pointerEvents="none"
              />
              <g
                data-drag="pkg"
                data-id={box.id}
                className="pkg-handle"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onToggleExplode(box.id)
                }}
              >
                <rect
                  width={box.hubW}
                  height={box.hubH}
                  rx={box.exploded ? 10 : 14}
                  ry={box.exploded ? 10 : 14}
                  fill={box.exploded ? 'rgba(51, 65, 85, 0.9)' : 'transparent'}
                  stroke={box.exploded ? '#64748b' : 'none'}
                  strokeWidth={box.exploded ? 1 : 0}
                />
                <text x={14} y={20} className="pkg-label">
                  {box.label}
                  {box.exploded ? ' · exploded' : ''}
                </text>
                <g
                  data-explode-btn
                  transform={`translate(${box.hubW - EXPLODE_BTN - 8}, 4)`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleExplode(box.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{box.exploded ? 'Collapse package' : 'Explode package'}</title>
                  <rect
                    width={EXPLODE_BTN}
                    height={EXPLODE_BTN}
                    rx={5}
                    className="explode-btn"
                  />
                  <text
                    x={EXPLODE_BTN / 2}
                    y={15}
                    textAnchor="middle"
                    className="explode-btn-label"
                  >
                    {box.exploded ? '⧉' : '⤢'}
                  </text>
                </g>
              </g>
            </g>
          ))}

          {edges.map((e, i) => (
            <path
              key={`${e.from}-${e.to}-${e.kind}-${i}`}
              d={e.d}
              fill="none"
              stroke={e.viol ? '#ef4444' : '#64748b'}
              strokeWidth={e.viol ? 2.2 : e.strength === 'strong' ? 1.6 : 1.2}
              strokeDasharray={e.strength === 'weak' ? '5 3' : undefined}
              markerEnd={e.viol ? 'url(#arrow-viol)' : 'url(#arrow-ok)'}
              opacity={0.9}
            />
          ))}

          {view.packages.flatMap((pkg) =>
            (pkg.modules || []).map((mod) => {
              const pos = resolved.modPos.get(mod.id)
              if (!pos) return null
              const heat = mod.metrics?.heat ?? 0.15
              const fill = heatFill(heat)
              const exports = (mod.exports || []).slice(0, pos.expanded ? 6 : 2)
              const outbound = pos.expanded
                ? edgesForModule(mod.id, view.edges, 'out').slice(0, 4)
                : []
              const inbound = pos.expanded
                ? edgesForModule(mod.id, view.edges, 'in').slice(0, 3)
                : []
              const outBlock = Math.max(outbound.length, 1)

              return (
                <g
                  key={mod.id}
                  data-drag="mod"
                  data-id={mod.id}
                  className={`class-box ${pos.expanded ? 'expanded' : ''} ${pos.independent ? 'independent' : ''}`}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: 'grab', ...transitionStyle }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onToggleExpandMod(mod.id)
                  }}
                >
                  <rect
                    width={pos.w}
                    height={pos.h}
                    rx={6}
                    ry={6}
                    fill={fill}
                    stroke={pos.expanded ? '#f8fafc' : '#0f172a'}
                    strokeWidth={pos.expanded ? 2 : 1.2}
                    opacity={0.94}
                  />
                  <rect
                    width={pos.w}
                    height={22}
                    rx={6}
                    ry={6}
                    fill="rgba(0,0,0,0.35)"
                  />
                  <rect y={16} width={pos.w} height={6} fill="rgba(0,0,0,0.35)" />
                  <text
                    x={pos.w / 2}
                    y={15}
                    textAnchor="middle"
                    className="class-name"
                  >
                    {mod.name}
                  </text>
                  <line
                    x1={6}
                    x2={pos.w - 6}
                    y1={24}
                    y2={24}
                    stroke="rgba(255,255,255,0.35)"
                  />
                  <text x={8} y={38} className="class-member">
                    {mod.kind}
                    {mod.metrics?.loc != null ? ` · ${mod.metrics.loc} loc` : ''}
                    {mod.metrics?.heat != null ? ` · heat ${mod.metrics.heat}` : ''}
                  </text>
                  {!pos.expanded &&
                    exports.map((ex, ei) => (
                      <text key={ex} x={8} y={52 + ei * 12} className="class-member">
                        → {ex}
                      </text>
                    ))}
                  {pos.expanded && (
                    <g className="mod-detail">
                      <text x={8} y={52} className="class-member dim">
                        {mod.path}
                      </text>
                      {exports.length > 0 && (
                        <text x={8} y={68} className="class-member">
                          exports: {exports.join(', ')}
                        </text>
                      )}
                      {mod.metrics && (
                        <text x={8} y={84} className="class-member">
                          {[
                            mod.metrics.loc != null && `loc ${mod.metrics.loc}`,
                            mod.metrics.macroCallCount != null &&
                              `macros ${mod.metrics.macroCallCount}`,
                            mod.metrics.hasQcTwin != null &&
                              `qc ${mod.metrics.hasQcTwin ? 'yes' : 'no'}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </text>
                      )}
                      <text x={8} y={104} className="class-member section">
                        out →
                      </text>
                      {outbound.length === 0 ? (
                        <text x={16} y={118} className="class-member dim">
                          (none)
                        </text>
                      ) : (
                        outbound.map((ed, ei) => {
                          const other = view.moduleMap.get(ed.to)
                          return (
                            <text
                              key={`o-${ed.to}-${ei}`}
                              x={16}
                              y={118 + ei * 13}
                              className="class-member"
                            >
                              {other?.name || ed.to} · {ed.kind}
                              {ed.strength === 'weak' ? ' ~' : ''}
                            </text>
                          )
                        })
                      )}
                      <text
                        x={8}
                        y={118 + outBlock * 13 + 10}
                        className="class-member section"
                      >
                        ← in
                      </text>
                      {inbound.length === 0 ? (
                        <text
                          x={16}
                          y={118 + outBlock * 13 + 24}
                          className="class-member dim"
                        >
                          (none)
                        </text>
                      ) : (
                        inbound.map((ed, ei) => {
                          const other = view.moduleMap.get(ed.from)
                          return (
                            <text
                              key={`i-${ed.from}-${ei}`}
                              x={16}
                              y={118 + outBlock * 13 + 24 + ei * 13}
                              className="class-member"
                            >
                              {other?.name || ed.from} · {ed.kind}
                            </text>
                          )
                        })
                      )}
                      <text x={8} y={pos.h - 10} className="class-member dim">
                        dbl-click to collapse
                      </text>
                    </g>
                  )}
                </g>
              )
            }),
          )}
        </g>
      </svg>
      <div className="canvas-hint">
        drag cards · empty / Alt-drag pans · wheel zoom · dbl-click / ⤢ explode ·
        dbl-click module expands
        {' · '}
        <button type="button" className="hint-reset" onClick={onResetLayout}>
          reset layout
        </button>
      </div>
    </div>
  )
}
