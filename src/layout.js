export const PKG_PAD = 16
export const MOD_W = 148
export const MOD_H = 78
export const MOD_GAP_X = 16
export const MOD_GAP_Y = 14
export const PKG_GAP = 26
export const HEADER_H = 28
export const HUB_W = 168
export const HUB_H = HEADER_H + 36

export function defaultLayout(packages) {
  let x = 40
  const y0 = 40
  const pkgBoxes = []
  let maxH = 280

  for (const pkg of packages) {
    const mods = pkg.modules || []
    const n = Math.max(mods.length, 1)
    const cols = Math.min(n, Math.min(3, Math.max(2, Math.ceil(Math.sqrt(n)))))
    const rows = Math.ceil(n / cols)
    const innerW = cols * MOD_W + (cols - 1) * MOD_GAP_X
    const innerH = rows * MOD_H + (rows - 1) * MOD_GAP_Y
    const boxW = Math.max(innerW + PKG_PAD * 2, 160)
    const boxH = innerH + PKG_PAD * 2 + HEADER_H
    maxH = Math.max(maxH, boxH)

    const localMods = mods.map((mod, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      return {
        id: mod.id,
        lx: PKG_PAD + col * (MOD_W + MOD_GAP_X),
        ly: HEADER_H + PKG_PAD + row * (MOD_H + MOD_GAP_Y),
        w: MOD_W,
        h: MOD_H,
      }
    })

    pkgBoxes.push({
      id: pkg.id,
      label: `${pkg.label} · L${pkg.level}`,
      x,
      y: y0,
      w: boxW,
      h: boxH,
      localMods,
    })
    x += boxW + PKG_GAP
  }

  return { pkgBoxes }
}

/** Fan modules around package hub when exploded (local coords, hub at 0,0). */
export function fanLocals(mods) {
  const n = mods.length
  if (n === 0) return []
  const R = Math.max(140, 80 + n * 30)
  const cx = HUB_W / 2
  const cy = HUB_H / 2 + 8
  return mods.map((mod, i) => {
    let angle
    if (n === 1) angle = -Math.PI / 2
    else if (n === 2) angle = -Math.PI / 2 + (i === 0 ? -0.55 : 0.55)
    else angle = -Math.PI / 2 + (i / n) * Math.PI * 2
    return {
      id: mod.id,
      lx: cx + Math.cos(angle) * R - MOD_W / 2,
      ly: cy + Math.sin(angle) * R - MOD_H / 2,
      w: MOD_W,
      h: MOD_H,
    }
  })
}

/** Absolute world top-left for each module in a package at fan layout. */
export function explodedAbsPositions(pkg, basePkg, pkgOffset) {
  const px = basePkg.x + (pkgOffset?.x || 0)
  const py = basePkg.y + (pkgOffset?.y || 0)
  const fan = fanLocals(pkg.modules || [])
  const out = {}
  for (const lm of fan) {
    out[lm.id] = { x: px + lm.lx, y: py + lm.ly }
  }
  return out
}
