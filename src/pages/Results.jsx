import { useMemo, useState } from 'react'
import { SITES, STUDY, SUBJECTS } from '../lib/data.js'
import { EMPTY_FILTERS, SORTS, activeChips, matches } from '../lib/filters.js'
import FilterRail from '../components/FilterRail.jsx'
import SubjectCard from '../components/SubjectCard.jsx'
import Modal from '../components/Modal.jsx'
import { IconChevron, IconClose, IconFilter, IconInfo, IconSearch } from '../components/Icons.jsx'

export const PAGE_SIZE = 12

function PromoCard({ onSchedule }) {
  return (
    <aside className="card promo">
      <div className="promo-inner">
        <span className="promo-kicker">
          <IconInfo size={16} /> Protocol at a glance
        </span>
        <h3>{STUDY.id}</h3>
        <p>{STUDY.design}.</p>
        <ul>
          <li>3 arms: Placebo, Low dose (100 mg), High dose (300 mg)</li>
          <li>21-day cycles × 8, then 30 and 90 day follow-up</li>
          <li>Primary endpoint: {STUDY.primaryEndpoint}</li>
        </ul>
        <button className="btn light" onClick={onSchedule}>
          View visit schedule
        </button>
        <p className="promo-tip">Tip: tick “Compare” on up to 3 cards to line them up side by side.</p>
      </div>
    </aside>
  )
}

const SCHEDULE = [
  ['Screening', 'Day −28 to −1', 'Consent, eligibility, labs, ECOG, ECG'],
  ['Randomization', 'Day 1', 'IxRS randomization 1:1:1, stratified by ECOG'],
  ['C1D1 / C1D8 / C1D15', 'Days 1, 8, 15', 'Dosing start, safety labs, AE review'],
  ['C2D1 – C8D1', 'Every 21 days', 'Dispense study drug, labs, AE review, PK (C2, C4)'],
  ['End of treatment', 'Last dose + 7 d', 'Labs, ECG, drug accountability'],
  ['FU1 / FU2', '+30 d / +90 d', 'Safety follow-up, survival status'],
]

export default function Results({ filters, setFilters, sort, setSort, visible, setVisible, favorites, toggleFav, compare, toggleCompare, flagged, railOpen, setRailOpen, openSubject }) {
  const [studyModal, setStudyModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)

  const results = useMemo(() => {
    const sorter = SORTS.find((s) => s.key === sort)?.fn ?? SORTS[0].fn
    return SUBJECTS.filter((s) => matches(s, filters)).sort(sorter)
  }, [filters, sort])

  const chips = activeChips(filters)
  const shown = results.slice(0, visible)
  const update = (fn) => {
    setFilters(fn)
    setVisible(PAGE_SIZE)
  }

  const siteLine =
    !filters.site.length || filters.site.length === SITES.length
      ? `All ${SITES.length} sites`
      : filters.site.length <= 2
        ? filters.site.map((c) => SITES.find((s) => s.code === c).name).join(', ')
        : `${filters.site.length} of ${SITES.length} sites`

  const jumpToSites = () => {
    if (!railOpen) setRailOpen(true)
    setTimeout(() => document.getElementById('filter-site')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const items = []
  shown.forEach((s, i) => {
    if (i === 4) items.push(<PromoCard key="promo" onSchedule={() => setScheduleModal(true)} />)
    items.push(
      <SubjectCard
        key={s.id}
        subject={s}
        fav={favorites.includes(s.id)}
        onFav={toggleFav}
        compared={compare.includes(s.id)}
        compareFull={compare.length >= 3}
        onCompare={toggleCompare}
        flagged={flagged.includes(s.id)}
        onOpen={openSubject}
      />,
    )
  })
  if (shown.length > 0 && shown.length <= 4) items.push(<PromoCard key="promo" onSchedule={() => setScheduleModal(true)} />)

  return (
    <main className="page results-page">
      <button className="back-link" onClick={() => setStudyModal(true)}>
        <IconChevron dir="left" /> Change Study
      </button>
      <h1 className="page-title">
        Study {STUDY.id} <span className="title-sep">·</span> Subject Inventory
      </h1>
      <p className="page-sub">
        {STUDY.phase} · {STUDY.design} · Data cut Sep 30, 2026
      </p>

      <div className={`layout ${railOpen ? '' : 'rail-hidden'}`}>
        <aside className="rail" aria-label="Filters">
          <div className="rail-top">
            <button className="hide-filters" onClick={() => setRailOpen(!railOpen)} aria-expanded={railOpen}>
              {railOpen ? <IconClose size={18} /> : <IconFilter />}
              {railOpen ? 'Hide Filters' : 'Show Filters'}
              {!railOpen && chips.length > 0 && <span className="rail-count">{chips.length}</span>}
            </button>
            {railOpen && (
              <p className="context-line">
                Showing sites:{' '}
                <button className="link-btn" onClick={jumpToSites}>
                  {siteLine}
                </button>
              </p>
            )}
          </div>
          {railOpen && <FilterRail filters={filters} setFilters={update} />}
        </aside>

        <section className="results" aria-label="Results">
          <div className="toolbar">
            <label className="search">
              <IconSearch />
              <input
                type="search"
                placeholder="Search subject ID, site, AE term, con med…"
                value={filters.search}
                onChange={(e) => update((f) => ({ ...f, search: e.target.value }))}
                aria-label="Search subjects"
              />
            </label>
            <label className="sort">
              <span>Sort by:</span>
              <div className="select-wrap">
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <IconChevron />
              </div>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((c) => (
                <button key={c.id} className="chip" onClick={() => update(c.remove)}>
                  {c.label} <IconClose size={14} />
                </button>
              ))}
              <button className="chip ghost" onClick={() => update(() => ({ ...EMPTY_FILTERS }))}>
                Remove All
              </button>
            </div>
          )}

          <div className="result-count" aria-live="polite">
            <strong>{results.length}</strong> of {SUBJECTS.length} subjects match
            {favorites.length > 0 && <span className="muted"> · {favorites.length} favorited</span>}
          </div>

          {results.length === 0 ? (
            <div className="empty">
              <h3>No subjects match these filters</h3>
              <p>Try widening the age or days-on-study range, or remove a filter.</p>
              <button className="btn primary" onClick={() => update(() => ({ ...EMPTY_FILTERS }))}>
                Remove All Filters
              </button>
            </div>
          ) : (
            <div className="grid">{items}</div>
          )}

          {results.length > 0 && (
            <div className="load-more">
              <p>
                Showing {shown.length} of {results.length}
              </p>
              <div className="progress">
                <span style={{ width: `${(shown.length / results.length) * 100}%` }} />
              </div>
              {shown.length < results.length && (
                <button className="btn outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Load More
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {studyModal && (
        <Modal title="Change study" onClose={() => setStudyModal(false)}>
          <ul className="study-list">
            <li className="current">
              <strong>{STUDY.id}</strong> · {STUDY.phase}
              <span className="muted">{STUDY.title}</span>
              <span className="pill">Current</span>
            </li>
            <li className="disabled">
              <strong>DEMO-LAB-002</strong> · Phase 1b
              <span className="muted">Not available in this demo</span>
            </li>
            <li className="disabled">
              <strong>DEMO-LAB-003</strong> · Phase 3
              <span className="muted">Not available in this demo</span>
            </li>
          </ul>
        </Modal>
      )}
      {scheduleModal && (
        <Modal title={`${STUDY.id} · Visit schedule`} onClose={() => setScheduleModal(false)}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Visit</th>
                <th>Timing</th>
                <th>Key assessments</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((r) => (
                <tr key={r[0]}>
                  {r.map((c) => (
                    <td key={c}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">Synthetic protocol for demo purposes only.</p>
        </Modal>
      )}
    </main>
  )
}
