# TFL Swarm Replay — mock clinical programming swarm

Demo Lab throwaway inspired by [Axiom — AxiomProver's swarm formalized the Classification of Finite Simple Groups in Lean](https://x.com/axiommathai/status/2115089844745773304).

**Branch:** `demo/2026-10-27-tfl-swarm` · do **not** merge to `main` unless intentional.

Clinical re-skin of Axiom's two charts for a fictional study XYZ-101:

- **Radial dependency map** (canvas + SVG): the **SAP** is the root at the center; depth = dependency steps from the SAP. Wedges run clockwise in SAP chapter order (§5 SDTM data handling, §6 ADSL, §7 ADEX/ADCM, §9 Efficacy, §10.1–10.4 ADAE/ADLB/ADVS/ADEG, §11 PK, §14.1–14.3 table/listing/figure shells, 10 smaller sections). Depth 1 = SAP chapter, 2 = SAP rule, 3 = spec/shell, 4–9 = derivations, 10+ = outputs/deliverables at the rim. ~3,500 dots, 108 gold milestones (last = CSR-ready topline output).
- **Click** a dot or diamond: pinned dependency-chain card, one level per depth from the SAP (cross-section upstream parents grouped at their level) plus direct downstream dependents; click a level card to re-select. Close with ×, Esc, or a click on empty map space.
- **Replay**: one slider + play/pause/speed over 24 days. Dots go grey → ring (being programmed) → light blue (awaiting QC) → blue (double-programming match). Orange = QC mismatch open. Two "Paused" periods (data transfer, SAP amendment). Day 17.2 ADTTE censoring is found to conflict with SAP §9.4.2: the path from the SAP to §9.4.2 lights red and everything downstream is invalidated until SAP v2.1 (Day 18.6) and re-validation.
- **Burn-up**: milestones completed out of 108, end-of-day points, pause bands, dotted annotations, synced cursor.
- **Zoom/pan**: wheel (zooms at cursor) or trackpad/touch pinch, 1×–12×; drag to pan; double-click zooms in; +/−/fit buttons with a zoom readout and a minimap. Dots grow only ~k^0.4 so clusters separate; past 4× non-overlapping short labels appear. Section bands follow the zoom at a fixed thickness and font size. "⊕ Zoom to" in the dependency card flies the map to the node; when zoomed in, selecting a level card pans to keep it in view.
- **Hover** a dot: output id/title, type, section, depth, upstream count, agent, day programmed, QC status; its path to the SAP is highlighted.

Mock data only (seeded generator in `src/lib/model.js`). No backend, no network calls.

```bash
npm install && npm run dev
```
