# Careers and recruitment

## Using the workflow

1. Open `/admin` and sign in with the existing admin account.
2. Select **Job openings**. Enter the title, location/work arrangement, department, experience, employment type and full role description.
3. Save as **Draft** to prepare an opening privately, or **Open** to publish it in the website's Careers section.
4. Use **Edit** to update a role, close applications or reopen it. Closing a role preserves submitted applications and their original job title/location.
5. Select **Applications** to search candidates, roles and reference IDs, inspect all candidate details and download private resumes. Lists show 25 applications per page.

Candidates can search roles by title, skills or location and filter by department. Applications collect first/middle/last name, email, mobile, current organization/designation/location/address, current salary and expected salary. Middle name is optional. Salaries are text with annual amount/currency guidance; candidates starting their careers may enter 0 and Not applicable where relevant.

Resume uploads accept **one PDF up to 2 MB**. The API checks the size, extension, content type and PDF signature/end marker; these are format checks, not malware scanning. Resumes are never served publicly. Downloads require an active admin session and use attachment disposition. Candidate details are used with recruitment consent.

A successful submission displays a unique `IG-APP-...` reference after storage completes. Candidates should retain it for follow-up at careers@i-genext.com. This is an email follow-up reference, not a public application-status account.

## Email

The existing Microsoft 365 service sends from **info@i-genext.com**:
- A soft acknowledgement to the candidate containing their role and reference ID, with replies directed to careers@i-genext.com.
- A separate notification to **careers@i-genext.com**, including every candidate field and the PDF resume attachment. Replies go to the candidate.

`CAREERS_EMAIL` can override the recruitment recipient. Microsoft 365 app credentials (`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`) and Graph Mail.Send application permission/admin consent must already be configured, as described in [ADMIN_AND_EMAIL.md](ADMIN_AND_EMAIL.md). Recruitment uses the existing sender; it does not require sending as the careers mailbox.

Both messages are queued durably with the application. With no email credentials they remain queued. The worker attempts each message independently, up to three times, with retry delays and a processing lease for recovery after interruptions. Admin displays Queued, Sending, Accepted by Microsoft 365 or Needs attention. **Retry failed emails** requeues only failed messages. Provider acceptance does not confirm inbox delivery. Delivery is at least once: a crash after provider acceptance but before recording success can cause a duplicate carrying the same application reference.

The candidate acknowledgement thanks them for sharing their experience, confirms receipt, explains that recruitment will review their fit for the role, and supplies the reference and follow-up mailbox. It makes no promise of an interview or hiring decision.

Microsoft reference: [Graph file attachments](https://learn.microsoft.com/en-us/graph/api/resources/fileattachment?view=graph-rest-1.0).

## Storage and deployment

Development without DATABASE_URL stores openings, candidate details and email status in `server/data/careers/records.json` and private PDF files beside it. This directory is ignored by Git and blocked by the Vite file-serving rules. `CAREERS_DATA_DIR` optionally changes the private directory. Run one API process for this development store. Preserve the entire directory when backing it up.

Production requires **MySQL 8+** and DATABASE_URL. For a fresh database apply `database/schema.sql`. For an existing database apply `database/migrations/003_careers.sql` before starting the updated API. It adds career_openings, career_applications and career_notifications; the original placeholder jobs/job_applications tables are left intact and are not used by this workflow. Existing placeholder records are not automatically published.

Production stores the application details, PDF bytes and both notification tasks in one database transaction. The job row is locked while submitting, so a role closed concurrently cannot silently accept a later application. Database credentials need normal SELECT/INSERT/UPDATE access. Configure the database packet limit above the maximum resume upload plus metadata (at least 4 MB). Existing development files are not automatically migrated into MySQL.

Serve the client and API under the same origin, with /api proxied to Express and /admin routed to the SPA. Preserve the external Host header as the Vite configuration does, or set CLIENT_ORIGIN to the exact public origin. Restart the API after environment changes.

## Validation

`npm test` includes careers validation, protected endpoints, publish/close/reopen, upload rejection, persisted applications, queue recovery and mocked Graph attachment checks. `npm run build` validates TypeScript and the production bundle.

`scripts/careers-browser-check.mjs` uses temporary storage and mocked emails for the full admin and candidate journey, PDF download, search, mobile layouts and highlighted footer. Set PLAYWRIGHT_MODULE to an installed Playwright module before running it. Screenshots and email previews are generated under test-results. No sample openings or applications are added to the working site's records.

Live Microsoft 365 delivery and a real MySQL server were not exercised in this environment.
