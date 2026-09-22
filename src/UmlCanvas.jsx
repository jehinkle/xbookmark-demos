import { useCallback, useMemo, useRef, useState } from 'react'
import { crapFill, isViolation } from './ir.js'

const PKG_PAD = 16
const CLASS_W = 150
const CLASS_H = 88
const CLASS_GAP_X = 18
const CLASS_GAP_Y = 16
const PKG_GAP = 28
const HEADER_H = 28

function layoutPackages(packages, focusPkgId) {
  const visible = focusPkgId
    ? packages.filter((p) => p.id === focusPkgId)
    : packages

  const scale = focusPkgId ? 1.35 : 1
  const cw = CLASS_W * scale
  const ch = CLASS_H * scale
  const gapX = CLASS_GAP_X * scale
  const gapY = CLASS_GAP_Y * scale

  let x = 40
  const y0 = 40
  const classPos = new Map()
  const pkgBoxes = []

  for (const pkg of visible) {
    const n = pkg.classes.length
    const cols = Math.min(n, focusPkgId ? 3 : Math.min(3, Math.max(2, Math.ceil(Math.sqrt(n)))))
    const rows = Math.ceil(n / cols)
    const innerW = cols * cw + (cols - 1) * gapX
    const innerH = rows * ch + (rows - 1) * gapY
    const boxW = innerW + PKG_PAD * 2
    const boxH = innerH + PKG_PAD * 2 + HEADER_H

    pkg.classes.forEach((cls, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = x + PKG_PAD + col * (cw + gapX)
      const cy = y0 + HEADER_H + PKG_PAD + row * (ch + gapY)
      classPos.set(cls.id, {
        x: cx,
        y: cy,
        w: cw,
        h: ch,
        cx: cx + cw / 2,
        cy: cy + ch / 2,
        pkgId: pkg.id,
      })
    })

    pkgBoxes.push({
      id: pkg.id,
      label: pkg.label,
      x,
      y: y0,
      w: boxW,
      h: boxH,
    })
    x += boxW + PKG_GAP
  }

  return { classPos, pkgBoxes, worldW: x + 20, worldH: y0 + 320, classW: cw, classH: ch }
}

function edgePath(a, b) {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  // attach to box edges
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
  // slight bow perpendicular
  const px = -uy * 28
  const py = ux * 28
  return {
    d: `M ${start.x} ${start.y} Q ${mx + px} ${my + py} ${end.x} ${end.y}`,
    tipX: end.x,
    tipY: end.y,
    angle: Math.atan2(end.y - (my + py), end.x - (mx + px)),
  }
}

export default function UmlCanvas({
  view,
  focusPkgId,
  hideArrows,
  onDrillPackage,
  onSelectClass,
}) {
  const [pan, setPan] = useState({ x: 20, y: 10 })
  const [zoom, setZoom] = useState(1)
  const drag = useRef(null)
  const svgRef = useRef(null)

  const layout = useMemo(
    () => layoutPackages(view.packages, focusPkgId),
    [view.packages, focusPkgId],
  )

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((z) => Math.min(2.5, Math.max(0.4, z + delta)))
  }, [])

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    // only pan when clicking empty canvas (not a class/pkg)
    if (e.target.closest('[data-interactive]')) return
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: pan.x,
      oy: pan.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pan])

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
    return view.edges
      .map((e) => {
        const a = layout.classPos.get(e.from)
        const b = layout.classPos.get(e.to)
        if (!a || !b) return null
        const path = edgePath(a, b)
        const viol = isViolation(e.from, e.to, view.classToPkg, view.levelByPkg)
        return { ...e, ...path, viol }
      })
      .filter(Boolean)
  }, [view, layout, hideArrows])

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
          {/* packages */}
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
              <text
                x={box.x + 14}
                y={box.y + 20}
                className="pkg-label"
              >
                {box.label}
              </text>
            </g>
          ))}

          {/* edges under classes */}
          {edges.map((e, i) => (
            <path
              key={`${e.from}-${e.to}-${i}`}
              d={e.d}
              fill="none"
              stroke={e.viol ? '#ef4444' : '#64748b'}
              strokeWidth={e.viol ? 2.2 : 1.4}
              strokeDasharray={e.kind === 'dependency' ? '5 3' : undefined}
              markerEnd={e.viol ? 'url(#arrow-viol)' : 'url(#arrow-ok)'}
              opacity={0.9}
            />
          ))}

          {/* classes */}
          {view.packages
            .filter((p) => !focusPkgId || p.id === focusPkgId)
            .flatMap((pkg) =>
              pkg.classes.map((cls) => {
                const pos = layout.classPos.get(cls.id)
                if (!pos) return null
                const fill = crapFill(cls.crap?.mu ?? 1)
                const fields = (cls.fields || []).slice(0, 2)
                const ops = (cls.ops || []).slice(0, 2)
                return (
                  <g
                    key={cls.id}
                    data-interactive
                    className="class-box"
                    transform={`translate(${pos.x},${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectClass(cls)
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
                      fontStyle={cls.stereotype === 'interface' ? 'italic' : 'normal'}
                    >
                      {cls.stereotype === 'interface' ? `«I» ${cls.name}` : cls.name}
                    </text>
                    <line
                      x1={6}
                      x2={pos.w - 6}
                      y1={24}
                      y2={24}
                      stroke="rgba(255,255,255,0.35)"
                    />
                    {fields.map((f, fi) => (
                      <text
                        key={f.name}
                        x={8}
                        y={38 + fi * 12}
                        className="class-member"
                      >
                        {f.name}: {f.type}
                      </text>
                    ))}
                    {ops.map((op, oi) => (
                      <text
                        key={op.name}
                        x={8}
                        y={38 + fields.length * 12 + oi * 12}
                        className="class-member"
                      >
                        +{op.name}()
                      </text>
                    ))}
                  </g>
                )
              }),
            )}
        </g>
      </svg>
      <div className="canvas-hint">
        drag to pan · wheel zoom · click package to drill · click class for card
      </div>
    </div>
  )
}
