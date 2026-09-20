import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { offices } from '../lib/profile'
import pins from '../lib/office-pins.json'
import { enquiry } from '../lib/experience'
import '../office-map.css'

export default function OfficeMap() {
  const [active,setActive] = useState<number | null>(null)
  const [placement,setPlacement] = useState({ left:12,top:12,tip:30,below:true,extra:0 })
  const stage = useRef<HTMLDivElement>(null), popup = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const focusPopup = useRef(false)
  const office = active === null ? null : offices[active]
  function open(index:number, element?:HTMLButtonElement) {
    trigger.current = element || null; focusPopup.current = true; setActive(index)
    if(active===index) popup.current?.focus({preventScroll:true})
  }
  function close(restore=true) {
    setActive(null)
    if(restore) trigger.current?.focus({preventScroll:true})
  }
  useEffect(()=>{
    const update=()=>{
      const match=/^#office-(\d+)$/.exec(window.location.hash), index=match?Number(match[1]):-1
      if(index>=0 && index<offices.length){setActive(index);document.getElementById('locations')?.scrollIntoView()}
    }
    update();window.addEventListener('hashchange',update)
    return ()=>window.removeEventListener('hashchange',update)
  },[])
  useEffect(()=>{
    if(active===null)return
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close()}}
    const outside=(event:PointerEvent)=>{
      const target=event.target as Element
      if(!target.closest('.office-balloon,.office-pin,.presence-city'))close(false)
    }
    document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside)
    return ()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside)}
  },[active])
  useLayoutEffect(()=>{
    if(!office || !stage.current || !popup.current)return
    const position=()=>{
      const area=stage.current!, balloon=popup.current!
      const pin=pins[office.city as keyof typeof pins], x=area.clientWidth*pin.x/100,y=area.clientHeight*pin.y/100
      const width=balloon.offsetWidth,height=balloon.offsetHeight
      const left=Math.max(12,Math.min(x-width/2,area.clientWidth-width-12))
      const below=y-height-26<12, top=below?y+26:y-height-26
      setPlacement({left,top,tip:Math.max(20,Math.min(width-20,x-left)),below,extra:Math.max(0,top+height-area.clientHeight)+16})
    }
    position()
    const observer=new ResizeObserver(position);observer.observe(stage.current);observer.observe(popup.current)
    if(focusPopup.current){popup.current.focus({preventScroll:true});focusPopup.current=false}
    return ()=>observer.disconnect()
  },[office])
  return <section className="section presence-section" id="locations"><div className="container-wide">
    <div className="section-heading-row"><div><div className="eyebrow"><span/> Our presence</div><h2>Five cities.<br/><em>One connected team.</em></h2></div><p>Based in Gurugram, with a presence across Mumbai, Bangalore, Ranchi and Rudrapur. Select a pin to meet your local office.</p></div>
    <div className="presence-map-layout"><aside className="presence-guide"><span className="label">Connected across India</span><h3>Close to your business.<br/>Wherever you grow.</h3><p>Explore our offices and connect with the team nearest to you.</p>
      <div className="presence-cities" aria-label="Choose an office">{offices.map((item,index)=><button className="presence-city" key={item.city} aria-expanded={active===index} aria-controls={active===index?'office-balloon':undefined} onClick={event=>open(index,event.currentTarget)}><span className="presence-city-dot" aria-hidden="true"/><span>{item.city}<small>{item.label}</small></span><span aria-hidden="true">↗</span></button>)}</div>
      <p className="presence-hint">Select a city or a map pin for office details and directions.</p>
    </aside>
    <div className="presence-map-frame" style={{paddingBottom:office?placement.extra:16}}>
      <div className="presence-map-topline"><span className="label">India / Our office network</span><span><i/> 05 locations</span></div>
      <div className="presence-map-stage" ref={stage}>
        <img className="india-office-map" src="/profile/india-presence.svg" alt="Map of India showing state boundaries from the I-Genext profile" width="840" height="820" loading="lazy"/>
        {offices.map((item,index)=>{
          const pin=pins[item.city as keyof typeof pins]
          return <button key={item.city} className={'office-pin pin-'+item.city.toLowerCase()} style={{left:pin.x+'%',top:pin.y+'%'}} aria-label={item.city+' office on map'} aria-expanded={active===index} aria-controls={active===index?'office-balloon':undefined} onClick={event=>open(index,event.currentTarget)}><span className="office-pin-halo" aria-hidden="true"/><span className="office-pin-dot" aria-hidden="true"/><span className="office-pin-label" aria-hidden="true">{item.city}</span></button>
        })}
        {office && <article ref={popup} id="office-balloon" className={'office-balloon '+(placement.below?'balloon-below':'balloon-above')} role="dialog" aria-modal="false" aria-labelledby="office-balloon-title" tabIndex={-1} style={{left:placement.left,top:placement.top,'--balloon-tip':placement.tip+'px'} as CSSProperties}>
          <button className="office-balloon-close" aria-label="Close office details" onClick={()=>close()}>×</button><span className="label">{office.label}</span><h3 id="office-balloon-title">{office.city}</h3><address>{office.address}</address>
          <a className="office-directions" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(office.address)} target="_blank" rel="noreferrer">View on map ↗</a>
          <button className="office-connect" onClick={()=>{close(false);enquiry('Management Consulting','I would like to connect with the '+office.city+' team about: ')}}>Connect with this office →</button>
        </article>}
      </div>
    </div></div>
  </div></section>
}
