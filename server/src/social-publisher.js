import { createHash } from 'node:crypto'
import twitterText from 'twitter-text'
import { problem,publicHttps,platforms } from './insights-store.js'
const graphRoot=settings=>'https://graph.facebook.com/'+settings.graphVersion
export function socialPreview(article,platform,caption,settings) {
  if(!platforms.includes(platform))throw problem('Choose X, Facebook or Instagram.')
  if(typeof caption!=='string'||!caption.trim()||caption.length>10000)throw problem('Enter a caption within 10,000 characters.')
  const account=settings.accounts[platform],url=settings.siteUrl?settings.siteUrl+'/insights/'+article.slug:''
  const text=caption.trim()+(url?'\n\n'+url:'')
  const count=platform==='x'?twitterText.parseTweet(text).weightedLength:Array.from(text).length
  const limit=platform==='x'?280:platform==='instagram'?2200:10000
  const errors=[]
  if(article.status!=='published')errors.push('Publish this insight on the website first.')
  if(!url)errors.push('Set the public website URL in Social accounts.')
  if(!account?.configured)errors.push('Configure this social account first.')
  if(!account?.verifiedAt)errors.push('Verify this account in Social accounts before publishing.')
  if(count>limit||(platform==='x'&&!twitterText.parseTweet(text).valid))errors.push('Shorten the caption to fit the platform limit.')
  if(platform==='instagram'&&!article.imageUrl)errors.push('Instagram requires a public JPEG cover image URL.')
  const fingerprint=createHash('sha256').update(JSON.stringify([article.id,article.version,platform,text,article.imageUrl,account?.accountId,settings.version])).digest('hex')
  return {fingerprint,platform,text,caption:caption.trim(),url,imageUrl:article.imageUrl,count,limit,errors,account:account?.label||platform,accountId:account?.accountId||'',version:article.version}
}
export function createSocialPublisher({ request=fetch, pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)) }={}) {
  async function api(url,token,body) {
    let response
    try{response=await request(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)})}
    catch {throw Object.assign(new Error('The platform response could not be confirmed. Check the account before retrying.'),{uncertain:true})}
    let data;try{data=await response.json()}catch{throw Object.assign(new Error('The platform returned an unreadable response. Check the account before retrying.'),{uncertain:true})}
    if(!response.ok||data.error){
      const code=data.error?.code || response.status
      throw Object.assign(new Error('Platform request rejected (code '+String(code).replace(/[^\w-]/g,'').slice(0,20)+'). Check account permissions, token validity, media requirements and API access.'),{uncertain:response.status>=500||response.status===408})
    }
    return data
  }
  return {
    async verify(platform,settings) {
      const account=settings.accounts[platform]
      if(!account?.token)throw problem('Save an access token for this account first.')
      if(platform==='x'){
        const data=await api('https://api.x.com/2/users/me',account.token)
        if(!data.data?.id)throw problem('The X user account could not be verified.')
        return {id:String(data.data.id),label:'@'+data.data.username}
      }
      if(!/^\d+$/.test(account.accountId))throw problem('Enter the numeric Page or Instagram account ID.')
      const data=await api(graphRoot(settings)+'/'+account.accountId+'?fields=id,'+(platform==='instagram'?'username':'name'),account.token)
      if(!data.id)throw problem('The social account could not be verified.')
      return {id:String(data.id),label:platform==='instagram'?'@'+data.username:data.name}
    },
    async publish(platform,preview,settings) {
      const account=settings.accounts[platform],root=graphRoot(settings)
      if(!account?.token||!account.verifiedAt)throw problem('Configure and verify this account before publishing.')
      if(platform==='x'){
        const data=await api('https://api.x.com/2/tweets',account.token,{text:preview.text})
        if(!data.data?.id)throw Object.assign(new Error('Post result missing. Check X before retrying.'),{uncertain:true})
        return {remoteId:String(data.data.id),remoteUrl:'https://x.com/i/web/status/'+encodeURIComponent(data.data.id)}
      }
      if(platform==='facebook'){
        const data=await api(root+'/'+account.accountId+'/feed',account.token,{message:preview.caption,link:preview.url})
        if(!data.id)throw Object.assign(new Error('Post result missing. Check Facebook before retrying.'),{uncertain:true})
        return {remoteId:String(data.id),remoteUrl:'https://www.facebook.com/'+encodeURIComponent(data.id)}
      }
      publicHttps(preview.imageUrl)
      let container
      try {
        container=await api(root+'/'+account.accountId+'/media',account.token,{image_url:preview.imageUrl,caption:preview.text})
        if(!container.id)throw new Error('Instagram could not create the image container.')
        let ready=false
        for(let i=0;i<6;i++){
          const status=await api(root+'/'+container.id+'?fields=status_code',account.token)
          if(status.status_code==='FINISHED'){ready=true;break}
          if(['ERROR','EXPIRED'].includes(status.status_code))throw new Error('Instagram rejected the image. Use a public JPEG within its image specifications.')
          await pause(1500)
        }
        if(!ready)throw new Error('Instagram is still processing the image. No post was published; try again later.')
      } catch(error) {error.uncertain=false;throw error}
      const published=await api(root+'/'+account.accountId+'/media_publish',account.token,{creation_id:container.id})
      if(!published.id)throw Object.assign(new Error('Publish result missing. Check Instagram before retrying.'),{uncertain:true})
      let remoteUrl=''
      try{const info=await api(root+'/'+published.id+'?fields=permalink',account.token);if(/^https:\/\/(www\.)?instagram\.com\//.test(info.permalink||''))remoteUrl=info.permalink}catch{}
      return {remoteId:String(published.id),remoteUrl}
    }
  }
}
