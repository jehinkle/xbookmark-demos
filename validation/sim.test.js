import { it, expect } from 'vitest'
import { computeDesign } from '../src/stats/design.js'
import { simulate } from '../src/stats/sim.js'
import { EXAMPLE } from '../src/example.js'

it('Monte Carlo agrees with analytic power and type I error (UC example, 1500 sims)', () => {
  const d = computeDesign(EXAMPLE)
  const r = simulate(d, 1500, 7)
  const se = p => Math.sqrt(p * (1 - p) / 1500)
  expect(Math.abs(r.H1.power - d.gs.power)).toBeLessThan(3 * se(0.9))
  expect(Math.abs(r.H0.powerNB - d.gs.typeI)).toBeLessThan(3 * se(0.025) + 0.002)
}, 60000)
// print for the record
it('prints sim summary', () => { const d = computeDesign(EXAMPLE); const r = simulate(d, 1500, 7); console.log(JSON.stringify({ power: r.H1.power, analytic: d.gs.power, typeI_NB: r.H0.powerNB, typeIAnalytic: d.gs.typeI })) }, 60000)
