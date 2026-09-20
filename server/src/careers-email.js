import { candidateFields } from './careers.js'
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
export async function careerEmail(task, store, recipient = 'careers@i-genext.com') {
  const application = task.application, candidate = application.candidate
  const name = [candidate.firstName,candidate.middleName,candidate.lastName].filter(Boolean).join(' ')
  const reference = application.reference
  const company = task.kind === 'company'
  const subject = company ? 'Application: ' + application.jobTitle + ' | ' + reference : 'Your I-Genext application | ' + reference
  const text = company
    ? 'A new application has been received for ' + application.jobTitle + ' (' + application.jobLocation + ').\n\nReference: ' + reference + '\n\n' + Object.entries(candidateFields).map(([key,label]) => label + ': ' + (candidate[key] || 'Not provided')).join('\n') + '\n\nThe candidate resume is attached. Review this application in the admin workspace.'
    : 'Dear ' + candidate.firstName + ',\n\nThank you for your interest in joining I-Genext and for taking the time to share your experience with us.\n\nWe have received your application for ' + application.jobTitle + '. Our recruitment team will review your profile and reach out if your experience aligns with the role.\n\nYour application reference is ' + reference + '. Please keep this ID and include it when writing to ' + recipient + ' about your application.\n\nWe appreciate the opportunity to get to know you and wish you every success in your career journey.\n\nWarm regards,\nThe I-Genext Careers Team\nEngage · Enrich · Empower'
  const mail = {
    subject, html: '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172238"><h1 style="background:#000;color:white;padding:24px;border-bottom:4px solid #1D4ED8">I-Genext Careers</h1>' + text.split('\n\n').map(p => '<p style="line-height:1.7">' + escape(p).replaceAll('\n','<br>') + '</p>').join('') + '</div>',
    replyTo: company ? candidate.email : recipient
  }
  if (company) {
    const resume = await store.resume(reference)
    if (!resume) throw new Error('RESUME_UNAVAILABLE')
    mail.attachments = [{ '@odata.type':'#microsoft.graph.fileAttachment', name: 'resume-' + reference + '.pdf', contentType: 'application/pdf', contentBytes: resume.buffer.toString('base64') }]
  }
  return { reference, name: company ? 'I-Genext Careers' : name, email: company ? recipient : candidate.email, mail }
}
