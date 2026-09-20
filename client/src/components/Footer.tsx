export default function Footer() {
  return (
    <footer className="footer">
      <div className="container-wide footer-grid">
        <div className="footer-brand">
          <a href="#top" className="brand footer-home" aria-label="I-Genext home"><img src="/profile/igenext-light.png" alt="I-Genext" /></a>
          <p className="footer-tagline">Engage · Enrich · Empower</p>
        </div>
        <div>
          <p className="footer-heading">Explore</p>
          <a href="#about">Who We Are</a>
          <a href="#services">Services</a>
          <a href="#platforms">Platform Solutions</a><a href="#productivity-tools">Productivity Tools</a><a href="#enterprise-platforms">Tvat AI Platforms</a>
          <a href="#technology">Technology Enablement</a>
          <a href="#insights">Insights</a>
        </div>
        <div>
          <p className="footer-heading">Company</p>
          <a href="#group">Our Group</a>
          <a href="#leadership">Leadership</a>
          <a href="#locations">Our Presence</a>
          <a href="#careers">Careers</a>
          <a href="#contact">Contact</a>
          <a href="#privacy">Privacy</a>
          <a href="/admin">Admin login</a>
        </div>
        <div className="footer-contact">
          <p className="footer-heading">Start a conversation</p>
          <p>Tell us the business challenge. We’ll bring the right mix of advisory, technology and execution.</p>
          <a className="text-link" href="#contact">Contact I-Genext <span>→</span></a>
        </div>
      </div>
      <div className="container-wide footer-bottom">
        <span>© {new Date().getFullYear()} I-Genext Consulting Private Limited.</span>
        <span>Engage · Enrich · Empower</span>
      </div>
    </footer>
  )
}
