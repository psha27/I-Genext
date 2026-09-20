# Insights CMS and company social publishing

## Daily use

Open **/admin → Insights** using the existing admin account.

- Create an insight with a title, permanent URL slug, topic, author, summary, optional cover image and article sections.
- Use **Preview article** to review the content before saving. Each section has an optional heading and required plain text; line breaks are preserved. Content is escaped rather than rendered as arbitrary HTML.
- **Save draft** keeps an insight private. **Publish on website** displays it in The next perspective, its topic filters, site search and the public article page.
- Edit an existing insight, or choose **Unpublish and save draft** to unpublish it. Concurrent edits return a conflict rather than overwrite a newer version.
- **Delete** removes it from public pages and the admin list. A deletion marker is retained to preserve social history and prevent deleted sample content being recreated. Deleted slugs cannot be reused.
- All create, edit, configure and delete controls are available only in **/admin > Insights**. The public website has no management controls, including when an administrator is signed in.

The four existing perspectives are seeded once into the new store. They can be edited and deleted like any other insight. The frontend no longer falls back to hard-coded articles if the service is unavailable.

Published articles have shareable **/insights/{slug}** pages with article content, Open Graph metadata and a canonical URL when the public domain is configured. Existing #insight/{slug} links still open the website reader. Saving an article does not post to social media.

## Database and deployment

For production, use **MySQL 8+** with DATABASE_URL:
1. For a new database, apply database/schema.sql.
2. For an existing database, apply database/migrations/004_insights_cms.sql.
3. Route both **/api/** and **/insights/** to Express. Serve the remaining frontend from client/dist, with /admin handled by the SPA.
4. Set CLIENT_ORIGIN to the public website origin and use HTTPS.

The CMS uses cms_documents: one JSON document per insight, social account configuration, publication receipt or initialization record. cms_mutex serializes writes during transactions so publication claims, edits and settings changes are atomic. Credentials inside settings are encrypted. The original placeholder insights/insight_downloads tables are preserved and are not used by this CMS; existing records in those tables are not imported automatically.

Development without DATABASE_URL stores data in **server/data/insights/content.json**. It supports one API process and survives restarts. INSIGHTS_DATA_DIR can override this directory. Production refuses file fallback. Back up the storage and encryption key. Development files are not automatically copied into a production database.

Public insight lists refresh when visitors load the website or return focus to its tab. There is no live push subscription.

## Social account setup

Open **Insights → Social accounts**. Enter the public HTTPS website origin and save it. The initial Graph API version is v25.0; confirm the supported version and permissions in your Meta app before deployment.

Tokens are manually provisioned from the company’s platform apps, then entered into the admin form. This implementation does not include an OAuth sign-in callback or automatic refresh-token rotation. Use tokens authorized for the actual company accounts and replace them here when they expire or are revoked.

### Encryption key

In production set SOCIAL_ENCRYPTION_KEY to a base64-encoded, random 32-byte key before saving access tokens. For example, generate a key locally with:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"

Store the output in the private server environment/secret manager, not source control. Keep the same key across deployments; changing it makes saved tokens unreadable. To rotate it, clear the saved account tokens first, set the new key and enter new tokens.

Development creates server/data/insights/social-key when a token is first saved. The private directory is ignored by Git and blocked from the Vite file server.

Access tokens use AES-256-GCM at rest and are not returned by the settings API. Password inputs are cleared after saving. Blank inputs retain existing tokens; **Disconnect** removes a stored token when settings are saved.

### X (Twitter)

Create an X developer app with API access for posting. Authorize the company user with OAuth 2.0 user context and tweet.read, tweet.write and users.read scopes. Enter that user access token. An app-only bearer token is insufficient. Verify the account; the application retrieves its ID and handle. App access/billing and current platform requirements are managed through X.

The integration publishes text plus the public article URL through POST /2/tweets. The standard 280-character weighted limit uses twitter-text, including URL and emoji handling. It does not upload a separate image to X; the article URL contains metadata for link previews.

Sources: [X posting quickstart](https://docs.x.com/x-api/posts/manage-tweets/quickstart), [create post endpoint](https://docs.x.com/x-api/posts/create-post), [X text parser](https://github.com/twitter/twitter-text).

### Facebook

Create/configure a Meta app for the company Page and obtain a Page access token with publishing access, including pages_manage_posts and pages_read_engagement. Page discovery can require pages_show_list. Enter the numeric Page ID and Page access token, save, then verify. Verification checks the Page identity; permission to publish is enforced by Meta when a post is submitted.

The integration publishes the caption and article link to the Page feed. It does not publish to a personal Facebook profile.

Sources: [Meta Pages posts documentation](https://developers.facebook.com/docs/pages-api/posts/), [Meta’s Facebook API collection](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api).

### Instagram

Use a professional Business or Creator account linked to the company Facebook Page. Configure Instagram API with Facebook Login in the Meta app and obtain the appropriate token with instagram_basic, instagram_content_publish and required Page permissions. Enter the Instagram professional account ID, not its username or the Facebook Page ID. Save and verify it.

For a photo post, the insight needs a **public HTTPS JPEG cover image** that Meta can download without login. A 1080 × 1080 JPEG is a useful starting point; follow Meta’s current size/aspect-ratio requirements. The editor accepts a hosted image URL; it does not provide image uploads or image hosting.

Publishing creates an image container, checks processing status, then calls media_publish. If processing does not finish in the bounded wait, the attempt is marked failed before publication so an admin may try again later. A successfully published post includes the image and caption. Instagram captions do not provide clickable article links; configure the account’s bio link separately if needed. Videos, carousels and Stories are outside this implementation.

Sources: [Meta Instagram publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/), [Meta’s Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api).

Meta app review, business verification, account roles and required access levels depend on the app/account configuration. Follow the platform setup documentation for your company’s case.

## Publishing and delivery records

1. Save and publish the article on the website.
2. Select a platform under **Share to social** and write its caption.
3. Select **Preview social post**. The preview shows the company account, final caption/link, image for Instagram, character count and unmet prerequisites.
4. Confirm that the content and destination have been reviewed, then select **Publish to [platform]**.

There is one delivery record per insight/platform. Published records block duplicate publication, including simultaneous clicks or requests. A changed article, caption or account setting invalidates the preview and requires a fresh one.

- **published:** provider returned a post ID. The record retains the caption, URL, image URL, destination, article version and provider ID/link.
- **failed:** provider explicitly rejected the request, or Instagram failed before the publish step. Correct the issue, preview and retry.
- **publishing:** the request is in progress.
- **unknown:** a response could not be confirmed or processing was interrupted. Check the company account, then record the existing post ID or confirm that no post exists before retrying.

Unknown results are never retried automatically. The app does not schedule posts or automatically edit/delete posts that have already been sent. Website edits, unpublishing and deletion affect only the website. Published social posts must be edited/deleted in their respective accounts. A platform with an existing published record cannot be republished from the same insight.

## Verification

- npm test includes CMS validation, authentication/origin checks, publish/unpublish/delete persistence, stale-write protection, encrypted/masked settings, account identity checks, social previews, duplicate prevention, uncertain-delivery reconciliation and mocked platform requests.
- scripts/insights-browser-check.mjs exercises the editor, public listing and article pages, admin-only edit/delete controls, social configuration, mocked X/Facebook publication and Instagram prerequisites. It uses temporary data and sends no real posts.
- npm run build validates TypeScript and the production bundle.

A live MySQL server and real social accounts were not available for integration testing. Platform credentials/app setup are required before real publishing can be verified.
