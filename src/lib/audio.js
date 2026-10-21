let ctx = null
export function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function noiseBuf(c) {
  const b = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}
let nb = null
export function play(voice, t, vol = 0.8) {
  const c = getCtx()
  const out = c.createGain(); out.gain.value = vol; out.connect(c.destination)
  if (voice === 'kick') {
    const o = c.createOscillator(), g = c.createGain()
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15)
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.4)
  } else if (voice === 'snare' || voice === 'hat') {
    nb = nb || noiseBuf(c)
    const s = c.createBufferSource(); s.buffer = nb
    const f = c.createBiquadFilter(); f.type = voice === 'hat' ? 'highpass' : 'bandpass'
    f.frequency.value = voice === 'hat' ? 7000 : 1800
    const g = c.createGain(); const dur = voice === 'hat' ? 0.05 : 0.18
    g.gain.setValueAtTime(voice === 'hat' ? 0.5 : 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.02)
    if (voice === 'snare') {
      const o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.value = 190
      og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      o.connect(og).connect(out); o.start(t); o.stop(t + 0.12)
    }
  } else if (voice === 'bell') {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 1240
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.15)
  } else if (voice === 'bass') {
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain()
    o.type = 'sawtooth'; o.frequency.value = 55; f.type = 'lowpass'; f.frequency.setValueAtTime(900, t)
    f.frequency.exponentialRampToValueAtTime(120, t + 0.2)
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.3)
  }
}
