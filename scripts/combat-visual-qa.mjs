import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/visual-overhaul/combat';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const results=[]
try{
 for(const [width,height]of [[1440,900],[390,844]])for(const reduced of [false,true])for(const night of [false,true]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5174/?muted=1');await page.locator('[data-action="choose"]').waitFor()
  const snapshot=existsSync('artifacts/experience-qa/wave-39.json')?JSON.parse(readFileSync('artifacts/experience-qa/wave-39.json','utf8')):null
  const fixture=await page.evaluate(async({snapshot,reduced,night})=>{
   const {Sim,DT}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts'),{loadVillage}=await import('/src/game/fixed-store.ts')
   const s=snapshot?Sim.restore(snapshot):new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,hero:'ivo',variant:0},1047)
   if(!snapshot){s.wave=39;s.glow=50000;for(let i=0;i<12;i++){s.unlockPlot(i);const t=s.build(i,['owl','storm','bell','wick','cracker','ballista'][i%6]);if(t){s.upgrade(t,0);s.upgrade(t,0)}}}
   s.climate.elapsed=Math.ceil(s.climate.elapsed/108)*108+(night?70:12);s.startWave();const eventCounts={};for(let i=0;i<900&&!s.over;i++){s.step(DT);for(const e of s.events)eventCounts[e.t]=(eventCounts[e.t]??0)+1;s.events=[]}
   const snap=s.snapshot();if(!validSnapshot(snap))throw Error('Invalid combat fixture');localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(snap,[]))
   const key='lanternlocks.fixed1.profile',profile=loadVillage();profile.settings.reducedMotion=reduced;profile.records={'0:standard':{wave:40,light:25,won:true,practice:false}};localStorage.setItem(key,JSON.stringify(profile))
   return {fixture:snapshot?'paid campaign save':'synthetic visual stress scene',enemies:s.enemies.filter(e=>e.alive).length,towers:s.towers.length,eventCounts}
  },{snapshot,reduced,night})
  await page.reload();await page.locator('[data-action="resume:campaign"]').click()
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('reduced-motion')),reduced)
  await page.waitForTimeout(1800);await page.screenshot({path:`${out}/${width}-${night?'night':'day'}-${reduced?'still':'motion'}.png`})
  const controls=await page.locator('.hud button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {action:button.dataset.action,top:r.top,bottom:r.bottom,height:r.height}}))
  assert(controls.every(r=>r.top>=0&&r.bottom<=height&&r.height>=44),'HUD controls clipped: '+JSON.stringify(controls))
  assert.deepEqual(errors,[]);assert.equal(await page.locator('#save-warning').innerText(),'');results.push({width,height,reduced,night,controls,...fixture});await ctx.close()
 }
 writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log('PASS late-wave desktop/phone combat, day/night, restored district, motion and reduced motion')
}finally{await browser.close()}
