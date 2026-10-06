import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatDateAxis, formatDateShort } from '../data/mockEnrollment'

const PAD = { top: 20, right: 72, bottom: 28, left: 12 }
const VOL_H = 56
const GAP = 8

function niceTicks(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min || 0, (max || 1)]
  }
  const span = max - min
  const raw = span / Math.max(1, count - 1)
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const norm = raw / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const start = Math.ceil(min / step) * step
  const ticks = []
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(v)
  if (!ticks.length) ticks.push(min, max)
  return ticks
}

function buildAreaPath(xs, ys) {
  if (!xs.length) return ''
  return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
}

function buildFillPath(xs, ys, baselineY) {
  if (!xs.length) return ''
  const line = buildAreaPath(xs, ys)
  const last = xs.length - 1
  return `${line} L${xs[last].toFixed(1)},${baselineY.toFixed(1)} L${xs[0].toFixed(1)},${baselineY.toFixed(1)} Z`
}

export default function EnrollmentChart({
  actual, // [{date, cumulative, daily}]
  projection, // [{date, cumulative, daily}]
  compareSeries, // [{id, name, color, points: [{date, cumulative}]}]
  targetN,
  targetLabel = 'Target N',
  showTarget = true,
  showWeeklyRate = false,
  weeklyRate = 0,
  accent = '#00e676',
  projectionColor = '#b388ff',
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 900, h: 420 })
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.max(320, width), h: Math.max(260, height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chartH = size.h - VOL_H - GAP
  const plotW = size.w - PAD.left - PAD.right
  const plotH = chartH - PAD.top - PAD.bottom

  const layout = useMemo(() => {
    const allDates = [
      ...actual.map((p) => p.date),
      ...projection.map((p) => p.date),
    ]
    // For compare overlays, include their dates in domain too
    for (const s of compareSeries || []) {
      for (const p of s.points) allDates.push(p.date)
    }
    if (!allDates.length) return null

    const uniq = [...new Set(allDates)].sort()
    const dateIndex = new Map(uniq.map((d, i) => [d, i]))
    const n = uniq.length
    const xAt = (date) =>
      PAD.left + (n === 1 ? plotW / 2 : (dateIndex.get(date) / (n - 1)) * plotW)

    let yMax = Math.max(
      targetN || 0,
      ...actual.map((p) => p.cumulative),
      ...projection.map((p) => p.cumulative),
      ...((compareSeries || []).flatMap((s) => s.points.map((p) => p.cumulative))),
    )
    yMax = Math.max(yMax * 1.06, 10)
    const yMin = 0
    const yScale = (v) => PAD.top + ((yMax - v) / (yMax - yMin || 1)) * plotH
    const baselineY = yScale(0)

    const ax = actual.map((p) => xAt(p.date))
    const ay = actual.map((p) => yScale(p.cumulative))
    const actualPath = buildAreaPath(ax, ay)
    const actualFill = buildFillPath(ax, ay, baselineY)

    const px = projection.map((p) => xAt(p.date))
    const py = projection.map((p) => yScale(p.cumulative))
    // Connect projection from last actual point
    let projPath = ''
    if (projection.length && actual.length) {
      const lastA = actual[actual.length - 1]
      const bridgeX = [xAt(lastA.date), ...px]
      const bridgeY = [yScale(lastA.cumulative), ...py]
      projPath = buildAreaPath(bridgeX, bridgeY)
    } else if (projection.length) {
      projPath = buildAreaPath(px, py)
    }

    const comparePaths = (compareSeries || []).map((s) => {
      const xs = s.points.map((p) => xAt(p.date))
      const ys = s.points.map((p) => yScale(p.cumulative))
      return { ...s, path: buildAreaPath(xs, ys) }
    })

    // Volume bars from actual daily (+ projection daily lightly)
    const volTop = chartH + GAP
    const maxVol = Math.max(
      1,
      ...actual.map((p) => p.daily || 0),
      ...projection.map((p) => Math.ceil(p.daily || 0)),
    )
    const volScale = (c) => volTop + VOL_H - 6 - (c / maxVol) * (VOL_H - 16)

    // X-axis labels — pick ~5 evenly
    const labelIdx = []
    const labelCount = Math.min(5, n)
    for (let i = 0; i < labelCount; i++) {
      labelIdx.push(Math.round((i / Math.max(1, labelCount - 1)) * (n - 1)))
    }

    const yTicks = niceTicks(0, yMax, 4)

    // Split line x between actual and projection
    const splitX = actual.length ? xAt(actual[actual.length - 1].date) : null

    return {
      uniq,
      xAt,
      yScale,
      yMax,
      baselineY,
      actualPath,
      actualFill,
      projPath,
      comparePaths,
      ax,
      ay,
      px,
      py,
      volTop,
      volScale,
      maxVol,
      labelIdx,
      yTicks,
      splitX,
      n,
    }
  }, [actual, projection, compareSeries, targetN, plotW, plotH, chartH])

  const onMove = useCallback(
    (e) => {
      if (!layout) return
      const rect = wrapRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < layout.uniq.length; i++) {
        const xi = layout.xAt(layout.uniq[i])
        const dist = Math.abs(xi - x)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      }
      const date = layout.uniq[best]
      const a = actual.find((p) => p.date === date)
      const p = projection.find((pt) => pt.date === date)
      const compares = (compareSeries || [])
        .map((s) => {
          const pt = s.points.find((q) => q.date === date)
          return pt ? { id: s.id, name: s.name, color: s.color, cumulative: pt.cumulative } : null
        })
        .filter(Boolean)
      setHover({
        date,
        x: layout.xAt(date),
        cumulative: a?.cumulative ?? p?.cumulative ?? null,
        daily: a?.daily ?? p?.daily ?? 0,
        isProjection: !a && !!p,
        compares,
      })
    },
    [layout, actual, projection, compareSeries],
  )

  const onLeave = () => setHover(null)

  if (!layout) {
    return (
      <div className="chart-wrap empty" ref={wrapRef}>
        <p>No enrollment data in this range.</p>
      </div>
    )
  }

  const lastProj = projection.length ? projection[projection.length - 1] : null
  const lastProjX = lastProj ? layout.xAt(lastProj.date) : null
  const lastProjY = lastProj ? layout.yScale(lastProj.cumulative) : null

  return (
    <div className="chart-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={onLeave}>
      <svg width={size.w} height={size.h} className="enroll-svg" role="img" aria-label="Cumulative enrollment chart">
        <defs>
          <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {layout.yTicks.map((t) => (
          <g key={`yt-${t}`}>
            <line
              x1={PAD.left}
              x2={size.w - PAD.right}
              y1={layout.yScale(t)}
              y2={layout.yScale(t)}
              className="grid-line"
            />
            <text x={size.w - PAD.right + 8} y={layout.yScale(t) + 4} className="axis-label">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {/* Target / milestone reference */}
        {showTarget && targetN != null && (
          <g>
            <line
              x1={PAD.left}
              x2={size.w - PAD.right}
              y1={layout.yScale(targetN)}
              y2={layout.yScale(targetN)}
              className="target-line"
            />
            <text
              x={size.w - PAD.right + 8}
              y={layout.yScale(targetN) - 6}
              className="target-label"
            >
              {targetLabel} {targetN}
            </text>
          </g>
        )}

        {/* Weekly rate indicator — horizontal band annotation */}
        {showWeeklyRate && weeklyRate > 0 && actual.length > 0 && (
          <text
            x={PAD.left + 8}
            y={PAD.top + 14}
            className="rate-badge"
          >
            Model weekly rate ≈ {weeklyRate.toFixed(1)} pts/wk
          </text>
        )}

        {/* Compare overlays (behind main) */}
        {layout.comparePaths.map((s) => (
          <path
            key={s.id}
            d={s.path}
            fill="none"
            stroke={s.color}
            strokeWidth="1.75"
            strokeOpacity="0.85"
            className="compare-line"
          />
        ))}

        {/* Actual area */}
        {layout.actualFill && (
          <path d={layout.actualFill} fill="url(#enrollFill)" stroke="none" />
        )}
        {layout.actualPath && (
          <path
            d={layout.actualPath}
            fill="none"
            stroke={accent}
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Projection segment */}
        {layout.projPath && (
          <path
            d={layout.projPath}
            fill="none"
            stroke={projectionColor}
            strokeWidth="1.6"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.95"
          />
        )}

        {/* Split marker between actual / projection */}
        {layout.splitX != null && projection.length > 0 && (
          <line
            x1={layout.splitX}
            x2={layout.splitX}
            y1={PAD.top}
            y2={chartH - PAD.bottom}
            className="split-line"
          />
        )}

        {/* Projection end dot */}
        {lastProjX != null && (
          <circle cx={lastProjX} cy={lastProjY} r="5" fill={accent} stroke="#0b0e11" strokeWidth="2" />
        )}

        {/* X labels */}
        {layout.labelIdx.map((i) => {
          const date = layout.uniq[i]
          return (
            <text
              key={`xl-${date}`}
              x={layout.xAt(date)}
              y={chartH - 8}
              textAnchor="middle"
              className="axis-label"
            >
              {formatDateAxis(date)}
            </text>
          )
        })}

        {/* Volume pane */}
        <text x={PAD.left} y={layout.volTop + 10} className="vol-title">
          Daily enrollments
        </text>
        {actual.map((p) => {
          const c = p.daily || 0
          if (!c) return null
          const x = layout.xAt(p.date)
          const y1 = layout.volScale(c)
          const y0 = layout.volTop + VOL_H - 6
          return (
            <rect
              key={`v-${p.date}`}
              x={x - 1.5}
              y={y1}
              width="3"
              height={Math.max(1, y0 - y1)}
              fill="url(#volGrad)"
              opacity="0.9"
            />
          )
        })}
        {projection.map((p) => {
          const c = Math.round(p.daily || 0)
          if (c < 1 && (p.daily || 0) < 0.35) return null
          const h = Math.max(p.daily || 0, 0.25)
          const x = layout.xAt(p.date)
          const y1 = layout.volScale(h)
          const y0 = layout.volTop + VOL_H - 6
          return (
            <rect
              key={`vp-${p.date}`}
              x={x - 1}
              y={y1}
              width="2"
              height={Math.max(1, y0 - y1)}
              fill={projectionColor}
              opacity="0.35"
            />
          )
        })}

        {/* Crosshair */}
        {hover && (
          <g className="crosshair">
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={layout.volTop + VOL_H - 6}
              className="crosshair-line"
            />
            {hover.cumulative != null && (
              <circle
                cx={hover.x}
                cy={layout.yScale(hover.cumulative)}
                r="4"
                fill={hover.isProjection ? projectionColor : accent}
                stroke="#fff"
                strokeWidth="1"
              />
            )}
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(size.w - 180, Math.max(8, hover.x + 12)),
            top: 28,
          }}
        >
          <div className="tt-date">{formatDateShort(hover.date)}</div>
          <div className="tt-row">
            <span className={hover.isProjection ? 'proj' : 'act'}>
              {hover.isProjection ? 'Model projection' : 'Enrolled'}
            </span>
            <strong>
              {hover.cumulative != null ? Math.round(hover.cumulative) : '—'}
            </strong>
          </div>
          {!hover.isProjection && (
            <div className="tt-row muted">
              <span>That day</span>
              <span>{hover.daily}</span>
            </div>
          )}
          {hover.compares?.map((c) => (
            <div className="tt-row" key={c.id}>
              <span style={{ color: c.color }}>{c.name}</span>
              <span>{Math.round(c.cumulative)}</span>
            </div>
          ))}
        </div>
      )}

      {projection.length > 0 && (
        <div className="proj-legend">
          <span className="swatch actual" style={{ background: accent }} /> Actual
          <span className="swatch proj" style={{ background: projectionColor }} /> Model projection
          <span className="proj-note">not a forecast guarantee</span>
        </div>
      )}
    </div>
  )
}
