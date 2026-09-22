# xbookmark-demos

Demo Lab sandbox — throwaway Vite + React demos with Cloudflare Pages preview URLs on `demo/*` branches.

## Current demo: UML viewer (mock)

Branch `demo/2026-09-22-uml-viewer` — browser mock inspired by [unclebob/uml-viewer](https://github.com/unclebob/uml-viewer) and [this X post](https://x.com/unclebobmartin/status/2102079838639038629).

Not a Clojure/Quil port. Pure React + SVG driven by a JSON IR ported from `examples/library.edn` (Lending library).

```bash
npm install
npm run dev
```

Try: click a package to drill in (Esc / ← to go up), click a class for the metrics card, switch the **Split Domain / UseCases** proposal, toggle declutter arrows.
