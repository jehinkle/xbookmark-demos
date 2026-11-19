import { it, expect } from 'vitest'
import { pt, qt, ptncUpper, pbeta } from '../src/stats/dist.js'
import { nZ, nT, powerT, arms } from '../src/stats/standard.js'
import { assurance, assuranceLimit, rule, nBayes, priorAloneSucceeds } from '../src/stats/bayes.js'
import { rng, fitN } from '../src/stats/sim.js'

const C = { endpoint: 'continuous', delta: 5, sd: 10, pC: 0.3, pT: 0.45, alpha: 0.05, power: 0.8, ratio: 1 }
const B = { priorMeanMult: 1, priorSdMult: 0.75, n0: 10, analysisMean: 'optimistic', gamma: 0.975 }

it('t distribution helpers match known values', () => {
  expect(qt(0.975, 10)).toBeCloseTo(2.228138851986, 10)
  expect(qt(0.975, 124)).toBeCloseTo(1.979280116605, 10)
  expect(pt(2.228138851986, 10)).toBeCloseTo(0.975, 12)
  expect(pbeta(0.3, 2, 5)).toBeCloseTo(0.579825, 6)
  expect(ptncUpper(1.96, 1e6, 0)).toBeCloseTo(0.0249979, 6)
})
it('default design: 63 per arm (normal formula), 64 per arm (t, like power.t.test)', () => {
  expect(arms(C, nZ(C)).nC).toBe(63)
  expect(arms(C, nT(C)).nC).toBe(64)
  expect(powerT(C, 64)).toBeGreaterThan(0.8)
  expect(powerT(C, 63)).toBeLessThan(0.8)
})
it('binary default: 163 per arm', () => expect(arms({ ...C, endpoint: 'binary' }, nZ({ ...C, endpoint: 'binary' })).nC).toBe(163))
it('assurance sits below power and rises to Phi(mu/tau)', () => {
  expect(assurance(C, B, 64)).toBeLessThan(0.8)
  expect(assurance(C, B, 1e10)).toBeCloseTo(assuranceLimit(C, B), 4)
  expect(assurance(C, { ...B, priorSdMult: 1e-9 }, 64)).toBeCloseTo(0.8073, 3) // tau -> 0 recovers z power
})
it('flat-prior Bayes rule reproduces the one-sided 2.5% z test', () => {
  const b = { ...B, n0: 0 }, n = nBayes(C, b)
  expect(n).toBe(63); expect(rule(C, b, n).typeI).toBeCloseTo(0.025, 12)
})
it('optimistic informative prior shrinks n and inflates type I error; skeptical does the reverse', () => {
  const flat = nBayes(C, { ...B, n0: 0 }), opt = nBayes(C, B), skep = nBayes(C, { ...B, analysisMean: 'skeptical' })
  expect(opt).toBeLessThan(flat); expect(skep).toBeGreaterThan(flat)
  expect(rule(C, B, opt).typeI).toBeGreaterThan(0.025)
  expect(rule(C, { ...B, analysisMean: 'skeptical' }, skep).typeI).toBeLessThan(0.025)
  expect(priorAloneSucceeds(C, { ...B, n0: 40 })).toBe(true)
})
it('seeded RNG is reproducible and roughly standard normal', () => {
  const a = rng(1), b = rng(1); for (let i = 0; i < 5; i++) expect(a.u()).toBe(b.u())
  const r = rng(42); let s = 0, q = 0; const N = 200000; for (let i = 0; i < N; i++) { const x = r.norm(); s += x; q += x * x }
  expect(Math.abs(s / N)).toBeLessThan(0.01); expect(Math.abs(q / N - 1)).toBeLessThan(0.01)
})
it('probit fit recovers an exact power curve', () => {
  const pts = [40, 50, 60, 70, 80, 90].map(n => ({ n, power: powerT(C, n), nSim: 4000 }))
  expect(Math.abs(fitN(pts, 0.8).nFit - nT(C))).toBeLessThan(1)
})
