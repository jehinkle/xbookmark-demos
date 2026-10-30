// Mock ADTTE generator + honest KM / Greenwood / log-log CI / log-rank math.
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const addDays = (iso, d) => { const x = new Date(iso + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + Math.round(d)); return x.toISOString().slice(0, 10) }
export const ARMS = ['Placebo', 'Xanomab 10 mg/kg']
export const PARAMS = { OS: 'Overall Survival (months)', PFS: 'Progression-Free Survival (months)' }
export function makeADTTE(n = 160, seed = 20261030) {
  const r = rng(seed), rows = [], cutoff = '2026-06-30'
  for (let i = 0; i < n; i++) {
    const arm = i % 2 === 0 ? ARMS[0] : ARMS[1]
    const usubjid = `XNB-301-${String(101 + Math.floor(i / 8)).padStart(3, '0')}-${String(1001 + i)}`
    const randdt = addDays('2024-01-15', r() * 540)
    const follow = (Date.parse(cutoff) - Date.parse(randdt)) / 86400000 / 30.4375
    const hr = arm === ARMS[1] ? 0.62 : 1
    const exp = (med) => -Math.log(1 - r()) * med / Math.LN2
    const os = exp(14 / hr), pfs = Math.min(os, exp(6.5 / hr)), drop = exp(60)
    for (const [cd, t] of [['PFS', pfs], ['OS', os]]) {
      const cens = Math.min(follow, drop)
      const event = t <= cens, aval = +(event ? t : cens).toFixed(2)
      rows.push({ STUDYID: 'XNB-301', USUBJID: usubjid, TRT01P: arm, TRT01PN: arm === ARMS[0] ? 1 : 2, PARAMCD: cd, PARAM: PARAMS[cd],
        STARTDT: randdt, ADT: addDays(randdt, aval * 30.4375), AVAL: aval, CNSR: event ? 0 : 1,
        EVNTDESC: event ? (cd === 'OS' || t === os ? 'DEATH' : 'DISEASE PROGRESSION') : (aval >= follow - 0.01 ? 'DATA CUTOFF' : 'LOST TO FOLLOW-UP') })
    }
  }
  return rows
}
const Z = 1.959964
export function km(rows) {
  const ts = [...new Set(rows.filter(r => !r.CNSR).map(r => r.AVAL))].sort((a, b) => a - b)
  let S = 1, gw = 0; const steps = [{ t: 0, S: 1, lo: 1, hi: 1, n: rows.length, d: 0 }]
  for (const t of ts) {
    const n = rows.filter(r => r.AVAL >= t).length, d = rows.filter(r => r.AVAL === t && !r.CNSR).length
    S *= 1 - d / n; if (n > d) gw += d / (n * (n - d))
    let lo = 0, hi = 0
    if (S > 0 && S < 1) { const se = Math.sqrt(gw) / Math.abs(Math.log(S)); const L = Math.log(-Math.log(S)); lo = Math.exp(-Math.exp(L + Z * se)); hi = Math.exp(-Math.exp(L - Z * se)) }
    steps.push({ t, S, lo, hi, n, d })
  }
  const censors = rows.filter(r => r.CNSR).map(r => ({ t: r.AVAL, S: at(steps, r.AVAL).S }))
  const first = f => { const s = steps.find(f); return s ? s.t : null }
  const median = first(s => s.S <= 0.5), mlo = first(s => s.t > 0 && s.lo <= 0.5), mhi = first(s => s.t > 0 && s.hi < 0.5)
  const events = rows.filter(r => !r.CNSR).length
  return { steps, censors, N: rows.length, events, censored: rows.length - events, median, mlo, mhi }
}
export function at(steps, t) { let s = steps[0]; for (const x of steps) { if (x.t <= t) s = x; else break } return s }
export const atRisk = (rows, t) => rows.filter(r => r.AVAL >= t).length
export function logrank(a, b) {
  const all = [...a.map(r => ({ ...r, g: 0 })), ...b.map(r => ({ ...r, g: 1 }))]
  const ts = [...new Set(all.filter(r => !r.CNSR).map(r => r.AVAL))].sort((x, y) => x - y)
  let O = 0, E = 0, V = 0
  for (const t of ts) {
    const risk = all.filter(r => r.AVAL >= t), n = risk.length, n1 = risk.filter(r => r.g === 1).length
    const ev = all.filter(r => r.AVAL === t && !r.CNSR), d = ev.length, d1 = ev.filter(r => r.g === 1).length
    O += d1; E += d * n1 / n; if (n > 1) V += d * (n1 / n) * (1 - n1 / n) * (n - d) / (n - 1)
  }
  const chi = (O - E) ** 2 / V, p = 1 - erf(Math.sqrt(chi / 2))
  const lhr = (O - E) / V, se = 1 / Math.sqrt(V)
  return { chi, p, hr: Math.exp(lhr), hrlo: Math.exp(lhr - Z * se), hrhi: Math.exp(lhr + Z * se) }
}
function erf(x) { const t = 1 / (1 + 0.3275911 * x); return 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x) }
