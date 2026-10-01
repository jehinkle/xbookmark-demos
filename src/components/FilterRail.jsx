import { useState } from 'react'
import {
  AGE_BOUNDS, BMI_BANDS, DAYS_BOUNDS, DEVIATION_LEVELS, DISPOSITION_GROUPS, ECOGS, ETHNICITIES, RACES, SAFETY_FLAGS, SEXES, SITES, STATUSES, SUBJECTS,
} from '../lib/data.js'
import { ARM_TABS, facetCounts, matches } from '../lib/filters.js'
import RangeSlider from './RangeSlider.jsx'
import { IconChevron } from './Icons.jsx'

function Section({ title, children, defaultOpen = true, count, id }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`rail-section ${open ? 'open' : ''}`} id={id}>
      <button className="rail-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>
          {title}
          {count ? <span className="rail-count">{count}</span> : null}
        </span>
        <IconChevron dir={open ? 'up' : 'down'} />
      </button>
      {open && <div className="rail-body">{children}</div>}
    </section>
  )
}

function CheckList({ options, selected, counts, onToggle, render }) {
  return (
    <ul className="check-list">
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const n = counts[value] || 0
        const checked = selected.includes(value)
        return (
          <li key={value}>
            <label className={`check ${!n && !checked ? 'zero' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(value)} />
              <span className="box" aria-hidden="true" />
              <span className="check-label">{render ? render(opt) : label}</span>
              <span className="check-n">{n}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

export default function FilterRail({ filters, setFilters }) {
  const [showAllSites, setShowAllSites] = useState(false)
  const toggle = (key) => (v) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }))
  const counts = (key) => facetCounts(SUBJECTS, filters, key)
  const armCounts = Object.fromEntries(
    ARM_TABS.map((t) => [t.key, SUBJECTS.filter((s) => matches(s, { ...filters, arm: t.key }, null)).length]),
  )
  const sites = SITES.map((s) => ({ value: s.code, label: s.name, site: s }))
  const visibleSites = showAllSites ? sites : sites.slice(0, 4)
  const n = (key) => filters[key].length

  return (
    <div className="rail-sections">
      <Section title="Study arm" count={filters.arm !== 'All' ? 1 : 0}>
        <div className="segmented" role="tablist" aria-label="Study arm">
          {ARM_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={filters.arm === t.key}
              className={filters.arm === t.key ? 'active' : ''}
              onClick={() => setFilters((f) => ({ ...f, arm: t.key }))}
            >
              {t.label}
              <small>{armCounts[t.key]}</small>
            </button>
          ))}
        </div>
        <p className="rail-hint">Arm view is unblinded mock data for demo purposes.</p>
      </Section>

      <Section title="Age" count={filters.age[0] !== AGE_BOUNDS[0] || filters.age[1] !== AGE_BOUNDS[1] ? 1 : 0}>
        <RangeSlider label="Age" min={AGE_BOUNDS[0]} max={AGE_BOUNDS[1]} value={filters.age} onChange={(age) => setFilters((f) => ({ ...f, age }))} unit=" y" />
      </Section>

      <Section title="Sex" count={n('sex')}>
        <CheckList options={SEXES} selected={filters.sex} counts={counts('sex')} onToggle={toggle('sex')} />
      </Section>

      <Section title="Race / ethnicity" count={n('race') + n('ethnicity')}>
        <h4 className="rail-sub">Race</h4>
        <CheckList options={RACES} selected={filters.race} counts={counts('race')} onToggle={toggle('race')} />
        <h4 className="rail-sub">Ethnicity</h4>
        <CheckList options={ETHNICITIES} selected={filters.ethnicity} counts={counts('ethnicity')} onToggle={toggle('ethnicity')} />
      </Section>

      <Section title="Site" count={n('site')} id="filter-site">
        <CheckList
          options={visibleSites}
          selected={filters.site}
          counts={counts('site')}
          onToggle={toggle('site')}
          render={(o) => (
            <>
              <span className="site-code">{o.site.code}</span> {o.site.name}
              <span className="site-city">{o.site.city}</span>
            </>
          )}
        />
        <button className="link-btn" onClick={() => setShowAllSites((v) => !v)}>
          {showAllSites ? 'View fewer sites' : `View more sites (${sites.length - 4})`}
        </button>
      </Section>

      <Section title="Study status" count={n('status')}>
        <CheckList options={STATUSES} selected={filters.status} counts={counts('status')} onToggle={toggle('status')} />
      </Section>

      <Section title="Days on study" count={filters.days[0] !== DAYS_BOUNDS[0] || filters.days[1] !== DAYS_BOUNDS[1] ? 1 : 0}>
        <RangeSlider label="Days on study" min={DAYS_BOUNDS[0]} max={DAYS_BOUNDS[1]} value={filters.days} onChange={(days) => setFilters((f) => ({ ...f, days }))} unit=" d" />
      </Section>

      <Section title="Disposition" count={n('disposition')} defaultOpen={false}>
        {DISPOSITION_GROUPS.map((g) => (
          <div key={g.group} className="rail-group">
            <h4 className="rail-sub">{g.group}</h4>
            <CheckList options={g.options} selected={filters.disposition} counts={counts('disposition')} onToggle={toggle('disposition')} />
          </div>
        ))}
      </Section>

      <Section title="Safety flags" count={n('safety')}>
        <div className="swatch-grid">
          {SAFETY_FLAGS.map((f) => {
            const c = counts('safety')[f.key] || 0
            const checked = filters.safety.includes(f.key)
            return (
              <label key={f.key} className={`swatch-opt ${checked ? 'checked' : ''}`} style={{ '--c': f.color }}>
                <input type="checkbox" checked={checked} onChange={() => toggle('safety')(f.key)} />
                <span className="swatch-dot" aria-hidden="true" />
                <span className="swatch-label">{f.label}</span>
                <span className="check-n">{c}</span>
              </label>
            )
          })}
        </div>
      </Section>

      <Section title="Protocol deviations" count={n('deviation')} defaultOpen={false}>
        <CheckList options={DEVIATION_LEVELS} selected={filters.deviation} counts={counts('deviation')} onToggle={toggle('deviation')} />
      </Section>

      <Section title="Baseline ECOG" count={n('ecog')} defaultOpen={false}>
        <CheckList options={ECOGS.map((e) => ({ value: e, label: `ECOG ${e}` }))} selected={filters.ecog} counts={counts('ecog')} onToggle={toggle('ecog')} />
      </Section>

      <Section title="Baseline BMI band" count={n('bmi')} defaultOpen={false}>
        <CheckList options={BMI_BANDS} selected={filters.bmi} counts={counts('bmi')} onToggle={toggle('bmi')} />
      </Section>
    </div>
  )
}
