import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/visual-overhaul/places';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5174/?muted=1');await page.locator('[data-action="choose"]').waitFor()
 const result=await page.evaluate(async()=>{
  const {drawLandmarkMiniature}=await import('/src/render/place-art.ts'),{districtPanorama}=await import('/src/render/district-projects.ts'),{loadVillage}=await import('/src/game/fixed-store.ts'),{setArchitectureLight}=await import('/src/render/architecture.ts'),{LANDMARKS}=await import('/src/game/watch-depth.ts')
  document.body.innerHTML='<canvas id="places"></canvas>';const cv=document.querySelector('canvas');cv.width=1280;cv.height=540;cv.style.cssText='display:block;width:1280px';const c=cv.getContext('2d');c.fillStyle='#193a3e';c.fillRect(0,0,1280,540);c.fillStyle='#f0e3c1';c.font='500 25px "DM Sans Variable"';c.fillText('The four canal landmarks',30,39)
  for(const [row,night]of [false,true].entries())for(const [i,l]of LANDMARKS.entries()){
   const x=160+i*320,y=210+row*225;setArchitectureLight(c,!night);c.save();c.translate(x,y);c.scale(2.5,2.5);drawLandmarkMiniature(c,l.id,0,0,true,night,1.4,false);c.restore();c.fillStyle='#e7d3a4';c.textAlign='center';c.font='500 18px "DM Sans Variable"';c.fillText(l.name,x,y+47)
  }
  const profile=loadVillage(),locked=districtPanorama(profile);profile.records={'0:standard':{wave:40,light:25,won:true,practice:false}}
  const restored=districtPanorama(profile);profile.districtStyles={market:1,observatory:1,gardens:1};const alternate=districtPanorama(profile)
  if(locked===restored||restored===alternate)throw Error('Restoration and cosmetic choices must alter the panorama')
  const probe=document.createElement('canvas');probe.width=probe.height=180;const pc=probe.getContext('2d');setArchitectureLight(pc,true)
  for(const l of LANDMARKS){const draw=time=>{pc.clearRect(0,0,180,180);drawLandmarkMiniature(pc,l.id,90,120,true,false,time,true);return probe.toDataURL()};if(draw(1)!==draw(9))throw Error('Reduced-motion landmark moves: '+l.id)}
  return {locked,restored,alternate}
 })
 await page.locator('canvas').screenshot({path:`${out}/landmarks.png`})
 for(const [name,url]of Object.entries(result)){
  await page.evaluate(url=>{document.body.innerHTML='<img id="panorama" alt="District restoration" />';const img=document.querySelector('img');img.src=url;img.style.cssText='width:1000px;display:block'},url);await page.locator('img').evaluate(img=>img.decode());await page.locator('img').screenshot({path:`${out}/${name}.png`})
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify({landmarks:4,reducedMotion:4,distinctPanoramas:3,errors},null,2));console.log('PASS four landmarks, reduced motion, locked/restored/alternative district portraits')
}finally{await browser.close()}
