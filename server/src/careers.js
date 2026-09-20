import multer from 'multer'
import { sameOrigin } from './admin.js'

export const candidateFields = {
  firstName: 'First name', middleName: 'Middle name', lastName: 'Last name', email: 'Email', mobile: 'Mobile',
  currentOrganization: 'Current organization', currentDesignation: 'Current designation',
  currentLocation: 'Current location', currentAddress: 'Current address',
  currentSalary: 'Current salary', expectedSalary: 'Expected salary'
}
function failure(message, status = 400) { return Object.assign(new Error(message), { status }) }
export function validateJob(body) {
  const data = {}
  for (const key of ['title','location','department','experience','employmentType','description','status']) {
    const value = body?.[key]
    if (typeof value !== 'string' || !value.trim() || value.length > (key === 'description' ? 12000 : 220)) throw failure('Please complete all opening fields within the allowed length.')
    data[key] = value.trim()
  }
  if (!['draft','open','closed'].includes(data.status)) throw failure('Choose a valid opening status.')
  return data
}
export function validateApplication(body, file) {
  const candidate = {}
  for (const [key,label] of Object.entries(candidateFields)) {
    const value = body?.[key]
    if ((value !== undefined && typeof value !== 'string') || (key !== 'middleName' && !value?.trim()) || (value || '').length > (key === 'currentAddress' ? 2000 : 254)) throw failure('Please provide a valid ' + label.toLowerCase() + '.')
    candidate[key] = (value || '').trim()
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) throw failure('Please provide a valid email address.')
  if (!/^[+()\d\s.-]{7,40}$/.test(candidate.mobile) || (candidate.mobile.replace(/\D/g,'').length < 7 || candidate.mobile.replace(/\D/g,'').length > 15)) throw failure('Please provide a valid mobile number.')
  if (body.consent !== 'true') throw failure('Please consent to the use of your details for recruitment.')
  if (!file || file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname) || file.buffer.subarray(0,5).toString() !== '%PDF-' || !file.buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) throw failure('Please upload your resume as a valid PDF, up to 2 MB.')
  return { ...candidate, consentAt: new Date().toISOString() }
}
export function registerCareers(app, { store, auth, origin, worker }) {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2*1024*1024, files: 1, fields: 14, fieldSize: 4000, parts: 16 } }).single('resume')
  const attempts = new Map()
  const route = handler => async (req,res,next) => { try { await handler(req,res) } catch(e) { next(e) } }
  app.get('/api/jobs', route(async (_req,res) => { res.set('Cache-Control','no-store'); res.json({ jobs: await store.jobs(true) }) }))
  app.post('/api/jobs/:id/applications', sameOrigin(origin), (req,res,next) => {
    res.set('Cache-Control','no-store')
    const now = Date.now()
    for (const [key,value] of attempts) if (value.until <= now) attempts.delete(key)
    const bucket = attempts.get(req.ip) || { count: 0, until: now + 900000 }
    attempts.set(req.ip,bucket)
    if (++bucket.count > 10) return res.status(429).set('Retry-After','900').json({ message: 'Too many applications. Please try again in 15 minutes.' })
    upload(req,res,error => error ? res.status(400).json({ message: 'Upload one PDF resume up to 2 MB and complete the application fields.' }) : next())
  }, route(async (req,res) => {
    const candidate = validateApplication(req.body, req.file)
    const reference = await store.apply(req.params.id, candidate, req.file)
    worker?.kick()
    res.status(201).json({ ok: true, reference })
  }))
  app.get('/api/admin/jobs', auth.requireSession, route(async (_req,res) => res.json({ jobs: await store.jobs() })))
  app.post('/api/admin/jobs', sameOrigin(origin), auth.requireSession, route(async (req,res) => res.status(201).json({ job: await store.saveJob(validateJob(req.body)) })))
  app.put('/api/admin/jobs/:id', sameOrigin(origin), auth.requireSession, route(async (req,res) => res.json({ job: await store.saveJob(validateJob(req.body), req.params.id) })))
  app.get('/api/admin/applications', auth.requireSession, route(async (req,res) => {
    const all = await store.applications(String(req.query.q || '').slice(0,200))
    const totalPages = Math.max(1, Math.ceil(all.length/25)), page = Math.min(totalPages,Math.max(1,parseInt(req.query.page,10)||1))
    res.json({ rows: all.slice((page-1)*25,page*25), total: all.length, page, totalPages })
  }))
  app.get('/api/admin/applications/:reference/resume', auth.requireSession, route(async (req,res) => {
    const file = await store.resume(req.params.reference)
    if (!file) return res.status(404).json({ message: 'Application not found.' })
    res.type('application/pdf').set('Content-Disposition','attachment; filename="resume.pdf"').send(file.buffer)
  }))
  app.post('/api/admin/applications/:reference/retry-emails', sameOrigin(origin), auth.requireSession, route(async (req,res) => {
    await store.retryEmails(req.params.reference); worker?.kick(); res.json({ ok: true })
  }))
  app.use('/api', (error,_req,res,next) => {
    if (![400,404,409].includes(error.status)) return next(error)
    res.status(error.status).json({ ok: false, message: error.message })
  })
}
