import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../src/app.js'
import { createContactStore, validateContact } from '../src/contact.js'
const valid = {name:'Test Person',email:'test@example.com',company:'Example Company',designation:'Director',phone:'+91 98765 43210',area:'AI, Data & Automation',message:'Testing a workflow enquiry.',consent:'yes',website:''}
test('contact validates fields, consent, email and honeypot', () => {
  assert.ok(validateContact(valid).data)
  for (const input of [null,[],{},{...valid,email:'broken'},{...valid,consent:''},{...valid,area:'unknown'},{...valid,website:'spam'},{...valid,message:'short'},{...valid,name:'   '},{...valid,company:42}]) assert.ok(validateContact(input).error)
})
test('development storage survives store recreation', async () => {
  const directory = await mkdtemp(join(tmpdir(),'igenext-contact-'))
  try {
    const store = createContactStore({DATA_DIR:directory})
    const reference = await store.save(valid)
    await store.close()
    await createContactStore({DATA_DIR:directory}).save({...valid,name:'Second Person'})
    const rows = (await readFile(join(directory,'contact-leads.jsonl'),'utf8')).trim().split('\n').map(JSON.parse)
    assert.equal(rows.length,2)
    assert.equal(rows[0].reference,reference)
    assert.equal(rows[0].consent,true)
  } finally { await rm(directory,{recursive:true,force:true}) }
})
test('production refuses development file storage', () => {
  assert.throws(() => createContactStore({NODE_ENV:'production'}),/DATABASE_URL/)
})
async function withServer(store,run,options) {
  const server = createApp(store,options).listen(0,'127.0.0.1')
  await new Promise(resolve => server.once('listening',resolve))
  try { await run('http://127.0.0.1:' + server.address().port) }
  finally { await new Promise(resolve => server.close(resolve)) }
}
const post = (url,body) => fetch(url+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
test('API returns reference only after storage', async () => {
  let received
  await withServer({mode:'test',save:async data => {received=data;return 'IG-test'}},async url => {
    assert.equal((await post(url,{...valid,consent:''})).status,400)
    assert.equal(received,undefined)
    const response=await post(url,valid)
    assert.equal(response.status,201)
    assert.deepEqual(await response.json(),{ok:true,reference:'IG-test'})
    assert.equal(received.email,valid.email)
  })
})
test('API reports storage failure without leaking details',async () => {
  await withServer({mode:'test',save:async () => {throw new Error('secret database details')}},async url => {
    const response=await post(url,valid)
    assert.equal(response.status,503)
    assert.ok(!(await response.text()).includes('secret'))
  })
})
test('API rate limits and rejects malformed or oversized JSON',async () => {
  await withServer({mode:'test',save:async () => 'IG-test'},async url => {
    assert.equal((await post(url,valid)).status,201)
    const response=await post(url,valid)
    assert.equal(response.status,429)
    assert.ok(response.headers.get('retry-after'))
  },{rateLimit:1})
  await withServer({mode:'test',save:async () => 'IG-test'},async url => {
    const response=await fetch(url+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})
    assert.equal(response.status,400)
    assert.equal((await post(url,{...valid,message:'a'.repeat(40000)})).status,413)
  })
})
