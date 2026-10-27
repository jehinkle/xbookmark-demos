import { useEffect, useMemo, useRef, useState } from 'react'
import Radial from './Radial.jsx'
import BurnUp from './BurnUp.jsx'
import { nodes, SECTIONS, DAYS, PAUSES, GAP, N_MS, stateAt, msDoneAt, inPause, adslDay, safetyDay, milestones, N_AGENTS } from './lib/model.js'

const QC_TEXT = {
  todo: 'Not started', wip: 'Being programmed', prog: 'Programmed, awaiting independent QC',
  mismatch: 'QC mismatch: double-programming diff open', valid: 'Validated (double-programming match)',
  gap: 'Invalidated: SAP discrepancy, rework queued',
}

function stats(t) {
  let prog = 0, valid = 0, mm = 0, gap = 0
  const agents = new Set()
  for (let i = 1; i < nodes.length; i++) {
    const s = stateAt(nodes[i], t)
    if (s === 'prog' || s === 'mismatch' || s === 'valid') prog++
    if (s === 'valid') valid++
    if (s === 'mismatch') mm++
    if (s === 'gap') gap++
    if (s === 'wip') agents.add(nodes[i].agent)
  }
  return { prog, valid, mm, gap, agents: agents.size, ms: msDoneAt(t) }
}

const EVENTS = [
  { d: 0.25, text: `Swarm launched: ${N_AGENTS} programming agents start on SDTM and ADSL`, kind: 'info' },
  ...PAUSES.flatMap((p) => [
    { d: p.from, text: `Paused: ${p.why}`, kind: 'pause' },
    { d: p.to, text: 'Resumed', kind: 'info' },
  ]),
  { d: adslDay, text: 'ADSL validated: SAFFL / ITTFL / PKFL populations locked', kind: 'ms' },
  { d: GAP.found, text: 'Gap found: ADTTE PFS censoring does not match SAP §9.4.2 (deaths after 2+ missed scans)', kind: 'gap' },
  { d: GAP.fixed, text: 'ADTTE rerouted per SAP v2.1: branch re-derived and re-validated', kind: 'fix' },
  { d: safetyDay, text: 'Safety tables package QC-complete', kind: 'ms' },
  { d: nodes[0].qc, text: `All ${N_MS} milestones complete: CSR outputs ready for database lock`, kind: 'ms' },
].sort((a, b) => a.d - b.d)

export default function App() {
  const [t, setT] = useState(9.4)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [hover, setHover] = useState(null)
  const raf = useRef(0)

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now
      setT((x) => {
        const nx = Math.min(DAYS, x + dt * speed * 0.85)
        if (nx >= DAYS) setPlaying(false)
        return nx
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, speed])

  useEffect(() => {
    const k = (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); toggle() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  const toggle = () => { if (t >= DAYS) setT(0); setPlaying((p) => !p) }

  const s = useMemo(() => stats(t), [t])
  const total = nodes.length - 1
  const paused = inPause(t)
  const csrPct = s.valid / total
  const events = EVENTS.filter((e) => e.d <= t)
  const recentMs = milestones.filter((i) => nodes[i].qc <= t).slice(-4).reverse()
  const hn = hover?.i != null ? nodes[hover.i] : null

  return (
    <div className="page">
      <header>
        <div className="eyebrow">Demo Lab · mock study XYZ-101</div>
        <h1>TFL Swarm Replay</h1>
        <p className="sub">
          A swarm of programming agents builds a study's SDTM, ADaM and TFL deliverables over {DAYS} days.
          Each dot is a program or output. Its distance from the center is how far upstream it sits from the CSR. Gold diamonds are the {N_MS} milestones.
        </p>
      </header>

      <section className="controls">
        <button className="play" onClick={toggle}>{playing ? '❚❚ Pause' : t >= DAYS ? '↺ Replay' : '▶ Play'}</button>
        <div className="speed">
          {[0.5, 1, 2, 4].map((x) => (
            <button key={x} className={x === speed ? 'on' : ''} onClick={() => setSpeed(x)}>{x}×</button>
          ))}
        </div>
        <input type="range" min="0" max={DAYS} step="0.01" value={t} aria-label="Replay day"
          onChange={(e) => { setPlaying(false); setT(+e.target.value) }} />
        <div className="day">Day {t.toFixed(1)}{paused && <span className="pill">Paused</span>}</div>
      </section>

      <section className="kpis">
        <div><b>{s.prog.toLocaleString()}</b><span>of {total.toLocaleString()} programmed</span></div>
        <div><b>{s.valid.toLocaleString()}</b><span>validated (QC match)</span></div>
        <div><b>{s.ms}<small>/{N_MS}</small></b><span>milestones</span></div>
        <div><b>{s.agents}<small>/{N_AGENTS}</small></b><span>agents busy</span></div>
        <div className={s.mm + s.gap ? 'warn' : ''}><b>{s.mm + s.gap}</b><span>open QC findings</span></div>
      </section>

      <main className="grid">
        <div className="card radial-card">
          <Radial t={t} hover={hover?.i ?? null} csrPct={csrPct}
            onHover={(i, x, y) => setHover(i == null ? null : { i, x, y })} />
          {hn && (
            <div className="tip" style={{ left: Math.min(hover.x + 14, 470), top: hover.y + 14 }}>
              <div className="tip-title">{hn.title}</div>
              <div className="tip-id">{hn.id}{hn.milestone ? ' · ◆ milestone' : ''}</div>
              <dl>
                <dt>Type</dt><dd>{hn.kind}</dd>
                <dt>Section</dt><dd>{hn.sec >= 0 ? SECTIONS[hn.sec].name : 'Root'}</dd>
                <dt>Depth</dt><dd>{hn.depth} {hn.depth ? 'steps from CSR' : ''}</dd>
                <dt>Upstream</dt><dd>{(hn.size - 1).toLocaleString()} dependencies</dd>
                <dt>Agent</dt><dd>{hn.agent ? `agent-${String(hn.agent).padStart(2, '0')}` : 'swarm lead'}</dd>
                <dt>Programmed</dt><dd>Day {hn.done.toFixed(1)}{hn.redFrom != null && hn.d0 < 1e8 ? ` (first pass Day ${hn.d0.toFixed(1)})` : ''}</dd>
                <dt>QC</dt><dd className={'qc-' + stateAt(hn, t)}>{QC_TEXT[stateAt(hn, t)]}{stateAt(hn, t) === 'valid' ? `, Day ${hn.qc.toFixed(1)}` : ''}</dd>
              </dl>
            </div>
          )}
        </div>

        <aside className="card side">
          <h3>Legend</h3>
          <ul className="legend">
            <li><i className="dot todo" />Not started</li>
            <li><i className="dot wip" />Being programmed</li>
            <li><i className="dot prog" />Programmed, awaiting QC</li>
            <li><i className="dot valid" />Validated (double-programming match)</li>
            <li><i className="dot mismatch" />QC mismatch open</li>
            <li><i className="dot gap" />Invalidated by SAP discrepancy</li>
            <li><i className="dia" />Milestone (gold when validated)</li>
          </ul>
          <p className="hint">Hover a dot to see its dependency path to the CSR. Press space to play or pause.</p>
          <h3>Swarm log</h3>
          <ol className="log">
            {events.slice().reverse().map((e) => (
              <li key={e.d + e.text} className={e.kind}><span>Day {e.d.toFixed(1)}</span>{e.text}</li>
            ))}
          </ol>
          {recentMs.length > 0 && (
            <>
              <h3>Latest milestones</h3>
              <ul className="ms">
                {recentMs.map((i) => <li key={i}><span>◆</span>{nodes[i].title}<em>Day {nodes[i].qc.toFixed(1)}</em></li>)}
              </ul>
            </>
          )}
        </aside>
      </main>

      <section className="card">
        <BurnUp t={t} />
      </section>

      <footer>
        Mock data only: a seeded, made-up dependency graph of {total.toLocaleString()} programs for a fictional study. No real study, SAP or agent output.
        Inspired by Axiom's <a href="https://x.com/axiommathai/status/2115089844745773304" target="_blank" rel="noreferrer">AxiomProver CFSG post</a> (a swarm formalizing the Classification of Finite Simple Groups in Lean).
        Demo Lab · xbookmark-demos.
      </footer>
    </div>
  )
}
