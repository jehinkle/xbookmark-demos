import './App.css'

function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>xbookmark-demos</h1>
        <p style={{ opacity: 0.8, maxWidth: '28rem', margin: '0 auto' }}>
          Demo Lab sandbox — throwaway Vite + React demos with Cloudflare Pages
          preview URLs on <code>demo/*</code> branches. Smoke test: demo/smoke-test is live.
        </p>
      </div>
    </main>
  )
}

export default App
