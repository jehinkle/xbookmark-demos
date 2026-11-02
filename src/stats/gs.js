// Group-sequential engine: Lan-DeMets spending, recursive numerical integration
// on the score scale S_k = Z_k*sqrt(t_k) ~ BM(drift delta, var t).
import { pnorm, qnorm, dnorm } from './normal.js'

export function spend(type, total, t, param) {
  if (t <= 0) return 0
  if (t >= 1) return total
  if (type === 'OF') return 2 * (1 - pnorm(qnorm(1 - total / 2) / Math.sqrt(t)))
  if (type === 'Pocock') return total * Math.log(1 + (Math.E - 1) * t)
  if (type === 'HSD') { const g = param ?? -4; return g === 0 ? total * t : total * (1 - Math.exp(-g * t)) / (1 - Math.exp(-g)) }
  throw new Error('unknown spending ' + type)
}

const M = 401 // grid points (odd, Simpson)
function simpsonW(n, h) { const w = new Float64Array(n); for (let i = 0; i < n; i++) w[i] = (i === 0 || i === n - 1 ? 1 : i % 2 ? 4 : 2) * h / 3; return w }

// state: grid (s values), dens*weights for continuation region at previous look
function firstState() { return null }
function crossProbs(state, tk, tprev, delta, sLim, upper) {
  // probability of S_k beyond sLim (upper: >, else <) with continuation up to previous look
  const dt = tk - tprev, sd = Math.sqrt(dt)
  if (!state) { const z = (sLim - delta * tk) / Math.sqrt(tk); return upper ? 1 - pnorm(z) : pnorm(z) }
  let p = 0
  for (let i = 0; i < state.s.length; i++) {
    const z = (sLim - state.s[i] - delta * dt) / sd
    p += state.w[i] * (upper ? 1 - pnorm(z) : pnorm(z))
  }
  return p
}
function nextState(state, tk, tprev, delta, lo, hi) {
  const mean = delta * tk, sdT = Math.sqrt(tk)
  const L = Math.max(lo, mean - 9 * sdT), H = Math.min(hi, mean + 9 * sdT)
  if (!(H > L)) return { s: new Float64Array(0), w: new Float64Array(0) }
  const h = (H - L) / (M - 1), sw = simpsonW(M, h), s = new Float64Array(M), w = new Float64Array(M)
  const dt = tk - tprev, sd = Math.sqrt(dt)
  for (let j = 0; j < M; j++) {
    s[j] = L + j * h
    let f
    if (!state) f = dnorm((s[j] - mean) / sdT) / sdT
    else { f = 0; for (let i = 0; i < state.s.length; i++) f += state.w[i] * dnorm((s[j] - state.s[i] - delta * dt) / sd) / sd }
    w[j] = f * sw[j]
  }
  return { s, w }
}
function solve(fn, lo, hi, target, inc) { // bisection; fn monotone; inc=true if fn increasing
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, v = fn(m); if ((v < target) === inc) lo = m; else hi = m }
  return (lo + hi) / 2
}

// Upper efficacy bounds (z) from alpha spending under H0, ignoring futility (non-binding)
export function upperBounds(t, alpha, sf, sfPar) {
  const b = []; let st = firstState(), prev = 0, spent = 0
  t.forEach((tk, k) => {
    const inc = spend(sf, alpha, tk, sfPar) - spent
    const z = inc <= 1e-15 ? 20 : solve(z => crossProbs(st, tk, prev, 0, z * Math.sqrt(tk), true), -10, 20, inc, false)
    b.push(z); spent += crossProbs(st, tk, prev, 0, z * Math.sqrt(tk), true)
    st = nextState(st, tk, prev, 0, -Infinity, z * Math.sqrt(tk)); prev = tk
  })
  return b
}

// Probabilities of crossing upper / lower at each look given bounds and drift
export function gsProbs(t, a, b, delta) {
  const up = [], lo = []; let st = firstState(), prev = 0
  t.forEach((tk, k) => {
    const r = Math.sqrt(tk), al = a ? a[k] : -Infinity
    up.push(crossProbs(st, tk, prev, delta, b[k] * r, true))
    lo.push(al === -Infinity ? 0 : crossProbs(st, tk, prev, delta, al * r, false))
    if (k < t.length - 1) st = nextState(st, tk, prev, delta, al * r, b[k] * r)
    prev = tk
  })
  return { upper: up, lower: lo }
}

// Lower futility bounds via beta spending under drift delta (with both bounds active)
function lowerBounds(t, b, delta, beta, sf, sfPar) {
  const a = []; let st = firstState(), prev = 0, spent = 0
  t.forEach((tk, k) => {
    const r = Math.sqrt(tk), inc = spend(sf, beta, tk, sfPar) - spent
    let z = inc <= 1e-15 ? -20 : solve(z => crossProbs(st, tk, prev, delta, z * r, false), -20, 20, inc, true)
    if (k < t.length - 1) z = Math.min(z, b[k])
    a.push(z); spent += crossProbs(st, tk, prev, delta, z * r, false)
    st = nextState(st, tk, prev, delta, z * r, b[k] * r); prev = tk
  })
  return a
}

/**
 * Design: t = information fractions (last = 1), alpha one-sided, beta.
 * futility: null | { sf, par } -> non-binding beta-spending futility (gsDesign test.type=4)
 */
export function gsDesign({ t, alpha, beta, sf = 'OF', sfPar, futility = null }) {
  const zfix = qnorm(1 - alpha) + qnorm(1 - beta)
  const b = upperBounds(t, alpha, sf, sfPar)
  let a = null, delta
  if (t.length === 1) delta = zfix
  else if (!futility) delta = solve(d => gsProbs(t, null, b, d).upper.reduce((x, y) => x + y, 0), 0, 15, 1 - beta, true)
  else {
    delta = solve(d => { const aa = lowerBounds(t, b, d, beta, futility.sf, futility.par); return aa[aa.length - 1] - b[b.length - 1] }, zfix * 0.5, zfix * 3, 0, true)
    a = lowerBounds(t, b, delta, beta, futility.sf, futility.par); a[a.length - 1] = b[b.length - 1]
  }
  const IF = (delta / zfix) ** 2
  const h1 = gsProbs(t, a, b, delta), h0 = gsProbs(t, a, b, 0), h0nb = gsProbs(t, null, b, 0)
  const asn = p => t.reduce((s, tk, k) => s + tk * (p.upper[k] + p.lower[k]), 0) + (1 - sum(p.upper) - sum(p.lower)) * 1
  return {
    t, b, a, delta, IF, zfix,
    alphaSpent: h0nb.upper, power: sum(h1.upper), typeI: sum(h0nb.upper),
    stopH1: h1, stopH0: h0, asnH1: asn(h1), asnH0: asn(h0),
  }
}
export function sum(x) { return x.reduce((a, b) => a + b, 0) }
export function powerAt(design, deltaNew) { return sum(gsProbs(design.t, design.a, design.b, deltaNew).upper) }
