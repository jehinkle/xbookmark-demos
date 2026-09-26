import { useCallback, useMemo, useRef, useState } from 'react'
import { heatFill, isViolation } from './ir.js'
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
  onSelectModule,
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
  const lastHit = useRef(null)

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
        // Package dashed shell AABB always wraps hub + every child module in all
        // directions — dragging a module grows/moves the hull with it.
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
          minX = Math.min(minX, m.ax)
          minY = Math.min(minY, m.ay)
          maxX = Math.max(maxX, m.ax + m.w)
          maxY = Math.max(maxY, m.ay + m.h)
        }
        const pad = 20

        pkgBoxes.push({
          id: basePkg.id,
          label: basePkg.label,
          x: px,
          y: py,
          // Hull in package-local space so the shell always encompasses modules
          hullX: minX - pad - px,
          hullY: minY - pad - py,
          hullW: maxX - minX + pad * 2,
          hullH: maxY - minY + pad * 2,
          hubX: 0,
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
          modPos.set(m.id, {
            x: m.ax,
            y: m.ay,
            w: m.w,
            h: m.h,
            cx: m.ax + m.w / 2,
            cy: m.ay + m.h / 2,
            pkgId: basePkg.id,
            independent: true,
          })
        }
      } else {
        const locals = basePkg.localMods.map((lm) => {
          const mo = modOffsets[lm.id] || { x: 0, y: 0 }
          return { ...lm, lx: lm.lx + mo.x, ly: lm.ly + mo.y }
        })
        // Packed mode: grow package AABB in ALL directions so modules cannot
        // visually escape the package card when dragged left/up/right/down.
        let minX = 0
        let minY = 0
        let maxX = basePkg.w
        let maxY = basePkg.h
        for (const lm of locals) {
          minX = Math.min(minX, lm.lx - PKG_PAD)
          minY = Math.min(minY, lm.ly - PKG_PAD)
          maxX = Math.max(maxX, lm.lx + lm.w + PKG_PAD)
          maxY = Math.max(maxY, lm.ly + lm.h + PKG_PAD)
        }
        pkgBoxes.push({
          id: basePkg.id,
          label: basePkg.label,
          x: px,
          y: py,
          hullX: minX,
          hullY: minY,
          hullW: maxX - minX,
          hullH: maxY - minY,
          hubX: minX,
          hubW: maxX - minX,
          hubH: HEADER_H + 4,
          exploded: false,
          locals,
        })
        for (const lm of locals) {
          const absX = px + lm.lx
          const absY = py + lm.ly
          modPos.set(lm.id, {
            x: absX,
            y: absY,
            w: lm.w,
            h: lm.h,
            cx: absX + lm.w / 2,
            cy: absY + lm.h / 2,
            pkgId: basePkg.id,
            independent: false,
          })
        }
      }
    }

    return { modPos, pkgBoxes }
  }, [base, view.packages, pkgOffsets, modOffsets, explodedPkgs])

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
        lastHit.current = null
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

      // Remember hit target: setPointerCapture on the svg retargets native
      // dblclick to the svg, so card-level onDoubleClick never fires.
      lastHit.current = { kind, id }
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
        lastHit.current = null
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

  const onCanvasDoubleClick = useCallback(
    (e) => {
      e.preventDefault()
      // Prefer last pointer-down hit (reliable under pointer capture). Fall back
      // to elementFromPoint for any path that skipped our pointerdown.
      let hit = lastHit.current
      if (!hit) {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const node = el?.closest?.('[data-drag]')
        if (node) {
          hit = {
            kind: node.getAttribute('data-drag'),
            id: node.getAttribute('data-id'),
          }
        }
      }
      if (!hit?.id) return
      if (hit.kind === 'mod') {
        const mod = view.moduleMap.get(hit.id)
        if (mod) onSelectModule(mod)
      } else if (hit.kind === 'pkg') {
        onToggleExplode(hit.id)
      }
    },
    [onSelectModule, onToggleExplode, view.moduleMap],
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
        onDoubleClick={onCanvasDoubleClick}
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
                transform={`translate(${box.hubX || 0}, 0)`}
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
              const exports = (mod.exports || []).slice(0, 2)

              return (
                <g
                  key={mod.id}
                  data-drag="mod"
                  data-id={mod.id}
                  className={`class-box ${pos.independent ? 'independent' : ''}`}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: 'grab', ...transitionStyle }}
                >
                  <rect
                    width={pos.w}
                    height={pos.h}
                    rx={6}
                    ry={6}
                    fill={fill}
                    stroke="#0f172a"
                    strokeWidth={1.2}
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
                  {exports.map((ex, ei) => (
                    <text key={ex} x={8} y={52 + ei * 12} className="class-member">
                      → {ex}
                    </text>
                  ))}
                </g>
              )
            }),
          )}
        </g>
      </svg>
      <div className="canvas-hint">
        drag cards · empty / Alt-drag pans · wheel zoom · dbl-click / ⤢ explode ·
        dbl-click module opens detail
        {' · '}
        <button type="button" className="hint-reset" onClick={onResetLayout}>
          reset layout
        </button>
      </div>
    </div>
  )
}
