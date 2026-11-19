import { simGrid } from './stats/sim.js'
// Runs the base scenario (normal outcome, no dropout) and, if any switch is on, the configured scenario.
self.onmessage = e => {
  const { s, nSim, seed, opt } = e.data, t0 = performance.now()
  const on = opt.dropout > 0 || (s.endpoint === 'continuous' && opt.shape !== 'normal')
  const strip = g => ({ pts: g.pts, nFit: g.nFit, n: g.n, a: g.a, b: g.b })
  const base = strip(simGrid(s, nSim, seed, {}, p => self.postMessage({ type: 'progress', p: on ? p / 2 : p })))
  const cfg = on ? strip(simGrid(s, nSim, seed + 1, opt, p => self.postMessage({ type: 'progress', p: 0.5 + p / 2 }))) : null
  self.postMessage({ type: 'done', base, cfg, ms: performance.now() - t0 })
}
