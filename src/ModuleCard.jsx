import { edgesForModule } from './ir.js'

function EdgeList({ title, items, moduleMap }) {
  if (!items.length) return null
  return (
    <section>
      <h3>{title}</h3>
      <ul className="edge-list">
        {items.map((e, i) => {
          const otherId = title.startsWith('Out') ? e.to : e.from
          const other = moduleMap.get(otherId)
          const snip = e.evidence?.[0]
          return (
            <li key={`${e.from}-${e.to}-${e.kind}-${i}`}>
              <div className="edge-row">
                <code>{other?.name || otherId}</code>
                <span className="edge-kind">
                  {e.kind}
                  {e.strength === 'weak' ? ' · weak' : ''}
                </span>
              </div>
              {snip?.snippet && (
                <pre className="evidence">{snip.path}:{snip.line} — {snip.snippet}</pre>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function ModuleCard({ mod, view, onClose }) {
  if (!mod) return null
  const m = mod.metrics || {}
  const outbound = edgesForModule(mod.id, view.edges, 'out')
  const inbound = edgesForModule(mod.id, view.edges, 'in')

  return (
    <div className="class-card-backdrop" onClick={onClose} role="presentation">
      <div
        className="class-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${mod.name} module card`}
      >
        <header>
          <div>
            <h2>{mod.name}</h2>
            <p className="card-meta">
              {mod.kind} · pkg {mod.package}
              {m.heat != null && <> · heat {m.heat}</>}
              {m.loc != null && <> · {m.loc} loc</>}
            </p>
          </div>
          <button type="button" className="card-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <section>
          <h3>Path</h3>
          <code className="path-code">{mod.path}</code>
        </section>

        {mod.exports?.length > 0 && (
          <section>
            <h3>Exports</h3>
            <ul>
              {mod.exports.map((ex) => (
                <li key={ex}>
                  <code>{ex}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(m.loc != null || m.macroCallCount != null || m.hasQcTwin != null) && (
          <section>
            <h3>Metrics</h3>
            <ul className="metrics-list">
              {m.loc != null && <li>LOC: {m.loc}</li>}
              {m.pctIfDepthMax != null && <li>%IF depth max: {m.pctIfDepthMax}</li>}
              {m.macroCallCount != null && <li>Macro calls: {m.macroCallCount}</li>}
              {m.hasQcTwin != null && <li>QC twin: {m.hasQcTwin ? 'yes' : 'no'}</li>}
              {m.heat != null && <li>Heat: {m.heat}</li>}
            </ul>
          </section>
        )}

        <EdgeList title="Outbound edges" items={outbound} moduleMap={view.moduleMap} />
        <EdgeList title="Inbound edges" items={inbound} moduleMap={view.moduleMap} />

        <p className="card-hint">Esc closes · evidence from adam-tfl.seed.json</p>
      </div>
    </div>
  )
}
