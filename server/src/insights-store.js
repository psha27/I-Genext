import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createContentRepository } from './content-repository.js'
export const problem=(message,status=400)=>Object.assign(new Error(message),{status})
export const platforms=['x','facebook','instagram']
export function publicHttps(value,allowEmpty=false) {
  if(allowEmpty && !value)return ''
  try {
    if(typeof value!=='string'||value.length>2000)throw Error()
    const url=new URL(value)
    if(url.protocol!=='https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|test|example|invalid)$/.test(url.hostname) || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':'))throw Error()
    return url.href
  }catch{throw problem('Use a public HTTPS URL without credentials or a custom port.')}
}
export function validateInsight(body) {
  const data={}
  for(const [key,max] of Object.entries({title:180,slug:160,topic:80,summary:600,author:120})){
    if(typeof body?.[key]!=='string'||!body[key].trim()||body[key].length>max)throw problem('Please complete '+key+' within '+max+' characters.')
    data[key]=body[key].trim()
  }
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw problem('Use lowercase letters, numbers and hyphens for the URL slug.')
  if(!['draft','published'].includes(body.status))throw problem('Choose Draft or Published.')
  data.status=body.status
  if(!Array.isArray(body.body)||body.body.length<1||body.body.length>30)throw problem('Add between 1 and 30 article sections.')
  data.body=body.body.map(section=>{
    if(!Array.isArray(section)||section.length!==2||typeof section[0]!=='string'||section[0].length>180||typeof section[1]!=='string'||!section[1].trim()||section[1].length>12000)throw problem('Each section needs text (up to 12,000 characters) and an optional heading (up to 180).')
    return section.map(s=>s.trim())
  })
  if(JSON.stringify(data.body).length>90000)throw problem('The article is too long. Keep it below 90,000 characters.')
  if(typeof body.imageUrl!=='string')throw problem('Provide a valid cover image URL or leave it empty.')
  data.imageUrl=publicHttps(body.imageUrl,true)
  data.readMinutes=Math.max(1,Math.ceil(data.body.map(x=>x.join(' ')).join(' ').split(/\s+/).length/200))
  return data
}
const effective=post=>post?.status==='publishing' && Date.parse(post.updatedAt)<Date.now()-180000?{...post,status:'unknown',error:'The publishing request was interrupted. Check the social account before retrying.'}:post

export function createInsightStore(options={}) {
  const repo=createContentRepository(options)
  const ready=(async()=>{
    const seeds=options.seeds ?? JSON.parse(await readFile(new URL('./insights-seed.json',import.meta.url),'utf8'))
    await repo.write(async db=>{
      if(await db.get('system','seeded'))return
      for(const article of seeds){
        const id=randomUUID(),now=new Date().toISOString()
        await db.put('insights',id,{...article,id,author:'I-Genext',imageUrl:'',status:'published',version:1,createdAt:now,updatedAt:now,publishedAt:now,readMinutes:3})
      }
      await db.put('system','seeded',{complete:true})
    })
  })()
  const read=async fn=>{await ready;return repo.read(fn)}, write=async fn=>{await ready;return repo.write(fn)}
  return {
    mode:repo.mode, ready,
    async list(publicOnly=false){return read(async db=>(await db.all('insights')).filter(x=>publicOnly?x.status==='published':x.status!=='deleted').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))},
    get:id=>read(db=>db.get('insights',id)),
    async save(data,id,version){
      return write(async db=>{
        const old=id?await db.get('insights',id):null
        if(id&&(!old||old.status==='deleted'))throw problem('Insight not found.',404)
        if(old&&old.version!==version)throw problem('This insight changed in another session. Reload it before saving.',409)
        if(old&&old.slug!==data.slug)throw problem('The URL slug cannot change after creation.')
        if((await db.all('insights')).some(x=>x.id!==id&&x.slug===data.slug))throw problem('That URL slug is already in use.',409)
        const now=new Date().toISOString(), row={...data,id:id||randomUUID(),version:(old?.version||0)+1,createdAt:old?.createdAt||now,updatedAt:now,publishedAt:old?.publishedAt||(data.status==='published'?now:null)}
        await db.put('insights',row.id,row);return row
      })
    },
    remove:(id,version)=>write(async db=>{
      const row=await db.get('insights',id)
      if(!row||row.status==='deleted')throw problem('Insight not found.',404)
      if(row.version!==version)throw problem('This insight changed. Reload it before deleting.',409)
      await db.put('insights',id,{...row,status:'deleted',version:row.version+1,updatedAt:new Date().toISOString()})
    }),
    settings:()=>read(db=>db.get('settings','social')),
    saveSettings:(settings,expectedVersion)=>write(async db=>{
      const previous=await db.get('settings','social')
      if((previous?.version||0)!==expectedVersion)throw problem('Social settings changed in another session. Reload before continuing.',409)
      await db.put('settings','social',{...settings,version:expectedVersion+1})
    }),
    history:id=>read(async db=>(await db.all('social-posts')).filter(x=>x.insightId===id).map(effective)),
    claimPost:(id,version,platform,snapshot)=>write(async db=>{
      const article=await db.get('insights',id)
      if(!article||article.status!=='published')throw problem('Publish the insight on the website before sharing it.',409)
      if(article.version!==version)throw problem('The insight changed after preview. Reload and preview again.',409)
      const key=id+'_'+platform, previous=effective(await db.get('social-posts',key))
      if(previous&&previous.status!=='failed')throw problem('This platform has a published, ongoing or uncertain post. Review its history before continuing.',409)
      const now=new Date().toISOString(),post={...snapshot,id:key,attemptId:randomUUID(),insightId:id,version,platform,status:'publishing',createdAt:previous?.createdAt||now,updatedAt:now}
      await db.put('social-posts',key,post);return post
    }),
    finishPost:(id,attemptId,result)=>write(async db=>{
      const previous=await db.get('social-posts',id)
      if(previous?.attemptId!==attemptId)return
      const post={...previous,...result,updatedAt:new Date().toISOString()}
      await db.put('social-posts',id,post);return post
    }),
    resolvePost:(id,resolution,remoteId)=>write(async db=>{
      const row=effective(await db.get('social-posts',id))
      if(!row||row.status!=='unknown')throw problem('Only an uncertain delivery can be reconciled.',409)
      const status=resolution==='published'?'published':'failed'
      await db.put('social-posts',id,{...row,status,remoteId:remoteId||'',error:status==='failed'?'Administrator confirmed no post exists. Safe to retry.':'',updatedAt:new Date().toISOString(),reconciled:true})
    }),
    async close(){await ready.catch(()=>{});await repo.close()}
  }
}
