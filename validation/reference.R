# Generates validation/reference.json from gsDesign and rpact.
# Run: Rscript validation/reference.R   (from repo root)
suppressMessages({ library(gsDesign); library(rpact); library(jsonlite) })
cases <- fromJSON("validation/cases.json", simplifyVector = FALSE)
sfu <- function(n) switch(n, OF = sfLDOF, Pocock = sfLDPocock, HSD = sfHSD)
rp  <- function(n) switch(n, OF = "asOF", Pocock = "asP", HSD = "asHSD")
rpb <- function(n) switch(n, OF = "bsOF", Pocock = "bsP", HSD = "bsHSD")
out <- list()
for (c in cases) {
  r <- list(id = c$id)
  if (c$kind == "events") r$events <- nEvents(hr = c$hr, hr0 = c$hr0, alpha = c$alpha, beta = c$beta, ratio = c$r, sided = 1)
  if (c$kind == "freedman") {
    x <- getSampleSizeSurvival(alpha = c$alpha, beta = c$beta, sided = 1, hazardRatio = c$hr, lambda2 = log(2)/12,
      accrualTime = c(0, 12), followUpTime = 12, allocationRatioPlanned = c$r, typeOfComputation = "Freedman")
    r$events <- x$maxNumberOfEvents
  }
  if (c$kind == "means") r$n <- nNormal(delta1 = c$delta, delta0 = c$delta0, sd = c$sd, alpha = c$alpha, beta = c$beta, ratio = 1/c$r, sided = 1)
  if (c$kind == "rates") r$n <- nBinomial(p1 = c$pT, p2 = c$pC, delta0 = c$delta0, alpha = c$alpha, beta = c$beta, ratio = 1/c$r, sided = 1)
  if (c$kind %in% c("gs", "surv") && length(c$t) > 1) {
    k <- length(c$t); tt <- unlist(c$t)
    fut <- !is.null(c$futility)
    g <- gsDesign(k = k, test.type = if (fut) 4 else 1, alpha = c$alpha, beta = c$beta, timing = tt[-k],
      sfu = sfu(c$sf), sfupar = if (is.null(c$sfPar)) NULL else c$sfPar,
      sfl = if (fut) sfu(c$futility$sf) else sfLDOF, sflpar = if (fut && !is.null(c$futility$par)) c$futility$par else NULL)
    r$upper <- g$upper$bound; r$IF <- max(g$n.I)
    if (fut) r$lower <- g$lower$bound
    if (isTRUE(c$rpact) || (c$kind == "surv" && !fut)) {
      d <- getDesignGroupSequential(kMax = k, alpha = c$alpha, beta = c$beta, sided = 1, informationRates = tt,
        typeOfDesign = rp(c$sf), gammaA = if (is.null(c$sfPar)) 1 else c$sfPar)
      r$rpactUpper <- d$criticalValues
      r$rpactIF <- getDesignCharacteristics(d)$inflationFactor
    }
  }
  if (c$kind == "surv") {
    k <- length(c$t); tt <- unlist(c$t); fut <- !is.null(c$futility)
    d <- if (k == 1) getDesignGroupSequential(kMax = 1, alpha = c$alpha, beta = c$beta, sided = 1) else
      getDesignGroupSequential(kMax = k, alpha = c$alpha, beta = c$beta, sided = 1, informationRates = tt, typeOfDesign = rp(c$sf),
        typeBetaSpending = if (fut) rpb(c$futility$sf) else "none", gammaB = if (fut && !is.null(c$futility$par)) c$futility$par else 1,
        bindingFutility = FALSE)
    s <- getSampleSizeSurvival(d, hazardRatio = c$hr, median2 = c$medianC, accrualTime = c(0, c$R), followUpTime = c$F,
      allocationRatioPlanned = c$r, dropoutRate1 = c$dropout, dropoutRate2 = c$dropout, dropoutTime = 12)
    r$rpactEvents <- s$maxNumberOfEvents; r$rpactN <- s$maxNumberOfSubjects
    r$rpactAnalysisTime <- as.numeric(s$analysisTime[, 1]); r$rpactHRBounds <- as.numeric(s$criticalValuesEffectScale[, 1])
    if (k > 1) { r$rpactUpper <- d$criticalValues; if (fut) r$rpactLower <- d$futilityBounds }
    if (c$dropout == 0 || TRUE) {
      x <- nSurv(lambdaC = log(2)/c$medianC, hr = c$hr, eta = if (c$dropout > 0) -log(1 - c$dropout)/12 else 0,
        gamma = 1, R = c$R, T = c$R + c$F, minfup = c$F, ratio = c$r, alpha = c$alpha, beta = c$beta, sided = 1)
      r$gsdFixedEvents <- x$d; r$gsdFixedN <- x$n
    }
  }
  out[[length(out) + 1]] <- r
}
meta <- list(R = R.version.string, gsDesign = as.character(packageVersion("gsDesign")), rpact = as.character(packageVersion("rpact")))
write_json(list(meta = meta, results = out), "validation/reference.json", auto_unbox = TRUE, digits = 12, pretty = TRUE)
cat("wrote validation/reference.json\n")
