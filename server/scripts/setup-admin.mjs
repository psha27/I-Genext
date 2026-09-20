import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { hashPassword, defaultCredentialsFile } from '../src/admin.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })
const target = process.env.ADMIN_CREDENTIALS_FILE || defaultCredentialsFile
let muted = false
const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback() } })
const rl = createInterface({ input: process.stdin, output, terminal: true })
try {
  let exists = false
  try { await readFile(target); exists = true } catch (e) { if (e.code !== 'ENOENT') throw e }
  if (exists && (await rl.question('Replace the existing admin account and invalidate its sessions? Type yes: ')).trim() !== 'yes') process.exit(0)
  const username = (await rl.question('Admin username [admin]: ')).trim() || 'admin'
  if (!/^[a-zA-Z0-9._@-]{3,100}$/.test(username)) throw new Error('Use 3–100 letters, numbers, dots, underscores, @ or hyphens.')
  process.stdout.write('Password (at least 12 characters; hidden): '); muted = true
  const password = await rl.question(''); muted = false; process.stdout.write('\n')
  if (password.length < 12 || password.length > 256) throw new Error('Password must be 12–256 characters.')
  process.stdout.write('Confirm password: '); muted = true
  const confirmation = await rl.question(''); muted = false; process.stdout.write('\n')
  if (password !== confirmation) throw new Error('Passwords did not match.')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify({ username, ...await hashPassword(password) }), { mode: 0o600 })
  console.log('Admin account configured. Sign in at /admin. The password is stored only as a salted hash.')
} catch (error) { muted = false; console.error(error.message); process.exitCode = 1 }
finally { rl.close() }
