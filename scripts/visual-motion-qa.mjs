import {createRequire} from 'node:module'
import {mkdirSync,renameSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/visual-overhaul';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5174/?muted=1')
 await page.locator('[data-action="choose"]').waitFor()
 await page.evaluate(async()=>{
  const {drawFixedTower}=await import('/src/render/fixed-towers.ts'),{drawFixedEnemy}=await import('/src/render/fixed-enemies.ts'),{setArchitectureLight}=await import('/src/render/architecture.ts'),{TOWER_ORDER,ENEMIES}=await import('/src/game/defs.ts'),{enemyName}=await import('/src/game/bestiary.ts')
  document.body.innerHTML='<canvas id="motion"></canvas>';const cv=document.querySelector('canvas');cv.width=1440;cv.height=900;const c=cv.getContext('2d');setArchitectureLight(c,true)
  const start=performance.now(),enemies=Object.values(ENEMIES).map((def,i)=>({def,x:0,y:0,uid:i,age:0,hp:100,maxHp:100,shell:def.shell??0,maxShell:def.shell??0,visScale:1,hitT:0,heatT:0,burnT:0,stunT:0,slowT:0,tx:1,ty:0,seenT:1,revealedPerm:true,phase:0}))
  const draw=now=>{
   const time=(now-start)/1000;c.fillStyle='#17373d';c.fillRect(0,0,1440,900);c.fillStyle='#f2e5c5';c.textAlign='left';c.font='500 28px "DM Sans Variable"';c.fillText('Nightward / The siege of the canals',30,42);c.fillStyle='#bbd0c4';c.font='400 15px "DM Sans Variable"';c.fillText('Eight keeper mechanisms • fifteen hostile invaders',30,71)
   for(const [i,id]of TOWER_ORDER.entries()){
    const since=(time+i*.15)%2.4,x=i*180+90,y=273;c.fillStyle='#ffffff05';c.beginPath();c.roundRect(x-79,90,158,220,12);c.fill();c.save();c.translate(x,y);c.scale(1.3,1.3);drawFixedTower(c,0,0,{id,a:2,b:0,hero:'ivo',time,since,age:9,upAge:9,angle:-.7+Math.sin(time*.65+i)*.45,charge:Math.min(1,since/1.6),firing:since<1,volleyCharge:Math.floor(time)%3});c.restore();c.fillStyle='#ead4a8';c.font='500 14px "DM Sans Variable"';c.textAlign='center';c.fillText(({wick:'Cannon shutters',cracker:'Mortar recoil',bell:'Swinging chime',owl:'Raptor sentinel',beam:'Prism beacon',garden:'Glass garden',storm:'Orbiting coils',ballista:'Winding bow'})[id],x,332)
   }
   for(const [i,e]of enemies.entries()){
    const x=i%5*288+144,y=Math.floor(i/5)*168+468,k=Math.min(2.6,130/(e.def.radius*(e.def.boss?1.16:1.42)*(e.def.id==='gloom'?3.7:3.2)));e.age=time;e.tx=Math.cos(time*.45);e.ty=Math.sin(time*.45);c.save();c.translate(x,y);c.scale(k,k);drawFixedEnemy(c,e,false,false);c.restore();c.fillStyle='#c9d8c8';c.font='400 14px "DM Sans Variable"';c.textAlign='center';c.fillText(enemyName(e.def.id),x,y+42)
   }
   requestAnimationFrame(draw)
  };requestAnimationFrame(draw)
 })
 await page.waitForTimeout(6000);await page.screenshot({path:`${out}/motion-gallery.png`});await page.waitForTimeout(6000)
 const video=page.video();await context.close();renameSync(await video.path(),`${out}/keeper-motion.webm`);assert.deepEqual(errors,[]);console.log('PASS 12-second motion preview without browser errors')
}finally{await browser.close()}
