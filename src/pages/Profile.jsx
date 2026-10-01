import { useRef, useState } from 'react'
import { LAB_DEFS, STUDY, SUBJECTS, SUBJECT_BY_ID, diffDays, DATA_CUT, fmtDate, maxGrade } from '../lib/data.js'
import { ArmTag, FlagChips, GradePill, StatusBadge } from '../components/Badges.jsx'
import { IconChevron, IconFlag, IconHeart, IconLink, IconNote } from '../components/Icons.jsx'
import Sparkline from '../components/Sparkline.jsx'
import SubjectArt from '../components/SubjectArt.jsx'

const TABS = [
  ['overview', 'Overview'],
  ['visits', 'Visits & Dosing'],
  ['aes', 'Adverse Events'],
  ['labs', 'Labs'],
  ['conmeds', 'Con meds'],
  ['deviations', 'Protocol deviations'],
  ['disposition', 'Disposition'],
]

function Group({ title, meta, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`group ${open ? 'open' : ''}`}>
      <button className="group-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="group-title">{title}</span>
        {meta && <span className="group-meta">{meta}</span>}
        <IconChevron dir={open ? 'up' : 'down'} />
      </button>
      {open && <div className="group-body">{children}</div>}
    </div>
  )
}

function KV({ rows }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Journey({ s }) {
  const cycle = Math.max(0, ...s.visits.filter((v) => v.cycle && v.status === 'Completed').map((v) => v.cycle))
  const steps = [
    { label: 'Screening', done: true },
    { label: 'Randomized', done: !!s.randDate && s.status !== 'Screening' },
    { label: `Treatment${cycle ? ` · C${cycle}/8` : ''}`, done: cycle > 0 },
    { label: 'Follow-up', done: ['Follow-up', 'Completed'].includes(s.status) },
    { label: s.status === 'Discontinued' ? 'Discontinued' : s.status === 'Screen failed' ? 'Screen failed' : 'Completed', done: ['Completed', 'Discontinued', 'Screen failed'].includes(s.status), end: true },
  ]
  const bad = s.status === 'Discontinued' || s.status === 'Screen failed'
  return (
    <ol className="journey">
      {steps.map((st, i) => (
        <li key={i} className={`${st.done ? 'done' : ''} ${st.end && bad ? 'bad' : ''}`}>
          <span className="node" />
          <span className="jl">{st.label}</span>
        </li>
      ))}
    </ol>
  )
}

function Overview({ s, notes }) {
  return (
    <div className="groups">
      <Group title="Demographics" meta={`${s.age} y · ${s.sex}`}>
        <KV rows={[['Age', `${s.age} years`], ['Sex', s.sex], ['Race', s.race], ['Ethnicity', s.ethnicity], ['Height', `${s.heightCm} cm`], ['Weight', `${s.weightKg} kg`], ['BMI', `${s.bmi} kg/m² · ${s.bmiBand}`], ['Initials (synthetic)', s.initials]]} />
      </Group>
      <Group title="Baseline characteristics" meta={`ECOG ${s.ecog}`}>
        <KV
          rows={[
            ['ECOG performance status', s.ecog],
            ...LAB_DEFS.map((d) => [`Baseline ${d.key}`, s.labs[d.key][0] ? `${s.labs[d.key][0].value} ${d.unit}` : '—']),
            ['Medical history', s.medicalHistory.length ? s.medicalHistory.join(', ') : 'None reported'],
          ]}
        />
      </Group>
      <Group title="Study participation" meta={s.arm.label}>
        <KV
          rows={[
            ['Study', `${STUDY.id} · ${STUDY.phase}`],
            ['Arm', s.arm.label],
            ['Planned dose', s.arm.key === 'Placebo' ? 'Matching placebo QD' : s.arm.dose ? `${s.arm.dose} mg QD` : '—'],
            ['Site', `${s.site.code} · ${s.site.name} (${s.site.city})`],
            ['Principal investigator', s.site.pi],
            ['Screening number', s.screeningNo],
          ]}
        />
      </Group>
      <Group title="Safety snapshot" meta={s.aes.length ? `${s.aes.length} AEs · max G${maxGrade(s)}` : 'No AEs'}>
        <FlagChips flags={s.flags} />
        <KV
          rows={[
            ['Adverse events', s.aes.length],
            ['Serious adverse events', s.aes.filter((a) => a.serious).length],
            ['Grade 3+ events', s.aes.filter((a) => a.grade >= 3).length],
            ['Protocol deviations', s.deviations.length ? `${s.deviations.length} (highest: ${s.deviationLevel})` : 'None'],
          ]}
        />
      </Group>
      <Group title="Review notes" meta={notes.length ? `${notes.length}` : 'None yet'} defaultOpen={notes.length > 0}>
        {notes.length ? (
          <ul className="notes">
            {notes.map((n, i) => (
              <li key={i}>
                <p>{n.text}</p>
                <span>{n.at}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Use “Add note” in the summary panel. Notes stay in this browser only.</p>
        )}
      </Group>
    </div>
  )
}

function Visits({ s }) {
  const cycles = Array.from({ length: STUDY.maxCycles }, (_, i) => {
    const v = s.visits.find((x) => x.cycle === i + 1 && x.day === 1)
    return { c: i + 1, v }
  })
  const phases = [...new Set(s.visits.map((v) => v.phase))]
  return (
    <div>
      <div className="dose-strip-wrap">
        <h4>Dosing by cycle</h4>
        <div className="dose-strip">
          {cycles.map(({ c, v }) => {
            const ongoing = ['On treatment', 'Randomized'].includes(s.status)
            const kind = !v ? (ongoing ? 'planned' : 'none') : v.status === 'Scheduled' ? 'planned' : v.dose?.kind ?? 'none'
            return (
              <div key={c} className={`dose-cell ${kind}`} title={v ? `C${c}D1 · ${fmtDate(v.date)} · ${v.dose?.label ?? ''} (${v.status})` : `C${c} · not reached`}>
                <span className="dc">C{c}</span>
                <span className="dl">{kind === 'planned' ? 'Planned' : !v ? 'Not reached' : v.dose?.label}</span>
              </div>
            )
          })}
        </div>
        <div className="legend">
          <span><i className="lg full" /> Full dose</span>
          <span><i className="lg reduced" /> Reduced</span>
          <span><i className="lg held" /> Held</span>
          <span><i className="lg planned" /> Planned</span>
        </div>
      </div>
      <div className="groups">
        {phases.map((p, i) => {
          const vs = s.visits.filter((v) => v.phase === p)
          const done = vs.filter((v) => v.status !== 'Scheduled').length
          return (
            <Group key={p} title={p} meta={`${done}/${vs.length} visits · ${fmtDate(vs[0].date)}`} defaultOpen={i >= phases.length - 2}>
              <ol className="timeline">
                {vs.map((v) => (
                  <li key={v.name} className={`tl-${v.status.toLowerCase()}`}>
                    <span className="tl-node" />
                    <div className="tl-main">
                      <strong>{v.name}</strong>
                      <span className="muted">
                        {fmtDate(v.date)} · Study day {v.studyDay}
                      </span>
                    </div>
                    {v.dose && <span className={`dose-tag ${v.dose.kind}`}>{v.dose.label}</span>}
                    <span className={`visit-status ${v.status.toLowerCase()}`}>{v.status}</span>
                  </li>
                ))}
              </ol>
            </Group>
          )
        })}
      </div>
    </div>
  )
}

function Table({ cols, rows, empty }) {
  if (!rows.length) return <div className="empty small">{empty}</div>
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}

function AdverseEvents({ s }) {
  return (
    <Table
      cols={['ID', 'Grade', 'Term (MedDRA PT)', 'Start', 'End', 'Relatedness', 'Serious', 'Action taken']}
      empty="No adverse events reported."
      rows={s.aes.map((a) => (
        <tr key={a.id} className={a.serious ? 'row-serious' : ''}>
          <td className="mono">{a.id}</td>
          <td><GradePill grade={a.grade} /></td>
          <td>{a.term}</td>
          <td>{fmtDate(a.start)}</td>
          <td>{a.end ? fmtDate(a.end) : <span className="ongoing">Ongoing</span>}</td>
          <td>{a.relatedness}</td>
          <td>{a.serious ? <span className="sae-tag">SAE</span> : 'No'}</td>
          <td>{a.action}</td>
        </tr>
      ))}
    />
  )
}

function Labs({ s }) {
  const [showTable, setShowTable] = useState(false)
  const timepoints = s.labs.ALT.map((p) => p.visit)
  return (
    <div>
      <div className="lab-grid">
        {LAB_DEFS.map((def) => {
          const pts = s.labs[def.key]
          const last = pts[pts.length - 1]
          const first = pts[0]
          const oor = last && (last.value < def.low || last.value > def.high)
          return (
            <div key={def.key} className="lab-card">
              <div className="lab-head">
                <div>
                  <strong>{def.key}</strong>
                  <span className="muted">{def.name}</span>
                </div>
                <div className={`lab-last ${oor ? 'out' : ''}`}>
                  {last ? last.value : '—'} <small>{def.unit}</small>
                </div>
              </div>
              <Sparkline points={pts} def={def} width={520} height={110} />
              <div className="lab-foot">
                <span>Ref {def.low}–{def.high} {def.unit}</span>
                {first && last && pts.length > 1 && (
                  <span>
                    Δ from baseline {last.value - first.value >= 0 ? '+' : ''}
                    {(last.value - first.value).toFixed(def.digits)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <button className="link-btn" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Hide values table' : 'Show all values'}
      </button>
      {showTable && (
        <Table
          cols={['Analyte', ...timepoints]}
          empty="No lab results."
          rows={LAB_DEFS.map((def) => (
            <tr key={def.key}>
              <th>{def.key}</th>
              {s.labs[def.key].map((p, i) => (
                <td key={i} className={p.value < def.low || p.value > def.high ? 'cell-out' : ''}>
                  {p.value}
                </td>
              ))}
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function ConMeds({ s }) {
  return (
    <Table
      cols={['Medication', 'Dose / frequency', 'Route', 'Indication', 'Start', 'End']}
      empty="No concomitant medications recorded."
      rows={s.conmeds.map((c, i) => (
        <tr key={i}>
          <td><strong>{c.name}</strong></td>
          <td>{c.dose}</td>
          <td>{c.route}</td>
          <td>{c.indication}</td>
          <td>{fmtDate(c.start)}</td>
          <td>{c.end ? fmtDate(c.end) : <span className="ongoing">Ongoing</span>}</td>
        </tr>
      ))}
    />
  )
}

function Deviations({ s }) {
  return (
    <Table
      cols={['ID', 'Date', 'Category', 'Severity', 'Description', 'Status']}
      empty="No protocol deviations recorded."
      rows={s.deviations.map((d) => (
        <tr key={d.id}>
          <td className="mono">{d.id}</td>
          <td>{fmtDate(d.date)}</td>
          <td>{d.category}</td>
          <td><span className={`sev ${d.severity.toLowerCase()}`}>{d.severity}</span></td>
          <td>{d.description}</td>
          <td>{d.status}</td>
        </tr>
      ))}
    />
  )
}

function Disposition({ s }) {
  const ms = [
    ['Informed consent', s.consentDate],
    ['Randomization', s.randDate],
    ['First dose', s.firstDose],
    ['Last dose', s.lastDose],
    [s.status === 'Screen failed' ? 'Screen failure' : s.status === 'Discontinued' ? 'Discontinuation' : 'Study completion', s.endDate],
  ]
  return (
    <div className="disp">
      <div className={`disp-card tone-${s.disposition.group === 'Active' ? 'green' : s.disposition.group === 'Completed' ? 'gray' : 'red'}`}>
        <span className="overline">{s.disposition.group}</span>
        <h3>{s.disposition.reason}</h3>
        <p>{s.disposition.detail}</p>
        {s.disposition.date && <p className="muted">Recorded {fmtDate(s.disposition.date)}</p>}
      </div>
      <ol className="milestones">
        {ms.map(([k, d]) => (
          <li key={k} className={d ? 'done' : ''}>
            <span className="node" />
            <strong>{k}</strong>
            <span className="muted">{d ? `${fmtDate(d)} · Day ${diffDays(s.consentDate, d) + 1}` : 'Not reached'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function similarTo(s) {
  return SUBJECTS.filter((x) => x.id !== s.id)
    .map((x) => ({
      x,
      score: (x.arm.key === s.arm.key ? 3 : 0) + (x.status === s.status ? 2 : 0) + (Math.abs(x.age - s.age) <= 8 ? 1.5 : 0) + (x.site.code === s.site.code ? 1 : 0) + (x.ecog === s.ecog ? 1 : 0) + (x.sex === s.sex ? 0.5 : 0) - Math.abs(x.daysOnStudy - s.daysOnStudy) / 400,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((r) => r.x)
}

function Similar({ s, openSubject }) {
  const ref = useRef(null)
  const items = similarTo(s)
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className="similar">
      <div className="similar-head">
        <h2>Similar subjects</h2>
        <span className="muted">Same arm, status, age band, site or ECOG</span>
        <div className="carousel-btns">
          <button className="round-btn" onClick={() => scroll(-1)} aria-label="Previous">
            <IconChevron dir="left" />
          </button>
          <button className="round-btn" onClick={() => scroll(1)} aria-label="Next">
            <IconChevron dir="right" />
          </button>
        </div>
      </div>
      <div className="carousel" ref={ref}>
        {items.map((x) => (
          <button key={x.id} className="mini-card" onClick={() => openSubject(x.id)}>
            <div className="mini-media">
              <SubjectArt subject={x} />
            </div>
            <div className="mini-body">
              <strong>{x.id}</strong>
              <span className="muted">
                {x.arm.label} · Site {x.site.code}
              </span>
              <span className="mini-days">
                <b>{x.daysOnStudy}</b> days · {x.currentVisit}
              </span>
              <StatusBadge status={x.status} />
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default function Profile({ id, backToResults, resultCount, favorites, toggleFav, flagged, toggleFlag, notes, addNote, openSubject }) {
  const s = SUBJECT_BY_ID[id]
  const [tab, setTab] = useState('overview')
  const [noteOpen, setNoteOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const tabsRef = useRef(null)

  if (!s) {
    return (
      <main className="page">
        <button className="back-link" onClick={backToResults}>
          <IconChevron dir="left" /> Back to results
        </button>
        <div className="empty">
          <h3>Subject “{id}” not found</h3>
          <p>It may not exist in this synthetic dataset.</p>
        </div>
      </main>
    )
  }

  const fav = favorites.includes(s.id)
  const isFlagged = flagged.includes(s.id)
  const subjectNotes = notes[s.id] || []
  const goTab = (t) => {
    setTab(t)
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const saveNote = () => {
    if (!draft.trim()) return
    addNote(s.id, draft.trim())
    setDraft('')
    setNoteOpen(false)
  }
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  const tabCount = { aes: s.aes.length, conmeds: s.conmeds.length, deviations: s.deviations.length, visits: s.visits.length }
  const lastAeGrade = maxGrade(s)

  return (
    <main className="page profile-page">
      <button className="back-link" onClick={backToResults}>
        <IconChevron dir="left" /> Back to results {resultCount != null && <span className="muted">({resultCount} matching)</span>}
      </button>

      <div className="profile-top">
        <div className="hero">
          <div className="hero-media">
            <SubjectArt subject={s} variant="hero" />
            <button className={`heart ${fav ? 'on' : ''}`} onClick={() => toggleFav(s.id)} aria-pressed={fav} aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}>
              <IconHeart filled={fav} />
            </button>
            <span className="synthetic-tag">Synthetic data, not for clinical use</span>
            <Journey s={s} />
          </div>
          <div className="thumbs">
            {LAB_DEFS.map((def) => (
              <button key={def.key} className="thumb" onClick={() => goTab('labs')} title={`Open ${def.key} in Labs`}>
                <span className="thumb-label">{def.key}</span>
                <Sparkline points={s.labs[def.key]} def={def} width={160} height={48} />
              </button>
            ))}
            <button className="thumb text" onClick={() => goTab('aes')}>
              <span className="thumb-label">AEs</span>
              <span className="thumb-big">{s.aes.length}</span>
              <span className="muted">{s.aes.length ? `max G${lastAeGrade}` : 'none'}</span>
            </button>
          </div>
        </div>

        <aside className="summary">
          <div className="summary-top">
            <div>
              <div className="overline">
                {STUDY.id} · Site {s.site.code}
              </div>
              <h1 className="subject-title">Subject {s.id}</h1>
            </div>
            <button className="icon-btn" onClick={copyLink} aria-label="Copy link to this subject" title={copied ? 'Link copied' : 'Copy link'}>
              <IconLink />
            </button>
          </div>
          {copied && <div className="toast">Link copied</div>}
          <div className="summary-tags">
            <StatusBadge status={s.status} size="lg" />
            <ArmTag arm={s.arm} />
            {isFlagged && (
              <span className="flag-tag">
                <IconFlag filled size={14} /> Flagged for review
              </span>
            )}
          </div>
          <p className="summary-demo">
            {s.age} y · {s.sex} · {s.race} · {s.ethnicity}
            <br />
            {s.site.name}, {s.site.city}
          </p>

          <div className="summary-headline">
            <span className="headline-label">Days on study</span>
            <span className="headline-num big">{s.daysOnStudy}</span>
            <span className="muted">as of data cut {fmtDate(DATA_CUT)}</span>
          </div>

          <div className="tiles">
            <div className="tile">
              <span className="tile-k">Current visit</span>
              <span className="tile-v">{s.currentVisit}</span>
            </div>
            <div className="tile">
              <span className="tile-k">Current dose</span>
              <span className="tile-v">{s.currentDose ?? '—'}</span>
            </div>
            <div className={`tile ${s.flags.g3 ? 'warn' : ''}`}>
              <span className="tile-k">Adverse events</span>
              <span className="tile-v">{s.aes.length ? `${s.aes.length} · G${lastAeGrade}` : '0'}</span>
            </div>
          </div>

          <dl className="dates">
            <div><dt>Enrolled (consent)</dt><dd>{fmtDate(s.enrolledDate)}</dd></div>
            <div><dt>Randomized</dt><dd>{fmtDate(s.randDate)}</dd></div>
            <div><dt>First dose</dt><dd>{fmtDate(s.firstDose)}</dd></div>
            <div><dt>Last dose</dt><dd>{fmtDate(s.lastDose)}</dd></div>
            <div><dt>Next visit</dt><dd>{s.nextVisit ? `${s.nextVisit.name} · ${fmtDate(s.nextVisit.date)}` : '—'}</dd></div>
          </dl>

          <div className="actions">
            <button className={`btn outline ${isFlagged ? 'active' : ''}`} onClick={() => toggleFlag(s.id)} aria-pressed={isFlagged}>
              <IconFlag filled={isFlagged} /> {isFlagged ? 'Flagged' : 'Flag for review'}
            </button>
            <button className="btn primary" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen}>
              <IconNote /> Add note
            </button>
          </div>
          {noteOpen && (
            <div className="note-editor">
              <textarea autoFocus rows={3} placeholder={`Note on ${s.id}…`} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="note-actions">
                <button className="link-btn" onClick={() => setNoteOpen(false)}>Cancel</button>
                <button className="btn primary sm" onClick={saveNote} disabled={!draft.trim()}>Save note</button>
              </div>
            </div>
          )}
          {subjectNotes.length > 0 && (
            <button className="link-btn" onClick={() => goTab('overview')}>
              {subjectNotes.length} note{subjectNotes.length > 1 ? 's' : ''} saved · view
            </button>
          )}
          <p className="fine">Flags and notes are stored only in this browser (local state). Synthetic data, not for clinical use.</p>
        </aside>
      </div>

      <nav className="section-tabs" ref={tabsRef} role="tablist" aria-label="Profile sections">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
            {tabCount[k] != null && <span className="tab-n">{tabCount[k]}</span>}
          </button>
        ))}
      </nav>
      <section className="tab-panel" role="tabpanel">
        {tab === 'overview' && <Overview s={s} notes={subjectNotes} />}
        {tab === 'visits' && <Visits s={s} />}
        {tab === 'aes' && <AdverseEvents s={s} />}
        {tab === 'labs' && <Labs s={s} />}
        {tab === 'conmeds' && <ConMeds s={s} />}
        {tab === 'deviations' && <Deviations s={s} />}
        {tab === 'disposition' && <Disposition s={s} />}
      </section>

      <Similar s={s} openSubject={openSubject} />
    </main>
  )
}
