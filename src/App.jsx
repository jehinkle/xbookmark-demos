import { useMemo, useState } from 'react'
import LabChart from './components/LabChart'
import {
  ANALYTES,
  SUBJECTS,
  STUDY,
  TIME_RANGES,
  VISITS,
  deltaPct,
  getAnalyte,
  lastValue,
  searchSymbols,
  seriesFor,
} from './data/mockLabs'
import './App.css'

const DEFAULT_SUBJECT = SUBJECTS[0].id
const DEFAULT_ANALYTE = 'ALT'

function WatchRow({ subjectId, analyteId, active, onClick }) {
  const last = lastValue(subjectId, analyteId)
  const d = deltaPct(subjectId, analyteId)
  const analyte = getAnalyte(analyteId)
  const up = d >= 0
  return (
    <button
      type="button"
      className={`wl-row ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="wl-sym">
        <span className="wl-id">{subjectId}</span>
        <span className="wl-an">{analyteId}</span>
      </div>
      <div className="wl-quote">
        <span className="wl-last">{last ? last.value : '—'}</span>
        <span className={`wl-chg ${up ? 'up' : 'down'}`}>
          {up ? '+' : ''}
          {d.toFixed(1)}%
        </span>
      </div>
      <div className="wl-unit">{analyte?.unit}</div>
    </button>
  )
}

export default function App() {
  const [subjectId, setSubjectId] = useState(DEFAULT_SUBJECT)
  const [analyteId, setAnalyteId] = useState(DEFAULT_ANALYTE)
  const [overlayId, setOverlayId] = useState(null) // another analyte
  const [showRefRange, setShowRefRange] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [rangeId, setRangeId] = useState('scr-w12')
  const [chartType, setChartType] = useState('line') // line | markers
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [mode, setMode] = useState('subject') // subject watchlist vs analyte watchlist

  const analyte = getAnalyte(analyteId)
  const overlayAnalyte = overlayId ? getAnalyte(overlayId) : null
  const subject = SUBJECTS.find((s) => s.id === subjectId)

  const range = TIME_RANGES.find((r) => r.id === rangeId) || TIME_RANGES[0]

  const series = useMemo(() => {
    const pts = seriesFor(subjectId, analyteId)
    if (rangeId === 'last4') return pts.slice(-4)
    const r = TIME_RANGES.find((x) => x.id === rangeId)
    if (r?.filter) return pts.filter((p) => r.filter({ day: p.day }))
    return pts
  }, [subjectId, analyteId, rangeId])

  const overlaySeries = useMemo(() => {
    if (!overlayId) return []
    const pts = seriesFor(subjectId, overlayId)
    if (rangeId === 'last4') return pts.slice(-4)
    const r = TIME_RANGES.find((x) => x.id === rangeId)
    if (r?.filter) return pts.filter((p) => r.filter({ day: p.day }))
    return pts
  }, [subjectId, overlayId, rangeId])

  const results = useMemo(() => searchSymbols(query), [query])

  const pickSymbol = (item) => {
    if (item.kind === 'subject') {
      setSubjectId(item.id)
      setMode('subject')
    } else {
      setAnalyteId(item.id)
      setMode('analyte')
    }
    setSearchOpen(false)
    setQuery('')
  }

  const last = series.length ? series[series.length - 1] : null
  const first = series.length ? series[0] : null
  const chg =
    first && last && first.value
      ? ((last.value - first.value) / first.value) * 100
      : 0

  // Watchlist rows: either subjects for current analyte, or analytes for current subject
  const watchItems =
    mode === 'subject'
      ? SUBJECTS.map((s) => ({ subjectId: s.id, analyteId }))
      : ANALYTES.map((a) => ({ subjectId, analyteId: a.id }))

  return (
    <div className="desk">
      {/* Top symbol strip */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">LabCharts</span>
          <span className="brand-sub">Demo Lab</span>
        </div>

        <div className="symbol-strip">
          <button
            type="button"
            className="sym-btn"
            onClick={() => setSearchOpen((v) => !v)}
            title="Search subject or analyte"
          >
            <span className="sym-ticker">{subjectId}</span>
            <span className="sym-sep">/</span>
            <span className="sym-analyte">{analyteId}</span>
            <span className="sym-name">{analyte?.name}</span>
          </button>
          {last && (
            <div className="sym-quote">
              <span className="sym-last">{last.value}</span>
              <span className="sym-unit">{analyte?.unit}</span>
              <span className={`sym-chg ${chg >= 0 ? 'up' : 'down'}`}>
                {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
              </span>
              <span className="sym-span">vs {first?.visitId}</span>
            </div>
          )}
          {subject && (
            <div className="sym-meta">
              {subject.arm} · {subject.sex}/{subject.age}y · Site {subject.site}
            </div>
          )}
        </div>

        <div className="study-pill">{STUDY.id}</div>
      </header>

      {searchOpen && (
        <div className="search-panel">
          <input
            autoFocus
            className="search-input"
            placeholder="Search Subject ID or analyte (ALT, AST, CREAT…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchOpen(false)
              if (e.key === 'Enter' && results[0]) pickSymbol(results[0])
            }}
          />
          <ul className="search-list">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button type="button" onClick={() => pickSymbol(r)}>
                  <span className={`chip ${r.kind}`}>{r.kind === 'subject' ? 'SUBJ' : 'LAB'}</span>
                  <span className="sr-label">{r.label}</span>
                  <span className="sr-sub">{r.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="tb-group">
          <span className="tb-label">Range</span>
          {TIME_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`chip-btn ${rangeId === r.id ? 'on' : ''}`}
              onClick={() => setRangeId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="tb-group">
          <span className="tb-label">Chart</span>
          <button
            type="button"
            className={`chip-btn ${chartType === 'line' ? 'on' : ''}`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
          <button
            type="button"
            className={`chip-btn ${chartType === 'markers' ? 'on' : ''}`}
            onClick={() => setChartType('markers')}
            title="Emphasize visit markers"
          >
            Markers
          </button>
        </div>

        <div className="tb-group">
          <span className="tb-label">Overlays</span>
          <button
            type="button"
            className={`chip-btn ${showRefRange ? 'on' : ''}`}
            onClick={() => setShowRefRange((v) => !v)}
          >
            Ref range
          </button>
          <button
            type="button"
            className={`chip-btn ${showVolume ? 'on' : ''}`}
            onClick={() => setShowVolume((v) => !v)}
          >
            Samples
          </button>
          <select
            className="overlay-select"
            value={overlayId || ''}
            onChange={(e) => setOverlayId(e.target.value || null)}
            title="Overlay another analyte"
          >
            <option value="">No overlay</option>
            {ANALYTES.filter((a) => a.id !== analyteId).map((a) => (
              <option key={a.id} value={a.id}>
                + {a.id}
              </option>
            ))}
          </select>
        </div>

        <div className="tb-hint">
          Crosshair · hover visits · ▲ dose · AE markers on spikes
        </div>
      </div>

      <div className="workspace">
        <aside className="watchlist">
          <div className="wl-head">
            <button
              type="button"
              className={mode === 'subject' ? 'on' : ''}
              onClick={() => setMode('subject')}
            >
              Subjects
            </button>
            <button
              type="button"
              className={mode === 'analyte' ? 'on' : ''}
              onClick={() => setMode('analyte')}
            >
              Analytes
            </button>
          </div>
          <div className="wl-body">
            {watchItems.map((item) => (
              <WatchRow
                key={`${item.subjectId}-${item.analyteId}`}
                subjectId={item.subjectId}
                analyteId={item.analyteId}
                active={item.subjectId === subjectId && item.analyteId === analyteId}
                onClick={() => {
                  setSubjectId(item.subjectId)
                  setAnalyteId(item.analyteId)
                }}
              />
            ))}
          </div>
          <div className="wl-foot">
            Mock · seed 20260928 · {VISITS.length} visits · {SUBJECTS.length} subjects
          </div>
        </aside>

        <main className={`chart-pane ${chartType}`}>
          <LabChart
            series={series}
            overlaySeries={overlaySeries}
            analyte={analyte}
            overlayAnalyte={overlayAnalyte}
            showRefRange={showRefRange}
            showVolume={showVolume}
            subjectId={subjectId}
            timeRangeLabel={range.label}
          />
        </main>
      </div>

      <footer className="statusbar">
        <span>{STUDY.title}</span>
        <span className="sep">|</span>
        <span>{STUDY.phase}</span>
        <span className="sep">|</span>
        <span>{STUDY.indication}</span>
        <span className="sep">|</span>
        <span className="muted">Synthetic data only — not for clinical use</span>
      </footer>
    </div>
  )
}
