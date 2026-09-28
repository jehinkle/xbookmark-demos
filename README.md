# LabCharts — clinical trial lab data (TradingView-style)

Demo Lab throwaway: dark trading-desk chart UI mapped to **mock clinical laboratory time series** (not stocks). Inspired by the look/feel of a TradingView chart page — custom SVG + CSS only; no TradingView widgets, branding, or assets.

**Branch:** `demo/2026-09-28-lab-charts` · do not merge to `main` unless intentional.

## Interactions

1. **Pick a symbol** — click the subject/analyte strip (or use the left watchlist) to select a **Subject ID** (e.g. `01-104`) or **lab analyte** (`ALT`, `AST`, `CREAT`, `HGB`, `WBC`, `PLT`). Search supports both.
2. **Main chart** — line series of lab value vs study visit/day, with out-of-range markers and dose/AE event triangles.
3. **Crosshair** — hover the chart for visit day, value, units, and event readout (legend updates live).
4. **Overlays** — toggle **Ref range** (LLN–ULN band), **Samples** (bottom “volume” pane = sample count / QC flags), and optionally overlay a second analyte.
5. **Time-range chips** — Screening–W12, All, Last 4 visits, On-treatment.

Watchlist tabs flip between **Subjects** (same analyte across the mock cohort) and **Analytes** (panel for one subject).

## Mapping

| Trading metaphor | Clinical mock |
| --- | --- |
| Symbol / ticker | Subject ID or analyte code |
| Price | Lab value (+ units) |
| Time / candles | Study day / visit |
| Horizontal channel | Reference range (LLN–ULN) |
| Volume pane | Visit sample count / QC density |
| Watchlist | Subjects or analytes |
| Event markers | Dose day, AE / OOR flags |

All series are **synthetic** (seeded RNG `20260928`). No auth, no real APIs, no secrets.

## Local

```bash
npm install
npm run dev
npm run build   # → dist/
```

## Stack

Vite + React · Cloudflare Pages branch previews on `demo/*`.
