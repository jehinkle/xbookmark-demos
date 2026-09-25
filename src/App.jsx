import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { EDGE_KINDS, resolveView } from './ir.js'
import { defaultLayout, explodedAbsPositions } from './layout.js'
import Canvas from './Canvas.jsx'
import Inspector from './Inspector.jsx'

const emptyOffsets = () => ({})

export default function App() {
  const [selection, setSelection] = useState('real')
  const [hideArrows, setHideArrows] = useState(false)
  const [edgeKindFilter, setEdgeKindFilter] = useState(() => new Set(EDGE_KINDS))
  const [explodedPkgs, setExplodedPkgs] = useState(() => new Set())
  const [expandedModId, setExpandedModId] = useState(null)
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

  const view = useMemo(() => resolveView(selection), [selection])

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
    setExpandedModId(null)
    dragBase.current = null
    pulseAnimate()
  }, [pulseAnimate])

  const goUp = useCallback(() => {
    if (expandedModId) {
      setExpandedModId(null)
      pulseAnimate()
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
  }, [expandedModId, explodedPkgs, view.packages, pulseAnimate])

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
    setExpandedModId(null)
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

  const onToggleExpandMod = useCallback(
    (modId) => {
      setExpandedModId((prev) => (prev === modId ? null : modId))
      pulseAnimate()
    },
    [pulseAnimate],
  )

  const onMovePackage = useCallback((pkgId, dx, dy, opts = {}) => {
    if (opts.phase === 'move') {
      if (!dragBase.current || dragBase.current.kind !== 'pkg' || dragBase.current.id !== pkgId) {
        const cur = pkgOffsetsRef.current[pkgId] || { x: 0, y: 0 }
        dragBase.current = { kind: 'pkg', id: pkgId, x: cur.x, y: cur.y }
      }
      const base = dragBase.current
      setPkgOffsets((prev) => ({
        ...prev,
        [pkgId]: { x: base.x + dx, y: base.y + dy },
      }))
    } else if (opts.phase === 'end') {
      if (dragBase.current?.kind === 'pkg' && dragBase.current.id === pkgId) {
        const base = dragBase.current
        setPkgOffsets((prev) => ({
          ...prev,
          [pkgId]: { x: base.x + dx, y: base.y + dy },
        }))
      }
      dragBase.current = null
    }
  }, [])

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
          expandedModId={expandedModId}
          onToggleExpandMod={onToggleExpandMod}
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
        expandedModId={expandedModId}
        onGoUp={goUp}
        onResetLayout={resetLayout}
      />
    </div>
  )
}
