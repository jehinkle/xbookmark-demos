import { useState } from 'react'
import { SAFETY_FLAGS, SUBJECT_BY_ID, fmtDate, maxGrade } from '../lib/data.js'
import { StatusBadge } from './Badges.jsx'
import { IconClose } from './Icons.jsx'
import Modal from './Modal.jsx'

const ROWS = [
  ['Arm', (s) => s.arm.label],
  ['Site', (s) => `${s.site.code} · ${s.site.name}`],
  ['Status', (s) => <StatusBadge status={s.status} />],
  ['Age / Sex', (s) => `${s.age} y · ${s.sex}`],
  ['Race / Ethnicity', (s) => `${s.race} · ${s.ethnicity}`],
  ['Enrolled', (s) => fmtDate(s.enrolledDate)],
  ['Days on study', (s) => <strong>{s.daysOnStudy}</strong>],
  ['Current visit', (s) => s.currentVisit],
  ['ECOG / BMI', (s) => `${s.ecog} · ${s.bmi} (${s.bmiBand.split(' ')[0]})`],
  ['Adverse events', (s) => (s.aes.length ? `${s.aes.length} (max G${maxGrade(s)})` : 'None')],
  ['Safety flags', (s) => SAFETY_FLAGS.filter((f) => s.flags[f.key]).map((f) => f.label).join(', ') || '—'],
  ['Deviations', (s) => (s.deviations.length ? `${s.deviations.length} (${s.deviationLevel})` : 'None')],
  ['Disposition', (s) => s.disposition.reason],
]

export default function CompareTray({ ids, onRemove, onClear, onOpen }) {
  const [open, setOpen] = useState(false)
  if (!ids.length) return null
  const subjects = ids.map((id) => SUBJECT_BY_ID[id]).filter(Boolean)
  return (
    <>
      <div className="compare-tray" role="region" aria-label="Compare tray">
        <div className="tray-inner">
          <div className="tray-title">
            Compare <span className="muted">({subjects.length}/3)</span>
          </div>
          <div className="tray-slots">
            {[0, 1, 2].map((i) =>
              subjects[i] ? (
                <span key={i} className="tray-slot filled" style={{ '--c': subjects[i].arm.color }}>
                  <span className="arm-dot" style={{ background: subjects[i].arm.color }} />
                  {subjects[i].id}
                  <button onClick={() => onRemove(subjects[i].id)} aria-label={`Remove ${subjects[i].id} from compare`}>
                    <IconClose size={14} />
                  </button>
                </span>
              ) : (
                <span key={i} className="tray-slot">Add a subject</span>
              ),
            )}
          </div>
          <div className="tray-actions">
            <button className="link-btn" onClick={onClear}>
              Clear
            </button>
            <button className="btn primary" disabled={subjects.length < 2} onClick={() => setOpen(true)}>
              Compare {subjects.length}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <Modal title="Compare subjects" onClose={() => setOpen(false)} wide>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {subjects.map((s) => (
                    <th key={s.id}>
                      <button className="link-btn big" onClick={() => { setOpen(false); onOpen(s.id) }}>
                        {s.id}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, fn]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {subjects.map((s) => (
                      <td key={s.id}>{fn(s)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">Synthetic data, not for clinical use.</p>
        </Modal>
      )}
    </>
  )
}
