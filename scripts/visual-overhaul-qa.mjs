import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const label=process.argv.includes('--before')?'before':'after',out='artifacts/visual-overhaul';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const errors=[],results=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5174/?muted=1')
 for(const [width,height]of [[1440,900],[390,844],[320,740]]){
  await page.setViewportSize({width,height});await page.locator('[data-action="bestiary"]').click()
  const guide=await page.evaluate(async()=>{const cards=[...document.querySelectorAll('.creature-card')];await Promise.all(cards.map(card=>card.querySelector('img').decode()));return {count:cards.length,names:cards.map(card=>card.querySelector('h3').textContent),portraits:cards.every(card=>card.querySelector('img').naturalWidth>0),overflow:document.documentElement.scrollWidth>innerWidth,title:document.querySelector('#dialog-title').textContent}})
  assert.equal(guide.count,15);assert(guide.portraits);assert(!guide.overflow);assert.equal(guide.title,'The invaders');assert(guide.names.includes('Ramming Skiff'));assert(guide.names.includes('Dreadnought'));assert(guide.names.every(n=>!n.includes('Ramming Ramming')))
  if(width===390){await page.waitForTimeout(350);await page.screenshot({path:`${out}/invader-guide-390.png`})}results.push({width,guide});await page.getByRole('button',{name:'Close',exact:true}).click()
 }
 await page.setViewportSize({width:1440,height:900})
 for(const kind of ['towers','enemies']){
  await page.evaluate(async kind=>{
   const {drawFixedTower}=await import('/src/render/fixed-towers.ts'),{drawFixedEnemy}=await import('/src/render/fixed-enemies.ts'),{setArchitectureLight}=await import('/src/render/architecture.ts'),{TOWER_ORDER,ENEMIES}=await import('/src/game/defs.ts'),{enemyName}=await import('/src/game/bestiary.ts')
   document.body.innerHTML='<canvas id="sheet"></canvas>';const cv=document.querySelector('canvas');cv.width=1440;cv.height=kind==='towers'?810:840;cv.style.cssText='width:1440px;height:auto;display:block';const c=cv.getContext('2d');c.fillStyle='#132d37';c.fillRect(0,0,cv.width,cv.height);setArchitectureLight(c,true)
   c.fillStyle='#f2e5c5';c.font='500 25px "DM Sans Variable"';c.fillText(kind==='towers'?'Nightward / The eight keepers':'Nightward / The invaders',30,42)
   if(kind==='towers')for(const [row,hero]of ['sol','mira','ivo'].entries())for(const [col,id]of TOWER_ORDER.entries()){
    const x=col*180+90,y=row*245+235;c.fillStyle='#ffffff06';c.beginPath();c.roundRect(x-78,y-163,156,192,16);c.fill();c.save();c.translate(x,y);c.scale(1.55,1.55);drawFixedTower(c,0,0,{id,a:2,b:0,hero,angle:-.65,time:1.2,since:.7,age:9,upAge:9,charge:.65});c.restore();c.fillStyle='#dccdab';c.font='500 14px "DM Sans Variable"';c.textAlign='center';c.fillText(hero+' · '+id,x,y+53)
   }else for(const [i,id]of Object.keys(ENEMIES).entries()){
    const x=i%5*288+144,y=Math.floor(i/5)*250+221,def=ENEMIES[id];c.fillStyle='#ffffff06';c.beginPath();c.roundRect(x-128,y-145,256,193,16);c.fill()
    const raw=document.createElement('canvas');raw.width=raw.height=640;const g=raw.getContext('2d');g.translate(320,400);const detail=Math.min(8,150/(def.radius*(def.boss?1.16:1.42)));g.scale(detail,detail);drawFixedEnemy(g,{def,x:0,y:0,uid:i,age:2.4,hp:100,maxHp:100,shell:def.shell??0,maxShell:def.shell??0,visScale:1,hitT:0,heatT:0,burnT:0,stunT:0,slowT:0,tx:1,ty:0,seenT:1,revealedPerm:true,phase:0},false,false)
    const pixels=g.getImageData(0,0,640,640).data;let l=640,r=0,t=640,b=0;for(let py=0;py<640;py++)for(let px=0;px<640;px++)if(pixels[(py*640+px)*4+3]>8){l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,py);b=Math.max(b,py)}const w=r-l+4,h=b-t+4,k=Math.min(220/w,163/h);c.drawImage(raw,l-2,t-2,w,h,x-w*k/2,y-132+(163-h*k)/2,w*k,h*k)
    c.fillStyle='#dccdab';c.font='500 16px "DM Sans Variable"';c.textAlign='center';c.fillText(enemyName(id),x,y+74)
   }
  },kind)
  await page.locator('canvas').screenshot({path:`${out}/${label}-${kind}.png`})
 }
 for(const [width,height]of [[1440,900],[390,844]]){
  await page.setViewportSize({width,height})
  for(const night of [false,true]){
   await page.goto('http://127.0.0.1:5174/?muted=1')
   const snap=existsSync('artifacts/experience-qa/wave-11.json')?JSON.parse(readFileSync('artifacts/experience-qa/wave-11.json','utf8')):null
   await page.evaluate(async({snap,night})=>{const {encodeRun,validSnapshot}=await import('/src/game/save-store.ts');if(!snap){const {Sim}=await import('/src/game/sim.ts');const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,hero:'ivo',variant:0},1047);s.wave=11;s.glow=3000;for(const [i,id]of ['owl','storm','bell','wick','cracker'].entries()){s.unlockPlot(i);s.build(i,id)}snap=s.snapshot()}snap.climate.elapsed=Math.ceil(snap.climate.elapsed/108)*108+(night?70:12);if(!validSnapshot(snap))throw Error('Invalid art fixture');localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(snap,[]))},{snap,night})
   await page.reload();await page.locator('[data-action="resume:campaign"]').click();await page.waitForTimeout(500);await page.screenshot({path:`${out}/${label}-${night?'night':'day'}-${width}.png`})
  }
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/${label}-results.json`,JSON.stringify({errors,results},null,2));console.log(`PASS ${label} galleries and day/night desktop/phone scenes`)
}finally{await browser.close()}
