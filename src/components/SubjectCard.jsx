import { fmtDate } from '../lib/data.js'
import { FlagChips, StatusBadge } from './Badges.jsx'
import { IconFlag, IconHeart, IconPin } from './Icons.jsx'
import SubjectArt from './SubjectArt.jsx'

export default function SubjectCard({ subject: s, fav, onFav, compared, onCompare, compareFull, flagged, onOpen }) {
  const open = (e) => {
    if (e.target.closest('button, input, label, a')) return
    onOpen(s.id)
  }
  return (
    <article className="card" onClick={open}>
      <div className="card-media">
        <SubjectArt subject={s} />
        <button className={`heart ${fav ? 'on' : ''}`} onClick={() => onFav(s.id)} aria-pressed={fav} aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}>
          <IconHeart filled={fav} />
        </button>
        {flagged && (
          <span className="review-flag">
            <IconFlag filled size={14} /> Flagged
          </span>
        )}
      </div>
      <div className="card-body">
        <div className="overline">DEMO-LAB-001 · Site {s.site.code}</div>
        <h3 className="card-title">
          <a href={`#/subject/${s.id}`}>{s.id}</a>
        </h3>
        <div className="card-sub">
          <span className="arm-dot" style={{ background: s.arm.color }} />
          {s.arm.label} · {s.site.name}
        </div>

        <div className="headline">
          <div>
            <div className="headline-label">Days on study</div>
            <div className="headline-num">{s.daysOnStudy}</div>
          </div>
          <div className="headline-visit">
            <div className="headline-label">Current visit</div>
            <div className="visit-pill">{s.currentVisit}</div>
          </div>
        </div>

        <ul className="spec-lines">
          <li>
            {s.age} y · {s.sex} · {s.race}
          </li>
          <li>Enrolled {fmtDate(s.enrolledDate)}</li>
          <li>ECOG {s.ecog} · BMI {s.bmi}</li>
          <li>
            {s.aes.length} AE{s.aes.length === 1 ? '' : 's'} · {s.deviations.length ? `${s.deviations.length} deviation${s.deviations.length > 1 ? 's' : ''}` : 'No deviations'}
          </li>
        </ul>

        <div className="card-status">
          <StatusBadge status={s.status} />
        </div>
        <FlagChips flags={s.flags} compact />

        <div className="card-loc">
          <IconPin size={14} /> {s.site.name} ({s.site.city})
          <br />
          <span className="mono">Screening #: {s.screeningNo}</span>
        </div>
      </div>
      <div className="card-foot">
        <a className="view-link" href={`#/subject/${s.id}`}>
          View Profile
        </a>
        <label className={`compare-check ${compareFull && !compared ? 'disabled' : ''}`} title={compareFull && !compared ? 'Compare up to 3 subjects' : ''}>
          Compare
          <input type="checkbox" checked={compared} disabled={compareFull && !compared} onChange={() => onCompare(s.id)} />
          <span className="box" aria-hidden="true" />
        </label>
      </div>
    </article>
  )
}
