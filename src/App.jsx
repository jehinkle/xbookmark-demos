import { useEffect, useMemo, useRef, useState } from 'react'
import { euclid, groups, bjorklund, gcdTrace } from './lib/euclid'
import MathNotes from './MathNotes'
import { getCtx, play } from './lib/audio'

const VOICES = ['kick', 'snare', 'hat', 'bell', 'bass']
const COLORS = ['#ff8a1f', '#ffffff', '#ffc27a']

function rotFor(k, n, target) {
  if (!target) return 0
  const t = target.split('').map((c) => (c === 'x' ? 1 : 0))
  for (let r = 0; r < n; r++) if (euclid(k, n, r).join('') === t.join('')) return r
  return 0
}
const L = (voice, k, target, on = true) => ({ voice, k, target, on })
const PRESETS = [
  { name: 'Four on the floor', tag: 'E(4,16)', n: 16, bpm: 120, layers: [L('kick', 4), L('hat', 8, 'x.x.x.x.x.x.x.x.'.replace(/x\./g, '.x'))] },
  { name: 'Tresillo', tag: 'E(3,8)', n: 8, bpm: 100, layers: [L('kick', 3)] },
  { name: 'Dembow', tag: 'E(3,8) over E(4,8)', n: 8, bpm: 95, layers: [L('kick', 4), L('snare', 3, 'x..x..x.')] },
  { name: 'Cinquillo', tag: 'E(5,8)', n: 8, bpm: 100, layers: [L('kick', 5)] },
  { name: 'Bossa clave', tag: 'E(5,16)', n: 16, bpm: 130, layers: [L('kick', 4), L('snare', 5, 'x..x..x...x..x..')] },
  { name: 'Bembé', tag: 'E(7,12)', n: 12, bpm: 110, layers: [L('bell', 7, 'x.x.xx.x.x.x')] },
]
function load(p) {
  return p.layers.map((l) => ({ voice: l.voice, k: l.k, rot: rotFor(l.k, p.n, l.target), on: true }))
}

function Ring({ pattern, r, color, step, flash, label }) {
  const n = pattern.length
  const pts = pattern.map((_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2
    return [Math.cos(a) * r, Math.sin(a) * r]
  })
  const hitPts = pts.filter((_, i) => pattern[i])
  return (
    <g>
      <circle r={r} fill="none" stroke={color} strokeOpacity="0.15" strokeWidth="1.5" />
      {hitPts.length > 1 && (
        <polygon points={hitPts.map((p) => p.join(',')).join(' ')} fill={color} fillOpacity="0.06" stroke={color} strokeWidth="2" filter="url(#glow)" />
      )}
      {pts.map(([x, y], i) => {
        const hit = pattern[i]; const active = i === step
        return (
          <circle key={i} cx={x} cy={y} r={hit ? (active && flash ? 11 : 7) : 3}
            fill={hit ? (active && flash ? '#fff' : color) : '#3a2a1c'} stroke={active ? '#fff' : 'none'}
            filter={hit ? 'url(#glow)' : undefined} />
        )
      })}
      <text x="0" y={-r - 12} textAnchor="middle" className="ring-label" fill={color}>{label}</text>
    </g>
  )
}

function StepRow({ pattern, step, color, voice }) {
  const gs = groups(pattern); const n = pattern.length; const w = 100 / n
  return (
    <div className="steprow">
      <span className="rowlabel" style={{ color }}>{voice}</span>
      <div className="row-body">
        <div className="cells">
          {pattern.map((v, i) => (
            <div key={i} className={`cell ${v ? 'hit' : ''} ${i === step ? 'now' : ''}`} style={{ '--c': color }} />
          ))}
        </div>
        <div className="brackets">
          {gs.map((g, j) => {
            const wrap = g.start + g.len > n
            return (
              <div key={j} className={`bracket ${wrap ? 'wrap' : ''}`} style={{ left: `${g.start * w}%`, width: `${Math.min(g.len, n - g.start) * w}%`, '--c': color }}>
                <span>{g.len}</span>
              </div>
            )
          })}
        </div>
        <div className="grouping" style={{ color }}>{gs.map((g) => g.len).join('-') || '—'}</div>
      </div>
    </div>
  )
}

function Piano({ pattern }) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const whites = [0, 2, 4, 5, 7, 9, 11]; const blacks = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }
  const scale = names.filter((_, i) => pattern[i]).join(' ')
  return (
    <div className="piano-wrap">
      <div className="piano">
        {whites.map((i) => <div key={i} className={`wk ${pattern[i] ? 'on' : ''}`}><span>{names[i]}</span></div>)}
        {Object.entries(blacks).map(([i, pos]) => (
          <div key={i} className={`bk ${pattern[i] ? 'on' : ''}`} style={{ left: `calc(${(pos + 1) * (100 / 7)}% - 4.5%)` }} />
        ))}
      </div>
      <p className="muted">12 steps = 12 semitones. Hits: <b>{scale}</b>{pattern.join('') === '101011010101' ? ' — the major scale. White keys = hits, black keys = rests.' : ''}</p>
    </div>
  )
}

function Fold({ k, n }) {
  const { stages, pattern } = useMemo(() => bjorklund(k, n), [k, n])
  const total = stages.length + 1
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => { setI(0) }, [k, n])
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setI((x) => (x + 1) % (total + 1)), 1400)
    return () => clearInterval(t)
  }, [auto, total])
  const s = stages[Math.min(i, stages.length - 1)]
  const done = i >= stages.length
  const trace = gcdTrace(n, k)
  const Col = ({ g, rem }) => (
    <div className={`fcol ${rem ? 'rem' : ''}`}>{g.map((b, j) => <span key={j} className={b ? 'one' : 'zero'}>{b}</span>)}</div>
  )
  return (
    <div className="fold">
      <div className="fold-head">
        <h3>The fold · E({k},{n})</h3>
        <div className="fold-ctl">
          <button onClick={() => { setAuto(false); setI((x) => Math.max(0, x - 1)) }}>◀</button>
          <span>{done ? 'read off' : `stage ${i + 1}/${stages.length}`}</span>
          <button onClick={() => { setAuto(false); setI((x) => Math.min(total - 1, x + 1)) }}>▶</button>
          <button onClick={() => setAuto((a) => !a)}>{auto ? 'pause' : 'auto'}</button>
        </div>
      </div>
      <div className="fold-stage" key={i}>
        {!done ? (
          <>
            <div className="fold-groups">
              {s.main.map((g, j) => <Col key={j} g={g} />)}
              {s.rem.length > 0 && <div className="fold-sep" />}
              {s.rem.map((g, j) => <Col key={'r' + j} g={g} rem />)}
            </div>
            <p className="muted">
              {i === 0 ? `Start: ${k} ones, ${n - k} zeros.` : `Pair each front group with a leftover; extras fold under.`}
              {' '}{s.rem.length <= 1 && i > 0 ? 'One (or zero) remainder left — stop.' : ''}
            </p>
          </>
        ) : (
          <>
            <div className="readoff">{pattern.map((b, j) => <span key={j} className={b ? 'one' : 'zero'}>{b ? 'x' : '·'}</span>)}</div>
            <p className="muted">Read the columns left to right, top to bottom.</p>
          </>
        )}
      </div>
      <div className="gcd">
        <span className="muted">Euclid's subtraction gcd({n},{k}):</span>{' '}
        {trace.steps.map((t, j) => <code key={j} className={j <= i ? 'lit' : ''}>{t}</code>)}
        <code className="lit">gcd = {trace.gcd}</code>
      </div>
    </div>
  )
}

export default function App() {
  const [n, setN] = useState(8)
  const [bpm, setBpm] = useState(100)
  const [layers, setLayers] = useState(load(PRESETS[1]))
  const [sel, setSel] = useState(0)
  const [bassInv, setBassInv] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(-1)
  const [angle, setAngle] = useState(-90)
  const [preset, setPreset] = useState('Tresillo')
  const [showFold, setShowFold] = useState(true)

  const patterns = layers.map((l) => euclid(Math.min(l.k, n), n, l.rot))
  const kickIdx = layers.findIndex((l) => l.voice === 'kick')
  const bassPattern = bassInv && kickIdx >= 0 ? patterns[kickIdx].map((v) => 1 - v) : null
  const all = [...layers.map((l, i) => ({ ...l, pattern: patterns[i], color: COLORS[i] })),
    ...(bassPattern ? [{ voice: 'bass', on: true, pattern: bassPattern, color: '#ff5a1f', derived: true }] : [])]

  const st = useRef({}); st.current = { all, n, bpm }
  const sched = useRef(null)
  useEffect(() => {
    if (!playing) return
    const c = getCtx()
    let next = c.currentTime + 0.06, idx = 0
    const startT = next
    const queue = []
    sched.current = setInterval(() => {
      const { all, n, bpm } = st.current
      const dur = 60 / bpm / 4
      while (next < c.currentTime + 0.12) {
        const s = idx % n
        all.forEach((l) => { if (l.on && l.pattern[s]) play(l.voice, next, 0.7) })
        queue.push({ t: next, s })
        next += dur; idx++
      }
    }, 25)
    let raf
    const tick = () => {
      while (queue.length > 1 && queue[1].t <= c.currentTime) queue.shift()
      if (queue.length && queue[0].t <= c.currentTime) {
        const { n, bpm } = st.current
        const q = queue[0]; const frac = (c.currentTime - q.t) / (60 / bpm / 4)
        setStep(q.s); setAngle(((q.s + Math.min(frac, 1)) / n) * 360 - 90)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    void startT
    return () => { clearInterval(sched.current); cancelAnimationFrame(raf) }
  }, [playing])

  const applyPreset = (p) => {
    setPreset(p.name); setN(p.n); setBpm(p.bpm); setLayers(load(p)); setSel(0); setBassInv(false)
  }
  const upd = (patch) => setLayers((ls) => ls.map((l, i) => (i === sel ? { ...l, ...patch } : l)))
  const cur = layers[sel] || layers[0]
  const radii = [180, 140, 100, 64]
  const flashOn = (p) => step >= 0 && p[step]
  const anyHit = playing && all.some((l) => l.on && l.pattern[step])

  return (
    <div className="app">
      <header>
        <div className="brand"><span className="glyph">◉</span> EUCLID RHYTHMS</div>
        <div className="sub">Bjorklund · Toussaint · distribute k hits as evenly as possible over n steps</div>
      </header>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} className={preset === p.name ? 'on' : ''} onClick={() => applyPreset(p)}>
            {p.name}<small>{p.tag}</small>
          </button>
        ))}
      </div>

      <main>
        <section className="stage">
          <svg viewBox="-220 -220 440 440" className="ring">
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {all.map((l, i) => l.on && (
              <Ring key={i} pattern={l.pattern} r={radii[i]} color={l.color} step={step} flash={playing && flashOn(l.pattern)} label={i === 0 ? '' : ''} />
            ))}
            <g transform={`rotate(${angle})`}>
              <line x1="0" y1="0" x2="200" y2="0" stroke="#fff" strokeWidth="2" strokeOpacity="0.85" filter="url(#glow)" />
            </g>
            <circle r={anyHit ? 10 : 6} fill="#ff8a1f" filter="url(#glow)" />
            <text y="210" textAnchor="middle" className="ringtxt">E({cur.k},{n}) · rot {cur.rot}</text>
          </svg>
          <div className="rows">
            {all.map((l, i) => l.on && <StepRow key={i} pattern={l.pattern} step={playing ? step : -1} color={l.color} voice={l.derived ? 'bass = ¬kick' : l.voice} />)}
          </div>
          {n === 12 && patterns[0] && <Piano pattern={patterns[0]} />}
        </section>

        <aside className="panel">
          <div className="transport">
            <button className={`play ${playing ? 'on' : ''}`} onClick={() => { getCtx(); setPlaying((p) => !p); if (playing) { setStep(-1); setAngle(-90) } }}>
              {playing ? '■ STOP' : '▶ PLAY'}
            </button>
            <label className="knob">BPM <b>{bpm}</b><input type="range" min="60" max="180" value={bpm} onChange={(e) => setBpm(+e.target.value)} /></label>
          </div>
          <p className="muted small">Audio starts only after you click Play (browser autoplay rules). Drums are synthesized with Web Audio — no samples.</p>

          <label className="knob">STEPS <b>{n}</b><input type="range" min="3" max="24" value={n} onChange={(e) => { const v = +e.target.value; setN(v); setLayers((ls) => ls.map((l) => ({ ...l, k: Math.min(l.k, v), rot: l.rot % v }))) }} /></label>

          <div className="layer-tabs">
            {layers.map((l, i) => (
              <button key={i} className={i === sel ? 'on' : ''} style={{ '--c': COLORS[i] }} onClick={() => setSel(i)}>
                <input type="checkbox" checked={l.on} onChange={(e) => setLayers((ls) => ls.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} onClick={(e) => e.stopPropagation()} />
                L{i + 1}
              </button>
            ))}
            {layers.length < 3 && <button onClick={() => { setLayers((ls) => [...ls, { voice: ['kick', 'snare', 'bass'][ls.length], k: Math.max(1, Math.floor(n / 3)), rot: 0, on: true }]); setSel(layers.length) }}>+ layer</button>}
            {layers.length > 1 && <button onClick={() => { setLayers((ls) => ls.filter((_, i) => i !== sel)); setSel(0) }}>− remove</button>}
          </div>
          <label className="knob">VOICE
            <select value={cur.voice} onChange={(e) => upd({ voice: e.target.value })}>{VOICES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="knob">HITS <b>{cur.k}</b><input type="range" min="0" max={n} value={cur.k} onChange={(e) => upd({ k: +e.target.value })} /></label>
          <label className="knob">ROTATE <b>{cur.rot}</b><input type="range" min="0" max={n - 1} value={cur.rot} onChange={(e) => upd({ rot: +e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={bassInv} onChange={(e) => setBassInv(e.target.checked)} /> Bass = inverse of kick</label>

          <label className="check"><input type="checkbox" checked={showFold} onChange={(e) => setShowFold(e.target.checked)} /> Show the fold</label>
          {showFold && <Fold k={cur.k} n={n} />}
        </aside>
      </main>

      <MathNotes k={cur.k} n={n} />

      <footer>
        Inspired by <a href="https://x.com/anabology/status/2112601639672566182" target="_blank" rel="noreferrer">@anabology — “Claudia Explains: Euclid”</a> ·
        Euclidean rhythms: G. Toussaint (2005), E. Bjorklund (SNS timing) · Demo Lab throwaway, no data leaves the page.
      </footer>
    </div>
  )
}
