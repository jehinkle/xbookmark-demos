# EnrollmentPulse — cumulative clinical trial enrollment (finance-chart style)

Demo Lab throwaway: a **dark Google Finance / TradingView–inspired** chart page mapped to **cumulative randomized enrollment** for a fictional Phase 2 study. Custom SVG + CSS only — no Google, TradingView, or broker branding.

**Branch:** `demo/2026-10-06-enrollment-tracker` · do **not** merge to `main` unless intentional.

## Study seed

| Field | Value |
| --- | --- |
| Protocol | `DEMO-ENR-001` |
| Phase | Phase 2 |
| Target N | 120 |
| Sites | 6 (Austin, Dallas, Houston, San Antonio, Fort Worth, El Paso) |
| Data | Synthetic, seeded RNG (`20261006`) |

X-axis = calendar date · Y = cumulative enrolled. Actual series stops at the last patient enrolled; a **purple dashed model projection** continues from there.

## Interactions

1. **Headline metrics** — Total enrolled (like a “price”), % / delta vs prior window, % of target, last enrollment date, model weekly rate, and projected date to target.
2. **Toolbar**
   - **Area** — filled cumulative series (default).
   - **Compare** — overlay up to 3 sites on the same chart.
   - **Indicators** — toggle Target N dotted reference line and weekly-rate badge.
3. **Site filter** — dropdown + chips (`All` or one site). Series, target share, and projection recompute for the selection.
4. **Projection horizon** — 30 days / 8 weeks / 3 months / 6 months / 1 year. Extends the dashed model segment.
5. **Time-range chips** — `7D · 30D · 90D · 6M · YTD · 1Y · MAX` (clinical mapping of stock 1D/5D/…).
6. **Hover** — crosshair readout (date, cumulative, daily count; projection labeled as model).
7. **Volume pane** — thin bars under the chart = enrollments that calendar day (projection days shown faintly).
8. **+ Add to list** — local UI toggle only (no persistence / backend).

## Projection model (illustrative)

Recent lookback (~28 days) estimates weekday vs weekend daily rates, applies a light weekly cycle and soft dampening near the (site) target. **Labeled as model projection — not a forecast guarantee.**

## Mapping

| Finance metaphor | Clinical mock |
| --- | --- |
| Ticker / price | Study or site · total enrolled |
| % change today | Δ vs prior window of same length |
| After-hours quote | Model projection endpoint / ETA to target |
| Prev. close line | Target N (or site target share) |
| Area series | Cumulative enrollment (actual) |
| Dashed extension | Model projection |
| Volume bars | Daily new enrollments |
| Compare symbols | Multi-site overlay |
| Range chips 1D…MAX | 7D · 30D · 90D · 6M · YTD · 1Y · MAX |

## Local

```bash
npm install
npm run dev
npm run build   # → dist/
```

## Stack

Vite + React · mock data only · Cloudflare Pages branch previews on `demo/*`.
