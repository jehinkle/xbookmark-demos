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
}) {
  const proposals = seedIr.proposals || []
  const drilled = explodedCount > 0 || selectedModule

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
          <span className="row-title">{seedIr.title}</span>
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
