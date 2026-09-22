import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { EDGE_KINDS, resolveView } from './ir.js'
import Canvas from './Canvas.jsx'
import Inspector from './Inspector.jsx'
import ModuleCard from './ModuleCard.jsx'

export default function App() {
  const [selection, setSelection] = useState('real')
  const [focusPkgId, setFocusPkgId] = useState(null)
  const [hideArrows, setHideArrows] = useState(false)
  const [edgeKindFilter, setEdgeKindFilter] = useState(() => new Set(EDGE_KINDS))
  const [selectedModule, setSelectedModule] = useState(null)

  const view = useMemo(() => resolveView(selection), [selection])

  const goUp = useCallback(() => {
    if (selectedModule) {
      setSelectedModule(null)
      return
    }
    setFocusPkgId(null)
  }, [selectedModule])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goUp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goUp])

  const onSelectView = (id) => {
    setSelection(id)
    setFocusPkgId(null)
    setSelectedModule(null)
  }

  const onToggleEdgeKind = (kind) => {
    setEdgeKindFilter((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) {
        if (next.size > 1) next.delete(kind)
      } else {
        next.add(kind)
      }
      return next
    })
  }

  return (
    <div className="app-shell">
      <div className="canvas-pane">
        <Canvas
          view={view}
          focusPkgId={focusPkgId}
          hideArrows={hideArrows}
          edgeKindFilter={edgeKindFilter}
          onDrillPackage={(id) => setFocusPkgId(id)}
          onSelectModule={(mod) => setSelectedModule(mod)}
        />
      </div>
      <Inspector
        selection={selection}
        onSelectView={onSelectView}
        hideArrows={hideArrows}
        onToggleArrows={setHideArrows}
        edgeKindFilter={edgeKindFilter}
        onToggleEdgeKind={onToggleEdgeKind}
        focusPkgId={focusPkgId}
        onGoUp={goUp}
      />
      <ModuleCard
        mod={selectedModule}
        view={view}
        onClose={() => setSelectedModule(null)}
      />
    </div>
  )
}
