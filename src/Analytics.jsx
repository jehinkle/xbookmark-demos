import { useMemo, useState } from 'react'
import { EnrollmentCurve, ForestPlot, StatusBars } from './charts.jsx'

const STUDIES = [
  {
    id: 'ep-204',
    name: 'EP-204 · Phase 2b Oncology',
    enrollment: [
      [0, 0],
      [1, 12],
      [2, 28],
      [3, 51],
      [4, 79],
      [5, 108],
      [6, 132],
      [7, 151],
      [8, 168],
      [9, 180],
      [10, 188],
      [11, 194],
    ],
    endpoints: [
      { name: 'ORR', est: 0.42, lo: 0.28, hi: 0.56 },
      { name: 'PFS', est: 0.31, lo: 0.12, hi: 0.48 },
      { name: 'DoR', est: 0.55, lo: 0.34, hi: 0.72 },
      { name: 'OS', est: 0.18, lo: -0.05, hi: 0.38 },
    ],
    status: [
      { label: 'Programming', pct: 88, color: '#0d9488' },
      { label: 'QC', pct: 71, color: '#2b6cb0' },
      { label: 'Stats review', pct: 54, color: '#14b8a6' },
    ],
  },
  {
    id: 'ep-118',
    name: 'EP-118 · Phase 1 Healthy Volunteer',
    enrollment: [
      [0, 0],
      [1, 18],
      [2, 36],
      [3, 48],
      [4, 48],
      [5, 48],
      [6, 48],
    ],
    endpoints: [
      { name: 'Cmax', est: 0.08, lo: -0.12, hi: 0.26 },
      { name: 'AUC', est: 0.15, lo: -0.02, hi: 0.32 },
      { name: 'T½', est: -0.05, lo: -0.22, hi: 0.14 },
      { name: 'Safety', est: 0.02, lo: -0.18, hi: 0.21 },
    ],
    status: [
      { label: 'Programming', pct: 100, color: '#0d9488' },
      { label: 'QC', pct: 96, color: '#2b6cb0' },
      { label: 'Stats review', pct: 90, color: '#14b8a6' },
    ],
  },
  {
    id: 'ep-331',
    name: 'EP-331 · Phase 3 Cardiovascular',
    enrollment: [
      [0, 0],
      [1, 45],
      [2, 110],
      [3, 195],
      [4, 290],
      [5, 380],
      [6, 470],
      [7, 555],
      [8, 630],
      [9, 700],
      [10, 760],
      [11, 810],
      [12, 850],
    ],
    endpoints: [
      { name: 'MACE', est: 0.22, lo: 0.08, hi: 0.35 },
      { name: 'CV death', est: 0.14, lo: -0.02, hi: 0.29 },
      { name: 'Hospitalization', est: 0.36, lo: 0.21, hi: 0.5 },
      { name: 'QoL', est: 0.48, lo: 0.3, hi: 0.64 },
    ],
    status: [
      { label: 'Programming', pct: 62, color: '#0d9488' },
      { label: 'QC', pct: 41, color: '#2b6cb0' },
      { label: 'Stats review', pct: 28, color: '#14b8a6' },
    ],
  },
]

export default function Analytics() {
  const [studyId, setStudyId] = useState(STUDIES[0].id)
  const study = useMemo(
    () => STUDIES.find((s) => s.id === studyId) || STUDIES[0],
    [studyId],
  )

  return (
    <div className="page analytics">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Interactive mock</p>
          <h1>Biometrics dashboard</h1>
          <p className="hero-lede">
            Switch studies to refresh enrollment, treatment-effect forest plot,
            and deliverable status—all client-side mock data.
          </p>
        </div>
        <label className="study-select">
          <span>Study</span>
          <select
            value={studyId}
            onChange={(e) => setStudyId(e.target.value)}
            aria-label="Select study"
          >
            {STUDIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="dash-grid">
        <section className="viz-card dash-panel">
          <div className="viz-card-head">
            <span>Cumulative enrollment</span>
            <span className="pill">{study.id.toUpperCase()}</span>
          </div>
          <EnrollmentCurve key={study.id + '-enr'} points={study.enrollment} animate />
        </section>

        <section className="viz-card dash-panel">
          <div className="viz-card-head">
            <span>Treatment effect (forest)</span>
            <span className="muted-sm">estimate ± CI</span>
          </div>
          <ForestPlot key={study.id + '-forest'} endpoints={study.endpoints} />
        </section>

        <section className="viz-card dash-panel wide">
          <div className="viz-card-head">
            <span>Deliverable status</span>
            <span className="muted-sm">Programming · QC · Stats review</span>
          </div>
          <StatusBars key={study.id + '-status'} items={study.status} />
        </section>
      </div>

      <p className="back-link">
        <a href="#/">← Back to Home</a>
      </p>

      <footer className="site-footer">
        Demo Lab throwaway inspired by earlyphase.com — not affiliated production
      </footer>
    </div>
  )
}
