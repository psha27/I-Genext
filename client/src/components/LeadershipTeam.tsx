import { useState } from 'react'
import { leadership } from '../lib/profile'
import { Modal } from './Experience'

export default function LeadershipTeam() {
  const [active,setActive] = useState<number | null>(null)
  const selected=active===null?null:leadership[active]
  return <section className="section leadership-section team-showcase" id="leadership"><div className="container-wide">
    <div className="team-section-heading"><h2>Meet our team</h2><p>Core team</p></div>
    <div className="leadership-grid">{leadership.map((person,index)=><article className="team-profile" key={person.name}>
      <div className="leader-portrait"><img src={'/profile/'+person.image} alt={person.name} loading="lazy" width="190" height="218"/></div>
      <h3>{person.name}</h3><p className="leader-role">{person.role}</p>
      <button className="team-profile-open" aria-label={'View profile of '+person.name} aria-haspopup="dialog" onClick={()=>setActive(index)}/>
    </article>)}</div>
    {selected && <Modal title={selected.name} label="I-GENEXT / LEADERSHIP" close={()=>setActive(null)}>
      <div className="team-expanded"><div className="team-expanded-heading"><img src={'/profile/'+selected.image} alt={selected.name} width="100" height="110"/><div><p>{selected.role}</p><span>{selected.experience} of experience</span></div></div>
        <div className="leader-biography">{selected.bio.split('\n\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
        <div className="team-profile-navigation">{leadership.map((person,index)=><button key={person.name} aria-pressed={active===index} onClick={()=>setActive(index)}>{person.name}</button>)}</div>
      </div>
    </Modal>}
  </div></section>
}
