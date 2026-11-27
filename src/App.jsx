import { useMemo, useState, useRef, useEffect } from 'react'
import { computeDesign, powerCurve, powerVsSize } from './stats/design.js'
import { EXAMPLE } from './example.js'
import { sapText, rCode, designJson, sfName } from './outputs.js'
import SimWorker from './simWorker.js?worker'

const f = (x, d = 3) => (x === null || x === undefined || !isFinite(x)) ? '—' : Number(x).toFixed(d)
const pct = x => (100 * x).toFixed(1) + '%'

function Num({ label, value, onChange, step = 'any', min, max, hint }) {
  return <label className="fld"><span>{label}</span><input type="number" step={step} min={min} max={max} value={value} onChange={e => onChange(e.target.value === '' ? '' : +e.target.value)} />{hint && <em>{hint}</em>}</label>
}
function Sel({ label, value, onChange, options }) {
  return <label className="fld"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
}

export default function App() {
  const [s, setS] = useState(EXAMPLE)
  const set = k => v => setS(o => ({ ...o, [k]: v }))
  const [tab, setTab] = useState('sap')
  const [sim, setSim] = useState(null)
  const [nSim, setNSim] = useState(2000)
  const worker = useRef(null)

  const { d, err } = useMemo(() => {
    try {
      const bad = ['alpha', 'power', 'ratio'].some(k => !(s[k] > 0)) || s.power >= 1 || s.alpha >= 0.5
      if (bad) throw new Error('Check alpha, power and allocation ratio.')
      if (s.endpoint === 'tte' && (!(s.hr > 0) || !(s.medianC > 0) || !(s.accrual > 0) || !(s.followup >= 0))) throw new Error('Check HR, median, accrual and follow-up.')
      if (s.endpoint === 'tte' && Math.abs(Math.log(s.hr / (s.hypothesis === 'noninferiority' ? s.hrMargin : 1))) < 1e-3) throw new Error('Assumed HR equals the null HR.')
      return { d: computeDesign(s) }
    } catch (e) { return { err: e.message } }
  }, [s])
  useEffect(() => setSim(null), [s])

  const runSim = () => {
    worker.current?.terminate()
    const w = new SimWorker(); worker.current = w
    setSim({ running: true, p: 0 })
    w.onmessage = e => {
      if (e.data.type === 'progress') setSim(x => ({ ...x, p: e.data.p }))
      else { setSim({ res: e.data.res, ms: e.data.ms }); w.terminate() }
    }
    w.postMessage({ settings: s, nSim, seed: 20261102 })
  }
  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click() }

  const interimStr = s.interims.join(', ')
  return <div className="app">
    <header>
      <div><h1>Trial Design Stats</h1><p>Study diagram plus the statistical design underneath it: sample size, events, group-sequential boundaries, power, simulation, SAP text and R.</p></div>
      <div className="badge">MOCK · not validated for regulatory use</div>
    </header>
    <div className="cols">
      <aside>
        <h3>Study</h3>
        <label className="fld"><span>Population</span><input value={s.population} onChange={e => set('population')(e.target.value)} /></label>
        <label className="fld"><span>Arm A (experimental)</span><input value={s.armT} onChange={e => set('armT')(e.target.value)} /></label>
        <label className="fld"><span>Arm B (control)</span><input value={s.armC} onChange={e => set('armC')(e.target.value)} /></label>
        <h3>Endpoint &amp; hypothesis</h3>
        <Sel label="Endpoint" value={s.endpoint} onChange={set('endpoint')} options={[['tte', 'Time-to-event'], ['continuous', 'Continuous'], ['binary', 'Binary']]} />
        {s.endpoint === 'tte' && <label className="fld"><span>Endpoint name</span><input value={s.endpointName} onChange={e => set('endpointName')(e.target.value)} /></label>}
        <Sel label="Hypothesis" value={s.hypothesis} onChange={set('hypothesis')} options={[['superiority', 'Superiority'], ['noninferiority', 'Non-inferiority']]} />
        <div className="row">
          <Num label="Alpha" value={s.alpha} onChange={set('alpha')} step="0.005" />
          <Sel label="Sided" value={String(s.sided)} onChange={v => set('sided')(+v)} options={[['2', 'Two-sided'], ['1', 'One-sided']]} />
        </div>
        <div className="row">
          <Num label="Power" value={s.power} onChange={set('power')} step="0.05" />
          <Num label="Ratio A:B" value={s.ratio} onChange={set('ratio')} step="0.5" hint=":1" />
        </div>
        <h3>Assumptions</h3>
        {s.endpoint === 'tte' && <>
          <div className="row"><Num label="Hazard ratio (A/B)" value={s.hr} onChange={set('hr')} step="0.01" />{s.hypothesis === 'noninferiority' && <Num label="NI HR margin" value={s.hrMargin} onChange={set('hrMargin')} step="0.05" />}</div>
          <div className="row"><Num label="Control median (mo)" value={s.medianC} onChange={set('medianC')} /><Num label="Dropout / yr" value={s.dropout} onChange={set('dropout')} step="0.01" /></div>
          <div className="row"><Num label="Accrual (mo)" value={s.accrual} onChange={set('accrual')} /><Num label="Min follow-up (mo)" value={s.followup} onChange={set('followup')} /></div>
          <Sel label="Events formula" value={s.method} onChange={set('method')} options={[['Schoenfeld', 'Schoenfeld'], ['Freedman', 'Freedman (superiority only)']]} />
        </>}
        {s.endpoint === 'continuous' && <>
          <div className="row"><Num label="Mean B" value={s.meanC} onChange={set('meanC')} /><Num label="Mean A" value={s.meanT} onChange={set('meanT')} /></div>
          <div className="row"><Num label="SD" value={s.sd} onChange={set('sd')} />{s.hypothesis === 'noninferiority' && <Num label="NI margin" value={s.margin} onChange={set('margin')} />}</div>
          <Num label="Dropout (fraction)" value={s.dropout} onChange={set('dropout')} step="0.01" />
        </>}
        {s.endpoint === 'binary' && <>
          <div className="row"><Num label="Rate B" value={s.pC} onChange={set('pC')} step="0.01" /><Num label="Rate A" value={s.pT} onChange={set('pT')} step="0.01" /></div>
          <div className="row">{s.hypothesis === 'noninferiority' && <Num label="NI margin" value={s.marginP} onChange={set('marginP')} step="0.01" />}<Num label="Dropout (fraction)" value={s.dropout} onChange={set('dropout')} step="0.01" /></div>
        </>}
        <h3>Interim analyses</h3>
        <label className="fld"><span>Information fractions (blank = fixed design)</span>
          <input defaultValue={interimStr} key={interimStr} onBlur={e => set('interims')(e.target.value.split(/[ ,]+/).map(Number).filter(x => x > 0 && x < 1).slice(0, 3))} /></label>
        <div className="chips">{[[[], 'Fixed'], [[0.5], '50%'], [[0.5, 0.75], '50/75%'], [[1 / 3, 2 / 3].map(x => +x.toFixed(4)), '33/67%']].map(([v, l]) => <button key={l} onClick={() => set('interims')(v)}>{l}</button>)}</div>
        <div className="row"><Sel label="Efficacy spending" value={s.sf} onChange={set('sf')} options={[['OF', "LD O'Brien-Fleming"], ['Pocock', 'LD Pocock'], ['HSD', 'Hwang-Shih-DeCani']]} />{s.sf === 'HSD' && <Num label="γ" value={s.sfPar} onChange={set('sfPar')} />}</div>
        <label className="chk"><input type="checkbox" checked={s.futility} onChange={e => set('futility')(e.target.checked)} /> Non-binding futility (beta spending)</label>
        {s.futility && <div className="row"><Sel label="Futility spending" value={s.futSf} onChange={set('futSf')} options={[['HSD', 'Hwang-Shih-DeCani'], ['OF', "LD O'Brien-Fleming"], ['Pocock', 'LD Pocock']]} />{s.futSf === 'HSD' && <Num label="γ" value={s.futPar} onChange={set('futPar')} />}</div>}
        <button className="ghost" onClick={() => setS(EXAMPLE)}>Reset to UC example</button>
      </aside>
      <main>
        {err ? <div className="err">{err}</div> : <>
          <Diagram d={d} />
          <Summary d={d} />
          <Boundaries d={d} />
          <div className="charts">
            <PowerChart d={d} />
            <BoundaryChart d={d} />
            {d.s.endpoint === 'tte' ? <EventsChart d={d} /> : <SizeChart d={d} />}
          </div>
          <section className="card">
            <h2>Monte Carlo check</h2>
            <p className="muted">Simulates whole trials under H1 and H0 in a web worker ({d.s.endpoint === 'tte' ? 'exponential survival, uniform accrual, dropout, event-driven looks, log-rank Z' : d.s.endpoint === 'continuous' ? 'normal outcomes, t-type Z with pooled SD' : 'Bernoulli outcomes, Wald Z'}). Seed 20261102.</p>
            <div className="row inline">
              <Sel label="Simulations" value={String(nSim)} onChange={v => setNSim(+v)} options={[['1000', '1,000'], ['2000', '2,000'], ['5000', '5,000'], ['10000', '10,000']]} />
              <button onClick={runSim} disabled={sim?.running}>{sim?.running ? `Running… ${Math.round(sim.p * 100)}%` : 'Run simulation'}</button>
            </div>
            {sim?.res && <SimTable d={d} r={sim.res} ms={sim.ms} />}
          </section>
          <section className="card">
            <div className="tabs">{[['sap', 'SAP text'], ['r', 'R (rpact + gsDesign)'], ['json', 'design.json']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
              <span className="sp" />
              {tab === 'sap' && <button onClick={() => navigator.clipboard?.writeText(sapText(d))}>Copy Markdown</button>}
              {tab === 'r' && <button onClick={() => download('trial-design.R', rCode(d), 'text/plain')}>Download .R</button>}
              {tab === 'json' && <button onClick={() => download('design.json', JSON.stringify(designJson(d), null, 2), 'application/json')}>Download design.json</button>}
            </div>
            <pre className="code">{tab === 'sap' ? sapText(d) : tab === 'r' ? rCode(d) : JSON.stringify(designJson(d), null, 2)}</pre>
            {tab === 'json' && <p className="muted">Export only. A possible input for shell generation (arms and Ns in headers, KM parameter, landmarks, one shell set per analysis). Not connected to EP ShellGen.</p>}
          </section>
        </>}
        <footer>Mock planning tool. Engine checked against gsDesign 3.11.0 and rpact 4.4.0 on 16 reference cases (see <code>validation/</code>). Not validated for regulatory use. Diagram layout inspired by Diagity's Interventional Trial Designer.</footer>
      </main>
    </div>
  </div>
}

function wrap(text, n) { const w = String(text).split(' '), out = []; let l = ''; for (const x of w) { if ((l + ' ' + x).trim().length > n) { out.push(l.trim()); l = x } else l += ' ' + x } if (l.trim()) out.push(l.trim()); return out.slice(0, 3) }

function Diagram({ d }) {
  const s = d.s, tte = s.endpoint === 'tte', K = d.looks.length
  const W = 980, H = 340
  const end = tte ? Math.max(s.accrual + s.followup, ...d.lookTimes.filter(isFinite)) : 1
  const x0 = 420, x1 = W - 30, X = t => x0 + (x1 - x0) * t / end
  const Box = ({ x, y, w, h, title, lines, fill }) => <g><rect x={x} y={y} width={w} height={h} rx="8" fill={fill} stroke="#3b4a6b" />
    <text x={x + 10} y={y + 18} className="bt">{title}</text>{lines.map((l, i) => <text key={i} x={x + 10} y={y + 34 + i * 14} className="bs">{l}</text>)}</g>
  return <section className="card"><h2>Study diagram</h2>
    <svg viewBox={`0 0 ${W} ${H}`} className="diagram">
      <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#3b4a6b" /></marker></defs>
      <Box x={10} y={120} w={150} h={88} title={`Population  n=${d.arms.N}`} lines={wrap(s.population, 24)} fill="#eef3ff" />
      <line x1={160} y1={164} x2={190} y2={164} stroke="#3b4a6b" markerEnd="url(#ar)" />
      <Box x={192} y={134} w={86} h={60} title="Randomise" lines={[`${s.ratio}:1`, 'Day 0']} fill="#fff6e0" />
      <path d={`M278,164 C300,164 300,70 322,70`} fill="none" stroke="#3b4a6b" markerEnd="url(#ar)" />
      <path d={`M278,164 C300,164 300,250 322,250`} fill="none" stroke="#3b4a6b" markerEnd="url(#ar)" />
      <Box x={324} y={30} w={92} h={80} title={`Arm A n=${d.arms.nT}`} lines={wrap(s.armT.replace(/^Arm A:\s*/, ''), 13)} fill="#e7f7ee" />
      <Box x={324} y={210} w={92} h={80} title={`Arm B n=${d.arms.nC}`} lines={wrap(s.armC.replace(/^Arm B:\s*/, ''), 13)} fill="#fdecec" />
      {tte ? <>
        <rect x={X(0)} y={232} width={X(s.accrual) - X(0)} height={28} fill="#c9d8ff" />
        <text x={X(0) + 6} y={250} className="bs">Accrual {s.accrual} mo</text>
        <rect x={X(s.accrual)} y={232} width={X(s.accrual + s.followup) - X(s.accrual)} height={28} fill="#e3e9f7" />
        <text x={X(s.accrual) + 6} y={250} className="bs">Min follow-up {s.followup} mo</text>
        {[0, 1, 2, 3, 4, 5, 6].map(i => { const t = end * i / 6; return <g key={i}><line x1={X(t)} x2={X(t)} y1={300} y2={305} stroke="#888" /><text x={X(t)} y={318} textAnchor="middle" className="bs">{t.toFixed(0)}</text></g> })}
        <text x={x1} y={334} textAnchor="end" className="bs">months</text>
      </> : <>
        <rect x={X(0)} y={232} width={X(1) - X(0)} height={28} fill="#c9d8ff" />
        <text x={X(0) + 6} y={250} className="bs">Enrolment to N = {d.arms.N} (information time)</text>
      </>}
      <line x1={X(0)} x2={x1} y1={300} y2={300} stroke="#888" />
      {d.looks.map((t, k) => { const at = tte ? d.lookTimes[k] : t; const lbl = k < K - 1 ? `IA${k + 1}` : 'FA'; return <g key={k}>
        <line x1={X(at)} x2={X(at)} y1={6 + k * 54} y2={300} stroke={k < K - 1 ? '#b26b00' : '#1f3d8a'} strokeDasharray={k < K - 1 ? '5 4' : ''} />
        <text x={X(at) - 4} y={18 + k * 54} textAnchor="end" className="bt">{lbl}</text>
        <text x={X(at) - 4} y={32 + k * 54} textAnchor="end" className="bs">{tte ? `${d.dLooks[k]} ev · ~${at.toFixed(1)} mo` : `n=${d.nLooks[k]}`}</text>
        <text x={X(at) - 4} y={46 + k * 54} textAnchor="end" className="bs">Z ≥ {f(d.gs.b[k], 2)}{tte ? ` · HR ≤ ${f(d.hrBounds[k], 3)}` : ''}</text>
        {d.gs.a && k < K - 1 && <text x={X(at) - 4} y={60 + k * 54} textAnchor="end" className="bs fut">futility Z &lt; {f(d.gs.a[k], 2)}</text>}
      </g> })}
      {tte && <text x={x0} y={284} className="bs">Endpoint: {s.endpointName} · median B {s.medianC} mo → A {(s.medianC / s.hr).toFixed(1)} mo (HR {s.hr})</text>}
    </svg></section>
}

function Summary({ d }) {
  const s = d.s, tte = s.endpoint === 'tte'
  const items = [
    ['Total N', d.arms.N, `${d.arms.nT} A / ${d.arms.nC} B`],
    tte ? ['Max events', Math.ceil(d.dMax), `fixed design ${Math.ceil(d.dFixed)}`] : ['Fixed-design N', d.armsFixed.N, 'no interims'],
    ['Inflation factor', f(d.gs.IF, 4), d.looks.length > 1 ? `${d.looks.length - 1} interim(s)` : 'fixed design'],
    ['One-sided α', f(d.alpha, 4), s.sided === 2 ? `two-sided ${s.alpha}` : ''],
    ['Power', pct(d.gs.power), d.gs.a ? 'futility obeyed' : ''],
    tte ? ['Study duration', `${(s.accrual + s.followup).toFixed(0)} mo`, `P(event) ${pct(d.model.pEvent)}`] : ['Expected N | H1', Math.round(d.gs.asnH1 * d.arms.N), `H0: ${Math.round(d.gs.asnH0 * d.arms.N)}`],
  ]
  if (tte) items.push(['Expected events | H1', Math.round(d.gs.asnH1 * d.dMax), `H0: ${Math.round(d.gs.asnH0 * d.dMax)}`])
  return <section className="kpis">{items.map(([l, v, h]) => <div key={l} className="kpi"><span>{l}</span><b>{v}</b><em>{h}</em></div>)}</section>
}

function Boundaries({ d }) {
  const s = d.s, tte = s.endpoint === 'tte', K = d.looks.length
  return <section className="card"><h2>Analyses and boundaries</h2>
    <p className="muted">Efficacy: {sfName(s.sf, s.sfPar)} alpha spending. {d.gs.a ? `Futility: ${sfName(s.futSf, s.futPar)} beta spending, non-binding (efficacy bounds ignore it).` : 'No futility bounds.'}</p>
    <table><thead><tr><th>Analysis</th><th>Info</th><th>{tte ? 'Events' : 'N'}</th>{tte && <th>~Month</th>}<th>Efficacy Z</th><th>Nominal p (1-sided)</th>{tte && <th>HR bound</th>}<th>α spent (cum)</th>{d.gs.a && <th>Futility Z</th>}{d.gs.a && tte && <th>Futility HR</th>}<th>P(stop eff | H1)</th>{d.gs.a && <th>P(stop fut | H0)</th>}</tr></thead>
      <tbody>{d.looks.map((t, k) => <tr key={k}>
        <td>{k < K - 1 ? `IA${k + 1}` : 'Final'}</td><td>{pct(t)}</td><td>{tte ? d.dLooks[k] : d.nLooks[k]}</td>{tte && <td>{f(d.lookTimes[k], 1)}</td>}
        <td>{f(d.gs.b[k])}</td><td>{d.nominalP[k].toExponential(2)}</td>{tte && <td>{f(d.hrBounds[k])}</td>}
        <td>{f(d.gs.alphaSpent.slice(0, k + 1).reduce((a, b) => a + b, 0), 5)}</td>
        {d.gs.a && <td>{k < K - 1 ? f(d.gs.a[k]) : '—'}</td>}{d.gs.a && tte && <td>{k < K - 1 ? f(d.hrFut[k]) : '—'}</td>}
        <td>{pct(d.gs.stopH1.upper[k])}</td>{d.gs.a && <td>{k < K - 1 ? pct(d.gs.stopH0.lower[k]) : '—'}</td>}
      </tr>)}</tbody></table></section>
}

function Chart({ title, xlab, ylab, series, xfmt = x => x.toFixed(2), yfmt = y => y.toFixed(2), marks = [], ymin = 0, ymax = 1, xr }) {
  const W = 320, H = 220, L = 42, R = 10, T = 12, B = 36
  const xs = series.flatMap(s => s.pts.map(p => p.x)), xmin = xr ? xr[0] : Math.min(...xs), xmax = xr ? xr[1] : Math.max(...xs)
  const X = x => L + (W - L - R) * (x - xmin) / (xmax - xmin || 1), Y = y => H - B - (H - T - B) * (y - ymin) / (ymax - ymin || 1)
  const ticks = n => Array.from({ length: n + 1 }, (_, i) => i / n)
  return <div className="card chart"><h3>{title}</h3><svg viewBox={`0 0 ${W} ${H}`}>
    {ticks(4).map(i => <g key={'y' + i}><line x1={L} x2={W - R} y1={Y(ymin + i * (ymax - ymin))} y2={Y(ymin + i * (ymax - ymin))} stroke="#eee" /><text x={L - 4} y={Y(ymin + i * (ymax - ymin)) + 3} textAnchor="end" className="ax">{yfmt(ymin + i * (ymax - ymin))}</text></g>)}
    {ticks(4).map(i => <text key={'x' + i} x={X(xmin + i * (xmax - xmin))} y={H - B + 14} textAnchor="middle" className="ax">{xfmt(xmin + i * (xmax - xmin))}</text>)}
    <text x={(L + W) / 2} y={H - 4} textAnchor="middle" className="ax">{xlab}</text>
    <text x={10} y={(H - B) / 2} transform={`rotate(-90 10 ${(H - B) / 2})`} textAnchor="middle" className="ax">{ylab}</text>
    {series.map((s, i) => <polyline key={i} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} points={s.pts.map(p => `${X(p.x)},${Y(p.y)}`).join(' ')} />)}
    {series.filter(s => s.dots).map((s, i) => s.pts.map((p, j) => <circle key={i + '-' + j} cx={X(p.x)} cy={Y(p.y)} r="3.5" fill={s.color} />))}
    {marks.map((m, i) => <g key={i}><line x1={X(m.x)} x2={X(m.x)} y1={T} y2={H - B} stroke="#999" strokeDasharray="3 3" /><text x={X(m.x) + 3} y={T + 10 + 12 * i} className="ax">{m.label}</text></g>)}
  </svg><div className="legend">{series.filter(s => s.name).map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div></div>
}
function PowerChart({ d }) {
  const tte = d.s.endpoint === 'tte', pts = powerCurve(d)
  return <Chart title="Power curve" xlab={tte ? 'True hazard ratio (A/B)' : d.s.endpoint === 'continuous' ? 'True mean difference (A−B)' : 'True rate difference (A−B)'} ylab="Power"
    series={[{ pts, color: '#1f3d8a', name: d.gs.a ? 'Power (futility obeyed)' : 'Power' }]} yfmt={y => (y * 100).toFixed(0) + '%'}
    marks={[{ x: tte ? d.s.hr : d.info.theta, label: 'assumed' }]} />
}
function SizeChart({ d }) {
  const pts = powerVsSize(d).map(p => ({ x: p.x * d.arms.N, y: p.y }))
  return <Chart title="Power vs total N" xlab="Total N" ylab="Power" xfmt={x => x.toFixed(0)} yfmt={y => (y * 100).toFixed(0) + '%'} series={[{ pts, color: '#2b7a4b', name: 'At assumed effect' }]} marks={[{ x: d.arms.N, label: 'design' }]} />
}
function BoundaryChart({ d }) {
  const up = d.looks.map((t, k) => ({ x: t, y: d.gs.b[k] })), lo = d.gs.a ? d.looks.map((t, k) => ({ x: t, y: d.gs.a[k] })) : null
  const ys = [...up, ...(lo || [])].map(p => p.y)
  return <Chart title="Group-sequential boundaries (Z)" xlab="Information fraction" ylab="Z" ymin={Math.min(-1, Math.floor(Math.min(...ys)))} ymax={Math.ceil(Math.max(...ys, 3))} xr={[0, 1]} xfmt={x => (x * 100).toFixed(0) + '%'} yfmt={y => y.toFixed(1)}
    series={[{ pts: up, color: '#1f3d8a', name: 'Efficacy', dots: true }, ...(lo ? [{ pts: lo, color: '#b26b00', name: 'Futility (non-binding)', dots: true, dash: '5 4' }] : [])]} />
}
function EventsChart({ d }) {
  const s = d.s, end = Math.max(s.accrual + s.followup, ...d.lookTimes.filter(isFinite)) * 1.05
  const pts = Array.from({ length: 61 }, (_, i) => { const t = end * i / 60; return { x: t, y: d.arms.N * d.model.frac(t) } })
  const enr = Array.from({ length: 61 }, (_, i) => { const t = end * i / 60; return { x: t, y: d.arms.N * Math.min(1, t / s.accrual) } })
  return <Chart title="Expected enrolment and events" xlab="Months from first randomisation" ylab="Count" ymax={d.arms.N} xfmt={x => x.toFixed(0)} yfmt={y => y.toFixed(0)}
    series={[{ pts: enr, color: '#9aa7c7', name: 'Enrolled', dash: '4 3' }, { pts, color: '#a3302c', name: 'Expected events' }]}
    marks={d.looks.map((t, k) => ({ x: d.lookTimes[k], label: k < d.looks.length - 1 ? `IA${k + 1}` : 'FA' }))} />
}
function SimTable({ d, r, ms }) {
  const tte = d.s.endpoint === 'tte', K = d.looks.length, se = p => Math.sqrt(p * (1 - p) / r.nSim)
  return <div><table><thead><tr><th></th><th>Simulated</th><th>Analytic</th><th>±2 SE</th></tr></thead><tbody>
    <tr><td>Power (futility obeyed)</td><td>{pct(r.H1.power)}</td><td>{pct(d.gs.power)}</td><td>{pct(2 * se(d.gs.power))}</td></tr>
    <tr><td>Type I error (futility ignored)</td><td>{pct(r.H0.powerNB)}</td><td>{pct(d.gs.typeI)}</td><td>{pct(2 * se(d.gs.typeI))}</td></tr>
    <tr><td>Type I error (futility obeyed)</td><td>{pct(r.H0.power)}</td><td>{pct(d.gs.stopH0.upper.reduce((a, b) => a + b, 0))}</td><td></td></tr>
    <tr><td>Mean {tte ? 'events' : 'N'} at stop | H1</td><td>{r.H1.meanSize.toFixed(0)}</td><td>{(d.gs.asnH1 * (tte ? d.dMax : d.arms.N)).toFixed(0)}</td><td></td></tr>
    <tr><td>Mean {tte ? 'events' : 'N'} at stop | H0</td><td>{r.H0.meanSize.toFixed(0)}</td><td>{(d.gs.asnH0 * (tte ? d.dMax : d.arms.N)).toFixed(0)}</td><td></td></tr>
    {tte && <tr><td>Mean analysis month | H1</td><td>{r.H1.meanTime.toFixed(1)}</td><td>—</td><td></td></tr>}
    {d.looks.map((t, k) => <tr key={k}><td>Stop at {k < K - 1 ? `IA${k + 1}` : 'final'} | H1 (efficacy{d.gs.a ? ' / futility' : ''})</td><td>{pct(r.H1.stopAt[k] / r.nSim)}{d.gs.a ? ' / ' + pct(r.H1.futAt[k] / r.nSim) : ''}</td><td>{k < K - 1 ? pct(d.gs.stopH1.upper[k]) + (d.gs.a ? ' / ' + pct(d.gs.stopH1.lower[k]) : '') : '—'}</td><td></td></tr>)}
  </tbody></table><p className="muted">{r.nSim.toLocaleString()} trials under each hypothesis in {(ms / 1000).toFixed(1)} s. "Stop at final" counts all trials reaching the final analysis.</p></div>
}
