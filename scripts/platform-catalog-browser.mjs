import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createApp } from '../server/src/app.js'
import { createPlatformCatalog } from '../server/src/platform-catalog.js'
import { createAdminAuth, hashPassword } from '../server/src/admin.js'

// Requires a local Chrome debugging session on port 9223. All writes use isolated test storage.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'igenext-video-browser-'))
const credentialsFile = path.join(directory, 'credentials.json')
await fs.writeFile(credentialsFile, JSON.stringify({ username: 'tester', ...await hashPassword('test-only-password') }))
const store = createPlatformCatalog({ directory: path.join(directory, 'media'), databaseUrl: '', nodeEnv: 'test' })
await store.ready
const app = createApp({ mode: 'test', listRequests: async () => [] }, { auth: createAdminAuth({ credentialsFile }), platformCatalog: store, origin: 'http://localhost:5176' })
const api = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)) })
const vite = await createServer({ configFile: false, root: path.resolve('client'), plugins: [react()], server: { host: '127.0.0.1', port: 5176, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:' + api.address().port, changeOrigin: false } } } })
await vite.listen()
let ws
try {
  const pages = await (await fetch('http://localhost:9223/json')).json()
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let id = 0; const pending = new Map()
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) } })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, message => message.error ? reject(message.error) : resolve(message.result)); ws.send(JSON.stringify({ id: next, method, params })) })
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const check = async (expression, label) => { for(let attempt=0;attempt<30;attempt++){if(await evaluate(expression)){console.log('PASS ' + label);return}await pause(100)}console.error(await evaluate("({error:document.querySelector('.admin-error')?.textContent,notice:document.querySelector('.admin-platforms .admin-notice')?.textContent,videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,ready:v.readyState,error:v.error?.message}))})"));throw Error(label) }
  const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await fs.mkdir('test-results', { recursive: true }); await fs.writeFile(path.join('test-results', name + '.png'), Buffer.from(result.data, 'base64')) }
  await send('Page.enable')
  const navigate = async url => { await send('Page.navigate', { url: 'http://localhost:5176' + url }); await pause(750) }
  const setField = async (label, value) => {
    await evaluate(`(()=>{const label=[...document.querySelectorAll('.catalog-admin-editor label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const field=label.querySelector('input,textarea,select');const type=field.tagName==='TEXTAREA'?HTMLTextAreaElement:field.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement;Object.getOwnPropertyDescriptor(type.prototype,'value').set.call(field,${JSON.stringify(value)});field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`); await pause(70)
  }
  const click = async text => { await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(text)}).click()`); await pause(350) }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
  await navigate('/#platforms')
  await check("document.querySelectorAll('.platform-stories .platform-story').length===12", 'all twelve seed sections load from API')
  await evaluate("fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'tester',password:'test-only-password'})}).then(r=>r.status)")
  await navigate('/admin#platforms')
  await check("document.querySelectorAll('.catalog-admin-list button').length===12", 'editor lists both platform groups')
  await click('Add section')
  await setField('Platform name', 'Browser Demo Platform')
  await setField('Category / subtitle', 'Demo category')
  await setField('Platform group', 'enterprise')
  await setField('Description', 'A temporary section used to verify dynamic content editing.')
  await setField('Features', 'First feature\nSecond feature')
  await setField('Display order', '0')
  await click('Save draft')
  await check("[...document.querySelectorAll('.catalog-admin-list button')].some(e=>e.textContent.includes('Browser Demo Platform')) && !document.querySelector('input[aria-label=\"Choose photo\"]').disabled", 'draft creation enables photo and video uploads')
  await check("fetch('/api/platform-catalog').then(r=>r.json()).then(r=>!r.items.some(i=>i.name==='Browser Demo Platform'))", 'draft is hidden from public catalog')
  await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=480;canvas.height=320;const context=canvas.getContext('2d');context.fillStyle='#002060';context.fillRect(0,0,480,320);context.fillStyle='#00B0F0';context.fillRect(40,40,400,240);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const files=new DataTransfer();files.items.add(new File([blob],'demo.png',{type:'image/png'}));const input=document.querySelector('input[aria-label="Choose photo"]');input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`); await pause(150)
  await click('Upload photo')
  await evaluate("document.querySelector('.catalog-admin-preview').scrollIntoView({behavior:'instant'})"); await pause(500)
  await check("document.querySelector('.catalog-admin-preview .catalog-photo img')?.naturalWidth > 0", 'uploaded photo becomes default visual in draft preview')
  await setField('Photo description', 'Blue product demo image')
  await setField('Visibility', 'published')
  await click('Save & publish')
  await check("fetch('/api/platform-catalog').then(r=>r.json()).then(r=>{window.__demo=r.items.find(i=>i.name==='Browser Demo Platform');return window.__demo?.features.length===2&&window.__demo.group==='enterprise'})", 'publishing saves text and multiline features')
  const demo = await evaluate('window.__demo')
  await screenshot('platform-cms-admin')
  await navigate('/#' + demo.anchor)
  await check(`document.querySelector('#${demo.anchor} h3')?.textContent==='Browser Demo Platform' && document.querySelector('#${demo.anchor} .catalog-photo img')?.alt==='Blue product demo image'`, 'new enterprise section appears with uploaded photo and alt text')
  await check("document.querySelector('#enterprise-platforms .platform-story h3').textContent==='Browser Demo Platform'", 'display order places new section first')
  for (const width of [1440, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: width < 761 }); await pause(200)
    await evaluate(`document.getElementById('${demo.anchor}').scrollIntoView({behavior:'instant'})`); await pause(150)
    await check('document.documentElement.scrollWidth<=innerWidth', 'public layout has no horizontal overflow at ' + width)
    if (width === 390) await screenshot('platform-cms-mobile')
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
  await navigate('/admin#platforms')
  await evaluate("[...document.querySelectorAll('.catalog-admin-list button')].find(e=>e.textContent.includes('Browser Demo Platform')).click()"); await pause(100)
  await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks=[];const done=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#002060':'#00B0F0';ctx.fillRect(0,0,320,180);await new Promise(r=>setTimeout(r,60))}recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());const transfer=new DataTransfer();transfer.items.add(new File(chunks,'demo.webm',{type:'video/webm'}));const input=document.querySelector('input[aria-label="Choose video"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`); await pause(150)
  await click('Upload video')
  await check("document.querySelector('.admin-platforms .admin-notice')?.textContent.includes('Video saved')", 'video upload completes before editing')
  await setField('Platform name','Updated Demo Platform')
  await setField('Video transcript','This is a product walkthrough transcript.')
  await click('Save & publish')
  await check("document.querySelector('.admin-platforms .admin-notice')?.textContent==='Section saved and published.'", 'video section update finishes before navigation')
  await navigate('/#' + demo.anchor)
  await check(`document.querySelector('#${demo.anchor} video')?.readyState>=1 && document.querySelector('#${demo.anchor} h3').textContent==='Updated Demo Platform'`, 'updated text and default uploaded video appear publicly')
  await check(`document.querySelector('#${demo.anchor} details p').textContent==='This is a product walkthrough transcript.'`, 'editable video transcript is available')
  await evaluate(`document.querySelector('#${demo.anchor} button[aria-label="Previous visual"]').click()`); await pause(100)
  await check(`document.querySelector('#${demo.anchor} .catalog-photo img')!==null`, 'photo remains selectable alongside video')
  for (const width of [1440, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 761 }); await pause(100)
    await evaluate(`document.getElementById('${demo.anchor}').scrollIntoView({behavior:'instant'})`)
    await check(`(async()=>{const root=document.getElementById('${demo.anchor}');const frame=root.querySelector('.catalog-media');const initial=frame.getBoundingClientRect();const seen=[];for(let i=0;i<3;i++){root.querySelector('button[aria-label="Next visual"]').click();await new Promise(r=>setTimeout(r,150));const size=frame.getBoundingClientRect();if(size.width!==initial.width||size.height!==initial.height)return false;seen.push(root.querySelector('.catalog-media-status').textContent)}return new Set(seen).size===3&&!root.querySelector('.productivity-media-switch')&&document.documentElement.scrollWidth<=innerWidth})()`, 'arrows cycle all three visuals without resizing or overflow at '+width)
    if(width===390)await screenshot('platform-carousel-mobile')
    if(width===1440)await screenshot('platform-carousel-desktop')
  }
  await navigate('/admin#platforms')
  await evaluate("[...document.querySelectorAll('.catalog-admin-list button')].find(e=>e.textContent.includes('Updated Demo Platform')).click()"); await pause(100)
  await send('Emulation.setDeviceMetricsOverride', { width:390,height:1300,deviceScaleFactor:1,mobile:true }); await pause(150)
  await check('document.documentElement.scrollWidth<=innerWidth','admin editor fits mobile width')
  await screenshot('platform-cms-admin-mobile')
  await evaluate("window.confirm=()=>true")
  await click('Delete section')
  await check("!document.querySelector('.catalog-admin-list').textContent.includes('Updated Demo Platform')", 'delete removes section from admin list')
  await navigate('/#enterprise-platforms')
  await check(`!document.getElementById('${demo.anchor}') && document.querySelectorAll('.platform-stories .platform-story').length===12`, 'delete removes public section while preserving original twelve')
  await send('Browser.close')
} finally {
  ws?.close(); await vite.close(); await new Promise(resolve => api.close(resolve)); await store.close()
  if (path.dirname(directory) !== path.resolve(os.tmpdir())) throw Error('Unexpected temporary directory')
  await fs.rm(directory, { recursive: true, force: true })
}