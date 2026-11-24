import { useEffect, useRef, useState } from 'react'
import HeroCanvas from './HeroCanvas.jsx'
import { ForestPlot, Timeline, Checklist, Waterfall, GSBoundary, TflShell } from './Graphics.jsx'

const SITE = 'https://www.earlyphase.com'

// Adds .in when an element scrolls into view.
function useReveal(threshold = 0.25) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setInView(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

function Section({ id, label, children, className = '' }) {
  const [ref, inView] = useReveal(0.12)
  return (
    <section id={id} ref={ref} className={`section ${className} ${inView ? 'in' : ''}`}>
      {label && <div className="mono label">{label}</div>}
      {children}
    </section>
  )
}

const STATS = [
  { n: '15+', l: 'Years in biometrics', note: 'earlyphase.com/about' },
  { n: '5', l: 'Service lines', note: 'earlyphase.com/services' },
  { n: '—', l: 'Studies supported', note: 'placeholder' },
  { n: '—', l: 'Regulatory submissions', note: 'placeholder' },
]

const PILLARS = [
  { t: 'Precise', d: 'Analyses designed to withstand regulatory scrutiny.', G: ForestPlot, cap: 'Forest plot · HR with 95% CI' },
  { t: 'Agile', d: 'Senior-led teams that scale to your study timelines.', G: Timeline, cap: 'Timeline · scales to the schedule' },
  { t: 'Reliable', d: 'Clear communication. Clean deliverables. No surprises.', G: Checklist, cap: 'QC · validates line by line' },
]

const CODE = {
  SAS: {
    file: 'adsl.sas',
    body: `/* ADSL flags and age group (example) */
data adam.adsl;
  merge sdtm.dm(in=a) sdtm.ex_first(in=b);
  by usubjid;
  if a;
  length agegr1 $8;
  if      age < 65 then agegr1 = '<65';
  else if age >= 65 then agegr1 = '>=65';
  saffl = ifc(b, 'Y', 'N');
  ittfl = ifc(not missing(randdt), 'Y', 'N');
  trtsdt = input(exstdtc, e8601da.);
  format trtsdt date9.;
run;`,
  },
  R: {
    file: 'km_os.R',
    body: `# Kaplan-Meier for overall survival (example)
library(survival)

adtte <- haven::read_sas("adtte.sas7bdat") |>
  dplyr::filter(PARAMCD == "OS", ITTFL == "Y")

fit <- survfit(Surv(AVAL, 1 - CNSR) ~ TRT01P, data = adtte)
summary(fit, times = c(6, 12, 24))$surv

cox <- coxph(Surv(AVAL, 1 - CNSR) ~ TRT01P, data = adtte)
exp(cbind(HR = coef(cox), confint(cox)))`,
  },
  'Define-XML': {
    file: 'define.xml',
    body: `<ItemGroupDef OID="IG.ADSL" Name="ADSL" Repeating="No"
    SASDatasetName="ADSL" def:Structure="One record per subject"
    def:Class="SUBJECT LEVEL ANALYSIS DATASET">
  <ItemRef ItemOID="IT.ADSL.USUBJID" Mandatory="Yes" KeySequence="1"/>
  <ItemRef ItemOID="IT.ADSL.AGEGR1"  Mandatory="No"
           MethodOID="MT.ADSL.AGEGR1"/>
  <ItemRef ItemOID="IT.ADSL.SAFFL"   Mandatory="Yes"/>
</ItemGroupDef>
<MethodDef OID="MT.ADSL.AGEGR1" Name="Algorithm for AGEGR1"
    Type="Computation">
  <Description><TranslatedText xml:lang="en">
    '<65' if AGE < 65, else '>=65'</TranslatedText></Description>
</MethodDef>`,
  },
  TLF: {
    file: 't_14_2_1.rtf',
    body: `Table 14.2.1  Summary of Overall Survival
Full Analysis Set                                    (EXAMPLE SHELL)
-------------------------------------------------------------------
                               Placebo            Active
                               (N=xx)             (N=xx)
-------------------------------------------------------------------
Events, n (%)                  xx (xx.x)          xx (xx.x)
Censored, n (%)                xx (xx.x)          xx (xx.x)
Median OS, months (95% CI)     xx.x (xx.x, xx.x)  xx.x (xx.x, xx.x)
Hazard ratio (95% CI) [a]                         x.xx (x.xx, x.xx)
Log-rank p-value                                  x.xxxx
-------------------------------------------------------------------
[a] Cox proportional hazards model stratified by randomization factors.`,
  },
}

const FLOW = [
  { k: 'Raw data', s: 'EDC · labs · ePRO' },
  { k: 'SDTM', s: 'Tabulation' },
  { k: 'ADaM', s: 'Analysis-ready' },
  { k: 'TFLs', s: 'Tables · figures · listings' },
  { k: 'Submission', s: 'Define-XML · reviewer guides' },
]

const KNOWN = [
  'Putting studies back on schedule',
  'Handling complex or high-risk analyses',
  'Assisting lean teams needing senior expertise',
  'Aligning with your preferred timelines and milestones',
  'Calmly preparing for approaching submission timelines',
]

const STEPS = [
  { t: 'Align', d: 'Scope, timelines, deliverables, and success criteria.' },
  { t: 'Execute', d: 'Hands-on senior statisticians and programmers throughout.' },
  { t: 'Deliver', d: 'Submission-ready outputs, clearly documented and on time.' },
]

function CodePanel() {
  const tabs = Object.keys(CODE)
  const [tab, setTab] = useState(tabs[0])
  return (
    <div className="code">
      <div className="code-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
        <span className="code-file mono">{CODE[tab].file}</span>
      </div>
      <pre className="code-body" role="tabpanel"><code>{CODE[tab].body}</code></pre>
    </div>
  )
}

function Flow() {
  const [ref, inView] = useReveal(0.4)
  return (
    <div ref={ref} className={`flow ${inView ? 'lit' : ''}`}>
      {FLOW.map((f, i) => (
        <div key={f.k} className="flow-node" style={{ '--i': i }}>
          <div className="flow-dot" />
          <div className="flow-k">{f.k}</div>
          <div className="mono flow-s">{f.s}</div>
          {i < FLOW.length - 1 && <div className="flow-line"><span /></div>}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <>
      <header className={`nav ${scrolled ? 'nav-solid' : ''}`}>
        <a href="#top" className="wordmark">EarlyPhase</a>
        <nav className="nav-links">
          <a href="#approach">Approach</a>
          <a href="#deliverables">Deliverables</a>
          <a href="#known">Known for</a>
          <a href={SITE} className="nav-cta">Request a consult</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <HeroCanvas />
          <div className="hero-inner">
            <div className="mono label">Biometrics CRO · Biostatistics · Statistical programming · Data curation</div>
            <h1>Precision biometrics.<br />Delivered fast.</h1>
            <p className="lede">EarlyPhase provides expert data curation, biostatistics, and statistical programming so sponsors can move forward with confidence—without delays, rework, or surprises.</p>
            <div className="hero-actions">
              <a className="btn" href={SITE}>Request a consult</a>
              <a className="btn ghost" href="#approach">How we work ↓</a>
            </div>
          </div>
          <div className="mono hero-foot">Background: Kaplan-Meier curves drawn from example data</div>
        </section>

        <Section className="stats" label="EarlyPhase in numbers">
          <div className="stat-grid">
            {STATS.map((s) => (
              <div key={s.l} className={`stat ${s.note === 'placeholder' ? 'ph' : ''}`}>
                <div className="stat-n">{s.n}</div>
                <div className="mono stat-l">{s.l}</div>
                <div className="mono stat-note">{s.note === 'placeholder' ? 'Placeholder · figure to come' : `Source: ${s.note}`}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="approach" label="01 · What sponsors get">
          <h2>When sponsors need biometrics done right—and fast.</h2>
          <div className="pillars">
            {PILLARS.map(({ t, d, G, cap }) => (
              <article key={t} className="pillar">
                <div className="pillar-g"><G /></div>
                <div className="mono pillar-cap">{cap}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section id="deliverables" label="02 · Deliverables">
          <div className="split">
            <div>
              <h2>One sponsor.<br />Every deliverable.</h2>
              <p className="muted">SAS and R programming, CDISC datasets, Define-XML and submission-ready tables, figures and listings, from senior people who write the code themselves.</p>
              <p className="mono tiny">Snippets are illustrative examples, not client work.</p>
            </div>
            <CodePanel />
          </div>
        </Section>

        <Section label="03 · Data flow">
          <h2>From raw data to submission.</h2>
          <Flow />
        </Section>

        <Section id="known" label="04 · We're known for" className="known">
          <ol className="known-list">
            {KNOWN.map((k, i) => (
              <li key={k} style={{ '--i': i }}><span className="mono">{String(i + 1).padStart(2, '0')}</span>{k}</li>
            ))}
          </ol>
        </Section>

        <Section label="05 · The work, visualized">
          <div className="gallery">
            <figure><Waterfall /><figcaption className="mono">Waterfall · best % change</figcaption></figure>
            <figure><GSBoundary /><figcaption className="mono">Group-sequential boundaries</figcaption></figure>
            <figure><TflShell /><figcaption className="mono">TFL shell · Table 14.2.1</figcaption></figure>
          </div>
          <p className="mono tiny">All graphics use made-up example data.</p>
        </Section>

        <Section label="06 · Our approach">
          <h2>We align quickly, execute efficiently, and deliver work you can rely on.</h2>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={s.t} className="step" style={{ '--i': i }}>
                <div className="mono step-n">0{i + 1}</div>
                <div className="step-bar" />
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </Section>

        <section className="cta">
          <h2>Have trial data that needs accurate, fast analyses?</h2>
          <a className="btn" href={SITE}>Start a conversation →</a>
        </section>
      </main>

      <footer className="foot">
        <span className="wordmark">EarlyPhase</span>
        <span className="mono">Design demo only · example data · not the live site. Copy from <a href={SITE}>earlyphase.com</a>.</span>
      </footer>
    </>
  )
}
