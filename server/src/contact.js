import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import mysql from 'mysql2/promise'

const areas = new Set(['AI, Data & Automation', 'Governance, Risk & Compliance', 'Corporate Finance', 'Management Consulting', 'Audit & Taxation', 'Technology Enablement', 'Careers', 'Finance Advisory', 'Forensic Services', 'Tech Solutions'])
export function validateContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Please provide your enquiry details.' }
  const limits = { name: [2, 160], email: [3, 255], company: [2, 180], designation: [2, 160], phone: [7, 40], area: [1, 180], message: [10, 6000] }
  const data = {}
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (typeof body[key] !== 'string') return { error: 'Please complete all required fields.' }
    data[key] = body[key].trim()
    if (data[key].length < min || data[key].length > max) return { error: 'Please check the length of your ' + key + '.' }
  }
  if (!/^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/.test(data.email)) return { error: 'Please enter a valid email address.' }
  const digits = data.phone.replace(/\D/g, '')
  if (!/^\+?[0-9\s().-]+$/.test(data.phone) || digits.length < 7 || digits.length > 15) return { error: 'Please enter a valid mobile number, including your country code.' }
  if (!areas.has(data.area)) return { error: 'Please choose an area of interest.' }
  if (body.consent !== 'yes') return { error: 'Please agree to the use of your details for this enquiry.' }
  if (body.website) return { error: 'Unable to accept this enquiry.' }
  return { data }
}
function normalized(row) {
  return { reference: row.reference || 'IG-' + row.id, name: row.name ?? row.full_name, email: row.email, phone: row.phone || '', designation: row.designation || '', company: row.company, area: row.area ?? row.area_of_interest, message: row.message, createdAt: row.createdAt || row.created_at, emailStatus: row.emailStatus || row.email_status || 'not_requested' }
}
export function createContactStore(env = process.env) {
  if (env.DATABASE_URL) {
    const pool = mysql.createPool(env.DATABASE_URL)
    return {
      mode: 'mysql',
      async save(data) {
        const conn = await pool.getConnection()
        try {
          await conn.beginTransaction()
          const [result] = await conn.execute('INSERT INTO contact_leads (full_name, email, phone, designation, company, area_of_interest, message) VALUES (?, ?, ?, ?, ?, ?, ?)', [data.name, data.email, data.phone, data.designation, data.company, data.area, data.message])
          const reference = 'IG-' + result.insertId
          await conn.execute('INSERT INTO contact_acknowledgements (lead_id, reference) VALUES (?, ?)', [result.insertId, reference])
          await conn.commit()
          return reference
        } catch (error) { await conn.rollback(); throw error } finally { conn.release() }
      },
      async listRequests() {
        const [rows] = await pool.query('SELECT c.*, a.status AS email_status FROM contact_leads c LEFT JOIN contact_acknowledgements a ON a.lead_id = c.id ORDER BY c.created_at DESC, c.id DESC')
        return rows.map(normalized)
      },
      async claimEmail() {
        await pool.query("UPDATE contact_acknowledgements SET status = 'failed' WHERE status = 'sending' AND attempts >= 3 AND next_attempt_at <= NOW()")
        const [rows] = await pool.query("SELECT a.reference, a.attempts, c.full_name AS name, c.email FROM contact_acknowledgements a JOIN contact_leads c ON c.id = a.lead_id WHERE a.status IN ('pending','sending') AND a.attempts < 3 AND a.next_attempt_at <= NOW() ORDER BY a.next_attempt_at LIMIT 1")
        if (!rows.length) return null
        const lead = rows[0]
        const [result] = await pool.execute("UPDATE contact_acknowledgements SET status = 'sending', attempts = attempts + 1, next_attempt_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE reference = ? AND status IN ('pending','sending') AND attempts < 3 AND next_attempt_at <= NOW()", [lead.reference])
        return result.affectedRows ? { ...lead, attempts: lead.attempts + 1 } : null
      },
      async finishEmail(reference, sent, attempts) {
        await pool.execute('UPDATE contact_acknowledgements SET status = ?, sent_at = ?, next_attempt_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE reference = ?', [sent ? 'sent' : attempts >= 3 ? 'failed' : 'pending', sent ? new Date() : null, 60 * attempts, reference])
      },
      close: () => pool.end()
    }
  }
  if (env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production. Apply database/schema.sql before starting.')
  const directory = resolve(env.DATA_DIR || fileURLToPath(new URL('../data', import.meta.url)))
  async function rows(file) {
    try { return (await readFile(resolve(directory, file), 'utf8')).split('\n').filter(x => x.trim()).map(x => JSON.parse(x)) }
    catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  async function append(file, row) {
    await mkdir(directory, { recursive: true })
    await appendFile(resolve(directory, file), JSON.stringify(row) + '\n', { mode: 0o600 })
  }
  async function state() {
    const events = new Map((await rows('acknowledgements.jsonl')).map(row => [row.reference, row]))
    return (await rows('contact-leads.jsonl')).map(row => {
      const event = events.get(row.reference) || {}
      const exhausted = event.status === 'sending' && event.attempts >= 3 && Date.parse(event.nextAttemptAt) <= Date.now()
      return { ...row, ...event, emailStatus: exhausted ? 'failed' : event.status || (row.acknowledgement ? 'pending' : 'not_requested') }
    })
  }
  let claiming = false
  return {
    mode: 'local-development',
    async save(data) {
      const reference = 'IG-' + randomUUID()
      await append('contact-leads.jsonl', { reference, ...data, consent: true, consentVersion: 'enquiry-v2', acknowledgement: true, createdAt: new Date().toISOString() })
      return reference
    },
    async listRequests() { return (await state()).map(normalized).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))) },
    async claimEmail() {
      if (claiming) return null
      claiming = true
      try {
        const lead = (await state()).find(row => ['pending','sending'].includes(row.emailStatus) && (row.attempts || 0) < 3 && (!row.nextAttemptAt || Date.parse(row.nextAttemptAt) <= Date.now()))
        if (!lead) return null
        const attempts = (lead.attempts || 0) + 1
        await append('acknowledgements.jsonl', { reference: lead.reference, status: 'sending', attempts, nextAttemptAt: new Date(Date.now() + 300000).toISOString() })
        return { ...lead, attempts }
      } finally { claiming = false }
    },
    async finishEmail(reference, sent, attempts) {
      await append('acknowledgements.jsonl', { reference, status: sent ? 'sent' : attempts >= 3 ? 'failed' : 'pending', attempts, nextAttemptAt: new Date(Date.now() + 60000 * attempts).toISOString(), sentAt: sent ? new Date().toISOString() : null })
    },
    async close() {}
  }
}
