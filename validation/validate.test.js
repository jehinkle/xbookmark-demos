import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { gsDesign } from '../src/stats/gs.js'
import { nMeans, nRates, eventsSchoenfeld, eventsFreedman } from '../src/stats/sampleSize.js'
import { computeDesign } from '../src/stats/design.js'

const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url)))
const ref = Object.fromEntries(JSON.parse(readFileSync(new URL('./reference.json', import.meta.url))).results.map(r => [r.id, r]))
const rows = []
const cmp = (id, what, js, r, tol) => { const d = Math.abs(js - r); rows.push({ id, what, js, ref: r, diff: d, tol, pass: d <= tol }); expect(d).toBeLessThanOrEqual(tol) }

describe('JS engine vs gsDesign / rpact reference', () => {
  for (const c of cases) it(`${c.id}: ${c.desc}`, () => {
    const R = ref[c.id]
    if (c.kind === 'events') cmp(c.id, 'events (gsDesign nEvents)', eventsSchoenfeld(c), R.events, 0.01)
    if (c.kind === 'freedman') cmp(c.id, 'events (rpact Freedman)', eventsFreedman(c), R.events, 0.01)
    if (c.kind === 'means') cmp(c.id, 'N total (gsDesign nNormal)', nMeans(c), R.n, 0.01)
    if (c.kind === 'rates') cmp(c.id, 'N total (gsDesign nBinomial)', nRates(c), R.n, 0.05)
    if (c.kind === 'gs') {
      const g = gsDesign({ t: c.t, alpha: c.alpha, beta: c.beta, sf: c.sf, sfPar: c.sfPar, futility: c.futility || null })
      g.b.forEach((z, k) => cmp(c.id, `upper z look ${k + 1} (gsDesign)`, z, R.upper[k], 1e-3))
      if (R.lower) g.a.forEach((z, k) => cmp(c.id, `futility z look ${k + 1} (gsDesign)`, z, R.lower[k], 1e-3))
      cmp(c.id, 'inflation factor (gsDesign)', g.IF, R.IF, 1e-3)
      if (R.rpactUpper) { g.b.forEach((z, k) => cmp(c.id, `upper z look ${k + 1} (rpact)`, z, R.rpactUpper[k], 1e-3)); cmp(c.id, 'inflation factor (rpact)', g.IF, R.rpactIF, 1e-3) }
    }
    if (c.kind === 'surv') {
      const s = { endpoint: 'tte', hypothesis: 'superiority', alpha: c.alpha, sided: 1, power: 1 - c.beta, ratio: c.r, interims: c.t.slice(0, -1),
        sf: c.sf, sfPar: c.sfPar, futility: !!c.futility, futSf: c.futility?.sf, futPar: c.futility?.par,
        hr: c.hr, medianC: c.medianC, accrual: c.R, followup: c.F, dropout: c.dropout, method: 'Schoenfeld' }
      const d = computeDesign(s)
      cmp(c.id, 'max events (rpact)', d.dMax, R.rpactEvents, 0.5)
      cmp(c.id, 'max subjects (rpact)', d.nMax, R.rpactN, 1)
      const times = c.t.map(t => { let lo = 0, hi = 600; const tgt = t * d.dMax; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (d.nMax * d.model.frac(m) < tgt) lo = m; else hi = m } return lo })
      times.forEach((x, k) => cmp(c.id, `analysis time look ${k + 1}, months (rpact)`, x, [].concat(R.rpactAnalysisTime)[k], 0.05))
      const k = (c.r / (1 + c.r)) * (1 / (1 + c.r))
      d.gs.b.forEach((z, i) => cmp(c.id, `HR efficacy bound look ${i + 1} (rpact)`, Math.exp(-z / Math.sqrt(k * c.t[i] * d.dMax)), [].concat(R.rpactHRBounds)[i], 1e-3))
      if (R.rpactLower) R.rpactLower.forEach((z, i) => cmp(c.id, `futility z look ${i + 1} (rpact)`, d.gs.a[i], z, 1e-3))
    }
  })
  it('writes agreement table', () => {
    writeFileSync(new URL('./agreement.json', import.meta.url), JSON.stringify(rows, null, 1))
    expect(rows.every(r => r.pass)).toBe(true)
  })
})
