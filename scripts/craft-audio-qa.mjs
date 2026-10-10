import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/craft/audio';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const page=await browser.newPage();await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1')
 const reports=[]
 for(const item of [...[1,9,17,25,33].map((wave,i)=>({name:'act-'+(i+1),wave,seconds:24})),...['toad','dredger','gloom','warden','bloomheart'].map(cue=>({name:'boss-'+cue,cue,seconds:4}))]){
  const result=await page.evaluate(async item=>{
   const {Sound}=await import('/src/core/audio.ts');const b=await Sound.renderScene({hero:'mira',night:item.wave===17,weather:'clear',campaign:true,wave:item.wave??1,playing:true},item.seconds,item.cue)
   const a=b.getChannelData(0),bytes=new ArrayBuffer(44+a.length*2),v=new DataView(bytes);let sum=0,peak=0,nonfinite=0
   const text=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)))
   text(0,'RIFF');v.setUint32(4,36+a.length*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,b.sampleRate,true);v.setUint32(28,b.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,a.length*2,true)
   for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i]))nonfinite++;sum+=a[i]*a[i];peak=Math.max(peak,Math.abs(a[i]));v.setInt16(44+i*2,Math.max(-1,Math.min(1,a[i]))*32767,true)}
   let binary='';const u=new Uint8Array(bytes);for(let i=0;i<u.length;i+=16384)binary+=String.fromCharCode(...u.subarray(i,i+16384))
   return {peak,rms:Math.sqrt(sum/a.length),nonfinite,base64:btoa(binary),seconds:b.duration}
  },item)
  assert(result.peak<.98&&result.peak>.005,item.name+' headroom and audible output');assert.equal(result.nonfinite,0);assert(result.rms>.0005,item.name+' non-silent output')
  writeFileSync(`${out}/${item.name}.wav`,Buffer.from(result.base64,'base64'));delete result.base64;reports.push({name:item.name,...result});console.log('PASS '+item.name+' peak '+result.peak.toFixed(3)+' rms '+result.rms.toFixed(3))
 }
 writeFileSync(`${out}/levels.json`,JSON.stringify(reports,null,2))
}finally{await browser.close()}
