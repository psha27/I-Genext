import { useEffect, useRef, useState } from 'react'
import type { PlatformEntry } from '../lib/platform-catalog'
export const defaultHero = { name:'Consulting. Technology. Impact.', headline:'Expertise that moves you forward.', category:'Intelligence that takes you further.', description:'Connect deep business expertise with practical technology to strengthen governance, transform finance and unlock your next chapter of growth.', outcome:'Explore our expertise', imageAlt:'Business consultants collaborating in a contemporary boardroom', mediaMode:'illustration', photo:null, video:null } as PlatformEntry
export function HeroVisual({ item, admin=false }: {item:PlatformEntry;admin?:boolean}) {
  const ref=useRef<HTMLVideoElement>(null)
  const userPaused=useRef(false)
  const [playing,setPlaying]=useState(false)
  const [failed,setFailed]=useState(false)
  const poster=(admin?item.photo?.previewUrl:item.photo?.url)||'/profile/consulting-hero-poster-v2.png'
  const source=item.mediaMode==='photo'?'':item.mediaMode==='video'?(admin?item.video?.previewUrl:item.video?.url):'/profile/consulting-hero-demo-v2.webm'
  useEffect(()=>{
    setFailed(false);userPaused.current=false
    const motion=matchMedia('(prefers-reduced-motion: reduce)')
    const sync=()=>{if(motion.matches||document.hidden||userPaused.current)ref.current?.pause();else ref.current?.play().catch(()=>setPlaying(false))}
    sync();motion.addEventListener('change',sync);document.addEventListener('visibilitychange',sync)
    return()=>{motion.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync)}
  },[source])
  return <section className="cinematic-hero" id={admin?undefined:'top'} aria-label="Consulting and technology">
    <img className="cinematic-background" src={poster} alt={item.imageAlt} fetchPriority={admin?undefined:'high'}/>
    {source&&!failed&&<video key={source} ref={ref} className="cinematic-background" muted loop playsInline preload="metadata" poster={poster} src={source} aria-hidden="true" onCanPlay={()=>{if(!userPaused.current&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)ref.current?.play().catch(()=>setPlaying(false))}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false)}}/>}
    <div className="cinematic-shade"/>
    <div className="container-wide cinematic-copy"><div className="eyebrow"><span/>{item.name}</div>{admin?<h2>{item.headline}<em>{item.category}</em></h2>:<h1>{item.headline}<em>{item.category}</em></h1>}<p>{item.description}</p><a className="btn btn-primary btn-large" href="#consulting-overview">{item.outcome || 'Explore our expertise'} <span aria-hidden="true">&#8599;</span></a></div>
    <div className="cinematic-bottom container-wide"><span>Governance & risk <i/> Finance & strategy <i/> AI & automation</span><div>{source&&!failed&&<button className="cinematic-play" aria-label={playing?'Pause background video':'Play background video'} onClick={()=>{userPaused.current=playing;if(playing)ref.current?.pause();else ref.current?.play().catch(()=>setPlaying(false))}}>{playing?'Pause motion':'Play motion'} <span aria-hidden="true">{playing?'II':'\u25b7'}</span></button>}<a href="#consulting-overview" aria-label="Discover our consulting expertise">Discover more &#8595;</a></div></div>
  </section>
}
export default function CinematicHero(){
  const [item,setItem]=useState<PlatformEntry>(defaultHero)
  useEffect(()=>{const abort=new AbortController();fetch('/api/hero-content',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(r=>{if(r.items[0])setItem(r.items[0])}).catch(()=>{});return()=>abort.abort()},[])
  return <HeroVisual item={item}/>
}
