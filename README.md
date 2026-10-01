# xbookmark-demos · Subject Finder (Demo Lab)

> **Synthetic data, not for clinical use.** Every subject, site, investigator and value in this demo is generated from a seeded RNG (`src/lib/data.js`, seed `20261001`). No real patient data.

A clinical-trial **Subject Finder** that borrows the *layout pattern* of a vehicle-inventory search page (filter rail, inventory cards, detail page with a summary panel) and applies it to trial subjects in a fictional Phase 2 study, **DEMO-LAB-001**: 72 subjects across 6 sites in 3 arms (Placebo, Low dose 100 mg, High dose 300 mg) with 21-day cycles × 8. The styling and branding are original. No third-party logos, imagery or trademarks are used.

## Routes (hash routing, no SPA config needed)

| Route | Page |
| --- | --- |
| `#/` | Subject inventory (results) |
| `#/subject/<id>` | Patient profile, e.g. `#/subject/03-114` |

## Results page interactions

- **Change Study**: opens a study picker (only DEMO-LAB-001 is active).
- **Hide Filters / Show Filters**: collapses the left rail. The grid widens from 2–3 to 4 columns, and a badge shows how many filters are active.
- **Showing sites: …**: context line. Click it to open and scroll to the Site filter.
- **Filter rail**: every section collapses. Within a section, options are OR'd. Across sections, they're AND'd. Each checkbox shows a live count computed against all *other* active filters, and options with no matches are greyed out.
  - Study arm: segmented tabs (All / Placebo / Low / High) with counts.
  - Age and Days on study: dual-thumb range sliders with editable min/max boxes (commit on blur or Enter).
  - Sex, Race / ethnicity (grouped), Study status, Protocol deviations (None / Minor / Major), Baseline ECOG, Baseline BMI band: checkbox lists.
  - Site: checkbox list. The first 4 sites show, and **View more sites** reveals the rest.
  - Disposition: grouped checkboxes (Active, Completed, Discontinued: safety, efficacy or other, Screen failure).
  - Safety flags: swatch-style chips (Any SAE, Grade 3+ AE, Dose reduction, Lab out of range).
- **Search**: free text across subject ID, screening #, site name or city, PI, arm, status, AE terms, con meds, medical history and deviation categories. Space-separated terms are AND'd (try `nausea high`, `Bayview`, `03-1`).
- **Sort**: Subject ID, Days on study (high to low), Enrolled date (newest), Age (youngest first).
- **Active-filter chips**: click a chip to remove that filter. **Remove All** resets everything.
- **Result count + Load More**: shows 12 at a time with a progress bar. Changing a filter resets paging.
- **Cards**: an abstract arm-colored tile with initials (no photos), a favorite heart, Subject ID, arm · site, days on study as the headline, current visit, demographic and spec lines, a status badge (green On treatment, amber Follow-up, gray Completed, red Discontinued, and others), safety flag chips, and site plus screening #. Click anywhere on the card, the ID, or **View Profile** to open the profile.
- **Promo block**: "Protocol at a glance" sits in the grid. **View visit schedule** opens the schedule of assessments.
- **Compare**: tick up to 3 cards. A tray slides up from the bottom. With 2 or more selected, **Compare N** opens a side-by-side table. A 4th checkbox is disabled.

## Patient profile interactions

- **Back to results** returns to `#/` with filters, sort, paging and scroll position preserved. Filters persist in `sessionStorage`.
- **Hero**: arm-colored abstract panel with a favorite heart and a journey stepper (Screening → Randomized → Treatment C*n*/8 → Follow-up → Completed or Discontinued). Thumbnail tiles show ALT, AST, CREAT and HGB sparklines plus an AE count, and clicking one jumps to that tab.
- **Summary panel**: subject ID, status badge, arm, demographics, site, days on study, current visit, current dose and AE tiles, plus enrolled, randomized, first-dose, last-dose and next-visit dates. The copy-link button copies the profile URL.
  - **Flag for review** toggles a flag that also appears on the result card.
  - **Add note** opens an inline editor. Saved notes appear under Overview → Review notes.
  - Flags, notes and favorites live **only in this browser** (`localStorage`). Nothing is sent anywhere.
- **Section tabs** (sticky):
  - **Overview**: expandable groups for Demographics, Baseline characteristics, Study participation, Safety snapshot and Review notes.
  - **Visits & Dosing**: a dosing-by-cycle strip (full, reduced, held, planned) and an expandable per-phase timeline (completed, missed, scheduled) with the dose given at each visit.
  - **Adverse Events**: a table of grade, term, start, end (or Ongoing), relatedness, serious and action taken. SAE rows are tinted.
  - **Labs**: sparklines with shaded reference-range bands for ALT, AST, CREAT and HGB. Out-of-range points are red, and hovering a point shows its value. **Show all values** opens a table.
  - **Con meds**, **Protocol deviations** (severity and status), and **Disposition** (outcome card plus milestones).
- **Similar subjects** carousel: ranked by same arm, status, age band, site and ECOG. Use the arrow buttons or scroll, and click a card to open that profile.

## Code map

```
src/lib/data.js        seeded synthetic dataset (subjects, visits, AEs, labs, con meds, deviations)
src/lib/filters.js     filter state, matching, facet counts, sort options, active chips
src/pages/Results.jsx  inventory page
src/pages/Profile.jsx  patient profile page
src/components/        FilterRail, RangeSlider, SubjectCard, SubjectArt, CompareTray, Sparkline, Modal, Badges, Icons
```

## Demo Lab conventions

1. Create a branch: `demo/YYYY-MM-DD-<slug>`
2. Build a minimal Vite + React page that shows the idea
3. Open a PR from that branch. Don't merge unless you intend it for production.
4. **Cloudflare Pages** builds a preview per branch and commit (`*.xbookmark-demos.pages.dev`)

Don't put secrets, API tokens or `.env` files in this repo. Mock anything that needs keys.

## Local

```bash
npm install
npm run dev
npm run build   # output → dist/ (Cloudflare Pages build output)
```
