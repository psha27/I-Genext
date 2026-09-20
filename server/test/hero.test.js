import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHeroStore } from '../src/hero.js'
import { createPlatformCatalog } from '../src/platform-catalog.js'
import { createAdminAuth, hashPassword } from '../src/admin.js'
import { createApp } from '../src/app.js'
test('hero content is protected, isolated from platforms, editable and persistent with image/video uploads',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'igenext-hero-'))
 const credentialsFile=path.join(directory,'auth.json');await fs.writeFile(credentialsFile,JSON.stringify({username:'tester',...await hashPassword('test-only-password')}))
 const options={directory:path.join(directory,'content'),databaseUrl:'',nodeEnv:'test'}
 const heroStore=createHeroStore(options);await heroStore.ready
 const platforms=createPlatformCatalog({...options,seed:[]});await platforms.ready
 const app=createApp({mode:'test'},{heroStore,auth:createAdminAuth({credentialsFile})})
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s))});const base='http://127.0.0.1:'+server.address().port
 t.after(async()=>{await new Promise(r=>server.close(r));await heroStore.close();await platforms.close();assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));await fs.rm(directory,{recursive:true,force:true})})
 assert.equal((await fetch(base+'/api/admin/hero-content')).status,401)
 let item=(await (await fetch(base+'/api/hero-content')).json()).items[0];assert.equal(item.id,'hero');assert.equal((await platforms.list()).length,0)
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'tester',password:'test-only-password'})});const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:'http://localhost:5173'}
 const json=body=>({method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)})
 assert.equal((await fetch(base+'/api/admin/hero-content/hero',{...json(item),headers:{...headers,'Content-Type':'application/json',Origin:'https://other.invalid'}})).status,403)
 item=(await (await fetch(base+'/api/admin/hero-content/hero',json({...item,headline:'Updated consulting headline',category:'Highlighted message'}))).json()).item
 assert.equal(item.headline,'Updated consulting headline')
 assert.equal((await fetch(base+'/api/admin/hero-content/hero',json({...item,version:1}))).status,409)
 for(const [kind,mime,bytes] of [['photo','image/png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5WQAAAAASUVORK5CYII=','base64')],['video','video/webm',Buffer.concat([Buffer.from([26,69,223,163]),Buffer.from('webm'),Buffer.alloc(32)])]]){
  const body=new FormData();body.append('file',new Blob([bytes],{type:mime}),'asset');body.append('version',String(item.version))
  const response=await fetch(base+'/api/admin/hero-content/hero/'+kind,{method:'POST',headers,body});assert.equal(response.status,201);item=(await response.json()).item
  assert.equal(item.mediaMode,kind);assert.ok(item[kind].url.startsWith('/api/hero-content/'));assert.equal((await fetch(base+item[kind].url)).status,200)
 }
 assert.equal((await fetch(base+item.video.url,{headers:{Range:'bytes=0-7'}})).status,206)
 const previousVideo=item.video.url;item=(await (await fetch(base+'/api/admin/hero-content/hero/media/video',{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({version:item.version})})).json()).item
 assert.equal(item.video,null);assert.equal(item.mediaMode,'illustration');assert.equal((await fetch(base+previousVideo)).status,404)
 const reopened=createHeroStore(options);await reopened.ready;assert.equal((await reopened.list())[0].headline,'Updated consulting headline');assert.ok((await reopened.list())[0].photo);await reopened.close()
})
