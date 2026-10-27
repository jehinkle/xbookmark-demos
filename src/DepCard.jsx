import { useEffect, useLayoutEffect, useRef } from 'react'
import { nodes, SECTIONS, stateAt, ancestors, sapVersionAt } from './lib/model.js'

export const QC_TEXT = {
  todo: 'Not started', wip: 'Being programmed', prog: 'Programmed, awaiting independent QC',
  mismatch: 'QC mismatch: double-programming diff open', valid: 'Validated (double-programming match)',
  gap: 'Invalidated by SAP §9.4.2 discrepancy, rework queued',
}
const short = (n) => (n.sec >= 0 ? SECTIONS[n.sec].name : 'Root')
export const agentName = (n) => (n.depth === 0 ? 'study statistician' : `agent-${String(n.agent).padStart(2, '0')}`)
export const progText = (n) =>
  n.depth === 0 ? 'Approved before Day 0' : n.redFrom != null && n.d0 < 1e8 ? `Day ${n.d0.toFixed(1)}, rework Day ${n.done.toFixed(1)}` : `Day ${n.done.toFixed(1)}`

function Mini({ i, t, sel, onSelect, role }) {
  const n = nodes[i]
  const st = stateAt(n, t)
  return (
    <button className={`mini st-${st}${i === sel ? ' sel' : ''}${role ? ' ' + role : ''}`} data-idx={i}
      onClick={(e) => { e.stopPropagation(); onSelect(i) }}>
      <div className="mini-top">
        <span className="mini-id">{n.id}</span>
        {n.milestone && <span className="mini-ms">◆ milestone</span>}
        {role === 'extra' && <span className="mini-tag">also upstream</span>}
      </div>
      <div className="mini-title">{n.title}</div>
      <div className="mini-meta">
        <span>{n.kind}</span><span>{short(n)}</span>
        <span>Depth {n.depth}</span><span>{agentName(n)}</span>
        <span>{n.depth ? `Programmed ${progText(n)}` : progText(n)}</span>
      </div>
      <div className={'mini-qc qc-' + st}>{n.depth ? QC_TEXT[st] : `Approved, ${sapVersionAt(t)} in force`}{st === 'valid' && n.depth ? `, Day ${n.qc.toFixed(1)}` : ''}</div>
    </button>
  )
}

export default function DepCard({ sel, t, onSelect, onClose }) {
  const box = useRef(null)
  const n = nodes[sel]
  const path = ancestors(sel).reverse() // SAP first
  const levels = path.map((i, k) => ({ depth: k, primary: i, extra: k + 1 < path.length ? nodes[path[k + 1]].extra : [] }))
  const kids = n.children
  const extraDown = n.extraKids || 0

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  useLayoutEffect(() => {
    const el = box.current?.querySelector(`[data-idx="${sel}"]`)
    if (!el) return
    const b = box.current, r = el.getBoundingClientRect(), br = b.getBoundingClientRect()
    b.scrollTop += r.top - br.top - b.clientHeight / 2 + r.height / 2
  }, [sel])

  return (
    <div className="depcard" onClick={(e) => e.stopPropagation()}>
      <div className="dc-head">
        <div>
          <div className="dc-eyebrow">Dependency chain · {path.length - 1} steps from the SAP</div>
          <div className="dc-title">{n.title}</div>
        </div>
        <button className="dc-x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="dc-body" ref={box}>
        {levels.map((L) => (
          <div className="level" key={L.depth}>
            <div className="lvl-label">Depth {L.depth}{L.depth === 0 ? ' · root' : ''}{L.extra.length ? ` · ${1 + L.extra.length} upstream` : ''}</div>
            <div className="lvl-cards">
              <Mini i={L.primary} t={t} sel={sel} onSelect={onSelect} />
              {L.extra.map((j) => <Mini key={j} i={j} t={t} sel={sel} onSelect={onSelect} role="extra" />)}
            </div>
          </div>
        ))}
        {kids.length > 0 && (
          <div className="level down">
            <div className="lvl-label">Depth {n.depth + 1} · downstream ({kids.length} direct{extraDown ? ` + ${extraDown} cross-links` : ''}, {n.size - 1} total)</div>
            <div className="lvl-cards">
              {kids.slice(0, 6).map((j) => <Mini key={j} i={j} t={t} sel={sel} onSelect={onSelect} role="down" />)}
              {kids.length > 6 && <div className="more">+ {kids.length - 6} more direct dependents</div>}
            </div>
          </div>
        )}
        {!kids.length && <div className="lvl-label end">No downstream dependents: this is a final output.</div>}
      </div>
    </div>
  )
}
