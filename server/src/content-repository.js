import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import mysql from 'mysql2/promise'

export function createContentRepository({ databaseUrl = process.env.DATABASE_URL, directory = process.env.INSIGHTS_DATA_DIR || fileURLToPath(new URL('../data/insights/',import.meta.url)), nodeEnv = process.env.NODE_ENV } = {}) {
  if (databaseUrl) {
    const pool = mysql.createPool(databaseUrl)
    const api = conn => ({
      async get(collection,id) { const [rows]=await conn.execute('SELECT data FROM cms_documents WHERE collection = ? AND id = ?',[collection,id]); return rows.length?(typeof rows[0].data==='string'?JSON.parse(rows[0].data):rows[0].data):null },
      async all(collection) { const [rows]=await conn.execute('SELECT data FROM cms_documents WHERE collection = ?',[collection]); return rows.map(row=>typeof row.data==='string'?JSON.parse(row.data):row.data) },
      async put(collection,id,data) { await conn.execute('INSERT INTO cms_documents (collection,id,data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data = VALUES(data)',[collection,id,JSON.stringify(data)]) }
    })
    return {
      mode:'mysql',
      read: fn => fn(api(pool)),
      async write(fn) {
        const conn=await pool.getConnection()
        try {
          await conn.beginTransaction()
          await conn.query("INSERT IGNORE INTO cms_mutex (id) VALUES ('content')")
          await conn.query("SELECT id FROM cms_mutex WHERE id = 'content' FOR UPDATE")
          const result=await fn(api(conn)); await conn.commit(); return result
        } catch(error) { await conn.rollback();throw error } finally {conn.release()}
      },
      close:()=>pool.end()
    }
  }
  if(nodeEnv==='production') throw new Error('DATABASE_URL is required for insights in production. Apply migration 004_insights_cms.sql.')
  const root=path.resolve(directory), filename=path.join(root,'content.json')
  let pending=Promise.resolve()
  async function read(){try{return JSON.parse(await fs.readFile(filename,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
  const api=state=>({
    async get(collection,id){return structuredClone(state[collection]?.[id] || null)},
    async all(collection){return structuredClone(Object.values(state[collection]||{}))},
    async put(collection,id,data){state[collection] ||= {};state[collection][id]=structuredClone(data)}
  })
  return {
    mode:'local-development',
    async read(fn){await pending;return fn(api(await read()))},
    write(fn){
      const result=pending.then(async()=>{
        const state=await read(), result=await fn(api(state))
        await fs.mkdir(root,{recursive:true})
        const temp=filename+'.'+randomUUID()+'.tmp'
        try{await fs.writeFile(temp,JSON.stringify(state),{mode:0o600});await fs.rename(temp,filename)}
        finally{await fs.unlink(temp).catch(()=>{})}
        return result
      });pending=result.catch(()=>{});return result
    },
    async close(){await pending}
  }
}
