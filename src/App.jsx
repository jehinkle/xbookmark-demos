import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { SUBJECTS } from './lib/data.js'
import { EMPTY_FILTERS, matches } from './lib/filters.js'
import Results, { PAGE_SIZE } from './pages/Results.jsx'
import Profile from './pages/Profile.jsx'
import CompareTray from './components/CompareTray.jsx'
import { IconLogo, IconSearch } from './components/Icons.jsx'

function parseHash() {
  const h = window.location.hash.replace(/^#/, '') || '/'
  const m = h.match(/^\/subject\/([^/?]+)/)
  return m ? { page: 'profile', id: decodeURIComponent(m[1]) } : { page: 'results' }
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function usePersistent(key, initial, storage = 'local') {
  const store = storage === 'session' ? window.sessionStorage : window.localStorage
  const [v, setV] = useState(() => {
    try {
      const raw = store.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      store.setItem(key, JSON.stringify(v))
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [key, v, store])
  return [v, setV]
}

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export default function App() {
  const route = useHashRoute()
  // Filters/sort/paging live here (and in sessionStorage) so "Back to results" keeps them.
  const [filters, setFilters] = usePersistent('sf.filters.v1', EMPTY_FILTERS, 'session')
  const [sort, setSort] = usePersistent('sf.sort.v1', 'id', 'session')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [railOpen, setRailOpen] = useState(() => window.innerWidth > 900)
  const [favorites, setFavorites] = usePersistent('sf.favorites.v1', [])
  const [flagged, setFlagged] = usePersistent('sf.flagged.v1', [])
  const [notes, setNotes] = usePersistent('sf.notes.v1', {})
  const [compare, setCompare] = useState([])
  const resultsScroll = useRef(0)

  const safeFilters = useMemo(() => ({ ...EMPTY_FILTERS, ...filters }), [filters])
  const resultCount = useMemo(() => SUBJECTS.filter((s) => matches(s, safeFilters)).length, [safeFilters])

  const openSubject = useCallback(
    (id) => {
      if (route.page === 'results') resultsScroll.current = window.scrollY
      window.location.hash = `#/subject/${encodeURIComponent(id)}`
    },
    [route.page],
  )
  const backToResults = () => {
    window.location.hash = '#/'
  }

  // scroll handling between routes
  useLayoutEffect(() => {
    if (route.page === 'profile') window.scrollTo(0, 0)
    else window.scrollTo(0, resultsScroll.current)
  }, [route.page, route.id])

  const toggleFav = (id) => setFavorites((l) => toggleIn(l, id))
  const toggleFlag = (id) => setFlagged((l) => toggleIn(l, id))
  const toggleCompare = (id) => setCompare((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= 3 ? l : [...l, id]))
  const addNote = (id, text) =>
    setNotes((n) => ({ ...n, [id]: [{ text, at: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }, ...(n[id] || [])] }))

  return (
    <div className={`app ${compare.length ? 'has-tray' : ''}`}>
      <div className="synthetic-banner" role="note">
        <strong>Synthetic data, not for clinical use.</strong> Demo Lab throwaway · all subjects are generated from a seeded RNG.
      </div>
      <header className="topbar">
        <a className="brand" href="#/" onClick={() => (resultsScroll.current = 0)}>
          <IconLogo />
          <span>
            Demo Lab <b>Trial Ops</b>
          </span>
        </a>
        <nav className="topnav" aria-label="Primary">
          <span>Studies</span>
          <a href="#/" className="active">
            Subjects
          </a>
          <span>Sites</span>
          <span>Reports</span>
        </nav>
        <div className="top-right">
          <span className="top-icon" aria-hidden="true">
            <IconSearch size={18} />
          </span>
          <span className="top-study">DEMO-LAB-001</span>
          <span className="avatar" aria-label="Signed in (demo)">
            JH
          </span>
        </div>
      </header>

      {route.page === 'profile' ? (
        <Profile
          key={route.id}
          id={route.id}
          backToResults={backToResults}
          resultCount={resultCount}
          favorites={favorites}
          toggleFav={toggleFav}
          flagged={flagged}
          toggleFlag={toggleFlag}
          notes={notes}
          addNote={addNote}
          openSubject={openSubject}
        />
      ) : (
        <Results
          filters={safeFilters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          visible={visible}
          setVisible={setVisible}
          favorites={favorites}
          toggleFav={toggleFav}
          compare={compare}
          toggleCompare={toggleCompare}
          flagged={flagged}
          railOpen={railOpen}
          setRailOpen={setRailOpen}
          openSubject={openSubject}
        />
      )}

      <footer className="footer">
        <p>
          <strong>Synthetic data, not for clinical use.</strong> Subject Finder is a Demo Lab prototype. Layout pattern inspired by vehicle-inventory search pages; no real patients, sites, or
          investigators.
        </p>
      </footer>

      <CompareTray ids={compare} onRemove={(id) => setCompare((l) => l.filter((x) => x !== id))} onClear={() => setCompare([])} onOpen={openSubject} />
    </div>
  )
}
