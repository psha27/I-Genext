import { fileURLToPath } from 'node:url'
import { createHeroStore } from './hero.js'
import { createPlatformCatalog } from './platform-catalog.js'
import { createPlatformMediaStore } from './platform-media.js'
import 'dotenv/config'
import { createInsightStore } from './insights-store.js'
import { createSocialConfiguration } from './social-config.js'
import { createSocialPublisher } from './social-publisher.js'
import { createCareersStore } from './careers-store.js'
import { careerEmail } from './careers-email.js'
import { createApp } from './app.js'
import { createContactStore } from './contact.js'
import { createAdminAuth } from './admin.js'
import { createMailer, startEmailWorker } from './email.js'

const heroStore = createHeroStore()
await heroStore.ready
const platformMediaStore = createPlatformMediaStore()
const platformCatalog = createPlatformCatalog({ legacyStore: platformMediaStore })
await platformCatalog.ready
const store = createContactStore()
const mailer = createMailer()
const emailWorker = startEmailWorker(store, mailer)
const careersStore = createCareersStore()
const recruitmentMailer = createMailer()
const careersWorker = startEmailWorker(careersStore, { configured: recruitmentMailer.configured, send: async task => recruitmentMailer.send(await careerEmail(task, careersStore, process.env.CAREERS_EMAIL || 'careers@i-genext.com')), close: () => recruitmentMailer.close() })
const insightStore = createInsightStore()
await insightStore.ready
const socialConfiguration = createSocialConfiguration(insightStore)
const socialPublisher = createSocialPublisher()
const auth = createAdminAuth({ credentialsFile: process.env.ADMIN_CREDENTIALS_FILE, secure: process.env.NODE_ENV === 'production' })
const app = createApp(store, { frontendDirectory: process.env.NODE_ENV === 'production' ? fileURLToPath(new URL('../../client/dist/', import.meta.url)) : undefined, heroStore, platformCatalog, origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', auth, emailWorker, careersStore, careersWorker, insightStore, socialConfiguration, socialPublisher, emailConfigured: mailer.configured })
const port = Number(process.env.PORT || 4000)
const server = app.listen(port, () => console.log('I-Genext API listening on :' + port + ' (' + store.mode + '). Acknowledgements: ' + (mailer.configured ? 'Microsoft 365 configured' : 'queued until Microsoft 365 is configured')))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await emailWorker.stop(); await careersWorker.stop(); await careersStore.close(); await insightStore.close(); await platformMediaStore.close(); await platformCatalog.close(); await heroStore.close(); await store.close(); process.exit(0) }))
