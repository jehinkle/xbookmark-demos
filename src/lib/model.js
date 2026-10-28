// Mock SAP-rooted programming DAG + swarm schedule. Deterministic (seeded). No real data.
// Depth = number of dependency steps from the SAP. Everything downstream traces back to it.

export const DAYS = 24
export const MAXD = 15
export const N_AGENTS = 48
export const PAUSES = [
  { from: 6.0, to: 7.6, why: 'Waiting on EDC data transfer #2' },
  { from: 13.0, to: 14.5, why: 'SAP amendment v2.0 under review' },
]
const START = 0.25
const END = 23.9
const GAP_FOUND = 17.2
const FIX0 = 18.6 // SAP v2.1 clarification issued
export const SAP_VERSIONS = [
  { d: 0, v: 'v1.0' },
  { d: 14.5, v: 'v2.0' },
  { d: FIX0, v: 'v2.1' },
]
export const sapVersionAt = (t) => SAP_VERSIONS.filter((x) => x.d <= t).at(-1).v

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(101)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1))

// Clockwise from 12 o'clock in SAP chapter order: data handling -> populations -> exposure ->
// efficacy -> safety -> PK -> output shells. n = node budget; s0 = when work starts (fraction of work time)
export const SECTIONS = [
  { key: 'SDTM', num: '5', name: '§5 SDTM', title: 'SAP §5 Data handling conventions (SDTM inputs)', color: '#dcebd9', n: 360, s0: 0.0, kind: 'SDTM',
    subs: ['Date imputation', 'Visit windows', 'Unit conversion', 'Controlled terminology', 'Missing data', 'Partial dates'],
    out: ['DM', 'AE', 'LB', 'VS', 'EG', 'EX', 'CM', 'MH', 'DS', 'TU', 'TR', 'RS', 'PC'], vars: ['--DTC ISO 8601', 'controlled terminology', 'VISITNUM map', 'EPOCH', 'SUPPQUAL split', '--STRESN conversion'] },
  { key: 'ADSL', num: '6', name: '§6 ADSL', title: 'SAP §6 Analysis populations (ADSL)', color: '#f5dfe8', n: 150, s0: 0.02, kind: 'ADaM',
    subs: ['Safety population', 'ITT population', 'Per-protocol population', 'PK population', 'Stratification factors', 'Disposition'],
    out: ['ADSL'], vars: ['SAFFL', 'ITTFL', 'PPROTFL', 'PKFL', 'TRTSDT / TRTEDT', 'AGEGR1', 'STRATA', 'DCSREAS', 'EOSSTT'] },
  { key: 'EXCM', num: '7', name: '§7 ADEX/ADCM', title: 'SAP §7 Exposure and concomitant meds (ADEX/ADCM)', color: '#e8e1f3', n: 150, s0: 0.06, kind: 'ADaM',
    subs: ['Duration of exposure', 'Dose intensity', 'Dose modifications', 'Prior/concomitant meds'],
    out: ['ADEX', 'ADCM'], vars: ['Dose intensity', 'Relative dose intensity', 'Cumulative dose', 'Dose delays', 'PREFL / ONTRTFL', 'ATC coding (WHODrug)'] },
  { key: 'EFF', num: '9', name: '§9 Efficacy (ADTTE/ADRS)', title: 'SAP §9 Efficacy analyses (ADTTE/ADRS)', color: '#d6eef4', n: 380, s0: 0.16, kind: 'ADaM',
    subs: ['Primary endpoint: PFS', 'Censoring rules', 'Overall survival', 'Objective response (RECIST 1.1)', 'Duration of response', 'Subgroup analyses'],
    out: ['ADTTE', 'ADRS', 'ADTR'], vars: ['PFS AVAL', 'OS AVAL', 'CNSR', 'EVNTDESC', 'BOR (RECIST 1.1)', 'Confirmed response', 'DOR', 'Target lesion SLD', 'ORR flag'] },
  { key: 'ADAE', num: '10.1', name: '§10.1 ADAE', title: 'SAP §10.1 Adverse events (ADAE)', color: '#fbe3d6', n: 380, s0: 0.08, kind: 'ADaM',
    subs: ['Treatment-emergent definition', 'Severity / CTCAE grading', 'AEs of special interest', 'Relatedness', 'Serious AEs'],
    out: ['ADAE'], vars: ['TRTEMFL', 'ASTDT imputation', 'AENDT imputation', 'ADURN', 'AOCCPFL', 'AOCCSFL', 'AREL', 'CQ01NAM (AESI)', 'ASTDY', 'ATOXGRN'] },
  { key: 'ADLB', num: '10.2', name: '§10.2 ADLB', title: 'SAP §10.2 Laboratory data (ADLB)', color: '#e3dcf7', n: 400, s0: 0.1, kind: 'ADaM',
    subs: ['Baseline definition', 'CTCAE v5 grading', 'Shift analyses', 'Hepatic safety (Hy\'s law)', 'Reference ranges'],
    out: ['ADLB'], vars: ['AVAL (SI units)', 'BASE', 'CHG', 'ATOXGR (CTCAE v5)', 'BTOXGR', 'ANRIND', 'ABLFL', 'AVISITN windowing', 'ANL01FL', 'PARAMCD map'] },
  { key: 'ADVS', num: '10.3', name: '§10.3 ADVS', title: 'SAP §10.3 Vital signs (ADVS)', color: '#f8d9e3', n: 170, s0: 0.1, kind: 'ADaM',
    subs: ['Baseline definition', 'Clinically notable values', 'BMI'], out: ['ADVS'], vars: ['AVAL', 'BASE', 'CHG', 'ABLFL', 'AVISITN windowing', 'ANRIND', 'BMI derivation'] },
  { key: 'ADEG', num: '10.4', name: '§10.4 ADEG', title: 'SAP §10.4 ECG (ADEG)', color: '#d9efe1', n: 160, s0: 0.12, kind: 'ADaM',
    subs: ['QT correction', 'Triplicate averaging', 'Categorical QTcF'], out: ['ADEG'], vars: ['QTcF derivation', 'QTcB derivation', 'CHG', 'CRIT1FL (>450 ms)', 'CRIT2FL (>60 ms incr.)', 'ABLFL triplicate avg'] },
  { key: 'PK', num: '11', name: '§11 PK (ADPC/ADPP)', title: 'SAP §11 Pharmacokinetics (ADPC/ADPP)', color: '#f6ead2', n: 210, s0: 0.14, kind: 'ADaM',
    subs: ['BLQ handling', 'NCA parameters', 'Actual vs nominal time', 'PK population rules'],
    out: ['ADPC', 'ADPP'], vars: ['Nominal vs actual time', 'BLQ handling', 'Cmax', 'AUClast', 'AUCinf', 't1/2', 'Tmax', 'Accumulation ratio'] },
  { key: 'TAB', num: '14.1', name: '§14.1 Safety tables', title: 'SAP §14.1 Safety table shells', color: '#d7e3fb', n: 520, s0: 0.2, prefix: 'T-14.3', kind: 'Table',
    subs: ['AE summaries', 'Lab summaries', 'Vital signs / ECG summaries', 'Exposure summaries', 'Deaths and SAEs'],
    titles: ['TEAEs by SOC/PT', 'Serious TEAEs by SOC/PT', 'TEAEs by maximum CTCAE grade', 'TEAEs leading to discontinuation', 'Treatment-related TEAEs', 'Deaths and cause of death', 'AEs of special interest', 'Lab shift from baseline (CTCAE)', 'Hematology summary by visit', 'Chemistry summary by visit', 'Vital signs change from baseline', 'QTcF categorical summary', 'Potential Hy\'s law cases', 'Exposure-adjusted AE rates'],
    out: ['ADAE', 'ADLB', 'ADVS', 'ADEG'], vars: ['TRTEMFL', 'AESEVN', 'ATOXGR', 'CHG', 'PCHG', 'BASE', 'ANL01FL'] },
  { key: 'LIS', num: '14.2', name: '§14.2 Listings', title: 'SAP §14.2 Listing shells', color: '#dbe4f2', n: 260, s0: 0.18, prefix: 'L-16.2', kind: 'Listing',
    subs: ['Disposition and deviations', 'Safety listings', 'Efficacy listings'],
    titles: ['Subject disposition', 'Protocol deviations', 'Inclusion/exclusion not met', 'Adverse events', 'Serious adverse events', 'Deaths', 'Abnormal lab values', 'Concomitant medications', 'Study drug exposure', 'Tumor assessments'],
    out: ['ADSL', 'ADAE', 'ADLB', 'ADCM', 'ADEX'], vars: ['listing sort keys', 'page-by vars', 'flag columns'] },
  { key: 'FIG', num: '14.3', name: '§14.3 Figures', title: 'SAP §14.3 Figure shells', color: '#efe0d4', n: 190, s0: 0.24, prefix: 'F-14', kind: 'Figure',
    subs: ['Time-to-event figures', 'Response figures', 'PK figures', 'Safety figures'],
    titles: ['Kaplan-Meier plot: PFS', 'Kaplan-Meier plot: OS', 'Forest plot: PFS by subgroup', 'Waterfall: best % change SLD', 'Swimmer plot: duration of response', 'Mean (SD) concentration-time', 'eDISH plot (ALT vs bilirubin)', 'Spaghetti plot: QTcF change'],
    out: ['ADTTE', 'ADTR', 'ADPC', 'ADLB'], vars: ['plot data step', 'subgroup flags', 'axis scaling', 'risk table counts'] },
]
const SMALL = ['ADMH', 'ADQS', 'ADIE', 'ADDV', 'ADSV', 'ADFA', 'ADCE', 'ADPR', 'ADBM', 'ADRG']
SMALL.forEach((k, j) =>
  SECTIONS.push({ key: k, num: `12.${j + 1}`, name: k, title: `SAP §12.${j + 1} Other analyses (${k})`, small: true, color: '#e9eaee', n: ri(14, 30), s0: 0.08 + rnd() * 0.25, kind: 'ADaM',
    subs: ['Derivation rules', 'Baseline'], out: [k], vars: ['derivation', 'baseline flag', 'visit windowing'] }))

// ---- work-time -> calendar day (pauses are dead time) ----
const PAUSE_TOTAL = PAUSES.reduce((s, p) => s + p.to - p.from, 0)
const WORK = END - START - PAUSE_TOTAL
export function calFromWork(f) {
  let c = START + f * WORK
  for (const p of PAUSES) if (c >= p.from) c += p.to - p.from
  return c
}
export const inPause = (t) => PAUSES.some((p) => t >= p.from && t < p.to)

// ---- build tree (primary parent) ----
export const nodes = []
const sap = { id: 'SAP', title: 'Study XYZ-101 Statistical Analysis Plan', kind: 'SAP (root)', depth: 0, parent: -1, children: [], extra: [], sec: -1, start: 0, done: 0, qc: 0, agent: 0 }
nodes.push(sap)

const numCount = {}
const subCount = {}
function labelFor(sec, depth) {
  if (depth === 1) return { title: sec.title, kind: 'SAP section' }
  if (depth === 2) {
    subCount[sec.key] = (subCount[sec.key] || 0) + 1
    const k = subCount[sec.key]
    return { title: `SAP §${sec.num}.${k} ${sec.subs[(k - 1) % sec.subs.length]}`, kind: 'SAP rule' }
  }
  const isOut = sec.kind === 'Table' || sec.kind === 'Figure' || sec.kind === 'Listing'
  if (depth === 3) return isOut ? { title: `Mock shell: ${pick(sec.titles)}`, kind: 'TFL shell' }
    : { title: `${pick(sec.out)} spec: ${pick(sec.vars)}`, kind: sec.kind === 'SDTM' ? 'Mapping spec' : 'ADaM spec' }
  if (depth <= 9) {
    if (sec.kind === 'SDTM') return { title: `${pick(sec.out)}.${pick(sec.vars)} mapping`, kind: 'SDTM program' }
    return { title: `${pick(sec.out)}: ${pick(sec.vars)}`, kind: 'ADaM derivation' }
  }
  if (isOut) {
    numCount[sec.key] = (numCount[sec.key] || 0) + 1
    const n = numCount[sec.key]
    return { title: `${sec.prefix}.${Math.ceil(n / 9)}.${((n - 1) % 9) + 1} ${pick(sec.titles)}`, kind: sec.kind + ' output' }
  }
  return { title: `${pick(sec.out)} ${pick(['QC compare report', 'dataset release', 'define.xml entry', 'reviewer guide section'])}`, kind: 'Deliverable' }
}

function grow(secIdx, parent, budget, depth) {
  const sec = SECTIONS[secIdx]
  const idx = nodes.length
  const n = { id: `${sec.key}-${String(idx).padStart(4, '0')}`, ...labelFor(sec, depth), depth, parent, children: [], extra: [], sec: secIdx }
  nodes.push(n)
  nodes[parent].children.push(idx)
  const rem = budget - 1
  if (rem <= 0 || depth >= MAXD) return
  let k = depth <= 2 ? ri(3, 6) : rnd() < 0.42 ? 1 : rnd() < 0.75 ? 2 : 3
  k = Math.min(k, rem)
  const w = Array.from({ length: k }, () => 0.15 + rnd() ** 1.6)
  const ws = w.reduce((a, b) => a + b, 0)
  const parts = w.map((x) => Math.max(1, Math.floor((x / ws) * rem)))
  parts[0] += rem - parts.reduce((a, b) => a + b, 0)
  for (const p of parts) if (p > 0) grow(secIdx, idx, p, depth + 1)
}
SECTIONS.forEach((_, i) => grow(i, 0, SECTIONS[i].n, 1))
for (let i = nodes.length - 1; i >= 0; i--) {
  const n = nodes[i]
  n.size = 1 + n.children.reduce((s, c) => s + nodes[c].size, 0)
}

// ---- angular layout ----
const TOTAL = SECTIONS.reduce((s, x) => s + Math.max(x.n, x.small ? 40 : 0), 0)
const GAPA = 0.012
let a = -Math.PI / 2 + 0.02
SECTIONS.forEach((s, i) => {
  const span = (Math.max(s.n, s.small ? 40 : 0) / TOTAL) * (Math.PI * 2 - GAPA * SECTIONS.length - 0.04)
  s.a0 = a; s.a1 = a + span; a += span + GAPA
  s.root = sap.children[i]
})
export const R0 = 44
export const R1 = 300
const STEP = (R1 - R0) / (MAXD - 1)
function place(idx, a0, a1) {
  const n = nodes[idx]
  const span = a1 - a0
  n.angle = (a0 + a1) / 2 + (rnd() - 0.5) * Math.min(span * 0.4, 0.02)
  n.r = R0 + (n.depth - 1) * STEP + (rnd() - 0.5) * STEP * 0.7
  n.x = Math.cos(n.angle) * n.r
  n.y = Math.sin(n.angle) * n.r
  let c0 = a0
  const tot = n.children.reduce((s, c) => s + nodes[c].size, 0)
  for (const c of n.children) {
    const w = (nodes[c].size / tot) * span
    place(c, c0, c0 + w)
    c0 += w
  }
}
SECTIONS.forEach((s) => place(s.root, s.a0 + 0.004, s.a1 - 0.004))
sap.x = 0; sap.y = 0; sap.r = 0

// ---- schedule (work-fraction units): a node starts after its parent is validated ----
for (let i = 1; i < nodes.length; i++) {
  const n = nodes[i]
  const p = nodes[n.parent]
  const s0 = SECTIONS[n.sec].s0
  const ready = n.parent === 0 ? s0 * 0.5 : p.qw
  n.sw = ready + 0.002 + rnd() ** 2 * (n.depth <= 2 ? 0.01 : 0.06) + (n.depth === 2 ? s0 * 0.5 : 0)
  n.dw = n.sw + 0.004 + rnd() * 0.012
  n.qw = n.dw + 0.002 + rnd() * 0.01
  if (rnd() < 0.045 && n.depth > 2) { n.mmw = n.dw + 0.002; n.qw += 0.012 + rnd() * 0.025 }
}
const maxQ = Math.max(...nodes.slice(1).map((n) => n.qw))
const norm = (w) => (w / maxQ) * 0.975
for (const n of nodes.slice(1)) {
  n.start = calFromWork(norm(n.sw)); n.done = calFromWork(norm(n.dw)); n.qc = calFromWork(norm(n.qw))
  if (n.mmw != null) n.mm = calFromWork(norm(n.mmw))
  n.agent = 1 + Math.floor(rnd() * N_AGENTS)
}

// ---- the gap: ADTTE censoring found inconsistent with SAP §9.4.2; everything downstream is invalidated ----
const effIdx = SECTIONS.findIndex((s) => s.key === 'EFF')
const effRoot = nodes[SECTIONS[effIdx].root]
const gapRoot = effRoot.children.map((c) => nodes[c]).sort((x, y) => Math.abs(x.size - 110) - Math.abs(y.size - 110))[0]
gapRoot.title = 'SAP §9.4.2 PFS censoring rules'
const gapChild = nodes[gapRoot.children.slice().sort((x, y) => nodes[y].size - nodes[x].size)[0]]
gapChild.title = 'ADTTE spec: CNSR (PFS censoring)'
gapChild.kind = 'ADaM spec'
const gapRootIdx = nodes.indexOf(gapRoot)
const gapSet = []
;(function mark(i) { gapSet.push(i); nodes[i].children.forEach(mark) })(gapRootIdx)
gapSet.sort((x, y) => x - y) // parents before children (DFS order)
let shift = 0
for (const i of gapSet) {
  const n = nodes[i]
  n.gap = true
  if (n.start < GAP_FOUND) {
    n.s0 = n.start; n.d0 = n.done; n.q0 = n.qc; n.redFrom = GAP_FOUND
    if (n.d0 > GAP_FOUND) n.d0 = n.q0 = 1e9 // mid-flight: never finished the first time
    n.mm = null
  }
  const ready = i === gapRootIdx ? FIX0 : nodes[n.parent].qc
  const base = Math.max(ready + 0.01 + rnd() * 0.03, i === gapRootIdx ? FIX0 : 0)
  if (n.start < base) {
    const before = n.start
    n.start = base; n.done = base + 0.02 + rnd() * 0.025; n.qc = n.done + 0.015 + rnd() * 0.025
    shift = Math.max(shift, n.start - before); n.reworked = true
  }
}
export const GAP = {
  found: GAP_FOUND, sapFix: FIX0,
  fixed: Math.max(...gapSet.filter((i) => nodes[i].reworked).map((i) => nodes[i].qc)),
  rootIdx: gapRootIdx, size: gapSet.length,
}
export const gapSetIdx = new Set(gapSet)

// ---- extra (cross-section) upstream parents: e.g. ADAE derivations also need ADSL flags ----
const adslIdx = SECTIONS.findIndex((s) => s.key === 'ADSL')
const byDepth = {}
nodes.forEach((n, i) => { if (i && !gapSetIdx.has(i)) (byDepth[n.depth] ||= []).push(i) })
for (let i = 1; i < nodes.length; i++) {
  const n = nodes[i]
  if (n.depth < 4 || rnd() > 0.22) continue
  const pool = (byDepth[n.depth - 1] || []).filter((j) => j !== n.parent && nodes[j].qc < n.start &&
    (nodes[j].sec === adslIdx || nodes[j].sec === n.sec || (n.sec >= 9 && nodes[j].sec < 9)))
  const k = rnd() < 0.7 ? 1 : 2
  for (let m = 0; m < k && pool.length; m++) {
    const j = pool.splice(Math.floor(rnd() * pool.length), 1)[0]
    n.extra.push(j); nodes[j].extraKids = (nodes[j].extraKids || 0) + 1
  }
}

// ---- milestones: 108 validated deliverables spread over time (gap branch excluded) ----
const mc = nodes.filter((n, i) => i > 0 && n.depth >= 2 && n.size >= 3 && !gapSetIdx.has(i))
const msSet = new Set()
for (const s of SECTIONS) if (!s.small) msSet.add(s.root) // each SAP chapter's programming plan signed off
const need = 108 - msSet.size - 1
for (let k = 0; k < need; k++) {
  const f = ((k + 0.5) / need) ** 1.1
  const target = calFromWork(f * 0.96)
  let best = -1, bd = 1e9
  for (const n of mc) {
    const ii = nodes.indexOf(n); if (msSet.has(ii)) continue
    const d = Math.abs(n.qc - target); if (d < bd) { bd = d; best = ii }
  }
  if (best >= 0) msSet.add(best)
}
// the last deliverable to validate = CSR-ready topline output
const last = nodes.reduce((b, n, i) => (i && !gapSetIdx.has(i) && !msSet.has(i) && n.qc > (b < 0 ? -1 : nodes[b].qc) ? i : b), -1)
msSet.add(last)
nodes[last].csrReady = true
nodes[last].title += ' (CSR-ready topline)'
export const milestones = [...msSet].sort((x, y) => nodes[x].qc - nodes[y].qc)
milestones.forEach((i) => (nodes[i].milestone = true))
export const N_MS = milestones.length

const secDone = (key) => { const si = SECTIONS.findIndex((s) => s.key === key); return Math.max(...nodes.filter((n) => n.sec === si).map((n) => n.qc)) }
export const adslDay = secDone('ADSL')
export const safetyDay = secDone('TAB')
export const allDoneDay = Math.max(...nodes.map((n) => n.qc))

export function stateAt(n, t) {
  if (n.depth === 0) return 'valid'
  if (n.redFrom != null) {
    if (t < n.redFrom) return basic(n.s0, n.d0, n.q0, null, t)
    if (t < n.start) return 'gap'
  }
  return basic(n.start, n.done, n.qc, n.mm, t)
}
function basic(s, d, q, mm, t) {
  if (t < s) return 'todo'
  if (t < d) return inPause(t) ? 'todo' : 'wip'
  if (mm != null && t >= mm && t < q) return 'mismatch'
  if (t < q) return 'prog'
  return 'valid'
}
export const msDoneAt = (t) => { let c = 0; for (const i of milestones) if (nodes[i].qc <= t) c++; return c }
/** primary path from node up to the SAP, node first */
export const ancestors = (idx) => { const out = []; for (let p = idx; p >= 0; p = nodes[p].parent) out.push(p); return out }
export const secName = (n) => (n.sec >= 0 ? SECTIONS[n.sec].title : 'Root')
