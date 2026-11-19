// Bayesian views (normal approximations, closed form, no MCMC).
// Effect theta is oriented so that the assumed effect is positive.
//  (a) Assurance: design prior theta ~ N(mu0, tau^2); probability the standard two-sided test succeeds,
//      averaged over the prior: Phi((mu0 - z * se0) / sqrt(se1^2 + tau^2)).
//  (b) Decision rule: analysis prior theta ~ N(m, v), v = se(n0)^2 (n0 = effective prior sample size per control arm;
//      n0 = 0 means a flat prior). Data thetaHat ~ N(theta, se^2) with plug-in se. Success if P(theta > 0 | data) > gamma.
import { pnorm, qnorm } from './dist.js'
import { effect, seAlt, seNull } from './standard.js'

export function designPrior(b, s) { const d = effect(s); return { mu: b.priorMeanMult * d, tau: b.priorSdMult * d } }

export function assurance(s, b, nC) {
  const { mu, tau } = designPrior(b, s), za = qnorm(1 - s.alpha / 2)
  return pnorm((mu - za * seNull(s, nC)) / Math.sqrt(seAlt(s, nC) ** 2 + tau ** 2))
}
export const assuranceLimit = (s, b) => { const { mu, tau } = designPrior(b, s); return tau > 0 ? pnorm(mu / tau) : 1 }

export function analysisPrior(s, b) {
  if (!(b.n0 > 0)) return { m: 0, v: Infinity }
  return { m: b.analysisMean === 'skeptical' ? 0 : effect(s), v: seAlt(s, b.n0) ** 2 }
}
// Critical value on thetaHat for the rule, given the data SE
export function critical(s, b, se) {
  const { m, v } = analysisPrior(s, b), zg = qnorm(b.gamma), pi = isFinite(v) ? 1 / v : 0
  return (zg * Math.sqrt(pi + 1 / se ** 2) - m * pi) * se ** 2
}
export function rule(s, b, nC) {
  const se1 = seAlt(s, nC), se0 = seNull(s, nC), c1 = critical(s, b, se1), c0 = critical(s, b, se0)
  const { mu, tau } = designPrior(b, s)
  return {
    c: c1, pSuccess: 1 - pnorm((c1 - effect(s)) / se1), typeI: 1 - pnorm(c0 / se0),
    bayesAssurance: pnorm((mu - c1) / Math.sqrt(se1 ** 2 + tau ** 2)),
  }
}
export function priorAloneSucceeds(s, b) { const { m, v } = analysisPrior(s, b); return isFinite(v) && m / Math.sqrt(v) > qnorm(b.gamma) }
export function nBayes(s, b, max = 20000) {
  for (let n = 2; n <= max; n++) if (rule(s, b, n).pSuccess >= s.power) return n
  return NaN
}
