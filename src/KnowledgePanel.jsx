import { CATEGORIES, inboundRefs, outboundRefs } from './knowledge'

/**
 * @param {{
 *   entities: import('./knowledge').Entity[],
 *   edges: { id: string, from: string, to: string, field: string }[],
 *   included: Set<string>,
 *   onToggleInclude: (id: string) => void,
 *   onIncludeAll: () => void,
 *   onExcludeAll: () => void,
 *   selectedId: string | null,
 *   onSelect: (id: string | null) => void,
 *   sampleLinkOn: boolean,
 *   onToggleSampleLink: () => void,
 *   search: string,
 *   onSearch: (q: string) => void,
 * }} props
 */
export default function KnowledgePanel({
  entities,
  edges,
  included,
  onToggleInclude,
  onIncludeAll,
  onExcludeAll,
  selectedId,
  onSelect,
  sampleLinkOn,
  onToggleSampleLink,
  search,
  onSearch,
}) {
  const q = search.trim().toLowerCase()
  const filtered = entities.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.tag.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.fields.some((f) => f.name.toLowerCase().includes(q)),
  )

  const selected = entities.find((e) => e.id === selectedId) || null
  const out = selected ? outboundRefs(selected.id, edges) : []
  const inn = selected ? inboundRefs(selected.id, edges) : []

  return (
    <aside className="kb-panel">
      <div className="kb-panel-head">
        <h2>Knowledge DB</h2>
        <p className="kb-sub">Source of truth · {entities.length} entities</p>
        <input
          className="kb-search"
          type="search"
          placeholder="Search entities / fields…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="kb-tools">
        <label className="kb-check">
          <input
            type="checkbox"
            checked={sampleLinkOn}
            onChange={onToggleSampleLink}
          />
          <span>
            Sample FK: <code>study.ownerUserId → user</code>
          </span>
        </label>
        <div className="kb-bulk">
          <button type="button" className="kb-linkbtn" onClick={onIncludeAll}>
            Include all
          </button>
          <button type="button" className="kb-linkbtn" onClick={onExcludeAll}>
            Exclude all
          </button>
        </div>
      </div>

      <ul className="kb-list">
        {filtered.map((e) => {
          const cat = CATEGORIES[e.category]
          const on = included.has(e.id)
          return (
            <li
              key={e.id}
              className={`kb-item ${selectedId === e.id ? 'kb-item-sel' : ''}`}
            >
              <label className="kb-item-check" title="Include in diagram">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleInclude(e.id)}
                />
              </label>
              <button
                type="button"
                className="kb-item-btn"
                onClick={() => onSelect(e.id === selectedId ? null : e.id)}
              >
                <span
                  className="kb-swatch"
                  style={{ background: cat.header, borderColor: cat.border }}
                />
                <span className="kb-item-name">{e.name}</span>
                <span className="kb-item-tag" style={{ color: cat.accent }}>
                  {e.tag}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {selected && (
        <div className="kb-detail">
          <h3>
            <span
              className="kb-swatch"
              style={{
                background: CATEGORIES[selected.category].header,
                borderColor: CATEGORIES[selected.category].border,
              }}
            />
            {selected.name}
            <span className="kb-item-tag">
              {selected.tag} · {selected.category}
            </span>
          </h3>
          <table className="kb-fields">
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {selected.fields.map((f) => (
                <tr key={f.name}>
                  <td>
                    {f.isPk && <span className="badge pk">PK</span>}
                    {f.isFk && <span className="badge fk">FK</span>}
                    {f.name}
                  </td>
                  <td>{f.type}</td>
                  <td className="kb-ref">
                    {f.refEntity ? `→ ${f.refEntity}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="kb-refs">
            <div>
              <strong>Outbound</strong>
              {out.length === 0 && <p className="muted">None</p>}
              <ul>
                {out.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onSelect(r.to)}>
                      .{r.field} → {r.to}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Inbound</strong>
              {inn.length === 0 && <p className="muted">None</p>}
              <ul>
                {inn.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onSelect(r.from)}>
                      {r.from}.{r.field}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
