import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/second-watch';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const reports=[]
try{
 for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]].filter(([w])=>!process.env.QA_WIDTH||w===+process.env.QA_WIDTH)){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:width===320?'reduce':'no-preference'}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000)
  await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle',timeout:60000})
  const shot=async name=>{
   await page.screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'})
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),name+' overflow')
   for(const control of await page.locator('#surge-command:visible,#command-aim:visible,#command-discard:visible').all()){
    const b=await control.boundingBox();assert(b&&b.height>=44&&b.width>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height,name+' command fully visible')
   }
  }
  const leave=async()=>{await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()}
  const fixture=async(mode,hero='ivo')=>{
   await page.evaluate(async({mode,hero})=>{
    const {Sim,DT}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts'),{techniqueOffers}=await import('/src/game/watch-craft.ts'),{COMMANDS}=await import('/src/game/watch-director.ts')
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:2,hero,variant:1},1047)
    s.wave=mode==='passage'?12:mode==='boss'?23:5;s.glow=10000;s.chooseTechnique(techniqueOffers(s)[hero==='ivo'?1:0].id)
    if(s.wave>12)s.choosePassage('convoy') // fixture below assigns at the valid break
    if(mode==='boss'){s.wave=12;s.choosePassage('convoy');s.wave=23}
    for(const pad of [1,2,3,4,5,6,7])s.unlockPlot(pad)
    const t=s.build(0,COMMANDS[hero].tower);t.cd=0;t.tolls=2
    s.designateCommand(t)
    if(mode!=='command')for(const [pad,id,path] of [[1,'cracker',1],[3,'bell',0],[4,'storm',1],[5,'ballista',0],[6,'beam',0],[7,'owl',1]]){const tower=s.build(pad,id);if(tower){s.specialise(tower,path);s.upgrade(tower,path)}}
    if(mode==='command')s.build(1,COMMANDS[hero].tower)
    if(mode!=='passage'){
     s.startWave();s.spawners=[]
     const pts=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.ceil(seg.line.length/5)},(_,i)=>({seg,at:i*5,p:seg.line.at(i*5,{x:0,y:0,tx:0,ty:0})}))).sort((a,b)=>Math.hypot(a.p.x-t.x,a.p.y-t.y)-Math.hypot(b.p.x-t.x,b.p.y-t.y)),p=pts[0]
     for(let i=0;i<2;i++){const e=s.spawnEnemy(mode==='boss'&&i===0?'bloomheart':'shell',p.seg,p.at+i*25,s.wave);e.hp=e.maxHp=100000;e.shell=e.maxShell=10000;e.stunT=10000;e.burnT=10000;e.burnDps=3;if(mode==='boss'&&i===0){e.hp*=.69;e.stunT=0}}
     if(hero==='sol'&&mode==='command'){const fire=s.build(3,'cracker');if(fire)s.specialise(fire,1)}
     s.step(DT)
     if(mode==='boss'){s.enemies.find(e=>e.def.boss).signalT=3;s.climate.elapsed=65}
    }
    const snap=s.snapshot();if(!validSnapshot(snap))throw Error('Invalid '+mode+' fixture')
    for(const key of Object.keys(localStorage))if(key.includes('fixed1.campaign'))localStorage.removeItem(key)
    localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(snap,[]))
   },{mode,hero})
   await page.reload();await page.locator('[data-action="resume:campaign"]').click()
  }
  await shot('title');await page.locator('[data-action="choose"]').click();await page.locator('[data-action="new"]').click()
  assert.equal(await page.evaluate(async()=>{const {decodeRun}=await import('/src/game/save-store.ts');return decodeRun(localStorage.getItem('lanternlocks.fixed1.campaign')).snapshot.challenge.watchDirector}),2)
  await leave()
  await fixture('passage');await page.locator('[data-action="passages"]').click();assert.equal(await page.locator('.passage-map').count(),2);await shot('passage-preview')
  await page.locator('[data-action="passage:convoy"]').click();assert.equal(await page.locator('[data-action="plot:12"]').count(),1);await shot('jetty');await leave()
  await fixture('passage');await page.locator('[data-action="passages"]').click();await page.locator('[data-action="passage:runners"]').click();await shot('sluice');await leave()
  for(const hero of ['sol','mira','ivo']){
   await fixture('command',hero)
   await page.locator('[data-action="plot:0"]').click();assert.equal(await page.locator('.tier-pips i').count(),3)
   assert.equal(await page.getByText('Improve foundation',{exact:true}).count(),0)
   await page.locator('[data-action^="command-owner:"]').click();await page.locator('.drawer [data-action="close"],.modal [data-action="close"]').first().click()
   await page.locator('#surge-command').click();await page.waitForFunction(()=>document.querySelector('#surge-command')?.dataset.phase==='held')
   if(hero==='ivo'){
    await page.locator('#command-aim').click();assert(await page.locator('[data-action^="command-target:"]').count()>=2)
    await page.locator('[data-action^="command-target:"]').last().click()
   }
   await shot('command-'+hero)
   const box=await page.locator('#surge-command').boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=width,'command touch target')
   assert((await page.locator('#command-readout').innerText()).includes('Plot 1'))
   await leave();await page.locator('[data-action="resume:campaign"]').click();assert.equal(await page.locator('#surge-command').getAttribute('data-phase'),'held')
   await page.locator('#surge-command').click();await page.waitForFunction(()=>document.querySelector('#surge-command')?.dataset.phase==='spent');await leave()
  }
  await fixture('boss');await shot('boss-channel');await page.waitForTimeout(1600);await shot('battlefield');await leave()
  assert.deepEqual(errors,[]);reports.push({width,height,passagePreviews:true,jetty:true,sluice:true,threeStages:true,commands:true,targetSelection:true,saveResume:true,errors});console.log(`PASS ${width}x${height}`);await ctx.close()
 }
 writeFileSync(`${out}/browser-report.json`,JSON.stringify(reports,null,2))
}finally{await browser.close()}
