import {createRequire} from 'node:module'
import {mkdirSync,renameSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/visual-overhaul';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000},recordVideo:{dir:out,size:{width:1280,height:1000}}}),page=await context.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5174/?muted=1')
 await page.evaluate(async()=>{
  const {drawFixedTower}=await import('/src/render/fixed-towers.ts'),{drawFixedEnemy}=await import('/src/render/fixed-enemies.ts'),{drawCanalShot,drawCanalBeam}=await import('/src/render/shot-art.ts'),{setArchitectureLight}=await import('/src/render/architecture.ts'),{Fx}=await import('/src/render/fx.ts'),{ENEMIES}=await import('/src/game/defs.ts')
  document.body.innerHTML='<canvas></canvas>';const cv=document.querySelector('canvas');cv.width=1280;cv.height=1000;cv.style.cssText='width:1280px;height:1000px;display:block';const c=cv.getContext('2d');setArchitectureLight(c,true)
  const studies=[['wick','spark','Ember cannon / incandescent rounds'],['cracker','firework','Mortar / curved fuse trails'],['ballista','bolt','Ballista / steel penetrators'],['owl','feather','Raptor scout / bladed feathers'],['cracker','rocket','Rocket battery / hot exhaust'],['beam','beam','Lighthouse / focused sun lance'],['storm','arc','Storm coil / branching discharge'],['bell','toll','Chime / resonant pressure wave']]
  const start=performance.now(),targets=studies.map((_,i)=>({def:ENEMIES[i%2?'shell':'drip'],x:497,y:178,uid:i,age:0,hp:100,maxHp:100,shell:8,maxShell:8,visScale:1.25,hitT:0,heatT:0,burnT:0,stunT:0,slowT:0,tx:-1,ty:0,seenT:1,revealedPerm:true,phase:0}))
  const draw=now=>{
   const time=(now-start)/1000;c.fillStyle='#132d37';c.fillRect(0,0,1280,1000);c.fillStyle='#f2e5c5';c.font='500 25px "DM Sans Variable"';c.textAlign='left';c.fillText('Nightward / The arsenal',30,40)
   for(const [i,[id,kind,label]]of studies.entries()){
    const q=((time+i*.19)%1.7)/1.7,hit=q>.7,enemy=targets[i];enemy.age=time;enemy.hitT=hit?Math.max(0,.12-(q-.7)*1.7):0
    c.save();c.translate(20+i%2*640,65+Math.floor(i/2)*230);c.fillStyle='#ffffff06';c.beginPath();c.roundRect(0,0,620,216,12);c.fill();c.fillStyle='#d6cead';c.font='500 15px "DM Sans Variable"';c.fillText(label,16,24)
    const tower={id,a:kind==='rocket'?0:2,b:kind==='rocket'?2:0,x:105,y:185,angle:-.08,time,since:q*1.7,age:9,upAge:9,charge:Math.min(1,q*1.6),hero:'ivo',firing:kind==='beam'}
    drawFixedTower(c,tower.x,tower.y,tower);drawFixedEnemy(c,enemy,false,false)
    const fx=new Fx()
    if(kind==='beam')drawCanalBeam(c,tower,enemy,time,false,false)
    else if(kind==='arc'){if(q<.28){fx.add({kind:'arc',x:105,y:117,tx:497,ty:170,color:'#a8eafa',lw:2.5,life:.25});fx.list[0].max=1;fx.list[0].life=1-q/.28}}
    else if(kind==='toll'){if(q<.65){fx.add({kind:'shock',x:105,y:185,color:'#a2ede6',size:95,life:1});fx.list[0].life=1-q/.65}}
    else if(!hit){const k=q/.7;drawCanalShot(c,{kind,tower,x:125+(497-125)*k,y:183-5*k,vx:300,vy:-5,sx:105,sy:185,ex:497,ey:178,t:k*.7,dur:.7,heavy:kind==='bolt'||kind==='firework'},time,false,false)}
    else{fx.add({kind:kind==='firework'||kind==='rocket'?'shock':'impact',x:497,y:170,size:kind==='firework'||kind==='rocket'?42:18,color:kind==='feather'?'#d9efad':'#ffd49f',life:1});fx.list[0].life=1-(q-.7)/.3;fx.flash(497,170,25,'#ffce9a',1);fx.list[1].life=1-(q-.7)/.3}
    fx.drawBase(c);c.save();c.globalCompositeOperation='screen';fx.drawGlow(c,true);c.restore();c.restore()
   }
   requestAnimationFrame(draw)
  };requestAnimationFrame(draw)
 })
 await page.waitForTimeout(2600);await page.screenshot({path:`${out}/weapon-study.png`});await page.waitForTimeout(3400)
 const video=page.video();await context.close();renameSync(await video.path(),`${out}/weapon-motion.webm`);assert.deepEqual(errors,[]);console.log('PASS eight animated weapon studies and impacts without browser errors')
}finally{await browser.close()}
