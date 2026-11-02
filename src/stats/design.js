// Full design: combines endpoint sizing with the group-sequential engine.
import { gsDesign, powerAt } from './gs.js'
import { qnorm, pnorm } from './normal.js'
import { nMeans, nRates, eventsSchoenfeld, eventsFreedman, tteModel, timeForEvents } from './sampleSize.js'

export function oneSidedAlpha(s) { return s.sided === 2 ? s.alpha / 2 : s.alpha }

export function computeDesign(s) {
  const alpha = oneSidedAlpha(s), beta = 1 - s.power, r = s.ratio
  const looks = [...s.interims.filter(x => x > 0 && x < 1).sort((a, b) => a - b), 1]
  const gs = gsDesign({ t: looks, alpha, beta, sf: s.sf, sfPar: s.sfPar, futility: s.futility ? { sf: s.futSf, par: s.futPar } : null })
  const ni = s.hypothesis === 'noninferiority'
  const out = { s, alpha, beta, looks, gs, ni }
  const xT = r / (1 + r)
  const perArm = N => { const nT = Math.ceil(N * xT), nC = Math.ceil(N * (1 - xT)); return { nT, nC, N: nT + nC } }
  if (s.endpoint === 'continuous') {
    const delta0 = ni ? -s.margin : 0
    out.nFixed = nMeans({ delta: s.meanT - s.meanC, sd: s.sd, alpha, beta, r, delta0 })
    out.nMax = out.nFixed * gs.IF
    out.info = { theta: s.meanT - s.meanC, theta0: delta0, se1: N => s.sd * Math.sqrt(1 / (N * xT) + 1 / (N * (1 - xT))) }
  } else if (s.endpoint === 'binary') {
    const delta0 = ni ? -s.marginP : 0
    out.nFixed = nRates({ pT: s.pT, pC: s.pC, alpha, beta, r, delta0 })
    out.nMax = out.nFixed * gs.IF
    out.info = { theta: s.pT - s.pC, theta0: delta0 }
  } else {
    const hr0 = ni ? s.hrMargin : 1
    out.dFixed = s.method === 'Freedman' && !ni ? eventsFreedman({ hr: s.hr, alpha, beta, r }) : eventsSchoenfeld({ hr: s.hr, hr0, alpha, beta, r })
    out.dMax = out.dFixed * gs.IF
    out.dLooks = looks.map(t => Math.ceil(t * Math.ceil(out.dMax)))
    const m = tteModel({ medianC: s.medianC, hr: s.hr, R: s.accrual, F: s.followup, dropoutPerYear: s.dropout, r })
    out.model = m
    out.nMax = out.dMax / m.pEvent
    out.hr0 = hr0
  }
  if (s.endpoint !== 'tte') out.nFixed = out.nFixed / (1 - (s.dropout || 0)), out.nMax = out.nMax / (1 - (s.dropout || 0))
  out.arms = perArm(out.nMax)
  out.armsFixed = perArm(s.endpoint === 'tte' ? out.dFixed / out.model.pEvent : out.nFixed)
  if (s.endpoint === 'tte') {
    out.lookTimes = out.dLooks.map(d => timeForEvents(out.model, out.arms.N, d))
    const k = xT * (1 - xT)
    out.hrBounds = gs.b.map((z, i) => out.hr0 * Math.exp(-z / Math.sqrt(k * out.dLooks[i])))
    out.hrFut = gs.a ? gs.a.map((z, i) => out.hr0 * Math.exp(-z / Math.sqrt(k * out.dLooks[i]))) : null
  } else {
    out.nLooks = looks.map(t => Math.ceil(t * out.arms.N))
  }
  out.nominalP = gs.b.map(z => 1 - pnorm(z))
  return out
}

// Power curve: power vs. effect (scaled on the design's natural effect scale)
export function powerCurve(d, n = 41) {
  const s = d.s, pts = []
  if (s.endpoint === 'tte') {
    const L0 = Math.log(d.hr0), L1 = Math.log(s.hr)
    for (let i = 0; i < n; i++) {
      const hr = 0.5 + (Math.min(1.1, d.hr0 * 1.05) - 0.5) * i / (n - 1)
      pts.push({ x: hr, y: powerAt(d.gs, d.gs.delta * (Math.log(hr) - L0) / (L1 - L0)) })
    }
  } else {
    const th1 = d.info.theta - d.info.theta0
    for (let i = 0; i < n; i++) {
      const f = -0.1 + 1.9 * i / (n - 1), th = d.info.theta0 + f * th1
      pts.push({ x: th, y: powerAt(d.gs, d.gs.delta * f) })
    }
  }
  return pts
}
export function powerVsSize(d, n = 31) {
  const pts = []
  for (let i = 0; i < n; i++) { const f = 0.2 + 1.6 * i / (n - 1); pts.push({ x: f, y: powerAt(d.gs, d.gs.delta * Math.sqrt(f)) }) }
  return pts
}
export { qnorm }
