import { sameOrigin } from './admin.js'
import { validateInsight,problem,platforms } from './insights-store.js'
import { socialPreview } from './social-publisher.js'
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function insightHtml(article,url) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(article.title)+' | I-Genext</title><meta name="description" content="'+escape(article.summary)+'"><meta property="og:type" content="article"><meta property="og:title" content="'+escape(article.title)+'"><meta property="og:description" content="'+escape(article.summary)+'">'+(url?'<link rel="canonical" href="'+escape(url)+'"><meta property="og:url" content="'+escape(url)+'">':'')+(article.imageUrl?'<meta property="og:image" content="'+escape(article.imageUrl)+'">':'')+'<meta name="twitter:card" content="'+(article.imageUrl?'summary_large_image':'summary')+'"><style>body{margin:0;background:#05080e;color:#eaf1fa;font:17px/1.85 system-ui,sans-serif}main{max-width:820px;margin:auto;padding:50px 24px 90px}a{color:#65d9ed}header{border-bottom:1px solid #334058;padding-bottom:24px;margin-bottom:45px}h1{font-size:clamp(34px,6vw,56px);line-height:1.15;letter-spacing:-.04em}h2{line-height:1.3;margin-top:40px}p{white-space:pre-wrap}.meta{font-size:13px;color:#9eb6d0}img{width:100%;max-height:480px;object-fit:cover;border-radius:12px}.summary{font-size:21px;color:#c4d5e9}footer{margin-top:50px;border-top:1px solid #334058;padding-top:24px}</style></head><body><main><header><a href="/">I-Genext</a></header><article><p class="meta">'+escape(article.topic)+' · '+escape(article.author)+' · '+article.readMinutes+' min read</p><h1>'+escape(article.title)+'</h1><p class="summary">'+escape(article.summary)+'</p>'+(article.imageUrl?'<img src="'+escape(article.imageUrl)+'" alt="" referrerpolicy="no-referrer">':'')+article.body.map(([heading,text])=>'<section>'+(heading?'<h2>'+escape(heading)+'</h2>':'')+'<p>'+escape(text)+'</p></section>').join('')+'</article><footer><a href="/#insights">Explore more perspectives</a></footer></main></body></html>'
}
export function registerInsights(app,{store,auth,origin,configuration,publisher}) {
  const wrap=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(error){if(error.status&&[400,404,409,503].includes(error.status))return res.status(error.status).json({ok:false,message:error.message});next(error)}}
  const protect=[sameOrigin(origin),auth.requireSession]
  app.get('/api/insights',wrap(async(_req,res)=>res.set('Cache-Control','no-store').json({rows:await store.list(true)})))
  app.get('/insights/:slug',wrap(async(req,res)=>{
    res.set('Cache-Control','no-store')
    const article=(await store.list(true)).find(x=>x.slug===req.params.slug)
    if(!article)return res.status(404).type('html').send('<!doctype html><html><body><h1>Perspective not found</h1><a href="/#insights">Explore published insights</a></body></html>')
    const settings=await configuration.read()
    res.set('Cache-Control','no-store').set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; frame-ancestors 'none'").type('html').send(insightHtml(article,settings.siteUrl?settings.siteUrl+'/insights/'+article.slug:''))
  }))
  app.get('/api/admin/insights',auth.requireSession,wrap(async(_req,res)=>res.json({rows:await store.list()})))
  app.get('/api/admin/insights/:id',auth.requireSession,wrap(async(req,res)=>{
    const row=await store.get(req.params.id);if(!row||row.status==='deleted')throw problem('Insight not found.',404)
    res.json({row,posts:await store.history(row.id)})
  }))
  app.post('/api/admin/insights',...protect,wrap(async(req,res)=>res.status(201).json({row:await store.save(validateInsight(req.body))})))
  app.put('/api/admin/insights/:id',...protect,wrap(async(req,res)=>res.json({row:await store.save(validateInsight(req.body),req.params.id,req.body.version)})))
  app.delete('/api/admin/insights/:id',...protect,wrap(async(req,res)=>{await store.remove(req.params.id,req.body?.version);res.json({ok:true})}))
  app.get('/api/admin/social-settings',auth.requireSession,wrap(async(_req,res)=>res.json(await configuration.read())))
  app.put('/api/admin/social-settings',...protect,wrap(async(req,res)=>res.json(await configuration.save(req.body))))
  app.post('/api/admin/social-settings/:platform/verify',...protect,wrap(async(req,res)=>{
    if(!platforms.includes(req.params.platform))throw problem('Unknown social platform.')
    try{const settings=await configuration.internal();const identity=await publisher.verify(req.params.platform,settings);res.json(await configuration.verified(req.params.platform,identity,settings.version))}
    catch(error){throw problem(error.status?error.message:'Account verification failed. Check the token, account ID, permissions and API access.')}
  }))
  app.post('/api/admin/insights/:id/social-preview',...protect,wrap(async(req,res)=>{
    const article=await store.get(req.params.id);if(!article||article.status==='deleted')throw problem('Insight not found.',404)
    res.json(socialPreview(article,req.body.platform,req.body.caption,await configuration.read()))
  }))
  app.post('/api/admin/insights/:id/social-publish',...protect,wrap(async(req,res)=>{
    if(req.body.confirm!==true)throw problem('Review the social preview before publishing.')
    const article=await store.get(req.params.id);if(!article)throw problem('Insight not found.',404)
    const settings=await configuration.internal()
    const publicSettings={...settings,accounts:Object.fromEntries(platforms.map(p=>[p,{...settings.accounts[p],configured:Boolean(settings.accounts[p].token)}]))}
    const preview=socialPreview(article,req.body.platform,req.body.caption,publicSettings)
    if(preview.errors.length)throw problem(preview.errors.join(' '))
    if(req.body.fingerprint!==preview.fingerprint)throw problem('The article, account settings or caption changed. Preview again before publishing.',409)
    if(req.body.accountId!==preview.accountId)throw problem('The destination account changed. Preview again.',409)
    const post=await store.claimPost(article.id,req.body.version,req.body.platform,{text:preview.text,caption:preview.caption,url:preview.url,imageUrl:preview.imageUrl,accountId:preview.accountId,account:preview.account})
    let result
    try{result={status:'published',...await publisher.publish(req.body.platform,preview,settings),error:''}}
    catch(error){result={status:error.uncertain?'unknown':'failed',error:error.message || 'Publishing failed.'}}
    const saved=await store.finishPost(post.id,post.attemptId,result)
    res.json({post:saved})
  }))
  app.post('/api/admin/social-posts/:id/resolve',...protect,wrap(async(req,res)=>{
    if(req.body.confirm!==true||!['published','not-published'].includes(req.body.resolution))throw problem('Confirm the result after checking the company account.')
    if(req.body.resolution==='published'&&(typeof req.body.remoteId!=='string'||!/^[-_a-zA-Z0-9]{1,150}$/.test(req.body.remoteId)))throw problem('Enter the platform post ID.')
    await store.resolvePost(req.params.id,req.body.resolution,req.body.remoteId);res.json({ok:true})
  }))
}
