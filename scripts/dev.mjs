import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const children = [
  spawn(process.execPath, ['--watch', 'src/index.js'], { cwd: fileURLToPath(new URL('../server', import.meta.url)), stdio: 'inherit' }),
  spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '0.0.0.0', '--config', 'vite.config.ts'], { cwd: fileURLToPath(new URL('../client', import.meta.url)), stdio: 'inherit' })
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.pid) continue
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { cwd: root, stdio: 'ignore', windowsHide: true })
    else child.kill('SIGTERM')
  }
  process.exitCode = code
}
for (const child of children) { child.on('error', () => stop(1)); child.on('exit', code => stop(code || 0)) }
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())