import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createApp } from '../server/src/app.js'
import { createPlatformMediaStore } from '../server/src/platform-media.js'
import { createAdminAuth, hashPassword } from '../server/src/admin.js'

// Requires a local Chrome debugging session on port 9223. All writes use isolated test storage.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'igenext-video-browser-'))
const credentialsFile = path.join(directory, 'credentials.json')
await fs.writeFile(credentialsFile, JSON.stringify({ username: 'tester', ...await hashPassword('test-only-password') }))
const store = createPlatformMediaStore({ directory: path.join(directory, 'media'), databaseUrl: '', nodeEnv: 'test' })
const app = createApp({ mode: 'test', listRequests: async () => [] }, { auth: createAdminAuth({ credentialsFile }), platformMediaStore: store, origin: 'http://localhost:5176' })
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
  const check = async (expression, label) => { if (!await evaluate(expression)) throw Error(label); console.log('PASS ' + label) }
  const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await fs.mkdir('test-results', { recursive: true }); await fs.writeFile(path.join('test-results', name + '.png'), Buffer.from(result.data, 'base64')) }
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://localhost:5176/#productivity-tools' }); await pause(1400)
  await check("document.querySelectorAll('.productivity-section .platform-story').length===6 && document.querySelectorAll('#enterprise-platforms .platform-story').length===6", 'both platform families retain six offerings')
  for (const width of [1440, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1300, deviceScaleFactor: 1, mobile: width < 761 }); await pause(180)
    await evaluate("document.querySelector('#tool-envision').scrollIntoView({behavior:'instant'})"); await pause(250)
    await check("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.productivity-media')].every(e=>e.scrollWidth<=e.clientWidth+1)", 'responsive media bounds at ' + width)
    if (width === 1440 || width === 390) await screenshot('productivity-' + width)
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await evaluate("fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'tester',password:'test-only-password'})}).then(r=>r.status)")
  await send('Page.navigate', { url: 'http://localhost:5176/admin' }); await pause(900)
  await evaluate("[...document.querySelectorAll('.admin-tabs button')].find(e=>e.textContent==='Platform videos').click()"); await pause(500)
  await check("document.querySelectorAll('.admin-media-tools button').length===6", 'admin lists six tools')
  await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks=[];const done=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#002060':'#00B0F0';ctx.fillRect(0,0,320,180);await new Promise(r=>setTimeout(r,60))}recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());const transfer=new DataTransfer();transfer.items.add(new File(chunks,'isolated-demo.webm',{type:'video/webm'}));const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await pause(250); await check("document.querySelector('.admin-video-preview video')!==null", 'selected video previews')
  await evaluate("document.querySelector('.admin-media-editor form').requestSubmit()"); await pause(900)
  await check("document.querySelector('.admin-media-tools button small').textContent==='Video published'", 'admin upload publishes to isolated storage')
  await screenshot('platform-video-admin')
  await send('Page.navigate', { url: 'http://localhost:5176/#tool-envision' }); await pause(800)
  await evaluate("document.querySelectorAll('#tool-envision .productivity-media-switch button')[1].click()"); await pause(800)
  await check("document.querySelector('#tool-envision video')?.readyState>=1", 'public player loads real uploaded WebM')
  await evaluate("document.querySelectorAll('#tool-envision .productivity-media-switch button')[0].click()"); await pause(100)
  await check("document.querySelector('#tool-envision .productivity-art')!==null", 'illustration remains available')
  await send('Page.navigate', { url: 'http://localhost:5176/admin' }); await pause(700)
  await evaluate("[...document.querySelectorAll('.admin-tabs button')].find(e=>e.textContent==='Platform videos').click()"); await pause(300)
  await evaluate("window.confirm=()=>true;[...document.querySelectorAll('.admin-media-editor button')].find(e=>e.textContent==='Remove published video').click()"); await pause(400)
  await check("document.querySelector('.admin-media-tools button small').textContent==='Illustration only'", 'removal restores illustration-only state')
  await send('Browser.close')
} finally {
  ws?.close(); await vite.close(); await new Promise(resolve => api.close(resolve)); await store.close()
  if (path.dirname(directory) !== path.resolve(os.tmpdir())) throw Error('Unexpected temporary directory')
  await fs.rm(directory, { recursive: true, force: true })
}