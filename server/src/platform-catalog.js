import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { createContentRepository } from './content-repository.js'
import { sameOrigin } from './admin.js'

const problem = (message, status = 400) => Object.assign(new Error(message), { status })
const filePattern = /^[a-f0-9-]{36}\.(png|jpg|webp|mp4|webm)$/
const formats = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }
const groups = ['productivity', 'enterprise']
function validate(body) {
  const result = {}
  for (const [key, max, required] of [['name',120,true],['category',180,true],['headline',260,false],['description',4000,true],['outcome',600,false],['imageAlt',250,false],['transcript',6000,false]]) {
    if (typeof body?.[key] !== 'string' || body[key].length > max || (required && !body[key].trim())) throw problem('Please complete ' + key + ' within ' + max + ' characters.')
    result[key] = body[key].trim()
  }
  for (const [key,max,count] of [['features',350,16],['flow',70,6]]) {
    if (!Array.isArray(body[key]) || body[key].length > count || body[key].some(value => typeof value !== 'string' || !value.trim() || value.length > max)) throw problem('Check ' + key + ': up to ' + count + ' non-empty items are allowed.')
    result[key] = body[key].map(value => value.trim())
  }
  if (!groups.includes(body.group) || !['draft','published'].includes(body.status) || !['illustration','photo','video'].includes(body.mediaMode) || !['royal','turquoise','sky','violet'].includes(body.color)) throw problem('Choose a valid group, status, visual and accent color.')
  if (!Number.isInteger(body.order) || body.order < 0 || body.order > 10000) throw problem('Display order must be a whole number between 0 and 10,000.')
  return { ...result, group: body.group, status: body.status, mediaMode: body.mediaMode, color: body.color, order: body.order }
}
function current(row, version) {
  if (!row || row.deleted) throw problem('Platform section not found.', 404)
  if (!Number.isInteger(version) || version !== row.version) throw problem('This section changed in another session. Reload it before saving.', 409)
}

export function createPlatformCatalog({ directory = process.env.PLATFORM_CATALOG_DIR || fileURLToPath(new URL('../data/platform-catalog/', import.meta.url)), databaseUrl = process.env.DATABASE_URL, nodeEnv = process.env.NODE_ENV, legacyStore, seed, resource = 'platform-catalog' } = {}) {
  const root = path.resolve(directory)
  const repository = createContentRepository({ directory: path.join(root, 'metadata'), databaseUrl, nodeEnv })
  const serialize = (row, admin = false) => {
    const media = kind => row[kind] ? { url: '/api/' + resource + '/' + row.id + '/media/' + kind + '/' + row[kind].filename, ...(admin ? { previewUrl: '/api/admin/' + resource + '/' + row.id + '/media/' + kind + '/' + row[kind].filename } : {}), mime: row[kind].mime, size: row[kind].size } : null
    return { ...row, photo: media('photo'), video: media('video') }
  }
  const ready = (async () => {
    const seeds = seed || JSON.parse(await fs.readFile(new URL('./platform-seed.json', import.meta.url), 'utf8'))
    await repository.write(async api => {
      if (await api.get(resource + '-state','initialized')) return
      for (const item of seeds) {
        let video = null, transcript = item.transcript || ''
        if (legacyStore && item.group === 'productivity') {
          const old = await legacyStore.get(item.id)
          if (old?.filename && filePattern.test(old.filename)) {
            await fs.mkdir(root, { recursive: true })
            await fs.copyFile(path.join(legacyStore.root, old.filename), path.join(root, old.filename))
            video = { filename: old.filename, mime: old.mime, size: old.size }; transcript = old.transcript || ''
          }
        }
        await api.put(resource, item.id, { ...item, video, transcript, updatedAt: new Date().toISOString() })
      }
      await api.put(resource + '-state','initialized',{ initialized: true })
    })
  })()
  async function raw(id) { await ready; return repository.read(api => api.get(resource,id)) }
  return {
    root, ready, serialize, resource,
    async list(admin = false) { await ready; return (await repository.read(api => api.all(resource))).filter(row => !row.deleted && (admin || row.status === 'published')).sort((a,b) => a.order-b.order || a.name.localeCompare(b.name)).map(row => serialize(row,admin)) },
    raw,
    async create(body) {
      const input = validate(body); await ready
      const id = randomUUID(); const row = { ...input, id, anchor:'solution-'+id, image:'', illustration:'generic', icon:'', photo:null, video:null, version:1, updatedAt:new Date().toISOString() }
      if (row.mediaMode !== 'illustration') throw problem('Create the section first, then upload its photo or video.')
      await repository.write(api => api.put(resource,id,row)); return serialize(row,true)
    },
    async update(id, body) {
      const input = validate(body); await ready
      return repository.write(async api => { const row = await api.get(resource,id); current(row,body.version); if (input.mediaMode === 'photo' && !row.photo && !row.image) throw problem('Upload a photo before selecting Photo.'); if (input.mediaMode === 'video' && !row.video) throw problem('Upload a video before selecting Video.'); const saved = { ...row,...input,version:row.version+1,updatedAt:new Date().toISOString() }; await api.put(resource,id,saved); return serialize(saved,true) })
    },
    async remove(id, version) { await ready; return repository.write(async api => { const row=await api.get(resource,id);current(row,version);await api.put(resource,id,{...row,deleted:true,version:row.version+1});return row }) },
    async setMedia(id, kind, value, version) { await ready; return repository.write(async api => { const row=await api.get(resource,id);current(row,version);const saved={...row,[kind]:value,mediaMode:value?kind:row.mediaMode===kind?'illustration':row.mediaMode,version:row.version+1,updatedAt:new Date().toISOString()};await api.put(resource,id,saved);return { item:serialize(saved,true),previous:row[kind] } }) },
    async removeFile(filename) { if(filePattern.test(filename || '')) await fs.unlink(path.join(root,filename)).catch(error=>{if(error.code!=='ENOENT')console.error('Platform media cleanup failed.')}) },
    close:()=>repository.close()
  }
}
async function validContainer(file) {
  const handle=await fs.open(file.path,'r')
  try { const data=Buffer.alloc(4096);const {bytesRead}=await handle.read(data,0,data.length,0);const b=data.subarray(0,bytesRead)
    if(file.mimetype==='image/png')return b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.toString('ascii',12,16)==='IHDR'
    if(file.mimetype==='image/jpeg')return b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255
    if(file.mimetype==='image/webp')return b.length>=16&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'
    if(file.mimetype==='video/mp4')return b.length>=24&&b.toString('ascii',4,8)==='ftyp'&&b.readUInt32BE(0)>=16&&b.readUInt32BE(0)<=file.size&&['isom','iso2','mp41','mp42','avc1','M4V ','dash','MSNV'].includes(b.toString('ascii',8,12))
    return b.length>=16&&b.subarray(0,4).equals(Buffer.from([26,69,223,163]))&&b.includes(Buffer.from('webm'))
  }finally{await handle.close()}
}
export function registerPlatformCatalog(app,{store,auth,origin,photoLimit=10*1024*1024,videoLimit=100*1024*1024}) {
  const publicPath='/api/'+store.resource, adminPath='/api/admin/'+store.resource
  const route=fn=>async(req,res,next)=>{try{await fn(req,res,next)}catch(error){next(error)}}
  const protect=[sameOrigin(origin),auth.requireSession]
  const upload=kind=>multer({storage:multer.diskStorage({destination:(_req,_file,cb)=>fs.mkdir(store.root,{recursive:true}).then(()=>cb(null,store.root),cb),filename:(_req,file,cb)=>cb(null,randomUUID()+'.'+formats[file.mimetype])}),limits:{fileSize:kind==='photo'?photoLimit:videoLimit,files:1,fields:1,fieldSize:100,parts:3},fileFilter:(_req,file,cb)=>Object.hasOwn(formats,file.mimetype)&&file.mimetype.startsWith(kind==='photo'?'image/':'video/')?cb(null,true):cb(problem('Choose a supported '+kind+' file.'))}).single('file')
  const kindCheck=(req,_res,next)=>['photo','video'].includes(req.params.kind)?next():next(problem('Unknown media type.',404))
  app.get(publicPath,route(async(_req,res)=>{res.set('Cache-Control','no-store');res.json({items:await store.list()})}))
  app.get(adminPath,auth.requireSession,route(async(_req,res)=>res.json({items:await store.list(true)})))
  app.post(adminPath,...protect,route(async(req,res)=>res.status(201).json({item:await store.create(req.body)})))
  app.put(adminPath+'/:id',...protect,route(async(req,res)=>res.json({item:await store.update(req.params.id,req.body)})))
  app.delete(adminPath+'/:id',...protect,route(async(req,res)=>{const row=await store.remove(req.params.id,req.body?.version);await Promise.all([store.removeFile(row.photo?.filename),store.removeFile(row.video?.filename)]);res.json({ok:true})}))
  for(const kind of ['photo','video']) app.post(adminPath+'/:id/'+kind,...protect,route(async(req,res,next)=>{
    const row=await store.raw(req.params.id);if(!row||row.deleted)throw problem('Platform section not found.',404)
    upload(kind)(req,res,async error=>{
      if(error)return next(error instanceof multer.MulterError?problem(error.code==='LIMIT_FILE_SIZE'?'File is too large. Photos: 10 MB; videos: 100 MB.':'Upload one file and its version.',error.code==='LIMIT_FILE_SIZE'?413:400):error)
      let saved=false
      try{if(!req.file)throw problem('Choose a file.');if(!await validContainer(req.file))throw problem('The file content does not match a supported '+kind+' format.');const result=await store.setMedia(req.params.id,kind,{filename:req.file.filename,mime:req.file.mimetype,size:req.file.size},Number(req.body.version));saved=true;await store.removeFile(result.previous?.filename);res.status(201).json({item:result.item})}catch(failure){if(!saved&&req.file)await store.removeFile(req.file.filename);next(failure)}
    })
  }))
  app.delete(adminPath+'/:id/media/:kind',...protect,kindCheck,route(async(req,res)=>{const result=await store.setMedia(req.params.id,req.params.kind,null,req.body?.version);await store.removeFile(result.previous?.filename);res.json({item:result.item})}))
  const serve=admin=>route(async(req,res,next)=>{const row=await store.raw(req.params.id);const file=row?.[req.params.kind];if(!row||row.deleted||(!admin&&row.status!=='published')||!file||!filePattern.test(req.params.filename)||file.filename!==req.params.filename)throw problem('Media not found.',404);res.set({'Content-Type':file.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.sendFile(file.filename,{root:store.root,dotfiles:'deny'},error=>{if(error&&(req.aborted||res.destroyed||error.code==='ECONNABORTED'||error.code==='ECONNRESET'))return;if(error)next(error.status===404?problem('Media not found.',404):error)})})
  app.get(publicPath+'/:id/media/:kind/:filename',kindCheck,serve(false))
  app.get(adminPath+'/:id/media/:kind/:filename',auth.requireSession,kindCheck,serve(true))
  app.use([publicPath,adminPath],(error,_req,res,next)=>{if(res.headersSent)return next(error);res.status(error.status||500).json({message:error.status?error.message:'Platform sections are temporarily unavailable. Please try again.'})})
}