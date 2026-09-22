export default function ClassCard({ cls, onClose }) {
  if (!cls) return null
  const fields = cls.fields || []
  const ops = cls.ops || []

  return (
    <div className="class-card-backdrop" onClick={onClose} role="presentation">
      <div
        className="class-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${cls.name} class card`}
      >
        <header>
          <div>
            <h2>
              {cls.stereotype === 'interface' ? '«interface» ' : ''}
              {cls.name}
            </h2>
            <p className="card-meta">
              CRAP μ {cls.crap?.mu ?? '—'}
              {cls.coverage != null && <> · coverage {(cls.coverage * 100).toFixed(0)}%</>}
              {cls.cc != null && <> · cc {cls.cc}</>}
            </p>
          </div>
          <button type="button" className="card-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {fields.length > 0 && (
          <section>
            <h3>Fields</h3>
            <ul>
              {fields.map((f) => (
                <li key={f.name}>
                  <code>
                    {f.name}: {f.type}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ops.length > 0 && (
          <section>
            <h3>Operations</h3>
            <table>
              <thead>
                <tr>
                  <th>op</th>
                  <th>cc</th>
                  <th>crap</th>
                  <th>cov</th>
                  <th>killed</th>
                  <th>surv</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => (
                  <tr key={op.name}>
                    <td>
                      <code>
                        +{op.name}
                        ({(op.args || []).join(', ')})
                        {op.returns ? `: ${op.returns}` : ''}
                      </code>
                    </td>
                    <td>{op.cc ?? '—'}</td>
                    <td>{op.crap ?? '—'}</td>
                    <td>
                      {op.coverage != null
                        ? `${(op.coverage * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td>{op.killed ?? '—'}</td>
                    <td>{op.survived ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {fields.length === 0 && ops.length === 0 && (
          <p className="card-empty">No members in IR.</p>
        )}

        <p className="card-hint">Esc closes · mock metrics from library.edn</p>
      </div>
    </div>
  )
}
