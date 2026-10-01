// Abstract, arm-colored illustration (no people). Deterministic per subject id.
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export default function SubjectArt({ subject, variant = 'card' }) {
  const h = hash(subject.id)
  const r = (n, k) => ((h >>> (k * 3)) % n)
  const c = subject.arm.color
  const w = 400
  const ht = variant === 'hero' ? 260 : 200
  const blobs = Array.from({ length: 5 }, (_, i) => ({
    cx: 30 + ((r(340, i) + i * 77) % 340),
    cy: 20 + ((r(160, i + 2) + i * 41) % (ht - 40)),
    rad: 26 + r(60, i + 4),
    op: 0.08 + (i % 3) * 0.05,
  }))
  const tile = variant === 'hero' ? 96 : 72
  return (
    <svg className="subject-art" viewBox={`0 0 ${w} ${ht}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Abstract tile for subject ${subject.id}`}>
      <defs>
        <linearGradient id={`g-${subject.id}-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={subject.arm.soft} />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width={w} height={ht} fill={`url(#g-${subject.id}-${variant})`} />
      {blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.rad} fill={c} opacity={b.op} />
      ))}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M0 ${ht * 0.72 + i * 14} C ${w * 0.3} ${ht * (0.55 + r(20, i) / 100)}, ${w * 0.6} ${ht * (0.9 - r(20, i + 1) / 100)}, ${w} ${ht * 0.68 + i * 12}`}
          stroke={c}
          strokeOpacity={0.18 + i * 0.08}
          strokeWidth="2"
          fill="none"
        />
      ))}
      <g transform={`translate(${w / 2 - tile / 2} ${ht / 2 - tile / 2 - 6})`}>
        <rect width={tile} height={tile} rx={tile * 0.24} fill="#fff" stroke={c} strokeOpacity="0.35" />
        <text x={tile / 2} y={tile / 2 + tile * 0.13} textAnchor="middle" fontSize={tile * 0.38} fontWeight="700" fill={c} fontFamily="inherit" letterSpacing="1">
          {subject.initials}
        </text>
      </g>
    </svg>
  )
}
