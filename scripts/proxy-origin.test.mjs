import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer, loadConfigFromFile } from 'vite'
import { createApp } from '../server/src/app.js'
import { createAdminAuth, hashPassword } from '../server/src/admin.js'

test('real Vite proxy permits same-origin admin login and rejects foreign origins', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'igenext-proxy-'))
  const credentialsFile = join(directory, 'admin.json')
  const password = 'Isolated proxy test password'
  await writeFile(credentialsFile, JSON.stringify({ username: 'admin', ...await hashPassword(password) }))
  const app = createApp({ mode: 'test' }, { auth: createAdminAuth({ credentialsFile }) })
  const backend = app.listen(0, '127.0.0.1')
  await new Promise(resolve => backend.once('listening', resolve))
  let vite
  try {
    const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test' }, fileURLToPath(new URL('../client/vite.config.ts', import.meta.url)))
    for (const config of [loaded.config.server.proxy, loaded.config.preview.proxy]) {
      assert.equal(config['/api'].changeOrigin, false)
    }
    vite = await createServer({
      ...loaded.config,
      configFile: false,
      root: fileURLToPath(new URL('../client', import.meta.url)),
      logLevel: 'silent',
      optimizeDeps: { noDiscovery: true, include: [] },
      server: {
        ...loaded.config.server,
        host: '::', port: 0, preTransformRequests: false,
        proxy: { '/api': { ...loaded.config.server.proxy['/api'], target: 'http://127.0.0.1:' + backend.address().port } }
      }
    })
    await vite.listen()
    const port = vite.httpServer.address().port
    const base = 'http://127.0.0.1:' + port
    for (const hostname of ['127.0.0.1', 'localhost']) {
      const host = hostname + ':' + port
      const response = await fetch('http://' + host + '/api/admin/login', {
        method: 'POST',
        headers: { Host: host, Origin: 'http://' + host, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password })
      })
      assert.equal(response.status, 200)
      const cookie = response.headers.get('set-cookie').split(';')[0]
      assert.equal((await fetch('http://' + host + '/api/admin/session', { headers: { Cookie: cookie, Host: host } })).status, 200)
    }
    for (const metadata of ['cross-site', 'same-origin']) {
      const host = '127.0.0.1:' + port
      const response = await fetch('http://' + host + '/api/admin/login', {
        method: 'POST',
        headers: { Origin: 'https://untrusted.example', 'Sec-Fetch-Site': metadata, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password })
      })
      assert.equal(response.status, 403)
    }
  } finally {
    await vite?.close()
    await new Promise(resolve => backend.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})