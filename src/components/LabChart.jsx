import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PAD = { top: 28, right: 64, bottom: 28, left: 16 }
const VOL_H = 72
const GAP = 10

function niceDomain(min, max, padFrac = 0.12) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1
    return [min - d, max + d]
  }
  const span = max - min
  const pad = span * padFrac
  return [min - pad, max + pad]
}

function formatVal(v, unit) {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return `${v.toFixed(digits)}${unit ? ` ${unit}` : ''}`
}

export default function LabChart({
  series,
  overlaySeries,
  analyte,
  overlayAnalyte,
  showRefRange,
  showVolume,
  subjectId,
  timeRangeLabel,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 480 })
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.max(320, width), h: Math.max(280, height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chartH = showVolume ? size.h - VOL_H - GAP : size.h
  const plotW = size.w - PAD.left - PAD.right
  const plotH = chartH - PAD.top - PAD.bottom

  const layout = useMemo(() => {
    const n = series.length
    if (!n) return null

    const xs = series.map((_, i) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW))

    const vals = series.map((p) => p.value)
    const ovals = overlaySeries?.length ? overlaySeries.map((p) => p.value) : []
    let yMin = Math.min(...vals)
    let yMax = Math.max(...vals)
    if (showRefRange && analyte) {
      yMin = Math.min(yMin, analyte.low)
      yMax = Math.max(yMax, analyte.high)
    }
    // Keep overlay on same scale only if similar magnitude; else dual-scale visually by normalizing note
    // We plot overlay on same pixel space but scale independently via separate domain — use primary domain for main,
    // overlay gets its own domain mapped to same plotH (TradingView-ish dual overlay feel).
    const [d0, d1] = niceDomain(yMin, yMax)
    const yScale = (v) => PAD.top + ((d1 - v) / (d1 - d0 || 1)) * plotH

    let oDomain = null
    let oScale = null
    if (ovals.length) {
      oDomain = niceDomain(Math.min(...ovals), Math.max(...ovals))
      oScale = (v) => PAD.top + ((oDomain[1] - v) / (oDomain[1] - oDomain[0] || 1)) * plotH
    }

    const maxVol = Math.max(1, ...series.map((p) => p.sampleCount || 1))
    const volTop = chartH + GAP
    const volScale = (c) => volTop + VOL_H - 8 - (c / maxVol) * (VOL_H - 20)

    const linePath = series
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${yScale(p.value).toFixed(1)}`)
      .join(' ')

    let overlayPath = null
    if (overlaySeries?.length && oScale) {
      overlayPath = overlaySeries
        .map((p, i) => {
          const xi = xs[Math.min(i, xs.length - 1)]
          return `${i === 0 ? 'M' : 'L'}${xi.toFixed(1)},${oScale(p.value).toFixed(1)}`
        })
        .join(' ')
    }

    return {
      xs,
      d0,
      d1,
      yScale,
      oScale,
      oDomain,
      linePath,
      overlayPath,
      maxVol,
      volTop,
      volScale,
      n,
    }
  }, [series, overlaySeries, analyte, showRefRange, plotW, plotH, chartH])

  const onMove = useCallback(
    (e) => {
      if (!layout || !series.length) return
      const rect = wrapRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      let best = 0
      let bestDist = Infinity
      layout.xs.forEach((xi, i) => {
        const d = Math.abs(xi - x)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      setHover(best)
    },
    [layout, series],
  )

  const onLeave = () => setHover(null)

  if (!series.length || !layout) {
    return (
      <div className="chart-empty" ref={wrapRef}>
        No visit data for this selection.
      </div>
    )
  }

  const hi = hover != null ? hover : series.length - 1
  const pt = series[hi]
  const opt = overlaySeries?.[hi]
  const x = layout.xs[hi]

  // Y-axis ticks
  const ticks = 5
  const yTicks = Array.from({ length: ticks }, (_, i) => {
    const t = layout.d0 + ((layout.d1 - layout.d0) * i) / (ticks - 1)
    return t
  })

  return (
    <div className="chart-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="chart-legend">
        <span className="leg-main">
          <i className="swatch main" />
          {subjectId} · {analyte?.id}
          <strong>{formatVal(pt.value, analyte?.unit)}</strong>
          <em>{pt.label}</em>
          {pt.oor && <span className="badge oor">OOR</span>}
        </span>
        {overlayAnalyte && opt && (
          <span className="leg-overlay">
            <i className="swatch ov" />
            {overlayAnalyte.id}
            <strong>{formatVal(opt.value, overlayAnalyte.unit)}</strong>
          </span>
        )}
        <span className="leg-meta">{timeRangeLabel}</span>
      </div>

      <svg width={size.w} height={size.h} className="lab-svg" role="img" aria-label="Lab value chart">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26a69a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#26a69a" stopOpacity="0.02" />
          </linearGradient>
          <pattern id="gridDot" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="#2a2e39" />
          </pattern>
        </defs>

        <rect x={0} y={0} width={size.w} height={chartH} fill="url(#gridDot)" />

        {/* Ref range band */}
        {showRefRange && analyte && (
          <rect
            className="ref-band"
            x={PAD.left}
            y={layout.yScale(analyte.high)}
            width={plotW}
            height={Math.max(2, layout.yScale(analyte.low) - layout.yScale(analyte.high))}
          />
        )}
        {showRefRange && analyte && (
          <>
            <line
              className="ref-line"
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={layout.yScale(analyte.high)}
              y2={layout.yScale(analyte.high)}
            />
            <line
              className="ref-line"
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={layout.yScale(analyte.low)}
              y2={layout.yScale(analyte.low)}
            />
            <text className="ref-label" x={PAD.left + 4} y={layout.yScale(analyte.high) - 4}>
              ULN {analyte.high}
            </text>
            <text className="ref-label" x={PAD.left + 4} y={layout.yScale(analyte.low) + 12}>
              LLN {analyte.low}
            </text>
          </>
        )}

        {/* Grid + Y ticks */}
        {yTicks.map((t, i) => {
          const y = layout.yScale(t)
          return (
            <g key={i}>
              <line className="grid-h" x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} />
              <text className="axis-y" x={size.w - 8} y={y + 3} textAnchor="end">
                {formatVal(t)}
              </text>
            </g>
          )
        })}

        {/* Area under main line */}
        <path
          d={`${layout.linePath} L${layout.xs[layout.n - 1]},${PAD.top + plotH} L${layout.xs[0]},${PAD.top + plotH} Z`}
          fill="url(#areaFill)"
        />

        {/* Main line */}
        <path d={layout.linePath} className="line-main" fill="none" />

        {/* Overlay */}
        {layout.overlayPath && <path d={layout.overlayPath} className="line-overlay" fill="none" />}

        {/* Markers */}
        {series.map((p, i) => {
          const cy = layout.yScale(p.value)
          const cx = layout.xs[i]
          return (
            <g key={p.visitId}>
              <circle
                cx={cx}
                cy={cy}
                r={p.oor ? 5 : 3.5}
                className={p.oor ? 'pt oor' : 'pt'}
              />
              {p.events?.map((ev, ei) => (
                <g key={ei}>
                  <line
                    className={`evt-line ${ev.type}`}
                    x1={cx}
                    x2={cx}
                    y1={PAD.top}
                    y2={PAD.top + plotH}
                  />
                  <polygon
                    className={`evt-mark ${ev.type}`}
                    points={`${cx},${PAD.top + 2} ${cx - 5},${PAD.top + 12} ${cx + 5},${PAD.top + 12}`}
                  />
                </g>
              ))}
              <text className="axis-x" x={cx} y={chartH - 8} textAnchor="middle">
                {p.visitId}
              </text>
            </g>
          )
        })}

        {/* Crosshair */}
        {hover != null && (
          <g className="crosshair">
            <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + plotH} />
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={layout.yScale(pt.value)}
              y2={layout.yScale(pt.value)}
            />
            <circle cx={x} cy={layout.yScale(pt.value)} r={6} className="cross-dot" />
            <rect
              className="cross-tag"
              x={size.w - PAD.right + 2}
              y={layout.yScale(pt.value) - 10}
              width={PAD.right - 6}
              height={18}
              rx={3}
            />
            <text
              className="cross-tag-t"
              x={size.w - 10}
              y={layout.yScale(pt.value) + 3}
              textAnchor="end"
            >
              {formatVal(pt.value)}
            </text>
          </g>
        )}

        {/* Volume / QC pane */}
        {showVolume && (
          <g>
            <rect x={0} y={layout.volTop} width={size.w} height={VOL_H} className="vol-bg" />
            <text className="vol-title" x={PAD.left} y={layout.volTop + 14}>
              Samples / QC density
            </text>
            {series.map((p, i) => {
              const bh = (p.sampleCount / layout.maxVol) * (VOL_H - 28)
              const bx = layout.xs[i]
              const by = layout.volTop + VOL_H - 10 - bh
              const barW = Math.max(6, plotW / series.length / 2.2)
              return (
                <rect
                  key={p.visitId}
                  className={p.qcFlag ? 'vol-bar qc' : 'vol-bar'}
                  x={bx - barW / 2}
                  y={by}
                  width={barW}
                  height={Math.max(2, bh)}
                  rx={1}
                />
              )
            })}
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className="tooltip"
          style={{
            left: Math.min(size.w - 180, Math.max(8, x + 12)),
            top: Math.max(8, layout.yScale(pt.value) - 48),
          }}
        >
          <div className="tt-day">
            Study day {pt.day >= 0 ? `+${pt.day}` : pt.day} · {pt.label}
          </div>
          <div>
            {analyte?.id}: <b>{formatVal(pt.value, analyte?.unit)}</b>
            {pt.oor && <span className="badge oor"> out of range</span>}
          </div>
          {opt && overlayAnalyte && (
            <div>
              {overlayAnalyte.id}: <b>{formatVal(opt.value, overlayAnalyte.unit)}</b>
            </div>
          )}
          {pt.events?.map((ev, i) => (
            <div key={i} className={`tt-ev ${ev.type}`}>
              ● {ev.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
