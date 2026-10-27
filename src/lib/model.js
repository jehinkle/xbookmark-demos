// Mock study-programming DAG + swarm schedule. Deterministic (seeded). No real data.

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

const RAW = ['EDC form', 'eCRF field', 'vendor lab file', 'IxRS extract', 'central ECG file', 'bioanalytical file', 'ePRO export']

// Clockwise from 12 o'clock. n = node budget; s0 = when work starts (fraction of work time)
export const SECTIONS = [
  { key: 'TAB', name: 'Safety tables', color: '#d7e3fb', n: 520, s0: 0.30, prefix: 'T-14.3', kind: 'Table',
    titles: ['TEAEs by SOC/PT', 'Serious TEAEs by SOC/PT', 'TEAEs by maximum CTCAE grade', 'TEAEs leading to discontinuation', 'Treatment-related TEAEs', 'Deaths and cause of death', 'AEs of special interest', 'Lab shift from baseline (CTCAE)', 'Hematology summary by visit', 'Chemistry summary by visit', 'Vital signs change from baseline', 'QTcF categorical summary', 'Potential Hy\'s law cases', 'Exposure-adjusted AE rates'],
    ds: ['ADAE', 'ADLB', 'ADVS', 'ADEG'], vars: ['TRTEMFL', 'AESEVN', 'ATOXGR', 'CHG', 'PCHG', 'BASE', 'ANL01FL'], sdtm: ['AE', 'LB', 'VS', 'EG'] },
  { key: 'ADAE', name: 'ADAE', color: '#fbe3d6', n: 380, s0: 0.12, prefix: 'ADAE', kind: 'ADaM',
    titles: ['ADAE dataset', 'ADAE define.xml metadata'], ds: ['ADAE'],
    vars: ['TRTEMFL', 'ASTDT imputation', 'AENDT imputation', 'ADURN', 'AOCCPFL', 'AOCCSFL', 'AREL', 'CQ01NAM (AESI)', 'ASTDY', 'ATOXGRN', 'AESER flag'], sdtm: ['AE', 'SUPPAE', 'FA'] },
  { key: 'ADLB', name: 'ADLB', color: '#e3dcf7', n: 400, s0: 0.15, prefix: 'ADLB', kind: 'ADaM',
    titles: ['ADLB dataset', 'ADLB define.xml metadata'], ds: ['ADLB'],
    vars: ['AVAL (SI units)', 'BASE', 'CHG', 'ATOXGR (CTCAE v5)', 'BTOXGR', 'ANRIND', 'ABLFL', 'AVISITN windowing', 'ANL01FL', 'PARAMCD map'], sdtm: ['LB', 'SUPPLB'] },
  { key: 'ADVS', name: 'ADVS', color: '#f8d9e3', n: 170, s0: 0.14, prefix: 'ADVS', kind: 'ADaM',
    titles: ['ADVS dataset'], ds: ['ADVS'], vars: ['AVAL', 'BASE', 'CHG', 'ABLFL', 'AVISITN windowing', 'ANRIND', 'BMI derivation'], sdtm: ['VS'] },
  { key: 'ADEG', name: 'ADEG', color: '#d9efe1', n: 160, s0: 0.16, prefix: 'ADEG', kind: 'ADaM',
    titles: ['ADEG dataset'], ds: ['ADEG'], vars: ['QTcF derivation', 'QTcB derivation', 'CHG', 'CRIT1FL (>450 ms)', 'CRIT2FL (>60 ms incr.)', 'ABLFL triplicate avg'], sdtm: ['EG'] },
  { key: 'EFF', name: 'Efficacy (ADTTE/ADRS)', color: '#d6eef4', n: 380, s0: 0.22, prefix: 'ADTTE', kind: 'ADaM',
    titles: ['ADTTE dataset', 'ADRS dataset', 'Efficacy define.xml'], ds: ['ADTTE', 'ADRS', 'ADTR'],
    vars: ['PFS AVAL', 'OS AVAL', 'CNSR', 'EVNTDESC', 'BOR (RECIST 1.1)', 'Confirmed response', 'DOR', 'Target lesion SLD', 'ORR flag'], sdtm: ['RS', 'TU', 'TR', 'DS'] },
  { key: 'PK', name: 'PK (ADPC/ADPP)', color: '#f6ead2', n: 210, s0: 0.22, prefix: 'ADPC', kind: 'ADaM',
    titles: ['ADPC dataset', 'ADPP dataset'], ds: ['ADPC', 'ADPP'],
    vars: ['Nominal vs actual time', 'BLQ handling', 'Cmax', 'AUClast', 'AUCinf', 't1/2', 'Tmax', 'Accumulation ratio'], sdtm: ['PC', 'PP', 'EX'] },
  { key: 'FIG', name: 'Figures', color: '#efe0d4', n: 190, s0: 0.50, prefix: 'F-14', kind: 'Figure',
    titles: ['Kaplan-Meier plot: PFS', 'Kaplan-Meier plot: OS', 'Forest plot: PFS by subgroup', 'Waterfall: best % change SLD', 'Swimmer plot: duration of response', 'Mean (SD) concentration-time', 'eDISH plot (ALT vs bilirubin)', 'Spaghetti plot: QTcF change'],
    ds: ['ADTTE', 'ADTR', 'ADPC', 'ADLB'], vars: ['plot data step', 'subgroup flags', 'axis scaling', 'risk table counts'], sdtm: ['RS', 'TR', 'PC', 'LB'] },
  { key: 'LIS', name: 'Listings', color: '#dbe4f2', n: 260, s0: 0.28, prefix: 'L-16.2', kind: 'Listing',
    titles: ['Subject disposition', 'Protocol deviations', 'Inclusion/exclusion not met', 'Adverse events', 'Serious adverse events', 'Deaths', 'Abnormal lab values', 'Concomitant medications', 'Study drug exposure', 'Tumor assessments'],
    ds: ['ADSL', 'ADAE', 'ADLB', 'ADCM', 'ADEX'], vars: ['listing sort keys', 'page-by vars', 'flag columns'], sdtm: ['DS', 'DV', 'IE', 'AE', 'CM'] },
  { key: 'EXCM', name: 'ADEX/ADCM', color: '#e8e1f3', n: 150, s0: 0.12, prefix: 'ADEX', kind: 'ADaM',
    titles: ['ADEX dataset', 'ADCM dataset'], ds: ['ADEX', 'ADCM'], vars: ['Dose intensity', 'Relative dose intensity', 'Cumulative dose', 'Dose delays', 'PREFL / ONTRTFL', 'ATC coding (WHODrug)'], sdtm: ['EX', 'EC', 'CM'] },
  { key: 'ADSL', name: 'ADSL', color: '#f5dfe8', n: 140, s0: 0.0, prefix: 'ADSL', kind: 'ADaM',
    titles: ['ADSL dataset', 'ADSL define.xml metadata'], ds: ['ADSL'], vars: ['SAFFL', 'ITTFL', 'PPROTFL', 'PKFL', 'TRTSDT / TRTEDT', 'AGEGR1', 'Stratification factors', 'DCSREAS', 'EOSSTT'], sdtm: ['DM', 'DS', 'EX', 'SV'] },
  { key: 'SDTM', name: 'SDTM', color: '#dcebd9', n: 360, s0: 0.0, prefix: 'SDTM', kind: 'SDTM',
    titles: ['SDTM package (define.xml + cSDRG)', 'Pinnacle 21 validation'], ds: ['DM', 'AE', 'LB', 'VS', 'EG', 'EX', 'CM', 'MH', 'DS', 'TU', 'TR', 'RS', 'PC'],
    vars: ['--DTC ISO 8601', 'controlled terminology', 'VISITNUM map', 'EPOCH', 'SUPPQUAL split', '--STRESN conversion'], sdtm: ['DM', 'AE', 'LB', 'VS', 'EG', 'EX', 'CM', 'MH', 'DS'] },
]
const SMALL = ['ADMH', 'ADQS', 'ADIE', 'ADDV', 'ADSV', 'ADFA', 'ADCE', 'ADPR', 'ADBM', 'ADRG']
for (const k of SMALL)
  SECTIONS.push({ key: k, name: k, small: true, color: '#e9eaee', n: ri(14, 30), s0: 0.1 + rnd() * 0.3, prefix: k, kind: 'ADaM',
    titles: [`${k} dataset`], ds: [k], vars: ['derivation', 'baseline flag', 'visit windowing'], sdtm: [k.slice(2), 'SUPP' + k.slice(2)] })

// ---- work-time -> calendar day (pauses are dead time) ----
const PAUSE_TOTAL = PAUSES.reduce((s, p) => s + p.to - p.from, 0)
const WORK = END - START - PAUSE_TOTAL
export function calFromWork(f) {
  let c = START + f * WORK
  for (const p of PAUSES) if (c >= p.from) c += p.to - p.from
  return c
}
export const inPause = (t) => PAUSES.some((p) => t >= p.from && t < p.to)

// ---- build DAG (tree + cross edges) ----
export const nodes = []
const csr = { id: 'CSR', title: 'Study XYZ-101 Clinical Study Report', kind: 'CSR', depth: 0, parent: -1, children: [], sec: -1 }
nodes.push(csr)

let tableNo = {}
function labelFor(sec, depth, i) {
  if (depth === 1) return { title: sec.small ? `${sec.name} dataset + define` : `${sec.name} package`, kind: sec.kind }
  if (depth <= 3 && (sec.kind === 'Table' || sec.kind === 'Figure' || sec.kind === 'Listing')) {
    tableNo[sec.key] = (tableNo[sec.key] || 0) + 1
    const n = tableNo[sec.key]
    const id = `${sec.prefix}.${Math.ceil(n / 9)}.${((n - 1) % 9) + 1}`
    return { title: `${id} ${pick(sec.titles)}`, kind: sec.kind + ' output' }
  }
  if (depth <= 3) return { title: pick(sec.titles), kind: sec.kind === 'SDTM' ? 'SDTM domain' : 'ADaM dataset' }
  if (depth <= 9) {
    if (sec.kind === 'SDTM') return { title: `${pick(sec.ds)}.${pick(sec.vars)} mapping`, kind: 'SDTM mapping' }
    return { title: `${pick(sec.ds)}: ${pick(sec.vars)}`, kind: 'ADaM derivation' }
  }
  if (depth <= 12) return { title: `SDTM ${pick(sec.sdtm)} feed`, kind: 'SDTM mapping' }
  return { title: `raw ${pick(RAW)} spec #${100 + (i % 900)}`, kind: 'Raw data spec' }
}

function grow(secIdx, parent, budget, depth) {
  const sec = SECTIONS[secIdx]
  const idx = nodes.length
  const lab = labelFor(sec, depth, idx)
  const n = { id: `${sec.key}-${String(idx).padStart(4, '0')}`, ...lab, depth, parent, children: [], sec: secIdx }
  nodes.push(n)
  nodes[parent].children.push(idx)
  let rem = budget - 1
  if (rem <= 0 || depth >= MAXD) return
  let k = depth <= 2 ? ri(3, 7) : rnd() < 0.42 ? 1 : rnd() < 0.75 ? 2 : 3
  k = Math.min(k, rem)
  const w = Array.from({ length: k }, () => 0.15 + rnd() ** 1.6)
  const ws = w.reduce((a, b) => a + b, 0)
  const parts = w.map((x) => Math.max(1, Math.floor((x / ws) * rem)))
  let used = parts.reduce((a, b) => a + b, 0)
  parts[0] += rem - used
  for (const p of parts) if (p > 0) grow(secIdx, idx, p, depth + 1)
}
SECTIONS.forEach((_, i) => grow(i, 0, SECTIONS[i].n, 1))

// subtree sizes
for (let i = nodes.length - 1; i >= 0; i--) {
  const n = nodes[i]
  n.size = 1 + n.children.reduce((s, c) => s + nodes[c].size, 0)
}

// ---- angular layout: wedge per section, span per subtree ----
const TOTAL = SECTIONS.reduce((s, x) => s + Math.max(x.n, x.small ? 40 : 0), 0)
const GAPA = 0.012
let a = -Math.PI / 2 + 0.02
SECTIONS.forEach((s, i) => {
  const span = (Math.max(s.n, s.small ? 40 : 0) / TOTAL) * (Math.PI * 2 - GAPA * SECTIONS.length - 0.04)
  s.a0 = a; s.a1 = a + span; a += span + GAPA
  s.root = csr.children[i]
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
csr.x = 0; csr.y = 0; csr.r = 0

// ---- schedule in work-fraction units (children before parents) ----
for (let i = nodes.length - 1; i >= 1; i--) {
  const n = nodes[i]
  const s0 = SECTIONS[n.sec].s0
  let d
  if (!n.children.length) d = s0 + rnd() * 0.22 + (MAXD - n.depth) * 0.004
  else d = Math.max(...n.children.map((c) => nodes[c].qw)) + 0.003 + rnd() * 0.014
  n.dw = d
  n.sw = d - (0.004 + rnd() * 0.012)
  n.qw = d + 0.002 + rnd() * 0.01
  if (rnd() < 0.045 && n.depth > 2) { n.mmw = d + 0.002; n.qw += 0.015 + rnd() * 0.03 }
}
const maxQ = Math.max(...nodes.slice(1).map((n) => n.qw))
const minS = Math.min(...nodes.slice(1).map((n) => n.sw))
const norm = (w) => ((w - minS) / (maxQ - minS)) * 0.975
for (const n of nodes.slice(1)) {
  n.start = calFromWork(norm(n.sw)); n.done = calFromWork(norm(n.dw)); n.qc = calFromWork(norm(n.qw))
  if (n.mmw != null) n.mm = calFromWork(norm(n.mmw))
  n.agent = 1 + Math.floor(rnd() * N_AGENTS)
}

// ---- the gap: SAP derivation discrepancy in ADTTE censoring ----
const effIdx = SECTIONS.findIndex((s) => s.key === 'EFF')
const cands = nodes.filter((n) => n.sec === effIdx && n.depth >= 2 && n.depth <= 3 && n.size >= 40 && n.size <= 160)
const gapRoot = cands.sort((x, y) => y.size - x.size)[0] || nodes.find((n) => n.sec === effIdx && n.depth === 2)
gapRoot.title = 'ADTTE.CNSR: PFS censoring derivation'
gapRoot.kind = 'ADaM derivation'
const gapSet = new Set()
;(function mark(i) { gapSet.add(i); nodes[i].children.forEach(mark) })(nodes.indexOf(gapRoot))
for (let p = gapRoot.parent; p > 0; p = nodes[p].parent) gapSet.add(p)
const FIX0 = 18.6
;[...gapSet].sort((x, y) => nodes[y].depth - nodes[x].depth).forEach((i) => {
  const n = nodes[i]
  const childQ = n.children.length ? Math.max(...n.children.map((c) => nodes[c].qc)) : 0
  if (n.start < GAP_FOUND) {
    n.s0 = n.start; n.d0 = n.done; n.q0 = n.qc; n.redFrom = GAP_FOUND
    if (n.d0 > GAP_FOUND) n.d0 = n.q0 = 1e9 // was mid-flight: never finished first time
    n.mm = null
  }
  const base = Math.max(FIX0 + rnd() * 0.9 - n.depth * 0.02, childQ + 0.02)
  if (n.start < base) {
    n.start = base; n.done = base + 0.04 + rnd() * 0.05; n.qc = n.done + 0.03 + rnd() * 0.06
  }
  n.gap = true
})
// re-propagate parents outside? (ancestors are in gapSet; CSR handled below)
export const GAP = { found: GAP_FOUND, fixed: gapRoot.qc, rootIdx: nodes.indexOf(gapRoot) }

csr.done = Math.max(Math.max(...nodes.slice(1).map((n) => n.qc)) + 0.03, 23.75)
csr.start = csr.done - 0.05
csr.qc = Math.min(DAYS - 0.05, csr.done + 0.15)
csr.agent = 0

// ---- milestones: 107 validated deliverables spread over time + the CSR-ready lock ----
const mc = nodes.filter((n, i) => i > 0 && n.depth >= 2 && n.depth <= 11 && n.size >= 4 && (!n.gap || i === GAP.rootIdx))
mc.sort((x, y) => x.qc - y.qc)
const msSet = new Set()
for (const s of SECTIONS) if (!s.small) msSet.add(s.root) // every package is a milestone
msSet.add(GAP.rootIdx)
const need = 107 - msSet.size
const t0 = mc[0].qc, t1 = mc[mc.length - 1].qc
for (let k = 0; k < need; k++) {
  // targets evenly spaced in work time, slightly front-loaded like the original burn-up
  const f = ((k + 0.5) / need) ** 1.15
  const target = calFromWork(f * 0.97)
  let best = -1, bd = 1e9
  for (let j = 0; j < mc.length; j++) {
    const ii = nodes.indexOf(mc[j]); if (msSet.has(ii)) continue
    const d = Math.abs(mc[j].qc - target); if (d < bd) { bd = d; best = ii }
  }
  if (best >= 0) msSet.add(best)
}
void t0; void t1
msSet.add(0)
export const milestones = [...msSet].sort((x, y) => nodes[x].qc - nodes[y].qc)
milestones.forEach((i) => (nodes[i].milestone = true))
export const N_MS = milestones.length

export const adslDay = nodes[SECTIONS.find((s) => s.key === 'ADSL').root].qc
export const safetyDay = nodes[SECTIONS.find((s) => s.key === 'TAB').root].qc

export function stateAt(n, t) {
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
export const ancestors = (idx) => { const out = []; for (let p = idx; p >= 0; p = nodes[p].parent) out.push(p); return out }
