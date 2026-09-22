import { useCallback, useMemo, useRef, useState } from 'react'
import { heatFill, isViolation } from './ir.js'

const PKG_PAD = 16
const MOD_W = 148
const MOD_H = 78
const MOD_GAP_X = 16
const MOD_GAP_Y = 14
const PKG_GAP = 26
const HEADER_H = 28

function layoutPackages(packages, focusPkgId) {
  const visible = focusPkgId
    ? packages.filter((p) => p.id === focusPkgId)
    : packages

  const scale = focusPkgId ? 1.35 : 1
  const mw = MOD_W * scale
  const mh = MOD_H * scale
  const gapX = MOD_GAP_X * scale
  const gapY = MOD_GAP_Y * scale

  let x = 40
  const y0 = 40
  const modPos = new Map()
  const pkgBoxes = []
  let maxH = 280

  for (const pkg of visible) {
    const mods = pkg.modules || []
    const n = Math.max(mods.length, 1)
    const cols = Math.min(n, focusPkgId ? 3 : Math.min(3, Math.max(2, Math.ceil(Math.sqrt(n)))))
    const rows = Math.ceil(n / cols)
    const innerW = cols * mw + (cols - 1) * gapX
    const innerH = rows * mh + (rows - 1) * gapY
    const boxW = Math.max(innerW + PKG_PAD * 2, 120)
    const boxH = innerH + PKG_PAD * 2 + HEADER_H
    maxH = Math.max(maxH, boxH)

    mods.forEach((mod, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = x + PKG_PAD + col * (mw + gapX)
      const cy = y0 + HEADER_H + PKG_PAD + row * (mh + gapY)
      modPos.set(mod.id, {
        x: cx,
        y: cy,
        w: mw,
        h: mh,
        cx: cx + mw / 2,
        cy: cy + mh / 2,
        pkgId: pkg.id,
      })
    })

    pkgBoxes.push({
      id: pkg.id,
      label: `${pkg.label} · L${pkg.level}`,
      x,
      y: y0,
      w: boxW,
      h: boxH,
    })
    x += boxW + PKG_GAP
  }

  return { modPos, pkgBoxes, worldW: x + 20, worldH: y0 + maxH + 40 }
}

function edgePath(a, b) {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const start = {
    x: a.cx + ux * (a.w / 2 - 4),
    y: a.cy + uy * (a.h / 2 - 4),
  }
  const end = {
    x: b.cx - ux * (b.w / 2 + 6),
    y: b.cy - uy * (b.h / 2 + 6),
  }
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const px = -uy * 28
  const py = ux * 28
  return {
    d: `M ${start.x} ${start.y} Q ${mx + px} ${my + py} ${end.x} ${end.y}`,
  }
}

export default function Canvas({
  view,
  focusPkgId,
  hideArrows,
  edgeKindFilter,
  onDrillPackage,
  onSelectModule,
}) {
  const [pan, setPan] = useState({ x: 20, y: 10 })
  const [zoom, setZoom] = useState(0.95)
  const drag = useRef(null)

  const layout = useMemo(
    () => layoutPackages(view.packages, focusPkgId),
    [view.packages, focusPkgId],
  )

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((z) => Math.min(2.5, Math.max(0.35, z + delta)))
  }, [])

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return
      if (e.target.closest('[data-interactive]')) return
      drag.current = {
        px: e.clientX,
        py: e.clientY,
        ox: pan.x,
        oy: pan.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [pan],
  )

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.px
    const dy = e.clientY - drag.current.py
    setPan({ x: drag.current.ox + dx, y: drag.current.oy + dy })
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current = null
  }, [])

  const edges = useMemo(() => {
    if (hideArrows) return []
    const kinds = edgeKindFilter
    return view.edges
      .filter((e) => !kinds || kinds.size === 0 || kinds.has(e.kind))
      .map((e) => {
        const a = layout.modPos.get(e.from)
        const b = layout.modPos.get(e.to)
        if (!a || !b) return null
        const path = edgePath(a, b)
        const viol = isViolation(e, view.moduleToPkg, view.levelByPkg)
        return { ...e, ...path, viol }
      })
      .filter(Boolean)
  }, [view, layout, hideArrows, edgeKindFilter])

  return (
    <div className="uml-canvas-wrap" onWheel={onWheel}>
      <svg
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
          {layout.pkgBoxes.map((box) => (
            <g
              key={box.id}
              data-interactive
              className="pkg-box"
              onClick={(e) => {
                e.stopPropagation()
                if (!focusPkgId) onDrillPackage(box.id)
              }}
              style={{ cursor: focusPkgId ? 'default' : 'pointer' }}
            >
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx={14}
                ry={14}
                className="pkg-rect"
              />
              <text x={box.x + 14} y={box.y + 20} className="pkg-label">
                {box.label}
              </text>
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

          {view.packages
            .filter((p) => !focusPkgId || p.id === focusPkgId)
            .flatMap((pkg) =>
              (pkg.modules || []).map((mod) => {
                const pos = layout.modPos.get(mod.id)
                if (!pos) return null
                const heat = mod.metrics?.heat ?? 0.15
                const fill = heatFill(heat)
                const exports = (mod.exports || []).slice(0, 2)
                return (
                  <g
                    key={mod.id}
                    data-interactive
                    className="class-box"
                    transform={`translate(${pos.x},${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectModule(mod)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      width={pos.w}
                      height={pos.h}
                      rx={6}
                      ry={6}
                      fill={fill}
                      stroke="#0f172a"
                      strokeWidth={1.2}
                      opacity={0.92}
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
        drag to pan · wheel zoom · click package to drill · click module for card
      </div>
    </div>
  )
}
