import { useMemo, useState, useRef, useEffect } from 'react'
import { nZ, nT, nStandard, power, powerZ, arms, effect, pbar } from './stats/standard.js'
import { assurance, assuranceLimit, rule, nBayes, priorAloneSucceeds, designPrior } from './stats/bayes.js'
import { qnorm, pnorm } from './stats/dist.js'
import SimWorker from './simWorker.js?worker'

const DEFAULT = { endpoint: 'continuous', delta: 5, sd: 10, pC: 0.3, pT: 0.45, alpha: 0.05, power: 0.8, ratio: 1 }
const DEFAULT_OPT = { dropout: 0, shape: 'normal' }
const DEFAULT_B = { priorMeanMult: 1, priorSdMult: 0.75, n0: 10, analysisMean: 'optimistic', gamma: 0.975 }
const SEED = 20261119
const C = { std: '#1f3d8a', z: '#7d8fbf', sim: '#c0571b', cfg: '#8a3ab9', asr: '#2b7a4b', bay: '#b0367a', t1: '#a3302c' }

const f = (x, d = 2) => (x === null || x === undefined || !isFinite(x)) ? '—' : Number(x).toFixed(d)
const pct = (x, d = 1) => isFinite(x) ? (100 * x).toFixed(d) + '%' : '—'

function Num({ label, value, onChange, step = 'any', min, max, hint }) {
  return <label className="fld"><span>{label}</span><input type="number" step={step} min={min} max={max} value={value} onChange={e => onChange(e.target.value === '' ? '' : +e.target.value)} />{hint && <em>{hint}</em>}</label>
}
function Sel({ label, value, onChange, options }) {
  return <label className="fld"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
}
function Slider({ label, value, onChange, min, max, step, show }) {
  return <label className="fld slider"><span>{label} <b>{show(value)}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} /></label>
}
function Seg({ value, onChange, options }) {
  return <div className="seg">{options.map(([v, l]) => <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>
}

export default function App() {
  const [s, setS] = useState(DEFAULT), [opt, setOpt] = useState(DEFAULT_OPT), [b, setB] = useState(DEFAULT_B)
  const set = k => v => setS(o => ({ ...o, [k]: v })), setO = k => v => setOpt(o => ({ ...o, [k]: v })), setBk = k => v => setB(o => ({ ...o, [k]: v }))
  const [nSim, setNSim] = useState(4000)
  const [sim, setSim] = useState(null)
  const worker = useRef(null)
  const cont = s.endpoint === 'continuous'

  const err = useMemo(() => {
    if (!(s.alpha > 0 && s.alpha < 0.5)) return 'Alpha must be between 0 and 0.5.'
    if (!(s.power > 0.5 && s.power < 0.999)) return 'Target power must be between 0.5 and 0.999.'
    if (!(s.ratio >= 0.25 && s.ratio <= 4)) return 'Allocation ratio must be between 0.25 and 4.'
    if (cont && !(s.sd > 0 && Math.abs(s.delta) > 0)) return 'Need a non-zero difference and a positive SD.'
    if (cont && Math.abs(s.delta) / s.sd < 0.05) return 'Effect size below 0.05 SD — the sample size would be enormous.'
    if (!cont && !(s.pC > 0 && s.pC < 1 && s.pT > 0 && s.pT < 1 && Math.abs(s.pT - s.pC) >= 0.01)) return 'Rates must be in (0, 1) and differ by at least 0.01.'
    return null
  }, [s, cont])

  const m = useMemo(() => {
    if (err) return null
    const nStd = nStandard(s), z = nZ(s), t = cont ? nT(s) : null
    const lo = Math.max(4, Math.floor(nStd * 0.25)), hi = Math.ceil(nStd * 2.2)
    const grid = Array.from({ length: 56 }, (_, i) => lo + (hi - lo) * i / 55)
    const nB = nBayes(s, b), rB = rule(s, b, nB), aStd = arms(s, nStd)
    return {
      nStd, z, t, aStd, aZ: arms(s, z), lo, hi,
      powerPts: grid.map(n => ({ x: n, y: power(s, n) })),
      zPts: cont ? grid.map(n => ({ x: n, y: powerZ(s, n) })) : null,
      asrPts: grid.map(n => ({ x: n, y: assurance(s, b, n) })),
      bayPts: grid.map(n => ({ x: n, y: rule(s, b, n).pSuccess })),
      t1Pts: grid.map(n => ({ x: n, y: rule(s, b, n).typeI })),
      asrStd: assurance(s, b, aStd.nC), asrLim: assuranceLimit(s, b), prior: designPrior(b, s),
      nB, rB, aB: arms(s, nB), priorOnly: priorAloneSucceeds(s, b),
      n0Table: [0, 5, 10, 20, 30].map(n0 => { const bb = { ...b, n0 }, n = nBayes(s, bb); return { n0, n, typeI: rule(s, bb, n).typeI } }),
    }
  }, [s, b, err, cont])

  const simOn = opt.dropout > 0 || (cont && opt.shape !== 'normal')
  useEffect(() => {
    if (err) return
    worker.current?.terminate()
    const tm = setTimeout(() => {
      const w = new SimWorker(); worker.current = w
      setSim(x => ({ ...(x || {}), running: true, p: 0 }))
      w.onmessage = e => {
        if (e.data.type === 'progress') setSim(x => ({ ...x, p: e.data.p }))
        else { setSim({ base: e.data.base, cfg: e.data.cfg, ms: e.data.ms }); w.terminate() }
      }
      w.postMessage({ s, nSim, seed: SEED, opt: { ...opt, shape: cont ? opt.shape : 'normal' } })
    }, 250)
    return () => clearTimeout(tm)
  }, [s, opt, nSim, err, cont])

  return <div className="app">
    <header>
      <div><h1>Sample Size Three Ways</h1><p>One two-arm trial, three answers: the textbook formula, brute-force simulation, and two Bayesian views.</p></div>
      <div className="badge">MOCK · teaching demo, not for regulatory use</div>
    </header>

    <section className="card inputs">
      <div className="ib">
        <div className="fld"><span>Endpoint</span><Seg value={s.endpoint} onChange={set('endpoint')} options={[['continuous', 'Continuous'], ['binary', 'Binary']]} /></div>
        {cont ? <>
          <Num label="Mean difference δ" value={s.delta} onChange={set('delta')} step="0.5" />
          <Num label="SD σ (common)" value={s.sd} onChange={set('sd')} step="0.5" />
        </> : <>
          <Num label="Control rate p_C" value={s.pC} onChange={set('pC')} step="0.01" />
          <Num label="Treatment rate p_T" value={s.pT} onChange={set('pT')} step="0.01" />
        </>}
        <Num label="Alpha (two-sided)" value={s.alpha} onChange={set('alpha')} step="0.005" />
        <Num label="Target power" value={s.power} onChange={set('power')} step="0.05" />
        <Num label="Allocation T:C (r : 1)" value={s.ratio} onChange={set("ratio")} step="0.5" />
        <button className="ghost" onClick={() => { setS(DEFAULT); setOpt(DEFAULT_OPT); setB(DEFAULT_B) }}>Reset</button>
      </div>
      <p className="muted">{cont ? `Effect size δ/σ = ${f(s.delta / s.sd, 2)}.` : `Risk difference ${f(s.pT - s.pC, 2)}; pooled rate p̄ = ${f(pbar(s), 3)}.`} All three panels read these inputs. n is the control-arm size; with 1:1 allocation it is n per arm.</p>
    </section>

    {err ? <div className="err">{err}</div> : <>
      <div className="panels">
        <StandardPanel s={s} m={m} />
        <SimPanel s={s} m={m} sim={sim} opt={opt} setO={setO} nSim={nSim} setNSim={setNSim} simOn={simOn} />
        <BayesPanel s={s} m={m} b={b} setBk={setBk} />
      </div>
      <Comparison s={s} m={m} sim={sim} simOn={simOn} opt={opt} b={b} />
    </>}
    <footer>
      Standard: power.t.test-style noncentral t (continuous) and power.prop.test-style pooled z (binary). Simulation: seeded mulberry32 RNG in a web worker, Student t / uncorrected chi-square on each simulated trial, probit-vs-√n fit across 11 candidate n. Bayesian: closed-form normal assurance and a conjugate normal–normal rule with known variance (binary uses a normal approximation to the risk difference). Checked against base R 4.5.3 — see <code>validation/AGREEMENT.md</code>. Out of scope: interim looks, cluster/crossover designs, non-inferiority.
    </footer>
  </div>
}

function Big({ n, s, label, sub }) {
  const a = arms(s, n)
  return <div className="big"><span>{label}</span><b>{isFinite(n) ? (s.ratio === 1 ? a.nC : `${a.nC} + ${a.nT}`) : '—'}</b><em>{isFinite(n) ? (s.ratio === 1 ? `per arm · N = ${a.N}` : `control + treatment · N = ${a.N}`) : ''}{sub ? ' · ' + sub : ''}</em></div>
}

function StandardPanel({ s, m }) {
  const cont = s.endpoint === 'continuous', za = qnorm(1 - s.alpha / 2), zb = qnorm(s.power), r = s.ratio
  const rf = r === 1 ? '2' : `(1 + 1/${r})`
  return <section className="card panel std">
    <div className="ph"><span className="num" style={{ background: C.std }}>1</span><h2>Standard formula</h2></div>
    <p className="cap">Assume the effect is exactly right and the outcome is normal (or the normal approximation holds). Solve the power equation for n.</p>
    <Big n={m.nStd} s={s} label={cont ? 't-test (power.t.test)' : 'Pooled z / χ² (power.prop.test)'} />
    <div className="formula">
      {cont ? <>
        <div>n = {rf} (z<sub>1−α/2</sub> + z<sub>1−β</sub>)² σ² / δ²</div>
        <div>= {rf} ({f(za, 3)} + {f(zb, 3)})² · {f(s.sd, 1)}² / {f(Math.abs(s.delta), 2)}² = <b>{f(m.z, 2)}</b> → <b>{m.aZ.nC}</b></div>
        <div className="sm">t-adjusted: solve P(T′<sub>ν, λ</sub> &gt; t<sub>1−α/2, ν</sub>) = {f(s.power, 2)} with ν = n(1+r) − 2, λ = δ / (σ√(1/n + 1/rn)) → n = <b>{f(m.t, 2)}</b> → <b>{m.aStd.nC}</b></div>
      </> : <>
        <div>n = [z<sub>1−α/2</sub>√(p̄q̄(1+1/r)) + z<sub>1−β</sub>√(p<sub>C</sub>q<sub>C</sub> + p<sub>T</sub>q<sub>T</sub>/r)]² / Δ²</div>
        <div>= [{f(za, 3)}·√({f(pbar(s), 3)}·{f(1 - pbar(s), 3)}·{f(1 + 1 / r, 2)}) + {f(zb, 3)}·√({f(s.pC * (1 - s.pC), 4)} + {f(s.pT * (1 - s.pT) / r, 4)})]² / {f(Math.abs(s.pT - s.pC), 3)}² = <b>{f(m.z, 2)}</b> → <b>{m.aZ.nC}</b></div>
      </>}
    </div>
    <Chart title="Power vs n" xlab="n (control arm)" ylab="Power" xr={[m.lo, m.hi]} hlines={[{ y: s.power, label: 'target' }]} marks={[{ x: m.nStd, label: 'n' }]}
      series={[{ pts: m.powerPts, color: C.std, name: cont ? 't-test' : 'pooled z' }, ...(m.zPts ? [{ pts: m.zPts, color: C.z, dash: '4 3', name: 'normal approx.' }] : [])]} />
    <p className="muted">{cont ? `The z formula gives ${m.aZ.nC}; the t-test needs ${m.aStd.nC} because σ is estimated from the data. This is the number most protocols quote.` : 'Pooled-variance z test, identical to the uncorrected chi-square test. No continuity correction.'}</p>
  </section>
}

function SimPanel({ s, m, sim, opt, setO, nSim, setNSim, simOn }) {
  const cont = s.endpoint === 'continuous', g = sim?.base, c = sim?.cfg
  const show = c || g
  const curve = gg => gg && isFinite(gg.a) ? Array.from({ length: 56 }, (_, i) => { const x = m.lo + (m.hi - m.lo) * i / 55; return { x, y: Math.min(1, Math.max(0, pnorm(gg.a + gg.b * Math.sqrt(x)))) } }) : []
  return <section className="card panel">
    <div className="ph"><span className="num" style={{ background: C.sim }}>2</span><h2>Simulation</h2></div>
    <p className="cap">Simulate {nSim.toLocaleString()} trials at each of 11 candidate sizes, analyse each with the real test ({cont ? 'two-sample t' : 'χ² without correction'}), and find where empirical power crosses the target.</p>
    <div className="row2">
      <Big n={g?.nFit} s={s} label={cont ? 'Normal outcome, no dropout' : 'No dropout'} />
      {simOn && <Big n={c?.nFit} s={s} label={cont && opt.shape !== 'normal' ? (opt.dropout ? 'Skewed + dropout' : 'Skewed outcome') : 'With dropout'} />}
    </div>
    <div className="switches">
      <Slider label="Dropout" value={opt.dropout} onChange={setO('dropout')} min={0} max={0.4} step={0.05} show={v => pct(v, 0)} />
      {cont && <Sel label="Outcome shape" value={opt.shape} onChange={setO('shape')} options={[['normal', 'Normal'], ['lognormal-moderate', 'Skewed (lognormal, moderate)'], ['lognormal-heavy', 'Skewed (lognormal, heavy)']]} />}
      <Sel label="Trials per n" value={String(nSim)} onChange={v => setNSim(+v)} options={[['2000', '2,000'], ['4000', '4,000'], ['5000', '5,000']]} />
    </div>
    {sim?.running && <div className="prog"><i style={{ width: pct(sim.p || 0) }} /></div>}
    {show && <Chart title="Empirical power (±2 MC SE)" xlab="n randomised (control arm)" ylab="Power" xr={[m.lo, m.hi]} hlines={[{ y: s.power, label: 'target' }]}
      series={[{ pts: m.powerPts, color: C.std, dash: '4 3', name: 'formula' },
        { pts: curve(g), color: C.sim, name: 'simulated (normal)' }, { pts: g.pts.map(p => ({ x: p.n, y: p.power, e: 2 * p.se })), color: C.sim, dots: true, line: false },
        ...(c ? [{ pts: curve(c), color: C.cfg, name: 'simulated (switches on)' }, { pts: c.pts.map(p => ({ x: p.n, y: p.power, e: 2 * p.se })), color: C.cfg, dots: true, line: false }] : [])]} />}
    <p className="muted">{simOn
      ? `${opt.dropout ? `Dropout: the formula's usual fix is n / (1 − ${f(opt.dropout, 2)}) = ${Math.ceil(m.nStd / (1 - opt.dropout))}. ` : ''}${cont && opt.shape !== 'normal' ? 'Skew: same mean difference and SD, lognormal shape; the t-test is analysed as if nothing changed — simulation shows what that really buys you. ' : ''}`
      : 'Turn on dropout or a skewed outcome to see where simulation and the formula part ways. '}
      {sim?.ms ? `Seed ${SEED}; ${((sim.cfg ? 2 : 1) * 11 * nSim).toLocaleString()} trials in ${(sim.ms / 1000).toFixed(1)} s. Smallest n read from a probit fit to the 11 points.` : 'Simulating…'}</p>
  </section>
}


function BayesPanel({ s, m, b, setBk }) {
  const cont = s.endpoint === 'continuous', u = cont ? '' : ' (risk diff.)', d = effect(s)
  return <section className="card panel">
    <div className="ph"><span className="num" style={{ background: C.asr }}>3</span><h2>Bayesian</h2></div>
    <h3>a · Assurance (probability of success)</h3>
    <p className="cap">Instead of one assumed effect, put a prior on it: θ ~ N({f(m.prior.mu, cont ? 2 : 3)}, {f(m.prior.tau, cont ? 2 : 3)}²){u}. Assurance is the standard test's power averaged over that prior.</p>
    <div className="row2">
      <div className="big"><span>Assurance at n = {m.aStd.nC}</span><b style={{ color: C.asr }}>{pct(m.asrStd, 0)}</b><em>vs {pct(s.power, 0)} "power" · ceiling {pct(m.asrLim, 0)} as n → ∞</em></div>
    </div>
    <div className="switches">
      <Slider label="Prior SD (× assumed effect)" value={b.priorSdMult} onChange={setBk('priorSdMult')} min={0.05} max={1.5} step={0.05} show={v => f(v, 2) + '×'} />
      <Slider label="Prior mean (× assumed effect)" value={b.priorMeanMult} onChange={setBk('priorMeanMult')} min={0} max={1.5} step={0.05} show={v => f(v, 2) + '×'} />
    </div>
    <h3>b · Bayesian decision rule</h3>
    <p className="cap">Declare success if P(θ &gt; 0 | data) &gt; {b.gamma}. Analysis prior: {b.n0 > 0 ? <>N({b.analysisMean === 'skeptical' ? '0' : f(d, cont ? 2 : 3)}, SE at {b.n0}/arm)</> : 'flat'}. Find the smallest n with an {pct(s.power, 0)} chance of success when θ = {f(d, cont ? 2 : 3)}.</p>
    <div className="row2">
      <Big n={m.nB} s={s} label="Bayesian rule" />
      <div className="big"><span>Type I error of the rule</span><b style={{ color: m.rB.typeI > s.alpha / 2 + 1e-9 ? C.t1 : C.asr }}>{pct(m.rB.typeI, 1)}</b><em>at θ = 0 · frequentist one-sided target {pct(s.alpha / 2, 1)}</em></div>
    </div>
    <div className="switches">
      <Slider label="Prior strength n₀ (per arm)" value={b.n0} onChange={setBk('n0')} min={0} max={40} step={1} show={v => v ? v : 'flat'} />
      <Sel label="Prior centred on" value={b.analysisMean} onChange={setBk('analysisMean')} options={[['optimistic', 'Assumed effect (optimistic)'], ['skeptical', 'Zero (sceptical)']]} />
    </div>
    {m.priorOnly && <div className="warn">The prior alone already clears the {b.gamma} threshold — the "trial" succeeds before any data arrive. That is what a too-strong optimistic prior does.</div>}
    <table className="mini"><thead><tr><th>n₀ (prior per arm)</th>{m.n0Table.map(r => <th key={r.n0} className={r.n0 === b.n0 ? 'hl' : ''}>{r.n0 || 'flat'}</th>)}</tr></thead><tbody>
      <tr><td>n per {s.ratio === 1 ? 'arm' : 'control arm'}</td>{m.n0Table.map(r => <td key={r.n0} className={r.n0 === b.n0 ? 'hl' : ''}>{r.n}</td>)}</tr>
      <tr><td>Type I error</td>{m.n0Table.map(r => <td key={r.n0} className={r.n0 === b.n0 ? 'hl' : ''}>{pct(r.typeI, 1)}</td>)}</tr>
    </tbody></table>
    <p className="muted">Known-variance conjugate normal model{cont ? '' : ' on the risk difference (normal approximation; plug-in SE)'}. A flat prior reproduces the one-sided {pct(s.alpha / 2, 1)} z test. Bayesian PoS of this rule under the design prior: {pct(m.rB.bayesAssurance, 0)}.</p>
  </section>
}

function Comparison({ s, m, sim, simOn, opt, b }) {
  const row = (label, n, note, color) => { const a = isFinite(n) ? arms(s, n) : null; return <tr><td><i className="sw" style={{ background: color }} />{label}</td><td>{a ? (s.ratio === 1 ? a.nC : `${a.nC} + ${a.nT}`) : '…'}</td><td>{a ? a.N : '…'}</td><td>{note}</td></tr> }
  const cont = s.endpoint === 'continuous', g = sim?.base, c = sim?.cfg
  return <section className="card cmp">
    <h2>Comparison</h2>
    <div className="cmpgrid">
      <div>
        <table><thead><tr><th>Method</th><th>n {s.ratio === 1 ? 'per arm' : '(C + T)'}</th><th>Total N</th><th>Note</th></tr></thead><tbody>
          {cont && row('Standard — normal formula', m.z, 'z, σ known', C.z)}
          {row(cont ? 'Standard — t-test (power.t.test)' : 'Standard — power.prop.test', m.nStd, `power ${pct(power(s, m.aStd.nC))}`, C.std)}
          {opt.dropout > 0 && row(`Standard ÷ (1 − ${pct(opt.dropout, 0)} dropout)`, m.nStd / (1 - opt.dropout), 'usual inflation', C.z)}
          {row(cont ? 'Simulation — normal, no dropout' : 'Simulation — no dropout', g?.nFit, g ? `fit n = ${f(g.nFit, 1)}` : 'running…', C.sim)}
          {simOn && row(`Simulation — ${[opt.dropout ? `${pct(opt.dropout, 0)} dropout` : '', cont && opt.shape !== 'normal' ? opt.shape.replace('lognormal-', '') + ' skew' : ''].filter(Boolean).join(' + ')}`, c?.nFit, c ? `fit n = ${f(c.nFit, 1)}` : 'running…', C.cfg)}
          {row(`Bayesian rule (${b.n0 ? `n₀ = ${b.n0}, ${b.analysisMean}` : 'flat prior'})`, m.nB, `type I ${pct(m.rB.typeI)}`, C.bay)}
          <tr><td><i className="sw" style={{ background: C.asr }} />Assurance at the standard n</td><td colSpan="2">{pct(m.asrStd)}</td><td>vs {pct(s.power, 0)} power</td></tr>
        </tbody></table>
        <p className="muted">Same question, different assumptions. The formula and simulation agree when the model is right; simulation earns its keep when it isn't (dropout, skew). Assurance shows how much of the "80%" rests on getting δ exactly right; the Bayesian rule shows that a borrowed prior buys a smaller trial with a larger false-positive rate.</p>
      </div>
      <Chart title="Power, simulated power, assurance and Bayesian PoS vs n" xlab="n (control arm)" ylab="Probability" xr={[m.lo, m.hi]} big hlines={[{ y: s.power, label: 'target' }, { y: s.alpha / 2, label: 'α/2' }]}
        marks={[{ x: m.nStd, label: 'std' }, { x: m.nB, label: 'Bayes' }]}
        series={[{ pts: m.powerPts, color: C.std, name: 'Power (formula)' },
          ...(g ? [{ pts: g.pts.map(p => ({ x: p.n, y: p.power, e: 2 * p.se })), color: C.sim, dots: true, line: false, name: 'Simulated power ±2 SE' }] : []),
          { pts: m.asrPts, color: C.asr, name: 'Assurance (PoS)' },
          { pts: m.bayPts, color: C.bay, dash: '6 3', name: 'Bayes rule P(success | δ)' },
          { pts: m.t1Pts, color: C.t1, dash: '2 3', name: 'Bayes rule type I error' }]} />
    </div>
  </section>
}

function Chart({ title, xlab, ylab, series, xr, ymin = 0, ymax = 1, marks = [], hlines = [], big }) {
  const W = big ? 560 : 340, H = big ? 300 : 210, L = 40, R = 12, T = 12, B = 34
  const [xmin, xmax] = xr
  const X = x => L + (W - L - R) * (x - xmin) / (xmax - xmin || 1), Y = y => H - B - (H - T - B) * (Math.min(ymax, Math.max(ymin, y)) - ymin) / (ymax - ymin)
  const ticks = n => Array.from({ length: n + 1 }, (_, i) => i / n)
  const inX = p => p.x >= xmin - 1e-9 && p.x <= xmax + 1e-9
  return <div className="chart"><h3>{title}</h3><svg viewBox={`0 0 ${W} ${H}`}>
    {ticks(4).map(i => <g key={'y' + i}><line x1={L} x2={W - R} y1={Y(i)} y2={Y(i)} stroke="#edf0f6" /><text x={L - 4} y={Y(i) + 3} textAnchor="end" className="ax">{(i * 100).toFixed(0)}%</text></g>)}
    {ticks(5).map(i => <text key={'x' + i} x={X(xmin + i * (xmax - xmin))} y={H - B + 14} textAnchor="middle" className="ax">{(xmin + i * (xmax - xmin)).toFixed(0)}</text>)}
    <text x={(L + W) / 2} y={H - 3} textAnchor="middle" className="ax">{xlab}</text>
    <text x={10} y={(H - B) / 2} transform={`rotate(-90 10 ${(H - B) / 2})`} textAnchor="middle" className="ax">{ylab}</text>
    {hlines.map((h, i) => <g key={'h' + i}><line x1={L} x2={W - R} y1={Y(h.y)} y2={Y(h.y)} stroke="#b9c0d3" strokeDasharray="4 4" /><text x={W - R - 2} y={Y(h.y) - 3} textAnchor="end" className="ax">{h.label}</text></g>)}
    {marks.filter(mk => isFinite(mk.x) && mk.x >= xmin && mk.x <= xmax).map((mk, i) => <g key={'m' + i}><line x1={X(mk.x)} x2={X(mk.x)} y1={T} y2={H - B} stroke="#9aa3b8" strokeDasharray="3 3" /><text x={X(mk.x) + 3} y={T + 10 + 11 * i} className="ax">{mk.label}</text></g>)}
    {series.filter(sr => sr.line !== false && sr.pts.length).map((sr, i) => <polyline key={i} fill="none" stroke={sr.color} strokeWidth="2" strokeDasharray={sr.dash} points={sr.pts.filter(inX).map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')} />)}
    {series.filter(sr => sr.dots).map((sr, i) => sr.pts.filter(inX).map((p, j) => <g key={i + '-' + j}>{p.e ? <line x1={X(p.x)} x2={X(p.x)} y1={Y(p.y - p.e)} y2={Y(p.y + p.e)} stroke={sr.color} strokeWidth="1.5" /> : null}<circle cx={X(p.x)} cy={Y(p.y)} r="3" fill="#fff" stroke={sr.color} strokeWidth="1.5" /></g>))}
  </svg><div className="legend">{series.filter(sr => sr.name).map(sr => <span key={sr.name}><i style={{ background: sr.color }} />{sr.name}</span>)}</div></div>
}
