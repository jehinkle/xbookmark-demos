# xbookmark-demos

Demo Lab sandbox — throwaway Vite + React demos with Cloudflare Pages preview URLs on `demo/*` branches.

## Current demo: Knowledge → ERD

Branch `demo/2026-09-17-erd-knowledge` generates an SVG ERD from a cross-referenced clinical/EDC-style knowledge database (`src/knowledge.js`).

```bash
npm install
npm run dev
```

Try: toggle entities in the left panel, click a table card to highlight related nodes/edges, flip the sample FK, hit **Rebuild diagram**.
