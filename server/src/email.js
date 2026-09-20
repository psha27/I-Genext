
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function acknowledgementMessage(lead, { responseTime = 'two business days' } = {}) {
  const subject = 'Thank you for reaching out to I-Genext'
  const text = 'Dear ' + lead.name + ',\n\nThank you so much for your interest in I-Genext and for taking the time to connect with us. We appreciate the opportunity to learn more about your business and explore how we can support you.\n\nWe have received your enquiry. Our team will review the details you have shared and aims to get back to you within ' + responseTime + '. We look forward to understanding your priorities and discussing the right way forward together.\n\nYour enquiry reference is ' + lead.reference + '.\n\nThank you once again for considering us.\n\nWarm regards,\nThe I-Genext Team\nConsulting. Technology. Outcomes.'
  const paragraphs = text.split('\n\n').map(p => '<p style="margin:0 0 20px;line-height:1.7">' + escapeHtml(p).replaceAll('\n','<br>') + '</p>').join('')
  const html = '<!doctype html><html><body style="margin:0;background:#f3f5f8;font-family:Arial,sans-serif;color:#26334b"><div style="max-width:600px;margin:32px auto;background:#fff"><div style="background:#000;padding:28px 32px;border-bottom:4px solid #1D4ED8;color:#fff;font-size:27px">I-Genext</div><div style="padding:32px">' + paragraphs + '</div></div></body></html>'
  return { subject, text, html }
}
export function createMailer(env = process.env, request = fetch) {
  const configured = Boolean(env.M365_TENANT_ID && env.M365_CLIENT_ID && env.M365_CLIENT_SECRET)
  const sender = env.EMAIL_FROM || 'info@i-genext.com'
  let token, expires = 0
  return {
    configured,
    async send(lead) {
      if (!configured) throw new Error('MICROSOFT_365_NOT_CONFIGURED')
      if (!token || Date.now() >= expires) {
        const response = await request('https://login.microsoftonline.com/' + encodeURIComponent(env.M365_TENANT_ID) + '/oauth2/v2.0/token', {
          method: 'POST', signal: AbortSignal.timeout(15000),
          body: new URLSearchParams({ client_id: env.M365_CLIENT_ID, client_secret: env.M365_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
        })
        if (!response.ok) throw new Error('MICROSOFT_365_AUTH_FAILED')
        const data = await response.json()
        if (!data.access_token) throw new Error('MICROSOFT_365_AUTH_FAILED')
        token = data.access_token; expires = Date.now() + Math.max(0, Number(data.expires_in || 3600) - 120) * 1000
      }
      const message = lead.mail || acknowledgementMessage(lead, { responseTime: env.EMAIL_RESPONSE_TIME || 'two business days' })
      const response = await request('https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(sender) + '/sendMail', {
        method: 'POST', signal: AbortSignal.timeout(20000),
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: {
          subject: message.subject, body: { contentType: 'HTML', content: message.html },
          toRecipients: [{ emailAddress: { address: lead.email, name: lead.name } }],
          replyTo: [{ emailAddress: { address: message.replyTo || env.EMAIL_REPLY_TO || sender, name: 'I-Genext Team' } }],
          internetMessageHeaders: [{ name: 'x-igenext-reference', value: lead.reference }],
          ...(message.attachments ? { attachments: message.attachments } : {})
        }, saveToSentItems: true })
      })
      if (response.status === 401) { token = undefined; expires = 0 }
      if (response.status !== 202) throw new Error('MICROSOFT_365_SEND_FAILED')
      return lead.reference
    },
    close() { token = undefined }
  }
}
export function startEmailWorker(store, mailer, { intervalMs = 15000 } = {}) {
  let stopped = false, running
  async function processQueue() {
    if (stopped || running || !mailer.configured) return
    running = (async () => {
      for (let i = 0; i < 10 && !stopped; i++) {
        const lead = await store.claimEmail()
        if (!lead) break
        let sent = false
        try { await mailer.send(lead); sent = true }
        catch { /* Contact remains saved; queue records a retry without sensitive provider details. */ }
        await store.finishEmail(lead.reference, sent, lead.attempts)
      }
    })()
    try { await running } catch { console.error('Acknowledgement queue processing failed; no client details logged.') } finally { running = undefined }
  }
  const timer = setInterval(processQueue, intervalMs); timer.unref()
  void processQueue()
  return { kick: () => void processQueue(), async stop() { stopped = true; clearInterval(timer); await running; mailer.close() } }
}
