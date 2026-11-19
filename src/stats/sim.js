// Seeded Monte Carlo power for a two-arm trial, analysed like the real trial would be.
// Continuous: pooled two-sample Student t-test (same test as power.t.test). Binary: uncorrected chi-square (pooled z).
// Options: dropout (each randomised subject independently missing, completers analysed) and outcome shape
// ('normal' | 'lognormal-moderate' | 'lognormal-heavy': right-skewed with the same SD and the same mean difference).
import { qt, qnorm, pnorm } from './dist.js'
import { nStandard } from './standard.js'

export function rng(seed) {
  let a = seed >>> 0
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  let spare = null
  const norm = () => {
    if (spare !== null) { const v = spare; spare = null; return v }
    let x, y, r
    do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y } while (r >= 1 || r === 0)
    const f = Math.sqrt(-2 * Math.log(r) / r); spare = y * f; return x * f
  }
  return { u, norm }
}
export const SHAPES = { normal: 0, 'lognormal-moderate': 0.5, 'lognormal-heavy': 1.0 }

// Generator of one outcome with mean 0 and SD sd
function outcome(R, sd, shape) {
  const k = SHAPES[shape] || 0
  if (!k) return () => sd * R.norm()
  const m = sd / Math.sqrt(Math.exp(k * k) - 1), mu = Math.log(m) - k * k / 2
  return () => Math.exp(mu + k * R.norm()) - m
}

export function simPower(s, nC, nSim, seed, opt = {}) {
  const R = rng(seed), drop = opt.dropout || 0, nTr = Math.ceil(s.ratio * nC - 1e-9), za = qnorm(1 - s.alpha / 2)
  const keep = n => { if (!drop) return n; let k = 0; for (let i = 0; i < n; i++) if (R.u() >= drop) k++; return k }
  let rej = 0
  if (s.endpoint === 'continuous') {
    const draw = outcome(R, s.sd, opt.shape), crit = new Map()
    for (let it = 0; it < nSim; it++) {
      const a = keep(nC), b = keep(nTr)
      if (a < 2 || b < 2) continue
      let s1 = 0, q1 = 0, s2 = 0, q2 = 0
      for (let i = 0; i < a; i++) { const x = draw(); s1 += x; q1 += x * x }
      for (let i = 0; i < b; i++) { const x = draw() + s.delta; s2 += x; q2 += x * x }
      const m1 = s1 / a, m2 = s2 / b, df = a + b - 2, sp2 = (q1 - a * m1 * m1 + q2 - b * m2 * m2) / df
      const t = (m2 - m1) / Math.sqrt(sp2 * (1 / a + 1 / b))
      let c = crit.get(df); if (c === undefined) { c = qt(1 - s.alpha / 2, df); crit.set(df, c) }
      if (Math.abs(t) > c) rej++
    }
  } else {
    for (let it = 0; it < nSim; it++) {
      const a = keep(nC), b = keep(nTr)
      if (a < 1 || b < 1) continue
      let x1 = 0, x2 = 0
      for (let i = 0; i < a; i++) if (R.u() < s.pC) x1++
      for (let i = 0; i < b; i++) if (R.u() < s.pT) x2++
      const p = (x1 + x2) / (a + b)
      if (p <= 0 || p >= 1) continue
      const z = (x2 / b - x1 / a) / Math.sqrt(p * (1 - p) * (1 / a + 1 / b))
      if (Math.abs(z) > za) rej++
    }
  }
  const p = rej / nSim
  return { n: nC, power: p, se: Math.sqrt(p * (1 - p) / nSim), nSim }
}

// Grid of candidate n around the dropout-inflated standard answer, then a probit-vs-sqrt(n) fit to read off
// the smallest n reaching the target (smooths Monte Carlo noise instead of trusting a single noisy crossing).
export function simGrid(s, nSim, seed, opt = {}, onProgress) {
  const base = nStandard(s) / (1 - (opt.dropout || 0))
  const ns = [...new Set(Array.from({ length: 11 }, (_, i) => Math.max(4, Math.round(base * (0.6 + 0.09 * i)))))]
  const pts = ns.map((n, i) => { const r = simPower(s, n, nSim, seed + 7919 * n, opt); onProgress?.((i + 1) / ns.length); return r })
  return { pts, ...fitN(pts, s.power) }
}
export function fitN(pts, target) {
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0
  for (const p of pts) {
    if (p.power <= 0.02 || p.power >= 0.995) continue
    const y = qnorm(p.power), x = Math.sqrt(p.n), dn = Math.exp(-y * y / 2) / 2.5066282746310002
    const w = p.nSim * dn * dn / (p.power * (1 - p.power))
    sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y
  }
  const b = (sw * sxy - sx * sy) / (sw * sxx - sx * sx), a = (sy - b * sx) / sw
  if (!(b > 0)) return { nFit: NaN, a, b }
  const nFit = ((qnorm(target) - a) / b) ** 2
  return { nFit, n: Math.ceil(nFit), a, b, curve: n => pnorm(a + b * Math.sqrt(n)) }
}
