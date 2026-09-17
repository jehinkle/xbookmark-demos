import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES } from './knowledge'

const CARD_W = 200
const ROW_H = 18
const HEADER_H = 28
const COL_GAP = 80
const ROW_GAP = 28
const PAD = 48

function cardHeight(fieldCount) {
  return HEADER_H + fieldCount * ROW_H + 8
}

/**
 * Category-column layout with vertical stacking + light jitter for readability.
 * @param {import('./knowledge').Entity[]} entities
 * @param {number} seed
 */
export function computeLayout(entities, seed = 1) {
  const order = { core: 0, master: 1, detail: 2 }
  const cols = [[], [], []]
  for (const e of entities) {
    const ci = order[e.category] ?? 1
    cols[ci].push(e)
  }
  // Stable sort within column by name for predictability, then slight seed-based reorder
  cols.forEach((col, ci) => {
    col.sort((a, b) => a.name.localeCompare(b.name))
    if (seed % 2 === 0 && col.length > 2) {
      const mid = Math.floor(col.length / 2)
      const [item] = col.splice(mid, 1)
      col.push(item)
    }
    if (seed % 3 === 0 && col.length > 1) {
      col.reverse()
    }
    // keep protocol / study near top when present
    const prefer = ['protocol', 'study', 'visit', 'studySubject', 'dataElement', 'user']
    col.sort((a, b) => {
      const ai = prefer.indexOf(a.id)
      const bi = prefer.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
    void ci
  })

  /** @type {Record<string, { x: number, y: number, w: number, h: number }>} */
  const positions = {}
  let maxY = 0
  let maxX = 0

  cols.forEach((col, ci) => {
    let y = PAD + (ci === 1 ? 20 : ci === 2 ? 40 : 0)
    // seed-based vertical offset per column
    y += ((seed * (ci + 1) * 17) % 40)
    const x = PAD + ci * (CARD_W + COL_GAP)
    for (const e of col) {
      const h = cardHeight(e.fields.length)
      const jitterX = ((seed * e.name.length * (ci + 3)) % 17) - 8
      positions[e.id] = { x: x + jitterX, y, w: CARD_W, h }
      y += h + ROW_GAP
      maxY = Math.max(maxY, y)
      maxX = Math.max(maxX, x + CARD_W + PAD)
    }
  })

  return {
    positions,
    width: Math.max(maxX + PAD, 900),
    height: Math.max(maxY + PAD, 700),
  }
}

function fieldY(pos, fieldIndex) {
  return pos.y + HEADER_H + 4 + fieldIndex * ROW_H + ROW_H / 2
}

function edgePath(fromPos, toPos, fieldIndex, bend) {
  const y1 = fieldY(fromPos, fieldIndex)
  const x1 = fromPos.x // left side of source for leftward, else right
  const goRight = toPos.x + toPos.w / 2 >= fromPos.x + fromPos.w / 2
  const sx = goRight ? fromPos.x + fromPos.w : fromPos.x
  const sy = y1
  const tx = goRight ? toPos.x : toPos.x + toPos.w
  const ty = toPos.y + HEADER_H / 2
  const dx = Math.abs(tx - sx)
  const cx1 = sx + (goRight ? 1 : -1) * (40 + bend + dx * 0.25)
  const cx2 = tx + (goRight ? -1 : 1) * (40 + bend + dx * 0.15)
  return `M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`
}

/**
 * @param {{
 *   entities: import('./knowledge').Entity[],
 *   edges: { id: string, from: string, to: string, field: string }[],
 *   layoutSeed: number,
 *   selectedId: string | null,
 *   onSelect: (id: string | null) => void,
 * }} props
 */
export default function ErdCanvas({
  entities,
  edges,
  layoutSeed,
  selectedId,
  onSelect,
}) {
  const svgRef = useRef(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 0.85 })
  const dragRef = useRef(null)

  const layout = useMemo(
    () => computeLayout(entities, layoutSeed),
    [entities, layoutSeed],
  )

  // Fit view loosely when layout regenerates
  useEffect(() => {
    setView((v) => ({ ...v, x: 20, y: 10, k: 0.82 }))
  }, [layoutSeed, entities.length])

  const related = useMemo(() => {
    if (!selectedId) return null
    const ids = new Set([selectedId])
    for (const e of edges) {
      if (e.from === selectedId) ids.add(e.to)
      if (e.to === selectedId) ids.add(e.from)
    }
    return ids
  }, [selectedId, edges])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    setView((v) => {
      const nk = Math.min(2.5, Math.max(0.35, v.k * factor))
      // zoom toward cursor
      const wx = (mx - v.x) / v.k
      const wy = (my - v.y) / v.k
      return { k: nk, x: mx - wx * nk, y: my - wy * nk }
    })
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    // only pan if background
    if (e.target.closest('[data-card]')) return
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      vx: view.x,
      vy: view.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const d = dragRef.current
    setView((v) => ({
      ...v,
      x: d.vx + (e.clientX - d.px),
      y: d.vy + (e.clientY - d.py),
    }))
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const entityById = useMemo(
    () => Object.fromEntries(entities.map((e) => [e.id, e])),
    [entities],
  )

  return (
    <svg
      ref={svgRef}
      className="erd-svg"
      width="100%"
      height="100%"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        if (!e.target.closest('[data-card]')) onSelect(null)
      }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a8f98" />
        </marker>
        <marker
          id="arrow-hi"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8ecf0" />
        </marker>
      </defs>
      <rect width="100%" height="100%" className="erd-bg" />
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        {/* edges under cards */}
        {edges.map((edge, i) => {
          const from = layout.positions[edge.from]
          const to = layout.positions[edge.to]
          const ent = entityById[edge.from]
          if (!from || !to || !ent) return null
          const fi = ent.fields.findIndex((f) => f.name === edge.field)
          const fieldIndex = fi >= 0 ? fi : 0
          const active =
            !related || related.has(edge.from) || related.has(edge.to)
          const path = edgePath(from, to, fieldIndex, (i % 5) * 8)
          return (
            <path
              key={edge.id}
              d={path}
              className={`erd-edge ${active ? 'erd-edge-on' : 'erd-edge-dim'}`}
              markerEnd={active && related ? 'url(#arrow-hi)' : 'url(#arrow)'}
            />
          )
        })}

        {entities.map((ent) => {
          const pos = layout.positions[ent.id]
          if (!pos) return null
          const cat = CATEGORIES[ent.category]
          const isSel = selectedId === ent.id
          const active = !related || related.has(ent.id)
          return (
            <g
              key={ent.id}
              data-card
              transform={`translate(${pos.x},${pos.y})`}
              className={`erd-card ${active ? 'erd-card-on' : 'erd-card-dim'} ${isSel ? 'erd-card-sel' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(ent.id === selectedId ? null : ent.id)
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                width={pos.w}
                height={pos.h}
                rx={4}
                ry={4}
                fill={cat.body}
                stroke={isSel ? '#e8ecf0' : cat.border}
                strokeWidth={isSel ? 2 : 1}
              />
              <rect
                width={pos.w}
                height={HEADER_H}
                rx={4}
                ry={4}
                fill={cat.header}
              />
              <rect y={HEADER_H - 4} width={pos.w} height={4} fill={cat.header} />
              <text
                x={10}
                y={18}
                className="erd-card-title"
                fill="#f0f2f5"
              >
                {ent.name}
              </text>
              <rect
                x={pos.w - 42}
                y={6}
                width={34}
                height={16}
                rx={2}
                fill="transparent"
                stroke={cat.accent}
                strokeWidth={1}
              />
              <text
                x={pos.w - 25}
                y={18}
                textAnchor="middle"
                className="erd-card-tag"
                fill={cat.accent}
              >
                {ent.tag}
              </text>
              {ent.fields.map((f, idx) => {
                const y = HEADER_H + 4 + idx * ROW_H
                return (
                  <g key={f.name}>
                    <text x={10} y={y + 13} className="erd-field" fill="#c8ccd4">
                      {f.isPk ? '🔑 ' : f.isFk ? '🔗 ' : '  '}
                      {f.name}
                      <tspan fill="#7a808c"> : {f.type}</tspan>
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      <text x={12} y={18} className="erd-hint" fill="#5a606c">
        scroll = zoom · drag background = pan · click card = highlight
      </text>
    </svg>
  )
}
