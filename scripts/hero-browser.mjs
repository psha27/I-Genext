import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createApp } from '../server/src/app.js'
import { createHeroStore } from '../server/src/hero.js'
import { createPlatformCatalog } from '../server/src/platform-catalog.js'
import { createAdminAuth, hashPassword } from '../server/src/admin.js'

// Requires a local Chrome debugging session on port 9223. All writes use isolated test storage.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'igenext-video-browser-'))
const credentialsFile = path.join(directory, 'credentials.json')
await fs.writeFile(credentialsFile, JSON.stringify({ username: 'tester', ...await hashPassword('test-only-password') }))
const store = createPlatformCatalog({ directory: path.join(directory, 'media'), databaseUrl: '', nodeEnv: 'test' })
await store.ready
const heroStore=createHeroStore({directory:path.join(directory,'hero'),databaseUrl:'',nodeEnv:'test'});await heroStore.ready
const app = createApp({ mode: 'test', listRequests: async () => [] }, { auth: createAdminAuth({ credentialsFile }), platformCatalog: store, heroStore, origin: 'http://localhost:5176' })
const api = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)) })
const vite = await createServer({ configFile: false, root: path.resolve('client'), plugins: [react()], server: { host: '127.0.0.1', port: 5176, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:' + api.address().port, changeOrigin: false } } } })
await vite.listen()
let ws
try {
  const pages = await (await fetch('http://localhost:9224/json')).json()
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let id = 0; const pending = new Map()
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) } })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, message => message.error ? reject(message.error) : resolve(message.result)); ws.send(JSON.stringify({ id: next, method, params })) })
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const check = async (expression, label) => { for(let attempt=0;attempt<30;attempt++){if(await evaluate(expression)){console.log('PASS ' + label);return}await pause(100)}console.error(await evaluate("({error:document.querySelector('.admin-error')?.textContent,notice:document.querySelector('.hero-admin .admin-notice')?.textContent,videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,ready:v.readyState,error:v.error?.message}))})"));throw Error(label) }
  const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await fs.mkdir('test-results', { recursive: true }); await fs.writeFile(path.join('test-results', name + '.png'), Buffer.from(result.data, 'base64')) }
  await send('Page.enable')
  const navigate = async url => { await send('Page.navigate', { url: 'http://localhost:5176' + url }); await pause(750) }
  const setField = async (label, value) => {
    await evaluate(`(()=>{const label=[...document.querySelectorAll('.hero-admin label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const field=label.querySelector('input,textarea,select');const type=field.tagName==='TEXTAREA'?HTMLTextAreaElement:field.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement;Object.getOwnPropertyDescriptor(type.prototype,'value').set.call(field,${JSON.stringify(value)});field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`); await pause(70)
  }
  const click = async text => { await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(text)}).click()`); await pause(350) }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await navigate('/')
  await check("document.querySelector('.cinematic-hero video')?.readyState>=2 && !document.querySelector('.cinematic-hero video').paused",'demo video loads and plays muted')
  await check("document.querySelectorAll('h1').length===1 && document.querySelector('.cinematic-hero').nextElementSibling.id==='consulting-overview'",'original hero follows the cinematic opening with one main heading')
  await screenshot('hero-desktop')
  await evaluate("document.querySelector('.cinematic-play').click()")
  await check("document.querySelector('.cinematic-hero video').paused",'pause control stops background motion')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await navigate('/')
  await check("document.querySelector('.cinematic-hero video')?.paused",'reduced motion uses a still opening')
  await send('Emulation.setEmulatedMedia',{features:[]})
  for(const width of [768,390,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<761});await pause(150);await check('document.documentElement.scrollWidth<=innerWidth','hero fits '+width);if(width===390)await screenshot('hero-mobile')}
  await evaluate("fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'tester',password:'test-only-password'})}).then(r=>r.status)")
  await navigate('/admin#hero')
  await check("!!document.querySelector('input[aria-label=\"Choose hero photo\"]') && !!document.querySelector('input[aria-label=\"Choose hero video\"]')",'hero admin provides both upload controls')
  await setField('Main headline','A verified consulting headline')
  await setField('Highlighted headline','Technology that delivers.')
  await click('Save hero')
  await check("document.querySelector('.hero-admin .admin-notice')?.textContent==='Hero saved and published.'",'hero text saves')
  for(const kind of ['photo','video']){
    await evaluate(`(async()=>{const blob=await (await fetch('/profile/'+(${JSON.stringify(kind)}==='photo'?'consulting-hero-poster-v2.png':'consulting-hero-demo-v2.webm'))).blob();const files=new DataTransfer();files.items.add(new File([blob],${JSON.stringify(kind)}==='photo'?'poster.png':'demo.webm',{type:${JSON.stringify(kind)}==='photo'?'image/png':'video/webm'}));const input=document.querySelector('input[aria-label="Choose hero '+${JSON.stringify(kind)}+'"]');input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);await pause(100)
    await click(kind==='photo'?'Upload image':'Upload video')
    await check(`document.querySelector('.hero-admin .admin-notice')?.textContent.includes('${kind==='photo'?'Image':'Video'} uploaded')`,kind+' upload completes')
    await navigate('/')
    await check("document.querySelector('.cinematic-copy h1')?.textContent==='A verified consulting headlineTechnology that delivers.'",'edited headline appears publicly')
    if(kind==='photo')await check("!document.querySelector('.cinematic-hero video')&&document.querySelector('.cinematic-background').src.includes('/api/hero-content/')",'uploaded photo becomes still hero')
    else await check("document.querySelector('.cinematic-hero video')?.src.includes('/api/hero-content/')&&document.querySelector('.cinematic-hero video').readyState>=2",'uploaded video plays publicly')
    await navigate('/admin#hero')
  }
  await check('document.documentElement.scrollWidth<=innerWidth','hero admin fits mobile width')
  await evaluate('window.confirm=()=>true')
  await check("[...document.querySelectorAll('button')].some(b=>b.textContent==='Remove video')",'saved hero media loads in admin')
  await click('Remove video')
  await check("document.querySelector('.hero-admin .admin-notice')?.textContent==='Uploaded video removed.'",'video removal restores demo choice')
  await navigate('/')
  await check("document.querySelector('.cinematic-hero video')?.src.endsWith('/profile/consulting-hero-demo-v2.webm')",'demo fallback works after removal')
} finally {
 ws?.close();await vite.close();await new Promise(resolve=>api.close(resolve));await store.close();await heroStore.close()
 if(path.dirname(directory)!==path.resolve(os.tmpdir()))throw Error('Unexpected temporary directory')
 await fs.rm(directory,{recursive:true,force:true})
}
