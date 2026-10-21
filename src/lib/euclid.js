// Bjorklund / Euclidean rhythm helpers
export function gcdTrace(a, b) {
  const steps = []
  let x = Math.max(a, b), y = Math.min(a, b)
  if (y === 0) return { steps, gcd: x }
  while (y > 0 && x !== y) {
    const r = x - y
    steps.push(`${x}−${y}=${r}`)
    if (r <= 1) return { steps, gcd: r === 0 ? y : 1 }
    x = Math.max(r, y); y = Math.min(r, y)
  }
  return { steps, gcd: y || x }
}

// Returns { pattern, stages } where each stage is { main: [[..]], rem: [[..]] }
export function bjorklund(k, n) {
  k = Math.max(0, Math.min(k, n))
  if (k === 0) return { pattern: Array(n).fill(0), stages: [{ main: [], rem: Array.from({ length: n }, () => [0]) }] }
  let main = Array.from({ length: k }, () => [1])
  let rem = Array.from({ length: n - k }, () => [0])
  const stages = [{ main: main.map((g) => [...g]), rem: rem.map((g) => [...g]) }]
  while (rem.length > 1) {
    const m = Math.min(main.length, rem.length)
    const paired = []
    for (let i = 0; i < m; i++) paired.push([...main[i], ...rem[i]])
    const leftover = main.length > m ? main.slice(m) : rem.slice(m)
    main = paired; rem = leftover
    stages.push({ main: main.map((g) => [...g]), rem: rem.map((g) => [...g]) })
  }
  const pattern = [...main.flat(), ...rem.flat()]
  return { pattern, stages }
}

// Rotate so pattern starts on a hit (canonical), then apply user rotation
export function euclid(k, n, rot = 0) {
  let { pattern } = bjorklund(k, n)
  const first = pattern.indexOf(1)
  if (first > 0) pattern = [...pattern.slice(first), ...pattern.slice(0, first)]
  const r = ((rot % n) + n) % n
  return pattern.map((_, i) => pattern[(i - r + n) % n])
}

export function groups(pattern) {
  const hits = pattern.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)
  const n = pattern.length
  return hits.map((h, j) => {
    const next = j + 1 < hits.length ? hits[j + 1] : hits[0] + n
    return { start: h, len: next - h }
  })
}
