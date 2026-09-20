import { usePlatformCatalog } from '../lib/platform-catalog'
import ServiceIllustration from './ServiceIllustration'
import { useInsights } from '../lib/insights'
import '../insights-admin.css'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode, FormEvent } from 'react'
import { serviceOfferings, leadership, offices } from '../lib/profile'
import { capabilities, industries, questions, readiness, automationValue, downloadText, enquiry } from '../lib/experience'

export function Modal({ title, children, close, label = 'I-GENEXT / PERSPECTIVES & TOOLS' }: { title: string; children: ReactNode; close: () => void; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close(); document.body.style.overflow = oldOverflow; previous?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="experience-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close() }} onClick={e => { if (e.target === e.currentTarget) close() }}>
    <div className="dialog-heading"><span className="label">{label}</span><button className="icon-button" onClick={close} aria-label="Close dialog">×</button></div>
    <h2 id="dialog-title">{title}</h2>{children}
  </dialog>
}

export function SiteSearch() {
  const { items: platformItems } = usePlatformCatalog()
  const { articles } = useInsights()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    const listener = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(x => !x) } }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
  const entries = [
    ...leadership.map(x => ({ title: x.name, text: x.role + ' ' + x.bio, kind: 'Leadership', href: '#leadership' })),
    ...offices.map((x, i) => ({ title: x.city + ' office', text: x.address, kind: 'Location', href: '#office-' + i })),
    ...platformItems.map(p => ({ title: p.name, text: p.category + ' ' + p.description + ' ' + p.features.join(' '), kind: 'Platform solution', href: '#' + p.anchor })),
    { title: 'One group, two engines', text: 'I-Genext Tvat AI vision mission values', kind: 'Our group', href: '#group' },
    ...capabilities.map(x => ({ title: x.title, text: x.summary + ' ' + x.tech + ' ' + (serviceOfferings[x.id] || []).join(' '), kind: 'Capability', href: '#capability-' + x.id })),
    ...industries.map(x => ({ title: x.title, text: x.useCase, kind: 'Industry', href: '#industry-' + x.capability + '-' + industries.indexOf(x) })),
    ...articles.map(x => ({ title: x.title, text: x.summary + ' ' + x.topic, kind: 'Insight', href: '#insight/' + x.slug })),
    { title: 'AI readiness assessment', text: 'Digital maturity diagnostic roadmap', kind: 'Interactive tool', href: '#readiness' },
    { title: 'Automation value calculator', text: 'ROI savings payback capacity', kind: 'Interactive tool', href: '#value-calculator' },
    { title: 'Careers at I-Genext', text: 'Jobs talent team opportunities', kind: 'Company', href: '#careers' }
  ]
  const results = entries.filter(x => (x.title + ' ' + x.text).toLowerCase().includes(query.trim().toLowerCase()))
  return <><button className="search-trigger" onClick={() => setOpen(true)} aria-label="Search the site"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.8"/></svg><span>Search</span></button>
    {open && <Modal title="Find your next move." close={() => setOpen(false)}><label className="field">Search capabilities, industries and insights<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Try AI, finance or manufacturing" type="search"/></label>
      <p className="muted" aria-live="polite">{results.length} results · Ctrl / ⌘ K to open search</p>
      <div className="search-results">{results.map(x => <a key={x.title} href={x.href} onClick={() => setOpen(false)}><small>{x.kind}</small><strong>{x.title}</strong><span>↗</span></a>)}</div>
      {!results.length && <p>No matches. Try a broader term such as “data” or “risk”.</p>}
    </Modal>}
  </>
}

export function CapabilityExplorer() {
  const [active, setActive] = useState(() => Math.max(0, capabilities.findIndex(c => window.location.hash === '#capability-' + c.id)))
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const explorer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const resize = () => setCompact(media.matches)
    media.addEventListener('change', resize)
    let frame = 0
    const update = () => {
      const index = capabilities.findIndex(c => window.location.hash === '#capability-' + c.id)
      if (index < 0) return
      setActive(index)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => explorer.current?.scrollIntoView({ block: 'start' }))
    }
    update()
    window.addEventListener('hashchange', update)
    window.addEventListener('popstate', update)
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', resize); window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update) }
  }, [])
  const select = (index: number) => {
    setActive(index)
    window.history.replaceState(window.history.state, '', '#capability-' + capabilities[index].id)
  }
  return <section className="section capabilities-v2" id="services"><div className="container-wide">
    <div className="section-heading-row"><div><div className="eyebrow dark"><span/> What we do</div><h2>Consulting depth.<br/><em>Technology in every layer.</em></h2></div><p>Choose your focus. Explore the expertise, technology and practical steps that move your business forward.</p></div>
    <div className="service-explorer" ref={explorer}>
      <aside className="service-navigation">
        <div className="service-navigation-heading"><span className="label">Explore our expertise</span><span>{String(capabilities.length).padStart(2, '0')} services</span></div>
        {compact ? <label className="service-picker">Choose a service<select value={active} onChange={e => select(Number(e.target.value))}>{capabilities.map((c, i) => <option value={i} key={c.id}>{c.title}</option>)}</select></label> :
          <div className="service-tabs" role="tablist" aria-label="Consulting services" aria-orientation="vertical">{capabilities.map((c, i) => <button type="button" role="tab" id={'service-tab-' + c.id} aria-selected={i === active} aria-controls={'capability-' + c.id} tabIndex={i === active ? 0 : -1} ref={element => { tabs.current[i] = element }} key={c.id} onClick={() => select(i)} onKeyDown={event => {
            let next = i
            if (event.key === 'ArrowDown') next = (i + 1) % capabilities.length
            else if (event.key === 'ArrowUp') next = (i - 1 + capabilities.length) % capabilities.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = capabilities.length - 1
            else return
            event.preventDefault(); select(next); tabs.current[next]?.focus({ preventScroll: true })
          }}><span className="service-tab-number">{String(i + 1).padStart(2, '0')}</span><span>{c.title}</span><span className="service-tab-arrow" aria-hidden="true">&#8599;</span></button>)}</div>}
        <p className="service-navigation-note">Business expertise.<br/>Technology woven in.<br/>Execution that stays with you.</p>
      </aside>
      <div className="service-pages">{capabilities.map((c, i) => <article className="service-page" id={'capability-' + c.id} key={c.id} role={compact ? 'region' : 'tabpanel'} aria-labelledby={(compact ? 'service-title-' : 'service-tab-') + c.id} tabIndex={0} hidden={i !== active}>
        <div className="service-page-topline"><span className="label">I-Genext / Our expertise</span><span>{String(i + 1).padStart(2, '0')} <span aria-hidden="true">/</span> {String(capabilities.length).padStart(2, '0')}</span></div>
        <div className="service-intro-flow"><header className="service-page-heading"><h3 id={'service-title-' + c.id}>{c.title}</h3><p>{c.summary}</p></header><ServiceIllustration service={c.id} /></div>
        <div className="service-tech-band"><span className="service-tech-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M9 9h14v14H9zM12 3v6m8-6v6M12 23v6m8-6v6M3 12h6m-6 8h6m14-8h6m-6 8h6"/><path d="m17 12-4 5h5l-3 4"/></svg></span><div><h4>Technology in practice</h4><ul>{c.tech.split(' · ').map(tech => <li key={tech}>{tech}</li>)}</ul></div></div>
        <div className="service-scope"><h4>{c.id === 'ai' ? 'Digitization & automation' : 'How we can help'}</h4><ul>{(serviceOfferings[c.id] || []).map(item => <li key={item}><span aria-hidden="true">&#8599;</span>{item}</li>)}</ul></div>
        <div className="service-delivery"><h4>From assessment to execution</h4><div className="service-journey"><svg className="service-journey-path" viewBox="0 0 600 80" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M25 40C120-10 190 90 300 40S480-10 575 40" stroke="currentColor" strokeWidth="1.5"/><path d="M25 40C120-10 190 90 300 40S480-10 575 40" stroke="#8eeaff" strokeWidth="2" strokeDasharray="3 23"/></svg><ol>{c.steps.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span><p>{step}</p></li>)}</ol></div></div>
        <footer className="service-result"><div><h4>What you leave with</h4><p>{c.outcome}</p></div><button type="button" className="btn btn-primary" onClick={() => enquiry(c.title)}>Let's discuss your needs <span aria-hidden="true">&#8599;</span></button></footer>
      </article>)}</div>
    </div>
  </div></section>
}
export function IndustryExplorer() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const update = () => { const index = industries.findIndex((x, i) => window.location.hash === '#industry-' + x.capability + '-' + i); if (index >= 0) { setActive(index); document.getElementById('industries')?.scrollIntoView() } }
    update(); window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const item = industries[active]
  return <section className="industry-explorer section" id="industries"><div className="container-wide">
    <div className="eyebrow light"><span/> Your industry. Understood.</div><h2>Same ambition.<br/>Different operating realities.</h2>
    <div className="industry-layout"><div className="industry-selector" aria-label="Choose an industry">{industries.map((x, i) => <button key={x.title} aria-pressed={i === active} onClick={() => setActive(i)}>{x.title}<span>↗</span></button>)}</div>
    <div className="industry-detail" aria-live="polite"><span className="label">Illustrative engagement / {item.title}</span><h3>{item.challenge}</h3><p>{item.useCase}</p><div className="industry-facts"><div><small>Technology in action</small><p>{item.tech}</p></div><div><small>Measures to establish</small><p>{item.measures}</p></div></div><button className="btn btn-primary btn-large" onClick={() => enquiry(capabilities.find(c => c.id === item.capability)!.title, 'I would like to discuss ' + item.title.toLowerCase() + ': ' + item.challenge)}>Explore the possibilities ↗</button></div></div>
  </div></section>
}

export function ReadinessAssessment() {
  const [answers, setAnswers] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [finished, setFinished] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const q = questions[step]
  const result = finished ? readiness(answers) : null
  function changeStep(next: number) { setStep(next); requestAnimationFrame(() => heading.current?.focus()) }
  const report = result ? 'I-Genext | AI readiness self-assessment\n\n' + result.stage + ' — ' + result.score + '/100\n\n' + questions.map((x, i) => x.title + ': ' + x.options[answers[i]]).join('\n') + '\n\nSuggested priorities\n' + (result.priorities.length ? result.priorities : ['Review evaluation quality, operating costs and governance as you scale.']).join('\n') + '\n\nDirectional self-assessment, not a validated benchmark. Five equally weighted dimensions scored 0–3, normalised to 100.' : ''
  return <section className="section readiness-section" id="readiness"><div className="container-wide readiness-layout">
    <div><div className="eyebrow dark"><span/> Find your starting point</div><h2>How ready is your business for AI?</h2><p className="large-copy">Five questions. A clearer next step.</p><p className="muted">Explore your foundations across strategy, data, processes, people and governance. Get a personalised starting roadmap without sharing your email.</p><div className="assessment-note"><span>01—05</span><p>Practical guidance<br/><small>Private to this session · No sign-up</small></p></div></div>
    <div className="assessment-card">{!result ? <><div className="card-topline"><span className="label">AI readiness check</span><span>0{step + 1} / 05</span></div><progress aria-label="Assessment progress" value={step + 1} max={5}/><span className="label">{q.title}</span><h3 ref={heading} tabIndex={-1}>{q.question}</h3><fieldset className="assessment-options"><legend className="sr-only">{q.question}</legend>{q.options.map((option, i) => <label key={option} className={answers[step] === i ? 'selected' : ''}><input type="radio" name={'question-' + step} checked={answers[step] === i} onChange={() => setAnswers(old => { const next = [...old]; next[step] = i; return next })}/><span>{option}</span></label>)}</fieldset><div className="assessment-controls"><button className="text-action" disabled={step === 0} onClick={() => changeStep(step - 1)}>← Back</button><button className="btn btn-primary btn-large" disabled={answers[step] === undefined} onClick={() => step === 4 ? setFinished(true) : changeStep(step + 1)}>{step === 4 ? 'See my roadmap' : 'Continue'} →</button></div></> :
      <div aria-live="polite"><span className="label">Your starting point</span><div className="readiness-score">{result.score}<small>/100</small></div><h3>{result.stage}</h3><ul className="roadmap-list">{(result.priorities.length ? result.priorities : ['Review evaluation quality, operating costs and governance as you scale.']).map(x => <li key={x}>{x}</li>)}</ul><p className="muted small">Directional guidance, not an industry benchmark. Five equally weighted dimensions, scored 0–3 and normalised to 100.</p><div className="button-row"><button className="btn btn-primary btn-large" onClick={() => enquiry('AI, Data & Automation', report)}>Discuss my roadmap ↗</button><button className="text-action" onClick={() => downloadText('igenext-ai-readiness.txt', report)}>Download roadmap ↓</button><button className="text-action" onClick={() => { setFinished(false); setAnswers([]); changeStep(0) }}>Start again</button></div></div>}
    </div></div></section>
}

export function ValueCalculator() {
  const [values, setValues] = useState(['400', '1200', '50', '75', '600000', '15000'])
  const labels = ['Monthly manual work (hours)', 'Blended hourly cost (INR)', 'Work eligible for automation (%)', 'Expected adoption (%)', 'One-time implementation cost (INR)', 'Monthly running cost (INR)']
  const numbers = values.map(Number)
  const valid = values.every(x => x.trim() !== '') && numbers.every(n => Number.isFinite(n) && n >= 0 && n <= 1e10) && numbers[2] <= 100 && numbers[3] <= 100
  const r = valid ? automationValue(numbers[0], numbers[1], numbers[2], numbers[3], numbers[4], numbers[5]) : null
  const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  const report = r ? 'I-Genext automation scenario\n\n' + labels.map((label, i) => label + ': ' + values[i]).join('\n') + '\n\nMonthly hours released: ' + r.released.toFixed(1) + '\nAnnual capacity value: ' + money(r.annual) + '\nAnnual value after running costs: ' + money(r.net) + '\nIndicative payback: ' + (r.payback === null ? 'Not reached' : r.payback.toFixed(1) + ' months') + '\n\nScenario estimate, not guaranteed cash savings. Capacity value assumes released hours are productively redeployed. Excludes tax, financing, ramp-up and changes in demand.' : ''
  return <section className="section value-section" id="value-calculator"><div className="container-wide"><div className="section-heading-row"><div><div className="eyebrow dark"><span/> Make the business case</div><h2>What could automation unlock?</h2></div><p>Move the conversation from possibility to assumptions you can challenge. Explore the potential value of time released.</p></div><div className="value-layout"><div className="calculator-fields">{labels.map((label, i) => <label className="field" key={label}>{label}<input type="number" min="0" max={i === 2 || i === 3 ? 100 : 1e10} step="any" value={values[i]} onChange={e => setValues(old => old.map((v, j) => i === j ? e.target.value : v))}/></label>)}</div><div className="value-results" aria-live="polite">{r ? <><span className="label">Your illustrative scenario</span><strong className="value-number">{money(r.annual)}</strong><p>annual capacity value before costs</p><div className="value-metrics"><div><strong>{r.released.toFixed(1)} h</strong><small>released per month</small></div><div><strong>{r.payback === null ? 'Not reached' : r.payback.toFixed(1) + ' mo'}</strong><small>indicative payback</small></div></div><p>Annual value after running costs: <b>{money(r.net)}</b></p><button className="text-action" onClick={() => downloadText('igenext-automation-scenario.txt', report)}>Download this scenario ↓</button></> : <p role="alert">Enter non-negative values in every field. Percentages must be between 0 and 100.</p>}</div></div><details className="calculation-notes"><summary>How the estimate works</summary><p>Hours released = monthly hours × eligible automation × adoption. Annual capacity value = released hours × hourly cost × 12. Payback = implementation cost ÷ monthly value after running costs; it is not reached when that monthly value is zero or negative.</p><p>This is a scenario, not guaranteed cash savings. It assumes released capacity is productively redeployed and excludes tax, financing, ramp-up and changes in demand.</p></details></div></section>
}

export function InsightLibrary() {
  const { articles,loading,error,reload } = useInsights()
  const [topic, setTopic] = useState('All perspectives')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<string[]>(() => { try { const v: unknown = JSON.parse(localStorage.getItem('igenext-reading-list') || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } })
  const [onlySaved, setOnlySaved] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState('')
  useEffect(() => { const update = () => { setCurrent(window.location.hash.startsWith('#insight/') ? window.location.hash.slice(9) : null); setShareStatus('') }; update(); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update) }, [])
  function toggle(slug: string) { const next = saved.includes(slug) ? saved.filter(x => x !== slug) : [...saved, slug]; setSaved(next); try { localStorage.setItem('igenext-reading-list', JSON.stringify(next)); setStorageError(false) } catch { setStorageError(true) } }
  const article = articles.find(x => x.slug === current)
  const filtered = articles.filter(x => (topic === 'All perspectives' || x.topic === topic) && (!onlySaved || saved.includes(x.slug)) && (x.title + ' ' + x.summary).toLowerCase().includes(query.toLowerCase()))
  return <section className="insights section" id="insights"><div className="container-wide"><div className="section-heading-row"><div><div className="eyebrow dark"><span/> The next perspective</div><h2>Ideas to put to work.</h2></div><p>Practical perspectives on technology, transformation and the decisions that connect them.</p></div><div className="insight-toolbar"><div className="filter-buttons" aria-label="Filter insights">{['All perspectives', ...Array.from(new Set(articles.map(x=>x.topic)))].map(x => <button aria-pressed={topic === x} key={x} onClick={() => setTopic(x)}>{x}</button>)}</div><label className="insight-search"><span className="sr-only">Search insights</span><input type="search" placeholder="Search perspectives…" value={query} onChange={e => setQuery(e.target.value)}/></label></div><div className="reading-toolbar"><span aria-live="polite">{filtered.length} perspectives</span><button className="text-action" aria-pressed={onlySaved} onClick={() => setOnlySaved(x => !x)}>{onlySaved ? 'Show all' : 'My reading list'} ({saved.length})</button></div>{storageError && <p role="status">Your reading list is available this session; browser storage is unavailable.</p>}
    {loading && <p role="status">Loading perspectives...</p>}
    {error && <p role="alert" className="insight-service-error">{error} <button className="text-action" onClick={reload}>Try again</button></p>}
    <div className="insight-grid">{filtered.map((x, i) => <article className={'insight-card insight-card-' + (i % 3 + 1)} key={x.slug}><a className="insight-art-link" href={'#insight/' + x.slug} aria-label={'Read ' + x.title}><div className="insight-art">{x.imageUrl?<img className="insight-cover" src={x.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<><span>FIELDNOTES / 0{articles.indexOf(x) + 1}</span><i/><i/></>}</div></a><div className="insight-meta"><span>{x.topic}</span><span>{x.readMinutes} min read</span></div><h3><a href={'#insight/' + x.slug}>{x.title}</a></h3><p>{x.summary}</p><div className="insight-actions"><a href={'#insight/' + x.slug}>Read perspective ↗</a><button className="text-action" aria-pressed={saved.includes(x.slug)} aria-label={(saved.includes(x.slug) ? 'Unsave ' : 'Save ') + x.title} onClick={() => toggle(x.slug)}>{saved.includes(x.slug) ? 'Saved ✓' : 'Save +'}</button></div></article>)}</div>
    {!loading && !error && !filtered.length && <div className="empty-state"><h3>No perspectives found.</h3><p>Try another topic or add a perspective to your reading list.</p><button className="text-action" onClick={() => { setTopic('All perspectives'); setQuery(''); setOnlySaved(false) }}>Reset filters →</button></div>}
    {current && <Modal title={article?.title || (loading?'Loading perspective...':'Perspective not found')} close={() => { window.location.hash = 'insights' }}>{article ? <><p className="label">{article.topic} · {article.author} · {article.readMinutes} min read</p><p className="large-copy">{article.summary}</p><div className="article-body">{article.imageUrl&&<img className="insight-image-full" src={article.imageUrl} alt="" referrerPolicy="no-referrer"/>}{article.body.map(([title, body],index) => <section key={index}>{title&&<h3>{title}</h3>}<p>{body}</p></section>)}</div><div className="button-row"><button className="text-action" onClick={() => toggle(article.slug)}>{saved.includes(article.slug) ? 'Remove from reading list' : 'Save to reading list +'}</button><button className="text-action" onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin+'/insights/'+article.slug); setShareStatus('Link copied.') } catch { setShareStatus('Copy the link from your browser address bar.') } }}>Copy link ↗</button><button className="text-action" onClick={() => { window.location.hash = 'insights'; setCurrent(null); enquiry('AI, Data & Automation', 'I would like to discuss: ' + article.title) }}>Discuss this perspective →</button></div><p role="status">{shareStatus}</p></> : <p>{loading?'Loading the published perspective...':'This link does not match a published perspective.'} Close this window to explore the library.</p>}</Modal>}
  </div></section>
}

export function ContactForm() {
  const [area, setArea] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<{ kind: string; text: string }>({ kind: '', text: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { const listener = (event: Event) => { const d = (event as CustomEvent<{ area: string; message: string }>).detail; setArea(d.area); setMessage(d.message); setStatus({ kind: '', text: '' }) }; window.addEventListener('igenext:enquiry', listener); return () => window.removeEventListener('igenext:enquiry', listener) }, [])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const form = e.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    setBusy(true); setStatus({ kind: '', text: '' })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.message || 'We could not save your enquiry. Please try again.')
      setStatus({ kind: 'success', text: 'Your enquiry has been saved. Reference: ' + data.reference + '.' })
      form.reset(); setArea(''); setMessage('')
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error && error.name !== 'SyntaxError' && error.name !== 'AbortError' && error.message !== 'Failed to fetch' ? error.message : 'Unable to reach our enquiry service. Your details are still here; please try again shortly.' })
    } finally { clearTimeout(timer); setBusy(false) }
  }
  return <form className="contact-form" onSubmit={submit}>
    <label><span>Name</span><input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={160} placeholder="Your name"/></label>
    <label><span>Work email</span><input name="email" type="email" autoComplete="email" required maxLength={255} placeholder="you@company.com"/></label>
    <label><span>Company</span><input name="company" autoComplete="organization" required minLength={2} maxLength={180} placeholder="Company name"/></label>
    <label><span>Designation</span><input name="designation" autoComplete="organization-title" required minLength={2} maxLength={160} placeholder="Your role or designation"/></label>
    <label><span>Mobile number</span><input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={40} placeholder="+91 98765 43210"/></label>
    <label><span>Area of interest</span><select name="area" value={area} onChange={e => setArea(e.target.value)} required><option value="" disabled>Select an area</option>{[...capabilities.map(x => x.title), 'Technology Enablement', 'Careers'].map(x => <option key={x}>{x}</option>)}</select></label>
    <label className="full"><span>How can we help?</span><textarea name="message" rows={5} required minLength={10} maxLength={6000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us about your challenge and the outcome you want."/></label>
    <div className="spam-field" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    <label className="full consent"><input name="consent" type="checkbox" required value="yes"/><span>I agree to my details being used to respond to this enquiry. <a href="#privacy">How we use your information</a></span></label>
    <button className="btn btn-primary btn-large full" type="submit" disabled={busy}>{busy ? 'Saving your enquiry…' : 'Start a conversation ↗'}</button>
    {status.text && <p className={'full form-feedback ' + status.kind} role={status.kind === 'error' ? 'alert' : 'status'}>{status.text}</p>}
  </form>
}

export function PrivacyNotice() {
  return <section className="privacy-section" id="privacy"><div className="container-wide"><details><summary>Privacy & your information</summary><p>When you submit an enquiry, I-Genext stores the name, email, mobile number, designation, company, area of interest and message you provide to handle your request and send an acknowledgement email. Please do not include confidential client information or sensitive personal data.</p><p>When you apply for a role, we store your name, contact details, current employment, location, address, salary expectations and resume for recruitment. Our recruitment team receives your application and resume by email, and authorised administrators can review them. We send an acknowledgement with an application reference ID. For access, correction or deletion requests relating to recruitment, email careers@i-genext.com and include your reference ID.</p><p>Your readiness answers and calculator inputs stay in the current browser session unless you choose to include your roadmap in an enquiry. Saved perspectives use this browser’s local storage; remove them using the Save control. This build does not use advertising trackers.</p><p>To ask about access, correction or deletion of enquiry information, use the contact form above and describe your request.</p></details></div></section>
}
