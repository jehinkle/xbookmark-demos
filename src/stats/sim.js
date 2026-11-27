// Monte Carlo check of a computed design. Pure functions (used by the web worker and tests).
export function rng(seed) {
  let a = seed >>> 0
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  let spare = null
  const n = () => { if (spare !== null) { const s = spare; spare = null; return s } let x, y, r; do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y } while (r >= 1 || r === 0); const f = Math.sqrt(-2 * Math.log(r) / r); spare = y * f; return x * f }
  return { u, n }
}
function arms(N, nT, R) { // shuffled allocation
  const a = new Uint8Array(N); for (let i = 0; i < nT; i++) a[i] = 1
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(R.u() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t }
  return a
}
function logrankZ(entry, T, C, arm, tau) {
  const idx = []
  for (let i = 0; i < entry.length; i++) if (entry[i] < tau) idx.push(i)
  const time = new Float64Array(idx.length), ev = new Uint8Array(idx.length), g = new Uint8Array(idx.length)
  idx.forEach((i, j) => { const fu = tau - entry[i], m = Math.min(T[i], C[i], fu); time[j] = m; ev[j] = T[i] <= Math.min(C[i], fu) ? 1 : 0; g[j] = arm[i] })
  const ord = Array.from(idx.keys()).sort((x, y) => time[x] - time[y])
  let nT = 0, nC = 0; for (let j = 0; j < g.length; j++) g[j] ? nT++ : nC++
  let O = 0, E = 0, V = 0, D = 0
  for (const j of ord) {
    if (ev[j]) { const n = nT + nC; E += nT / n; V += nT * nC / (n * n); if (g[j]) O++; D++ }
    g[j] ? nT-- : nC--
  }
  return { z: V > 0 ? (E - O) / Math.sqrt(V) : 0, events: D }
}
// d: output of computeDesign; theta: 'H1' or 'H0'
export function simulateOne(d, R, h0) {
  const s = d.s, K = d.looks.length, N = d.arms.N, arm = arms(N, d.arms.nT, R)
  const zs = []
  if (s.endpoint === 'tte') {
    const hr = h0 ? d.hr0 : s.hr, lamT = d.model.lamC * hr, lamC = d.model.lamC, eta = d.model.eta
    const entry = new Float64Array(N), T = new Float64Array(N), C = new Float64Array(N), cal = []
    for (let i = 0; i < N; i++) {
      entry[i] = s.accrual * R.u(); T[i] = -Math.log(1 - R.u()) / (arm[i] ? lamT : lamC); C[i] = eta > 0 ? -Math.log(1 - R.u()) / eta : Infinity
      if (T[i] < C[i]) cal.push(entry[i] + T[i])
    }
    cal.sort((a, b) => a - b)
    for (let k = 0; k < K; k++) { const tau = cal[Math.min(d.dLooks[k], cal.length) - 1] + 1e-9; zs.push({ ...logrankZ(entry, T, C, arm, tau), time: tau }) }
  } else {
    const nL = d.nLooks
    if (s.endpoint === 'continuous') {
      const diff = h0 ? d.info.theta0 : s.meanT - s.meanC
      const y = new Float64Array(N); for (let i = 0; i < N; i++) y[i] = s.meanC + (arm[i] ? diff : 0) + s.sd * R.n()
      for (let k = 0; k < K; k++) {
        let sT = 0, sC = 0, qT = 0, qC = 0, nT = 0, nC = 0
        for (let i = 0; i < nL[k]; i++) { if (arm[i]) { sT += y[i]; qT += y[i] * y[i]; nT++ } else { sC += y[i]; qC += y[i] * y[i]; nC++ } }
        const mT = sT / nT, mC = sC / nC, v = (qT - nT * mT * mT + qC - nC * mC * mC) / (nT + nC - 2)
        zs.push({ z: (mT - mC - d.info.theta0) / Math.sqrt(v * (1 / nT + 1 / nC)), n: nL[k] })
      }
    } else {
      const pT = h0 ? s.pC + d.info.theta0 : s.pT, pC = s.pC
      const y = new Uint8Array(N); for (let i = 0; i < N; i++) y[i] = R.u() < (arm[i] ? pT : pC) ? 1 : 0
      for (let k = 0; k < K; k++) {
        let xT = 0, xC = 0, nT = 0, nC = 0
        for (let i = 0; i < nL[k]; i++) { if (arm[i]) { xT += y[i]; nT++ } else { xC += y[i]; nC++ } }
        const a = xT / nT, b = xC / nC, se = Math.sqrt(a * (1 - a) / nT + b * (1 - b) / nC) || 1e-9
        zs.push({ z: (a - b - d.info.theta0) / se, n: nL[k] })
      }
    }
  }
  // outcome with futility obeyed, and ignoring futility (non-binding)
  let stop = K - 1, reject = false, rejectNB = false, fut = false
  for (let k = 0; k < K; k++) { if (zs[k].z >= d.gs.b[k]) { rejectNB = true; break } }
  for (let k = 0; k < K; k++) {
    if (zs[k].z >= d.gs.b[k]) { reject = true; stop = k; break }
    if (d.gs.a && k < K - 1 && zs[k].z < d.gs.a[k]) { fut = true; stop = k; break }
  }
  return { reject, rejectNB, fut, stop, at: zs[stop] }
}
export function simulate(d, nSim, seed = 20261102, onProgress) {
  const R = rng(seed), K = d.looks.length
  const res = { nSim, H1: { reject: 0, rejectNB: 0, stopAt: Array(K).fill(0), futAt: Array(K).fill(0), size: 0, time: 0 }, H0: { reject: 0, rejectNB: 0, stopAt: Array(K).fill(0), futAt: Array(K).fill(0), size: 0, time: 0 } }
  for (let i = 0; i < nSim; i++) {
    for (const h of ['H1', 'H0']) {
      const o = simulateOne(d, R, h === 'H0'), r = res[h]
      if (o.reject) r.reject++
      if (o.rejectNB) r.rejectNB++
      if (o.fut) r.futAt[o.stop]++; else r.stopAt[o.stop]++
      r.size += o.at.events ?? o.at.n; r.time += o.at.time ?? 0
    }
    if (onProgress && i % 100 === 99) onProgress((i + 1) / nSim)
  }
  for (const h of ['H1', 'H0']) { const r = res[h]; r.power = r.reject / nSim; r.powerNB = r.rejectNB / nSim; r.meanSize = r.size / nSim; r.meanTime = r.time / nSim }
  return res
}
