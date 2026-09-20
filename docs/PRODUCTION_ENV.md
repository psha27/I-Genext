# Production environment setup

`server/.env.production` is a private prepared configuration. It contains a newly generated social-token encryption key. Do not commit it, put it in client/dist, or bundle it in a publicly shared ZIP. A secret-free template is available at `server/.env.production.example`.

Before launch, replace example.com in CLIENT_ORIGIN and PUBLIC_SITE_URL with the same exact HTTPS origin (no trailing slash), and replace the database username, password and host in DATABASE_URL. Credentials containing URL punctuation must be percent-encoded. Set the persistent storage paths for the hosting environment. If email is required, provide the Entra tenant ID, application client ID and client secret, and verify sender mailbox permissions. Empty email credentials leave delivery queued.

On the production server only, copy the completed file to `server/.env`. Keep any previous production configuration backed up securely before replacing it. From the project root, run `npm run admin:setup` to create the admin account at ADMIN_CREDENTIALS_FILE, then `npm run start --workspace server`. The workspace start command loads server/.env; .env.production is not selected automatically. Hosting-provided environment variables take precedence over dotenv values.

The /var/lib/igenext paths are examples for Linux. Create the directories and allow the backend service account access; keep them outside the public web root. Protect server/.env and the admin credential file so only the application account and server administrator can read them. Configure MySQL, HTTPS and the web proxy separately as described in the deployment guide.

Keep SOCIAL_ENCRYPTION_KEY stable and backed up. For an existing deployment with encrypted social tokens, reuse its existing key instead of the newly generated key. Social platform access tokens are entered through the admin panel and encrypted using this key. Admin passwords are stored as salted hashes in the credentials file, not in .env. The Google Analytics identifier remains public in client/index.html.

The existing local server/.env has not been modified. Local CMS edits and media need a separate migration to production. Creating this configuration does not provision hosting, a database, domains or Microsoft credentials. The previously generated deployment ZIP does not include this private file.
