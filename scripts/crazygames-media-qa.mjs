import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync,statSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base=process.env.QA_ORIGIN||'http://127.0.0.1:5176',out='artifacts/crazygames';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const report=[]
try{const page=await browser.newPage();await page.goto(base+'/?muted=1')
 for(const [name,w,h]of [['landscape',1920,1080],['portrait',1080,1620]]){
  const result=await page.evaluate(async({base,name})=>{
   const v=document.createElement('video');v.muted=true;v.preload='auto';v.src=base+'/release/crazygames/preview-'+name+'.webm'
   await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=reject});await v.play();v.pause()
   const duration=v.duration
   v.currentTime=6;await new Promise(resolve=>v.onseeked=resolve)
   const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0)
   return{duration,width:v.videoWidth,height:v.videoHeight,audioTracks:v.captureStream().getAudioTracks().length,frame:c.toDataURL().split(',')[1]}
  },{base,name})
  assert.equal(result.width,w);assert.equal(result.height,h);assert(result.duration>=15&&result.duration<=20,`Preview duration ${result.duration}`);assert.equal(result.audioTracks,0)
  const file=`release/crazygames/preview-${name}.webm`,bytes=statSync(file).size;assert(bytes<50_000_000)
  writeFileSync(`${out}/preview-frame-${name}.png`,Buffer.from(result.frame,'base64'));delete result.frame;report.push({file,bytes,...result});console.log(`PASS ${name} preview: ${result.duration.toFixed(2)}s, ${w}x${h}, no audio`)
 }
 writeFileSync(`${out}/media-report.json`,JSON.stringify(report,null,2)+'\n')
}finally{await browser.close()}
