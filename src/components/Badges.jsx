import { SAFETY_FLAGS } from '../lib/data.js'

const STATUS_TONE = {
  'On treatment': 'green',
  'Follow-up': 'amber',
  Completed: 'gray',
  Discontinued: 'red',
  Screening: 'blue',
  Randomized: 'teal',
  'Screen failed': 'slate',
}

export function StatusBadge({ status, size }) {
  return (
    <span className={`status-badge tone-${STATUS_TONE[status]} ${size === 'lg' ? 'lg' : ''}`}>
      <span className="dot" />
      {status}
    </span>
  )
}

export function FlagChips({ flags, compact }) {
  const on = SAFETY_FLAGS.filter((f) => flags[f.key])
  if (!on.length) return compact ? null : <span className="muted">No safety flags</span>
  return (
    <div className="flag-chips">
      {on.map((f) => (
        <span key={f.key} className="flag-chip" style={{ '--c': f.color }}>
          <span className="swatch" />
          {f.label}
        </span>
      ))}
    </div>
  )
}

export function GradePill({ grade }) {
  return <span className={`grade-pill g${grade}`}>G{grade}</span>
}

export function ArmTag({ arm }) {
  return (
    <span className="arm-tag" style={{ '--c': arm.color, '--soft': arm.soft }}>
      {arm.label}
    </span>
  )
}
