import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createAdminAuth, hashPassword, requestsCsv } from '../src/admin.js'
import { createApp } from '../src/app.js'
import { createContactStore, validateContact } from '../src/contact.js'
import { acknowledgementMessage, createMailer, startEmailWorker } from '../src/email.js'

const valid={name:'Client Name',email:'client@example.com',phone:'+91 98765 43210',designation:'Director',company:'Example Co',area:'Tech Solutions',message:'Please help us improve our reporting.',consent:'yes',website:''}
async function fixture(run, options={}) {
  const dir=await mkdtemp(join(tmpdir(),'igenext-admin-'))
  const credentialsFile=join(dir,'admin.json')
  await writeFile(credentialsFile,JSON.stringify({username:'admin',...await hashPassword('Test-only password 123!')}))
  const store=createContactStore({DATA_DIR:dir})
  const auth=createAdminAuth({credentialsFile,...options})
  const app=createApp(store,{auth})
  const server=app.listen(0,'127.0.0.1')
  await new Promise(resolve=>server.once('listening',resolve))
  const base='http://127.0.0.1:'+server.address().port
  try {await run({base,store,dir,credentialsFile})}
  finally {await new Promise(resolve=>server.close(resolve));await store.close();await rm(dir,{recursive:true,force:true})}
}
const login=(base,password='Test-only password 123!',headers={})=>fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({username:'admin',password})})
test('designation/mobile validation accepts formatting and rejects invalid or missing values',()=>{
  assert.ok(validateContact(valid).data)
  for(const patch of [{phone:'abc1234567'},{phone:'+123'},{phone:'+1234567890123456'},{designation:''},{phone:undefined},{designation:42}]) assert.ok(validateContact({...valid,...patch}).error)
})
test('admin protects list/export, rotates cookies, exports all fields and invalidates logout',async()=>{
  await fixture(async({base,store})=>{
    await store.save(valid)
    assert.equal((await fetch(base+'/api/admin/requests')).status,401)
    assert.equal((await fetch(base+'/api/admin/requests/export')).status,401)
    assert.equal((await login(base,'incorrect')).status,401)
    const response=await login(base)
    assert.equal(response.status,200)
    const raw=response.headers.get('set-cookie')
    assert.match(raw,/HttpOnly/);assert.match(raw,/SameSite=Strict/)
    const headers={Cookie:raw.split(';')[0]}
    const listed=await fetch(base+'/api/admin/requests',{headers})
    assert.equal(listed.headers.get('cache-control'),'no-store')
    const result=await listed.json()
    assert.equal(result.rows[0].designation,'Director')
    assert.equal(result.rows[0].phone,valid.phone)
    const csv=await fetch(base+'/api/admin/requests/export',{headers})
    assert.match(csv.headers.get('content-type'),/text\/csv/)
    assert.match(await csv.text(),/Director/)
    await fetch(base+'/api/admin/logout',{method:'POST',headers})
    assert.equal((await fetch(base+'/api/admin/requests',{headers})).status,401)
  })
})
test('admin rejects cross-origin login and limits repeated attempts',async()=>{
  await fixture(async({base})=>{
    assert.equal((await login(base,undefined,{Origin:'https://evil.example'})).status,403)
    assert.equal((await login(base,'wrong')).status,401)
    assert.equal((await login(base,'wrong')).status,401)
    assert.equal((await login(base)).status,429)
  },{maxAttempts:2})
})
test('credential replacement invalidates existing sessions',async()=>{
  await fixture(async({base,credentialsFile})=>{
    const response=await login(base)
    const headers={Cookie:response.headers.get('set-cookie').split(';')[0]}
    await writeFile(credentialsFile,JSON.stringify({username:'admin',...await hashPassword('Changed test password 123!')}))
    assert.equal((await fetch(base+'/api/admin/session',{headers})).status,401)
  })
})
test('CSV preserves quoted multiline messages and neutralises spreadsheet formula prefixes',()=>{
  const csv=requestsCsv([{name:'=HYPERLINK("unsafe")',phone:'+91 1234567890',message:'First line, "quoted"\nSecond line',company:'  @formula'}])
  assert.ok(csv.startsWith('\uFEFF'))
  assert.match(csv,/"'=HYPERLINK\(""unsafe""\)"/)
  assert.match(csv,/"First line, ""quoted""\nSecond line"/)
  assert.match(csv,/"'  @formula"/)
})
test('legacy contacts remain visible and new acknowledgements persist across restarts',async()=>{
  await fixture(async({store,dir})=>{
    await writeFile(join(dir,'contact-leads.jsonl'),JSON.stringify({reference:'legacy',name:'Legacy Client',email:'legacy@example.com',company:'Old Co',area:'Finance',message:'Older enquiry',createdAt:'2026-01-01'})+'\n')
    const reference=await store.save(valid)
    const reloaded=createContactStore({DATA_DIR:dir})
    const rows=await reloaded.listRequests()
    assert.equal(rows.find(x=>x.reference==='legacy').emailStatus,'not_requested')
    assert.equal(rows.find(x=>x.reference==='legacy').phone,'')
    const lead=await reloaded.claimEmail()
    assert.equal(lead.reference,reference)
    assert.equal(await reloaded.claimEmail(),null)
    await reloaded.finishEmail(reference,true,lead.attempts)
    assert.equal((await reloaded.listRequests()).find(x=>x.reference===reference).emailStatus,'sent')
  })
})
test('failed acknowledgements keep the enquiry and eventually show needs attention',async()=>{
  await fixture(async({store,dir})=>{
    const reference=await store.save(valid)
    const lead=await store.claimEmail()
    await store.finishEmail(reference,false,lead.attempts)
    assert.equal((await store.listRequests())[0].emailStatus,'pending')
    await store.finishEmail(reference,false,3)
    assert.equal((await store.listRequests())[0].emailStatus,'failed')
    assert.equal(await store.claimEmail(),null)
    assert.match(await readFile(join(dir,'contact-leads.jsonl'),'utf8'),/Client Name/)
  })
})
test('acknowledgement escapes personal text and includes the soft response template',()=>{
  const message=acknowledgementMessage({name:'<script>alert(1)</script>',reference:'IG-1'})
  assert.match(message.text,/two business days/)
  assert.match(message.text,/Thank you so much/)
  assert.ok(!message.html.includes('<script>'))
  assert.match(message.html,/&lt;script&gt;/)
})
test('Microsoft 365 requests use the selected mailbox, app authentication and cached token',async()=>{
  const calls=[]
  const request=async(url,options)=>{
    calls.push({url,options})
    return url.includes('/token')?new Response(JSON.stringify({access_token:'test-token',expires_in:3600}),{status:200}):new Response(null,{status:202})
  }
  const mailer=createMailer({M365_TENANT_ID:'tenant',M365_CLIENT_ID:'client',M365_CLIENT_SECRET:'secret',EMAIL_FROM:'info@i-genext.com'},request)
  await mailer.send({...valid,reference:'IG-test'})
  await mailer.send({...valid,reference:'IG-test2'})
  assert.equal(calls.length,3)
  assert.match(calls[1].url,/users\/info%40i-genext.com\/sendMail/)
  const body=JSON.parse(calls[1].options.body)
  assert.equal(body.saveToSentItems,true)
  assert.equal(body.message.toRecipients[0].emailAddress.address,valid.email)
  assert.equal(calls[0].options.body.get('scope'),'https://graph.microsoft.com/.default')
})
test('provider failures are reported and unconfigured email does not send',async()=>{
  const mailer=createMailer({M365_TENANT_ID:'t',M365_CLIENT_ID:'c',M365_CLIENT_SECRET:'s'},async()=>new Response(null,{status:403}))
  await assert.rejects(()=>mailer.send({...valid,reference:'IG-1'}))
  const disabled=createMailer({})
  assert.equal(disabled.configured,false)
  await assert.rejects(()=>disabled.send(valid))
})
test('email worker processes the persisted queue with a mocked delivery provider',async()=>{
  await fixture(async({store})=>{
    await store.save(valid)
    let finish
    const done=new Promise(resolve=>{finish=resolve})
    const original=store.finishEmail
    store.finishEmail=async(...args)=>{await original(...args);finish()}
    const sent=[]
    const worker=startEmailWorker(store,{configured:true,send:async lead=>sent.push(lead.email),close(){}},{intervalMs:100000})
    await done
    await worker.stop()
    assert.deepEqual(sent,[valid.email])
    assert.equal((await store.listRequests())[0].emailStatus,'sent')
  })
})

test('interrupted final delivery attempts become failed after the processing lease',async()=>{
  await fixture(async({store,dir})=>{
    const reference=await store.save(valid)
    await writeFile(join(dir,'acknowledgements.jsonl'),JSON.stringify({reference,status:'sending',attempts:3,nextAttemptAt:'2020-01-01T00:00:00Z'})+'\n')
    assert.equal((await store.listRequests())[0].emailStatus,'failed')
    assert.equal(await store.claimEmail(),null)
  })
})
