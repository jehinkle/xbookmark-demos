# Validation

- `cases.json`: 16 reference cases (fixed TTE/means/rates, group-sequential with and without non-binding futility, survival designs including the UC example).
- `reference.R`: computes the reference values with gsDesign and rpact and writes `reference.json`. Run it from the repo root with `Rscript validation/reference.R`.
- `validate.test.js`: Vitest comparison, which writes `agreement.json`. `sim.test.js` is the Monte Carlo sanity check.
- `AGREEMENT.md`: summary table.

Tolerances: boundary z and HR ±1e-3, inflation factor ±1e-3, events ±0.5, N ±1 (unrounded totals; means, events ±0.01; rates ±0.05).
