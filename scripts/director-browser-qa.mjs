import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/director-qa';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const reports=[]
try{
 for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]].filter(([w])=>!process.env.QA_WIDTH||w===+process.env.QA_WIDTH)){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
  await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle',timeout:60000})
  const shot=async name=>{await page.waitForTimeout(200);await page.screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),name+' horizontal overflow')}
  const back=()=>page.locator('.front-menu [data-action="close"]').click()
  await shot('title');await page.locator('[data-action="choose"]').click();await shot('setup')
  await page.locator('[data-action="watch-length:endurance"]').click();assert.match(await page.locator('[data-action="watch-length:endurance"]').getAttribute('class'),/selected/);await back()
  await page.locator('[data-action="expeditions"]').click();await shot('expeditions')
  for(const id of ['moonwake','stormglass']){await page.locator(`[data-action="expedition-select:${id}"]`).click();await shot(id)}
  await page.locator('[data-action="expedition-hero:mira"]').click();assert.match(await page.locator('.keeper-command-note').innerText(),/Stillwater/)
  await back();await page.locator('[data-action="bestiary"]').click();await shot('bestiary');await back()
  await page.locator('[data-action="district"]').click();await shot('district');await back()
  await page.locator('[data-action="settings"]').click();await shot('settings');await back()
  if(process.env.QA_MENUS_ONLY){assert.deepEqual(errors,[]);reports.push({width,height,menus:true,errors});await ctx.close();continue}
  await page.locator('[data-action="choose"]').click();await page.locator('[data-action="watch-length:chapter"]').click();await page.locator('[data-action="new"]').click()
  const flags=await page.evaluate(async()=>{const {decodeRun}=await import('/src/game/save-store.ts');return decodeRun(localStorage.getItem('lanternlocks.fixed1.campaign')).snapshot.challenge});assert.equal(flags.watchDirector,2);assert(!flags.endurance)
  await shot('fresh-watch')
  const leave=async()=>{await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()}
  await leave();await shot('saved-title')
  const planning=JSON.parse(readFileSync(`${out}/stormglass-6.json`,'utf8'));planning.director.passage=null
  await page.evaluate(async snap=>{const {encodeRun,validSnapshot}=await import('/src/game/save-store.ts');if(!validSnapshot(snap))throw Error('Invalid route fixture');for(const k of Object.keys(localStorage))if(k.includes('fixed1.campaign'))localStorage.removeItem(k);localStorage.setItem('lanternlocks.fixed1.commission',encodeRun(snap,[]))},planning)
  await page.reload();await page.locator('[data-action="resume:commission"]').click();await shot('return-canal')
  await page.locator('[data-action="passages"]').click();await shot('passages');await page.locator('[data-action="passage:runners"]').click();assert.equal(await page.locator('.passage-choice').count(),0)
  await leave()
  for(const hero of ['sol','mira','ivo']){
   await page.evaluate(async hero=>{
    const {Sim,DT}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts'),{COMMANDS}=await import('/src/game/watch-director.ts'),{EXPEDITIONS}=await import('/src/game/watch-depth.ts'),{techniqueOffers}=await import('/src/game/watch-craft.ts')
    const e=EXPEDITIONS[0],s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:1,hero,variant:0,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)
    s.wave=3;s.glow=2000;s.chooseTechnique(techniqueOffers(s)[hero==='ivo'?1:0].id);const t=s.build(0,COMMANDS[hero].tower);t.cd=0;t.tolls=2;s.startWave();s.spawners=[]
    const positions=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.floor(seg.line.length/5)},(_,i)=>{const at=i*5,p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});return {seg,at,d:Math.hypot(p.x-t.x,p.y-t.y)}})).sort((a,b)=>a.d-b.d),p=positions[0]
    const enemy=s.spawnEnemy('shell',p.seg,p.at,4);enemy.hp=enemy.maxHp=100000;enemy.shell=enemy.maxShell=100000;enemy.stunT=10000;enemy.burnT=10000;enemy.burnDps=3
    if(hero==='sol'){
     const pad=s.pads.map((q,i)=>({i,q,d:Math.hypot(q.x-enemy.x,q.y-enemy.y)})).filter(q=>!q.q.tower&&s.padRevealed(q.i)).sort((a,b)=>a.d-b.d)[0]
     if(!s.padAvailable(pad.i))s.unlockPlot(pad.i);const fire=s.build(pad.i,'cracker');if(!fire)throw Error('Burn support missing')
    }
    const snap=s.snapshot();if(!validSnapshot(snap))throw Error('Invalid command fixture');localStorage.setItem('lanternlocks.fixed1.commission',encodeRun(snap,[]))
   },hero)
   await page.reload();await page.locator('[data-action="resume:commission"]').click();await page.locator('#surge-command').click();await page.waitForFunction(()=>document.querySelector('#surge-command')?.dataset.phase==='held');await shot('command-'+hero)
   const box=await page.locator('#surge-command').boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=width,'reachable command')
   await leave();console.log('HELD SAVE',hero,await page.evaluate(async()=>{const {decodeRun}=await import('/src/game/save-store.ts');const s=decodeRun(localStorage.getItem('lanternlocks.fixed1.commission')).snapshot;return {time:s.time,command:s.director.command,enemies:s.enemies.map(e=>({burn:e.burnT,stun:e.stunT}))}}));await page.locator('[data-action="resume:commission"]').click();assert.equal(await page.locator('#surge-command').getAttribute('data-phase'),'held');await page.locator('#surge-command').click();await page.waitForFunction(()=>document.querySelector('#surge-command')?.dataset.phase==='spent');await leave()
  }
  assert.deepEqual(errors,[]);reports.push({width,height,menus:true,passages:true,allThreeCommands:true,saveResume:true,errors});console.log(`PASS ${width}x${height}: menus, new rules, route choice, three held commands and save/resume`);await ctx.close()
 }
 writeFileSync(`${out}/browser-report${process.env.QA_MENUS_ONLY?'-menus':''}.json`,JSON.stringify(reports,null,2))
}finally{await browser.close()}
