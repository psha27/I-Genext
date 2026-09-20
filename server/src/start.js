import { access } from 'node:fs/promises'
process.env.NODE_ENV ||= 'production'
await access(new URL('../../client/dist/index.html', import.meta.url)).catch(() => { throw new Error('Website build missing. Run npm run build from the project root before npm start.') })
await import('./index.js')
