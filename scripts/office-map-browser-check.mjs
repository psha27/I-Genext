import { pathToFileURL,fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import express from 'express'
import assert from 'node:assert/strict'
const { chromium }=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const app=express(),dist=fileURLToPath(new URL('../client/dist/',import.meta.url))
app.get('/api/jobs',(_req,res)=>res.json({jobs:[]}))
app.use(express.static(dist))
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
const base='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true}), page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await mkdir('test-results',{recursive:true})
const cities=['Gurugram','Mumbai','Bangalore','Ranchi','Rudrapur']
try {
 await page.goto(base+'/#locations')
 await page.locator('.india-office-map').scrollIntoViewIfNeeded()
 await page.locator('.india-office-map').evaluate(img=>img.decode())
 assert.equal(await page.locator('.office-pin').count(),5)
 await page.locator('#locations').screenshot({path:'test-results/office-map-desktop.png'})
 for(const city of cities) {
  const pin=page.getByRole('button',{name:city+' office on map',exact:true})
  await pin.click()
  const balloon=page.getByRole('dialog',{name:city,exact:true})
  await balloon.waitFor()
  assert.ok((await balloon.locator('address').innerText()).length>20)
  assert.ok((await balloon.getByRole('link',{name:'View on map'}).getAttribute('href')).startsWith('https://www.google.com/maps/search/?api=1&query='))
  assert.equal(await pin.getAttribute('aria-expanded'),'true')
  assert.equal(await balloon.evaluate(el=>el.contains(document.activeElement)),true)
  if(city==='Ranchi')await page.locator('#locations').screenshot({path:'test-results/office-map-balloon-desktop.png'})
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(),0)
  assert.equal(await pin.evaluate(el=>el===document.activeElement),true)
 }
 await page.getByRole('button',{name:'Gurugram office on map'}).focus()
 await page.keyboard.press('Enter')
 await page.getByRole('dialog',{name:'Gurugram',exact:true}).waitFor()
 await page.getByRole('button',{name:'Close office details'}).click()
 await page.locator('.presence-city').filter({hasText:'Mumbai'}).click()
 await page.getByRole('dialog',{name:'Mumbai',exact:true}).waitFor()
 await page.getByRole('heading',{name:'Five cities. One connected team.'}).click()
 assert.equal(await page.getByRole('dialog').count(),0)
 await page.goto(base+'/#office-4')
 await page.getByRole('dialog',{name:'Rudrapur',exact:true}).waitFor()
 await page.getByRole('button',{name:'Close office details'}).click()
 for(const width of [390,320,768]) {
  await page.setViewportSize({width,height:900})
  for(const city of cities) {
   await page.getByRole('button',{name:city+' office on map',exact:true}).click()
   const balloon=page.getByRole('dialog',{name:city,exact:true})
   await balloon.scrollIntoViewIfNeeded()
   const box=await balloon.boundingBox()
   assert.ok(box.x>=0 && box.x+box.width<=width,city+' popup outside viewport at '+width)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
   if(width===390 && city==='Ranchi')await page.locator('#locations').screenshot({path:'test-results/office-map-mobile.png'})
   await page.getByRole('button',{name:'Close office details'}).click()
  }
 }
 await page.setViewportSize({width:1440,height:1050})
 await page.getByRole('button',{name:'Bangalore office on map'}).click()
 await page.getByRole('button',{name:'Connect with this office'}).click()
 assert.ok((await page.locator('textarea[name=message]').inputValue()).includes('Bangalore'))
 assert.equal(await page.getByRole('dialog').count(),0)
 assert.deepEqual(errors,[])
 console.log('Office map checks passed: all five pins, source addresses, directions, keyboard/focus, outside click, deep links, enquiry handoff and 320/390/768/1440px layouts.')
} finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
