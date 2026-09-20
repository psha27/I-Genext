import mysql from 'mysql2/promise'
import { randomUUID } from 'node:crypto'
const parse = value => typeof value === 'string' ? JSON.parse(value) : value
export function createMysqlCareersStore(url) {
  const pool = mysql.createPool(url)
  async function transaction(work) {
    const conn = await pool.getConnection()
    try { await conn.beginTransaction(); const value = await work(conn); await conn.commit(); return value }
    catch (error) { await conn.rollback(); throw error }
    finally { conn.release() }
  }
  return {
    mode: 'mysql',
    async jobs(publicOnly = false) {
      const [rows] = await pool.query('SELECT data FROM career_openings' + (publicOnly ? " WHERE status = 'open'" : '') + ' ORDER BY updated_at DESC')
      return rows.map(row => parse(row.data))
    },
    async saveJob(data,id) {
      return transaction(async conn => {
        let previous
        if (id) {
          const [rows] = await conn.execute('SELECT data FROM career_openings WHERE id = ? FOR UPDATE',[id])
          if (!rows.length) throw Object.assign(new Error('Opening not found.'),{status:404})
          previous = parse(rows[0].data)
        }
        const now = new Date().toISOString()
        const job = { ...previous,...data,id: id || randomUUID(),createdAt: previous?.createdAt || now,updatedAt:now }
        if (id) await conn.execute('UPDATE career_openings SET status = ?, data = ? WHERE id = ?',[job.status,JSON.stringify(job),id])
        else await conn.execute('INSERT INTO career_openings (id,status,data) VALUES (?,?,?)',[job.id,job.status,JSON.stringify(job)])
        return job
      })
    },
    async apply(jobId,candidate,file) {
      return transaction(async conn => {
        const [jobs] = await conn.execute("SELECT data FROM career_openings WHERE id = ? AND status = 'open' FOR UPDATE",[jobId])
        if (!jobs.length) throw Object.assign(new Error('This opening is no longer accepting applications.'),{status:409})
        const job = parse(jobs[0].data), reference = 'IG-APP-' + randomUUID().toUpperCase()
        const application = { reference,jobId,jobTitle:job.title,jobLocation:job.location,candidate,resumeName:'resume.pdf',createdAt:new Date().toISOString() }
        await conn.execute('INSERT INTO career_applications (reference,job_id,data,resume_content) VALUES (?,?,?,?)',[reference,jobId,JSON.stringify(application),file.buffer])
        for (const kind of ['candidate','company']) await conn.execute('INSERT INTO career_notifications (reference,application_reference,kind) VALUES (?,?,?)',[randomUUID(),reference,kind])
        return reference
      })
    },
    async applications(query = '') {
      const [rows] = await pool.query("SELECT a.data, c.status AS candidate_status, n.status AS company_status FROM career_applications a LEFT JOIN career_notifications c ON c.application_reference = a.reference AND c.kind = 'candidate' LEFT JOIN career_notifications n ON n.application_reference = a.reference AND n.kind = 'company' ORDER BY a.created_at DESC")
      return rows.map(row => ({ ...parse(row.data),emails:{candidate:row.candidate_status,company:row.company_status} }))
        .filter(row => !query || JSON.stringify([row.reference,row.jobTitle,row.candidate]).toLowerCase().includes(query.toLowerCase()))
    },
    async resume(reference) {
      const [rows] = await pool.execute('SELECT resume_content FROM career_applications WHERE reference = ?',[reference])
      return rows.length ? { name:'resume.pdf',buffer:rows[0].resume_content } : null
    },
    async claimEmail() {
      return transaction(async conn => {
        await conn.query("UPDATE career_notifications SET status = 'failed' WHERE status = 'sending' AND attempts >= 3 AND next_attempt_at <= NOW()")
        const [rows] = await conn.query("SELECT reference, application_reference, kind, attempts FROM career_notifications WHERE status IN ('pending','sending') AND attempts < 3 AND next_attempt_at <= NOW() ORDER BY next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED")
        if (!rows.length) return null
        const task = rows[0]
        await conn.execute("UPDATE career_notifications SET status = 'sending', attempts = attempts + 1, next_attempt_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE reference = ?",[task.reference])
        const [applications] = await conn.execute('SELECT data FROM career_applications WHERE reference = ?',[task.application_reference])
        return { reference:task.reference,kind:task.kind,attempts:task.attempts+1,application:parse(applications[0].data) }
      })
    },
    async finishEmail(reference,sent,attempts) {
      await pool.execute("UPDATE career_notifications SET status = ?, next_attempt_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE reference = ? AND status = 'sending' AND attempts = ?",[sent?'sent':attempts>=3?'failed':'pending',attempts*60,reference,attempts])
    },
    async retryEmails(reference) {
      await pool.execute("UPDATE career_notifications SET status = 'pending', attempts = 0, next_attempt_at = NOW() WHERE application_reference = ? AND status = 'failed'",[reference])
    },
    close: () => pool.end()
  }
}
