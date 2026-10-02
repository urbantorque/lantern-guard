import {createRequire} from 'node:module'
import {writeFileSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
mkdirSync('artifacts/living-qa',{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/?muted=1&qa=1')
 const results=await page.evaluate(async()=>{
  const {Sim,DT}=await import('/src/game/sim.ts'),{planFixed}=await import('/scripts/fixed-bot.ts'),{techniqueOffers}=await import('/src/game/watch-craft.ts')
  const {Renderer}=await import('/src/render/renderer.ts'),{livingBoardBounds}=await import('/src/render/board-view.ts')
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,hero:'ivo',variant:1},1047)
  while(s.wave<30&&!s.over){planFixed(s);const offers=techniqueOffers(s);if(offers.length)s.chooseTechnique(offers[0].id);s.startWave();let n=0;while(s.waveActive&&!s.over&&n++<36000){s.step(DT);s.events=[]}}
  planFixed(s);s.startWave();for(let i=0;i<480;i++){s.step(DT);s.events=[]}
  const cv=document.createElement('canvas');cv.id='visual-scene';cv.style.cssText='position:fixed;inset:0;z-index:9999';document.body.append(cv)
  const r=new Renderer(cv);r.attach(s);r.fixedLandscape=true;r.fixedBounds=livingBoardBounds(s,true);r.fixedTopInset=30;r.settings={calmFx:true,reduceMotion:false,shake:false};r.resize(1440,900,1)
  const view={selection:null,preview:null,armed:null,hint:null,paused:false};r.draw(s,0,view)
  const times=[];for(let i=0;i<90;i++){const start=performance.now();r.draw(s,1/60,view);times.push(performance.now()-start)}
  times.sort((a,b)=>a-b)
  window.qaVisual={s,r,view}
  return {wave:s.wave,towers:s.towers.length,enemies:s.enemies.filter(e=>e.alive).length,medianDrawMs:times[45],p95DrawMs:times[85],light:s.lives}
 })
 await page.screenshot({path:'artifacts/living-qa/late-day.png'})
 await page.evaluate(()=>{const {s,r,view}=window.qaVisual;s.climate.elapsed=65;r.draw(s,0,view);r.draw(s,3,view)})
 await page.screenshot({path:'artifacts/living-qa/late-night.png'})
 results.pressure=await page.evaluate(()=>{
  const {s,r,view}=window.qaVisual,segments=[...s.level.segs.values()].filter(seg=>seg.id!=='inlet'),types=['shell','skitter','mender','veil','bloat','vshell']
  for(let i=0;i<60;i++){const segment=segments[i%segments.length];s.spawnEnemy(types[i%types.length],segment,segment.line.length*((i*.137)%1),30,true)}
  const times=[];for(let i=0;i<90;i++){const start=performance.now();r.draw(s,1/60,view);times.push(performance.now()-start)}
  times.sort((a,b)=>a-b);return {enemies:s.enemies.filter(e=>e.alive).length,medianDrawMs:times[45],p95DrawMs:times[85]}
 })
 await page.screenshot({path:'artifacts/living-qa/pressure-night.png'})
 await page.evaluate(async()=>{
  const {ENEMIES}=await import('/src/game/defs.ts'),{drawFixedEnemy}=await import('/src/render/fixed-enemies.ts'),{enemyName}=await import('/src/game/bestiary.ts')
  const {s}=window.qaVisual,cv=document.getElementById('visual-scene');cv.width=1440;cv.height=900;const c=cv.getContext('2d');c.fillStyle='#19374d';c.fillRect(0,0,1440,900)
  Object.values(ENEMIES).forEach((def,i)=>{const x=144+(i%5)*288,y=130+Math.floor(i/5)*290,e=s.spawnEnemy(def.id,s.level.segs.get('w1'),100,30,true),scale=def.boss?.92:1.55;Object.assign(e,{x,y,age:1.2,seenT:1});c.save();c.translate(x,y);c.scale(scale,scale);c.translate(-x,-y);drawFixedEnemy(c,e,false,false);c.restore();c.fillStyle='#efdec0';c.font='18px sans-serif';c.textAlign='center';c.fillText(enemyName(def.id),x,y+83)})
 })
 await page.screenshot({path:'artifacts/living-qa/creatures.png'})
 assert.equal(errors.length,0,errors.join('\n'));writeFileSync('artifacts/living-qa/render-results.json',JSON.stringify({...results,errors},null,2));console.log(JSON.stringify(results))
}finally{await browser.close()}
