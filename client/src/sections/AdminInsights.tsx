import { useEffect,useState } from 'react'
import type { FormEvent } from 'react'
import type { Insight } from '../lib/insights'
import SocialAccounts from './SocialAccounts'
import InsightSocial from './InsightSocial'
import '../insights-admin.css'
const blank=()=>({title:'',slug:'',topic:'AI & Technology',summary:'',author:'I-Genext',imageUrl:'',status:'draft' as const,body:[['','']] as [string,string][]})
type Draft=ReturnType<typeof blank>|Insight
export default function AdminInsights({sessionExpired}:{sessionExpired:()=>void}){
  const [mode,setMode]=useState<'editor'|'social'>('editor'),[rows,setRows]=useState<Insight[]>([]),[draft,setDraft]=useState<Draft>(blank),[query,setQuery]=useState(''),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(false)
  const id='id' in draft?draft.id:undefined
  async function request(url:string,options?:RequestInit){
    const response=await fetch(url,options)
    if(response.status===401){sessionExpired();throw Error('Please sign in again.')}
    const result=await response.json()
    if(!response.ok)throw Error(result.message||'The request could not be completed.')
    return result
  }
  useEffect(()=>{
    const controller=new AbortController();setLoading(true)
    request('/api/admin/insights',{signal:controller.signal}).then(result=>setRows(result.rows)).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[refresh])
  useEffect(()=>{
    const selected=new URLSearchParams(location.search).get('insight')
    if(!selected)return
    request('/api/admin/insights/'+encodeURIComponent(selected)).then(result=>setDraft(result.row)).catch(e=>setError(e.message))
  },[])
  function edit(row:Insight){setDraft(structuredClone(row));setPreview(false);setError('');setNotice('');document.querySelector('.insight-editor')?.scrollIntoView({behavior:'smooth',block:'start'})}
  function update(key:string,value:unknown){setDraft(old=>({...old,[key]:value}));setNotice('')}
  function section(index:number,column:number,value:string){const body=draft.body.map(pair=>[...pair] as [string,string]);body[index][column]=value;update('body',body)}
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const action=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;const status=action?.value==='published'?'published':'draft';setBusy(true);setError('');setNotice('')
    try{
      const result=await request('/api/admin/insights'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,status})})
      setDraft(result.row);setRefresh(x=>x+1);setNotice(result.row.status==='published'?'Insight published on the website. Use Share to social to publish to a company account.':'Draft saved. It is visible only in this admin workspace.')
      window.dispatchEvent(new Event('igenext:insights-changed'))
    }catch(e){setError(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}
  }
  async function remove(row:Insight){
    if(!window.confirm('Delete "'+row.title+'" from the website? Posts already shared on social accounts will remain there.'))return
    setBusy(true);setError('')
    try{
      await request('/api/admin/insights/'+row.id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:row.version})})
      if(id===row.id)setDraft(blank());setRefresh(x=>x+1);setNotice('Insight deleted from the website.');window.dispatchEvent(new Event('igenext:insights-changed'))
    }catch(e){setError(e instanceof Error?e.message:'Unable to delete.')}finally{setBusy(false)}
  }
  return <section className="insights-workspace">
    <div className="admin-tabs"><button className="admin-secondary" aria-pressed={mode==='editor'} onClick={()=>setMode('editor')}>Manage insights</button><button className="admin-secondary" aria-pressed={mode==='social'} onClick={()=>setMode('social')}>Social accounts</button></div>
    {mode==='social'?<SocialAccounts request={request}/>:<>
    {error&&<p role="alert" className="admin-error">{error}</p>}{notice&&<p role="status" className="admin-notice">{notice}</p>}
    <div className="insights-editor-layout"><div>
      <form className="insight-editor" onSubmit={save}><div className="insight-editor-heading"><h2>{id?'Edit insight':'Create an insight'}</h2><button type="button" className="admin-secondary" disabled={busy} onClick={()=>{setDraft(blank());setPreview(false)}}>New insight</button></div>
      <fieldset disabled={busy}><legend className="sr-only">Insight content</legend>
      <label className="field">Title<input required maxLength={180} value={draft.title} onChange={e=>update('title',e.target.value)}/></label>
      <div className="cms-grid"><label className="field">URL slug<input required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(id)} value={draft.slug} placeholder="your-insight-title" onChange={e=>update('slug',e.target.value)}/><small>Permanent after creation to preserve shared links.</small></label>
      <div className="field"><span>Website visibility</span><strong>{draft.status==='published'?'Published on the website':'Draft - visible only in admin'}</strong><small>Use Publish on website below to make this insight public.</small></div>
      <label className="field">Topic<input aria-label="Topic" required maxLength={80} list="insight-topics" value={draft.topic} onChange={e=>update('topic',e.target.value)}/><datalist id="insight-topics">{['AI & Technology','Governance & Risk','Finance','Management Consulting'].map(x=><option key={x}>{x}</option>)}</datalist></label>
      <label className="field">Author<input required maxLength={120} value={draft.author} onChange={e=>update('author',e.target.value)}/></label></div>
      <label className="field">Summary<textarea required maxLength={600} rows={3} value={draft.summary} onChange={e=>update('summary',e.target.value)}/></label>
      <label className="field">Cover image URL (optional)<input type="url" maxLength={2000} value={draft.imageUrl} placeholder="https://your-public-media-host/insight.jpg" onChange={e=>update('imageUrl',e.target.value)}/><small>Public HTTPS image. Instagram requires a JPEG; use a square image such as 1080 × 1080.</small></label>
      {draft.body.map(([heading,text],index)=><div className="insight-section-editor" key={index}><div className="insight-editor-heading"><h3>Section {index+1}</h3><button type="button" className="admin-secondary" disabled={draft.body.length===1} onClick={()=>update('body',draft.body.filter((_,i)=>i!==index))}>Remove section {index+1}</button></div><label className="field">Section {index+1} heading (optional)<input maxLength={180} value={heading} onChange={e=>section(index,0,e.target.value)}/></label><label className="field">Section {index+1} text<textarea required maxLength={12000} rows={7} value={text} onChange={e=>section(index,1,e.target.value)}/></label></div>)}
      <div className="cms-actions"><button type="button" className="admin-secondary" disabled={draft.body.length>=30} onClick={()=>update('body',[...draft.body,['','']])}>Add section</button><button type="button" className="admin-secondary" onClick={()=>setPreview(x=>!x)}>{preview?'Hide preview':'Preview article'}</button><button type="submit" name="action" value="draft" className="admin-secondary">{draft.status==='published'?'Unpublish and save draft':'Save draft'}</button><button type="submit" name="action" value="published" className="btn btn-primary btn-large">{busy?'Saving...':draft.status==='published'?'Update on website':'Publish on website'}</button></div>
      </fieldset></form>
      {preview&&<article className="cms-article-preview"><span className="label">{draft.topic} · {draft.author}</span><h2>{draft.title||'Untitled insight'}</h2><p>{draft.summary}</p>{draft.imageUrl&&<img src={draft.imageUrl} alt="" referrerPolicy="no-referrer"/>}{draft.body.map(([heading,text],i)=><section key={i}>{heading&&<h3>{heading}</h3>}<p>{text}</p></section>)}</article>}
      {id&&<InsightSocial key={id+'-'+('version' in draft?draft.version:0)} insight={draft as Insight} request={request}/>}
    </div><aside><div className="insight-editor-heading"><h2>Website insights</h2><button className="admin-secondary" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh insights</button></div><label className="field">Search managed insights<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title, topic or status"/></label>
      {loading?<p role="status">Loading insights…</p>:rows.filter(row=>[row.title,row.topic,row.status].join(' ').toLowerCase().includes(query.toLowerCase())).map(row=><article className="cms-list-item" key={row.id}><span className="label">{row.status} · {row.topic}</span><h3>{row.title}</h3><p>{row.summary}</p><div className="cms-actions"><button className="admin-secondary" disabled={busy} onClick={()=>edit(row)}>Edit {row.title}</button>{row.status==='published'&&<a className="admin-secondary" href={'/insights/'+row.slug} target="_blank" rel="noreferrer">View article</a>}<button className="cms-delete" disabled={busy} onClick={()=>remove(row)}>Delete</button></div></article>)}
      {!loading&&!rows.length&&<p>No insights yet. Create the first draft.</p>}
    </aside></div></>}
  </section>
}
