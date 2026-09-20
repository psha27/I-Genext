export const capabilities = [
  { id: 'ai', title: 'AI, Data & Automation', summary: 'Turn promising experiments into useful, governed business workflows.', tech: 'AI use-case prioritisation · Human-in-the-loop agents · Data quality · Workflow integration', outcome: 'A prioritised use-case portfolio, a measurable pilot and an adoption roadmap.', steps: ['Identify high-friction decisions and establish a baseline.', 'Connect approved data and build a bounded pilot with human review.', 'Evaluate accuracy, cost and adoption before expanding.'] },
  { id: 'grc', title: 'Governance, Risk & Compliance', summary: 'Make risk visible and accountability part of everyday operations.', tech: 'Continuous control monitoring · Evidence workflows · Risk dashboards', outcome: 'A connected control environment with clear owners and actionable exceptions.', steps: ['Map obligations, risks and accountable owners.', 'Digitise evidence collection and exception routing.', 'Monitor control effectiveness and remediation progress.'] },
  { id: 'finance', title: 'Corporate Finance', summary: 'Bring greater clarity to capital allocation and finance decisions.', tech: 'Scenario modelling · Connected planning · Finance analytics', outcome: 'Decision-ready scenarios and a finance operating model built for speed.', steps: ['Agree the decision, assumptions and trusted data sources.', 'Model alternatives and expose the key sensitivities.', 'Connect approved decisions to reporting and ownership.'] },
  { id: 'strategy', title: 'Management Consulting', summary: 'Connect your growth ambition to the way your business actually works.', tech: 'Process mining · Performance intelligence · Digital operating models', outcome: 'An executable roadmap with owners, milestones and measurable outcomes.', steps: ['Diagnose constraints across customers, processes and people.', 'Design the target operating model and prioritise initiatives.', 'Embed performance reviews and support implementation.'] },
  { id: 'audit', title: 'Audit & Taxation', summary: 'Build confidence through structured evidence and stronger processes.', tech: 'Evidence management · Analytics-assisted testing · Compliance calendars', outcome: 'Traceable evidence, a clear issue register and better review readiness.', steps: ['Define scope, reporting requirements and evidence needs.', 'Use analytics to direct professional review to exceptions.', 'Track remediation and strengthen recurring processes.'] },
  { id: 'finance-advisory', title: 'Finance Advisory', summary: 'Bring structure, ownership and reliable execution to the finance function.', tech: 'Connected reporting · Accounting workflows · Payroll automation', outcome: 'A finance operating rhythm with clear responsibilities and dependable reporting.', steps: ['Map accounting, payroll and reporting requirements.', 'Connect source data and standardise recurring workflows.', 'Track exceptions, closure and reporting quality.'] },
  { id: 'forensic', title: 'Forensic Services', summary: 'Investigate business concerns with structured analysis and evidence.', tech: 'Digital forensics · Data recovery · Investigation analytics', outcome: 'A scoped investigation and documented findings to support informed decisions.', steps: ['Agree investigation scope and evidence-handling requirements.', 'Review relevant records and conduct targeted analysis.', 'Document findings and recommend practical remediation.'] },
  { id: 'tech-solutions', title: 'Tech Solutions', summary: 'Connect consulting insight to AI-native platforms and custom technology.', tech: 'Tvat AI platforms · Decision intelligence · Finance and real estate automation', outcome: 'A technology scope aligned to your processes, integration needs and operating priorities.', steps: ['Assess workflow requirements and platform suitability.', 'Define configuration, integrations and human oversight.', 'Agree delivery scope and measures before implementation.'] }

]
export const industries = [
  { title: 'Manufacturing', challenge: 'Connect factory decisions to business performance.', useCase: 'Join production, procurement and finance data to identify bottlenecks and route exceptions to the right owner.', tech: 'Process analytics / IoT data / Approval workflows', measures: 'Cycle time, downtime, inventory accuracy', capability: 'strategy' },
  { title: 'Financial Services', challenge: 'Move faster with trust built into the workflow.', useCase: 'Combine risk indicators, evidence and human review in a governed exception-management workflow.', tech: 'Control monitoring / Data lineage / Responsible AI', measures: 'Exception age, review turnaround, evidence coverage', capability: 'grc' },
  { title: 'Real Estate & Infrastructure', challenge: 'Keep capital projects visible and accountable.', useCase: 'Connect business cases, approval limits and project spend to surface budget exceptions earlier.', tech: 'Capex workflows / Scenario planning / Portfolio dashboards', measures: 'Approval time, forecast variance, milestone progress', capability: 'finance' },
  { title: 'Consumer & Retail', challenge: 'Translate customer signals into better decisions.', useCase: 'Bring demand, inventory and margin signals together for planning and targeted operational action.', tech: 'Demand analytics / Connected planning / Automation', measures: 'Forecast accuracy, stock availability, decision time', capability: 'ai' },
  { title: 'Technology & Services', challenge: 'Scale delivery without scaling complexity.', useCase: 'Standardise onboarding, service workflows and project visibility while keeping expert judgement in the loop.', tech: 'Workflow orchestration / Knowledge retrieval / Delivery analytics', measures: 'Onboarding time, rework, service turnaround', capability: 'ai' }
]
export const articles = [
  { slug: 'ai-pilot-to-operating-model', topic: 'AI & Technology', title: 'Your AI pilot works. What happens on Monday?', summary: 'A practical blueprint for moving from a promising demo to an everyday business capability.', body: [
    ['Start with a decision, not a model', 'Choose a recurring decision with a named owner, a measurable baseline and a clear cost of error. Record how the team works today before introducing automation. A faster draft is only useful if the complete workflow becomes better.'],
    ['Design the handoff', 'Specify which inputs are permitted, what the system can recommend and when a person must review or override it. Treat missing context and uncertain outputs as normal operating conditions, with a clear escalation path.'],
    ['Evaluate the whole workflow', 'Test representative cases, difficult exceptions and outdated source material. Track quality, handling time, reviewer effort and operating cost together. Set acceptance criteria before evaluating the pilot.'],
    ['Make adoption an operating responsibility', 'Assign ownership for training, data maintenance, monitoring and rollback. Expand only when the people running the process can explain the results and manage the exceptions.']
  ] },
  { slug: 'continuous-control-monitoring', topic: 'Governance & Risk', title: 'From periodic assurance to continuous visibility', summary: 'Connect evidence, ownership and exceptions without adding another layer of bureaucracy.', body: [
    ['Begin with a control objective', 'Identify the failure you want to detect, the process owner and the evidence that demonstrates the control operates. More alerts do not automatically mean better assurance.'],
    ['Make evidence traceable', 'Record the source, collection time and reviewer for each item. Design access around responsibilities and preserve a history of changes so that reviewers can reconstruct the decision.'],
    ['Route exceptions deliberately', 'Give every exception an owner, a due date and an escalation route. Tune thresholds using reviewed examples and monitor false positives alongside unresolved issues.'],
    ['Keep professional judgement central', 'Monitoring supports review; it does not establish assurance by itself. Use a recurring review to challenge control design, investigate patterns and confirm that remediation addresses the underlying issue.']
  ] },
  { slug: 'automation-value', topic: 'AI & Technology', title: 'Automate the friction. Measure the value.', summary: 'Separate time released from money saved before committing to automation.', body: [
    ['Map the real process', 'Follow work from request to completion, including rework, handoffs and approval queues. Remove redundant steps before choosing a tool.'],
    ['Use realistic assumptions', 'Estimate task volume, handling time and the proportion of work automation can safely address. Apply an adoption assumption and include the effort required to review exceptions.'],
    ['Separate capacity from cash', 'Hours released may improve service or create capacity without reducing expenditure. A cash savings case needs a specific plan for how costs will change.'],
    ['Include the full cost', 'Account for implementation, integration, licensing, maintenance, monitoring and change management. Review actual outcomes against the baseline after deployment.']
  ] },
  { slug: 'finance-decision-speed', topic: 'Finance', title: 'Design finance for decision speed', summary: 'Better reporting starts with ownership, trusted inputs and explicit assumptions.', body: [
    ['Work backwards from the decision', 'Identify the decision the report supports, who makes it and when it is needed. Retire metrics that do not change an action or explain a meaningful risk.'],
    ['Connect inputs and assumptions', 'Define ownership for source data, reconciliations and planning assumptions. Make changes visible so decision makers can understand why a forecast moved.'],
    ['Compare scenarios', 'Model a small number of plausible scenarios and the variables that matter most. Use ranges where inputs are uncertain and show which assumptions drive the result.'],
    ['Close the loop', 'Compare decisions with subsequent outcomes. Use variance reviews to improve the model and process rather than simply expanding the reporting pack.']
  ] }
]
export const questions = [
  { title: 'Strategy & ownership', question: 'How clearly is AI connected to business priorities?', options: ['No agreed priorities yet', 'Use cases identified', 'Funded pilots with owners', 'Portfolio governed by business outcomes'], action: 'Define a business outcome, executive sponsor and measurable pilot success criteria.' },
  { title: 'Data foundations', question: 'How ready is the data your teams need?', options: ['Fragmented and hard to access', 'Some trusted datasets', 'Documented, permissioned sources', 'Monitored quality and clear lineage'], action: 'Inventory source data, assign owners and resolve access and quality gaps.' },
  { title: 'Process & technology', question: 'How connected are your core workflows?', options: ['Mostly manual handoffs', 'Standalone digital tools', 'Integrated workflows in some teams', 'Monitored integrations across the business'], action: 'Map one end-to-end workflow and establish a reliable integration boundary.' },
  { title: 'People & adoption', question: 'How prepared are people to use new tools?', options: ['No structured enablement', 'A few early adopters', 'Role-based training and champions', 'Adoption measured and continuously improved'], action: 'Create role-specific training and give process owners time to support adoption.' },
  { title: 'Governance & evaluation', question: 'How do you manage AI quality and risk?', options: ['No defined review process', 'Informal human checks', 'Documented evaluations and escalation', 'Ongoing monitoring, review and rollback'], action: 'Define evaluation cases, human review, access controls and rollback procedures.' }
]
export function readiness(answers: number[]) {
  if (answers.length !== questions.length || answers.some(x => !Number.isInteger(x) || x < 0 || x > 3)) throw new Error('Complete all five questions.')
  const score = Math.round(answers.reduce((a, b) => a + b, 0) / 15 * 100)
  return { score, stage: score < 40 ? 'Build the foundations' : score < 75 ? 'Prepare to scale' : 'Scale with discipline', priorities: questions.filter((_, i) => answers[i] < 2).map(q => q.action) }
}
export function automationValue(hours: number, rate: number, automation: number, adoption: number, investment: number, monthlyCost: number) {
  const values = [hours, rate, automation, adoption, investment, monthlyCost]
  if (values.some(n => !Number.isFinite(n) || n < 0) || automation > 100 || adoption > 100) throw new Error('Enter valid, non-negative assumptions.')
  const released = hours * automation / 100 * adoption / 100
  const annual = released * rate * 12
  const net = annual - monthlyCost * 12
  return { released, annual, net, payback: net > 0 ? investment / (net / 12) : null }
}
export function downloadText(name: string, text: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function enquiry(area: string, message = '') {
  window.dispatchEvent(new CustomEvent('igenext:enquiry', { detail: { area, message } }))
  window.location.hash = 'contact'
  setTimeout(() => document.getElementById('contact-name')?.focus({ preventScroll: true }), 150)
}
