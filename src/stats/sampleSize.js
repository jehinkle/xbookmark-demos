// Fixed-design sample size / events and TTE accrual model.
import { qnorm } from './normal.js'

const zsum = (alpha, beta) => qnorm(1 - alpha) + qnorm(1 - beta)

// Continuous: H0 muT-muC <= delta0 (delta0 = -margin for NI). r = nT/nC. Returns total N (unrounded).
export function nMeans({ delta, sd, alpha, beta, r = 1, delta0 = 0 }) {
  const p = r / (1 + r)
  return (zsum(alpha, beta) * sd) ** 2 / (p * (1 - p) * (delta - delta0) ** 2)
}

// Restricted MLE of (qT, qC) under qT - qC = d0 (Farrington-Manning), solved numerically.
export function fmRestricted(pT, pC, d0, xT) {
  const xC = 1 - xT, ll = qC => { const qT = qC + d0; return xT * (pT * Math.log(qT) + (1 - pT) * Math.log(1 - qT)) + xC * (pC * Math.log(qC) + (1 - pC) * Math.log(1 - qC)) }
  let lo = Math.max(1e-9, -d0 + 1e-9), hi = Math.min(1 - 1e-9, 1 - d0 - 1e-9)
  for (let i = 0; i < 200; i++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (ll(m1) < ll(m2)) lo = m1; else hi = m2 }
  const qC = (lo + hi) / 2; return { qT: qC + d0, qC }
}
// Binary: H0 pT - pC <= delta0. Farrington-Manning variance under H0 (pooled when delta0=0).
export function nRates({ pT, pC, alpha, beta, r = 1, delta0 = 0 }) {
  const xT = r / (1 + r), xC = 1 - xT
  const { qT, qC } = fmRestricted(pT, pC, delta0, xT)
  const v0 = qT * (1 - qT) / xT + qC * (1 - qC) / xC, v1 = pT * (1 - pT) / xT + pC * (1 - pC) / xC
  return ((qnorm(1 - alpha) * Math.sqrt(v0) + qnorm(1 - beta) * Math.sqrt(v1)) / (pT - pC - delta0)) ** 2
}

// TTE events. Schoenfeld (supports NI via hr0) or Freedman (superiority).
export function eventsSchoenfeld({ hr, hr0 = 1, alpha, beta, r = 1 }) {
  const p = r / (1 + r)
  return zsum(alpha, beta) ** 2 / (p * (1 - p) * Math.log(hr / hr0) ** 2)
}
export function eventsFreedman({ hr, alpha, beta, r = 1 }) {
  return zsum(alpha, beta) ** 2 * (1 + r * hr) ** 2 / (r * (1 - hr) ** 2)
}

// Expected fraction of subjects with an observed event by calendar time tau,
// uniform accrual over [0,R], exponential event hazard lam and dropout hazard eta.
export function eventFrac(tau, R, lam, eta) {
  if (tau <= 0) return 0
  const k = lam + eta, A = Math.min(tau, R)
  // (1/R) * int_0^A (1 - exp(-k (tau-u))) du
  const integ = A - (Math.exp(-k * (tau - A)) - Math.exp(-k * tau)) / k
  return lam / k * integ / R
}
export function tteModel({ medianC, hr, R, F, dropoutPerYear = 0, r = 1 }) {
  const lamC = Math.LN2 / medianC, lamT = lamC * hr
  const eta = dropoutPerYear > 0 ? -Math.log(1 - dropoutPerYear) / 12 : 0
  const xT = r / (1 + r)
  const frac = tau => xT * eventFrac(tau, R, lamT, eta) + (1 - xT) * eventFrac(tau, R, lamC, eta)
  return { lamC, lamT, eta, xT, frac, pEvent: frac(R + F) }
}
// calendar time at which expected events = target, with N subjects
export function timeForEvents(model, N, target, tmax = 600) {
  let lo = 0, hi = tmax
  if (N * model.frac(hi) < target) return Infinity
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (N * model.frac(m) < target) lo = m; else hi = m }
  return (lo + hi) / 2
}
