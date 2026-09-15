import { useEffect, useRef } from 'react'
import './App.css'

const BG = [117, 147, 208]
const FPS = 60
const MAX_SPEED = 256
const SOURCE_URL = 'https://codepen.io/kynd/pen/zeqvaO'

function mag(x, y) {
  return Math.hypot(x, y)
}

function setMag(x, y, m) {
  const len = mag(x, y)
  if (len === 0) return { x: 0, y: 0 }
  const s = m / len
  return { x: x * s, y: y * s }
}

function drawArrow(ctx, x0, y0, x1, y1) {
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()

  const dx = x1 - x0
  const dy = y1 - y0
  const len = mag(dx, dy)
  if (len < 1e-6) return

  const vx = (dx / len) * 4
  const vy = (dy / len) * 4

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - vy - vx, y1 + vx - vy)
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 + vy - vx, y1 - vx - vy)
  ctx.stroke()
}

function drawLabel(ctx, x, y, label) {
  ctx.save()
  ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(label, x + 6, y)
  ctx.restore()
}

function App() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0, ready: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let rafId = 0
    let cancelled = false

    const state = {
      position: { x: 100, y: -100 },
      velocity: { x: 48, y: -48 },
      acceleration: { x: 30, y: 30 },
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, ready: true }
    }

    const onTouchMove = (e) => {
      if (!e.touches.length) return
      const t = e.touches[0]
      mouseRef.current = { x: t.clientX, y: t.clientY, ready: true }
    }

    const frame = () => {
      if (cancelled) return

      const w = window.innerWidth
      const h = window.innerHeight
      const hw = w / 2
      const hh = h / 2
      const { position, velocity, acceleration } = state

      // Physics (same order as the CodePen sketch)
      if (mouseRef.current.ready) {
        acceleration.x = (mouseRef.current.x - position.x - hw) / 2
        acceleration.y = (mouseRef.current.y - position.y - hh) / 2
      }

      velocity.x += acceleration.x / FPS
      velocity.y += acceleration.y / FPS
      const speed = mag(velocity.x, velocity.y)
      if (speed > MAX_SPEED) {
        const capped = setMag(velocity.x, velocity.y, MAX_SPEED)
        velocity.x = capped.x
        velocity.y = capped.y
      }

      position.x += velocity.x / FPS
      position.y += velocity.y / FPS

      if (position.x > hw || position.x < -hw) velocity.x = -velocity.x
      if (position.y > hh || position.y < -hh) velocity.y = -velocity.y

      // Draw
      ctx.fillStyle = `rgb(${BG[0]}, ${BG[1]}, ${BG[2]})`
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.translate(hw, hh)

      ctx.strokeStyle = '#000'
      ctx.fillStyle = '#000'
      ctx.lineWidth = 1

      // Axes
      ctx.beginPath()
      ctx.moveTo(-hw, 0)
      ctx.lineTo(hw, 0)
      ctx.moveTo(0, -hh)
      ctx.lineTo(0, hh)
      ctx.stroke()
      drawLabel(ctx, 0, -4, 'Origin')

      const endVelX = position.x + velocity.x
      const endVelY = position.y + velocity.y
      const endAccX = position.x + acceleration.x
      const endAccY = position.y + acceleration.y

      // Velocity (thinner)
      ctx.lineWidth = 1
      drawArrow(ctx, position.x, position.y, endVelX, endVelY)

      // Particle
      ctx.beginPath()
      ctx.arc(position.x, position.y, 4, 0, Math.PI * 2)
      ctx.fill()

      // Acceleration (thicker)
      ctx.lineWidth = 2
      drawArrow(ctx, position.x, position.y, endAccX, endAccY)

      drawLabel(
        ctx,
        position.x,
        position.y,
        `position (${position.x.toPrecision(4)}, ${position.y.toPrecision(4)})`,
      )
      drawLabel(
        ctx,
        endVelX,
        endVelY,
        `velocity (${velocity.x.toPrecision(4)}, ${velocity.y.toPrecision(4)})`,
      )
      drawLabel(
        ctx,
        endAccX,
        endAccY,
        `acceleration (${acceleration.x.toPrecision(4)}, ${acceleration.y.toPrecision(4)})`,
      )

      ctx.restore()

      rafId = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div className="app">
      <canvas ref={canvasRef} className="canvas" aria-label="Acceleration demo" />
      <a
        className="credit"
        href={SOURCE_URL}
        target="_blank"
        rel="noreferrer"
      >
        Inspired by kynd — Acceleration (CodePen)
      </a>
    </div>
  )
}

export default App
