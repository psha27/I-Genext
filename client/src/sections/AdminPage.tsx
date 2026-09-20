import AdminHero from './AdminHero'
import AdminPlatforms from './AdminPlatforms'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { DeckLogo } from './ProfileSections'
import '../admin.css'
import AdminCareers from './AdminCareers'
import AdminInsights from './AdminInsights'

type RequestRow = { reference: string; createdAt: string; name: string; email: string; phone: string; designation: string; company: string; area: string; message: string; emailStatus: string }
type RequestPage = { rows: RequestRow[]; total: number; allTotal: number; page: number; totalPages: number }
const statusLabel: Record<string,string> = { pending: 'Queued', sending: 'Sending', sent: 'Accepted by Microsoft 365', failed: 'Needs attention', not_requested: 'Legacy enquiry' }
export default function AdminPage() {
  const [tab,setTab] = useState<'enquiries'|'jobs'|'applications'|'insights'|'platforms'|'hero'>(location.hash==='#hero'?'hero':location.hash==='#platforms'?'platforms':new URLSearchParams(location.search).has('insight') || location.hash==='#insights'?'insights':'enquiries')
  const [username,setUsername] = useState<string | null>(null)
  const [checking,setChecking] = useState(true)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const [query,setQuery] = useState('')
  const [page,setPage] = useState(1)
  const [refresh,setRefresh] = useState(0)
  const [data,setData] = useState<RequestPage | null>(null)
  const [loading,setLoading] = useState(false)
  const [emailConfigured,setEmailConfigured] = useState(false)
  const [exporting,setExporting] = useState(false)
  useEffect(() => {
    document.title = 'Admin | I-Genext'
    const controller = new AbortController()
    fetch('/api/admin/session',{signal:controller.signal}).then(async r => {
      if(r.status === 401) return
      if(!r.ok) throw new Error()
      const result=await r.json();setUsername(result.username);setEmailConfigured(result.emailConfigured)
    }).catch(e => { if(e.name !== 'AbortError') setError('Unable to reach the admin service. Please try again.') }).finally(()=>setChecking(false))
    return ()=>controller.abort()
  },[])
  useEffect(() => {
    if(!username || tab!=='enquiries') return
    const controller = new AbortController()
    setLoading(true);setError('')
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch('/api/admin/requests?q='+encodeURIComponent(query)+'&page='+page,{signal:controller.signal})
        if(response.status===401){setUsername(null);setData(null);setError('Your session has ended. Please sign in again.');return}
        if(!response.ok) throw new Error('Requests could not be loaded. Please try again.')
        setData(await response.json())
      } catch(e) { if(e instanceof Error && e.name!=='AbortError') setError(e.message) }
      finally { if(!controller.signal.aborted) setLoading(false) }
    },200)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[username,query,page,refresh,tab])
  async function login(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError('')
    const fields=Object.fromEntries(new FormData(e.currentTarget))
    try {
      const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)})
      const result=await response.json()
      if(!response.ok) throw new Error(result.message || 'Unable to sign in.')
      const session=await fetch('/api/admin/session')
      if(!session.ok) throw new Error('Your session could not be established. Please try again.')
      const details=await session.json();setUsername(details.username);setEmailConfigured(details.emailConfigured)
    } catch(e) { setError(e instanceof Error && e.name!=='SyntaxError' ? e.message : 'Unable to reach the admin service. Please try again.') }
    finally {setBusy(false)}
  }
  async function logout() {
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/logout',{method:'POST'})
      if(!response.ok) throw new Error()
      setUsername(null);setData(null);setQuery('');setPage(1)
    } catch {setError('Sign-out could not be completed. Please try again.')}
    finally {setBusy(false)}
  }
  async function download() {
    setExporting(true);setError('')
    try {
      const response=await fetch('/api/admin/requests/export')
      if(response.status===401){setUsername(null);setData(null);throw new Error('Your session has ended. Please sign in again.')}
      if(!response.ok) throw new Error('The export could not be created. Please try again.')
      const url=URL.createObjectURL(await response.blob())
      const a=document.createElement('a');a.href=url;a.download='igenext-contact-requests.csv';a.click()
      setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch(e) {setError(e instanceof Error ? e.message : 'The export could not be created.')}
    finally {setExporting(false)}
  }
  return <div className="admin-shell"><header className="admin-header"><a href="/" aria-label="I-Genext home"><DeckLogo brand="igenext"/></a><span>ADMINISTRATION</span><a href="/">Back to website</a></header>
    <main className="admin-main">{checking ? <p role="status">Checking your session…</p> : !username ? <div className="admin-login-layout"><div><div className="eyebrow"><span/> I-Genext administration</div><h1>Every conversation.<br/><em>A new possibility.</em></h1><p>A dedicated workspace to review client enquiries and connect them with the right team.</p></div><form className="admin-login" onSubmit={login}><span className="label">Authorised access</span><h2>Welcome back.</h2><p>Sign in to manage enquiries, openings and applications.</p><label className="field">Username<input name="username" autoComplete="username" defaultValue="admin" required maxLength={100}/></label><label className="field">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label>{error && <p className="admin-error" role="alert">{error}</p>}<button className="btn btn-primary btn-large" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></div> :
    <><div className="admin-title"><div><div className="eyebrow"><span/> Client connections</div><h1>Company workspace</h1><p>Signed in as {username}</p></div><button className="admin-secondary" onClick={logout} disabled={busy}>Sign out</button></div>
      {!emailConfigured && <p className="admin-notice">Email acknowledgements are queued. Microsoft 365 credentials must be configured before they can be sent.</p>}
      <nav className="admin-tabs" aria-label="Admin sections">{([['enquiries','Client enquiries'],['jobs','Job openings'],['applications','Applications'],['insights','Insights'],['platforms','Platform sections'],['hero','Hero banner']] as const).map(([value,label])=><button key={value} className="admin-secondary" aria-pressed={tab===value} onClick={()=>{setTab(value);setError('')}}>{label}</button>)}</nav>
      {tab==='hero' ? <AdminHero sessionExpired={()=>{setUsername(null);setData(null)}}/> : tab==='platforms' ? <AdminPlatforms sessionExpired={()=>{setUsername(null);setData(null)}}/> : tab==='insights' ? <AdminInsights sessionExpired={()=>{setUsername(null);setData(null)}}/> : tab!=='enquiries' ? <AdminCareers key={tab} mode={tab} sessionExpired={()=>{setUsername(null);setData(null)}}/> : <>
      <div className="admin-toolbar"><label className="field">Search requests<input type="search" placeholder="Name, company, email or message" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><button className="admin-secondary" onClick={()=>setRefresh(x=>x+1)} disabled={loading}>Refresh</button><button className="btn btn-primary btn-large" onClick={download} disabled={exporting || !data}>{exporting?'Preparing download…':'Download all requests (CSV)'}</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}<p className="admin-count" role="status">{loading?'Loading requests…':data ? data.total+' matching requests · '+data.allTotal+' total' : 'No data loaded'}</p>
      {data && <><div className="admin-table-wrap"><table className="admin-table"><caption className="sr-only">Client enquiries</caption><thead><tr><th>Submitted / reference</th><th>Client</th><th>Contact details</th><th>Enquiry</th><th>Acknowledgement</th></tr></thead><tbody>{data.rows.map(row=><tr key={row.reference}><td><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time><small>{row.reference}</small></td><td><strong>{row.name}</strong><span>{row.designation || 'Designation not provided'}</span><span>{row.company}</span></td><td><span>{row.email}</span><span>{row.phone || 'Mobile not provided'}</span></td><td><strong>{row.area}</strong><details><summary>View message</summary><p className="admin-message">{row.message}</p></details></td><td><span className={'email-state state-'+row.emailStatus}>{statusLabel[row.emailStatus] || row.emailStatus}</span></td></tr>)}</tbody></table></div>
      {!data.rows.length && <div className="admin-empty"><h2>No requests found.</h2><p>{query?'Try another search term.':'New contact enquiries will appear here.'}</p></div>}
      <div className="admin-pagination"><button className="admin-secondary" disabled={data.page<=1 || loading} onClick={()=>setPage(data.page-1)}>Previous</button><span>Page {data.page} of {data.totalPages}</span><button className="admin-secondary" disabled={data.page>=data.totalPages || loading} onClick={()=>setPage(data.page+1)}>Next</button></div></>}
      <p className="admin-footnote">Downloads include every request, regardless of the current search. “Accepted by Microsoft 365” means submitted to the provider; it does not confirm inbox delivery.</p>
    </>}
    </>}</main></div>
}
