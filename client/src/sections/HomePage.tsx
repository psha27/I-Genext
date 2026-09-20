import CinematicHero from './CinematicHero'
import ProductivitySolutions from './ProductivitySolutions'
import Careers from '../components/Careers'
import { GroupProfile, Differentiators, PlatformPortfolio, LeadershipTeam, OfficeLocations } from './ProfileSections'
import { CapabilityExplorer, IndustryExplorer, ReadinessAssessment, ValueCalculator, InsightLibrary, ContactForm, PrivacyNotice } from '../components/Experience'

export default function HomePage() {
  return <>
    <CinematicHero />
    <section className="hero" id="consulting-overview">
      <div className="hero-grid-overlay" /><div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
      <div className="container-wide hero-inner">
        <div className="hero-copy reveal-up">
          <a className="hero-partners" href="#about">I-Genext Consulting</a>
          <div className="eyebrow"><span /> Consulting · Technology · Execution</div>
          <h2>Redefining consulting.<br /><em>Powered by technology.</em></h2>
          <p className="hero-lead">We combine deep consulting expertise with practical technology to strengthen governance, transform finance and operations, and turn strategy into lasting business value.</p>
          <div className="hero-actions"><a href="#services" className="btn btn-primary btn-large">Explore our capabilities <span>→</span></a></div>
        </div>
        <div className="hero-visual intelligence-visual" role="group" aria-label="Technology connecting our consulting expertise">
          <div className="intelligence-heading"><span className="intelligence-status" aria-hidden="true" /> Expertise. Connected.</div>
          <div className="intelligence-stage">
            <img className="intelligence-image" src="/profile/consulting-intelligence-v2.png" width="1254" height="1254" fetchPriority="high" alt="A luminous network of connected blue nodes and orbiting data streams" />
            <div className="intelligence-orbit" aria-hidden="true"><span /></div>
            <nav className="intelligence-links" aria-label="Explore consulting expertise">
              <a className="intelligence-link intelligence-link-risk" href="#capability-grc"><span className="intelligence-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6L12 3Z"/><path d="m8 12 3 3 5-6"/></svg></span><span><small>Governance &amp; risk</small><strong>Confidence by design</strong></span><span className="intelligence-arrow" aria-hidden="true">↗</span></a>
              <a className="intelligence-link intelligence-link-finance" href="#capability-finance"><span className="intelligence-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5"/></svg></span><span><small>Finance advisory</small><strong>Clarity in every decision</strong></span><span className="intelligence-arrow" aria-hidden="true">↗</span></a>
              <a className="intelligence-link intelligence-link-strategy" href="#capability-strategy"><span className="intelligence-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/></svg></span><span><small>Business strategy</small><strong>Insight into action</strong></span><span className="intelligence-arrow" aria-hidden="true">↗</span></a>
              <a className="intelligence-link intelligence-link-digital" href="#capability-ai"><span className="intelligence-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4M18 9h4m-4 6h4"/><path d="m13 8-3 5h4l-3 3"/></svg></span><span><small>AI, data &amp; automation</small><strong>Intelligence at work</strong></span><span className="intelligence-arrow" aria-hidden="true">↗</span></a>
            </nav>
          </div>
          <div className="intelligence-caption"><span />Human expertise. Technology-enabled impact.<span /></div>
        </div>
      </div>
      <div className="hero-bottom container-wide"><span>Engage</span><i /> <span>Enrich</span><i /> <span>Empower</span><a href="#about">Scroll to discover ↓</a></div>
    </section>
    <section className="intro section" id="about"><div className="container-wide two-col-heading"><div><div className="eyebrow dark"><span /> Who we are</div><h2>A consulting partner for businesses that need more than recommendations.</h2></div><div className="intro-copy"><p className="large-copy">I-Genext brings together consulting expertise and practical technology enablement to help leadership teams improve governance, finance, operations and execution.</p><p>Our approach is simple: understand the business context deeply, design what will work in practice, and stay close enough to implementation to make the change real.</p><a className="text-link" href="#services">Discover I-Genext <span>→</span></a></div></div>
      <div className="container-wide principles-grid"><article><span>01</span><h3>Business first</h3><p>Technology is useful only when it improves a real business outcome.</p></article><article><span>02</span><h3>Senior attention</h3><p>Complex decisions need experienced judgement, not just process execution.</p></article><article><span>03</span><h3>Practical transformation</h3><p>We design solutions for adoption, accountability and measurable progress.</p></article><article><span>04</span><h3>Built for action</h3><p>Recommendations connect to workflows, controls, data and ownership.</p></article></div>
    </section>
    <GroupProfile /><Differentiators /><CapabilityExplorer /><IndustryExplorer />
    <ProductivitySolutions /><PlatformPortfolio />
    <ReadinessAssessment /><ValueCalculator /><InsightLibrary /><LeadershipTeam /><OfficeLocations /><Careers />
    <section className="contact section" id="contact"><div className="container-wide contact-shell"><div><div className="eyebrow dark"><span /> Start a conversation</div><h2>Let’s explore how we can help your business.</h2><p>Tell us about your business, the priorities on your mind and what you would like to achieve. Together, we can explore where our expertise can make a meaningful difference.</p></div><ContactForm /></div></section>
    <PrivacyNotice />
  </>
}