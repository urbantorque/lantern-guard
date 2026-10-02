import {createRequire} from 'node:module'
import {writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/?muted=1&qa=1');await page.bringToFront()
 const probe=await page.evaluate(async()=>{const ctx=new OfflineAudioContext(1,44100,22050),osc=ctx.createOscillator();osc.connect(ctx.destination);osc.start();const b=await ctx.startRendering();return b.duration})
 console.log('Basic offline engine',probe)
 const rows=[]
 for(const hero of ['sol','mira','ivo']){
  const result=await page.evaluate(async hero=>{
   const {Sound}=await import('/src/core/audio.ts'),started=performance.now()
   const b=await Promise.race([Sound.renderPreview(hero,48),new Promise((_,reject)=>setTimeout(()=>reject(Error('Offline render timeout')),90000))]);let peak=0,sum=0
   for(let c=0;c<b.numberOfChannels;c++)for(const v of b.getChannelData(c)){peak=Math.max(peak,Math.abs(v));sum+=v*v}
   return {hero,peak,rms:Math.sqrt(sum/(b.length*b.numberOfChannels)),seconds:b.duration,renderMs:performance.now()-started}
  },hero)
  rows.push(result);console.log(result);assert(result.peak<.99&&result.rms>.001)
 }
 writeFileSync('artifacts/refinement-qa/audio-results.json',JSON.stringify(rows,null,2))
 await page.close()
}finally{await browser.close()}
