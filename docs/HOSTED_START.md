# Managed Node hosting

Use the project root as the application root.

Build command: `npm ci && npm run build`
Start command: `npm start`
Runtime: Node.js 24 LTS
Health check: `/api/health`

Set NODE_ENV=production, DATABASE_URL, CLIENT_ORIGIN and PUBLIC_SITE_URL in the host environment. Use your real HTTPS domain and production MySQL credentials. Use the PORT assigned by the hosting service; do not override it with 4000 unless the host requires that value. The app defaults to 4000 only when PORT is absent. It serves the built frontend, /admin, API and insight articles on that one port. No Vite process or port 5173 is needed.

The backend must have persistent writable storage for uploads and the admin credential file. Configure those paths for your host. Initialize MySQL and create the admin account as documented in PRODUCTION_ENV.md. server/.env.production is a template and is not loaded automatically: use hosting environment settings or copy a completed file privately to server/.env.

The previous EACCES on 0.0.0.0:5173 was raised by the Vite development server. Change the hosting start command from npm run dev to npm start and redeploy the updated source/package. Do not solve this by enabling privileged access or exposing the development server.
