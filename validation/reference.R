# Generates validation/reference.json: base-R power.t.test / power.prop.test, closed-form and integrated
# normal assurance, an independent implementation of the conjugate Bayesian rule, and seeded simulations.
# Run from the repo root: Rscript validation/reference.R
suppressMessages(library(jsonlite))
cases <- fromJSON("validation/cases.json", simplifyVector = FALSE)
NSIM <- 20000
lsk <- c(normal = 0, `lognormal-moderate` = 0.5, `lognormal-heavy` = 1.0)
draw <- function(n, sd, shape) {          # mean 0, SD sd
  k <- lsk[[shape]]; if (k == 0) return(rnorm(n, 0, sd))
  m <- sd / sqrt(exp(k^2) - 1); exp(rnorm(n, log(m) - k^2 / 2, k)) - m
}
out <- list()
for (c in cases) {
  r <- list(id = c$id)
  if (c$kind == "t_n") r$n <- power.t.test(delta = c$delta, sd = c$sd, sig.level = c$alpha, power = c$power, tol = 1e-10)$n
  if (c$kind == "t_power") r$power <- power.t.test(n = c$n, delta = c$delta, sd = c$sd, sig.level = c$alpha)$power
  if (c$kind == "z_n") r$n <- 2 * (qnorm(1 - c$alpha / 2) + qnorm(c$power))^2 * c$sd^2 / c$delta^2
  if (c$kind == "t_power_ratio") {          # power.t.test has no allocation ratio: use the noncentral t directly
    nC <- c$n; nT <- c$ratio * nC; df <- nC + nT - 2; ncp <- c$delta / (c$sd * sqrt(1 / nC + 1 / nT))
    r$power <- pt(qt(1 - c$alpha / 2, df), df, ncp = ncp, lower.tail = FALSE)
  }
  if (c$kind == "prop_n") r$n <- power.prop.test(p1 = c$pC, p2 = c$pT, sig.level = c$alpha, power = c$power, tol = 1e-10)$n
  if (c$kind == "prop_power") r$power <- power.prop.test(n = c$n, p1 = c$pC, p2 = c$pT, sig.level = c$alpha)$power
  if (c$kind == "prop_power_ratio") {      # unequal-allocation analogue of power.prop.test (pooled null SE)
    nC <- c$n; nT <- c$ratio * nC; pb <- (nC * c$pC + nT * c$pT) / (nC + nT)
    se0 <- sqrt(pb * (1 - pb) * (1 / nC + 1 / nT)); se1 <- sqrt(c$pC * (1 - c$pC) / nC + c$pT * (1 - c$pT) / nT)
    r$power <- pnorm((abs(c$pT - c$pC) - qnorm(1 - c$alpha / 2) * se0) / se1)
  }
  ses <- function(c, n) {
    if (c$endpoint == "continuous") { s <- c$sd * sqrt(2 / n); return(c(s, s)) }
    pb <- (c$pC + c$pT) / 2
    c(sqrt(c$pC * (1 - c$pC) / n + c$pT * (1 - c$pT) / n), sqrt(pb * (1 - pb) * 2 / n))
  }
  if (c$kind == "assurance") {
    s <- ses(c, c$n); z <- qnorm(1 - c$alpha / 2)
    pw <- function(th) pnorm((th - z * s[2]) / s[1])
    r$assurance <- integrate(function(th) pw(th) * dnorm(th, c$mu, c$tau), -Inf, Inf, rel.tol = 1e-12)$value
    r$closedForm <- pnorm((c$mu - z * s[2]) / sqrt(s[1]^2 + c$tau^2))
  }
  if (c$kind == "bayes") {
    eff <- if (c$endpoint == "continuous") c$delta else abs(c$pT - c$pC)
    pv <- if (c$n0 > 0) ses(c, c$n0)[1]^2 else Inf; pm <- if (c$mean == "skeptical") 0 else eff
    # P(theta > 0 | thetaHat) by direct conjugate update; success region found by root-finding (independent of JS algebra)
    post_p <- function(th_hat, se) {
      if (is.infinite(pv)) return(pnorm(th_hat / se))
      prec <- 1 / pv + 1 / se^2; m <- (pm / pv + th_hat / se^2) / prec; pnorm(m * sqrt(prec))
    }
    crit <- function(se) uniroot(function(x) post_p(x, se) - c$gamma, c(-50 * se - 100, 50 * se + 100), tol = 1e-12)$root
    psucc <- function(n) { s <- ses(c, n); 1 - pnorm((crit(s[1]) - eff) / s[1]) }
    n <- 2; while (psucc(n) < c$power) n <- n + 1
    s <- ses(c, n)
    r$n <- n; r$pSuccess <- psucc(n); r$typeI <- 1 - pnorm(crit(s[2]) / s[2])
    if (isTRUE(c$sim)) {                    # individual-level simulation, known SD, under theta = 0 and theta = delta
      set.seed(20261119)
      simrule <- function(theta) {
        y0 <- matrix(rnorm(NSIM * n, 0, c$sd), NSIM); y1 <- matrix(rnorm(NSIM * n, theta, c$sd), NSIM)
        th <- rowMeans(y1) - rowMeans(y0); mean(sapply(th, post_p, se = s[1]) > c$gamma)
      }
      r$simTypeI <- simrule(0); r$simPSuccess <- simrule(eff); r$nSim <- NSIM
    }
  }
  if (c$kind == "sim") {
    set.seed(20261119)
    n <- c$n
    if (c$endpoint == "continuous") {
      keepC <- matrix(runif(NSIM * n) >= c$dropout, NSIM); keepT <- matrix(runif(NSIM * n) >= c$dropout, NSIM)
      y0 <- matrix(draw(NSIM * n, c$sd, c$shape), NSIM); y1 <- matrix(draw(NSIM * n, c$sd, c$shape) + c$delta, NSIM)
      a <- rowSums(keepC); b <- rowSums(keepT)
      m0 <- rowSums(y0 * keepC) / a; m1 <- rowSums(y1 * keepT) / b
      ss <- rowSums(((y0 - m0) * keepC)^2) + rowSums(((y1 - m1) * keepT)^2); df <- a + b - 2
      t <- (m1 - m0) / sqrt(ss / df * (1 / a + 1 / b))
      rej <- abs(t) > qt(1 - c$alpha / 2, df)
      # spot-check the vectorised statistic against t.test(var.equal = TRUE) on the first 200 trials
      chk <- sapply(1:200, function(i) t.test(y1[i, keepT[i, ]], y0[i, keepC[i, ]], var.equal = TRUE)$statistic)
      stopifnot(max(abs(chk - t[1:200])) < 1e-8)
    } else {
      x0 <- rbinom(NSIM, n, c$pC); x1 <- rbinom(NSIM, n, c$pT); p <- (x0 + x1) / (2 * n)
      z <- (x1 / n - x0 / n) / sqrt(p * (1 - p) * 2 / n); rej <- abs(z) > qnorm(1 - c$alpha / 2)
      chk <- sapply(1:200, function(i) suppressWarnings(prop.test(c(x1[i], x0[i]), c(n, n), correct = FALSE)$statistic))
      stopifnot(max(abs(chk - z[1:200]^2)) < 1e-8)
    }
    r$power <- mean(rej); r$nSim <- NSIM
  }
  out[[length(out) + 1]] <- r
}
meta <- list(R = R.version.string, nSim = NSIM, seed = 20261119)
write_json(list(meta = meta, results = out), "validation/reference.json", auto_unbox = TRUE, digits = 12, pretty = TRUE)
cat("wrote validation/reference.json\n")
