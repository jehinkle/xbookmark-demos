import { useMemo, useState, useCallback } from 'react'
import './App.css'
import {
  ENTITIES,
  deriveEdges,
  withSampleLink,
} from './knowledge'
import KnowledgePanel from './KnowledgePanel'
import ErdCanvas from './ErdCanvas'

function App() {
  const [included, setIncluded] = useState(
    () => new Set(ENTITIES.map((e) => e.id)),
  )
  const [selectedId, setSelectedId] = useState(null)
  const [sampleLinkOn, setSampleLinkOn] = useState(false)
  const [layoutSeed, setLayoutSeed] = useState(1)
  const [search, setSearch] = useState('')

  const toggleInclude = useCallback((id) => {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setAllIncluded = useCallback((on) => {
    setIncluded(on ? new Set(ENTITIES.map((e) => e.id)) : new Set())
  }, [])

  const liveEntities = useMemo(
    () => withSampleLink(ENTITIES, sampleLinkOn),
    [sampleLinkOn],
  )

  const diagramEntities = useMemo(
    () => liveEntities.filter((e) => included.has(e.id)),
    [liveEntities, included],
  )

  const allEdges = useMemo(
    () => deriveEdges(liveEntities, sampleLinkOn),
    [liveEntities, sampleLinkOn],
  )

  const diagramEdges = useMemo(
    () =>
      deriveEdges(diagramEntities, sampleLinkOn).filter(
        (e) => included.has(e.from) && included.has(e.to),
      ),
    [diagramEntities, sampleLinkOn, included],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-titles">
          <h1>Knowledge → ERD</h1>
          <p>
            Diagram generated live from the knowledge store (not a static
            image). Toggle entities or the sample FK, then rebuild layout.
          </p>
        </div>
        <div className="topbar-actions">
          <span className="stat">
            {diagramEntities.length} tables · {diagramEdges.length} FKs
          </span>
          <button
            type="button"
            className="btn-rebuild"
            onClick={() => setLayoutSeed((s) => s + 1)}
          >
            Rebuild diagram
          </button>
        </div>
      </header>
      <div className="workspace">
        <KnowledgePanel
          entities={liveEntities}
          edges={allEdges}
          included={included}
          onToggleInclude={toggleInclude}
          onIncludeAll={() => setAllIncluded(true)}
          onExcludeAll={() => setAllIncluded(false)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          sampleLinkOn={sampleLinkOn}
          onToggleSampleLink={() => setSampleLinkOn((v) => !v)}
          search={search}
          onSearch={setSearch}
        />
        <main className="canvas-wrap">
          {diagramEntities.length === 0 ? (
            <div className="canvas-empty">
              Include at least one entity from the Knowledge DB to render the
              ERD.
            </div>
          ) : (
            <ErdCanvas
              entities={diagramEntities}
              edges={diagramEdges}
              layoutSeed={layoutSeed}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
