import multer from 'multer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createContentRepository } from './content-repository.js'
import { sameOrigin } from './admin.js'

export const toolIds = ['envision', 'approve-x', 'capex-iq', 'auditiq', 'controliq', 'workflow-automation']
const filePattern = /^[a-f0-9-]{36}\.(mp4|webm)$/
const problem = (message, status = 400) => Object.assign(new Error(message), { status })
export function createPlatformMediaStore({ directory = process.env.PLATFORM_MEDIA_DIR || fileURLToPath(new URL('../data/platform-media/', import.meta.url)), databaseUrl = process.env.DATABASE_URL, nodeEnv = process.env.NODE_ENV } = {}) {
  const root = path.resolve(directory)
  const repository = createContentRepository({ directory: path.join(root, 'metadata'), databaseUrl, nodeEnv })
  const publicRow = row => row?.filename ? { id: row.id, url: '/api/platform-videos/' + row.id + '/' + row.filename, mime: row.mime, size: row.size, updatedAt: row.updatedAt, transcript: row.transcript || '' } : null
  return {
    root,
    async list() { return (await repository.read(api => api.all('platform-videos'))).map(publicRow).filter(Boolean) },
    get: id => repository.read(api => api.get('platform-videos', id)),
    async set(id, row) { return repository.write(async api => { const old = await api.get('platform-videos', id); await api.put('platform-videos', id, row || { id }); return old }) },
    publicRow,
    async removeFile(filename) { if (filePattern.test(filename || '')) await fs.unlink(path.join(root, filename)).catch(error => { if (error.code !== 'ENOENT') console.error('Platform media cleanup failed.') }) },
    close: () => repository.close()
  }
}

async function validVideo(file) {
  const handle = await fs.open(file.path, 'r')
  try {
    const bytes = Buffer.alloc(4096)
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0)
    const header = bytes.subarray(0, bytesRead)
    if (file.mimetype === 'video/mp4') return bytesRead >= 24 && header.toString('ascii', 4, 8) === 'ftyp' && header.readUInt32BE(0) >= 16 && header.readUInt32BE(0) <= file.size && ['isom','iso2','mp41','mp42','avc1','M4V ','dash','MSNV'].includes(header.toString('ascii', 8, 12))
    return bytesRead >= 16 && header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && header.includes(Buffer.from('webm'))
  } finally { await handle.close() }
}

export function registerPlatformMedia(app, { store, auth, origin, maxBytes = 100 * 1024 * 1024 }) {
  const busy = new Map()
  const route = fn => async (req, res, next) => { try { await fn(req, res, next) } catch (error) { next(error) } }
  const validId = (req, _res, next) => toolIds.includes(req.params.id) ? next() : next(problem('Unknown productivity tool.', 404))
  const lock = (req, res, next) => {
    if (busy.has(req.params.id)) return next(problem('A video update is already in progress for this tool. Please try again shortly.', 409))
    const token = Symbol(req.params.id)
    busy.set(req.params.id, token)
    const release = () => { if (busy.get(req.params.id) === token) busy.delete(req.params.id) }
    req.releaseMediaLock = release
    res.once('finish', release); res.once('close', release); next()
  }
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => fs.mkdir(store.root, { recursive: true }).then(() => callback(null, store.root), callback),
      filename: (_req, file, callback) => callback(null, randomUUID() + (file.mimetype === 'video/mp4' ? '.mp4' : '.webm'))
    }),
    limits: { fileSize: maxBytes, files: 1, fields: 1, fieldSize: 24000, parts: 3 },
    fileFilter: (_req, file, callback) => ['video/mp4', 'video/webm'].includes(file.mimetype) ? callback(null, true) : callback(problem('Upload an MP4 or WebM video.'))
  }).single('video')
  app.get('/api/platform-videos', route(async (_req, res) => { res.set('Cache-Control', 'no-store'); res.json({ videos: await store.list() }) }))
  app.get('/api/platform-videos/:id/:filename', validId, route(async (req, res, next) => {
    if (!filePattern.test(req.params.filename)) throw problem('Video not found.', 404)
    const row = await store.get(req.params.id)
    if (!row?.filename || row.filename !== req.params.filename) throw problem('Video not found.', 404)
    res.set({ 'Content-Type': row.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600' })
    res.sendFile(row.filename, { root: store.root, dotfiles: 'deny' }, error => { if (error) { if (res.headersSent) return next(error); next(problem('Video not found.', error.status === 404 || error.code === 'ENOENT' ? 404 : 500)) } })
  }))
  app.get('/api/admin/platform-videos', auth.requireSession, route(async (_req, res) => res.json({ videos: await store.list(), maxBytes, formats: ['video/mp4', 'video/webm'] })))
  app.post('/api/admin/platform-videos/:id', sameOrigin(origin), auth.requireSession, validId, lock, (req, res, next) => {
    upload(req, res, async error => {
      if (error) { req.releaseMediaLock(); return next(error.code === 'LIMIT_FILE_SIZE' ? problem('Video exceeds the 100 MB limit.', 413) : error instanceof multer.MulterError ? problem('Upload one video and an optional transcript within the allowed limits.') : error) }
      let published = false
      try {
        if (!req.file) throw problem('Choose a video to upload.')
        if (!await validVideo(req.file)) throw problem('This file is not a valid MP4 or WebM video container.')
        const transcript = req.body?.transcript || ''
        if (typeof transcript !== 'string' || transcript.length > 6000) throw problem('Keep the transcript within 6,000 characters.')
        const row = { id: req.params.id, filename: req.file.filename, mime: req.file.mimetype, size: req.file.size, transcript: transcript.trim(), updatedAt: new Date().toISOString() }
        const previous = await store.set(req.params.id, row)
        published = true
        await store.removeFile(previous?.filename)
        req.releaseMediaLock()
        res.status(201).json({ video: store.publicRow(row) })
      } catch (failure) { if (!published && req.file) await store.removeFile(req.file.filename); req.releaseMediaLock(); next(failure) }
    })
  })
  app.delete('/api/admin/platform-videos/:id', sameOrigin(origin), auth.requireSession, validId, lock, route(async (req, res) => {
    const previous = await store.set(req.params.id, null)
    await store.removeFile(previous?.filename)
    res.json({ ok: true })
  }))
  app.use(['/api/platform-videos', '/api/admin/platform-videos'], (error, _req, res, next) => {
    if (res.headersSent) return next(error)
    res.status(error.status || 500).json({ ok: false, message: error.status ? error.message : 'Platform media is temporarily unavailable. Please try again.' })
  })
}