import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../src/app.js'
test('production serves website and admin with the API on one port; missing assets and API routes stay 404',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'igenext-web-'))
 await fs.writeFile(path.join(directory,'index.html'),'<html>Website fixture</html>')
 await fs.writeFile(path.join(directory,'asset.js'),'window.fixture=true;')
 await fs.writeFile(path.join(directory,'.env'),'PRIVATE_VALUE')
 const app=createApp({mode:'test'},{frontendDirectory:directory})
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s))})
 t.after(async()=>{await new Promise(r=>server.close(r));assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));await fs.rm(directory,{recursive:true,force:true})})
 const base='http://127.0.0.1:'+server.address().port
 for(const route of ['/','/admin','/nested/page']){const r=await fetch(base+route);assert.equal(r.status,200);assert.match(await r.text(),/Website fixture/)}
 assert.equal((await (await fetch(base+'/api/health')).json()).ok,true)
 assert.equal(await (await fetch(base+'/asset.js')).text(),'window.fixture=true;')
 for(const route of ['/api/missing','/insights/missing','/missing.js','/.env'])assert.equal((await fetch(base+route)).status,404)
})
