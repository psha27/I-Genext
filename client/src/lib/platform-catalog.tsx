import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import PlatformGraphic from '../components/PlatformGraphic'
import { enquiry } from './experience'

export type PlatformAsset = { url: string; previewUrl?: string; mime: string; size: number }
export type PlatformEntry = { id: string; anchor: string; group: 'productivity' | 'enterprise'; name: string; category: string; headline: string; description: string; outcome: string; features: string[]; flow: string[]; color: string; order: number; status: 'draft' | 'published'; mediaMode: 'illustration' | 'photo' | 'video'; imageAlt: string; transcript: string; version: number; image?: string; icon?: string; illustration?: string; graphicLabel?: string; photo: PlatformAsset | null; video: PlatformAsset | null }
const Context = createContext<{ items: PlatformEntry[]; loading: boolean; error: string; refresh: () => void }>({ items: [], loading: true, error: '', refresh: () => {} })
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PlatformEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/platform-catalog', { signal: controller.signal }).then(async response => { if (!response.ok) throw Error('Platform solutions could not be loaded.'); const result = await response.json(); setItems(result.items); setError('') }).catch(reason => { if (reason.name !== 'AbortError') setError('Platform solutions could not be loaded.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  useEffect(() => { const refresh = () => setRevision(value => value + 1); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh) }, [])
  return <Context.Provider value={{ items, loading, error, refresh: () => setRevision(value => value + 1) }}>{children}</Context.Provider>
}
export const usePlatformCatalog = () => useContext(Context)

export function PlatformVisual({ item, admin = false }: { item: PlatformEntry; admin?: boolean }) {
  const [active, setActive] = useState(item.mediaMode)
  const [failed, setFailed] = useState(false)
  const [direction, setDirection] = useState(1)
  useEffect(() => { setActive(item.mediaMode); setFailed(false) }, [item.id, item.version, item.mediaMode])
  const photo = item.photo ? (admin ? item.photo.previewUrl : item.photo.url) : item.image ? '/profile/' + item.image : ''
  const video = item.video ? (admin ? item.video.previewUrl : item.video.url) : ''
  const illustrated = Boolean(item.image || item.icon || (item.illustration && item.illustration !== 'generic'))
  const options = [{ value: 'illustration', label: illustrated ? 'Illustration' : 'Placeholder' }, ...(photo ? [{ value: 'photo', label: 'Photo' }] : []), ...(video ? [{ value: 'video', label: 'Video' }] : [])]
  const activeIndex = Math.max(0, options.findIndex(option => option.value === active))
  function navigateMedia(direction: number) {
    setDirection(direction)
    setActive(options[(activeIndex + direction + options.length) % options.length].value as PlatformEntry['mediaMode'])
    setFailed(false)
  }
  return <div className="productivity-media catalog-media" role="region" aria-roledescription="carousel" aria-label={item.name + ' visuals'}>
    <div key={active} className="catalog-media-stage" data-direction={direction < 0 ? 'previous' : 'next'}>
    {active === 'video' && video && !failed ? <div className="productivity-video"><video controls playsInline preload="metadata" poster={photo || undefined} src={video} aria-label={item.name + ' video'} onError={() => setFailed(true)} />{item.transcript && <details><summary>Read video transcript</summary><p>{item.transcript}</p></details>}<a href={video} target="_blank" rel="noreferrer">Open video ↗</a></div> : active === 'photo' && photo && !failed ? <div className="catalog-photo"><img src={photo} alt={item.imageAlt || item.name + ' product visual'} loading="lazy" onError={() => setFailed(true)} /></div> :
      <div className="platform-story-image productivity-art" role="img" aria-label={item.graphicLabel || item.name + ' solution illustration'}>
        {item.image && <img src={'/profile/' + item.image} alt="" loading="lazy" width="1254" height="1254" />}
        {item.group === 'enterprise' && item.illustration && !['generic','productivity'].includes(item.illustration) ? <PlatformGraphic kind={item.illustration} name={item.name} /> : illustrated ? <div className="productivity-illustration" aria-hidden="true"><div className="platform-graphic-top"><strong>{item.name}</strong><span>Solution illustration</span></div><svg viewBox="0 0 300 195" fill="none"><ellipse cx="150" cy="98" rx="122" ry="52" transform="rotate(-20 150 98)" stroke="currentColor" opacity=".3"/><circle cx="150" cy="98" r="76" stroke="currentColor" strokeDasharray="2 8" opacity=".4"/><circle cx="150" cy="98" r="54" fill="#0e1118" stroke="currentColor"/><path d={item.icon || 'M-25-25H25V25H-25ZM-12 0H12M0-12V12'} transform="translate(150 98)" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="productivity-flow">{item.flow.map((step, i) => <span key={i}><small>0{i + 1}</small>{step}</span>)}</div><p>{item.category}</p></div> : <div className="catalog-placeholder"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="8" y="12" width="48" height="40" rx="6"/><circle cx="24" cy="26" r="5"/><path d="m10 46 15-12 10 8 10-15 10 16"/></svg><strong>{item.name}</strong><p>{admin ? 'Upload a photo or video to complete this section.' : 'Product visual coming soon.'}</p></div>}
      </div>}
    </div>
    {options.length > 1 && <div className="catalog-media-arrows" role="group" aria-label="Browse visuals">
      <span className="catalog-media-status" role="status">{options[activeIndex].label}, {activeIndex + 1} of {options.length}</span>
      <button type="button" aria-label="Previous visual" onClick={() => navigateMedia(-1)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg></button>
      <button type="button" aria-label="Next visual" onClick={() => navigateMedia(1)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6M4 12h12"/></svg></button>
    </div>}
    {failed && <p role="status" className="productivity-media-note">This media could not be displayed.{video && <> <a href={video} target="_blank" rel="noreferrer">Open video ↗</a></>}</p>}
  </div>
}
export function PlatformRows({ group }: { group: PlatformEntry['group'] }) {
  const { items, loading, error, refresh } = usePlatformCatalog()
  const rows = items.filter(item => item.group === group)
  if (loading) return <p role="status">Loading platform solutions…</p>
  if (error) return <p role="status">{error} <button className="text-action" onClick={refresh}>Try again</button></p>
  return <div className="platform-stories">{rows.map((item, index) => <article className={'platform-story accent-' + item.color} id={item.anchor} key={item.id}><div className="platform-story-copy"><span className="label">{group === 'productivity' ? 'Productivity tools' : 'TVAT AI'} / {String(index + 1).padStart(2, '0')}</span><h3>{item.name}</h3><h4>{item.category}</h4>{item.headline && <p className="platform-headline">{item.headline}</p>}<p className="catalog-description">{item.description}</p>{item.features.length > 0 && <ul>{item.features.map((feature, i) => <li key={i}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>}{item.outcome && <p className="productivity-outcome">{item.outcome}</p>}<button className="text-action" onClick={() => enquiry(group === 'productivity' ? 'Technology Enablement' : 'Tech Solutions', 'I would like to discuss ' + item.name + ' — ' + item.category + '. Please share the scope and arrange a demonstration.')}>Explore {item.name} <span aria-hidden="true">↗</span></button></div><PlatformVisual item={item} /></article>)}</div>
}
export function EnterprisePlatforms() {
  return <section className="section platform-section" id="enterprise-platforms"><div className="container-wide"><div className="section-heading-row"><div><div className="eyebrow"><span/> 02 / Tvat AI Lab</div><h2>Enterprise AI-native<br/>Platforms <em>[Tvat AI]</em></h2></div><p>Purpose-built technology across finance, governance, real estate and talent. Explore the platform that fits your operating challenge.</p></div><PlatformRows group="enterprise"/><p className="platform-note">Platform scope and availability depend on the agreed engagement, configuration and integrations.</p></div></section>
}