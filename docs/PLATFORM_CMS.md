# Platform section CMS

Go to `/admin#platforms` and sign in. **Platform sections** manages both Business Productivity & Efficiency Tools and Enterprise AI-native Platforms [Tvat AI].

## Content
- Select an entry to edit its name, category, headline, description, features, outcome and workflow labels.
- Use **Add section** to create an entry in either group. New entries start as drafts with a media placeholder.
- Set **Display order** to control position within the selected group (lower first).
- Select **Published** and save to show an entry publicly; **Draft** hides it, including its uploaded media.
- **Delete section** removes it and its uploaded photo/video. Existing entries retain their original anchor links when renamed or reordered.
- Version checks reject stale edits; use Reload after resolving changes from another admin session.

## Media
Save text changes before uploading. Each saved entry can have both one photo and one video:
- Photos: PNG, JPG or WebP, maximum 10 MB. SVG uploads are not accepted.
- Videos: MP4 or WebM, maximum 100 MB; use browser-compatible codecs. No transcoding is performed.
- Uploads can be previewed, replaced or removed independently.
- A successful upload becomes the default visual. Change **Default visual** to choose the original illustration/placeholder, photo or video.
- Add photo alt text and a video transcript in the content form.
- Draft previews use protected admin media routes. Public visitors only receive published sections and media.

## Storage and migration
At first startup, `server/src/platform-seed.json` seeds the twelve existing entries. Existing videos from the former fixed productivity-video store are copied into the catalog. A durable initialization marker prevents edited or deleted items from being restored on restart.

`PLATFORM_CATALOG_DIR` configures the persistent media directory (default `server/data/platform-catalog`). Local development metadata uses its `metadata/content.json`; with `DATABASE_URL`, the existing `cms_documents` and `cms_mutex` tables are used. Apply existing migration `004_insights_cms.sql` if necessary. Back up both metadata and files; multiple API instances require a shared media volume. Configure the reverse proxy to accept uploads above 100 MB including multipart overhead.

The former `PLATFORM_MEDIA_DIR` remains the one-time legacy migration source. The active UI and server now use `/api/platform-catalog` and `/api/admin/platform-catalog`; the old fixed video endpoints are no longer registered by the production entry point.

Tests cover authorization, draft privacy, persistence, stale edits/uploads, seeding/migration, media validation, range serving and file cleanup. Browser tests use isolated temporary data and never edit the real catalog.