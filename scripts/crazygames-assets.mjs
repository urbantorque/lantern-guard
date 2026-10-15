import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='release/crazygames';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1})
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1');await page.evaluate(()=>document.fonts.ready)
 for(const [name,width,height]of [['landscape',1920,1080],['portrait',800,1200],['square',800,800]]){
  const png=await page.evaluate(async({width,height})=>{const{drawCover}=await import('/scripts/crazygames-cover.ts');const c=document.createElement('canvas');c.width=width;c.height=height;drawCover(c);return c.toDataURL('image/png').split(',')[1]},{width,height})
  writeFileSync(`${out}/cover-${name}.png`,Buffer.from(png,'base64'));console.log(`Cover ${name}: ${width}x${height}`)
 }
 if(!process.argv.includes('--covers-only'))for(const [name,width,height]of [['landscape',1920,1080],['portrait',1080,1620]]){
  const fixture=JSON.parse(readFileSync('qa/fixtures/crazygames/active-16.json','utf8'))
  // Capture the actual paid Dredger encounter at the game's normal tempo. No HUD or cursor overlays.
  const recording=await page.evaluate(async({width,height,fixture})=>{
   const {Sim,DT}=await import('/src/game/sim.ts'),{Renderer}=await import('/src/render/renderer.ts'),{livingBoardBounds}=await import('/src/render/board-view.ts'),{WATCH_TEMPO}=await import('/src/game/watch-tempo.ts'),{drawCover}=await import('/scripts/crazygames-cover.ts'),{sound}=await import('/src/core/audio.ts')
   sound.settings.muted=true
   const scene=document.createElement('canvas'),output=document.createElement('canvas');output.width=width;output.height=height
   const sim=Sim.restore(fixture),renderer=new Renderer(scene);renderer.attach(sim);renderer.fixedLandscape=width>height;renderer.fixedBounds=livingBoardBounds(sim,renderer.fixedLandscape);renderer.fixedTopInset=12;renderer.resize(width,height,1)
   const context=output.getContext('2d'),stream=output.captureStream(30),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm',rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6_000_000}),chunks=[]
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
   const done=new Promise(r=>rec.onstop=r);rec.start();drawCover(output)
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
   const start=performance.now();let last=start,accumulator=0
   await new Promise(resolve=>{const frame=now=>{const elapsed=(now-start)/1000,dt=Math.min(.1,(now-last)/1000);last=now
    if(elapsed>.15){accumulator+=dt*WATCH_TEMPO;while(accumulator>=DT&&sim.waveActive&&!sim.over){sim.step(DT);accumulator-=DT}renderer.handleEvents(sim);renderer.draw(sim,dt,{selection:null,armed:null,hint:null,paused:false});context.drawImage(scene,0,0,width,height)}
    if(elapsed<18)requestAnimationFrame(frame);else resolve()
   };requestAnimationFrame(frame)})
   rec.stop();await done;stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:mime}),buffer=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<buffer.length;i+=32768)binary+=String.fromCharCode(...buffer.subarray(i,i+32768));return{base64:btoa(binary),bytes:blob.size,mime,wave:sim.wave,elapsed:sim.time-fixture.time}
  },{width,height,fixture})
  assert(recording.bytes<50_000_000);writeFileSync(`${out}/preview-${name}.webm`,Buffer.from(recording.base64,'base64'));console.log(`Preview ${name}: 18-second capture, ${(recording.bytes/1e6).toFixed(2)} MB, no audio`)
 }
}finally{await browser.close()}
