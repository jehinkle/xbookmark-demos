import { computeDesign } from './stats/design.js'
import { simulate } from './stats/sim.js'
self.onmessage = e => {
  const { settings, nSim, seed } = e.data
  const d = computeDesign(settings)
  const t0 = performance.now()
  const res = simulate(d, nSim, seed, p => self.postMessage({ type: 'progress', p }))
  self.postMessage({ type: 'done', res, ms: performance.now() - t0 })
}
