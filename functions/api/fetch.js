// Cloudflare Pages Function: GET /api/fetch?url=https://...
// Server-side fetch so the browser demo can read cross-origin pages.
// Limits: http/https only, no localhost/private IPs, 3 redirects, 8s timeout, 2 MB cap.
const MAX_BYTES = 2 * 1024 * 1024
const TIMEOUT_MS = 8000

function blockedHost(h) {
  h = h.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (!h.includes('.') && !h.includes(':')) return true
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (m) {
    const [a, b] = [+m[1], +m[2]]
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  if (h.includes(':')) return h === '::1' || h === '::' || /^(fc|fd|fe80)/.test(h) || h.startsWith('::ffff:')
  if (/^\d+$/.test(h) || /^0x/.test(h)) return true
  return false
}

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})

export async function onRequestGet({ request }) {
  let target
  try { target = new URL(new URL(request.url).searchParams.get('url') || '') } catch { return json(400, { error: 'Invalid URL' }) }
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    let res
    for (let hop = 0; hop <= 3; hop++) {
      if (!/^https?:$/.test(target.protocol)) return json(400, { error: 'Only http and https URLs are allowed' })
      if (target.username || target.password) return json(400, { error: 'Credentials in URL not allowed' })
      if (blockedHost(target.hostname)) return json(400, { error: 'Private or local addresses are blocked' })
      res = await fetch(target.toString(), {
        redirect: 'manual', signal: ctl.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; DemoLab-PageToMarkdown/1.0)', accept: 'text/html,application/xhtml+xml' },
      })
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        target = new URL(res.headers.get('location'), target)
        continue
      }
      break
    }
    if (res.status >= 300 && res.status < 400) return json(502, { error: 'Too many redirects' })
    const type = res.headers.get('content-type') || ''
    if (!/html|xml|text\/plain/i.test(type)) return json(415, { error: `Not an HTML page (${type || 'unknown type'})` })
    const reader = res.body.getReader()
    const chunks = []; let size = 0; let truncated = false
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) { truncated = true; await reader.cancel(); break }
      chunks.push(value)
    }
    const buf = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0))
    let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength }
    const html = new TextDecoder('utf-8').decode(buf)
    return json(200, { url: target.toString(), status: res.status, contentType: type, bytes: buf.byteLength, truncated, html })
  } catch (e) {
    return json(502, { error: e.name === 'AbortError' ? 'Timed out after 8 s' : `Fetch failed: ${e.message}` })
  } finally { clearTimeout(timer) }
}
