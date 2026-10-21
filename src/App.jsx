import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { STATES } from './states'

const COLS = [
  { key: 'earn', label: 'YOUR PROSPECTS', sub: 'median earnings*', icon: '💵', better: 'high', fmt: v => '$' + v.toLocaleString() , tip: 'ACS 2019–23 5-yr median earnings, workers 16+ with earnings (B20002)' },
  { key: 'childPov', label: "KIDS' START", sub: 'child poverty (0–17)', icon: '🧸', better: 'low', fmt: v => v.toFixed(1) + '% of kids in poverty', tip: 'Census SAIPE 2023, poverty rate ages 0–17' },
  { key: 'kfr', label: 'MOBILITY', sub: 'low-income kids', icon: '🪜', better: 'high', fmt: v => 'adult income rank ' + v.toFixed(1) + ' (pctile)', tip: 'Opportunity Atlas kfr_pooled_pooled_p25: mean adult income percentile of kids from 25th-pctile families' },
  { key: 'jobGrowth', label: 'JOB GROWTH', sub: '5-yr % change', icon: '📈', better: 'high', fmt: v => (v > 0 ? '+' : '') + v.toFixed(1) + '% jobs 2019→2024', tip: 'BLS QCEW annual avg employment, all ownerships, 2019→2024' },
]

function rankBy(list, key, better) {
  const s = [...list].sort((a, b) => better === 'high' ? b[key] - a[key] : a[key] - b[key])
  const r = {}; let prev = null, pr = 0
  s.forEach((c, i) => { if (c[key] !== prev) pr = i + 1; prev = c[key]; r[c.fips] = pr })
  return r
}
// green (#1) → yellow → red (#N)
function heat(rank, n) {
  const t = (rank - 1) / Math.max(1, n - 1)
  const stops = [[22, 163, 74], [132, 204, 22], [234, 179, 8], [249, 115, 22], [220, 38, 38]]
  const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f))
  return `rgb(${c})`
}

export default function App() {
  const [abbr, setAbbr] = useState('TN')
  const [sort, setSortS] = useState('avg')
  const [dir, setDir] = useState(1)
  const setSort = k => { if (k === sort) setDir(d => -d); else { setSortS(k); setDir(1) } }
  const arrow = k => sort === k ? (dir === 1 ? ' ▲' : ' ▼') : ''
  const [tip, setTip] = useState(null)
  const [hov, setHov] = useState(null)
  const [mapBy, setMapBy] = useState('overall')
  const [mtip, setMtip] = useState(null)
  const [flash, setFlash] = useState(null)
  const mapRef = useRef(null)
  const posterRef = useRef(null)
  const { raw, map } = STATES[abbr]

  const rows = useMemo(() => {
    const list = raw.counties
    const ranks = Object.fromEntries(COLS.map(c => [c.key, rankBy(list, c.key, c.better)]))
    const r = list.map(c => {
      const rk = Object.fromEntries(COLS.map(col => [col.key, ranks[col.key][c.fips]]))
      return { ...c, rk, avg: COLS.reduce((s, col) => s + rk[col.key], 0) / COLS.length }
    })
    r.sort((a, b) => a.avg - b.avg || a.name.localeCompare(b.name))
    r.forEach((c, i) => (c.overall = i + 1))
    return r
  }, [raw])
  const n = rows.length
  const shown = useMemo(() => [...rows].sort((a, b) => dir * (sort === 'avg' ? a.overall - b.overall : sort === 'name' ? a.name.localeCompare(b.name) : (a.rk[sort] - b.rk[sort] || a.overall - b.overall))), [rows, sort, dir])
  const last = rows[n - 1]
  const mapRank = c => mapBy === 'overall' ? c.overall : c.rk[mapBy]
  const mapLabel = mapBy === 'overall' ? 'overall rank' : COLS.find(c => c.key === mapBy).label.toLowerCase()
  const goRow = c => {
    const el = document.getElementById('row-' + c.fips)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setFlash(c.fips); setTimeout(() => setFlash(f => f === c.fips ? null : f), 2200) }
  }
  const downloadMap = async () => {
    const url = await toPng(mapRef.current, { pixelRatio: 2, backgroundColor: '#0b1530' })
    const a = document.createElement('a'); a.href = url; a.download = `${abbr}-county-futures-map.png`; a.click()
  }

  const download = async () => {
    const url = await toPng(posterRef.current, { pixelRatio: 2, backgroundColor: '#0b1530' })
    const a = document.createElement('a'); a.href = url; a.download = `${abbr}-county-futures.png`; a.click()
  }

  return (
    <div className="page">
      <div className="toolbar">
        <label>State <select value={abbr} onChange={e => setAbbr(e.target.value)}>{Object.keys(STATES).map(s => <option key={s}>{s}</option>)}</select></label>
        <span className="hint">Click a column header to re-sort · hover a chip for the value</span>
        <button onClick={downloadMap}>⬇ Map PNG</button>
        <button onClick={download}>⬇ Poster PNG</button>
      </div>
      <div className="poster" ref={posterRef}>
        <header className="hero">
          <svg className="sun" viewBox="0 0 800 260" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a1f5c" /><stop offset=".55" stopColor="#b8456b" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
              <radialGradient id="sunG"><stop offset="0" stopColor="#fff7c2" /><stop offset=".6" stopColor="#fbbf24" /><stop offset="1" stopColor="#f97316" stopOpacity="0" /></radialGradient>
            </defs>
            <rect width="800" height="260" fill="url(#sky)" />
            <circle cx="620" cy="235" r="120" fill="url(#sunG)" />
            {Array.from({ length: 14 }, (_, i) => <line key={i} x1="620" y1="235" x2={620 + 400 * Math.cos(Math.PI + i * Math.PI / 13)} y2={235 + 400 * Math.sin(Math.PI + i * Math.PI / 13)} stroke="#fde68a" strokeOpacity=".12" strokeWidth="10" />)}
            <path d="M0 230 Q120 180 240 215 T480 205 T800 220 V260 H0Z" fill="#3b1d4a" />
            <path d="M0 245 Q160 215 330 240 T800 238 V260 H0Z" fill="#0b1530" />
          </svg>
          <div className="title">
            <div className="kicker">{raw.state.toUpperCase()} COUNTIES RANKED FROM</div>
            <h1>BRIGHT FUTURES</h1>
            <h2>TO BROKE FOREVER</h2>
            <div className="tags">PAY · KIDS' START · MOBILITY · JOB GROWTH</div>
          </div>
          <svg className="mini" viewBox={`0 0 ${map.w} ${map.h}`}>
            {rows.map(c => <path key={c.fips} d={map.paths[c.fips]} fill={heat(c.overall, n)} stroke="#0b1530" strokeWidth=".6"
              onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, t: `${c.name}: #${c.overall} overall (avg ${c.avg.toFixed(1)})` })} onMouseLeave={() => setTip(null)} />)}
          </svg>
        </header>

        <section className="mapsec" ref={mapRef}>
          <div className="maphead">
            <div><b>{raw.state.toUpperCase()} AT A GLANCE</b><span> · counties shaded by {mapLabel}</span></div>
            <label>Color by <select value={mapBy} onChange={e => setMapBy(e.target.value)}>
              <option value="overall">Overall rank</option>
              {COLS.map(c => <option key={c.key} value={c.key}>{c.label.charAt(0) + c.label.slice(1).toLowerCase()}</option>)}
            </select></label>
          </div>
          <svg className="bigmap" viewBox={`0 0 ${map.w} ${map.h}`} onMouseLeave={() => { setHov(null); setMtip(null) }}>
            {rows.map(c => <path key={c.fips} d={map.paths[c.fips]} fill={heat(mapRank(c), n)} stroke="#0b1530" strokeWidth=".35" style={{ cursor: 'pointer' }}
              onMouseMove={e => { setHov(c.fips); setMtip({ x: e.clientX, y: e.clientY, c }) }}
              onClick={e => { setHov(c.fips); setMtip({ x: e.clientX, y: e.clientY, c }); goRow(c) }} />)}
            {hov && map.paths[hov] && <path d={map.paths[hov]} fill="none" stroke="#fff" strokeWidth="1.1" pointerEvents="none" />}
          </svg>
          <div className="mlegend"><span>#1 best</span><div className="bar" style={{ background: `linear-gradient(90deg,${[1, 24, 48, 72, n].map(r => heat(r, n)).join(',')})` }} /><span>#{n} worst</span></div>
          <div className="mnote">Hover a county for its component ranks · click to jump to its row</div>
        </section>

        <table>
          <thead>
            <tr>
              <th className="nm"><span className={'sk' + (sort === 'avg' ? ' on' : '')} onClick={() => setSort('avg')} title="Sort by overall rank">RANK{arrow('avg')}</span> · <span className={'sk' + (sort === 'name' ? ' on' : '')} onClick={() => setSort('name')} title="Sort by county name">COUNTY{arrow('name')}</span></th>
              {COLS.map(c => <th key={c.key} onClick={() => setSort(c.key)} className={sort === c.key ? 'on' : ''} title={c.tip}>
                <div className="ic">{c.icon}</div>{c.label}{arrow(c.key)}<small>{c.sub}</small><small className="b">#1 = best</small></th>)}
              <th onClick={() => setSort('avg')} className={sort === 'avg' ? 'on' : ''}><div className="ic">⭐</div>AVG RANK{arrow('avg')}<small>of 4 columns</small><small className="b">lower = better</small></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(c => {
              const cls = c.overall <= 3 ? 'top' : c.overall > n - 3 ? 'bot' : ''
              return (
                <tr key={c.fips} id={'row-' + c.fips} className={cls + (hov === c.fips ? ' hov' : '') + (flash === c.fips ? ' flash' : '')}
                  onMouseEnter={() => setHov(c.fips)} onMouseLeave={() => setHov(h => h === c.fips ? null : h)}>
                  <td className="nm"><span className="ov">{c.overall}.</span> {c.name}
                    {cls === 'top' && <span className="tag rise">RISING</span>}{cls === 'bot' && <span className="tag stall">STALLED</span>}</td>
                  {COLS.map(col => <td key={col.key}><span className="chip" style={{ background: heat(c.rk[col.key], n) }}
                    onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, t: `${c.name} — ${col.fmt(c[col.key])}` })}
                    onClick={e => setTip({ x: e.clientX, y: e.clientY, t: `${c.name} — ${col.fmt(c[col.key])}` })}
                    onMouseLeave={() => setTip(null)}>#{c.rk[col.key]}</span></td>)}
                  <td><span className="avgc" style={{ background: heat(c.overall, n) }}>{c.avg.toFixed(1)}</span></td>
                </tr>)
            })}
          </tbody>
        </table>

        <footer>
          <div className="couch"><span className="big">BACK ON MOM'S COUCH: #{n}</span><span>{last.name} County</span></div>
          <div className="legend">Green = sunrise &nbsp;|&nbsp; red = still waiting on a paycheck</div>
          <div className="notes">
            Cells = rank among {raw.state}'s {n} counties (1 = best); ties share best rank. Avg = mean of 4 ranks.<br />
            *Prospects: ACS 2019–2023 5-year median earnings, workers 16+ with earnings (table B20002) — all ages, <b>not</b> age 25–34, and <b>not</b> cost-of-living adjusted (BEA RPPs are not published per county).<br />
            Kids' start: Census SAIPE 2023 poverty rate, ages 0–17 (lower = better). Mobility: Opportunity Atlas, mean adult income percentile of children born 1978–83 to 25th-percentile parents (kfr_pooled_pooled_p25).<br />
            Job growth: BLS QCEW annual average employment, all ownerships, 2019→2024 (2024 may be revised). Every value is real public data fetched at build time — no synthetic numbers.
          </div>
        </footer>
      </div>
      {mtip && <div className="mtip" style={{ left: Math.min(mtip.x + 14, window.innerWidth - 300), top: Math.min(mtip.y + 14, window.innerHeight - 230) }}>
        <div className="mt-h"><b>{mtip.c.name} County</b><span className="chip" style={{ background: heat(mtip.c.overall, n) }}>#{mtip.c.overall}/{n}</span></div>
        <div className="mt-s">Overall rank · avg rank {mtip.c.avg.toFixed(1)}</div>
        {COLS.map(col => <div key={col.key} className="mt-r"><span className="chip sm" style={{ background: heat(mtip.c.rk[col.key], n) }}>#{mtip.c.rk[col.key]}/{n}</span>
          <div><b>{col.icon} {col.label.charAt(0) + col.label.slice(1).toLowerCase()}</b><small>{col.fmt(mtip.c[col.key])}</small></div></div>)}
      </div>}
      {tip && <div className="tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>{tip.t}</div>}
    </div>
  )
}
