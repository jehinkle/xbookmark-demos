import { AGE_BOUNDS, DAYS_BOUNDS, SAFETY_FLAGS, SITES } from './data.js'

export const EMPTY_FILTERS = {
  arm: 'All',
  age: [...AGE_BOUNDS],
  days: [...DAYS_BOUNDS],
  sex: [],
  race: [],
  ethnicity: [],
  site: [],
  status: [],
  disposition: [],
  safety: [],
  deviation: [],
  ecog: [],
  bmi: [],
  search: '',
}

// value accessors for checkbox facets (OR within a facet, AND across facets)
export const FACET_GET = {
  sex: (s) => [s.sex],
  race: (s) => [s.race],
  ethnicity: (s) => [s.ethnicity],
  site: (s) => [s.site.code],
  status: (s) => [s.status],
  disposition: (s) => [s.disposition.reason],
  safety: (s) => SAFETY_FLAGS.filter((f) => s.flags[f.key]).map((f) => f.key),
  deviation: (s) => [s.deviationLevel],
  ecog: (s) => [s.ecog],
  bmi: (s) => [s.bmiBand],
}

export const FACET_LABEL = {
  sex: 'Sex',
  race: 'Race',
  ethnicity: 'Ethnicity',
  site: 'Site',
  status: 'Status',
  disposition: 'Disposition',
  safety: 'Safety',
  deviation: 'Deviations',
  ecog: 'ECOG',
  bmi: 'BMI',
}

export const ARM_TABS = [
  { key: 'All', label: 'All' },
  { key: 'Placebo', label: 'Placebo' },
  { key: 'Low dose', label: 'Low' },
  { key: 'High dose', label: 'High' },
]

export function searchText(s) {
  return [
    s.id, s.screeningNo, s.initials, s.site.name, s.site.city, `site ${s.site.code}`, s.site.pi, s.arm.label, s.status,
    s.sex, s.race, s.ethnicity, s.currentVisit, s.disposition.reason, s.bmiBand, `ecog ${s.ecog}`,
    ...s.aes.map((a) => a.term), ...s.conmeds.map((c) => c.name), ...s.medicalHistory, ...s.deviations.map((d) => d.category),
  ].join(' | ').toLowerCase()
}

export function matches(s, f, skip) {
  if (skip !== 'arm' && f.arm !== 'All' && s.arm.key !== f.arm) return false
  if (skip !== 'age' && (s.age < f.age[0] || s.age > f.age[1])) return false
  if (skip !== 'days' && (s.daysOnStudy < f.days[0] || s.daysOnStudy > f.days[1])) return false
  for (const key of Object.keys(FACET_GET)) {
    if (key === skip || !f[key].length) continue
    const vals = FACET_GET[key](s)
    if (!vals.some((v) => f[key].includes(v))) return false
  }
  if (skip !== 'search' && f.search.trim()) {
    const hay = s._search || (s._search = searchText(s))
    const terms = f.search.toLowerCase().trim().split(/\s+/)
    if (!terms.every((t) => hay.includes(t))) return false
  }
  return true
}

export function facetCounts(subjects, f, key) {
  const pool = subjects.filter((s) => matches(s, f, key))
  const counts = {}
  for (const s of pool) for (const v of FACET_GET[key](s)) counts[v] = (counts[v] || 0) + 1
  return counts
}

export const SORTS = [
  { key: 'id', label: 'Subject ID', fn: (a, b) => a.id.localeCompare(b.id) },
  { key: 'days', label: 'Days on study (high to low)', fn: (a, b) => b.daysOnStudy - a.daysOnStudy || a.id.localeCompare(b.id) },
  { key: 'enrolled', label: 'Enrolled date (newest)', fn: (a, b) => b.enrolledDate.localeCompare(a.enrolledDate) || a.id.localeCompare(b.id) },
  { key: 'age', label: 'Age (youngest first)', fn: (a, b) => a.age - b.age || a.id.localeCompare(b.id) },
]

const siteName = (code) => SITES.find((s) => s.code === code)?.name ?? code
const flagLabel = (k) => SAFETY_FLAGS.find((f) => f.key === k)?.label ?? k

export function activeChips(f) {
  const chips = []
  if (f.search.trim()) chips.push({ id: 'search', label: `“${f.search.trim()}”`, remove: (x) => ({ ...x, search: '' }) })
  if (f.arm !== 'All') chips.push({ id: 'arm', label: `Arm: ${f.arm}`, remove: (x) => ({ ...x, arm: 'All' }) })
  if (f.age[0] !== AGE_BOUNDS[0] || f.age[1] !== AGE_BOUNDS[1]) chips.push({ id: 'age', label: `Age: ${f.age[0]} – ${f.age[1]}`, remove: (x) => ({ ...x, age: [...AGE_BOUNDS] }) })
  if (f.days[0] !== DAYS_BOUNDS[0] || f.days[1] !== DAYS_BOUNDS[1]) chips.push({ id: 'days', label: `Days on study: ${f.days[0]} – ${f.days[1]}`, remove: (x) => ({ ...x, days: [...DAYS_BOUNDS] }) })
  for (const key of Object.keys(FACET_GET)) {
    for (const v of f[key]) {
      const shown = key === 'site' ? siteName(v) : key === 'safety' ? flagLabel(v) : key === 'ecog' ? `ECOG ${v}` : key === 'deviation' ? `${v} deviations` : key === 'bmi' ? `BMI ${v}` : v
      chips.push({ id: `${key}:${v}`, label: shown, remove: (x) => ({ ...x, [key]: x[key].filter((y) => y !== v) }) })
    }
  }
  return chips
}
