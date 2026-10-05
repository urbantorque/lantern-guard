import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/mastery-qa';mkdirSync(out,{recursive:true})
const planning=JSON.parse(readFileSync(`${out}/last-lantern-sol-planning.json`,'utf8'))
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const rows=[]
async function leaveWatch(page,width){
 const home=page.locator('[data-action="home"]');await home.scrollIntoViewIfNeeded();await page.waitForTimeout(300)
 if(width===320){console.log('MENU HIT TEST',await home.evaluate(e=>{const r=e.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML,scroll:document.querySelector('.drawer-body')?.scrollTop}}));await page.screenshot({animations:'disabled',path:`${out}/menu-${width}.png`})}
 await home.click()
}
try{
 for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]].filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500}),page=await ctx.newPage(),errors=[]
  page.setDefaultTimeout(30000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});await page.goto('http://127.0.0.1:5174/?muted=1',{waitUntil:'domcontentloaded',timeout:60000})
  console.log(`START ${width}x${height}`)
  await page.locator('[data-action="expeditions"]').click();await page.locator('[data-action="expedition-hero:ivo"]').click()
  await page.locator('[data-action="contract:small-company"]').click();assert.equal(await page.locator('[data-action="contract:small-company"]').getAttribute('aria-pressed'),'true')
  await page.locator('[data-action="expedition-hero:mira"]').click();await page.locator('[data-action="expedition-hero:ivo"]').click();assert.equal(await page.locator('[data-action="contract:small-company"]').getAttribute('aria-pressed'),'true')
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/contracts-${width}.png`})
  await page.locator('[data-action="expedition:sunforge"]').click()
  console.log('STARTED expedition');const flags=await page.evaluate(async()=>{const {decodeRun}=await import('/src/game/save-store.ts');return decodeRun(localStorage.getItem('lanternlocks.fixed1.commission')).snapshot.challenge})
  assert.equal(flags.watchMastery,1);assert.equal(flags.contract,'small-company');assert.equal(flags.hero,'ivo')
  console.log('FLAG CHECKED');const fixture=await page.evaluate(async()=>{
   const {Sim}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts'),{EXPEDITIONS}=await import('/src/game/watch-depth.ts')
   const e=EXPEDITIONS[0],rules={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,hero:'ivo',variant:e.variant,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}}
   const s=new Sim('standard',rules,e.seed);s.wave=9;s.glow=5000;s.chooseTechnique('capacitor');s.chooseTechnique('outrider');const t=s.build(0,'storm');s.specialise(t,1);t.tolls=2;t.cd=0;s.startWave();s.spawners=[]
   const seg=s.level.segs.get('w1'),points=[];for(let at=0;at<seg.line.length;at+=5){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});points.push({at,d:Math.hypot(p.x-t.x,p.y-t.y)})}
   const enemy=s.spawnEnemy('dredger',seg,points.sort((a,b)=>a.d-b.d)[0].at,10);enemy.hp=enemy.maxHp=100000;enemy.stunT=40
   const snap=s.snapshot();if(!validSnapshot(snap))throw Error('Command fixture invalid');return encodeRun(snap,[])
  })
  await page.locator('[data-action="menu"]').click();await leaveWatch(page,width)
  console.log('COMMAND FIXTURE');await page.evaluate(save=>localStorage.setItem('lanternlocks.fixed1.commission',save),fixture);await page.reload();await page.locator('[data-action="resume:commission"]').click()
  console.log('COMMAND RESTORED');const command=page.locator('#surge-command');await command.click();console.log('COMMAND CLICKED');await page.waitForFunction(()=>document.querySelector('#surge-command')?.dataset.phase==='held')
  const box=await command.boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=width,'command stays reachable and thumb-sized')
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'high-glow HUD must fit the narrow screen')
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/banked-${width}.png`})
  await page.locator('[data-action="menu"]').click();await page.locator('[data-action="surge-help"]').click();assert.match(await page.locator('.surge-help').innerText(),/stops firing/);await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.locator('[data-action="menu"]').click();await leaveWatch(page,width);await page.locator('[data-action="resume:commission"]').click()
  assert.equal(await command.getAttribute('data-phase'),'held','held command survives save and return');await command.click();await page.waitForFunction(()=>document.querySelector('#surge-command')?.dataset.phase==='spent');assert(await command.isDisabled())
  console.log(`COMMAND ${width}: bank, help, save/return, release`)
  await page.locator('[data-action="menu"]').click();await leaveWatch(page,width)
  await page.evaluate(async snap=>{const {encodeRun}=await import('/src/game/save-store.ts');localStorage.setItem('lanternlocks.fixed1.commission',encodeRun(snap,[]));if(innerWidth===320){const p=JSON.parse(localStorage.getItem('lanternlocks.fixed1.profile'));p.settings.largeText=true;p.settings.reducedMotion=true;localStorage.setItem('lanternlocks.fixed1.profile',JSON.stringify(p))}},planning)
  await page.reload();await page.locator('[data-action="resume:commission"]').click();await page.locator('[data-action="contract-status"]').focus();await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-action')),'contract-status','contract updates preserve keyboard focus');await page.keyboard.press('Enter');assert.match(await page.locator('#contract-progress').innerText(),/2\/3 clean holds/)
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/lower-bend-${width}.png`});await page.getByRole('button',{name:'Close',exact:true}).click()
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'contract UI overflow')
  const preVictory=await page.evaluate(async snap=>{const {Sim,DT}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts');const s=Sim.restore(snap);s.startWave();let previous;for(let i=0;i<36000&&!s.over;i++){previous=s.snapshot();s.step(DT);s.events=[]}if(!s.won||!previous||!validSnapshot(previous))throw Error('Paid finale fixture invalid');return encodeRun(previous,[])},planning)
  await page.locator('[data-action="menu"]').click();await leaveWatch(page,width)
  await page.evaluate(save=>localStorage.setItem('lanternlocks.fixed1.commission',save),preVictory);await page.reload();await page.locator('[data-action="resume:commission"]').click()
  await page.locator('[data-action="celebration-done"]').click();await page.locator('.contract-report.earned').waitFor();assert.match(await page.locator('.contract-report').innerText(),/Moon-glass lantern charms earned/)
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/reward-${width}.png`})
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('lanternlocks.fixed1.profile')).contractRecords['last-lantern:sol']);assert.equal(record.light,25)
  await page.locator('[data-action="rematch"]').click();const rematch=await page.evaluate(async()=>{const {decodeRun}=await import('/src/game/save-store.ts');return decodeRun(localStorage.getItem('lanternlocks.fixed1.commission')).snapshot});assert.equal(rematch.challenge.contract,'last-lantern');assert.equal(rematch.mastery.lowerWaves,0)
  assert.equal(errors.length,0,errors.join('\n'));rows.push({width,height,commandSaveResume:true,paidContractReward:true,rematchPreservesContract:true,largeText:width===320,errors});console.log(`PASS ${width}x${height}: command, contract selection/marker/progress/reward/record/rematch`)
  await ctx.close()
 }
 writeFileSync(`${out}/browser-report.json`,JSON.stringify(rows,null,2))
}finally{await browser.close()}
