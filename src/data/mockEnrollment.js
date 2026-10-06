/**
 * Seeded synthetic clinical trial enrollment series.
 * Study DEMO-ENR-001 — Demo Lab throwaway only. No real subjects.
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

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseISO(s) {
  const [y, m, day] = s.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function daysBetween(a, b) {
  const ms = parseISO(b) - parseISO(a)
  return Math.round(ms / 86400000)
}

export const STUDY = {
  id: 'DEMO-ENR-001',
  name: 'EnrollmentPulse',
  phase: 'Phase 2',
  indication: 'Synthetic inflammatory disease (mock)',
  targetN: 120,
  startDate: '2025-11-03', // first screening window Monday
  // "today" for the demo — last actual enrollment lands on/before this
  asOfDate: '2026-10-06',
  seed: 20261006,
}

export const SITES = [
  { id: 'all', name: 'All sites', short: 'ALL', color: '#00e676' },
  { id: '01', name: 'Austin Clinical Research', short: 'Austin', color: '#00e676', capacity: 1.15 },
  { id: '02', name: 'Dallas Metro Investigators', short: 'Dallas', color: '#40c4ff', capacity: 1.0 },
  { id: '03', name: 'Houston Gulf Coast Site', short: 'Houston', color: '#ffab40', capacity: 0.95 },
  { id: '04', name: 'San Antonio Health Center', short: 'San Antonio', color: '#ea80fc', capacity: 0.85 },
  { id: '05', name: 'Fort Worth Research Hub', short: 'Fort Worth', color: '#ff5252', capacity: 0.75 },
  { id: '06', name: 'El Paso Border Clinic', short: 'El Paso', color: '#ffd740', capacity: 0.65 },
]

export const TIME_RANGES = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '6m', label: '6M', days: 182 },
  { id: 'ytd', label: 'YTD', days: null }, // special
  { id: '1y', label: '1Y', days: 365 },
  { id: 'max', label: 'MAX', days: null },
]

export const PROJECTION_HORIZONS = [
  { id: '30d', label: '30 days', days: 30 },
  { id: '8w', label: '8 weeks', days: 56 },
  { id: '3m', label: '3 months', days: 91 },
  { id: '6m', label: '6 months', days: 182 },
  { id: '1y', label: '1 year', days: 365 },
]

const SITE_IDS = SITES.filter((s) => s.id !== 'all').map((s) => s.id)

/**
 * Generate individual enrollment events (one per randomized subject).
 * Returns { enrollments: [{date, siteId, subjectId}], byDateSite, ...}
 */
function generateEnrollments(rng) {
  const enrollments = []
  const start = parseISO(STUDY.startDate)
  const totalDays = daysBetween(STUDY.startDate, STUDY.asOfDate)
  // Aim for ~80–90% of target by as-of so projection still has runway.
  const softCap = Math.floor(STUDY.targetN * (0.88 + rng() * 0.05))

  let subjectSeq = 0
  for (let day = 0; day <= totalDays; day++) {
    if (subjectSeq >= softCap) break
    const d = addDays(start, day)
    const dow = d.getDay() // 0 Sun … 6 Sat
    const weekdayFactor = dow === 0 || dow === 6 ? 0.15 : dow === 5 ? 0.7 : 1.0
    const progress = day / Math.max(1, totalDays)
    // Slow start → steady mid → mild late slowdown (screening fatigue)
    const ramp =
      progress < 0.1
        ? 0.4 + progress * 3
        : progress < 0.75
          ? 0.85 + progress * 0.25
          : 0.95 - (progress - 0.75) * 0.6

    // Global daily budget so total lands near softCap across the window
    const baselineDaily = softCap / Math.max(1, totalDays * 0.88)

    for (const siteId of SITE_IDS) {
      if (subjectSeq >= softCap) break
      const site = SITES.find((s) => s.id === siteId)
      const share =
        site.capacity /
        SITES.filter((s) => s.id !== 'all').reduce((a, s) => a + s.capacity, 0)
      const expected = baselineDaily * share * ramp * weekdayFactor
      let count = 0
      const trials = 4
      for (let t = 0; t < trials; t++) {
        if (rng() < expected / trials) count += 1
      }
      if (weekdayFactor > 0.9 && rng() < 0.03 * site.capacity) count += 1

      for (let k = 0; k < count; k++) {
        if (subjectSeq >= softCap) break
        subjectSeq += 1
        enrollments.push({
          date: toISODate(d),
          siteId,
          subjectId: `${siteId}-${1000 + subjectSeq}`,
        })
      }
    }
  }
  return enrollments
}

const rng = mulberry32(STUDY.seed)
export const ENROLLMENTS = generateEnrollments(rng)

/** Daily counts per site (+ 'all') and cumulative series. */
export function buildDailySeries(enrollments = ENROLLMENTS) {
  const byDate = new Map() // date -> { all, [siteId]: n }
  for (const e of enrollments) {
    if (!byDate.has(e.date)) {
      const row = { all: 0 }
      for (const id of SITE_IDS) row[id] = 0
      byDate.set(e.date, row)
    }
    const row = byDate.get(e.date)
    row.all += 1
    row[e.siteId] += 1
  }

  // Fill every calendar day from start to last enrollment (or asOf)
  const dates = [...byDate.keys()].sort()
  const lastEnrollDate = dates.length ? dates[dates.length - 1] : STUDY.asOfDate
  const start = parseISO(STUDY.startDate)
  const end = parseISO(lastEnrollDate)
  const dayCount = Math.round((end - start) / 86400000)

  const daily = []
  const cum = { all: 0 }
  for (const id of SITE_IDS) cum[id] = 0

  for (let i = 0; i <= dayCount; i++) {
    const d = toISODate(addDays(start, i))
    const row = byDate.get(d) || (() => {
      const z = { all: 0 }
      for (const id of SITE_IDS) z[id] = 0
      return z
    })()
    cum.all += row.all
    for (const id of SITE_IDS) cum[id] += row[id]
    daily.push({
      date: d,
      daily: { ...row },
      cumulative: { ...cum },
    })
  }

  return { daily, lastEnrollDate, totalEnrolled: cum.all }
}

export const SERIES = buildDailySeries(ENROLLMENTS)

/**
 * Recent enrollment rate model with weekday cycle + optional site capacity.
 * Returns projection points after lastActualDate for `horizonDays`.
 * Clearly a simple model — not a forecast guarantee.
 */
export function projectEnrollment({
  daily = SERIES.daily,
  siteId = 'all',
  horizonDays = 91,
  lookbackDays = 28,
} = {}) {
  if (!daily.length) return { points: [], weeklyRate: 0, projectedTargetDate: null }

  const last = daily[daily.length - 1]
  const lastDate = last.date
  const lastCum = last.cumulative[siteId] ?? 0

  // Average daily rate over lookback, split weekday vs weekend
  const lookbackStart = Math.max(0, daily.length - lookbackDays)
  const window = daily.slice(lookbackStart)
  let wdSum = 0
  let wdN = 0
  let weSum = 0
  let weN = 0
  for (const p of window) {
    const dow = parseISO(p.date).getDay()
    const n = p.daily[siteId] ?? 0
    if (dow === 0 || dow === 6) {
      weSum += n
      weN += 1
    } else {
      wdSum += n
      // weekday
      wdN += 1
    }
  }
  const wdRate = wdN ? wdSum / wdN : 0.15
  const weRate = weN ? weSum / weN : wdRate * 0.2

  // Site capacity soft dampening as we approach site-share of target
  const siteShare =
    siteId === 'all'
      ? 1
      : (SITES.find((s) => s.id === siteId)?.capacity ?? 1) /
        SITES.filter((s) => s.id !== 'all').reduce((a, s) => a + s.capacity, 0)
  const siteTarget =
    siteId === 'all' ? STUDY.targetN : Math.round(STUDY.targetN * siteShare)

  const points = []
  let cum = lastCum
  let projectedTargetDate = null
  const start = parseISO(lastDate)

  for (let i = 1; i <= horizonDays; i++) {
    const d = addDays(start, i)
    const dow = d.getDay()
    let rate = dow === 0 || dow === 6 ? weRate : wdRate
    // mild weekly oscillation
    rate *= 0.92 + 0.16 * Math.sin((i / 7) * Math.PI * 2)
    // dampen as approaching site target
    const remain = Math.max(0, siteTarget - cum)
    const damp = remain <= 0 ? 0 : Math.min(1, remain / Math.max(8, siteTarget * 0.15))
    const expected = rate * damp
    // deterministic fractional accumulation (smooth projection curve)
    cum += expected
    const date = toISODate(d)
    points.push({
      date,
      cumulative: Math.min(cum, siteTarget + 5), // slight overshoot allowed visually
      daily: expected,
      isProjection: true,
    })
    if (projectedTargetDate == null && cum >= siteTarget) {
      projectedTargetDate = date
    }
  }

  // Weekly rate = 7 × blended daily
  const weeklyRate = (wdRate * 5 + weRate * 2)

  // If never hit target in horizon, extrapolate roughly
  if (projectedTargetDate == null && weeklyRate > 0.01) {
    const remain = Math.max(0, siteTarget - lastCum)
    const daysNeeded = Math.ceil((remain / weeklyRate) * 7)
    projectedTargetDate = toISODate(addDays(start, daysNeeded))
  }

  return {
    points,
    weeklyRate,
    projectedTargetDate,
    siteTarget,
    wdRate,
    weRate,
    lastCum,
    lastDate,
  }
}

/** Filter daily series to a time range ending at last enrollment. */
export function sliceByRange(daily, rangeId, asOf = SERIES.lastEnrollDate) {
  if (!daily.length) return []
  const range = TIME_RANGES.find((r) => r.id === rangeId) || TIME_RANGES[TIME_RANGES.length - 1]
  const end = parseISO(asOf)

  if (range.id === 'max') return daily

  if (range.id === 'ytd') {
    const yStart = `${end.getFullYear()}-01-01`
    return daily.filter((p) => p.date >= yStart)
  }

  const start = toISODate(addDays(end, -(range.days - 1)))
  return daily.filter((p) => p.date >= start)
}

export function formatDateShort(iso) {
  if (!iso) return '—'
  const d = parseISO(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateAxis(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export { SITE_IDS, toISODate, parseISO, addDays, daysBetween }
