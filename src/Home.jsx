import { EnrollmentCurve, ProgressRing, MilestoneSparkline } from './charts.jsx'

export default function Home() {
  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Biometrics CRO · Demo Lab</p>
          <h1>
            You shouldn’t have to face tight timelines, complex data, and high
            regulatory risk alone.
          </h1>
          <p className="hero-lede">
            Expert data curation, biostatistics, and statistical programming so
            sponsors move forward with confidence—without delays, rework, or
            surprises.
          </p>
          <div className="value-props">
            <article>
              <h3>Precise</h3>
              <p>Analyses designed to withstand regulatory scrutiny.</p>
            </article>
            <article>
              <h3>Agile</h3>
              <p>Senior-led teams that scale to your study timelines.</p>
            </article>
            <article>
              <h3>Reliable</h3>
              <p>Clear communication. Clean deliverables. No surprises.</p>
            </article>
          </div>
        </div>
        <aside className="hero-viz" aria-label="Study analytics preview">
          <div className="viz-card">
            <div className="viz-card-head">
              <span>Enrollment trajectory</span>
              <span className="pill">Live mock</span>
            </div>
            <EnrollmentCurve animate />
          </div>
          <div className="viz-card rings-card">
            <div className="viz-card-head">
              <span>TLF package</span>
            </div>
            <div className="rings-row">
              <ProgressRing value={92} label="Tables" color="#0d9488" />
              <ProgressRing value={78} label="Listings" color="#2b6cb0" />
              <ProgressRing value={64} label="Figures" color="#14b8a6" />
            </div>
          </div>
          <div className="viz-card">
            <div className="viz-card-head">
              <span>Study milestones</span>
              <span className="muted-sm">58% to DBR</span>
            </div>
            <MilestoneSparkline progress={0.58} />
          </div>
        </aside>
      </section>

      <section className="strip">
        <h2>We align quickly, execute efficiently, and deliver work you can rely on.</h2>
        <div className="strip-steps">
          <div className="step">
            <span className="step-num">01</span>
            <h3>Align</h3>
            <p>Scope, timelines, deliverables, and success criteria.</p>
          </div>
          <div className="step-arrow" aria-hidden>
            →
          </div>
          <div className="step">
            <span className="step-num">02</span>
            <h3>Execute</h3>
            <p>Hands-on senior statisticians and programmers throughout.</p>
          </div>
          <div className="step-arrow" aria-hidden>
            →
          </div>
          <div className="step">
            <span className="step-num">03</span>
            <h3>Deliver</h3>
            <p>Submission-ready outputs, clearly documented and on time.</p>
          </div>
        </div>
      </section>

      <section className="known">
        <h2>We’re known for</h2>
        <ul>
          <li>
            <strong>Schedule rescue</strong> — putting studies back on track when
            timelines slip.
          </li>
          <li>
            <strong>Complex analyses</strong> — high-risk estimands, adaptive
            designs, and submission packages.
          </li>
          <li>
            <strong>Senior expertise</strong> — lean teams that need judgment, not
            just headcount.
          </li>
        </ul>
        <a className="cta" href="#/analytics">
          Open analytics dashboard →
        </a>
      </section>

      <footer className="site-footer">
        Demo Lab throwaway inspired by earlyphase.com — not affiliated production
      </footer>
    </div>
  )
}
