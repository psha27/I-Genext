import { PlatformRows, usePlatformCatalog } from '../lib/platform-catalog'
export default function ProductivitySolutions() {
  const { items } = usePlatformCatalog()
  const productivityTools = items.filter(item => item.group === 'productivity')
  return <>
    <section className="section platform-solutions-intro" id="platforms"><div className="container-wide"><div className="eyebrow"><span/> Platform Solutions</div><h2>Purpose-built tools.<br/><em>Enterprise intelligence.</em></h2><p>Explore two ways to turn technology into practical business value: focused productivity tools for everyday work, and AI-native platforms for connected enterprise operations.</p><nav className="platform-group-links" aria-label="Platform solution groups"><a href="#productivity-tools"><span>01</span><strong>Business Productivity &amp; Efficiency Tools</strong><span aria-hidden="true">↓</span></a><a href="#enterprise-platforms"><span>02</span><strong>Enterprise AI-native Platforms <small>Tvat AI</small></strong><span aria-hidden="true">↓</span></a></nav></div></section>
    <section className="section platform-section productivity-section" id="productivity-tools"><div className="container-wide"><span id="technology" className="platform-anchor"/><div className="section-heading-row"><div><div className="eyebrow"><span/> 01 / Business productivity</div><h2>Business Productivity<br/>&amp; Efficiency Tools</h2></div><p>Next-generation tools for compliance, approvals, fixed assets, internal audit, control testing and workflow automation. Designed to make work more visible, connected and accountable.</p></div>
      <nav className="productivity-index" aria-label="Explore productivity tools">{productivityTools.map(tool => <a key={tool.id} href={'#' + tool.anchor}>{tool.name} <span aria-hidden="true">↗</span></a>)}</nav>
      <PlatformRows group="productivity" />
      <p className="platform-note">Capabilities, integrations and deployment scope are agreed for each engagement. Illustrations show solution concepts.</p>
    </div></section>
  </>
}