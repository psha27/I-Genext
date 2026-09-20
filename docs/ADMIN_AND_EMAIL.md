# Contact requests, admin and acknowledgement email

## Admin access
Open /admin on the website. The login username is admin. From the project root, run:

```sh
npm run admin:setup
```

Press Enter for admin and choose a password of at least 12 characters. Password input is hidden. Only a salted scrypt hash is stored in server/data/admin-credentials.json (ignored by Git). There is no default password or public registration. Running setup again asks before replacing the account and invalidates old sessions.

The admin page supports:
- All current and legacy contact requests.
- Search across names, company, designation, email, mobile, reference, area and message.
- Pagination (25 requests per page) and full message expansion.
- Download all requests as a UTF-8 CSV, regardless of search/page.
- Acknowledgement status and sign-out.

Sessions use HttpOnly, SameSite=Strict cookies, expire after eight hours and end on server restart. Production cookies require HTTPS. The API protects both listings and CSV export; CSV cells are quoted and neutralise spreadsheet formulas. Admin login is limited to five attempts per IP per 15 minutes.

## Microsoft 365 activation
The sender and reply-to are info@i-genext.com, as requested. Copy server/.env.example to server/.env and supply M365_TENANT_ID, M365_CLIENT_ID and M365_CLIENT_SECRET locally. Never use VITE_ prefixes for these secrets.

In your Microsoft Entra tenant:
1. Register a server application.
2. Add the Microsoft Graph application permission Mail.Send and grant administrator consent.
3. Create a client secret and copy its value into M365_CLIENT_SECRET.
4. Fill in the tenant and application (client) IDs.
5. Ensure the app is authorised to send as info@i-genext.com. Your Microsoft 365 administrator can restrict its mailbox access using Exchange application access controls.
6. Restart the API after saving the environment configuration.

This uses the [Microsoft identity client-credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow) and [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0). No mailbox password is required. Messages are saved to Sent Items. Graph's 202 response means accepted for processing, not confirmed inbox delivery.

EMAIL_RESPONSE_TIME defaults to "two business days" and can be changed without editing the template. The acknowledgement uses only the client's name and reference, not the contents of their enquiry.

## Queue and storage
A contact request and its pending acknowledgement are persisted together. The worker processes new requests in the background and retries failures up to three attempts. Unconfigured Microsoft 365 leaves new messages queued. Legacy requests are displayed as legacy and are not emailed retroactively.

Development uses server/data/contact-leads.jsonl and an append-only server/data/acknowledgements.jsonl status log. These are local development files, not a multi-instance datastore. Existing contact rows are preserved; missing designation/mobile fields display as not provided.

MySQL uses the existing phone and designation fields in contact_leads and the new contact_acknowledgements table. For a new database, apply database/schema.sql. For an existing database, apply database/migrations/002_contact_acknowledgements.sql before starting the updated API.

The worker uses a five-minute processing lease to recover from interruption. As with many mail queues, provider acceptance followed by an interrupted status write can cause a retry; the enquiry reference is included in an email header for tracing. Failed items remain visible in admin for follow-up.

For production serve client/dist with a fallback to index.html for /admin and proxy /api to Express. Keep server/data and server/.env outside the web root. The Vite development server also denies access to server and database files. Use a shared session/rate-limit store if deploying multiple API instances.

## Template
Subject: Thank you for reaching out to I-Genext

Dear [Name],

Thank you so much for your interest in I-Genext and for taking the time to connect with us. We appreciate the opportunity to learn more about your business and explore how we can support you.

We have received your enquiry. Our team will review the details you have shared and aims to get back to you within two business days. We look forward to understanding your priorities and discussing the right way forward together.

Your enquiry reference is [Reference].

Thank you once again for considering us.

Warm regards,
The I-Genext Team
Consulting. Technology. Outcomes.
