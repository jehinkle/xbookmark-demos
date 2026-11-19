# Validation

- `cases.json`: 23 reference cases — continuous and binary closed-form n/power (incl. 2:1 allocation), normal assurance, the conjugate Bayesian decision rule (n, P(success), type I error, plus individual-level simulations of the rule), and seeded power simulations (normal, type I, heavy lognormal skew, dropout, binary).
- `reference.R`: base R only (`power.t.test`, `power.prop.test`, `pt`/`qt` with ncp, `integrate`, `uniroot`, `t.test`/`prop.test` spot checks, 20,000-trial simulations, seed 20261119) plus `jsonlite`. Writes `reference.json`. Run from the repo root: `Rscript validation/reference.R`.
- `validate.test.js`: Vitest comparison; writes `agreement.json` and `AGREEMENT.md`. `math.test.js`: unit tests for the distributions, defaults, Bayesian behaviour, RNG and the probit fit.

Tolerances: power and assurance ±1e-6; closed-form n ±1e-3 (R `uniroot` tol 1e-10); Bayesian n exact; Monte Carlo comparisons within 3 combined standard errors (JS and R use different RNGs); simulation-search n within 3 (continuous) / 8 (binary) of the analytic n.
