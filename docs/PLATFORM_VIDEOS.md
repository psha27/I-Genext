# Platform solutions and product videos

The website groups its offerings under `#platforms`:
- `#productivity-tools`: Envision, Approve-X, Capex IQ, AuditIQ, ControlIQ, Workflow Automation Solution.
- `#enterprise-platforms`: the existing Tvat AI portfolio, retaining `#platform-0` through `#platform-5` links.

Productivity copy, feature lists, artwork paths and workflow illustrations are defined in `client/src/lib/productivity.ts` and `client/src/sections/ProductivitySolutions.tsx`. Product descriptions explain the proposed solution scope; the marketing site does not implement those six business applications.

## Uploading videos
1. Sign in at `/admin` with the existing administrator account.
2. Open **Platform videos** and choose a tool.
3. Select an MP4 or WebM file up to 100 MB and preview it. Use H.264/AAC for broad MP4 compatibility or VP8/VP9 with Opus for WebM. Uploads are not transcoded.
4. Optionally supply a transcript (up to 6,000 characters).
5. Choose **Upload & publish video**. The website displays a **Watch video** choice on that tool after refresh; the original illustration remains available.

Replacement uploads keep the current video until validation and metadata persistence succeed. Removing a video leaves the illustration intact. Native video controls provide seeking, fullscreen and user-initiated playback. Transcripts appear below the player when provided.

## Persistence and deployment
- Video files are stored on disk in `server/data/platform-media/` by default. Set `PLATFORM_MEDIA_DIR` to a persistent absolute directory in production.
- With `DATABASE_URL`, metadata uses the existing `cms_documents` / `cms_mutex` repository. Apply existing migration `004_insights_cms.sql` if these tables are absent; no new SQL tables are needed.
- In development without MySQL, metadata lives in `platform-media/metadata/content.json`.
- Back up the media directory together with metadata. Multiple API instances must share the same writable media volume. For now, route media writes to one instance because update locks are process-local.
- Configure the reverse proxy for a body limit slightly above 100 MB (e.g. 110 MB) and an upload timeout suitable for the connection. Continue forwarding `/api` to Express.
- Admin writes require the existing session and same-origin checks. IDs are allowlisted; filenames are generated server-side. Upload limits, MIME checks and file-container signatures are validated. This is format validation, not video transcoding or malware scanning.

## API
- `GET /api/platform-videos`: published public metadata.
- `GET /api/platform-videos/:id/:filename`: public video with HTTP range support.
- `GET /api/admin/platform-videos`: protected management list.
- `POST /api/admin/platform-videos/:id`: multipart `video` plus optional `transcript`.
- `DELETE /api/admin/platform-videos/:id`: remove the published video.

Run `npm test` for upload authentication, validation, persistence, replacement, deletion and range-serving coverage. Tests use isolated temporary storage and do not upload to the real site.