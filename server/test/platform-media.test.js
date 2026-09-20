import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createPlatformMediaStore, registerPlatformMedia } from '../src/platform-media.js'
import { createAdminAuth, hashPassword } from '../src/admin.js'

const mp4 = () => { const data = Buffer.alloc(96); data.writeUInt32BE(24, 0); data.write('ftyp', 4); data.write('isom', 8); data.write('isommp42', 16); data.writeUInt32BE(72, 24); data.write('mdat', 28); return data }
function uploadBody(bytes = mp4(), mime = 'video/mp4', transcript = 'Walkthrough transcript') { const body = new FormData(); body.append('video', new Blob([bytes], { type: mime }), 'demo.mp4'); body.append('transcript', transcript); return body }
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'igenext-platform-video-'))
  const credentialsFile = path.join(directory, 'credentials.json')
  await fs.writeFile(credentialsFile, JSON.stringify({ username: 'tester', ...await hashPassword('test-only-password') }))
  const store = createPlatformMediaStore({ directory: path.join(directory, 'media'), databaseUrl: '', nodeEnv: 'test' })
  const app = express(); app.use(express.json())
  const auth = createAdminAuth({ credentialsFile })
  app.post('/api/admin/login', auth.login)
  registerPlatformMedia(app, { store, auth, origin: 'http://localhost:5173', maxBytes: 1024 })
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  const base = 'http://127.0.0.1:' + server.address().port
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await store.close(); assert.equal(path.dirname(directory), path.resolve(os.tmpdir())); await fs.rm(directory, { recursive: true, force: true }) })
  const login = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'tester', password: 'test-only-password' }) })
  const headers = { Cookie: login.headers.get('set-cookie').split(';')[0], Origin: 'http://localhost:5173' }
  return { base, headers, store, directory }
}

test('video upload requires login, same origin and a known tool', async t => {
  const { base, headers } = await fixture(t)
  assert.equal((await fetch(base + '/api/admin/platform-videos/envision', { method: 'POST', body: uploadBody() })).status, 401)
  assert.equal((await fetch(base + '/api/admin/platform-videos/envision', { method: 'POST', headers: { ...headers, Origin: 'https://wrong.invalid' }, body: uploadBody() })).status, 403)
  assert.equal((await fetch(base + '/api/admin/platform-videos/unknown', { method: 'POST', headers, body: uploadBody() })).status, 404)
  assert.deepEqual((await (await fetch(base + '/api/platform-videos')).json()).videos, [])
})

test('upload persists metadata, serves ranges, replaces old media and removes published videos', async t => {
  const { base, headers, store, directory } = await fixture(t)
  const response = await fetch(base + '/api/admin/platform-videos/envision', { method: 'POST', headers, body: uploadBody() })
  assert.equal(response.status, 201)
  const { video } = await response.json()
  assert.equal(video.transcript, 'Walkthrough transcript')
  assert.equal(video.size, 96)
  assert.equal(Object.hasOwn(video, 'filename'), false)
  const range = await fetch(base + video.url, { headers: { Range: 'bytes=0-15' } })
  assert.equal(range.status, 206); assert.equal(range.headers.get('content-type'), 'video/mp4'); assert.equal((await range.arrayBuffer()).byteLength, 16)
  assert.equal(range.headers.get('content-range'), 'bytes 0-15/96')
  const reopened = createPlatformMediaStore({ directory: path.join(directory, 'media'), databaseUrl: '', nodeEnv: 'test' })
  assert.equal((await reopened.list())[0].url, video.url); await reopened.close()
  const replace = await fetch(base + '/api/admin/platform-videos/envision', { method: 'POST', headers, body: uploadBody() })
  assert.equal(replace.status, 201); const newer = (await replace.json()).video
  assert.notEqual(newer.url, video.url)
  assert.equal((await fetch(base + video.url)).status, 404)
  assert.equal((await fs.readdir(store.root)).filter(name => name.endsWith('.mp4')).length, 1)
  assert.equal((await fetch(base + '/api/admin/platform-videos/envision', { method: 'DELETE', headers })).status, 200)
  assert.deepEqual((await (await fetch(base + '/api/platform-videos')).json()).videos, [])
  assert.equal((await fetch(base + newer.url)).status, 404)
  assert.equal((await fs.readdir(store.root)).filter(name => name.endsWith('.mp4')).length, 0)
})

test('rejects disguised files, oversize uploads and invalid transcripts without replacing current video', async t => {
  const { base, headers, store } = await fixture(t)
  await fetch(base + '/api/admin/platform-videos/auditiq', { method: 'POST', headers, body: uploadBody() })
  const current = (await store.list())[0].url
  for (const [body, status] of [[uploadBody(Buffer.from('<script>bad</script>')), 400], [uploadBody(mp4(), 'text/html'), 400], [uploadBody(Buffer.alloc(2048)), 413], [uploadBody(mp4(), 'video/mp4', 'x'.repeat(6001)), 400]]) {
    assert.equal((await fetch(base + '/api/admin/platform-videos/auditiq', { method: 'POST', headers, body })).status, status)
    assert.equal((await store.list())[0].url, current)
  }
  assert.equal((await fs.readdir(store.root)).filter(name => name.endsWith('.mp4')).length, 1)
  assert.equal((await fetch(base + '/api/platform-videos/auditiq/not-a-video.mp4')).status, 404)
})

test('WebM container is accepted and public metadata remains separated by tool', async t => {
  const { base, headers } = await fixture(t)
  const bytes = Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]), Buffer.from('webm'), Buffer.alloc(32)])
  const response = await fetch(base + '/api/admin/platform-videos/approve-x', { method: 'POST', headers, body: uploadBody(bytes, 'video/webm') })
  assert.equal(response.status, 201)
  const { video } = await response.json(); assert.equal(video.mime, 'video/webm')
  assert.equal((await fetch(base + video.url.replace('approve-x', 'envision'))).status, 404)
})