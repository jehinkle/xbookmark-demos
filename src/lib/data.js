// Synthetic, seeded mock dataset for the Subject Finder demo.
// Nothing here is real patient data. Same seed => same subjects on every load.

export const STUDY = {
  id: 'DEMO-LAB-001',
  title: 'A Phase 2, Randomized, Double-Blind, Placebo-Controlled Study of DLX-204',
  phase: 'Phase 2',
  design: 'Randomized 1:1:1, double-blind, placebo-controlled',
  cycleDays: 21,
  maxCycles: 8,
  primaryEndpoint: 'Change from baseline in composite score at C8D1',
}

export const DATA_CUT = '2026-09-30'
const SEED = 20261001

export const SITES = [
  { code: '01', name: 'Lakeside Research Institute', city: 'Chicago, IL', pi: 'Dr. R. Okafor' },
  { code: '02', name: 'Bayview Clinical Center', city: 'San Diego, CA', pi: 'Dr. M. Lindqvist' },
  { code: '03', name: 'Northgate Oncology Partners', city: 'Minneapolis, MN', pi: 'Dr. S. Haddad' },
  { code: '04', name: 'Riverbend Medical Research', city: 'Nashville, TN', pi: 'Dr. K. Moreau' },
  { code: '05', name: 'Cedar Hills Trial Unit', city: 'Portland, OR', pi: 'Dr. T. Nakamura' },
  { code: '06', name: 'Harborview Health Sciences', city: 'Boston, MA', pi: 'Dr. L. Ferreira' },
]
const SITE_SIZES = [14, 13, 12, 12, 11, 10]

export const ARMS = [
  { key: 'Placebo', label: 'Placebo', short: 'Placebo', dose: 0, reduced: 0, color: '#64748b', soft: '#e2e8f0' },
  { key: 'Low dose', label: 'Low dose', short: 'Low', dose: 100, reduced: 50, color: '#0d9488', soft: '#ccfbf1' },
  { key: 'High dose', label: 'High dose', short: 'High', dose: 300, reduced: 200, color: '#6d28d9', soft: '#ede9fe' },
]
export const ARM_BY_KEY = Object.fromEntries(ARMS.map((a) => [a.key, a]))
export const NOT_RANDOMIZED = { key: 'Not randomized', label: 'Not randomized', short: '—', dose: 0, color: '#94a3b8', soft: '#f1f5f9' }

export const STATUSES = ['Screening', 'Randomized', 'On treatment', 'Follow-up', 'Completed', 'Discontinued', 'Screen failed']
export const SEXES = ['Female', 'Male']
export const RACES = [
  'White',
  'Black or African American',
  'Asian',
  'American Indian or Alaska Native',
  'Native Hawaiian or Other Pacific Islander',
  'Multiple',
  'Not reported',
]
export const ETHNICITIES = ['Hispanic or Latino', 'Not Hispanic or Latino']
export const ECOGS = ['0', '1', '2']
export const BMI_BANDS = ['Underweight (<18.5)', 'Normal (18.5–24.9)', 'Overweight (25–29.9)', 'Obese (≥30)']
export const DEVIATION_LEVELS = ['None', 'Minor', 'Major']
export const SAFETY_FLAGS = [
  { key: 'sae', label: 'Any SAE', color: '#dc2626' },
  { key: 'g3', label: 'Grade 3+ AE', color: '#ea580c' },
  { key: 'doseRed', label: 'Dose reduction', color: '#7c3aed' },
  { key: 'labOor', label: 'Lab out of range', color: '#2563eb' },
]

export const DISPOSITION_GROUPS = [
  { group: 'Active', options: ['Ongoing'] },
  { group: 'Completed', options: ['Completed study'] },
  { group: 'Discontinued: safety', options: ['Adverse event', 'Death'] },
  { group: 'Discontinued: efficacy', options: ['Progressive disease', 'Lack of efficacy'] },
  { group: 'Discontinued: other', options: ['Withdrawal by subject', 'Lost to follow-up', 'Physician decision'] },
  { group: 'Screen failure', options: ['Eligibility criteria not met', 'Consent withdrawn before randomization'] },
]

export const LAB_DEFS = [
  { key: 'ALT', name: 'Alanine aminotransferase', unit: 'U/L', low: 7, high: 56, digits: 0 },
  { key: 'AST', name: 'Aspartate aminotransferase', unit: 'U/L', low: 10, high: 40, digits: 0 },
  { key: 'CREAT', name: 'Creatinine', unit: 'mg/dL', low: 0.6, high: 1.3, digits: 2 },
  { key: 'HGB', name: 'Hemoglobin', unit: 'g/dL', low: 12.0, high: 17.5, digits: 1 },
]

// ---------- seeded RNG helpers ----------
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(SEED)
const randint = (a, b) => Math.floor(rand() * (b - a + 1)) + a
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const chance = (p) => rand() < p
const normal = (mu, sd) => {
  const u = 1 - rand()
  const v = rand()
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [v, w] of pairs) {
    r -= w
    if (r <= 0) return v
  }
  return pairs[pairs.length - 1][0]
}
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const sampleN = (arr, n) => shuffle(arr).slice(0, n)

// ---------- date helpers (UTC day math, ISO strings) ----------
const CUT_MS = Date.parse(DATA_CUT + 'T00:00:00Z')
const DAY = 86400000
export const daysAgo = (n) => new Date(CUT_MS - n * DAY).toISOString().slice(0, 10)
export const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
export const diffDays = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY)
export const isPast = (iso) => Date.parse(iso + 'T00:00:00Z') <= CUT_MS
export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// ---------- vocabularies ----------
const HISTORY = [
  { cond: 'Hypertension', med: ['Lisinopril', '10 mg QD', 'PO'] },
  { cond: 'Hypertension', med: ['Amlodipine', '5 mg QD', 'PO'] },
  { cond: 'Type 2 diabetes mellitus', med: ['Metformin', '500 mg BID', 'PO'] },
  { cond: 'Hyperlipidemia', med: ['Atorvastatin', '20 mg QD', 'PO'] },
  { cond: 'Gastroesophageal reflux disease', med: ['Omeprazole', '20 mg QD', 'PO'] },
  { cond: 'Hypothyroidism', med: ['Levothyroxine', '75 mcg QD', 'PO'] },
  { cond: 'Osteoarthritis', med: ['Acetaminophen', '500 mg PRN', 'PO'] },
  { cond: 'Depression', med: ['Sertraline', '50 mg QD', 'PO'] },
  { cond: 'Asthma', med: ['Albuterol inhaler', '90 mcg PRN', 'INH'] },
  { cond: 'Vitamin D deficiency', med: ['Cholecalciferol', '2000 IU QD', 'PO'] },
]
const AE_TERMS = [
  ['Nausea', 1.4], ['Fatigue', 1.5], ['Headache', 1.1], ['Diarrhoea', 1.1], ['Rash maculo-papular', 0.8],
  ['ALT increased', 0.7], ['Anaemia', 0.6], ['Neutropenia', 0.5], ['Insomnia', 0.5], ['Arthralgia', 0.6],
  ['Decreased appetite', 0.7], ['Peripheral neuropathy', 0.4], ['Hypertension', 0.4], ['Pyrexia', 0.5],
  ['Cough', 0.6], ['Dizziness', 0.6], ['Vomiting', 0.5], ['Pruritus', 0.4],
]
const AE_MED = { Nausea: ['Ondansetron', '8 mg PRN', 'PO'], Vomiting: ['Ondansetron', '8 mg PRN', 'PO'], Diarrhoea: ['Loperamide', '2 mg PRN', 'PO'], Headache: ['Ibuprofen', '400 mg PRN', 'PO'], Pyrexia: ['Acetaminophen', '650 mg PRN', 'PO'], 'Rash maculo-papular': ['Hydrocortisone cream 1%', 'Apply BID', 'TOP'], Insomnia: ['Melatonin', '3 mg QHS', 'PO'], Pruritus: ['Cetirizine', '10 mg QD', 'PO'] }
const RELATEDNESS = ['Not related', 'Unlikely related', 'Possibly related', 'Probably related', 'Definitely related']
const DEVIATIONS = [
  ['Visit out of window', 'Visit occurred {n} days outside the protocol window.'],
  ['Missed assessment', 'Protocol-required {lab} sample not collected at visit.'],
  ['Dosing error', 'Subject took study drug from the wrong kit for {n} days.'],
  ['Informed consent', 'Re-consent to protocol amendment 2 obtained {n} days late.'],
  ['Eligibility', 'Screening lab drawn outside the 14-day window before randomization.'],
  ['Prohibited medication', 'Subject took a strong CYP3A4 inhibitor for {n} days.'],
]
const SCREEN_FAIL_DETAIL = [
  'Exclusion #7: ALT > 2.5× ULN at screening',
  'Inclusion #3: ECOG performance status > 1 at screening',
  'Exclusion #12: eGFR < 45 mL/min/1.73m²',
  'Inclusion #5: required washout period not met',
]
const LETTERS = 'ABCDEFGHJKLMNPRSTVWY'

function bmiBand(bmi) {
  if (bmi < 18.5) return BMI_BANDS[0]
  if (bmi < 25) return BMI_BANDS[1]
  if (bmi < 30) return BMI_BANDS[2]
  return BMI_BANDS[3]
}

const STATUS_WEIGHTS = [
  ['On treatment', 38], ['Follow-up', 15], ['Completed', 13], ['Discontinued', 11],
  ['Screening', 7], ['Screen failed', 8], ['Randomized', 6],
]

function genSubject(site, id, armKey) {
  const status = weighted(STATUS_WEIGHTS)
  const randomized = !['Screening', 'Screen failed'].includes(status)
  const arm = randomized ? ARM_BY_KEY[armKey] : NOT_RANDOMIZED
  const sex = chance(0.52) ? 'Female' : 'Male'
  const age = Math.round(clamp(normal(56, 12), 22, 79))
  const race = weighted([['White', 58], ['Black or African American', 16], ['Asian', 12], ['American Indian or Alaska Native', 3], ['Native Hawaiian or Other Pacific Islander', 2], ['Multiple', 5], ['Not reported', 4]])
  const ethnicity = chance(0.18) ? 'Hispanic or Latino' : 'Not Hispanic or Latino'
  const ecog = String(weighted([[0, 45], [1, 45], [2, 10]]))
  const heightCm = Math.round(sex === 'Female' ? normal(163, 7) : normal(177, 7))
  const bmi = Math.round(clamp(normal(27, 4.6), 17.6, 41) * 10) / 10
  const weightKg = Math.round(bmi * (heightCm / 100) ** 2 * 10) / 10
  const initials = pick(LETTERS) + pick(LETTERS)
  const screeningNo = `SCR-${site.code}${String(randint(100, 999))}`

  const cycleDays = STUDY.cycleDays
  const txDays = cycleDays * STUDY.maxCycles // 168
  const scrDur = randint(10, 26)

  // consent offset (days before data cut), by status
  let consentAgo
  if (status === 'Screening') consentAgo = randint(2, scrDur - 1)
  else if (status === 'Screen failed') consentAgo = randint(30, 360)
  else if (status === 'Randomized') consentAgo = scrDur + randint(0, 1)
  else if (status === 'On treatment') consentAgo = randint(scrDur + 6, scrDur + txDays - 4)
  else if (status === 'Follow-up') consentAgo = randint(scrDur + txDays + 10, scrDur + txDays + 85)
  else if (status === 'Completed') consentAgo = randint(scrDur + txDays + 100, scrDur + txDays + 210)
  else consentAgo = randint(scrDur + 40, 400)

  const consentDate = daysAgo(consentAgo)
  const randDate = randomized ? addDays(consentDate, scrDur) : null
  const firstDose = !randomized ? null : status === 'Randomized' ? daysAgo(-randint(1, 4)) : addDays(randDate, randint(0, 2))

  // treatment window
  let txEnd = null // last day of treatment (inclusive) if ended
  let discDay = null
  if (status === 'Follow-up' || status === 'Completed') txEnd = addDays(firstDose, txDays - 1)
  if (status === 'Discontinued') {
    discDay = randint(12, Math.min(150, consentAgo - scrDur - 8))
    txEnd = addDays(firstDose, discDay)
  }
  const dosed = randomized && firstDose && isPast(firstDose) && status !== 'Randomized'
  const lastDose = !dosed ? null : txEnd ? txEnd : daysAgo(randint(0, 1))

  // --- disposition ---
  let disposition
  let endDate = null
  if (status === 'Completed') {
    endDate = addDays(txEnd, 90)
    disposition = { reason: 'Completed study', group: 'Completed', date: endDate, detail: 'Completed treatment (8 cycles) and final follow-up visit.' }
  } else if (status === 'Discontinued') {
    const reason = weighted([['Adverse event', 30], ['Progressive disease', 18], ['Lack of efficacy', 10], ['Withdrawal by subject', 18], ['Lost to follow-up', 10], ['Physician decision', 10], ['Death', 3]])
    endDate = addDays(txEnd, randint(1, 6))
    const group = DISPOSITION_GROUPS.find((g) => g.options.includes(reason)).group
    disposition = { reason, group, date: endDate, detail: `Study treatment discontinued on study day ${diffDays(consentDate, txEnd) + 1}.` }
  } else if (status === 'Screen failed') {
    endDate = addDays(consentDate, scrDur)
    const reason = chance(0.75) ? 'Eligibility criteria not met' : 'Consent withdrawn before randomization'
    disposition = { reason, group: 'Screen failure', date: endDate, detail: reason === 'Eligibility criteria not met' ? pick(SCREEN_FAIL_DETAIL) : 'Subject withdrew consent during screening.' }
  } else {
    disposition = { reason: 'Ongoing', group: 'Active', date: null, detail: status === 'Follow-up' ? 'Treatment complete; in post-treatment follow-up.' : 'Participating per protocol.' }
  }
  const daysOnStudy = diffDays(consentDate, endDate || DATA_CUT) + 1

  // --- adverse events ---
  const aes = []
  if (dosed) {
    const exposure = diffDays(firstDose, lastDose) + 1
    const base = arm.key === 'Placebo' ? 1.3 : arm.key === 'Low dose' ? 2.4 : 3.4
    const n = Math.max(0, Math.round(normal(base * Math.min(1, exposure / 120 + 0.25), 1)))
    for (let k = 0; k < n; k++) {
      const term = weighted(AE_TERMS)
      const gradeW = arm.key === 'High dose' ? [[1, 44], [2, 33], [3, 18], [4, 5]] : arm.key === 'Low dose' ? [[1, 52], [2, 33], [3, 12], [4, 3]] : [[1, 62], [2, 30], [3, 7], [4, 1]]
      const grade = weighted(gradeW)
      const start = addDays(firstDose, randint(1, Math.max(2, exposure - 1)))
      const dur = randint(2, 45)
      const end = isPast(addDays(start, dur)) && (!endDate || diffDays(addDays(start, dur), endDate) >= 0) ? addDays(start, dur) : null
      const relW = arm.key === 'Placebo' ? [[0, 45], [1, 30], [2, 18], [3, 6], [4, 1]] : [[0, 20], [1, 20], [2, 32], [3, 20], [4, 8]]
      const relatedness = RELATEDNESS[weighted(relW)]
      const serious = grade >= 3 ? chance(0.45) : chance(0.02)
      let action = 'None'
      if (grade >= 3 && arm.key !== 'Placebo' && chance(0.5)) action = 'Dose reduced'
      else if (grade >= 2 && chance(0.18)) action = 'Drug interrupted'
      aes.push({ term, grade, start, end, relatedness, serious, action })
    }
    if (disposition.reason === 'Adverse event') {
      aes.push({ term: pick(['ALT increased', 'Neutropenia', 'Rash maculo-papular', 'Fatigue']), grade: 3, start: addDays(txEnd, -randint(2, 6)), end: null, relatedness: arm.key === 'Placebo' ? 'Unlikely related' : 'Probably related', serious: chance(0.5), action: 'Drug withdrawn' })
    }
    if (disposition.reason === 'Death') {
      aes.push({ term: pick(['Sepsis', 'Myocardial infarction', 'Pulmonary embolism']), grade: 5, start: addDays(txEnd, -1), end: txEnd, relatedness: 'Unlikely related', serious: true, action: 'Drug withdrawn' })
    }
    aes.sort((a, b) => a.start.localeCompare(b.start))
    aes.forEach((ae, i) => (ae.id = `AE${String(i + 1).padStart(2, '0')}`))
  }
  const reductionAe = aes.find((a) => a.action === 'Dose reduced')
  const reductionDate = reductionAe ? reductionAe.start : null
  const interruptAes = aes.filter((a) => a.action === 'Drug interrupted')

  // --- visits & dosing ---
  const visits = []
  visits.push({ name: 'Screening', phase: 'Screening', date: consentDate })
  if (randomized) visits.push({ name: 'Randomization', phase: 'Screening', date: randDate })
  else if (status === 'Screening') visits.push({ name: 'Randomization', phase: 'Screening', date: addDays(consentDate, scrDur) })
  if (randomized) {
    for (let c = 1; c <= STUDY.maxCycles; c++) {
      const d1 = addDays(firstDose, (c - 1) * cycleDays)
      const days = c === 1 ? [1, 8, 15] : [1]
      for (const d of days) visits.push({ name: `C${c}D${d}`, phase: `Cycle ${c}`, date: addDays(d1, d - 1), cycle: c, day: d })
    }
  }
  let cutVisits = visits
  if (txEnd) {
    cutVisits = visits.filter((v) => !v.cycle || v.date <= txEnd)
    const eot = addDays(txEnd, 7)
    cutVisits.push({ name: status === 'Discontinued' ? 'Early termination' : 'End of treatment', phase: 'Follow-up', date: eot })
    if (status !== 'Discontinued') {
      cutVisits.push({ name: 'FU1 (30 d)', phase: 'Follow-up', date: addDays(txEnd, 30) })
      cutVisits.push({ name: 'FU2 (90 d)', phase: 'Follow-up', date: addDays(txEnd, 90) })
    }
  }
  if (status === 'Screen failed') cutVisits = visits.slice(0, 1)
  let futureShown = 0
  const visitsOut = []
  for (const v of cutVisits) {
    const past = isPast(v.date)
    if (!past) {
      if (futureShown >= 3) continue
      futureShown++
    }
    const vStatus = past ? (v.cycle && v.day !== 1 && chance(0.05) ? 'Missed' : 'Completed') : 'Scheduled'
    let dose = null
    if (v.cycle && v.day === 1) {
      if (arm.key === 'Placebo') dose = { label: 'Placebo', kind: 'full' }
      else if (interruptAes.some((a) => Math.abs(diffDays(a.start, v.date)) <= 6)) dose = { label: 'Held', kind: 'held' }
      else if (reductionDate && v.date > reductionDate) dose = { label: `${arm.reduced} mg`, kind: 'reduced' }
      else dose = { label: `${arm.dose} mg`, kind: 'full' }
    }
    visitsOut.push({ ...v, status: vStatus, studyDay: diffDays(consentDate, v.date) + 1, dose })
  }
  const done = visitsOut.filter((v) => v.status === 'Completed')
  const currentVisit = status === 'Screen failed' ? 'Screen fail' : done.length ? done[done.length - 1].name : 'Screening'
  const nextVisit = visitsOut.find((v) => v.status === 'Scheduled') || null

  // --- labs ---
  const labTimes = visitsOut.filter((v) => v.status === 'Completed' && (v.name === 'Screening' || (v.cycle && v.day === 1) || v.name === 'End of treatment' || v.name === 'Early termination'))
  const alt0 = clamp(normal(24, 8), 9, 50)
  const ast0 = clamp(normal(23, 6), 12, 38)
  const cr0 = clamp(normal(sex === 'Female' ? 0.82 : 1.0, 0.14), 0.62, 1.25)
  const hgb0 = clamp(normal(sex === 'Female' ? 13.3 : 14.8, 0.9), 12.1, 17.2)
  const liverHit = arm.key === 'High dose' ? chance(0.4) : arm.key === 'Low dose' ? chance(0.18) : chance(0.06)
  const anemia = arm.key !== 'Placebo' && chance(0.25)
  const labs = {}
  for (const def of LAB_DEFS) labs[def.key] = []
  labTimes.forEach((v, i) => {
    const t = i // timepoint index
    const liver = liverHit && t >= 2 ? 1 + 0.35 * Math.min(t - 1, 4) : 1
    const vals = {
      ALT: alt0 * liver * clamp(normal(1, 0.12), 0.7, 1.4),
      AST: ast0 * (liverHit && t >= 2 ? 1 + 0.2 * Math.min(t - 1, 4) : 1) * clamp(normal(1, 0.1), 0.75, 1.3),
      CREAT: cr0 * clamp(normal(1, 0.07), 0.85, 1.2) + (arm.key === 'High dose' ? 0.01 * t : 0),
      HGB: hgb0 - (anemia ? 0.45 * Math.min(t, 5) : 0) + normal(0, 0.35),
    }
    for (const def of LAB_DEFS) {
      const f = 10 ** def.digits
      labs[def.key].push({ visit: v.name, date: v.date, value: Math.round(vals[def.key] * f) / f })
    }
  })
  const labOor = LAB_DEFS.some((def) => labs[def.key].slice(1).some((p) => p.value < def.low || p.value > def.high))

  // --- medical history & con meds ---
  const history = sampleN(HISTORY, weighted([[0, 25], [1, 35], [2, 25], [3, 12], [4, 3]]))
  const conmeds = history.map((h) => ({ name: h.med[0], dose: h.med[1], route: h.med[2], indication: h.cond, start: addDays(consentDate, -randint(120, 2400)), end: null }))
  for (const ae of aes) {
    const m = AE_MED[ae.term]
    if (m && chance(0.6) && !conmeds.some((c) => c.name === m[0] && c.indication === ae.term)) {
      conmeds.push({ name: m[0], dose: m[1], route: m[2], indication: ae.term, start: ae.start, end: ae.end })
    }
  }
  conmeds.sort((a, b) => a.start.localeCompare(b.start))
  const medicalHistory = [...new Set(history.map((h) => h.cond))]

  // --- protocol deviations ---
  const deviations = []
  if (status !== 'Screening' && chance(0.38)) {
    const n = randint(1, 3)
    const span = Math.max(3, diffDays(consentDate, endDate || DATA_CUT))
    for (let k = 0; k < n; k++) {
      const [category, tmpl] = pick(DEVIATIONS)
      const severity = category === 'Eligibility' || category === 'Dosing error' ? (chance(0.6) ? 'Major' : 'Minor') : chance(0.15) ? 'Major' : 'Minor'
      deviations.push({ id: `PD-${id.replace('-', '')}-${k + 1}`, date: addDays(consentDate, randint(1, span)), category, severity, description: tmpl.replace('{n}', randint(2, 9)).replace('{lab}', pick(['PK', 'chemistry', 'hematology', 'urinalysis'])), status: chance(0.75) ? 'Closed' : 'Open' })
    }
    deviations.sort((a, b) => a.date.localeCompare(b.date))
  }
  const deviationLevel = deviations.some((d) => d.severity === 'Major') ? 'Major' : deviations.length ? 'Minor' : 'None'

  const flags = {
    sae: aes.some((a) => a.serious),
    g3: aes.some((a) => a.grade >= 3),
    doseRed: !!reductionDate,
    labOor,
  }

  return {
    id,
    initials,
    screeningNo,
    site,
    arm,
    status,
    sex,
    age,
    race,
    ethnicity,
    ecog,
    heightCm,
    weightKg,
    bmi,
    bmiBand: bmiBand(bmi),
    consentDate,
    enrolledDate: consentDate,
    randDate,
    firstDose,
    lastDose,
    endDate,
    daysOnStudy,
    currentVisit,
    nextVisit,
    currentDose: !dosed || status !== 'On treatment' ? null : arm.key === 'Placebo' ? 'Placebo' : reductionDate ? `${arm.reduced} mg QD` : `${arm.dose} mg QD`,
    visits: visitsOut,
    aes,
    labs,
    conmeds,
    medicalHistory,
    deviations,
    deviationLevel,
    disposition,
    flags,
  }
}

function generate() {
  const subjects = []
  SITES.forEach((site, si) => {
    let num = 100 + randint(1, 9)
    // balanced arm blocks of 3 per site
    let block = []
    for (let k = 0; k < SITE_SIZES[si]; k++) {
      if (!block.length) block = shuffle(ARMS.map((a) => a.key))
      const id = `${site.code}-${num}`
      subjects.push(genSubject(site, id, block.pop()))
      num += randint(1, 6)
    }
  })
  return subjects
}

export const SUBJECTS = generate()
export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]))
export const AGE_BOUNDS = [Math.min(...SUBJECTS.map((s) => s.age)), Math.max(...SUBJECTS.map((s) => s.age))]
export const DAYS_BOUNDS = [0, Math.ceil(Math.max(...SUBJECTS.map((s) => s.daysOnStudy)) / 10) * 10]

export function maxGrade(s) {
  return s.aes.reduce((m, a) => Math.max(m, a.grade), 0)
}
