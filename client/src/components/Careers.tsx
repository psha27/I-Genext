import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './Experience'
import '../careers.css'

export type Job = { id: string; title: string; location: string; department: string; experience: string; employmentType: string; description: string; status: string }
export const candidateLabels: Record<string,string> = {
  firstName: 'First Name', middleName: 'Middle Name', lastName: 'Last Name', email: 'Email', mobile: 'Mobile',
  currentOrganization: 'Current Organization', currentDesignation: 'Current Designation',
  currentLocation: 'Current Location', currentAddress: 'Current Address',
  currentSalary: 'Current Salary', expectedSalary: 'Expected Salary'
}
function Application({ job, close }: { job: Job; close: () => void }) {
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [reference,setReference] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    const fields = new FormData(event.currentTarget), file = fields.get('resume') as File
    if (!file || file.size > 2*1024*1024 || !file.name.toLowerCase().endsWith('.pdf')) { setError('Please upload a PDF resume no larger than 2 MB.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/jobs/'+job.id+'/applications', { method:'POST', body: fields })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Your application could not be saved. Please try again.')
      setReference(result.reference)
    } catch (e) { setError(e instanceof Error && e.name !== 'SyntaxError' ? e.message : 'Unable to connect. Please try again.') }
    finally { setBusy(false) }
  }
  return <Modal title={reference ? 'Thank you for applying.' : 'Apply for '+job.title} close={() => { if (!busy) close() }} label="I-GENEXT / CAREERS">
    {reference ? <div className="application-success" role="status"><p>Your application for <strong>{job.title}</strong> has been received.</p><p>Please keep your unique application ID:</p><strong className="application-reference">{reference}</strong><p>A confirmation email will follow. For updates, write to <a href={'mailto:careers@i-genext.com?subject='+encodeURIComponent('Application follow-up: '+reference)}>careers@i-genext.com</a> and include this ID.</p><button className="btn btn-primary" onClick={close}>Done</button></div> :
    <form onSubmit={submit} className="application-form">
      <p>{job.location} · {job.employmentType}</p><p className="muted">All fields are required except Middle Name. If you are starting your career, enter “Not applicable” for your current organization and designation, and 0 for your current salary.</p>
      <fieldset disabled={busy} className="application-fields"><legend className="sr-only">Candidate details</legend><div className="candidate-grid">
        {Object.entries(candidateLabels).map(([key,label]) => <label className={'field '+(key==='currentAddress'?'field-wide':'')} key={key}>{label}{key==='middleName'?' (optional)':''}
          {key==='currentAddress' ? <textarea name={key} required maxLength={2000} rows={3} autoComplete="street-address"/> :
          <input name={key} required={key!=='middleName'} type={key==='email'?'email':key==='mobile'?'tel':'text'} maxLength={key==='mobile'?40:254}
            autoComplete={({firstName:'given-name',middleName:'additional-name',lastName:'family-name',email:'email',mobile:'tel',currentOrganization:'organization',currentDesignation:'organization-title',currentLocation:'address-level2'} as Record<string,string>)[key]}
            placeholder={key.includes('Salary')?'Annual amount and currency, e.g. INR 12,00,000':undefined}/>}
        </label>)}
      </div>
      <label className="field resume-upload">Upload Resume <input type="file" name="resume" accept=".pdf,application/pdf" required aria-describedby="resume-help"/><small id="resume-help">PDF only · Maximum 2 MB. Your resume is shared privately with our recruitment team.</small></label>
      <label className="application-consent"><input type="checkbox" name="consent" value="true" required/><span>I consent to I-Genext using my application details and resume to assess my suitability for employment and contact me about my application. For privacy requests, contact careers@i-genext.com.</span></label>
      </fieldset>
      {error && <p role="alert" className="admin-error">{error}</p>}<button className="btn btn-primary btn-large" disabled={busy}>{busy?'Submitting application…':'Submit application'}</button>
    </form>}
  </Modal>
}
export default function Careers() {
  const [jobs,setJobs] = useState<Job[]>([]), [query,setQuery] = useState(''), [department,setDepartment] = useState(''), [selected,setSelected] = useState<Job | null>(null)
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [refresh,setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    fetch('/api/jobs',{signal:controller.signal}).then(async response => {
      if (!response.ok) throw new Error('Openings could not be loaded. Please try again.')
      setJobs((await response.json()).jobs)
    }).catch(e => { if(e.name!=='AbortError') setError('Openings could not be loaded. Please try again.') }).finally(() => { if(!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  },[refresh])
  const visible = jobs.filter(job => (!department || job.department===department) && [job.title,job.location,job.department,job.description,job.experience,job.employmentType].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <section className="section careers-openings" id="careers"><div className="container-wide">
    <div className="section-heading-row"><div><div className="eyebrow"><span/> Careers at I-Genext</div><h2>Bring your curiosity.<br/><em>Build what comes next.</em></h2></div><p>Work where consulting expertise meets technology. Explore opportunities to solve meaningful business problems and grow with a team that turns ideas into outcomes.</p></div>
    <div className="jobs-toolbar"><label className="field">Search openings<input type="search" placeholder="Role, skill or location" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="field">Department<select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{[...new Set(jobs.map(job=>job.department))].sort().map(value=><option key={value}>{value}</option>)}</select></label></div>
    {loading ? <p role="status">Loading current openings…</p> : error ? <div role="alert"><p>{error}</p><button className="btn btn-primary" onClick={()=>setRefresh(x=>x+1)}>Try again</button></div> :
      <><p className="muted" role="status">{visible.length} {visible.length===1?'opening':'openings'}{query || department ? ' matching your search':''}</p>
        <div className="job-list">{visible.map(job=><article className="job-card" key={job.id}><div className="job-card-top"><div><span className="label">{job.department}</span><h3>{job.title}</h3><p>{job.location} · {job.employmentType} · {job.experience}</p></div><button className="btn btn-primary" onClick={()=>setSelected(job)} aria-label={'Apply for '+job.title}>Apply now ↗</button></div><details><summary>Role details</summary><p className="job-description">{job.description}</p></details></article>)}</div>
        {!visible.length && <div className="jobs-empty"><h3>{jobs.length ? 'No openings match your search.' : 'The next opportunity starts here.'}</h3><p>{jobs.length ? 'Try a different role, location or department.' : 'There are no open roles at the moment. Please check back for new opportunities.'}</p>{jobs.length>0 && <button className="text-action" onClick={()=>{setQuery('');setDepartment('')}}>Clear search and filters</button>}</div>}
      </>}
    {selected && <Application job={selected} close={()=>setSelected(null)}/>}
  </div></section>
}
