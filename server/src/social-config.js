import { randomBytes,createCipheriv,createDecipheriv } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { platforms,problem,publicHttps } from './insights-store.js'
export function createSocialConfiguration(store,env=process.env) {
  let keyPromise
  async function key(){
    if(env.SOCIAL_ENCRYPTION_KEY){
      const value=Buffer.from(env.SOCIAL_ENCRYPTION_KEY,'base64')
      if(value.length!==32)throw problem('SOCIAL_ENCRYPTION_KEY must contain 32 bytes encoded as base64.',503)
      return value
    }
    if(env.NODE_ENV==='production')throw problem('Configure SOCIAL_ENCRYPTION_KEY on the server before storing social credentials.',503)
    const root=path.resolve(env.INSIGHTS_DATA_DIR||fileURLToPath(new URL('../data/insights/',import.meta.url))),file=path.join(root,'social-key')
    await fs.mkdir(root,{recursive:true})
    try{await fs.writeFile(file,randomBytes(32),{flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST')throw e}
    const value=await fs.readFile(file);if(value.length!==32)throw problem('The social encryption key is invalid.',503);return value
  }
  const getKey=()=>keyPromise ||= key().catch(error=>{keyPromise=undefined;throw error})
  async function encrypt(token){
    if(!token)return ''
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',await getKey(),iv)
    const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()])
    return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64')).join('.')
  }
  async function decrypt(value){
    if(!value)return ''
    const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64'))
    const cipher=createDecipheriv('aes-256-gcm',await getKey(),iv);cipher.setAuthTag(tag)
    return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8')
  }
  const defaults=()=>({version:0,siteUrl:env.PUBLIC_SITE_URL||'',graphVersion:env.META_GRAPH_VERSION||'v25.0',accounts:Object.fromEntries(platforms.map(p=>[p,{accountId:'',label:'',token:''}]))})
  async function raw(){return await store.settings()||defaults()}
  return {
    async read(){const settings=await raw();return {...settings,accounts:Object.fromEntries(platforms.map(p=>{const account=settings.accounts[p];return [p,{accountId:account.accountId,label:account.label,configured:Boolean(account.token),verifiedAt:account.verifiedAt||''}]}))}},
    async internal(){const settings=await raw();return {...settings,accounts:Object.fromEntries(await Promise.all(platforms.map(async p=>[p,{...settings.accounts[p],token:await decrypt(settings.accounts[p].token)}])))}},
    async save(body){
      const previous=await raw()
      if(body.version!==previous.version)throw problem('Social settings changed. Reload before saving.',409)
      const siteUrl=body.siteUrl?publicHttps(body.siteUrl):''
      if(siteUrl&&new URL(siteUrl).pathname!=='/')throw problem('Website URL must be the public origin, for example https://www.i-genext.com.')
      if(siteUrl&&(new URL(siteUrl).search||new URL(siteUrl).hash))throw problem('Website URL cannot contain a query or fragment.')
      if(typeof body.graphVersion!=='string'||!/^v\d{2}\.0$/.test(body.graphVersion))throw problem('Use a valid Meta Graph API version, for example v25.0.')
      const accounts={}
      for(const platform of platforms){
        const old=previous.accounts[platform],input=body.accounts?.[platform]
        if(!input||typeof input.accountId!=='string'||!/^[0-9]{0,40}$/.test(input.accountId)||typeof input.label!=='string'||input.label.length>100||typeof input.token!=='string'||input.token.length>8192||/[\r\n]/.test(input.token))throw problem('Check the account ID, label and access token for '+platform+'.')
        const changed=input.token.trim()||input.clearToken||old.accountId!==input.accountId
        accounts[platform]={accountId:input.accountId,label:input.label.trim(),token:input.clearToken?'':input.token.trim()?await encrypt(input.token.trim()):old.token,verifiedAt:changed?'':old.verifiedAt||''}
      }
      await store.saveSettings({siteUrl:siteUrl.replace(/\/$/,''),graphVersion:body.graphVersion,accounts},previous.version)
      return this.read()
    },
    async verified(platform,identity,expectedVersion){
      const settings=await raw(),account=settings.accounts[platform]
      if(settings.version!==expectedVersion)throw problem('Account settings changed during verification. Verify again.',409)
      if(account.accountId&&account.accountId!==identity.id)throw problem('The token belongs to a different account. Correct the account ID or token.',409)
      settings.accounts[platform]={...account,accountId:identity.id,label:identity.label,verifiedAt:new Date().toISOString()}
      await store.saveSettings(settings,expectedVersion);return this.read()
    }
  }
}
