# I-Genext consulting website

React + TypeScript + Vite frontend, Express API and optional MySQL storage. The August 2026 I-Genext / Tvat AI profile informs the content, original logos and leadership portraits. The interface uses a black base with royal blue, turquoise, dark blue, sky blue and violet accents.

## Run
```sh
npm install
npm run dev
```
Or open start-dev.bat. This starts both the frontend (http://localhost:5173) and API (http://localhost:4000). Keep the terminal open; Ctrl+C stops the development processes.

## Validate
```sh
npm run build
npm test
```

## Functionality
Searchable capabilities; interactive industries; AI readiness assessment with download and enquiry handoff; automation value calculator; readable/filterable/saved insights; sample dashboard CSV export; validated persistent contact intake.

See [the ten-firm research and feature mapping](docs/CONSULTING_BENCHMARK.md).

## Enquiry storage
Without DATABASE_URL, development requests are appended to server/data/contact-leads.jsonl (ignored by Git). This is local development storage, not a production CRM. New enquiries queue an acknowledgement for Microsoft 365. Sending starts only after its app credentials are configured.

For MySQL, apply database/schema.sql to a fresh database and set DATABASE_URL. Copy server/.env.example to server/.env if desired. The server workspace loads that file when started through npm. Production startup requires DATABASE_URL and will not fall back to local files. A failed write returns an error and the browser retains the form.

Deploy the built client/dist directory with /api and /insights/ routed to Express. Set CLIENT_ORIGIN to the deployed origin. Review the benchmark document's launch dependencies.

## Content and privacy
Industry examples and dashboard values are illustrative. Readiness answers and calculator inputs stay in component memory until a user explicitly shares a report. The reading list uses browser local storage. Insight content is original draft editorial copy.

The admin workspace supports client enquiries, vacancy publishing and candidate applications with private resume downloads. Candidates can search openings and apply with a unique follow-up reference. Microsoft 365 queues candidate acknowledgements and recruitment notifications with resumes. The Insights CMS supports drafts, editing, publishing, deletion and previews for company social accounts. Public user accounts remain future work.

## Profile deck update
See [the slide-to-section mapping](docs/PROFILE_DECK_MAPPING.md) for source coverage and editorial decisions. Added group positioning, credentials, values, differentiators, detailed service offerings, Tvat AI platforms, leadership and five office locations.

## Admin and acknowledgement setup
Open /admin. Run npm run admin:setup and choose the password for admin. Configure Microsoft 365 app credentials in server/.env to send acknowledgements from info@i-genext.com. See [the setup guide and email template](docs/ADMIN_AND_EMAIL.md).

## Careers setup
See [the careers guide](docs/CAREERS.md) for publishing openings, reviewing applications and configuring careers@i-genext.com notifications. Existing MySQL databases need database/migrations/003_careers.sql. Resume uploads accept PDF files up to 2 MB.

## Insights and social publishing
Open /admin, select Insights, then Manage insights or Social accounts. Signed-in admins also see Edit / Configure and Delete insight on website insight cards. See [the setup and publishing guide](docs/INSIGHTS_AND_SOCIAL.md). Existing MySQL databases need database/migrations/004_insights_cms.sql. Social publishing requires company platform apps, authorized tokens and a public HTTPS website; these are not configured yet.

## Platform Solutions
Business Productivity & Efficiency Tools and Enterprise AI-native Platforms are separate groups. Administrators can add, edit, reorder, publish and delete entries in both groups, and manage their photos and videos from **Platform sections**. See [the platform CMS guide](docs/PLATFORM_CMS.md).
