/**
 * Seeded synthetic multi-subject, multi-analyte lab time series.
 * No real patient data — Demo Lab throwaway only.
 */

function mulberry32(seed) {
  let t = seed >>> 0
  return function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export const ANALYTES = [
  { id: 'ALT', name: 'Alanine Aminotransferase', unit: 'U/L', low: 7, high: 56, baseline: 28, volatility: 8 },
  { id: 'AST', name: 'Aspartate Aminotransferase', unit: 'U/L', low: 10, high: 40, baseline: 24, volatility: 6 },
  { id: 'CREAT', name: 'Creatinine', unit: 'mg/dL', low: 0.6, high: 1.3, baseline: 0.9, volatility: 0.12 },
  { id: 'HGB', name: 'Hemoglobin', unit: 'g/dL', low: 12.0, high: 17.5, baseline: 14.2, volatility: 0.6 },
  { id: 'WBC', name: 'White Blood Cells', unit: '10⁹/L', low: 4.0, high: 11.0, baseline: 7.2, volatility: 1.1 },
  { id: 'PLT', name: 'Platelets', unit: '10⁹/L', low: 150, high: 450, baseline: 245, volatility: 35 },
]

export const VISITS = [
  { id: 'SCR', label: 'Screening', day: -14 },
  { id: 'D1', label: 'Day 1 (Dose)', day: 1 },
  { id: 'W1', label: 'Week 1', day: 7 },
  { id: 'W2', label: 'Week 2', day: 14 },
  { id: 'W4', label: 'Week 4', day: 28 },
  { id: 'W6', label: 'Week 6', day: 42 },
  { id: 'W8', label: 'Week 8', day: 56 },
  { id: 'W12', label: 'Week 12', day: 84 },
  { id: 'W16', label: 'Week 16', day: 112 },
  { id: 'W20', label: 'Week 20', day: 140 },
  { id: 'W24', label: 'Week 24', day: 168 },
]

export const TIME_RANGES = [
  { id: 'scr-w12', label: 'Screening–W12', filter: (v) => v.day <= 84 },
  { id: 'all', label: 'All', filter: () => true },
  { id: 'last4', label: 'Last 4 visits', filter: null }, // applied dynamically
  { id: 'treatment', label: 'On-treatment', filter: (v) => v.day >= 1 },
]

const SUBJECT_COUNT = 12
const SITE_PREFIXES = ['01', '02', '03']

function buildSubjects(rng) {
  const subjects = []
  for (let i = 0; i < SUBJECT_COUNT; i++) {
    const site = SITE_PREFIXES[i % SITE_PREFIXES.length]
    const num = 100 + i + 1
    const id = `${site}-${num}`
    const arm = i % 3 === 0 ? 'Placebo' : i % 3 === 1 ? 'Dose A' : 'Dose B'
    const sex = rng() > 0.5 ? 'F' : 'M'
    const age = 22 + Math.floor(rng() * 45)
    subjects.push({ id, arm, sex, age, site })
  }
  return subjects
}

function round(n, digits = 1) {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

function generateSeries(rng, analyte, subjectIndex) {
  const points = []
  let value = analyte.baseline * (0.85 + rng() * 0.3)
  // Subject-specific drift / spike risk
  const spikeChance = 0.08 + (subjectIndex % 5) * 0.02
  const trend = (rng() - 0.45) * analyte.volatility * 0.15

  VISITS.forEach((visit, vi) => {
    value += trend + (rng() - 0.5) * analyte.volatility
    if (rng() < spikeChance && visit.day > 0) {
      value += analyte.volatility * (1.5 + rng() * 2)
    }
    // slight recovery toward baseline
    value += (analyte.baseline - value) * 0.08

    const digits = analyte.baseline < 5 ? 2 : analyte.baseline < 50 ? 1 : 0
    const v = Math.max(0.01, round(value, digits))
    const oor = v < analyte.low || v > analyte.high
    const qcFlag = rng() < 0.06

    points.push({
      visitId: visit.id,
      day: visit.day,
      label: visit.label,
      value: v,
      unit: analyte.unit,
      oor,
      qcFlag,
      sampleCount: 1 + (qcFlag ? 1 : 0) + (rng() < 0.1 ? 1 : 0),
    })

    // event markers
    if (visit.id === 'D1') {
      points[vi].events = [{ type: 'dose', label: 'Dose day' }]
    }
    if (oor && visit.day > 0 && rng() < 0.35) {
      points[vi].events = [...(points[vi].events || []), { type: 'ae', label: 'AE flagged' }]
    }
  })

  return points
}

const SEED = 20260928
const rng = mulberry32(SEED)

export const SUBJECTS = buildSubjects(rng)

/** Map: subjectId -> analyteId -> points[] */
export const LAB_DATA = {}
SUBJECTS.forEach((subj, si) => {
  LAB_DATA[subj.id] = {}
  ANALYTES.forEach((analyte) => {
    LAB_DATA[subj.id][analyte.id] = generateSeries(mulberry32(SEED + si * 97 + analyte.id.charCodeAt(0) * 13), analyte, si)
  })
})

export const STUDY = {
  id: 'DEMO-LAB-001',
  title: 'Demo Lab · Protocol DEMO-LAB-001',
  phase: 'Phase 1b',
  indication: 'Synthetic hepatic safety panel',
}

export function getAnalyte(id) {
  return ANALYTES.find((a) => a.id === id)
}

export function getSubject(id) {
  return SUBJECTS.find((s) => s.id === id)
}

export function seriesFor(subjectId, analyteId) {
  return LAB_DATA[subjectId]?.[analyteId] ?? []
}

export function lastValue(subjectId, analyteId) {
  const s = seriesFor(subjectId, analyteId)
  return s.length ? s[s.length - 1] : null
}

export function deltaPct(subjectId, analyteId) {
  const s = seriesFor(subjectId, analyteId)
  if (s.length < 2) return 0
  const a = s[0].value
  const b = s[s.length - 1].value
  if (!a) return 0
  return ((b - a) / a) * 100
}

/** Search symbols: subjects + analytes */
export function searchSymbols(query) {
  const q = query.trim().toLowerCase()
  const subjects = SUBJECTS.filter(
    (s) =>
      !q ||
      s.id.toLowerCase().includes(q) ||
      s.arm.toLowerCase().includes(q) ||
      s.site.includes(q),
  ).map((s) => ({
    kind: 'subject',
    id: s.id,
    label: s.id,
    sub: `${s.arm} · ${s.sex}/${s.age}`,
  }))
  const analytes = ANALYTES.filter(
    (a) => !q || a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
  ).map((a) => ({
    kind: 'analyte',
    id: a.id,
    label: a.id,
    sub: `${a.name} (${a.unit})`,
  }))
  return [...subjects, ...analytes]
}
