// Standard normal helpers (double precision).
export function dnorm(x) { return Math.exp(-0.5 * x * x) / 2.5066282746310002 }
// West (2005) / Hart double-precision cumulative normal
export function pnorm(x) {
  const z = Math.abs(x); let c
  if (z > 37) c = 0
  else {
    const e = Math.exp(-z * z / 2)
    if (z < 7.07106781186547) {
      let n = 3.52624965998911e-02 * z + 0.700383064443688
      n = n * z + 6.37396220353165; n = n * z + 33.912866078383; n = n * z + 112.079291497871
      n = n * z + 221.213596169931; n = n * z + 220.206867912376
      let d = 8.83883476483184e-02 * z + 1.75566716318264
      d = d * z + 16.064177579207; d = d * z + 86.7807322029461; d = d * z + 296.564248779674
      d = d * z + 637.333633378831; d = d * z + 793.826512519948; d = d * z + 440.413735824752
      c = e * n / d
    } else {
      let b = z + 0.65; b = z + 4 / b; b = z + 3 / b; b = z + 2 / b; b = z + 1 / b
      c = e / b / 2.506628274631
    }
  }
  return x > 0 ? 1 - c : c
}
// Acklam initial guess + Newton refinement
export function qnorm(p) {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]
  const pl = 0.02425; let x
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  else if (p <= 1 - pl) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1) }
  else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  for (let i = 0; i < 3; i++) { const e = pnorm(x) - p; x -= e / Math.max(dnorm(x), 1e-300) }
  return x
}
