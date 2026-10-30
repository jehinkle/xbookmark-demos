import { useMemo, useState } from 'react'
import { makeADTTE, km, at, atRisk, logrank, ARMS, PARAMS } from './km.js'

const DATA = makeADTTE()
const COLORS = ['#64748b', '#d9480f']
const f1 = v => v == null ? 'NE' : v.toFixed(1)
const pct = v => (v * 100).toFixed(1)

export default function App() {
  const [shell, setShell] = useState({ param: 'OS', arms: [...ARMS], landmarks: '6, 12, 18, 24', tableNo: '14.2.1.1', figNo: '14.2.1.2',
    title: 'Kaplan-Meier Estimates of {PARAM}', pop: 'Intent-to-Treat Population', bands: true, logrank: true, step: 3,
    foot: 'Median and 95% CI by Brookmeyer-Crowley with log-log transform. Survival CIs by Greenwood variance, log-log transform.\nHR is the log-rank (Peto) approximation, treated vs placebo; p-value is two-sided unstratified log-rank.' })
  const [tab, setTab] = useState('table'), [q, setQ] = useState('')
  const set = (k, v) => setShell(s => ({ ...s, [k]: v }))
  const rows = useMemo(() => DATA.filter(r => r.PARAMCD === shell.param), [shell.param])
  const arms = shell.arms.map((a, i) => ({ a, i: ARMS.indexOf(a), rows: rows.filter(r => r.TRT01P === a) }))
  const fits = arms.map(x => ({ ...x, k: km(x.rows) }))
  const lms = shell.landmarks.split(/[,\s]+/).map(Number).filter(n => n > 0).sort((a, b) => a - b)
  const lr = fits.length === 2 && shell.logrank ? logrank(fits[0].rows, fits[1].rows) : null
  const title = shell.title.replace('{PARAM}', PARAMS[shell.param])
  const header = (no, kind) => <div className="hdr"><div className="meta"><span>Protocol XNB-301 (MOCK)</span><span>Page 1 of 1</span></div>
    <b>{kind} {no}</b><b>{title}</b><span>{shell.pop}</span></div>
  const footer = <div className="foot">{shell.foot.split('\n').map((l, i) => <div key={i}>{l}</div>)}<div>Source: ADTTE (mock, seeded). Data cutoff 30JUN2026. Program: t_km.R · Generated {new Date().toISOString().slice(0, 10)}</div></div>

  return <div className="app">
    <header><h1>TFL Shell Studio</h1><span className="mock">ALL DATA MOCK · not a real study</span>
      <p>Edit the shell on the left — the ADTTE-driven KM table and figure re-derive live from the {DATA.length} mock ADTTE records.</p></header>
    <div className="cols">
      <aside>
        <h3>Shell spec</h3>
        <label>Parameter (PARAMCD)<select value={shell.param} onChange={e => set('param', e.target.value)}>{Object.keys(PARAMS).map(p => <option key={p}>{p}</option>)}</select></label>
        <fieldset><legend>Arms (TRT01P), order = columns</legend>{ARMS.map(a => <label key={a} className="ck"><input type="checkbox" checked={shell.arms.includes(a)}
          onChange={e => set('arms', e.target.checked ? ARMS.filter(x => x === a || shell.arms.includes(x)) : shell.arms.filter(x => x !== a))} />{a}</label>)}
          {shell.arms.length === 2 && <button onClick={() => set('arms', [...shell.arms].reverse())}>Swap order</button>}</fieldset>
        <label>Landmark times (months)<input value={shell.landmarks} onChange={e => set('landmarks', e.target.value)} /></label>
        <label>Title template<input value={shell.title} onChange={e => set('title', e.target.value)} /></label>
        <label>Population<input value={shell.pop} onChange={e => set('pop', e.target.value)} /></label>
        <div className="two"><label>Table no.<input value={shell.tableNo} onChange={e => set('tableNo', e.target.value)} /></label>
          <label>Figure no.<input value={shell.figNo} onChange={e => set('figNo', e.target.value)} /></label></div>
        <label>Footnotes<textarea rows={5} value={shell.foot} onChange={e => set('foot', e.target.value)} /></label>
        <label className="ck"><input type="checkbox" checked={shell.bands} onChange={e => set('bands', e.target.checked)} />95% CI bands on plot</label>
        <label className="ck"><input type="checkbox" checked={shell.logrank} onChange={e => set('logrank', e.target.checked)} />Log-rank p and HR</label>
        <label>At-risk interval (months)<input type="number" min="1" value={shell.step} onChange={e => set('step', Math.max(1, +e.target.value || 3))} /></label>
      </aside>
      <main>
        <nav>{[['table', 'KM estimate table'], ['plot', 'KM plot'], ['data', 'ADTTE data'], ['code', 'R snippet']].map(([k, l]) =>
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav>
        {!fits.length ? <p className="page">Select at least one arm.</p> : <>
        {tab === 'table' && <div className="page">{header(shell.tableNo, 'Table')}
          <table className="tfl"><thead><tr><th></th>{fits.map(f => <th key={f.a}>{f.a}<br />(N={f.k.N})</th>)}</tr></thead><tbody>
            <tr><td>Subjects with event, n (%)</td>{fits.map(f => <td key={f.a}>{f.k.events} ({pct(f.k.events / f.k.N)})</td>)}</tr>
            <tr><td>Censored, n (%)</td>{fits.map(f => <td key={f.a}>{f.k.censored} ({pct(f.k.censored / f.k.N)})</td>)}</tr>
            <tr className="sec"><td>Time to event (months)</td>{fits.map(f => <td key={f.a}></td>)}</tr>
            <tr><td className="in">Median (95% CI)</td>{fits.map(f => <td key={f.a}>{f1(f.k.median)} ({f1(f.k.mlo)}, {f1(f.k.mhi)})</td>)}</tr>
            <tr className="sec"><td>Event-free rate, % (95% CI)</td>{fits.map(f => <td key={f.a}></td>)}</tr>
            {lms.map(t => <tr key={t}><td className="in">{t} months</td>{fits.map(f => { const s = at(f.k.steps, t), n = atRisk(f.rows, t)
              return <td key={f.a}>{n === 0 ? 'NE' : `${pct(s.S)} (${pct(s.t ? s.lo : 1)}, ${pct(s.t ? s.hi : 1)})`}</td> })}</tr>)}
            {lr && <><tr className="sec"><td>{fits[1].a} vs {fits[0].a}</td><td></td><td></td></tr>
              <tr><td className="in">Hazard ratio (95% CI)</td><td></td><td>{lr.hr.toFixed(2)} ({lr.hrlo.toFixed(2)}, {lr.hrhi.toFixed(2)})</td></tr>
              <tr><td className="in">Log-rank p-value</td><td></td><td>{lr.p < 0.0001 ? '<0.0001' : lr.p.toFixed(4)}</td></tr></>}
          </tbody></table>{footer}</div>}
        {tab === 'plot' && <div className="page">{header(shell.figNo, 'Figure')}<Plot fits={fits} bands={shell.bands} step={shell.step} lr={lr} param={shell.param} />{footer}</div>}
        {tab === 'data' && <Grid rows={rows} q={q} setQ={setQ} />}
        {tab === 'code' && <pre className="page code">{rcode(shell, fits, lms)}</pre>}</>}
      </main>
    </div>
  </div>
}

function Plot({ fits, bands, step, lr, param }) {
  const W = 760, H = 380, m = { l: 84, r: 20, t: 16, b: 44 }
  const tmax = Math.ceil(Math.max(...fits.flatMap(f => f.rows.map(r => r.AVAL))) / step) * step
  const x = t => m.l + t / tmax * (W - m.l - m.r), y = s => m.t + (1 - s) * (H - m.t - m.b)
  const ticks = []; for (let t = 0; t <= tmax; t += step) ticks.push(t)
  const path = (st, key) => st.map((s, i) => i === 0 ? `M${x(0)},${y(1)}` : `H${x(s.t)}V${y(s[key])}`).join('') + `H${x(Math.max(...fits.flatMap(f => f.rows.map(r => r.AVAL))))}`
  const band = st => { const p = st.slice(1).filter(s => s.S > 0); if (!p.length) return ''; let d = `M${x(p[0].t)},${y(p[0].hi)}`
    p.forEach((s, i) => { d += `V${y(s.hi)}`; d += `H${x(p[i + 1] ? p[i + 1].t : p[i].t)}` }); for (let i = p.length - 1; i >= 0; i--) { d += `H${x(p[i].t)}V${y(p[i].lo)}`; if (i) d += `H${x(p[i].t)}` }
    return d + 'Z' }
  const rowH = 20, AR = fits.length * rowH + 30
  return <svg viewBox={`0 0 ${W} ${H + AR}`} className="plot">
    {[0, .25, .5, .75, 1].map(s => <g key={s}><line x1={m.l} x2={W - m.r} y1={y(s)} y2={y(s)} stroke="#eee" /><text x={m.l - 6} y={y(s) + 4} textAnchor="end">{s.toFixed(2)}</text></g>)}
    <line x1={m.l} x2={W - m.r} y1={y(.5)} y2={y(.5)} stroke="#bbb" strokeDasharray="4 4" />
    {ticks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1={H - m.b} y2={H - m.b + 4} stroke="#333" /><text x={x(t)} y={H - m.b + 16} textAnchor="middle">{t}</text></g>)}
    <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="#333" /><line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} stroke="#333" />
    <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle">Time from randomization (months)</text>
    <text transform={`translate(14 ${(H - m.b + m.t) / 2}) rotate(-90)`} textAnchor="middle">{param === 'OS' ? 'Probability of survival' : 'Probability of progression-free survival'}</text>
    {fits.map(f => <g key={f.a}>{bands && <path d={band(f.k.steps)} fill={COLORS[f.i]} opacity=".13" />}
      <path d={path(f.k.steps, 'S')} fill="none" stroke={COLORS[f.i]} strokeWidth="2" />
      {f.k.censors.map((c, j) => <line key={j} x1={x(c.t)} x2={x(c.t)} y1={y(c.S) - 5} y2={y(c.S) + 5} stroke={COLORS[f.i]} />)}</g>)}
    <g transform={`translate(${W - 250} ${m.t + 6})`}>{fits.map((f, i) => <g key={f.a} transform={`translate(0 ${i * 18})`}><line x2="20" y1="6" y2="6" stroke={COLORS[f.i]} strokeWidth="2" />
      <text x="26" y="10" textAnchor="start">{f.a}: median {f1(f.k.median)} mo</text></g>)}
      {lr && <text y={fits.length * 18 + 10} textAnchor="start">HR {lr.hr.toFixed(2)} ({lr.hrlo.toFixed(2)}–{lr.hrhi.toFixed(2)}); log-rank p={lr.p < 0.0001 ? '<0.0001' : lr.p.toFixed(4)}</text>}
      <text y={fits.length * 18 + 26} textAnchor="start" fill="#888">| = censored</text></g>
    <text x={4} y={H + 14} textAnchor="start" fontWeight="600">Number at risk</text>
    {fits.map((f, i) => <g key={f.a}><text x={4} y={H + 32 + i * rowH} textAnchor="start" fill={COLORS[f.i]}>{f.a.split(' ')[0]}</text>
      {ticks.map(t => <text key={t} x={x(t)} y={H + 32 + i * rowH} textAnchor="middle">{atRisk(f.rows, t)}</text>)}</g>)}
  </svg>
}

function Grid({ rows, q, setQ }) {
  const cols = ['STUDYID', 'USUBJID', 'TRT01P', 'TRT01PN', 'PARAMCD', 'PARAM', 'STARTDT', 'ADT', 'AVAL', 'CNSR', 'EVNTDESC']
  const shown = rows.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase()))
  return <div className="page"><div className="gridbar"><b>ADTTE</b> (mock) · {shown.length} of {rows.length} rows for this PARAMCD
    <input placeholder="Filter…" value={q} onChange={e => setQ(e.target.value)} /></div>
    <div className="grid"><table><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{shown.map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{r[c]}</td>)}</tr>)}</tbody></table></div></div>
}

const rcode = (s, fits, lms) => `# Generated from shell spec (mock) — Table ${s.tableNo} / Figure ${s.figNo}
library(survival); library(ggsurvfit)
adtte <- haven::read_xpt("adtte.xpt") |>
  dplyr::filter(PARAMCD == "${s.param}", TRT01P %in% c(${fits.map(f => `"${f.a}"`).join(', ')})) |>
  dplyr::mutate(TRT01P = factor(TRT01P, levels = c(${fits.map(f => `"${f.a}"`).join(', ')})))
fit <- survfit(Surv(AVAL, 1 - CNSR) ~ TRT01P, data = adtte, conf.type = "log-log")
summary(fit, times = c(${lms.join(', ')}))     # landmark rates
quantile(fit, probs = 0.5)                      # median + Brookmeyer-Crowley CI
survdiff(Surv(AVAL, 1 - CNSR) ~ TRT01P, data = adtte)   # log-rank
fit |> ggsurvfit() + add_confidence_interval() + add_censor_mark() +
  add_risktable(times = seq(0, 36, ${s.step})) +
  labs(title = "${s.title.replace('{PARAM}', PARAMS[s.param])}", x = "Time from randomization (months)")
`
