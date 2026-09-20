import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createMysqlCareersStore } from './careers-mysql.js'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const defaultDirectory = fileURLToPath(new URL('../data/careers/', import.meta.url))
export function createCareersStore({ directory = process.env.CAREERS_DATA_DIR || defaultDirectory, databaseUrl = process.env.DATABASE_URL, nodeEnv = process.env.NODE_ENV } = {}) {
  if (databaseUrl) return createMysqlCareersStore(databaseUrl)
  if (nodeEnv === 'production') throw new Error('DATABASE_URL is required for careers in production. Apply migration 003_careers.sql.')
  const root = path.resolve(directory), stateFile = path.join(root, 'records.json')
  let pending = Promise.resolve()
  const empty = () => ({ jobs: [], applications: [], notifications: [] })
  async function read() {
    try { return JSON.parse(await fs.readFile(stateFile, 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') return empty(); throw error }
  }
  async function write(state) {
    await fs.mkdir(root, { recursive: true })
    const temp = stateFile + '.' + randomUUID() + '.tmp'
    try { await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 }); await fs.rename(temp, stateFile) }
    finally { await fs.unlink(temp).catch(() => {}) }
  }
  function mutate(callback) {
    const result = pending.then(async () => { const state = await read(); const value = await callback(state); await write(state); return value })
    pending = result.catch(() => {})
    return result
  }
  async function snapshot() { await pending; return read() }
  return {
    mode: 'private-file',
    async jobs(publicOnly = false) {
      const state = await snapshot()
      return state.jobs.filter(job => !publicOnly || job.status === 'open').sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    saveJob(data, id) {
      return mutate(state => {
        const previous = id && state.jobs.find(job => job.id === id)
        if (id && !previous) throw Object.assign(new Error('Opening not found.'), { status: 404 })
        const now = new Date().toISOString()
        const job = { ...previous, ...data, id: previous?.id || randomUUID(), createdAt: previous?.createdAt || now, updatedAt: now }
        if (previous) state.jobs[state.jobs.indexOf(previous)] = job
        else state.jobs.push(job)
        return job
      })
    },
    async apply(jobId, candidate, file) {
      const reference = 'IG-APP-' + randomUUID().toUpperCase()
      let resumeWritten = false
      return mutate(async state => {
        const job = state.jobs.find(row => row.id === jobId && row.status === 'open')
        if (!job) throw Object.assign(new Error('This opening is no longer accepting applications.'), { status: 409 })
        const resumeKey = reference + '.pdf'
        await fs.mkdir(root, { recursive: true })
        await fs.writeFile(path.join(root, resumeKey), file.buffer, { mode: 0o600, flag: 'wx' })
        resumeWritten = true
        const application = { reference, jobId, jobTitle: job.title, jobLocation: job.location, candidate, resumeKey, resumeName: 'resume.pdf', createdAt: new Date().toISOString() }
        state.applications.push(application)
        for (const kind of ['candidate', 'company']) state.notifications.push({ reference: randomUUID(), applicationReference: reference, kind, status: 'pending', attempts: 0, nextAttempt: 0 })
        return reference
      }).catch(async error => {
        if (resumeWritten) await fs.unlink(path.join(root, reference + '.pdf')).catch(() => {})
        throw error
      })
    },
    async applications(query = '') {
      const state = await snapshot()
      return state.applications.map(({ resumeKey, ...row }) => ({
        ...row,
        emails: Object.fromEntries(state.notifications.filter(n => n.applicationReference === row.reference).map(n => [n.kind,n.status]))
      })).filter(row => !query || JSON.stringify([row.reference,row.jobTitle,row.candidate]).toLowerCase().includes(query.toLowerCase()))
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
    },
    async resume(reference) {
      const state = await snapshot()
      const row = state.applications.find(a => a.reference === reference)
      if (!row) return null
      return { name: row.resumeName, buffer: await fs.readFile(path.join(root, row.resumeKey)) }
    },
    claimEmail() {
      return mutate(state => {
        const now = Date.now()
        for (const n of state.notifications) if (n.status === 'sending' && n.nextAttempt <= now && n.attempts >= 3) n.status = 'failed'
        const task = state.notifications.find(n => ['pending','sending'].includes(n.status) && n.attempts < 3 && n.nextAttempt <= now)
        if (!task) return null
        task.status = 'sending'; task.attempts++; task.nextAttempt = now + 300000
        return { ...task, application: state.applications.find(a => a.reference === task.applicationReference) }
      })
    },
    finishEmail(reference, sent, attempts) {
      return mutate(state => {
        const task = state.notifications.find(n => n.reference === reference)
        if (!task || task.attempts !== attempts || task.status !== 'sending') return
        task.status = sent ? 'sent' : attempts >= 3 ? 'failed' : 'pending'
        task.nextAttempt = Date.now() + 60000 * attempts
      })
    },
    retryEmails(reference) {
      return mutate(state => {
        for (const n of state.notifications) if (n.applicationReference === reference && n.status === 'failed') {
          n.status = 'pending'; n.attempts = 0; n.nextAttempt = 0
        }
      })
    },
    async close() { await pending }
  }
}
