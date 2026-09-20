import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { createApp } from '../src/app.js'
import { createAdminAuth,hashPassword } from '../src/admin.js'
import { createInsightStore,validateInsight,publicHttps } from '../src/insights-store.js'
import { createSocialConfiguration } from '../src/social-config.js'
import { createSocialPublisher,socialPreview } from '../src/social-publisher.js'
const content={title:'A practical AI roadmap',slug:'practical-ai-roadmap',summary:'An original perspective on adopting AI responsibly.',topic:'Transformation',author:'I-Genext',status:'draft',imageUrl:'',body:[['Start with outcomes','Choose a measurable business outcome before selecting technology.']]}
async function fixture(work,{publisher}={}){
 const directory=await mkdtemp(join(tmpdir(),'igenext-insights-')),credentialsFile=join(directory,'admin.json')
 await writeFile(credentialsFile,JSON.stringify({username:'admin',...await hashPassword('Fixture insights password 123!')}))
 const store=createInsightStore({directory,databaseUrl:'',nodeEnv:'test',seeds:[]});await store.ready
 const configuration=createSocialConfiguration(store,{INSIGHTS_DATA_DIR:directory,SOCIAL_ENCRYPTION_KEY:randomBytes(32).toString('base64')})
 const app=createApp({mode:'test'},{auth:createAdminAuth({credentialsFile}),insightStore:store,socialConfiguration:configuration,socialPublisher:publisher||{verify:async p=>({id:p==='x'?'100':p==='facebook'?'200':'300',label:'Company '+p}),publish:async p=>({remoteId:'post-'+p,remoteUrl:'https://x.com/i/web/status/123'})}})
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'Fixture insights password 123!'})})
 const headers={Cookie:login.headers.get('set-cookie').split(';')[0],'Content-Type':'application/json',Origin:base}
 const api=(path,body,method=body?'POST':'GET')=>fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})})
 async function configure(){
  const settings=await (await api('/api/admin/social-settings')).json()
  for(const p of ['x','facebook','instagram'])settings.accounts[p]={...settings.accounts[p],token:'private-secret-'+p,clearToken:false}
  settings.siteUrl='https://www.i-genext.com'
  assert.equal((await api('/api/admin/social-settings',settings,'PUT')).status,200)
  for(const p of ['x','facebook','instagram'])assert.equal((await api('/api/admin/social-settings/'+p+'/verify',{})).status,200)
 }
 try{await work({directory,store,configuration,base,headers,api,configure})}
 finally{await new Promise(resolve=>server.close(resolve));await store.close();await rm(directory,{recursive:true,force:true})}
}
test('insight validation rejects malformed content and unsafe URLs',()=>{
 assert.equal(validateInsight(content).readMinutes,1)
 for(const patch of [{slug:'../admin'},{title:''},{status:'deleted'},{body:[]},{body:[['heading','']]},{imageUrl:'http://localhost/private'},{imageUrl:'javascript:alert(1)'}])assert.throws(()=>validateInsight({...content,...patch}))
 assert.throws(()=>publicHttps('https://127.0.0.1/a.jpg'))
 assert.throws(()=>publicHttps('https://user:secret@images.i-genext.com/a.jpg'))
 assert.throws(()=>createInsightStore({databaseUrl:'',nodeEnv:'production'}),/DATABASE_URL/)
})
test('insights CRUD protects admin actions, publishes real article pages and preserves edits/deletion after restart',async()=>{
 await fixture(async({store,base,api,directory,headers})=>{
  assert.equal((await fetch(base+'/api/admin/insights')).status,401)
  assert.equal((await fetch(base+'/api/admin/social-settings')).status,401)
  assert.equal((await fetch(base+'/api/admin/insights',{method:'POST',headers:{...headers,Origin:'https://foreign.example'},body:JSON.stringify(content)})).status,403)
  const saved=await api('/api/admin/insights',content);assert.equal(saved.status,201);let {row}=await saved.json()
  assert.equal((await (await fetch(base+'/api/insights')).json()).rows.length,0)
  assert.equal((await fetch(base+'/insights/'+row.slug)).status,404)
  const updates=await Promise.all([api('/api/admin/insights/'+row.id,{...row,status:'published'},'PUT'),api('/api/admin/insights/'+row.id,{...row,status:'published'},'PUT')])
  assert.deepEqual(updates.map(x=>x.status).sort(),[200,409])
  row=(await (await api('/api/admin/insights/'+row.id)).json()).row
  assert.equal((await (await fetch(base+'/api/insights')).json()).rows[0].title,content.title)
  const page=await fetch(base+'/insights/'+row.slug),html=await page.text();assert.ok(html.includes('Choose a measurable business outcome'));assert.match(html,/og:title/);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/)
  let updated=await api('/api/admin/insights/'+row.id,{...row,title:'<script>alert(1)</script>'},'PUT')
  row=(await updated.json()).row
  assert.match(await (await fetch(base+'/insights/'+row.slug)).text(),/&lt;script&gt;/)
  assert.equal((await api('/api/admin/insights/'+row.id,{version:1},'DELETE')).status,409)
  assert.equal((await api('/api/admin/insights/'+row.id,{version:row.version},'DELETE')).status,200)
  assert.equal((await fetch(base+'/insights/'+row.slug)).status,404)
  const restart=createInsightStore({directory,databaseUrl:'',nodeEnv:'test',seeds:[content]});await restart.ready
  assert.equal((await restart.list()).length,0);await restart.close()
 })
})
test('social credentials stay encrypted and masked; configuration versions and account identity are enforced',async()=>{
 await fixture(async({api,configure,directory,configuration})=>{
  await configure()
  const response=await api('/api/admin/social-settings'),text=await response.text(),settings=JSON.parse(text)
  assert.ok(!text.includes('private-secret'));assert.equal(settings.accounts.x.configured,true)
  const disk=await readFile(join(directory,'content.json'),'utf8');assert.ok(!disk.includes('private-secret'))
  assert.equal((await configuration.internal()).accounts.x.token,'private-secret-x')
  const old=structuredClone(settings)
  for(const account of Object.values(settings.accounts)){account.token='';account.clearToken=false}
  assert.equal((await api('/api/admin/social-settings',settings,'PUT')).status,200)
  for(const account of Object.values(old.accounts)){account.token='';account.clearToken=false}
  assert.equal((await api('/api/admin/social-settings',old,'PUT')).status,409)
  const current=await (await api('/api/admin/social-settings')).json()
  for(const account of Object.values(current.accounts)){account.token='';account.clearToken=false}
  current.accounts.x.accountId='999'
  assert.equal((await api('/api/admin/social-settings',current,'PUT')).status,200)
  assert.equal((await api('/api/admin/social-settings/x/verify',{})).status,400)
 })
})
test('social preview blocks unconfigured accounts, detects stale content and prevents concurrent duplicate posts',async()=>{
 let count=0
 await fixture(async({api,configure})=>{
  let row=(await (await api('/api/admin/insights',{...content,status:'published'})).json()).row
  let preview=await (await api('/api/admin/insights/'+row.id+'/social-preview',{platform:'x',caption:'Read our perspective'})).json()
  assert.ok(preview.errors.length>0)
  await configure()
  preview=await (await api('/api/admin/insights/'+row.id+'/social-preview',{platform:'x',caption:'Read our perspective'})).json()
  assert.deepEqual(preview.errors,[])
  const payload={...preview,confirm:true}
  assert.equal((await api('/api/admin/insights/'+row.id+'/social-publish',{...payload,fingerprint:'stale'})).status,409)
  const responses=await Promise.all([api('/api/admin/insights/'+row.id+'/social-publish',payload),api('/api/admin/insights/'+row.id+'/social-publish',payload)])
  assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);assert.equal(count,1)
  const history=await (await api('/api/admin/insights/'+row.id)).json()
  assert.equal(history.posts[0].status,'published');assert.ok(history.posts[0].text.includes('/insights/'+row.slug))
  const instagram=await (await api('/api/admin/insights/'+row.id+'/social-preview',{platform:'instagram',caption:'Read more'})).json()
  assert.ok(instagram.errors.some(x=>x.includes('JPEG')))
 },{publisher:{verify:async p=>({id:'123',label:'Company '+p}),publish:async()=>{count++;return {remoteId:'remote-1',remoteUrl:'https://x.com/i/web/status/123'}}}})
})
test('uncertain publishing requires manual reconciliation and never retries automatically',async()=>{
 await fixture(async({api,configure})=>{
  await configure()
  const row=(await (await api('/api/admin/insights',{...content,status:'published'})).json()).row
  const preview=await (await api('/api/admin/insights/'+row.id+'/social-preview',{platform:'x',caption:'Read more'})).json(),payload={...preview,confirm:true}
  const first=await (await api('/api/admin/insights/'+row.id+'/social-publish',payload)).json()
  assert.equal(first.post.status,'unknown')
  assert.equal((await api('/api/admin/insights/'+row.id+'/social-publish',payload)).status,409)
  assert.equal((await api('/api/admin/social-posts/'+first.post.id+'/resolve',{confirm:true,resolution:'not-published'})).status,200)
  const data=await (await api('/api/admin/insights/'+row.id)).json();assert.equal(data.posts[0].status,'failed')
 },{publisher:{verify:async()=>({id:'123',label:'Company'}),publish:async()=>{throw Object.assign(Error('Check account before retrying.'),{uncertain:true})}}})
})
test('platform adapters use account-scoped credentials and Instagram create/status/publish flow',async()=>{
 const calls=[]
 const publisher=createSocialPublisher({pause:async()=>{},request:async(url,options)=>{
  calls.push({url,options})
  const data=url.endsWith('/2/tweets')?{data:{id:'901'}}:url.endsWith('/feed')?{id:'902'}:url.endsWith('/media_publish')?{id:'903'}:url.endsWith('/media')?{id:'container-1'}:url.includes('status_code')?{status_code:'FINISHED'}:url.includes('permalink')?{permalink:'https://www.instagram.com/p/example/'}:url.includes('/users/me')?{data:{id:'100',username:'igenext'}}:{id:'200',name:'Company',username:'igenext'}
  return new Response(JSON.stringify(data),{status:200})
 }})
 const settings={graphVersion:'v25.0',accounts:Object.fromEntries(['x','facebook','instagram'].map(p=>[p,{token:'secret-'+p,accountId:'123',verifiedAt:'now'}]))}
 const preview={text:'A perspective\n\nhttps://www.i-genext.com/insights/a',caption:'A perspective',url:'https://www.i-genext.com/insights/a',imageUrl:'https://media.i-genext.com/cover.jpg'}
 assert.equal((await publisher.verify('x',settings)).id,'100')
 assert.equal((await publisher.publish('x',preview,settings)).remoteId,'901')
 assert.equal((await publisher.publish('facebook',preview,settings)).remoteId,'902')
 assert.equal((await publisher.publish('instagram',preview,settings)).remoteId,'903')
 const x=calls.find(x=>x.url.endsWith('/2/tweets'));assert.equal(x.options.headers.Authorization,'Bearer secret-x');assert.equal(JSON.parse(x.options.body).text,preview.text)
 const create=calls.find(x=>x.url.endsWith('/media'));assert.equal(JSON.parse(create.options.body).image_url,preview.imageUrl)
 assert.ok(calls.find(x=>x.url.includes('status_code')))
 const publish=calls.find(x=>x.url.endsWith('/media_publish'));assert.equal(JSON.parse(publish.options.body).creation_id,'container-1')
 const long=socialPreview({...content,id:'a',version:1,status:'published'},'x','界'.repeat(200),{version:1,siteUrl:'https://www.i-genext.com',accounts:{x:{configured:true,verifiedAt:'now',accountId:'1'}}})
 assert.ok(long.count>280);assert.ok(long.errors.length>0)
})
