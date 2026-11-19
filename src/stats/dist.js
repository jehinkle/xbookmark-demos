// Central and noncentral t helpers built on the normal helpers.
import { pnorm, qnorm, dnorm } from './normal.js'
export { pnorm, qnorm, dnorm }

const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x)
  x -= 1; let a = 0.99999999999980993; const t = x + 7.5
  for (let i = 0; i < 8; i++) a += LG[i] / (x + i + 1)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}
// Regularized incomplete beta I_x(a,b) (continued fraction, modified Lentz)
function betacf(a, b, x) {
  const FPMIN = 1e-300; let c = 1, d = 1 - (a + b) * x / (a + 1)
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d; let h = d
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break
  }
  return h
}
export function pbeta(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b
}
// Central t CDF
export function pt(t, df) {
  const tail = 0.5 * pbeta(df / (df + t * t), df / 2, 0.5)
  return t > 0 ? 1 - tail : tail
}
// Central t quantile (Newton from normal start, bisection fallback)
export function qt(p, df) {
  if (df > 1e7) return qnorm(p)
  let lo = -1e4, hi = 1e4, x = qnorm(p)
  for (let i = 0; i < 200; i++) {
    const f = pt(x, df) - p
    if (Math.abs(f) < 1e-15) break
    if (f > 0) hi = Math.min(hi, x); else lo = Math.max(lo, x)
    const dens = Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + x * x / df))
    let nx = x - f / dens
    if (!(nx > lo && nx < hi)) nx = (lo + hi) / 2
    if (Math.abs(nx - x) < 1e-13 * Math.max(1, Math.abs(x))) { x = nx; break }
    x = nx
  }
  return x
}
// Upper tail of the noncentral t: P(T' > t) with T' = (Z + ncp) / sqrt(V/df), V ~ chi2(df).
// Integrates Phi(ncp - t*sqrt(v/df)) against the chi-square density (Simpson, 4000 panels).
export function ptncUpper(t, df, ncp) {
  const sd = Math.sqrt(2 * df), lo = Math.max(0, df - 14 * sd), hi = df + 14 * sd + 30, N = 4000, h = (hi - lo) / N
  const lc = -(df / 2) * Math.log(2) - lgamma(df / 2)
  const f = v => v <= 0 ? (df === 2 ? 0.5 * pnorm(ncp) : 0) : Math.exp(lc + (df / 2 - 1) * Math.log(v) - v / 2) * pnorm(ncp - t * Math.sqrt(v / df))
  let s = f(lo) + f(hi)
  for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * f(lo + i * h)
  return s * h / 3
}
