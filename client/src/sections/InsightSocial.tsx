import { useEffect,useState } from 'react'
import type { Insight } from '../lib/insights'
import { socialNames } from './SocialAccounts'
import type { CmsRequest } from './SocialAccounts'
type Preview={fingerprint:string;platform:string;text:string;caption:string;url:string;imageUrl:string;count:number;limit:number;errors:string[];account:string;accountId:string;version:number}
type Post={id:string;platform:string;status:string;remoteId?:string;remoteUrl?:string;error?:string;account:string;updatedAt:string}
export default function InsightSocial({insight,request}:{insight:Insight;request:CmsRequest}){
 const [platform,setPlatform]=useState('x'),[caption,setCaption]=useState(insight.title),[preview,setPreview]=useState<Preview|null>(null),[posts,setPosts]=useState<Post[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false)
 async function history(){const result=await request('/api/admin/insights/'+insight.id);setPosts(result.posts)}
 useEffect(()=>{history().catch(e=>setError(e.message))},[insight.id])
 function reset(){setPreview(null);setConfirmed(false);setNotice('')}
 async function review(){setBusy(true);setError('');setConfirmed(false);try{setPreview(await request('/api/admin/insights/'+insight.id+'/social-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform,caption})}))}catch(e){setError(e instanceof Error?e.message:'Unable to preview.')}finally{setBusy(false)}}
 async function publish(){
  if(!preview)return
  setBusy(true);setError('');setNotice('')
  try{const result=await request('/api/admin/insights/'+insight.id+'/social-publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:preview.platform,caption:preview.caption,version:preview.version,accountId:preview.accountId,fingerprint:preview.fingerprint,confirm:confirmed})});setNotice(result.post.status==='published'?'Published to '+socialNames[preview.platform]+'.':result.post.status==='unknown'?'The result is uncertain. Check the company account before retrying.':'The platform rejected this post. Review the delivery details below.');await history();setConfirmed(false)}
  catch(e){setError(e instanceof Error?e.message:'Publishing result unavailable. Refresh the delivery history before retrying.');await history().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function reconcile(post:Post,published:boolean){
  const remoteId=published?window.prompt('Enter the post ID after confirming it exists on the company account:'):''
  if(published&&!remoteId)return
  if(!window.confirm(published?'Mark this as published based on your account check?':'Confirm you checked the company account and this post does not exist. This enables another publishing attempt.'))return
  setBusy(true);setError('')
  try{await request('/api/admin/social-posts/'+post.id+'/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true,resolution:published?'published':'not-published',remoteId})});await history()}catch(e){setError(e instanceof Error?e.message:'Unable to update delivery.')}finally{setBusy(false)}
 }
 const existing=posts.find(p=>p.platform===platform),blocked=existing&&existing.status!=='failed'
 return <section className="insight-social"><h2>Share to social</h2><p>Save your article changes first. Preview the caption and destination, then publish to one company account at a time. Editing or deleting an insight does not edit or delete existing social posts.</p>
 {error&&<p role="alert" className="admin-error">{error}</p>}{notice&&<p role="status" className="admin-notice">{notice}</p>}
 <fieldset disabled={busy}><legend className="sr-only">Social post</legend><label className="field">Platform<select aria-label="Platform" value={platform} onChange={e=>{setPlatform(e.target.value);reset()}}>{Object.entries(socialNames).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label className="field">Social caption<textarea aria-label="Social caption" rows={4} maxLength={10000} value={caption} onChange={e=>{setCaption(e.target.value);reset()}}/></label><button className="admin-secondary" type="button" onClick={review}>Preview social post</button>
 {preview&&<div className="social-preview"><span className="label">{socialNames[preview.platform]} · {preview.account}</span>{preview.platform==='instagram'&&preview.imageUrl&&<img src={preview.imageUrl} alt="Instagram post preview" referrerPolicy="no-referrer"/>}<p className="social-caption">{preview.text}</p><p>{preview.count} / {preview.limit} characters</p>{preview.platform==='instagram'&&<p>Instagram publishes the cover image and caption. Links in captions are not clickable.</p>}{preview.errors.length>0&&<ul className="admin-error">{preview.errors.map(message=><li key={message}>{message}</li>)}</ul>}
 {blocked?<p>This insight already has a {existing.status} delivery for {socialNames[platform]}. Review the history below.</p>:<><label className="social-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={preview.errors.length>0}/>I reviewed this post and its company account destination.</label><button className="btn btn-primary btn-large" type="button" disabled={!confirmed||preview.errors.length>0} onClick={publish}>{busy?'Publishing…':'Publish to '+socialNames[preview.platform]}</button></>}</div>}
 </fieldset>
 <div className="insight-editor-heading"><h3>Delivery history</h3><button className="admin-secondary" disabled={busy} onClick={()=>history().catch(e=>setError(e.message))}>Refresh deliveries</button></div>
 {!posts.length?<p>No social posts have been sent for this insight.</p>:posts.map(post=><div className="social-receipt" key={post.id}><strong>{socialNames[post.platform]} · {post.status}</strong><p>{post.account} · {new Date(post.updatedAt).toLocaleString()}</p>{post.remoteId&&<p>Post ID: {post.remoteId}</p>}{post.remoteUrl&&<a href={post.remoteUrl} target="_blank" rel="noreferrer">Open published post ↗</a>}{post.error&&<p>{post.error}</p>}{post.status==='unknown'&&<div className="cms-actions"><button className="admin-secondary" disabled={busy} onClick={()=>reconcile(post,true)}>I found the published post</button><button className="admin-secondary" disabled={busy} onClick={()=>reconcile(post,false)}>I confirmed no post exists</button></div>}</div>)}
 </section>
}
