import { fileURLToPath } from 'node:url'
import { createPlatformCatalog } from './platform-catalog.js'
export const heroSeed = {
  id:'hero', anchor:'top', group:'productivity', name:'Consulting. Technology. Impact.',
  headline:'Expertise that moves you forward.', category:'Intelligence that takes you further.',
  description:'Connect deep business expertise with practical technology to strengthen governance, transform finance and unlock your next chapter of growth.',
  outcome:'Explore our expertise', features:[], flow:[], color:'royal', order:0,
  status:'published', mediaMode:'illustration', image:'consulting-hero-poster-v2.png',
  imageAlt:'Business consultants collaborating in a contemporary boardroom', transcript:'',
  version:1, photo:null, video:null
}
export function createHeroStore(options={}) {
  return createPlatformCatalog({directory:process.env.HERO_DATA_DIR || fileURLToPath(new URL('../data/hero/',import.meta.url)),...options,resource:'hero-content',seed:[heroSeed]})
}
