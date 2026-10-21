# County Futures — counties ranked from Bright Futures to Broke Forever

Demo Lab throwaway inspired by [@Brian_Peotter's state poster](https://x.com/Brian_Peotter/status/2112614917115416777), redone for the counties of one state (Tennessee, 95 counties).

**Branch:** `demo/2026-10-21-county-futures` · do **not** merge to `main` unless intentional.

- Poster-style ranked table, heat chips (#1 green → #N red), RISING/STALLED top/bottom 3, avg-rank sort
- Click headers to re-sort; hover/tap chips for actual values; county choropleth thumbnail by overall rank
- Download PNG (html-to-image)

## Data (real, fetched at prep time, committed as JSON — no runtime APIs/keys)
| Column | Source |
|---|---|
| Prospects | ACS 2019–23 5-yr B20002 median earnings (16+, all ages; unadjusted for cost of living) — Census table-based summary file |
| Kids' start | Census SAIPE 2023 child (0–17) poverty rate |
| Mobility | Opportunity Atlas `kfr_pooled_pooled_p25` (county_outcomes_simple.csv) |
| Job growth | BLS QCEW annual avg employment, all ownerships, 2019→2024 |

Add a state: `scripts/fetch-sources.sh <fips>` → `scripts/make-state-json.py` (edit state) → `node scripts/build-map.mjs <fips> src/data/<abbr>-map.json` → register in `src/states.js`.
