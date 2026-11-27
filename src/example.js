// Worked example recast from Diagity's interventional-trial-designer sample
// (untreated unresectable/metastatic urothelial carcinoma, nivolumab+ipilimumab vs gem+cis/carbo, 1:1).
// All numbers are MOCK planning assumptions, not from any real protocol.
export const EXAMPLE = {
  title: 'Mock Phase 3: Nivolumab + Ipilimumab vs Gemcitabine-Platinum in untreated unresectable or metastatic UC',
  population: 'Participants with untreated unresectable or metastatic urothelial carcinoma',
  armT: 'Arm A: Nivolumab 1 mg/kg + Ipilimumab 3 mg/kg Q3W x4, then Nivolumab 480 mg Q4W',
  armC: 'Arm B: Gemcitabine + Cisplatin OR Gemcitabine + Carboplatin x 6 cycles',
  endpoint: 'tte', endpointName: 'Overall survival (OS)', hypothesis: 'superiority',
  alpha: 0.05, sided: 2, power: 0.9, ratio: 1,
  // continuous
  meanC: 0, meanT: 5, sd: 12, margin: 3,
  // binary
  pC: 0.3, pT: 0.45, marginP: 0.1,
  // tte
  hr: 0.75, hrMargin: 1.3, medianC: 14, accrual: 24, followup: 18, dropout: 0.05, method: 'Schoenfeld',
  interims: [0.5, 0.75], sf: 'OF', sfPar: -4, futility: true, futSf: 'HSD', futPar: -2,
}
