# xbookmark-demos

Demo Lab sandbox — throwaway Vite + React demos with Cloudflare Pages preview URLs on `demo/*` branches.

## Current demo: SAS UML (IR mock)

Branch `demo/2026-09-22-sas-uml` — browser mock in the spirit of [unclebob/uml-viewer](https://github.com/unclebob/uml-viewer), driven by a **SAS** intermediate representation seed (not Clojure).

Source of truth: `src/adam-tfl.seed.json` (copied from `sas-uml-ir/examples/adam-tfl.seed.json`; see `SAS-IR-SKETCH.md`).

```bash
npm install
npm run dev
```

### Interaction

- **Drag** package headers or module cards — positions persist for the session; dependency edges re-route live.
- **Empty canvas** drag pans the view; hold **Alt** and drag anywhere to pan (so you never fight card drag).
- **Double-click** a package (or the ⤢ control) to **explode** modules into a fan-out cluster; double-click / ⧉ / Esc to collapse.
- **Double-click** a module to expand its detail card **in-canvas** (path, exports, metrics, edges); double-click / Esc to collapse.
- Wheel zooms · **Reset layout** in the inspector (or canvas hint) restores defaults.
- Inspector: Real diagram · Split ADaM proposal · All/Hide arrows · edge-kind chips · heat / violation legend.

**Do not merge** — Demo Lab throwaway.
