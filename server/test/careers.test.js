import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createCareersStore } from '../src/careers-store.js'
import { createApp } from '../src/app.js'
import { createAdminAuth,hashPassword } from '../src/admin.js'
import { validateApplication,validateJob } from '../src/careers.js'
import { careerEmail } from '../src/careers-email.js'
import { createMailer } from '../src/email.js'
const job = {title:'Technology Consultant',location:'Mumbai / Hybrid',department:'Consulting',experience:'3–5 years',employmentType:'Full-time',description:'Design and deliver technology-led transformation.',status:'open'}
const candidate = {firstName:'Asha',middleName:'',lastName:'Sharma',email:'asha@example.com',mobile:'+91 9876543210',currentOrganization:'Example Co',currentDesignation:'Consultant',currentLocation:'Mumbai',currentAddress:'10 Test Road, Mumbai',currentSalary:'INR 12,00,000',expectedSalary:'INR 15,00,000',consent:'true'}
const pdf = Buffer.from('%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF')
const file = {originalname:'resume.pdf',mimetype:'application/pdf',buffer:pdf}
function form(patch={},resume=pdf) {
  const result = new FormData()
  for (const [key,value] of Object.entries({...candidate,...patch})) result.set(key,value)
  result.set('resume',new Blob([resume],{type:'application/pdf'}),'resume.pdf')
  return result
}
async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(),'igenext-careers-'))
  const credentialsFile=join(directory,'admin.json')
  await writeFile(credentialsFile,JSON.stringify({username:'admin',...await hashPassword('Fixture password 123!')}))
  const store=createCareersStore({directory,databaseUrl:'',nodeEnv:'test'})
  const app=createApp({mode:'test'},{auth:createAdminAuth({credentialsFile}),careersStore:store})
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
  const base='http://127.0.0.1:'+server.address().port
  const response=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'Fixture password 123!'})})
  const headers={Cookie:response.headers.get('set-cookie').split(';')[0],'Content-Type':'application/json',Origin:base}
  try{await run({store,base,headers,directory})}
  finally{await new Promise(resolve=>server.close(resolve));await store.close();await rm(directory,{recursive:true,force:true})}
}
test('careers validates required candidate fields, consent and actual PDF content',()=>{
  assert.equal(validateApplication(candidate,file).middleName,'')
  for(const key of Object.keys(candidate).filter(k=>k!=='middleName')) assert.throws(()=>validateApplication({...candidate,[key]:''},file))
  assert.throws(()=>validateApplication({...candidate,email:'invalid'},file))
  assert.throws(()=>validateApplication({...candidate,mobile:'invalid'},file))
  assert.throws(()=>validateApplication(candidate,{...file,buffer:Buffer.from('<script>bad</script>')}))
  assert.throws(()=>validateApplication(candidate,{...file,originalname:'resume.html'}))
  assert.throws(()=>validateJob({...job,status:'unknown'}))
  assert.throws(()=>createCareersStore({databaseUrl:'',nodeEnv:'production'}),/DATABASE_URL/)
})
test('publish, apply, search, protected resume, close and reopen flow persists across restart',async()=>{
 await fixture(async({store,base,headers,directory})=>{
  assert.equal((await fetch(base+'/api/admin/jobs')).status,401)
  assert.equal((await fetch(base+'/api/admin/applications')).status,401)
  assert.equal((await fetch(base+'/api/admin/jobs',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:JSON.stringify(job)})).status,403)
  const saved=await fetch(base+'/api/admin/jobs',{method:'POST',headers,body:JSON.stringify({...job,status:'draft'})})
  assert.equal(saved.status,201);const {job:opening}=await saved.json()
  assert.equal((await (await fetch(base+'/api/jobs')).json()).jobs.length,0)
  assert.equal((await fetch(base+'/api/jobs/'+opening.id+'/applications',{method:'POST',body:form()})).status,409)
  await fetch(base+'/api/admin/jobs/'+opening.id,{method:'PUT',headers,body:JSON.stringify(job)})
  assert.equal((await (await fetch(base+'/api/jobs')).json()).jobs[0].title,job.title)
  const applied=await fetch(base+'/api/jobs/'+opening.id+'/applications',{method:'POST',body:form()})
  assert.equal(applied.status,201);const {reference}=await applied.json();assert.match(reference,/^IG-APP-/)
  assert.equal((await fetch(base+'/api/admin/applications/'+reference+'/resume')).status,401)
  const downloaded=await fetch(base+'/api/admin/applications/'+reference+'/resume',{headers})
  assert.match(downloaded.headers.get('content-disposition'),/attachment/)
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),pdf)
  const all=await (await fetch(base+'/api/admin/applications?q='+reference,{headers})).json()
  assert.equal(all.total,1);assert.equal(all.rows[0].candidate.expectedSalary,candidate.expectedSalary)
  assert.equal(all.rows[0].emails.candidate,'pending');assert.equal(all.rows[0].emails.company,'pending')
  const recreated=createCareersStore({directory,databaseUrl:'',nodeEnv:'test'})
  assert.equal((await recreated.applications())[0].reference,reference)
  assert.deepEqual((await recreated.resume(reference)).buffer,pdf)
  await fetch(base+'/api/admin/jobs/'+opening.id,{method:'PUT',headers,body:JSON.stringify({...job,status:'closed'})})
  assert.equal((await fetch(base+'/api/jobs/'+opening.id+'/applications',{method:'POST',body:form()})).status,409)
  assert.equal((await store.applications()).length,1)
  await fetch(base+'/api/admin/jobs/'+opening.id,{method:'PUT',headers,body:JSON.stringify(job)})
  assert.equal((await (await fetch(base+'/api/jobs')).json()).jobs.length,1)
 })
})
test('upload rejects oversized, fake PDF, missing consent and foreign origin without storing applications',async()=>{
 await fixture(async({store,base})=>{
  const opening=await store.saveJob(job),url=base+'/api/jobs/'+opening.id+'/applications'
  assert.equal((await fetch(url,{method:'POST',body:form({},Buffer.alloc(2*1024*1024+1))})).status,400)
  assert.equal((await fetch(url,{method:'POST',body:form({},Buffer.from('<html>not a pdf</html>'))})).status,400)
  assert.equal((await fetch(url,{method:'POST',body:form({consent:'false'})})).status,400)
  assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://evil.example'},body:form()})).status,403)
  assert.equal((await store.applications()).length,0)
 })
})
test('career email tasks are independent, recoverable and include PDF only for recruiting',async()=>{
 await fixture(async({store,directory})=>{
  const opening=await store.saveJob(job),reference=await store.apply(opening.id,validateApplication({...candidate,firstName:'<Asha>'},file),file)
  const claims=await Promise.all([store.claimEmail(),store.claimEmail(),store.claimEmail()])
  assert.equal(claims.filter(Boolean).length,2);assert.notEqual(claims[0].reference,claims[1].reference)
  const candidateTask=claims.find(x=>x?.kind==='candidate'),companyTask=claims.find(x=>x?.kind==='company')
  const acknowledgement=await careerEmail(candidateTask,store)
  assert.equal(acknowledgement.email,candidate.email);assert.match(acknowledgement.mail.html,/&lt;Asha&gt;/)
  assert.ok(acknowledgement.mail.html.includes(reference));assert.equal(acknowledgement.mail.attachments,undefined)
  const notification=await careerEmail(companyTask,store)
  assert.equal(notification.email,'careers@i-genext.com');assert.equal(notification.mail.replyTo,candidate.email)
  assert.deepEqual(Buffer.from(notification.mail.attachments[0].contentBytes,'base64'),pdf)
  for(const value of [candidate.currentAddress,candidate.expectedSalary,job.title]) assert.ok(notification.mail.html.includes(value))
  await store.finishEmail(candidateTask.reference,true,candidateTask.attempts)
  await store.finishEmail(companyTask.reference,false,companyTask.attempts)
  let state=JSON.parse(await readFile(join(directory,'records.json'),'utf8'))
  const company=state.notifications.find(n=>n.kind==='company')
  company.status='sending';company.attempts=3;company.nextAttempt=0
  await writeFile(join(directory,'records.json'),JSON.stringify(state))
  assert.equal(await store.claimEmail(),null)
  assert.equal((await store.applications())[0].emails.company,'failed')
  await store.retryEmails(reference)
  const retry=await store.claimEmail()
  assert.equal(retry.kind,'company');assert.equal(retry.attempts,1)
  assert.equal((await store.applications())[0].emails.candidate,'sent')
  const requests=[]
  const mailer=createMailer({M365_TENANT_ID:'tenant',M365_CLIENT_ID:'client',M365_CLIENT_SECRET:'fake'},async(url,options)=>{
    requests.push({url,options})
    return url.includes('/oauth2/')?new Response(JSON.stringify({access_token:'fake',expires_in:3600}),{status:200}):new Response(null,{status:202})
  })
  await mailer.send(notification)
  const graph=JSON.parse(requests[1].options.body)
  assert.equal(graph.message.toRecipients[0].emailAddress.address,'careers@i-genext.com')
  assert.equal(graph.message.attachments[0]['@odata.type'],'#microsoft.graph.fileAttachment')
  assert.deepEqual(Buffer.from(graph.message.attachments[0].contentBytes,'base64'),pdf)
 })
})
