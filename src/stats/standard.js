// Closed-form ("standard") two-arm sample size: continuous (z and t) and binary (power.prop.test style).
// Settings s: { endpoint: 'continuous'|'binary', delta, sd, pC, pT, alpha (two-sided), power, ratio (nT/nC) }
import { pnorm, qnorm, qt, ptncUpper } from './dist.js'

export const effect = s => s.endpoint === 'continuous' ? Math.abs(s.delta) : Math.abs(s.pT - s.pC)
// SE of the estimated effect with nC control subjects (alternative / null)
export function seAlt(s, nC) {
  const nT = s.ratio * nC
  return s.endpoint === 'continuous' ? s.sd * Math.sqrt(1 / nC + 1 / nT) : Math.sqrt(s.pC * (1 - s.pC) / nC + s.pT * (1 - s.pT) / nT)
}
export function pbar(s) { return (s.pC + s.ratio * s.pT) / (1 + s.ratio) }
export function seNull(s, nC) {
  if (s.endpoint === 'continuous') return seAlt(s, nC)
  const p = pbar(s); return Math.sqrt(p * (1 - p) * (1 / nC + 1 / (s.ratio * nC)))
}

// Power (one direction of the two-sided test; matches power.t.test / power.prop.test strict = FALSE)
export function powerZ(s, nC) {
  const za = qnorm(1 - s.alpha / 2)
  return pnorm((effect(s) - za * seNull(s, nC)) / seAlt(s, nC))
}
export function powerT(s, nC) {
  const df = nC * (1 + s.ratio) - 2
  if (df < 1) return NaN
  return ptncUpper(qt(1 - s.alpha / 2, df), df, effect(s) / seAlt(s, nC))
}
export const power = (s, nC) => s.endpoint === 'continuous' ? powerT(s, nC) : powerZ(s, nC)

// Closed-form n (control arm, unrounded)
export function nZ(s) {
  const za = qnorm(1 - s.alpha / 2), zb = qnorm(s.power), d = effect(s), r = s.ratio
  if (s.endpoint === 'continuous') return (za + zb) ** 2 * s.sd ** 2 * (1 + 1 / r) / d ** 2
  const p = pbar(s)
  return (za * Math.sqrt(p * (1 - p) * (1 + 1 / r)) + zb * Math.sqrt(s.pC * (1 - s.pC) + s.pT * (1 - s.pT) / r)) ** 2 / d ** 2
}
// t-based n (continuous): solve powerT = target by bisection on continuous nC
export function nT(s) {
  let lo = 3 / (1 + s.ratio), hi = Math.max(10, nZ(s) * 2 + 10)
  if (!(powerT(s, lo) < s.power)) return lo
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (powerT(s, m) < s.power) lo = m; else hi = m }
  return (lo + hi) / 2
}
export const nStandard = s => s.endpoint === 'continuous' ? nT(s) : nZ(s)
export const arms = (s, nC) => { const c = Math.ceil(nC - 1e-9), t = Math.ceil(s.ratio * c - 1e-9); return { nC: c, nT: t, N: c + t } }
