import { useEffect, useMemo, useRef, useState } from 'react'
import { runDefuddle, classify, paint, counts, CATS } from './lib.js'
import news from './samples/news.html?raw'
import blog from './samples/blog.html?raw'
import docs from './samples/docs.html?raw'
import trial from './samples/trial.html?raw'

const SAMPLES = [
  { id: 'news', name: 'News article', note: 'ads, cookie banner, comments', html: news, url: 'https://dailyledger.example/health/adaptive-designs' },
  { id: 'blog', name: 'Blog + sidebar', note: 'footnote, code, MathML, comments', html: blog, url: 'https://statnotes.example/2026/09/sas-macros' },
  { id: 'docs', name: 'Docs page', note: 'nav tree, TOC, code blocks', html: docs, url: 'https://tte-toolkit.example/guides/adtte' },
  { id: 'trial', name: 'Trial registry record', note: 'registry-style clinical page', html: trial, url: 'https://registry.example/study/XT-2026-00101' },
]

const stripScripts = (h) => h.replace(/<script\b(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/gi, '')
const bytes = (s) => new Blob([s || '']).size
const kb = (n) => (n / 1024).toFixed(1) + ' KB'

export default function App() {
  const [src, setSrc] = useState({ html: SAMPLES[0].html, url: SAMPLES[0].url, label: SAMPLES[0].name })
  const [active, setActive] = useState('news')
  const [urlIn, setUrlIn] = useState('https://stephango.com/')
  const [paste, setPaste] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('md')
  const [filter, setFilter] = useState('all')
  const [units, setUnits] = useState([])
  const [copied, setCopied] = useState(false)
  const frame = useRef(null)

  const res = useMemo(() => {
    try { return runDefuddle(src.html, src.url) } catch (e) { return { error: String(e) } }
  }, [src])

  const srcdoc = useMemo(() => {
    let h = stripScripts(src.html)
    const base = `<base href="${src.url}" target="_blank">`
    h = /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, (m) => m + base) : base + h
    return h
  }, [src])

  const onFrameLoad = () => {
    const doc = frame.current?.contentDocument
    if (!doc || !doc.body || res.error) return
    const { units } = classify(doc, res)
    setUnits(units)
    paint(doc, units, filter)
  }
  useEffect(() => { const d = frame.current?.contentDocument; if (d && units.length) paint(d, units, filter) }, [filter, units])

  const c = counts(units)
  const removedN = units.filter((u) => !u.kept).length
  const md = res.contentMarkdown || ''
  const inB = bytes(src.html), outB = bytes(md)
  const steps = {}
  for (const r of res.debug?.removals || []) steps[r.step] = (steps[r.step] || 0) + 1

  async function fetchUrl() {
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/fetch?url=' + encodeURIComponent(urlIn.trim()))
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('json')) throw new Error('The /api/fetch function is not available here (local dev or static host). Paste HTML or use a sample instead.')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Fetch failed')
      setSrc({ html: j.html, url: j.url, label: new URL(j.url).hostname + (j.truncated ? ' (truncated at 2 MB)' : '') })
      setActive('url')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  function usePaste() {
    if (!paste.trim()) return
    setSrc({ html: paste, url: 'https://pasted.example/', label: 'Pasted HTML' }); setActive('paste'); setShowPaste(false)
  }
  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    a.download = (res.title || 'page').replace(/[^\w-]+/g, '-').slice(0, 60) + '.md'
    a.click()
  }

  const previewDoc = `<!doctype html><html><head><meta charset="utf-8"><base href="${src.url}" target="_blank"><style>body{font:15px/1.6 system-ui,sans-serif;max-width:680px;margin:16px auto;padding:0 16px;color:#1f2937}pre{background:#f3f4f6;padding:10px;overflow:auto;border-radius:6px}img{max-width:100%}blockquote{border-left:3px solid #cbd5e1;margin:0;padding-left:12px;color:#475569}table{border-collapse:collapse}td,th{border:1px solid #e5e7eb;padding:4px 8px}</style></head><body>${/<h1/i.test(res.content || "") ? "" : "<h1>" + (res.title || '').replace(/</g, "&lt;") + "</h1>"}${res.content || ''}</body></html>`

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Defuddle Lens</h1>
          <p className="sub">See what <a href="https://github.com/kepano/defuddle" target="_blank" rel="noreferrer">defuddle</a> keeps and throws away when it turns a cluttered web page into clean Markdown.</p>
        </div>
        <div className="inputs">
          <div className="samples">
            {SAMPLES.map((s) => (
              <button key={s.id} className={active === s.id ? 'chip on' : 'chip'} onClick={() => { setSrc({ html: s.html, url: s.url, label: s.name }); setActive(s.id); setErr('') }} title={s.note}>{s.name}</button>
            ))}
            <button className={active === 'paste' ? 'chip on' : 'chip'} onClick={() => setShowPaste(!showPaste)}>Paste HTML…</button>
          </div>
          <form className="urlrow" onSubmit={(e) => { e.preventDefault(); fetchUrl() }}>
            <input value={urlIn} onChange={(e) => setUrlIn(e.target.value)} placeholder="https://…" aria-label="Page URL" />
            <button disabled={busy}>{busy ? 'Fetching…' : 'Fetch & defuddle'}</button>
          </form>
          {err && <div className="err">{err}</div>}
        </div>
      </header>
      {showPaste && (
        <div className="paste">
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the full HTML of a page (View Source → copy)…" />
          <button onClick={usePaste}>Defuddle pasted HTML</button>
        </div>
      )}

      <div className="stats">
        <Stat k="Source" v={src.label} />
        <Stat k="Input HTML" v={kb(inB)} />
        <Stat k="Markdown" v={kb(outB)} />
        <Stat k="Size reduction" v={inB ? Math.round((1 - outB / inB) * 100) + '%' : '–'} strong />
        <Stat k="Words kept" v={res.wordCount ?? '–'} />
        <Stat k="Blocks kept / removed" v={`${c.kept || 0} / ${removedN}`} />
        <Stat k="Parse time" v={(res.clientMs ?? '–') + ' ms'} />
      </div>

      <main className="split">
        <section className="pane">
          <div className="panehead">
            <b>Original page</b><span className="muted"> · sandboxed, scripts off · hover a block for the reason</span>
          </div>
          <div className="legend">
            <button className={filter === 'all' ? 'lg on' : 'lg'} onClick={() => setFilter('all')}>All</button>
            {Object.entries(CATS).filter(([k]) => c[k]).map(([k, v]) => (
              <button key={k} className={filter === k ? 'lg on' : 'lg'} onClick={() => setFilter(filter === k ? 'all' : k)}>
                <i style={{ background: v.color }} />{v.label} <span className="n">{c[k]}</span>
              </button>
            ))}
          </div>
          <iframe ref={frame} className="orig" title="Original page" sandbox="allow-same-origin" srcDoc={srcdoc} onLoad={onFrameLoad} />
        </section>

        <section className="pane">
          <div className="tabs">
            {[['md', 'Markdown'], ['preview', 'Rendered'], ['meta', 'Metadata'], ['removed', `Removed (${removedN})`]].map(([k, l]) => (
              <button key={k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>{l}</button>
            ))}
            {tab === 'md' && <span className="tabtools">
              <button onClick={() => { navigator.clipboard?.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? 'Copied ✓' : 'Copy'}</button>
              <button onClick={download}>Download .md</button>
            </span>}
          </div>
          {res.error && <div className="err">{res.error}</div>}
          {tab === 'md' && <pre className="md">{md}</pre>}
          {tab === 'preview' && <iframe className="orig" title="Rendered" sandbox="allow-same-origin" srcDoc={previewDoc} />}
          {tab === 'meta' && (
            <div className="meta">
              <table><tbody>
                {[['Title', res.title], ['Author', res.author], ['Published', res.published], ['Site', res.site], ['Domain', res.domain], ['Language', res.language], ['Description', res.description], ['Word count', res.wordCount], ['Extractor', res.extractorType || 'generic'], ['Main content selector', res.debug?.contentSelector]].map(([k, v]) => (
                  <tr key={k}><th>{k}</th><td>{v || <span className="muted">—</span>}</td></tr>
                ))}
              </tbody></table>
              <h4>Defuddle removal steps (debug log)</h4>
              <table><tbody>{Object.entries(steps).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
              {res.schemaOrgData && <><h4>schema.org data</h4><pre className="md small">{JSON.stringify(res.schemaOrgData, null, 2)}</pre></>}
            </div>
          )}
          {tab === 'removed' && (
            <div className="removed">
              {units.filter((u) => !u.kept && u.text).map((u, i) => (
                <div key={i} className="rm" style={{ borderLeftColor: CATS[u.cat].color }}>
                  <div className="rmtext">{u.text.slice(0, 140)}</div>
                  <div className="muted small">{CATS[u.cat].label} · {u.reason}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="foot">
        Extraction by <a href="https://github.com/kepano/defuddle" target="_blank" rel="noreferrer">kepano/defuddle</a> (MIT, Steph Ango) running in your browser, v{__DEFUDDLE_VERSION__}.
        Kept/removed overlay is this demo's approximation: it matches page blocks against defuddle's output and its debug removal log.
        Samples are mock pages. URL fetching goes through a small Cloudflare Pages Function (http/https only, 2 MB, 8 s, private IPs blocked). Demo Lab throwaway.
      </footer>
    </div>
  )
}

function Stat({ k, v, strong }) {
  return <div className={strong ? 'stat strong' : 'stat'}><span>{k}</span><b>{v}</b></div>
}
