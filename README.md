# TFL Swarm Replay — mock clinical programming swarm

Demo Lab throwaway inspired by [Axiom — AxiomProver's swarm formalized the Classification of Finite Simple Groups in Lean](https://x.com/axiommathai/status/2115089844745773304).

**Branch:** `demo/2026-10-27-tfl-swarm` · do **not** merge to `main` unless intentional.

Clinical re-skin of Axiom's two charts for a fictional study XYZ-101:

- **Radial dependency map** (canvas + SVG): CSR at the center; sections (SDTM, ADSL, ADAE, ADLB, ADVS, ADEG, ADEX/ADCM, Efficacy, PK, Listings, Safety tables, Figures, 10 smaller folders) as pastel arc bands; ~3,500 dots = programs/outputs placed by dependency depth (TFL outputs near the center, ADaM derivations mid, SDTM mappings and raw specs at the rim); 108 gold-diamond milestones.
- **Replay**: one slider + play/pause/speed over 24 days. Dots go grey → ring (being programmed) → light blue (awaiting QC) → blue (double-programming match). Orange = QC mismatch open. Two "Paused" periods (data transfer, SAP amendment). Day 17.2 a SAP discrepancy in ADTTE censoring turns a branch red until it is rerouted and re-validated.
- **Burn-up**: milestones completed out of 108, end-of-day points, pause bands, dotted annotations, synced cursor.
- **Hover** a dot: output id/title, type, section, depth, upstream count, agent, day programmed, QC status; its path to the CSR is highlighted.

Mock data only (seeded generator in `src/lib/model.js`). No backend, no network calls.

```bash
npm install && npm run dev
```
