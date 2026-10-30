# xbookmark-demos

Personal sandbox for **Demo Lab**: throwaway demos inspired by interesting X bookmarks (and pasted links in v0).

## How demos work

1. Create a branch: `demo/YYYY-MM-DD-<slug>`
2. Build a minimal Vite + React page that shows the idea
3. Open a PR from that branch
4. **Cloudflare Pages** deploys a preview URL on the PR (`*.xbookmark-demos.pages.dev`)

Do **not** put secrets, API tokens, or `.env` files in this repo. Mock anything that needs keys.

`main` is the production splash / home. Prefer leaving demo work on PR branches; only merge when you intentionally want something on production.

## Demos

Newest first. Production: https://xbookmark-demos.pages.dev. Previews were checked on 2026-10-30, and all of them returned HTTP 200.

| Date | Demo | What it is | Branch | PR | Preview | Notes |
|---|---|---|---|---|---|---|
| 2026-10-30 | TFL Shell Studio | Editable TFL shell driving a live KM estimate table (median with Brookmeyer-Crowley CI, landmark rates, log-rank p, HR) and KM plot (censor ticks, CI bands, number at risk) from a seeded mock ADTTE (OS/PFS, 2 arms, 160 subjects), plus an ADTTE grid and an R snippet | `demo/2026-10-30-tfl-shell-studio` | [#15](https://github.com/jehinkle/xbookmark-demos/pull/15) (open) | [preview](https://demo-2026-10-30-tfl-shell-st.xbookmark-demos.pages.dev/) | From Edge favorites idea #1 |
| 2026-10-30 | Defuddle Lens | Page-to-Markdown with [kepano/defuddle](https://github.com/kepano/defuddle): original page overlay of kept vs removed blocks by reason, Markdown/rendered/metadata tabs, samples plus URL fetch via a Pages Function | `demo/2026-10-30-page-to-md` | [#14](https://github.com/jehinkle/xbookmark-demos/pull/14) (open) | [preview](https://demo-2026-10-30-page-to-md.xbookmark-demos.pages.dev/) | |
| 2026-10-27 | TFL Swarm Replay | SAP-centered radial map of ~3,500 mock TFL/ADaM/SDTM programs replaying 24 days of agent work, with a milestone burn-up, click-through dependency cards and zoom | `demo/2026-10-27-tfl-swarm` | [#13](https://github.com/jehinkle/xbookmark-demos/pull/13) (open) | [preview](https://demo-2026-10-27-tfl-swarm.xbookmark-demos.pages.dev/) | |
| 2026-10-21 | County Futures | Tennessee counties ranked on Prospects, poverty, mobility and jobs, with a choropleth map and hover breakdowns | `demo/2026-10-21-county-futures` | [#12](https://github.com/jehinkle/xbookmark-demos/pull/12) (open) | [preview](https://demo-2026-10-21-county-futur.xbookmark-demos.pages.dev/) | Spun off as **County Ranks** (bot; repo `jehinkle/county-ranks`) |
| 2026-10-20 | Euclid Rhythms | Euclidean (Bjorklund) rhythm wheels with synthesized drums plus notes on the math | `demo/2026-10-20-euclid-rhythms` | [#11](https://github.com/jehinkle/xbookmark-demos/pull/11) (open) | [preview](https://demo-2026-10-20-euclid-rhyth.xbookmark-demos.pages.dev/) | |
| 2026-10-06 | EnrollmentPulse | Cumulative clinical enrollment tracker | `demo/2026-10-06-enrollment-tracker` | [#10](https://github.com/jehinkle/xbookmark-demos/pull/10) (open) | [preview](https://demo-2026-10-06-enrollment-t.xbookmark-demos.pages.dev/) | |
| 2026-10-01 | Subject Finder | Inventory-style subject selection plus patient profile | `demo/2026-10-01-subject-finder` | [#9](https://github.com/jehinkle/xbookmark-demos/pull/9) (open) | [preview](https://demo-2026-10-01-subject-find.xbookmark-demos.pages.dev/) | Spun off as **Subject Profile** (bot) |
| 2026-09-28 | Clinical lab charts | TradingView-style clinical lab charts | `demo/2026-09-28-lab-charts` | [#8](https://github.com/jehinkle/xbookmark-demos/pull/8) (open) | [preview](https://demo-2026-09-28-lab-charts.xbookmark-demos.pages.dev/) | |
| 2026-09-22 | SAS UML IR mock | UML intermediate-representation mock for SAS programs | `demo/2026-09-22-sas-uml` | [#7](https://github.com/jehinkle/xbookmark-demos/pull/7) (open) | [preview](https://demo-2026-09-22-sas-uml.xbookmark-demos.pages.dev/) | Parked (do not merge) |
| 2026-09-22 | UML viewer | Mock UML viewer over a lending-library IR | `demo/2026-09-22-uml-viewer` | [#6](https://github.com/jehinkle/xbookmark-demos/pull/6) (open) | [preview](https://demo-2026-09-22-uml-viewer.xbookmark-demos.pages.dev/) | |
| 2026-09-17 | Knowledge → ERD | Clinical knowledge store rendered as an ERD | `demo/2026-09-17-erd-knowledge` | [#5](https://github.com/jehinkle/xbookmark-demos/pull/5) (open) | [preview](https://demo-2026-09-17-erd-knowledg.xbookmark-demos.pages.dev/) | Spun off to **Diagram** bot (EPDiagram) |
| 2026-09-17 | EarlyPhase analytics | EarlyPhase analytics demo | `demo/2026-09-17-earlyphase-analytics` | [#4](https://github.com/jehinkle/xbookmark-demos/pull/4) (open) | [preview](https://demo-2026-09-17-earlyphase-a.xbookmark-demos.pages.dev/) | |
| 2026-09-15 | Acceleration | Port of kynd's CodePen acceleration sketch | `demo/2026-09-15-acceleration` | [#3](https://github.com/jehinkle/xbookmark-demos/pull/3) (closed) | [preview](https://demo-2026-09-15-acceleration.xbookmark-demos.pages.dev/) | |
| 2026-09-15 | Second Brain | Obsidian-style second-brain toy | `demo/2026-09-15-obsidian-second-brain` | [#2](https://github.com/jehinkle/xbookmark-demos/pull/2) (closed) | [preview](https://demo-2026-09-15-obsidian-sec.xbookmark-demos.pages.dev/) | |

## Local

```bash
npm install
npm run dev
npm run build   # output → dist/ (Cloudflare Pages build output)
```

## Stack

- Vite + React
- Build command: `npm run build`
- Output directory: `dist`
