import fs from 'node:fs/promises'
// Uses a separate headless Chrome session on localhost:9225. The source artwork is original AI-generated imagery.
const pages=await (await fetch('http://localhost:9225/json')).json()
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)(m);pending.delete(m.id)}})
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}))})
try{
await send('Page.navigate',{url:'http://localhost:5173/profile/consulting-hero-poster-v2.png'})
await new Promise(r=>setTimeout(r,1000))
const result=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
 const image=new Image();image.src='/profile/consulting-hero-poster-v2.png';await image.decode();
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');
 const stream=canvas.captureStream(24);const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm';
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2800000});const chunks=[];
 const finished=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>chunks.push(e.data);
 const duration=12000,start=performance.now();let frame;
 function draw(now){const t=(now-start)/duration,phase=t*Math.PI*2;const zoom=1.02+.018*(1-Math.cos(phase));const w=1280*zoom,h=720*zoom;ctx.drawImage(image,(1280-w)/2+6*Math.sin(phase),(720-h)/2,w,h);
 ctx.save();ctx.strokeStyle='rgba(0,176,240,.16)';ctx.lineWidth=1;
 for(let k=0;k<3;k++){ctx.beginPath();for(let x=0;x<1300;x+=8){const y=100+k*90+18*Math.sin(x/160+phase+k);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();const x=((t+k/3)%1)*1280,y=100+k*90+18*Math.sin(x/160+phase+k);ctx.fillStyle='rgba(130,220,255,.5)';ctx.shadowColor='#00B0F0';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill()}
 ctx.restore();if(now-start<duration)frame=requestAnimationFrame(draw);else recorder.stop();}
 draw(start);recorder.start();await finished;cancelAnimationFrame(frame);stream.getTracks().forEach(t=>t.stop());
 return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}))});
})()`})
if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails))
await fs.writeFile('client/public/profile/consulting-hero-demo-v2.webm',Buffer.from(result.result.value,'base64'))
console.log('Created 12-second 1280x720 consulting demo: client/public/profile/consulting-hero-demo-v2.webm')
}finally{ws.close()}
