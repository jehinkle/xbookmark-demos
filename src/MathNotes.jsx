import { euclid } from './lib/euclid'

const gcd = (a, b) => (b ? gcd(b, a % b) : a)
function trace(a, b) {
  const s = []; let x = a, y = b
  if (!y) return s
  while (y) { s.push(`(${x}, ${y})`); [x, y] = [y, x % y] }
  s.push(`(${x}, 0)`); return s
}
const F = ({ children }) => <span className="f">{children}</span>

export default function MathNotes({ k, n }) {
  const pat = k > 0 ? euclid(k, n, 0) : Array(n).fill(0)
  const idx = pat.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)
  const gaps = idx.map((p, j) => ((idx[(j + 1) % idx.length] - p + n) % n) || n)
  const d = k > 0 ? gcd(k, n) : n
  const lo = k ? Math.floor(n / k) : 0, hi = k ? Math.ceil(n / k) : 0
  return (
    <section className="math">
      <h2>The math, geometry &amp; notation</h2>
      <div className="live">Live for your current layer: <F>E({k},{n})</F> = <F>[{pat.map((v) => (v ? 'x' : '.')).join(' ')}]</F>
        {k > 0 && <> · gaps <F>({gaps.join('-')})</F> · <F>⌊{n}/{k}⌋ = {lo}</F>, <F>⌈{n}/{k}⌉ = {hi}</F> · <F>gcd({n},{k}) = {d}</F>{d > 1 && <> → <F>E({k / d},{n / d})</F> repeated {d}×</>} · Euclid: <F>{trace(n, k).join(' → ')}</F></>}
      </div>
      <p><b>Notation.</b> <F>E(k,n)</F> names the rhythm with <i>k</i> hits spread over <i>n</i> steps, written as a binary string: <F>E(3,8) = [x . . x . . x .]</F>, the tresillo. A third argument rotates it, <F>E(k,n,r)</F>, starting the cycle <i>r</i> steps later; the dembow snare and the bossa clave are rotations of this kind. The <i>complement</i> swaps hits and rests and is itself Euclidean, <F>E(n−k,n)</F> up to rotation (that's what the “bass = inverse of kick” switch plays). Musicians often write the gaps between onsets instead: the tresillo is <F>(3‑3‑2)</F>, the cinquillo <F>(2‑1‑2‑1‑2)</F>. A Euclidean rhythm only ever uses two gap sizes, <F>⌊n/k⌋</F> and <F>⌈n/k⌉</F>, and when <i>k</i> divides <i>n</i> they are equal.</p>
      <p><b>The math.</b> Euclid's algorithm finds <F>gcd(a,b)</F> by repeatedly taking the smaller number away from the larger: <F>(8,3) → (5,3) → (2,3) → (2,1)</F>, i.e. <F>8 = 2·3 + 2</F>, <F>3 = 1·2 + 1</F>. Bjorklund's procedure does the same thing to sequences: start with <i>k</i> groups <F>[x]</F> and <F>n−k</F> groups <F>[.]</F>, pair a leftover onto each group, and fold again on whatever remains; the number of leftovers at each fold follows exactly the remainder sequence above, and it stops when one or zero remain. There is also a closed form: step <i>i</i> is a hit exactly when <F>⌊(i·k + r)/n⌋</F> increases from <i>i−1</i> to <i>i</i>; equivalently the hits sit at <F>⌊j·n/k⌋</F> for <F>j = 0 … k−1</F> (up to rotation). These patterns are <i>maximally even</i> in the sense of Clough and Douthett: no other placement of <i>k</i> onsets on <i>n</i> steps is more evenly spread. If <F>gcd(k,n) = d &gt; 1</F> the pattern is periodic and repeats <i>d</i> times, e.g. <F>E(4,8) = E(1,2)</F> repeated 4 times, <F>[x . x . x . x .]</F>.</p>
      <p><b>The geometry.</b> Put the <i>n</i> steps on a circle as the <i>n</i>‑th roots of unity, <F>ζ<sup>i</sup> = e<sup>2πi·i/n</sup></F>. The hits then pick out an inscribed <i>k</i>‑gon, the one that comes closest to a regular polygon that the n‑point grid allows; it is exactly regular iff <F>k | n</F> (four-on-the-floor's square, E(4,16)). Rotation <F>E(k,n,r)</F> is literally turning that polygon by <F>r·360°/n</F>, so all rotations share one shape. The complement is the polygon on the leftover vertices. On a 12‑step circle of semitones, <F>E(7,12)</F>, the bembé bell, is the diatonic major scale (the white keys) and <F>E(5,12)</F> is the pentatonic set of black keys: two complementary maximally even polygons. Stacking rings with different <i>k</i> on the same <i>n</i>, like the rings above, layers polygons into a polyrhythm, such as 3 against 4 in the dembow.</p>
      <p className="credits"><b>Credits.</b> Euclid, <i>Elements</i> Book VII (c. 300 BC), for the algorithm. E. Bjorklund (2003), who used it to space timing pulses for the Spallation Neutron Source (SNS) at Los Alamos. G. Toussaint (2005), “The Euclidean Algorithm Generates Traditional Musical Rhythms,” which linked it to world rhythms. Maximal evenness: J. Clough &amp; J. Douthett.</p>
    </section>
  )
}
