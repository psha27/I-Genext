import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const scrypt = promisify(scryptCallback)
export const defaultCredentialsFile = fileURLToPath(new URL('../data/admin-credentials.json', import.meta.url))
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return { salt, hash: derived.toString('hex') }
}
export function createAdminAuth({ credentialsFile = defaultCredentialsFile, secure = false, sessionMs = 8 * 60 * 60 * 1000, maxAttempts = 5 } = {}) {
  const sessions = new Map(), attempts = new Map()
  const cookieName = 'igenext_admin'
  async function credentials() {
    try { const data = JSON.parse(await readFile(credentialsFile, 'utf8')); return typeof data.username === 'string' && /^[a-f0-9]{32}$/.test(data.salt) && /^[a-f0-9]{128}$/.test(data.hash) ? data : null }
    catch { return null }
  }
  function cookie(req) {
    return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
  }
  function setCookie(res, token, age) {
    res.setHeader('Set-Cookie', cookieName + '=' + token + '; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=' + age + (secure ? '; Secure' : ''))
  }
  async function login(req, res) {
    const now = Date.now()
    for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key)
    for (const [key, value] of sessions) if (value.expires <= now) sessions.delete(key)
    const key = req.ip
    const bucket = attempts.get(key) || { count: 0, expires: now + 15 * 60 * 1000 }
    if (bucket.count >= maxAttempts) { res.set('Retry-After', String(Math.ceil((bucket.expires - now) / 1000))); return res.status(429).json({ ok: false, message: 'Too many sign-in attempts. Please try again in 15 minutes.' }) }
    const account = await credentials()
    if (!account) return res.status(503).json({ ok: false, message: 'Admin access has not been configured. Please contact your site administrator.' })
    bucket.count++; attempts.set(key, bucket)
    const { username, password } = req.body || {}
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) return res.status(401).json({ ok: false, message: 'The username or password is incorrect.' })
    const derived = await scrypt(password, account.salt, 64)
    if (!timingSafeEqual(derived, Buffer.from(account.hash, 'hex')) || username !== account.username) return res.status(401).json({ ok: false, message: 'The username or password is incorrect.' })
    attempts.delete(key)
    const old = cookie(req); if (old) sessions.delete(old)
    const token = randomBytes(32).toString('hex')
    sessions.set(token, { username, expires: now + sessionMs, credentialHash: account.hash })
    setCookie(res, token, Math.floor(sessionMs / 1000))
    return res.json({ ok: true, username })
  }
  async function requireSession(req, res, next) {
    const token = cookie(req), session = sessions.get(token), account = await credentials()
    if (!session || session.expires <= Date.now() || account?.hash !== session.credentialHash) {
      sessions.delete(token); setCookie(res, '', 0)
      return res.status(401).json({ ok: false, message: 'Please sign in to continue.' })
    }
    req.admin = session.username
    next()
  }
  function logout(req, res) { sessions.delete(cookie(req)); setCookie(res, '', 0); res.json({ ok: true }) }
  return { login, requireSession, logout }
}
export function sameOrigin(origin) {
  return (req, res, next) => {
    const sent = req.get('origin')
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ ok: false, message: 'Request origin not allowed.' })
    if (sent) {
      try { if (sent !== origin && new URL(sent).host !== req.get('host')) return res.status(403).json({ ok: false, message: 'Request origin not allowed.' }) }
      catch { return res.status(403).json({ ok: false, message: 'Request origin not allowed.' }) }
    }
    next()
  }
}
export function requestsCsv(rows) {
  const columns = [['reference','Reference'],['createdAt','Submitted at'],['name','Name'],['email','Email'],['phone','Mobile number'],['designation','Designation'],['company','Company'],['area','Area of interest'],['message','Message'],['emailStatus','Acknowledgement']]
  const escape = value => {
    let text = String(value ?? '')
    if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
    return '"' + text.replaceAll('"','""') + '"'
  }
  return '\uFEFF' + [columns.map(([, label]) => escape(label)).join(','), ...rows.map(row => columns.map(([key]) => escape(row[key])).join(','))].join('\r\n')
}
