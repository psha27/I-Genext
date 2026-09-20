import { EnterprisePlatforms } from '../lib/platform-catalog'
import { enquiry } from '../lib/experience'
import { profileStats } from '../lib/profile'

export function DeckLogo({ brand }: { brand: 'igenext' | 'tvat' }) {
  return <span className={'deck-logo ' + brand}><img src={'/profile/' + (brand === 'igenext' ? 'igenext-light.png' : 'tvat-ai.png')} alt={brand === 'igenext' ? 'I-Genext' : 'Tvat AI'} /></span>
}

export function GroupProfile() {
  return <section className="section group-section" id="group"><div className="container-wide">
    <nav className="profile-jumps" aria-label="Explore our group"><a href="#difference">Our difference &nearr;</a><a href="#leadership">Meet the team &nearr;</a><a href="#locations">Our locations &nearr;</a></nav>
    <div className="profile-stats">{profileStats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <p className="profile-source">Firm profile · August 2026</p>
    <div className="section-heading-row"><div><div className="eyebrow"><span/> One integrated engagement</div><h2>One group.<br/><em>Two engines.</em></h2></div><p>Business expertise and AI-native technology, working together from the first conversation to implementation.</p></div>
    <div className="engine-landscape">
      <div className="engine-current" aria-hidden="true"><svg viewBox="0 0 1000 240" fill="none"><defs><linearGradient id="engine-spectrum"><stop stopColor="#00B0F0"/><stop offset=".5" stopColor="#00b8a9"/><stop offset="1" stopColor="#7030A0"/></linearGradient></defs><path className="engine-current-halo" d="M-40 160C180-130 310 330 500 120S790-100 1040 150"/><path className="engine-current-line" d="M-40 160C180-130 310 330 500 120S790-100 1040 150"/><path className="engine-current-echo" d="M-40 190C190-80 320 340 510 150S810-70 1040 180"/></svg><span className="engine-connection">Expertise meets intelligence</span></div>
      <div className="engine-grid"><article className="engine-card consulting-engine"><span className="engine-index" aria-hidden="true">01</span><DeckLogo brand="igenext"/><span className="label">The consulting engine</span><h3>Depth in the business.<br/>Clarity in the advice.</h3><p>I-Genext Consulting Private Limited brings together Chartered Accountants and domain specialists across governance, risk, finance, audit, tax and management consulting.</p><ul><li>Governance, Risk & Compliance</li><li>Audit, Tax & Forensic Services</li><li>Corporate Finance & Finance Advisory</li><li>Management Consulting & Digitisation</li></ul><a className="text-link" href="#services">Explore consulting ↗</a></article>
    <article className="engine-card technology-engine"><span className="engine-index" aria-hidden="true">02</span><DeckLogo brand="tvat"/><span className="label">The technology engine</span><h3>Intelligence built into<br/>how work gets done.</h3><p>Tvat AI Lab Private Limited builds AI-native platforms to close the gap between how businesses operate and how they are governed.</p><ul><li>Continuous controls & risk monitoring</li><li>Decision intelligence</li><li>AI-native receivables & finance operations</li><li>Asset management & customised solutions</li></ul><a className="text-link" href="#enterprise-platforms">Explore Tvat AI platforms ↗</a></article></div></div>
    <div className="mission-grid"><div><span className="label">Our shared ambition</span><h3>Technology with real business value.</h3><p>Tailored consulting that delivers real value, paired with AI as an operating layer for efficiency, quality, compliance and cost savings.</p></div><div><span className="label">Our value drivers</span><h3>Engage. Enrich. Empower.</h3><div className="value-chips">{['Integrity', 'Excellence', 'Innovation', 'Value driven'].map(x => <span key={x}>{x}</span>)}</div></div></div>
  </div></section>
}

export function Differentiators() {
  const items = [
    ['01', 'Business, product and technology at the table.', 'Senior leaders bring hands-on experience across business operations, product and technology to shape practical solutions.'],
    ['02', 'Experienced people. Senior attention.', '60% of the team has more than three years of experience, with the core senior group closely involved in engagements.'],
    ['03', 'Speed with a clear purpose.', 'Objective-focused delivery and the right architecture help teams use time effectively and keep the work aligned to the business need.'],
    ['04', 'Technology with a business case.', 'Technology sits at the core of transformation, with attention to business ROI, implementation and the way people actually work.']
  ]
  return <section className="section difference-section" id="difference"><div className="container-wide"><div className="eyebrow"><span/> What defines us</div><h2>Built differently.<br/>To make a difference.</h2><div className="difference-grid">{items.map(([n,title,body]) => <article key={n}><span className="difference-number">{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
}

export function PlatformPortfolio() { return <EnterprisePlatforms /> }
export { default as LeadershipTeam } from '../components/LeadershipTeam'

export { default as OfficeLocations } from '../components/OfficeMap'
