import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const story=process.argv.includes('--story'),mastery=story||process.argv.includes('--mastery'),tactics=mastery||process.argv.includes('--tactics'),out=process.env.QA_OUT||(story?'artifacts/story-release':mastery?'artifacts/mastery-qa':tactics?'artifacts/tactics-qa':'artifacts/visual-overhaul');mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(process.env.QA_URL||(story?'http://127.0.0.1:5176/?muted=1':'http://127.0.0.1:5174/?muted=1'))
 const result=await page.evaluate(async({tactics,mastery,story})=>{
  const {Sim}=await import('/src/game/sim.ts'),{TOWER_ORDER,ENEMIES}=await import('/src/game/defs.ts'),{drawFixedTower,fixedTowerIcon,fixedShotOrigin}=await import('/src/render/fixed-towers.ts'),{drawFixedWorld,fixedEnemyIcon}=await import('/src/render/fixed-world.ts'),{setArchitectureLight}=await import('/src/render/architecture.ts'),{shotPose,drawCanalShot,drawCanalBeam}=await import('/src/render/shot-art.ts'),{boardPoint,boardAngle,worldPoint,elevated,BOARD_DEPTH,livingBoardBounds}=await import('/src/render/board-view.ts'),{districtGradient}=await import('/src/render/fixed-scenery.ts')
  const check=(value,why)=>{if(!value)throw Error(why)},close=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<.001
  const cv=document.createElement('canvas');cv.width=400;cv.height=400;const c=cv.getContext('2d');setArchitectureLight(c,true)
  const paint=(id,reducedMotion,time,since)=>{c.clearRect(0,0,400,400);drawFixedTower(c,200,260,{id,a:2,b:0,hero:'mira',...(mastery?{refinement:1,mastery:['contract:small-company','contract:last-lantern','contract:twin-signals']}:{}),time,since,charge:.7,age:9,upAge:9,reducedMotion});return cv.toDataURL()}
  for(const id of TOWER_ORDER){check(paint(id,true,1,.03)===paint(id,true,9,.3),id+' reduced motion');check(paint(id,false,1,.03)!==paint(id,false,2,.3),id+' moves');}
  for(const wide of [false,true])for(const [kind,id]of [['spark','wick'],['feather','owl'],['moth','owl'],['bolt','ballista'],['rocket','cracker'],['firework','cracker'],['mini','cracker']]){
   const p={...(tactics&&kind==='bolt'?{beacon:true}:{}),kind,x:200,y:200,vx:180,vy:30,sx:160,sy:200,ex:260,ey:200,dur:1,t:.4,heavy:true,tower:{id,a:2,b:0,x:160,y:200}},before=JSON.stringify(p)
   const paintShot=time=>{c.clearRect(0,0,400,400);drawCanalShot(c,p,time,true,wide);return cv.toDataURL()}
   check(paintShot(1)===paintShot(9),kind+' reduced-motion projectile in both cameras');drawCanalShot(c,p,3,false,wide);check(JSON.stringify(p)===before,'projectile art must not change combat data')
  }
  for(const wide of [false,true]){const paintBeam=time=>{c.clearRect(0,0,400,400);drawCanalBeam(c,{id:'beam',a:2,b:0,x:160,y:260},{x:280,y:150},time,true,wide);return cv.toDataURL()};check(paintBeam(1)===paintBeam(9),'reduced-motion beam has no moving filaments')}
  // Transparent borders catch clipped finials, feathers and long boss tails.
  const iconBounds=[]
  const checkIcon=async(url,label)=>{const img=new Image();img.src=url;await img.decode();cv.width=img.width;cv.height=img.height;c.clearRect(0,0,cv.width,cv.height);c.drawImage(img,0,0);const data=c.getImageData(0,0,cv.width,cv.height).data;let edge=0;for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++)if((x<2||y<2||x>=cv.width-2||y>=cv.height-2)&&data[(y*cv.width+x)*4+3]>10)edge++;check(edge===0,label+' clipped icon: '+edge);iconBounds.push(label)}
  for(const hero of ['sol','mira','ivo'])for(const id of TOWER_ORDER)for(const [a,b,refinement]of [[0,0,0],[1,0,0],[2,0,0],[0,2,0],[3,0,0],[0,3,0],[3,0,1],[0,3,1]])await checkIcon(fixedTowerIcon(id,a,b,refinement,hero),[hero,id,a,b,refinement].join(':'))
  for(const id of Object.keys(ENEMIES))await checkIcon(fixedEnemyIcon(id),id)
  for(const wide of [false,true])for(let a=-Math.PI;a<=Math.PI;a+=.1){const p=boardPoint(Math.cos(a),Math.sin(a),wide),length=Math.hypot(p.x,p.y);check(close({x:p.x/length,y:p.y/length},{x:Math.cos(boardAngle(a,wide)),y:Math.sin(boardAngle(a,wide))}),'weapon aim follows the compressed camera')}
  for(const wide of [false,true])for(const kind of ['firework','mini']){
   const tower={id:'cracker',a:2,b:0,x:220,y:240},p={kind,tower,sx:220,sy:222,ex:380,ey:390,dur:1,t:0}
   const socket=kind==='mini'?{x:0,y:-8}:fixedShotOrigin(tower),offset=worldPoint(socket.x,socket.y,wide),sy=kind==='mini'?p.sy:tower.y
   check(close(shotPose(p,wide),{x:p.sx+offset.x,y:sy+offset.y}),'mortar leaves its barrel in either camera')
   check(close(shotPose({...p,t:1},wide),elevated(p.ex,p.ey,8,wide)),'mortar lands at the hit effect')
   for(let t=0;t<=1;t+=.01)check(Object.values(shotPose({...p,t},wide)).every(Number.isFinite),'finite projectile pose')
  }
  const rules={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,...(tactics?{watchTactics:1}:{}),...(mastery?{watchMastery:1}:{}),...(story?{watchDirector:2}:{}),hero:'ivo',variant:0}
  cv.width=1440;cv.height=810;document.body.replaceChildren(cv);cv.style.cssText='width:1440px;height:810px;display:block'
  const scenes=[],profile=[]
  for(let variant=0;variant<4;variant++)for(const wide of [false,true])for(const night of [false,true]){
   const s=new Sim('standard',{...rules,variant},1047);s.wave=35;s.glow=50000;s.climate.elapsed=night?70:12
   for(let i=0;i<12;i++){s.unlockPlot(i);const t=s.build(i,TOWER_ORDER[i%8]);if(t){s.upgrade(t,0);s.upgrade(t,0)}}
   const segments=[...s.level.segs.values()]
   for(let i=0;i<80;i++){const seg=segments[i%segments.length];s.spawnEnemy(Object.keys(ENEMIES)[i%15],seg,seg.line.length*((i*.173)%1),35,true)}
   if(tactics){s.syncBonds();s.enemies.slice(0,12).forEach(e=>e.exposedT=3)}
   const view={selection:tactics?{kind:'tower',tower:s.towers.find(t=>t.id==='bell')}:null,hover:null,hint:null,paused:false},before=JSON.stringify(s.snapshot()),bounds=livingBoardBounds(s,wide),scale=Math.min(1440/bounds.w,810/bounds.h),keepsakes=['market','observatory','gardens'].map(id=>'project:'+id+':'+Number(night)).concat(mastery?['contract:small-company','contract:last-lantern','contract:twin-signals']:[])
   const render=time=>{c.resetTransform();c.clearRect(0,0,1440,810);c.fillStyle=districtGradient(c,s,0,0,1440,810);c.fillRect(0,0,1440,810);c.save();c.translate((1440-bounds.w*scale)/2-bounds.x*scale,(810-bounds.h*scale)/2-bounds.y*scale);c.scale(scale,scale);if(wide){c.scale(1,BOARD_DEPTH);c.rotate(-Math.PI/2)}drawFixedWorld(c,s,view,2,keepsakes,'reed',scale,false,time,wide);c.restore()}
   render(0);const durations=[]
   for(let i=1;i<=45;i++){const start=performance.now();render(i/60);durations.push(performance.now()-start)}
   // Force command completion once; the per-frame CPU numbers exclude GPU presentation.
   c.getImageData(0,0,1,1)
   check(JSON.stringify(s.snapshot())===before,'painting must not mutate combat or its save')
   durations.sort((a,b)=>a-b);profile.push({variant,wide,night,towers:s.towers.length,enemies:s.enemies.length,medianMs:durations[22],p95Ms:durations[42]});scenes.push({variant,wide,night})
  }
  return {icons:iconBounds.length,towersAnimated:8,reducedMotion:8,projectilesReducedMotion:14,beamsReducedMotion:2,projectileEndpoints:4,scenes,profile,renderingDoesNotMutateSave:true,masteryCosmetics:mastery}
 },{tactics,mastery,story})
 assert.deepEqual(errors,[]);writeFileSync(`${out}/invariants.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('PASS icon bounds, distinct animation, reduced motion, projectile contact, four-map purity and render profiling')
}finally{await browser.close()}
