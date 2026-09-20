import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { candidateLabels } from '../components/Careers'
import type { Job } from '../components/Careers'
import '../careers.css'

const blank = { title:'',location:'',department:'',experience:'',employmentType:'Full-time',description:'',status:'draft' }
type Draft = typeof blank & { id?: string }
type Application = { reference:string; jobTitle:string; jobLocation:string; createdAt:string; candidate:Record<string,string>; emails:Record<string,string> }
type Page = { rows:Application[]; total:number; page:number; totalPages:number }
const emailLabels: Record<string,string> = { pending:'Queued',sending:'Sending',sent:'Accepted by Microsoft 365',failed:'Needs attention' }
export default function AdminCareers({ mode, sessionExpired }: { mode: 'jobs'|'applications'; sessionExpired:()=>void }) {
  const [jobs,setJobs] = useState<Job[]>([]), [draft,setDraft] = useState<Draft>({...blank}), [data,setData] = useState<Page | null>(null)
  const [query,setQuery] = useState(''), [page,setPage] = useState(1), [refresh,setRefresh] = useState(0)
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('')
  async function request(url:string, options?:RequestInit) {
    const response = await fetch(url,options)
    if (response.status === 401) { sessionExpired(); throw new Error('Your session has ended. Please sign in again.') }
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'The request could not be completed.')
    return result
  }
  useEffect(()=>{
    const controller = new AbortController()
    setLoading(true);setError('')
    const timer = setTimeout(()=>{
      request(mode==='jobs'?'/api/admin/jobs':'/api/admin/applications?q='+encodeURIComponent(query)+'&page='+page,{signal:controller.signal})
        .then(result=>{if(mode==='jobs')setJobs(result.jobs);else setData(result)})
        .catch(e=>{if(e.name!=='AbortError')setError(e.message)})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    },150)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[mode,query,page,refresh])
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setNotice('')
    try {
      await request('/api/admin/jobs'+(draft.id?'/'+draft.id:''),{method:draft.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)})
      setNotice(draft.status==='open'?'Opening published on the website.':draft.status==='closed'?'Opening closed. Existing applications remain available.':'Draft saved. Publish it by changing its status to Open.')
      setDraft({...blank});setRefresh(x=>x+1)
    } catch(e) {setError(e instanceof Error?e.message:'Unable to save opening.')}
    finally {setBusy(false)}
  }
  async function resume(reference:string) {
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/applications/'+reference+'/resume')
      if(response.status===401){sessionExpired();return}
      if(!response.ok) throw new Error('Resume could not be downloaded. Please try again.')
      const url=URL.createObjectURL(await response.blob()), a=document.createElement('a')
      a.href=url;a.download=reference+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch(e) {setError(e instanceof Error?e.message:'Unable to download resume.')}
    finally {setBusy(false)}
  }
  async function retry(reference:string) {
    setBusy(true);setError('')
    try {await request('/api/admin/applications/'+reference+'/retry-emails',{method:'POST'});setRefresh(x=>x+1);setNotice('Failed notifications have been queued for another attempt.')}
    catch(e){setError(e instanceof Error?e.message:'Unable to retry notifications.')}
    finally{setBusy(false)}
  }
  return <section className="admin-careers" aria-label={mode==='jobs'?'Manage openings':'Candidate applications'}>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {mode==='jobs'?<>
      <div className="admin-jobs-layout"><form className="job-editor" onSubmit={save}><h2>{draft.id?'Edit opening':'Create an opening'}</h2><p>Only openings with status Open are displayed in Careers.</p><fieldset disabled={busy} className="application-fields"><legend className="sr-only">Opening details</legend>
        <div className="candidate-grid">{Object.entries({title:'Job title',location:'Location / work arrangement',department:'Department',experience:'Experience',employmentType:'Employment type'}).map(([key,label])=><label className="field" key={key}>{label}<input required maxLength={220} value={draft[key as keyof Draft] || ''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
        <label className="field">Status<select aria-label="Status" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option></select></label></div>
        <label className="field">Role description, responsibilities and requirements<textarea required rows={9} maxLength={12000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
        <div className="job-actions"><button className="btn btn-primary btn-large">{busy?'Saving…':draft.status==='open'?'Save and publish':'Save opening'}</button>{draft.id&&<button type="button" className="admin-secondary" onClick={()=>setDraft({...blank})}>Cancel edit</button>}</div>
      </fieldset></form>
      <div><div className="admin-toolbar"><h2>Company openings</h2><button className="admin-secondary" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh openings</button></div>
        {loading?<p role="status">Loading openings…</p>:!jobs.length?<p>No openings yet. Create a draft or publish your first role.</p>:jobs.map(job=><article className="job-card" key={job.id}><span className={'job-status status-'+job.status}>{job.status}</span><h3>{job.title}</h3><p>{job.location} · {job.department}</p><button className="admin-secondary" disabled={busy} onClick={()=>{setDraft({...job});setNotice('');document.querySelector('.job-editor')?.scrollIntoView({behavior:'smooth',block:'start'})}}>Edit {job.title}</button></article>)}
      </div></div>
    </>:<>
      <div className="admin-toolbar"><label className="field">Search applications<input type="search" placeholder="Candidate, job, email or reference ID" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><button className="admin-secondary" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh applications</button></div>
      <p role="status">{loading?'Loading applications…':(data?.total || 0)+' applications found'}</p>
      {data && <><div className="application-list">{data.rows.map(row=><article className="job-card admin-application" key={row.reference}>
        <div className="job-card-top"><div><span className="label">{row.jobTitle}</span><h3>{[row.candidate.firstName,row.candidate.middleName,row.candidate.lastName].filter(Boolean).join(' ')}</h3><p>{row.candidate.email} · {row.candidate.mobile}</p><small className="application-reference">{row.reference}</small><p><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time> · {row.jobLocation}</p></div><button className="admin-secondary" disabled={busy} onClick={()=>resume(row.reference)}>Download resume</button></div>
        <details><summary>View candidate details</summary><dl className="candidate-details">{Object.entries(candidateLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{row.candidate[key] || 'Not provided'}</dd></div>)}<div><dt>Recruitment consent received</dt><dd>{new Date(row.candidate.consentAt).toLocaleString()}</dd></div></dl></details>
        <div className="application-email-status"><span>Candidate acknowledgement: {emailLabels[row.emails.candidate]}</span><span>Careers notification: {emailLabels[row.emails.company]}</span>{Object.values(row.emails).includes('failed')&&<button className="admin-secondary" disabled={busy} onClick={()=>retry(row.reference)}>Retry failed emails</button>}</div>
      </article>)}</div>
      {!data.rows.length&&<div className="admin-empty"><h2>No applications found.</h2><p>{query?'Try another search term.':'Applications to published openings will appear here.'}</p></div>}
      <div className="admin-pagination"><button className="admin-secondary" disabled={loading || data.page<=1} onClick={()=>setPage(data.page-1)}>Previous</button><span>Page {data.page} of {data.totalPages}</span><button className="admin-secondary" disabled={loading || data.page>=data.totalPages} onClick={()=>setPage(data.page+1)}>Next</button></div></>}
      <p className="admin-footnote">Resumes are available only to signed-in administrators. Accepted by Microsoft 365 means submitted to the provider; it does not confirm inbox delivery.</p>
    </>}
  </section>
}
