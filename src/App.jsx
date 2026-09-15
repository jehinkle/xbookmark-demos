import { useMemo, useState } from 'react'
import './App.css'

const FOLDERS = ['Projects', 'Areas', 'Resources', 'Archive']

const SEED_NOTES = [
  {
    id: 'n1',
    title: 'Second Brain Setup',
    folder: 'Projects',
    body: 'Capture ideas with [[PARA Method]] and link them into a graph.',
  },
  {
    id: 'n2',
    title: 'PARA Method',
    folder: 'Resources',
    body: 'Projects, Areas, Resources, Archive — the backbone of a second brain.',
  },
  {
    id: 'n3',
    title: 'Daily Capture',
    folder: 'Areas',
    body: 'Inbox habit: jot a note, tag a folder, link with [[Second Brain Setup]].',
  },
  {
    id: 'n4',
    title: 'Obsidian Tips',
    folder: 'Resources',
    body: 'Use [[wiki-links]] between notes. Start from [[PARA Method]].',
  },
  {
    id: 'n5',
    title: 'Old Scratchpad',
    folder: 'Archive',
    body: 'Archived brainstorms that fed [[Daily Capture]].',
  },
  {
    id: 'n6',
    title: 'Reading List',
    folder: 'Areas',
    body: 'Books and essays on knowledge work — see [[Obsidian Tips]].',
  },
]

const TWEET_URL =
  'https://x.com/humzaakhalid/status/2062821175546515504'

function parseWikiLinks(text) {
  const links = []
  const re = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = re.exec(text)) !== null) {
    links.push(m[1].trim())
  }
  return links
}

function Graph({ notes, highlightId }) {
  const { nodes, edges } = useMemo(() => {
    const byTitle = new Map(notes.map((n) => [n.title.toLowerCase(), n]))
    const nodes = notes.map((n, i) => {
      const angle = (i / Math.max(notes.length, 1)) * Math.PI * 2 - Math.PI / 2
      const r = notes.length <= 3 ? 70 : 95
      return {
        ...n,
        x: 160 + Math.cos(angle) * r,
        y: 130 + Math.sin(angle) * r,
      }
    })
    const edges = []
    const seen = new Set()
    for (const note of notes) {
      const targets = parseWikiLinks(`${note.title} ${note.body}`)
      for (const t of targets) {
        const target = byTitle.get(t.toLowerCase())
        if (!target || target.id === note.id) continue
        const key = [note.id, target.id].sort().join('-')
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ from: note.id, to: target.id })
      }
    }
    return { nodes, edges }
  }, [notes])

  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <svg className="graph" viewBox="0 0 320 260" role="img" aria-label="Note graph">
      {edges.map((e) => {
        const a = pos[e.from]
        const b = pos[e.to]
        if (!a || !b) return null
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="graph-edge"
          />
        )
      })}
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
          <circle
            r={highlightId === n.id ? 14 : 11}
            className={
              highlightId === n.id ? 'graph-node graph-node--hot' : 'graph-node'
            }
          />
          <text className="graph-label" y={24} textAnchor="middle">
            {n.title.length > 14 ? `${n.title.slice(0, 12)}…` : n.title}
          </text>
        </g>
      ))}
    </svg>
  )
}

function formatTitleAsWiki(title) {
  return `[[${title}]]`
}

function App() {
  const [notes, setNotes] = useState(SEED_NOTES)
  const [folder, setFolder] = useState('Projects')
  const [filter, setFilter] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [lastId, setLastId] = useState(null)

  const visible = filter
    ? notes.filter((n) => n.folder === filter)
    : notes

  function handleAdd(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const id = `n${Date.now()}`
    const note = {
      id,
      title: t,
      folder,
      body: body.trim() || `Note in ${folder}.`,
    }
    setNotes((prev) => [...prev, note])
    setTitle('')
    setBody('')
    setLastId(id)
  }

  const counts = Object.fromEntries(
    FOLDERS.map((f) => [f, notes.filter((n) => n.folder === f).length]),
  )

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Second Brain (Obsidian toy)</h1>
          <p className="credit">
            Inspired by{' '}
            <a href={TWEET_URL} target="_blank" rel="noreferrer">
              How to Build Your Second Brain using Obsidian (FREE)
            </a>{' '}
            by Hamza Khalid
          </p>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h2 className="panel-title">PARA</h2>
          <button
            type="button"
            className={!filter ? 'folder active' : 'folder'}
            onClick={() => setFilter(null)}
          >
            <span>All notes</span>
            <span className="count">{notes.length}</span>
          </button>
          {FOLDERS.map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? 'folder active' : 'folder'}
              onClick={() => setFilter(f)}
            >
              <span className="folder-icon" aria-hidden>
                ▢
              </span>
              <span>{f}</span>
              <span className="count">{counts[f]}</span>
            </button>
          ))}
        </aside>

        <section className="center">
          <h2 className="panel-title">Capture</h2>
          <form className="capture" onSubmit={handleAdd}>
            <div className="row">
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
                aria-label="Note title"
              />
              <select
                className="select"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                aria-label="PARA folder"
              >
                {FOLDERS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn">
                Add
              </button>
            </div>
            <textarea
              className="textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body — link notes with [[Title]]"
              rows={2}
              aria-label="Note body"
            />
          </form>

          <ul className="note-list">
            {visible.map((n) => (
              <li
                key={n.id}
                className={n.id === lastId ? 'note note--new' : 'note'}
              >
                <div className="note-top">
                  <span className="wiki">{formatTitleAsWiki(n.title)}</span>
                  <span className="badge">{n.folder}</span>
                </div>
                <p className="note-body">{n.body}</p>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="empty">No notes in this folder yet.</li>
            )}
          </ul>
        </section>

        <aside className="graph-panel">
          <h2 className="panel-title">Graph</h2>
          <p className="hint">Edges appear when a note mentions [[Another Title]]</p>
          <Graph notes={notes} highlightId={lastId} />
        </aside>
      </div>
    </div>
  )
}

export default App
