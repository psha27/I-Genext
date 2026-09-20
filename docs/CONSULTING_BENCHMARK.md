# Consulting website benchmark and implementation
Reviewed 13 September 2026. Ten leading global consulting firms selected as a representative peer set, not an asserted numerical ranking. Review covers publicly accessible homepages and their navigation/content; it is not an exhaustive crawl of every page or a test of authenticated features. Regional redirects are noted below.

| Firm / primary source | Observed website pattern | I-Genext application |
| --- | --- | --- |
| [McKinsey](https://www.mckinsey.com/) | Tech & AI alongside capabilities and industries; insight subscription; research and client stories | Technology embedded across services; practical insight library |
| [BCG](https://www.bcg.com/) | Industry/capability navigation, BCG X, BCG Answer, saved content and subscriptions | Searchable expertise, browser reading list, guided discovery |
| [Bain](https://www.bain.com/) | Client results, AI-focused stories and a clear contact invitation | Outcome-oriented service details and contextual enquiries |
| [Accenture](https://www.accenture.com/en) | AI/data, cloud, cybersecurity and engineering integrated into service navigation | Dedicated AI/data offering connected to business workflows |
| [Deloitte](https://www.deloitte.com/global/en.html) | Industry thinking, topic navigation, alliances and agentic AI content | Industry use cases and governance-led AI messaging |
| [PwC](https://www.pwc.com/gx/en.html) | AI value creation, reinvention and client stories | Transparent automation capacity-value calculator |
| [EY](https://www.ey.com/en_be) | Search across insights/services/people, case studies and AI blueprints; homepage redirected to Belgium | Search and readable perspectives linked to a conversation |
| [KPMG](https://kpmg.com/xx/en.html) | Technology-enabled client stories, topic discovery and personalised insights | Topic filters and technology mapped to operating outcomes |
| [Oliver Wyman](https://www.oliverwyman.com/index.html) | Search, practical AI positioning, client story, experts and careers | Contextual industry journeys and direct contact routing |
| [Kearney](https://www.kearney.com/) | Research formats, newsletter, industry navigation and short contact intake | Filterable perspectives and concise enquiry journey |

## Interpretation and differentiation
The repeated pattern is a connected journey from expertise to evidence to conversation. The readiness diagnostic and calculator are our implementation choices inspired by this pattern, not claims that all peers offer identical tools. Original I-Genext copy is used; no competitor imagery, proprietary reports, client logos or performance claims are copied.

## Delivered functionality
- Search across capabilities, industries, insights and tools; keyboard shortcut and native accessible dialogs.
- Expandable service details with technology, deliverables and implementation steps.
- Interactive industry-specific example engagements, labelled illustrative.
- Five-dimension AI readiness self-assessment with transparent scoring, personalised priorities, downloadable text report and enquiry handoff.
- Automation scenario calculator with editable assumptions, capacity value, running costs, payback and downloadable text report.
- Insight articles with topic/query filters, saved reading list and shareable hash links.
- Working demonstration dashboard CSV export; sample figures clearly labelled.
- Validated enquiry intake, consent, honeypot, rate limiting and error recovery.
- MySQL storage when configured; durable local file storage for development only.
- Brand-preserving responsive UI, visible keyboard focus, reduced-motion support, mobile navigation and privacy explanation.
- One development command starts the UI and API.

## Deliberate boundaries and launch dependencies
No live LLM/chatbot, fabricated client results, fake vacancies, email delivery or account authentication is claimed. The original plan's authenticated PDFs, CMS, admin, jobs and email notifications remain separate integrations. Insights are original draft editorial content and should be reviewed by the firm before publication.

Before public launch: provide a MySQL database and apply the existing schema, configure DATABASE_URL and CLIENT_ORIGIN, serve /api through a same-origin reverse proxy, review editorial/service/privacy copy, define data retention and authorised lead access, and connect a transactional email provider if notifications are desired. For a multi-instance deployment replace in-memory rate limiting with a shared store and configure trusted proxy handling explicitly. Reference IDs indicate storage success, not email delivery.

Readiness is a self-assessment, not an externally validated benchmark. Calculator value is productive capacity, not a guarantee of cash savings. Neither requires sending data to the server unless a user chooses to share their assessment in an enquiry.

## Verification
- Production TypeScript/Vite build passes.
- 11 Node tests pass for scoring, calculator edge cases, validation, durable development storage, API errors, malformed/oversized requests and rate limiting.
- Headless Chromium checks pass for search, capability expansion, industry switching, assessment/report/enquiry handoff, calculator errors, saved and deep-linked insights, Escape dismissal, CSV export, enquiry failure recovery and successful local persistence.
- Responsive widths checked: 390, 768, 1024 and 1440 pixels. Screenshots reviewed at mobile and desktop; a mobile hero width regression was corrected and covered by an assertion.
- No browser runtime errors in the checked journeys.
- MySQL integration code is present but was not exercised against a live MySQL instance because none was configured.
- Browser checks are in scripts/browser-check.mjs. They require a separately available Playwright installation and Chromium; PLAYWRIGHT_MODULE can point to its index.mjs, and TEST_BASE_URL selects the running site.