import { useMemo, useState } from 'react'
import { EDGE_KINDS, seedIr } from './ir.js'

export default function Inspector({
  selection,
  onSelectView,
  hideArrows,
  onToggleArrows,
  edgeKindFilter,
  onToggleEdgeKind,
  explodedCount,
  selectedModule,
  onGoUp,
  onResetLayout,
  ir,
  onMoveModulePackage,
  onAddEdge,
  onRemoveEdge,
  onResetIr,
}) {
  const proposals = (ir || seedIr).proposals || []
  const drilled = explodedCount > 0 || selectedModule

  const [edgeFrom, setEdgeFrom] = useState('')
  const [edgeTo, setEdgeTo] = useState('')
  const [edgeKind, setEdgeKind] = useState(EDGE_KINDS[0])
  const [edgeStrength, setEdgeStrength] = useState('strong')

  // Edit the underlying seed IR (not the proposal overlay)
  const basePkgs = ir?.packages || []
  const baseMods = ir?.modules || []
  const packages = useMemo(
    () =>
      basePkgs.map((p) => ({
        ...p,
        modules: baseMods.filter((m) => m.package === p.id),
      })),
    [basePkgs, baseMods],
  )
  const allModules = useMemo(
    () => baseMods.map((m) => ({ id: m.id, name: m.name, package: m.package })),
    [baseMods],
  )
  const edges = ir?.edges || []
  const moduleName = (id) => {
    const m = baseMods.find((x) => x.id === id)
    return m?.name || id
  }

  const submitEdge = (e) => {
    e.preventDefault()
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return
    onAddEdge({
      from: edgeFrom,
      to: edgeTo,
      kind: edgeKind,
      strength: edgeStrength,
    })
    setEdgeFrom('')
    setEdgeTo('')
  }

  return (
    <aside className="inspector">
      <h1 className="inspector-title">SAS UML (IR mock)</h1>
      <p className="inspector-sub">
        Demo Lab — React/SVG viewer driven by a SAS IR seed (not Clojure).
      </p>

      {drilled && (
        <button type="button" className="breadcrumb" onClick={onGoUp}>
          ← collapse (Esc)
        </button>
      )}

      <section className="inspector-section">
        <h2>Interaction</h2>
        <ul className="hint-list">
          <li>
            <strong>Drag</strong> a package header or module to move it — edges
            re-route live.
          </li>
          <li>
            Exploded modules float freely in <strong>all directions</strong>; the
            package hub size stays fixed.
          </li>
          <li>
            <strong>Empty canvas</strong> drag pans · hold <kbd>Alt</kbd> and
            drag anywhere to pan.
          </li>
          <li>
            <strong>Double-click</strong> a package (or ⤢) to explode / collapse
            modules.
          </li>
          <li>
            <strong>Double-click</strong> a module to open the detail window
            (path, metrics, edges, evidence).
          </li>
          <li>Wheel zooms · Esc collapses.</li>
        </ul>
        <button type="button" className="reset-btn" onClick={onResetLayout}>
          Reset layout
        </button>
      </section>

      <section className="inspector-section">
        <h2>Diagram</h2>
        <button
          type="button"
          className={`list-row ${selection === 'real' ? 'active' : ''}`}
          onClick={() => onSelectView('real')}
        >
          <span className="row-title">{(ir || seedIr).title}</span>
          <span className="row-meta">real · seed IR</span>
        </button>
      </section>

      <section className="inspector-section">
        <h2>Proposals</h2>
        {proposals.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`list-row ${selection === p.id ? 'active' : ''}`}
            onClick={() => onSelectView(p.id)}
          >
            <span className="row-title">{p.label}</span>
            <span className="row-meta">what-if · not in code</span>
          </button>
        ))}
      </section>

      <section className="inspector-section ir-editor">
        <h2>IR relationships</h2>
        <p className="tiny ir-editor-note">
          In-memory edit of the loaded seed (membership + edges). Demo-sized —
          not persisted.
        </p>

        <h3 className="ir-subhead">Packages → modules</h3>
        <ul className="ir-pkg-list">
          {packages.map((pkg) => (
            <li key={pkg.id} className="ir-pkg">
              <div className="ir-pkg-label">
                {pkg.label}{' '}
                <span className="row-meta">L{pkg.level}</span>
              </div>
              <ul className="ir-mod-list">
                {(pkg.modules || []).length === 0 && (
                  <li className="ir-empty">— empty —</li>
                )}
                {(pkg.modules || []).map((mod) => (
                  <li key={mod.id} className="ir-mod-row">
                    <code className="ir-mod-name" title={mod.id}>
                      {mod.name}
                    </code>
                    <select
                      className="ir-select"
                      aria-label={`Move ${mod.name} to package`}
                      value={pkg.id}
                      onChange={(e) => onMoveModulePackage(mod.id, e.target.value)}
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <h3 className="ir-subhead">Edges ({edges.length})</h3>
        <ul className="ir-edge-list">
          {edges.map((edge, i) => {
            return (
              <li key={`${edge.from}-${edge.to}-${edge.kind}-${i}`} className="ir-edge-row">
                <div className="ir-edge-text">
                  <code>{moduleName(edge.from)}</code>
                  <span className="ir-arrow">→</span>
                  <code>{moduleName(edge.to)}</code>
                  <span className="edge-kind">
                    {edge.kind}
                    {edge.strength === 'weak' ? ' · weak' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="ir-remove"
                  aria-label="Remove edge"
                  onClick={() => onRemoveEdge(i)}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>

        <form className="ir-add-edge" onSubmit={submitEdge}>
          <h3 className="ir-subhead">Add edge</h3>
          <label className="ir-field">
            <span>From</span>
            <select
              className="ir-select"
              value={edgeFrom}
              onChange={(e) => setEdgeFrom(e.target.value)}
              required
            >
              <option value="">—</option>
              {allModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ir-field">
            <span>To</span>
            <select
              className="ir-select"
              value={edgeTo}
              onChange={(e) => setEdgeTo(e.target.value)}
              required
            >
              <option value="">—</option>
              {allModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ir-field">
            <span>Kind</span>
            <select
              className="ir-select"
              value={edgeKind}
              onChange={(e) => setEdgeKind(e.target.value)}
            >
              {EDGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="ir-field">
            <span>Strength</span>
            <select
              className="ir-select"
              value={edgeStrength}
              onChange={(e) => setEdgeStrength(e.target.value)}
            >
              <option value="strong">strong</option>
              <option value="weak">weak</option>
            </select>
          </label>
          <button type="submit" className="reset-btn ir-add-btn">
            Add edge
          </button>
        </form>

        <button type="button" className="reset-btn ir-reset-seed" onClick={onResetIr}>
          Reset seed IR
        </button>
      </section>

      <section className="inspector-section">
        <h2>Declutter</h2>
        <div className="toggle-row">
          <button
            type="button"
            className={!hideArrows ? 'chip active' : 'chip'}
            onClick={() => onToggleArrows(false)}
          >
            All arrows
          </button>
          <button
            type="button"
            className={hideArrows ? 'chip active' : 'chip'}
            onClick={() => onToggleArrows(true)}
          >
            Hide arrows
          </button>
        </div>
      </section>

      <section className="inspector-section">
        <h2>Edge kinds</h2>
        <div className="toggle-row">
          {EDGE_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={edgeKindFilter.has(k) ? 'chip active' : 'chip'}
              onClick={() => onToggleEdgeKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </section>

      <section className="inspector-section legend">
        <h2>Legend</h2>
        <ul>
          <li>
            <span className="swatch green" /> low heat
          </li>
          <li>
            <span className="swatch yellow" /> mid heat
          </li>
          <li>
            <span className="swatch red" /> high heat
          </li>
          <li>
            <span className="swatch viol" /> Dependency Rule violation
          </li>
          <li>solid = strong · dashed = weak</li>
        </ul>
        <p className="tiny">
          Levels: macros(0) &lt; adam(1) &lt; tfl(2) &lt; qc(3) &lt; drivers(4).
          Red when a <em>strong</em> edge has from.level &lt; to.level (inner depends
          on outer).
        </p>
      </section>

      <footer className="inspector-credit">
        <a
          href="https://github.com/unclebob/uml-viewer"
          target="_blank"
          rel="noreferrer"
        >
          unclebob/uml-viewer
        </a>
        <br />
        <span className="credit-note">IR sketch for SAS — Demo Lab</span>
      </footer>
    </aside>
  )
}
