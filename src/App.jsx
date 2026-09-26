import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { EDGE_KINDS, cloneIr, resolveView } from './ir.js'
import { defaultLayout, explodedAbsPositions } from './layout.js'
import Canvas from './Canvas.jsx'
import Inspector from './Inspector.jsx'
import ModuleCard from './ModuleCard.jsx'

const emptyOffsets = () => ({})

export default function App() {
  const [selection, setSelection] = useState('real')
  const [ir, setIr] = useState(() => cloneIr())
  const [hideArrows, setHideArrows] = useState(false)
  const [edgeKindFilter, setEdgeKindFilter] = useState(() => new Set(EDGE_KINDS))
  const [explodedPkgs, setExplodedPkgs] = useState(() => new Set())
  const [selectedModule, setSelectedModule] = useState(null)
  const [pkgOffsets, setPkgOffsets] = useState(emptyOffsets)
  const [modOffsets, setModOffsets] = useState(emptyOffsets)
  const [animating, setAnimating] = useState(false)
  const [viewEpoch, setViewEpoch] = useState(0)
  const animTimer = useRef(null)
  const pkgOffsetsRef = useRef(pkgOffsets)
  const modOffsetsRef = useRef(modOffsets)
  const explodedPkgsRef = useRef(explodedPkgs)
  const dragBase = useRef(null)

  useEffect(() => {
    pkgOffsetsRef.current = pkgOffsets
  }, [pkgOffsets])
  useEffect(() => {
    modOffsetsRef.current = modOffsets
  }, [modOffsets])
  useEffect(() => {
    explodedPkgsRef.current = explodedPkgs
  }, [explodedPkgs])

  const view = useMemo(() => resolveView(selection, ir), [selection, ir])

  const pulseAnimate = useCallback(() => {
    setAnimating(true)
    if (animTimer.current) clearTimeout(animTimer.current)
    animTimer.current = setTimeout(() => setAnimating(false), 340)
  }, [])

  useEffect(
    () => () => {
      if (animTimer.current) clearTimeout(animTimer.current)
    },
    [],
  )

  const resetLayout = useCallback(() => {
    setPkgOffsets(emptyOffsets())
    setModOffsets(emptyOffsets())
    setExplodedPkgs(new Set())
    setSelectedModule(null)
    dragBase.current = null
    pulseAnimate()
  }, [pulseAnimate])

  const goUp = useCallback(() => {
    if (selectedModule) {
      setSelectedModule(null)
      return
    }
    if (explodedPkgs.size > 0) {
      const explodedIds = [...explodedPkgs]
      setExplodedPkgs(new Set())
      // Absolute per-module positions only apply while exploded — drop them on collapse
      setModOffsets((prev) => {
        const next = { ...prev }
        for (const pkgId of explodedIds) {
          const mods = view.packages.find((p) => p.id === pkgId)?.modules || []
          for (const m of mods) delete next[m.id]
        }
        return next
      })
      pulseAnimate()
    }
  }, [selectedModule, explodedPkgs, view.packages, pulseAnimate])

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
    setSelectedModule(null)
    setExplodedPkgs(new Set())
    setPkgOffsets(emptyOffsets())
    setModOffsets(emptyOffsets())
    dragBase.current = null
    setViewEpoch((n) => n + 1)
    pulseAnimate()
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

  const onToggleExplode = useCallback(
    (pkgId) => {
      const pkg = view.packages.find((p) => p.id === pkgId)
      const modIds = (pkg?.modules || []).map((m) => m.id)
      const willExplode = !explodedPkgsRef.current.has(pkgId)

      setExplodedPkgs((prev) => {
        const next = new Set(prev)
        if (next.has(pkgId)) next.delete(pkgId)
        else next.add(pkgId)
        return next
      })

      if (willExplode && pkg) {
        // Bake absolute world positions so cards no longer inherit package transform
        const base = defaultLayout(view.packages)
        const basePkg = base.pkgBoxes.find((b) => b.id === pkgId)
        if (basePkg) {
          const abs = explodedAbsPositions(
            pkg,
            basePkg,
            pkgOffsetsRef.current[pkgId],
          )
          setModOffsets((prev) => {
            const next = { ...prev }
            for (const id of modIds) {
              if (abs[id]) next[id] = abs[id]
              else delete next[id]
            }
            return next
          })
        }
      } else {
        // Collapse: drop absolute offsets; modules re-pack into package grid
        setModOffsets((prev) => {
          const next = { ...prev }
          for (const id of modIds) delete next[id]
          return next
        })
      }
      pulseAnimate()
    },
    [view.packages, pulseAnimate],
  )

  const onSelectModule = useCallback((mod) => {
    setSelectedModule(mod)
  }, [])

  const onMovePackage = useCallback(
    (pkgId, dx, dy, opts = {}) => {
      // Hub drag: move package origin. If exploded, also translate child modules'
      // absolute positions by the same delta so the wrapping hull stays coherent
      // (individual module drag remains independent — siblings do not move).
      const apply = (deltaX, deltaY, fromBase) => {
        const base = fromBase
        setPkgOffsets((prev) => ({
          ...prev,
          [pkgId]: { x: base.x + deltaX, y: base.y + deltaY },
        }))
        if (explodedPkgsRef.current.has(pkgId) && base.modBases) {
          setModOffsets((prev) => {
            const next = { ...prev }
            for (const [modId, mb] of Object.entries(base.modBases)) {
              next[modId] = { x: mb.x + deltaX, y: mb.y + deltaY }
            }
            return next
          })
        }
      }

      if (opts.phase === 'move') {
        if (!dragBase.current || dragBase.current.kind !== 'pkg' || dragBase.current.id !== pkgId) {
          const cur = pkgOffsetsRef.current[pkgId] || { x: 0, y: 0 }
          let modBases = null
          if (explodedPkgsRef.current.has(pkgId)) {
            const mods = view.packages.find((p) => p.id === pkgId)?.modules || []
            modBases = {}
            for (const m of mods) {
              modBases[m.id] = modOffsetsRef.current[m.id] || { x: 0, y: 0 }
            }
          }
          dragBase.current = { kind: 'pkg', id: pkgId, x: cur.x, y: cur.y, modBases }
        }
        apply(dx, dy, dragBase.current)
      } else if (opts.phase === 'end') {
        if (dragBase.current?.kind === 'pkg' && dragBase.current.id === pkgId) {
          apply(dx, dy, dragBase.current)
        }
        dragBase.current = null
      }
    },
    [view.packages],
  )

  const onMoveModule = useCallback((modId, dx, dy, opts = {}) => {
    if (opts.phase === 'move') {
      if (!dragBase.current || dragBase.current.kind !== 'mod' || dragBase.current.id !== modId) {
        const cur = modOffsetsRef.current[modId] || { x: 0, y: 0 }
        dragBase.current = { kind: 'mod', id: modId, x: cur.x, y: cur.y }
      }
      const base = dragBase.current
      setModOffsets((prev) => ({
        ...prev,
        [modId]: { x: base.x + dx, y: base.y + dy },
      }))
    } else if (opts.phase === 'end') {
      if (dragBase.current?.kind === 'mod' && dragBase.current.id === modId) {
        const base = dragBase.current
        setModOffsets((prev) => ({
          ...prev,
          [modId]: { x: base.x + dx, y: base.y + dy },
        }))
      }
      dragBase.current = null
    }
  }, [])

  const onMoveModulePackage = useCallback(
    (modId, newPkgId) => {
      setIr((prev) => ({
        ...prev,
        modules: prev.modules.map((m) =>
          m.id === modId ? { ...m, package: newPkgId } : m,
        ),
      }))
      setSelectedModule((cur) =>
        cur?.id === modId ? { ...cur, package: newPkgId } : cur,
      )
      // Drop absolute offset so the card re-homes with its new package
      setModOffsets((prev) => {
        if (!(modId in prev)) return prev
        const next = { ...prev }
        delete next[modId]
        return next
      })
      setViewEpoch((n) => n + 1)
      pulseAnimate()
    },
    [pulseAnimate],
  )

  const onRemoveEdge = useCallback((index) => {
    setIr((prev) => ({
      ...prev,
      edges: prev.edges.filter((_, i) => i !== index),
    }))
  }, [])

  const onAddEdge = useCallback((edge) => {
    setIr((prev) => ({
      ...prev,
      edges: [...prev.edges, edge],
    }))
  }, [])

  const onResetIr = useCallback(() => {
    setIr(cloneIr())
    setSelection('real')
    setSelectedModule(null)
    setExplodedPkgs(new Set())
    setPkgOffsets(emptyOffsets())
    setModOffsets(emptyOffsets())
    dragBase.current = null
    setViewEpoch((n) => n + 1)
    pulseAnimate()
  }, [pulseAnimate])

  return (
    <div className="app-shell">
      <div className="canvas-pane">
        <Canvas
          key={viewEpoch}
          view={view}
          hideArrows={hideArrows}
          edgeKindFilter={edgeKindFilter}
          explodedPkgs={explodedPkgs}
          onToggleExplode={onToggleExplode}
          onSelectModule={onSelectModule}
          pkgOffsets={pkgOffsets}
          modOffsets={modOffsets}
          onMovePackage={onMovePackage}
          onMoveModule={onMoveModule}
          onResetLayout={resetLayout}
          animating={animating}
        />
      </div>
      <Inspector
        selection={selection}
        onSelectView={onSelectView}
        hideArrows={hideArrows}
        onToggleArrows={setHideArrows}
        edgeKindFilter={edgeKindFilter}
        onToggleEdgeKind={onToggleEdgeKind}
        explodedCount={explodedPkgs.size}
        selectedModule={selectedModule}
        onGoUp={goUp}
        onResetLayout={resetLayout}
        ir={ir}
        onMoveModulePackage={onMoveModulePackage}
        onAddEdge={onAddEdge}
        onRemoveEdge={onRemoveEdge}
        onResetIr={onResetIr}
      />
      <ModuleCard
        mod={selectedModule}
        view={view}
        onClose={() => setSelectedModule(null)}
      />
    </div>
  )
}
