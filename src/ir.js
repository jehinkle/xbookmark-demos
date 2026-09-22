/**
 * SAS UML IR — Demo Lab mock
 * Seed: /workspace/sas-uml-ir/examples/adam-tfl.seed.json (also Knowledge-ERD)
 * Sketch: SAS-IR-SKETCH.md
 *
 * Levels (Clean Architecture style):
 *   0 macros (innermost) … 4 drivers (outer)
 * Dependency Rule: outer may depend on inner (from.level > to.level OK).
 * Violation on strong edges when from.level < to.level (inner → outer).
 */

import seed from './adam-tfl.seed.json'

export const EDGE_KINDS = ['include', 'macro-call', 'reads-dataset', 'implements-qc']

export const seedIr = seed

/** Heat 0→1 → green→yellow→red fill */
export function heatFill(heat) {
  const t = Math.max(0, Math.min(1, heat ?? 0.2))
  if (t < 0.5) {
    const u = t / 0.5
    return lerpColor([45, 106, 79], [202, 138, 4], u)
  }
  const u = (t - 0.5) / 0.5
  return lerpColor([202, 138, 4], [185, 28, 28], u)
}

function lerpColor(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function buildModuleMap(modules, metrics) {
  const map = new Map()
  for (const m of modules) {
    map.set(m.id, {
      ...m,
      metrics: metrics[m.id] || null,
    })
  }
  return map
}

/**
 * Apply a proposal's repackage map: moduleId → newPackageId
 * Creates missing packages with inferred levels.
 */
function applyRepackage(packages, modules, repackage) {
  if (!repackage) {
    return { packages: packages.map((p) => ({ ...p })), modules: modules.map((m) => ({ ...m })) }
  }

  const pkgById = new Map(packages.map((p) => [p.id, { ...p }]))
  const nextModules = modules.map((m) => {
    const dest = repackage[m.id]
    if (!dest) return { ...m }
    if (!pkgById.has(dest)) {
      const src = pkgById.get(m.package)
      pkgById.set(dest, {
        id: dest,
        label: dest
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        level: src?.level ?? 1,
        path: src?.path ? `${src.path}/${dest}` : dest,
      })
    }
    return { ...m, package: dest }
  })

  // Drop packages that lost all modules (keep if still referenced)
  const used = new Set(nextModules.map((m) => m.package))
  const nextPkgs = [...pkgById.values()]
    .filter((p) => used.has(p.id) || packages.some((o) => o.id === p.id && used.has(p.id)))
    .filter((p) => used.has(p.id))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))

  return { packages: nextPkgs, modules: nextModules }
}

/** Resolve real diagram or a proposal into view model */
export function resolveView(selection) {
  const basePkgs = seed.packages
  const baseMods = seed.modules
  const metrics = seed.metrics || {}
  const edges = seed.edges || []
  const proposals = seed.proposals || []

  let packages = basePkgs
  let modules = baseMods
  let kind = 'real'
  let title = seed.title
  let proposal = null

  if (selection && selection !== 'real') {
    proposal = proposals.find((p) => p.id === selection)
    if (proposal) {
      kind = 'proposal'
      title = proposal.label
      const applied = applyRepackage(basePkgs, baseMods, proposal.repackage)
      packages = applied.packages
      modules = applied.modules
    }
  }

  const moduleMap = buildModuleMap(modules, metrics)
  const levelByPkg = {}
  const moduleToPkg = {}
  for (const p of packages) levelByPkg[p.id] = p.level
  for (const m of modules) moduleToPkg[m.id] = m.package

  const packagesWithModules = packages.map((p) => ({
    ...p,
    modules: modules.filter((m) => m.package === p.id).map((m) => moduleMap.get(m.id)),
  }))

  return {
    kind,
    title,
    proposal,
    packages: packagesWithModules,
    modules,
    edges,
    foreign: seed.foreign || [],
    proposals,
    metrics,
    levelByPkg,
    moduleToPkg,
    moduleMap,
  }
}

/**
 * Strong-edge Dependency Rule violation:
 * inner (lower level) must NOT depend on outer (higher level).
 * Violating = from.level < to.level on a strong edge.
 */
export function isViolation(edge, moduleToPkg, levelByPkg) {
  if (edge.strength !== 'strong') return false
  const fp = moduleToPkg[edge.from]
  const tp = moduleToPkg[edge.to]
  if (fp == null || tp == null) return false
  const fl = levelByPkg[fp]
  const tl = levelByPkg[tp]
  if (fl == null || tl == null) return false
  return fl < tl
}

export function edgesForModule(moduleId, edges, direction) {
  if (direction === 'out') return edges.filter((e) => e.from === moduleId)
  return edges.filter((e) => e.to === moduleId)
}
