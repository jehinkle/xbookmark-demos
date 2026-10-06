import { useMemo, useState } from 'react'
import EnrollmentChart from './components/EnrollmentChart'
import {
  PROJECTION_HORIZONS,
  SERIES,
  SITES,
  STUDY,
  TIME_RANGES,
  formatDateShort,
  projectEnrollment,
  sliceByRange,
} from './data/mockEnrollment'
import './App.css'

const REAL_SITES = SITES.filter((s) => s.id !== 'all')

export default function App() {
  const [rangeId, setRangeId] = useState('max')
  const [siteId, setSiteId] = useState('all')
  const [compareIds, setCompareIds] = useState([]) // up to 3 site ids
  const [compareOpen, setCompareOpen] = useState(false)
  const [indicatorsOpen, setIndicatorsOpen] = useState(false)
  const [showTarget, setShowTarget] = useState(true)
  const [showWeeklyRate, setShowWeeklyRate] = useState(false)
  const [horizonId, setHorizonId] = useState('3m')
  const [watchlist, setWatchlist] = useState(false)

  const horizon = PROJECTION_HORIZONS.find((h) => h.id === horizonId) || PROJECTION_HORIZONS[2]
  const site = SITES.find((s) => s.id === siteId) || SITES[0]

  const projection = useMemo(
    () =>
      projectEnrollment({
        daily: SERIES.daily,
        siteId,
        horizonDays: horizon.days,
      }),
    [siteId, horizon.days],
  )

  const actualFull = useMemo(() => {
    return SERIES.daily.map((p) => ({
      date: p.date,
      cumulative: p.cumulative[siteId] ?? 0,
      daily: p.daily[siteId] ?? 0,
    }))
  }, [siteId])

  const actual = useMemo(() => {
    const dates = new Set(
      sliceByRange(SERIES.daily, rangeId, SERIES.lastEnrollDate).map((p) => p.date),
    )
    return actualFull.filter((p) => dates.has(p.date))
  }, [actualFull, rangeId])

  // Projection only shown on broader ranges (not ultra-short that wouldn't include future)
  const showProjection = rangeId !== '7d'

  const projForChart = useMemo(() => {
    if (!showProjection) return []
    return projection.points.map((p) => ({
      date: p.date,
      cumulative: p.cumulative,
      daily: p.daily,
    }))
  }, [projection.points, showProjection])

  const compareSeries = useMemo(() => {
    if (!compareIds.length) return []
    const dates = new Set(
      sliceByRange(SERIES.daily, rangeId, SERIES.lastEnrollDate).map((p) => p.date),
    )
    return compareIds.map((id) => {
      const meta = SITES.find((s) => s.id === id)
      const points = SERIES.daily
        .filter((p) => dates.has(p.date))
        .map((p) => ({ date: p.date, cumulative: p.cumulative[id] ?? 0 }))
      return {
        id,
        name: meta?.short || id,
        color: meta?.color || '#aaa',
        points,
      }
    })
  }, [compareIds, rangeId])

  const totalEnrolled = projection.lastCum
  const targetN = projection.siteTarget
  const pctTarget = targetN ? (totalEnrolled / targetN) * 100 : 0

  // Delta vs prior period of same length ending at last enrollment
  const priorDelta = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.id === rangeId)
    if (!actualFull.length) return { delta: 0, pct: 0 }
    const last = actualFull[actualFull.length - 1].cumulative
    let lookback = range?.days || 30
    if (rangeId === 'max' || rangeId === 'ytd') lookback = 30
    const idx = Math.max(0, actualFull.length - 1 - lookback)
    const prev = actualFull[idx].cumulative
    const delta = last - prev
    const pct = prev > 0 ? (delta / prev) * 100 : 0
    return { delta, pct, lookback }
  }, [actualFull, rangeId])

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const accent = site.color || '#00e676'

  return (
    <div className="desk">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ◈
          </span>
          <div className="brand-text">
            <span className="brand-name">EnrollmentPulse</span>
            <span className="brand-sub">Demo Lab · clinical enrollment</span>
          </div>
        </div>

        <div className="study-meta">
          <span className="study-id">{STUDY.id}</span>
          <span className="study-phase">{STUDY.phase}</span>
          <span className="study-ind">{STUDY.indication}</span>
        </div>

        <button
          type="button"
          className={`add-list ${watchlist ? 'on' : ''}`}
          onClick={() => setWatchlist((v) => !v)}
        >
          {watchlist ? '✓ On list' : '+ Add to list'}
        </button>
      </header>

      <section className="quote-header">
        <div className="quote-left">
          <div className="sym-row">
            <h1 className="sym-name">{site.name === 'All sites' ? STUDY.name : site.short}</h1>
            <span className="sym-site-tag">{site.id === 'all' ? 'All sites' : `Site ${site.id}`}</span>
          </div>
          <div className="price-row">
            <span className="price">{totalEnrolled}</span>
            <span className="price-unit">enrolled</span>
            <span className={`chg ${priorDelta.delta >= 0 ? 'up' : 'down'}`}>
              {priorDelta.delta >= 0 ? '▲' : '▼'} {priorDelta.pct >= 0 ? '+' : ''}
              {priorDelta.pct.toFixed(2)}% (+{priorDelta.delta})
              <span className="chg-span">
                {' '}
                vs prior {priorDelta.lookback}D
              </span>
            </span>
          </div>
          <div className="meta-line">
            Last enrollment {formatDateShort(SERIES.lastEnrollDate)} · Target N {targetN} ·{' '}
            {pctTarget.toFixed(1)}% of target · USD mock
          </div>
        </div>

        <div className="quote-right">
          <div className="after-hours">
            <div className="ah-label">
              <span className="moon" aria-hidden>
                ✦
              </span>{' '}
              Model projection
            </div>
            <div className="ah-row">
              <span className="ah-price">
                {projForChart.length
                  ? Math.round(projForChart[projForChart.length - 1].cumulative)
                  : '—'}
              </span>
              <span className="ah-chg up">
                {projForChart.length
                  ? `→ ${formatDateShort(projection.projectedTargetDate)} @ target`
                  : '—'}
              </span>
            </div>
            <div className="ah-sub">
              Weekly rate ≈ {projection.weeklyRate.toFixed(1)} / wk · horizon {horizon.label}
            </div>
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="tb-group">
          <button type="button" className="tb-btn on" title="Area chart">
            <span className="tb-ico">▣</span> Area
          </button>
          <div className="tb-dropdown-wrap">
            <button
              type="button"
              className={`tb-btn ${compareOpen || compareIds.length ? 'on' : ''}`}
              onClick={() => {
                setCompareOpen((v) => !v)
                setIndicatorsOpen(false)
              }}
            >
              <span className="tb-ico">〰</span> Compare
              {compareIds.length > 0 && <span className="tb-count">{compareIds.length}</span>}
            </button>
            {compareOpen && (
              <div className="tb-menu">
                <div className="tb-menu-title">Overlay sites (max 3)</div>
                {REAL_SITES.map((s) => (
                  <label key={s.id} className="tb-check">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(s.id)}
                      onChange={() => toggleCompare(s.id)}
                    />
                    <span className="dot" style={{ background: s.color }} />
                    {s.short}
                  </label>
                ))}
                {compareIds.length > 0 && (
                  <button
                    type="button"
                    className="tb-clear"
                    onClick={() => setCompareIds([])}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="tb-dropdown-wrap">
            <button
              type="button"
              className={`tb-btn ${indicatorsOpen || showTarget || showWeeklyRate ? 'on' : ''}`}
              onClick={() => {
                setIndicatorsOpen((v) => !v)
                setCompareOpen(false)
              }}
            >
              <span className="tb-ico">▥</span> Indicators
            </button>
            {indicatorsOpen && (
              <div className="tb-menu">
                <label className="tb-check">
                  <input
                    type="checkbox"
                    checked={showTarget}
                    onChange={(e) => setShowTarget(e.target.checked)}
                  />
                  Target N line
                </label>
                <label className="tb-check">
                  <input
                    type="checkbox"
                    checked={showWeeklyRate}
                    onChange={(e) => setShowWeeklyRate(e.target.checked)}
                  />
                  Weekly rate badge
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="tb-group site-filter">
          <span className="tb-label">Site</span>
          <select
            className="site-select"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            aria-label="Filter by clinical site"
          >
            {SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === 'all' ? 'All sites' : `${s.id} · ${s.short}`}
              </option>
            ))}
          </select>
          <div className="site-chips">
            <button
              type="button"
              className={`chip-btn ${siteId === 'all' ? 'on' : ''}`}
              onClick={() => setSiteId('all')}
            >
              All
            </button>
            {REAL_SITES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip-btn ${siteId === s.id ? 'on' : ''}`}
                style={siteId === s.id ? { borderColor: s.color, color: s.color } : undefined}
                onClick={() => setSiteId(s.id)}
                title={s.name}
              >
                {s.short}
              </button>
            ))}
          </div>
        </div>

        <div className="tb-group horizon-group">
          <span className="tb-label">Projection</span>
          <select
            className="horizon-select"
            value={horizonId}
            onChange={(e) => setHorizonId(e.target.value)}
            aria-label="Projection horizon"
          >
            {PROJECTION_HORIZONS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <main className="chart-stage">
        <EnrollmentChart
          actual={actual}
          projection={projForChart}
          compareSeries={compareSeries}
          targetN={showTarget ? targetN : null}
          targetLabel={siteId === 'all' ? 'Target N' : 'Site target'}
          showTarget={showTarget}
          showWeeklyRate={showWeeklyRate}
          weeklyRate={projection.weeklyRate}
          accent={accent}
        />
      </main>

      <footer className="bottombar">
        <div className="range-chips">
          {TIME_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`range-btn ${rangeId === r.id ? 'on' : ''}`}
              onClick={() => setRangeId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="footer-stats">
          <span>
            <strong>{totalEnrolled}</strong> / {targetN} ({pctTarget.toFixed(0)}%)
          </span>
          <span className="sep">·</span>
          <span>Last pt {formatDateShort(SERIES.lastEnrollDate)}</span>
          <span className="sep">·</span>
          <span>≈ {projection.weeklyRate.toFixed(1)}/wk</span>
          <span className="sep">·</span>
          <span>
            Model ETA {formatDateShort(projection.projectedTargetDate)}
          </span>
        </div>
        <div className="disclaimer">
          Synthetic seeded data · model projection is illustrative, not a forecast guarantee
        </div>
      </footer>
    </div>
  )
}
