import { useEffect, useRef } from 'react'

// Seeded RNG so the KM curve is the same every load.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Example data only: two arms, exponential event times with random censoring.
function buildKM(seed, n, rate) {
  const r = mulberry32(seed)
  const subj = []
  for (let i = 0; i < n; i++) {
    const t = -Math.log(1 - r()) / rate
    const c = 6 + r() * 30
    subj.push({ t: Math.min(t, c, 36), event: t <= c && t <= 36 })
  }
  subj.sort((a, b) => a.t - b.t)
  let atRisk = n, s = 1
  const steps = [{ t: 0, s: 1 }]
  const censors = []
  for (const x of subj) {
    if (x.event) { s *= (atRisk - 1) / atRisk; steps.push({ t: x.t, s }) }
    else censors.push({ t: x.t, s })
    atRisk--
  }
  return { steps, censors }
}

export default function HeroCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const arms = [buildKM(7, 90, 0.085), buildKM(11, 90, 0.045)]
    let w = 0, h = 0, dpr = 1, raf = 0, start = performance.now()
    let particles = []

    const box = () => {
      if (w < 900) return { x0: w * 0.06, x1: w * 0.94, y0: h * 0.22, y1: h * 0.88 }
      return { x0: w * 0.4, x1: w * 0.94, y0: h * 0.2, y1: h * 0.86 }
    }
    const map = (t, s) => {
      const b = box()
      return [b.x0 + (t / 36) * (b.x1 - b.x0), b.y1 - s * (b.y1 - b.y0)]
    }

    const setup = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const r = mulberry32(3)
      particles = []
      arms.forEach((arm, ai) => {
        // targets: points sampled along the step path
        const pts = []
        const st = arm.steps
        for (let i = 0; i < st.length; i++) {
          const a = st[i], b = st[i + 1] || { t: 36, s: a.s }
          const nH = Math.max(2, Math.round((b.t - a.t) * 3))
          for (let k = 0; k < nH; k++) pts.push(map(a.t + ((b.t - a.t) * k) / nH, a.s))
          if (st[i + 1]) {
            const [x, y0] = map(b.t, a.s); const [, y1] = map(b.t, b.s)
            pts.push([x, (y0 + y1) / 2])
          }
        }
        for (const p of pts) {
          particles.push({
            x: r() * w, y: r() * h, tx: p[0], ty: p[1], arm: ai,
            vx: (r() - 0.5) * 0.4, vy: (r() - 0.5) * 0.4, delay: r() * 1.2, ph: r() * 6.28,
          })
        }
      })
      // ambient drifting dust
      for (let i = 0; i < 160; i++) particles.push({ x: r() * w, y: r() * h, vx: (r() - 0.5) * 0.25, vy: (r() - 0.5) * 0.25, dust: true, ph: r() * 6.28 })
    }

    const drawCurve = (alpha) => {
      if (alpha <= 0) return
      const b = box()
      ctx.save()
      ctx.globalAlpha = alpha * 0.35
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x0, b.y1); ctx.lineTo(b.x1, b.y1); ctx.stroke()
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'right'
      ctx.fillText('S(t) · EXAMPLE DATA', b.x1, b.y0 - 8)
      ctx.fillText('MONTHS', b.x1, b.y1 + 16)
      ctx.restore()
      arms.forEach((arm, ai) => {
        ctx.save()
        ctx.globalAlpha = alpha * (ai ? 0.9 : 0.55)
        ctx.strokeStyle = ai ? '#7cc4ff' : '#ffffff'
        ctx.lineWidth = 1.25
        ctx.beginPath()
        arm.steps.forEach((p, i) => {
          const [x, y] = map(p.t, p.s)
          if (i === 0) ctx.moveTo(x, y)
          else { const [, yp] = map(p.t, arm.steps[i - 1].s); ctx.lineTo(x, yp); ctx.lineTo(x, y) }
        })
        const last = arm.steps[arm.steps.length - 1]
        ctx.lineTo(...map(36, last.s))
        ctx.stroke()
        for (const c of arm.censors) {
          const [x, y] = map(c.t, c.s); ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke()
        }
        ctx.restore()
      })
    }

    const frame = (now) => {
      const el = (now - start) / 1000
      ctx.clearRect(0, 0, w, h)
      const settle = reduce ? 1 : Math.min(1, Math.max(0, (el - 0.6) / 3.2))
      for (const p of particles) {
        if (p.dust) {
          if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x += w; if (p.x > w) p.x -= w; if (p.y < 0) p.y += h; if (p.y > h) p.y -= h }
          ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.08 * Math.sin(el + p.ph)})`
          ctx.fillRect(p.x, p.y, 1, 1)
          continue
        }
        const k = reduce ? 1 : Math.min(1, Math.max(0, (el - 0.6 - p.delay) / 2.4))
        const ease = k * k * (3 - 2 * k)
        if (!reduce && k < 1) { p.x += p.vx; p.y += p.vy }
        const x = p.x + (p.tx - p.x) * ease
        const y = p.y + (p.ty - p.y) * ease
        if (k >= 1) { p.x = p.tx; p.y = p.ty }
        const jitter = reduce ? 0 : Math.sin(el * 1.3 + p.ph) * 0.6 * ease
        ctx.fillStyle = p.arm ? 'rgba(124,196,255,0.95)' : 'rgba(255,255,255,0.8)'
        ctx.fillRect(x, y + jitter, 1.6, 1.6)
      }
      drawCurve(Math.max(0, (settle - 0.7) / 0.3))
      if (!reduce) raf = requestAnimationFrame(frame)
    }

    setup()
    const onResize = () => { setup(); if (reduce) frame(performance.now()) }
    window.addEventListener('resize', onResize)
    if (reduce) frame(performance.now() + 10000)
    else raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />
}
