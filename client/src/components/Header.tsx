import { useEffect, useState } from 'react'
import { SiteSearch } from './Experience'

const navItems = [
  ['Our Group', '#group'],
  ['Services', '#services'],
  ['Industries', '#industries'],
  ['Platform Solutions', '#platforms'],
  ['Insights', '#insights'],
  ['Careers', '#careers'],
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="nav-wrap container-wide">
        <a href="#top" className="brand" aria-label="I-Genext home">
          <img src="/profile/igenext-light.png" alt="I-Genext" />
        </a>
        <nav className={`desktop-nav ${open ? 'mobile-open' : ''}`} id="primary-nav" aria-label="Primary navigation" onKeyDown={e => { if (e.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus() } }}>
          {navItems.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>
        <SiteSearch />
        <a className="btn btn-primary nav-cta" href="#contact">Talk to Us <span>↗</span></a>
        <button className="menu-toggle" aria-controls="primary-nav" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /> <span />
        </button>
      </div>
    </header>
  )
}
