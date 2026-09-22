import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { resolveView } from './ir.js'
import UmlCanvas from './UmlCanvas.jsx'
import Inspector from './Inspector.jsx'
import ClassCard from './ClassCard.jsx'

export default function App() {
  const [selection, setSelection] = useState('real')
  const [focusPkgId, setFocusPkgId] = useState(null)
  const [hideArrows, setHideArrows] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)

  const view = useMemo(() => resolveView(selection), [selection])

  const goUp = useCallback(() => {
    if (selectedClass) {
      setSelectedClass(null)
      return
    }
    setFocusPkgId(null)
  }, [selectedClass])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
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
    setSelectedClass(null)
  }

  return (
    <div className="app-shell">
      <div className="canvas-pane">
        <UmlCanvas
          view={view}
          focusPkgId={focusPkgId}
          hideArrows={hideArrows}
          onDrillPackage={(id) => setFocusPkgId(id)}
          onSelectClass={(cls) => setSelectedClass(cls)}
        />
      </div>
      <Inspector
        selection={selection}
        onSelectView={onSelectView}
        hideArrows={hideArrows}
        onToggleArrows={setHideArrows}
        focusPkgId={focusPkgId}
        onGoUp={goUp}
      />
      <ClassCard cls={selectedClass} onClose={() => setSelectedClass(null)} />
    </div>
  )
}
