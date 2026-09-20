import { registerFrontend } from './frontend.js'
import { registerPlatformCatalog } from './platform-catalog.js'
import { registerPlatformMedia } from './platform-media.js'
import express from 'express'
import { registerInsights } from './insights.js'
import { registerCareers } from './careers.js'
import cors from 'cors'
import { validateContact } from './contact.js'
import { createAdminAuth, sameOrigin, requestsCsv } from './admin.js'

export function createApp(store, { origin = 'http://localhost:5173', rateLimit = 10, auth = createAdminAuth(), emailWorker, emailConfigured = false, careersStore, careersWorker, insightStore, socialConfiguration, socialPublisher, platformMediaStore, platformCatalog, heroStore, frontendDirectory } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin }))
  app.use('/api/admin/insights', express.json({ limit: '128kb' }))
  app.use(express.json({ limit: '32kb' }))
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next() })
  const attempts = new Map()
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'igenext-api', storage: store.mode }))
  app.post('/api/contact', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const now = Date.now()
    for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key)
    const key = req.ip
    const bucket = attempts.get(key) || { count: 0, expires: now + 15 * 60 * 1000 }
    if (bucket.count >= rateLimit) { res.set('Retry-After', String(Math.ceil((bucket.expires - now) / 1000))); return res.status(429).json({ ok: false, message: 'Too many enquiries. Please try again in 15 minutes.' }) }
    bucket.count++; attempts.set(key, bucket)
    const validation = validateContact(req.body)
    if (validation.error) return res.status(400).json({ ok: false, message: validation.error })
    try {
      const reference = await store.save(validation.data)
      emailWorker?.kick()
      return res.status(201).json({ ok: true, reference })
    } catch {
      console.error('Contact storage failed; no enquiry payload logged.')
      return res.status(503).json({ ok: false, message: 'Our enquiry service is temporarily unavailable. Please try again shortly.' })
    }
  })
  app.use('/api/admin', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  app.post('/api/admin/login', sameOrigin(origin), auth.login)
  app.get('/api/admin/session', auth.requireSession, (req, res) => res.json({ ok: true, username: req.admin, emailConfigured }))
  app.post('/api/admin/logout', sameOrigin(origin), auth.logout)
  app.get('/api/admin/requests', auth.requireSession, async (req, res) => {
    try {
      const all = await store.listRequests()
      const query = String(req.query.q || '').slice(0,200).toLowerCase()
      const rows = query ? all.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(query))) : all
      const totalPages = Math.max(1, Math.ceil(rows.length / 25))
      const page = Math.min(totalPages, Math.max(1, Number.parseInt(String(req.query.page),10) || 1))
      res.json({ ok: true, rows: rows.slice((page-1)*25, page*25), total: rows.length, allTotal: all.length, page, totalPages })
    } catch { res.status(503).json({ ok: false, message: 'Requests could not be loaded. Please try again.' }) }
  })
  app.get('/api/admin/requests/export', auth.requireSession, async (_req, res) => {
    try {
      const rows = await store.listRequests()
      res.set('Content-Type','text/csv; charset=utf-8')
      res.set('Content-Disposition','attachment; filename="igenext-contact-requests.csv"')
      res.send(requestsCsv(rows))
    } catch { res.status(503).json({ ok: false, message: 'The export could not be created. Please try again.' }) }
  })
  if (heroStore) registerPlatformCatalog(app, { store: heroStore, auth, origin })
  if (platformCatalog) registerPlatformCatalog(app, { store: platformCatalog, auth, origin })
  if (platformMediaStore) registerPlatformMedia(app, { store: platformMediaStore, auth, origin })
  if (insightStore) registerInsights(app, { store: insightStore, auth, origin, configuration: socialConfiguration, publisher: socialPublisher })
  if (careersStore) registerCareers(app, { store: careersStore, auth, origin, worker: careersWorker })
  if (frontendDirectory) registerFrontend(app, frontendDirectory)
  app.use((err, _req, res, next) => { if(res.headersSent)return next(err);return res.status(err.status === 413 ? 413 : err.status === 400 ? 400 : 500).json({ ok: false, message: err.status ? 'Please send a valid request within the allowed size.' : 'The service is temporarily unavailable.' }) })
  return app
}
