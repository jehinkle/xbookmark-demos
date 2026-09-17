import { useEffect, useState } from 'react'
import './App.css'
import Home from './Home.jsx'
import Analytics from './Analytics.jsx'

function useHashRoute() {
  const get = () => {
    const h = window.location.hash.replace(/^#/, '') || '/'
    return h.startsWith('/') ? h : `/${h}`
  }
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const onHash = () => setRoute(get())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '#/'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

function Nav({ route }) {
  return (
    <header className="topnav">
      <a className="brand" href="#/" aria-label="EarlyPhase demo home">
        <span className="brand-mark" aria-hidden />
        <span className="brand-text">
          EarlyPhase <em>(demo)</em>
        </span>
      </a>
      <nav className="nav-links">
        <a href="#/" className={route === '/' ? 'active' : undefined}>
          Home
        </a>
        <a
          href="#/analytics"
          className={route.startsWith('/analytics') ? 'active' : undefined}
        >
          Analytics
        </a>
      </nav>
    </header>
  )
}

export default function App() {
  const route = useHashRoute()
  const page = route.startsWith('/analytics') ? <Analytics /> : <Home />

  return (
    <div className="app-shell">
      <Nav route={route} />
      <main className="app-main">{page}</main>
    </div>
  )
}
