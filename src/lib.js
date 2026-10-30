import Defuddle from 'defuddle/full'

export const CATS = {
  kept: { label: 'Kept (content or title)', color: '#16a34a' },
  nav: { label: 'Navigation / header', color: '#2563eb' },
  footer: { label: 'Footer', color: '#64748b' },
  sidebar: { label: 'Sidebar / related', color: '#9333ea' },
  ads: { label: 'Ads / sponsored', color: '#f59e0b' },
  comments: { label: 'Comments', color: '#db2777' },
  cta: { label: 'Share / newsletter / popups', color: '#ea580c' },
  meta: { label: 'Byline / breadcrumbs (often → metadata)', color: '#0891b2' },
  other: { label: 'Other removed', color: '#dc2626' },
}

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase()

export function runDefuddle(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (url) {
    const base = doc.createElement('base'); base.href = url; doc.head.prepend(base)
  }
  const t0 = performance.now()
  const res = new Defuddle(doc, { url: url || 'https://example.com/sample', separateMarkdown: true, debug: true }).parse()
  res.clientMs = Math.round(performance.now() - t0)
  return res
}

function category(el, reason) {
  const r = norm(reason)
  let chain = ''
  for (let n = el; n && n.tagName; n = n.parentElement) {
    chain += ` ${n.tagName.toLowerCase()} ${n.id || ''} ${typeof n.className === 'string' ? n.className : ''}`
  }
  chain = chain.toLowerCase() + ' ' + r
  if (/comment|reply|disqus/.test(chain)) return 'comments'
  if (/\bad\b|advert|sponsor|promo|banner-ad/.test(chain)) return 'ads'
  if (/share|social|newsletter|subscribe|signup|popup|modal|cookie|survey|feedback|cta|record-tools/.test(chain)) return 'cta'
  if (/byline|breadcrumb|post-meta|author|metadata|eyebrow|edit-link|pagination|read time/.test(chain)) return 'meta'
  if (/footer/.test(chain)) return 'footer'
  if (/\baside\b|sidebar|related|widget|\btoc\b|rail|popular/.test(chain)) return 'sidebar'
  if (/\bnav\b|header|menu|topbar|tabs|gov-banner|hdr|alert/.test(chain)) return 'nav'
  return 'other'
}

const UNIT_SEL = 'h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,tr,figcaption,dt,dd,button,input,textarea,select,img,table,form'
const BLOCKISH = new Set('H1 H2 H3 H4 H5 H6 P LI PRE BLOCKQUOTE TR FIGCAPTION DT DD BUTTON INPUT TEXTAREA SELECT IMG FORM'.split(' '))

// Classify each visible block of the ORIGINAL page as kept or removed (with a reason).
export function classify(doc, res) {
  const outText = norm(new DOMParser().parseFromString(res.content || '', 'text/html').body.textContent)
  const removals = (res.debug?.removals || []).map((r) => ({ ...r, t: norm(r.text).replace(/…$|\.\.\.$/, '').slice(0, 40) }))
  let mainEl = null
  try { mainEl = res.debug?.contentSelector ? doc.querySelector(res.debug.contentSelector) : null } catch { /* ignore */ }

  const units = new Set()
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (norm(n.nodeValue).length < 1) continue
    let el = n.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue
    let u = el
    while (u && u !== doc.body && !BLOCKISH.has(u.tagName)) u = u.parentElement
    units.add(u && u !== doc.body ? u : el)
  }
  doc.body.querySelectorAll('img,input,textarea,select,button').forEach((e) => units.add(e))
  // drop units nested in another unit
  const list = [...units].filter((u) => { for (let p = u.parentElement; p; p = p.parentElement) if (units.has(p)) return false; return true })

  const out = []
  for (const el of list) {
    const text = norm(el.textContent || el.getAttribute('alt') || el.getAttribute('placeholder') || '')
    let kept
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|FORM)$/.test(el.tagName)) kept = false
    else if (el.tagName === 'IMG') kept = !!(mainEl && mainEl.contains(el) && (res.content || '').includes(el.getAttribute('src')?.slice(0, 40) || '\u0000'))
    else {
      const probe = text.slice(0, 50)
      kept = probe.length > 0 && (outText.includes(probe) || (/^H[12]$/.test(el.tagName) && probe === norm(res.title).slice(0, 50)))
    }
    let reason = ''
    if (!kept) {
      const hit = text.length >= 3 && removals.find((r) => r.t.length >= 3 && (text.startsWith(r.t.slice(0, 25)) || r.t.startsWith(text.slice(0, 25)) || text.includes(r.t)))
      if (hit) reason = `${hit.step}${hit.reason ? ': ' + hit.reason : hit.selector ? ' (' + hit.selector + ')' : ''}`
      else if (mainEl && !mainEl.contains(el)) reason = 'outside the main content block'
      else reason = 'dropped during cleanup / standardization'
    }
    out.push({ el, kept, cat: kept ? 'kept' : category(el, reason), reason, text })
  }
  return { units: out, mainEl }
}

export function paint(doc, units, filter) {
  let st = doc.getElementById('__lens')
  if (!st) { st = doc.createElement('style'); st.id = '__lens'; doc.head.appendChild(st) }
  st.textContent = `[data-lens]{transition:background .2s,outline .2s;border-radius:2px}`
  for (const u of units) {
    const c = CATS[u.cat].color
    const on = filter === 'all' || filter === u.cat
    u.el.setAttribute('data-lens', u.cat)
    u.el.style.outline = on ? `2px solid ${c}` : ''
    u.el.style.outlineOffset = '1px'
    u.el.style.backgroundColor = on && u.el.tagName !== 'PRE' ? c + (u.kept ? '1f' : '33') : ''
    u.el.title = u.kept ? 'KEPT: main content' : `REMOVED (${CATS[u.cat].label}): ${u.reason}`
  }
}

export function counts(units) {
  const c = {}
  for (const u of units) c[u.cat] = (c[u.cat] || 0) + 1
  return c
}
