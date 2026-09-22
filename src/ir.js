/**
 * Faithful JS port of unclebob/uml-viewer examples/library.edn
 * plus a mock proposal for what-if regrouping.
 * Levels (Clean Architecture): Domain(0) < Application(1) < Adapters(2)
 * Dependency Rule: edges may point inward/same (higher→lower OK).
 * Violation = from.level < to.level (inner depends on outer) → paint red.
 */

export const LEVELS = {
  domain: 0,
  app: 1,
  adapters: 2,
}

export const LEVEL_BY_PACKAGE = {
  domain: 0,
  app: 1,
  adapters: 2,
}

/** Real diagram — Lending library sample */
export const diagram = {
  id: 'real',
  title: 'Lending library',
  direction: 'tb',
  packages: [
    {
      id: 'domain',
      label: 'Domain',
      crap: { mu: 1.5, max: 4.0, sigma: 0.9 },
      classes: [
        {
          id: 'catalog',
          name: 'Catalog',
          crap: { mu: 1.2, max: 2.0, sigma: 0.4 },
          coverage: 0.91,
          cc: 5,
          fields: [{ name: 'books', type: 'Book[]' }],
          ops: [
            {
              name: 'find',
              args: ['isbn'],
              returns: 'Book',
              cc: 2,
              crap: 1.1,
              coverage: 0.96,
              killed: 8,
              survived: 0,
            },
            {
              name: 'add',
              args: ['book'],
              returns: 'Catalog',
              cc: 3,
              crap: 1.4,
              coverage: 0.84,
              killed: 5,
              survived: 1,
            },
          ],
        },
        {
          id: 'book',
          name: 'Book',
          crap: { mu: 1.1, max: 1.0, sigma: 0.1 },
          coverage: 1.0,
          fields: [
            { name: 'isbn', type: 'String' },
            { name: 'title', type: 'String' },
            { name: 'author', type: 'Author' },
          ],
          ops: [],
        },
        {
          id: 'author',
          name: 'Author',
          crap: { mu: 1.0, max: 1.0, sigma: 0.0 },
          coverage: 1.0,
          fields: [{ name: 'name', type: 'String' }],
          ops: [],
        },
        {
          id: 'loan',
          name: 'Loan',
          crap: { mu: 1.8, max: 4.0, sigma: 1.0 },
          coverage: 0.78,
          cc: 3,
          fields: [
            { name: 'book', type: 'Book' },
            { name: 'patron', type: 'Patron' },
            { name: 'due', type: 'Date' },
          ],
          ops: [
            {
              name: 'overdue?',
              returns: 'bool',
              cc: 3,
              crap: 2.2,
              coverage: 0.72,
              killed: 6,
              survived: 2,
            },
          ],
        },
        {
          id: 'patron',
          name: 'Patron',
          crap: { mu: 1.4, max: 2.0, sigma: 0.5 },
          fields: [
            { name: 'id', type: 'Id' },
            { name: 'loans', type: 'Loan[]' },
          ],
          ops: [],
        },
      ],
    },
    {
      id: 'app',
      label: 'Application',
      crap: { mu: 2.1, max: 6.0, sigma: 1.4 },
      classes: [
        {
          id: 'loan-service',
          name: 'LoanService',
          crap: { mu: 2.3, max: 6.0, sigma: 1.5 },
          coverage: 0.81,
          cc: 7,
          fields: [],
          ops: [
            {
              name: 'checkout',
              args: ['patron', 'isbn'],
              returns: 'Loan',
              cc: 5,
              crap: 2.8,
              coverage: 0.77,
              killed: 11,
              survived: 3,
            },
            {
              name: 'return',
              args: ['loan'],
              returns: 'void',
              cc: 2,
              crap: 1.3,
              coverage: 0.88,
              killed: 4,
              survived: 0,
            },
          ],
        },
        {
          id: 'search',
          name: 'Search',
          crap: { mu: 1.9, max: 3.0, sigma: 0.7 },
          fields: [],
          ops: [
            {
              name: 'by-title',
              args: ['q'],
              returns: 'Book[]',
              cc: 2,
              crap: 1.9,
              coverage: 0.85,
              killed: 3,
              survived: 1,
            },
          ],
        },
        {
          id: 'repo',
          name: 'CatalogRepo',
          stereotype: 'interface',
          crap: { mu: 1.0, max: 1.0, sigma: 0.0 },
          fields: [],
          ops: [
            {
              name: 'get',
              args: ['isbn'],
              returns: 'Book',
              cc: 1,
              crap: 1.0,
              coverage: 1.0,
              killed: 2,
              survived: 0,
            },
            {
              name: 'save',
              args: ['book'],
              returns: 'void',
              cc: 1,
              crap: 1.0,
              coverage: 1.0,
              killed: 2,
              survived: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'adapters',
      label: 'Adapters',
      crap: { mu: 3.0, max: 7.0, sigma: 1.8 },
      classes: [
        {
          id: 'sql-repo',
          name: 'SqlCatalogRepo',
          crap: { mu: 3.2, max: 7.0, sigma: 1.9 },
          fields: [],
          ops: [
            {
              name: 'get',
              args: ['isbn'],
              returns: 'Book',
              cc: 4,
              crap: 3.5,
              coverage: 0.55,
              killed: 4,
              survived: 5,
            },
            {
              name: 'save',
              args: ['book'],
              returns: 'void',
              cc: 3,
              crap: 2.9,
              coverage: 0.6,
              killed: 3,
              survived: 3,
            },
          ],
        },
        {
          id: 'http-api',
          name: 'HttpApi',
          crap: { mu: 2.8, max: 5.0, sigma: 1.4 },
          fields: [],
          ops: [
            {
              name: 'handle',
              args: ['request'],
              returns: 'Response',
              cc: 6,
              crap: 2.8,
              coverage: 0.7,
              killed: 7,
              survived: 4,
            },
          ],
        },
      ],
    },
  ],
  edges: [
    { from: 'loan', to: 'book', kind: 'association' },
    { from: 'loan', to: 'patron', kind: 'association' },
    { from: 'book', to: 'author', kind: 'association' },
    { from: 'catalog', to: 'book', kind: 'aggregation' },
    { from: 'patron', to: 'loan', kind: 'association' },
    { from: 'loan-service', to: 'catalog', kind: 'dependency' },
    { from: 'loan-service', to: 'loan', kind: 'dependency' },
    { from: 'search', to: 'catalog', kind: 'dependency' },
    { from: 'loan-service', to: 'repo', kind: 'dependency' },
    { from: 'sql-repo', to: 'repo', kind: 'implements' },
    { from: 'http-api', to: 'loan-service', kind: 'dependency' },
    { from: 'http-api', to: 'search', kind: 'dependency' },
    // Didactic (not in library.edn): Domain → Adapters violation so red paint is visible
    { from: 'catalog', to: 'sql-repo', kind: 'dependency' },
  ],
}

/**
 * Mock proposal: Split Domain / UseCases
 * Moves use-case-ish Application classes into a UseCases package,
 * leaves CatalogRepo with Domain entities as a thinner Domain,
 * and keeps Adapters. Illustrates what-if regroup (not in code).
 */
export const proposals = [
  {
    id: 'split-domain-usecases',
    title: 'Split Domain / UseCases',
    inCode: false,
    packages: [
      {
        id: 'domain',
        label: 'Domain',
        crap: { mu: 1.3, max: 4.0, sigma: 0.7 },
        classes: [
          // same class objects by id — resolved at runtime from diagram
          'catalog',
          'book',
          'author',
          'loan',
          'patron',
          'repo',
        ],
      },
      {
        id: 'usecases',
        label: 'UseCases',
        crap: { mu: 2.1, max: 6.0, sigma: 1.4 },
        classes: ['loan-service', 'search'],
      },
      {
        id: 'adapters',
        label: 'Adapters',
        crap: { mu: 3.0, max: 7.0, sigma: 1.8 },
        classes: ['sql-repo', 'http-api'],
      },
    ],
    // same edges; level map changes so loan-service→repo becomes UseCases→Domain (OK)
    edges: null, // inherit from real
  },
]

/** Flat class lookup from real diagram */
export function allClasses(d = diagram) {
  const map = new Map()
  for (const pkg of d.packages) {
    for (const cls of pkg.classes) {
      if (typeof cls === 'string') continue
      map.set(cls.id, { ...cls, packageId: pkg.id })
    }
  }
  return map
}

/** Resolve a view (real or proposal) into concrete packages/classes/edges + level map */
export function resolveView(selection) {
  const classMap = allClasses(diagram)

  if (!selection || selection === 'real') {
    const levelByPkg = { domain: 0, app: 1, adapters: 2 }
    const classToPkg = {}
    for (const pkg of diagram.packages) {
      for (const cls of pkg.classes) classToPkg[cls.id] = pkg.id
    }
    return {
      kind: 'real',
      title: diagram.title,
      packages: diagram.packages,
      edges: diagram.edges,
      levelByPkg,
      classToPkg,
      classMap,
    }
  }

  const prop = proposals.find((p) => p.id === selection)
  if (!prop) return resolveView('real')

  const levelByPkg = { domain: 0, usecases: 1, adapters: 2 }
  const classToPkg = {}
  const packages = prop.packages.map((pkg) => {
    const classes = pkg.classes.map((id) => {
      const base = classMap.get(id)
      classToPkg[id] = pkg.id
      return { ...base, packageId: pkg.id }
    })
    return { id: pkg.id, label: pkg.label, crap: pkg.crap, classes }
  })

  return {
    kind: 'proposal',
    id: prop.id,
    title: prop.title,
    inCode: false,
    packages,
    edges: prop.edges || diagram.edges,
    levelByPkg,
    classToPkg,
    classMap,
  }
}

/** CRAP mu → fill color (green low → yellow → red high) */
export function crapFill(mu) {
  const t = Math.max(0, Math.min(1, ((mu ?? 1) - 1) / 2.5))
  // green #2d6a4f → yellow #ca8a04 → red #b91c1c
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

/** True when edge violates Dependency Rule (inner → outer) */
export function isViolation(fromId, toId, classToPkg, levelByPkg) {
  const fp = classToPkg[fromId]
  const tp = classToPkg[toId]
  if (fp == null || tp == null) return false
  const fl = levelByPkg[fp]
  const tl = levelByPkg[tp]
  if (fl == null || tl == null) return false
  return fl < tl
}
