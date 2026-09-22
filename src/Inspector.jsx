import { diagram, proposals } from './ir.js'

export default function Inspector({
  selection,
  onSelectView,
  hideArrows,
  onToggleArrows,
  focusPkgId,
  onGoUp,
}) {
  return (
    <aside className="inspector">
      <h1 className="inspector-title">UML viewer (mock)</h1>
      <p className="inspector-sub">
        Throwaway Demo Lab — React/SVG mock of Uncle Bob&apos;s live Quil viewer.
      </p>

      {focusPkgId && (
        <button type="button" className="breadcrumb" onClick={onGoUp}>
          ← {focusPkgId} (Esc)
        </button>
      )}

      <section className="inspector-section">
        <h2>Diagram</h2>
        <button
          type="button"
          className={`list-row ${selection === 'real' ? 'active' : ''}`}
          onClick={() => onSelectView('real')}
        >
          <span className="row-title">{diagram.title}</span>
          <span className="row-meta">real · in code</span>
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
            <span className="row-title">{p.title}</span>
            <span className="row-meta">not in code</span>
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

      <section className="inspector-section legend">
        <h2>Legend</h2>
        <ul>
          <li>
            <span className="swatch green" /> low CRAP μ
          </li>
          <li>
            <span className="swatch yellow" /> mid CRAP μ
          </li>
          <li>
            <span className="swatch red" /> high CRAP μ
          </li>
          <li>
            <span className="swatch viol" /> Dependency Rule violation
          </li>
        </ul>
        <p className="tiny">
          Levels: Domain (0) &lt; Application/UseCases (1) &lt; Adapters (2). Red
          when an edge points outward (inner → outer).
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
        <a
          href="https://x.com/unclebobmartin/status/2102079838639038629"
          target="_blank"
          rel="noreferrer"
        >
          X post
        </a>
      </footer>
    </aside>
  )
}
