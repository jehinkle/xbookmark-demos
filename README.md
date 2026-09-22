# xbookmark-demos

Demo Lab sandbox — throwaway Vite + React demos with Cloudflare Pages preview URLs on `demo/*` branches.

## Current demo: SAS UML (IR mock)

Branch `demo/2026-09-22-sas-uml` — browser mock in the spirit of [unclebob/uml-viewer](https://github.com/unclebob/uml-viewer), driven by a **SAS** intermediate representation seed (not Clojure).

Source of truth: `src/adam-tfl.seed.json` (copied from `sas-uml-ir/examples/adam-tfl.seed.json`; see `SAS-IR-SKETCH.md`).

```bash
npm install
npm run dev
```

Try: click a package to drill in (Esc / ← to go up), click a module for path/exports/metrics/edges, select **Split ADaM: core vs AE**, toggle declutter arrows and edge-kind chips.

**Do not merge** — Demo Lab throwaway.
