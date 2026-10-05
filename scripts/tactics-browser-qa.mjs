import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/tactics-qa';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const rows=[]
try{
 for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]].filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  console.log(`START ${width}x${height}`);await page.goto('http://127.0.0.1:5174/?muted=1')
  const fixture=await page.evaluate(async()=>{
   const {Sim,DT}=await import('/src/game/sim.ts'),{validSnapshot,encodeRun}=await import('/src/game/save-store.ts')
   const rules={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,hero:'sol',variant:0}
   const s=new Sim('standard',rules,1047);s.lives=1;s.glow=1200
   const checkpoint=s.snapshot();s.startWave()
   for(let i=0;i<20000&&!s.over;i++){s.step(DT);s.events=[]}
   if(s.over!=='lost'||!s.lastLeak?.detail||!validSnapshot(s.snapshot())||!validSnapshot(checkpoint))throw Error('Failure/checkpoint fixture invalid')
   const crown=new Sim('standard',rules,2047);crown.wave=32;crown.glow=5000;crown.chooseTechnique('long-embers');const t=crown.build(0,'cracker');crown.specialise(t,1);crown.upgrade(t,1);crown.refine(t);crown.build(3,'bell');crown.syncBonds()
   return {failed:encodeRun(s.snapshot(),[]),checkpoint,crown:encodeRun(crown.snapshot(),[])}
  })
  await page.evaluate(f=>{localStorage.setItem('lanternlocks.fixed1.campaign',f.failed);localStorage.setItem('lanternlocks.fixed1.campaign.planning',JSON.stringify(f.checkpoint))},fixture)
  await page.reload();await page.locator('[data-action="resume:campaign"]').click()
  await page.locator('[data-action="practice-wave"]').waitFor()
  const storage=()=>page.evaluate(()=>Object.fromEntries(['campaign','campaign.backup','campaign.planning','profile'].map(k=>[k,localStorage.getItem('lanternlocks.fixed1.'+k)])))
  console.log(`FIXTURE ${width}`);const before=await storage()
  assert.match(await page.locator('.breach-advice').innerText(),/damage tower/)
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/breach-${width}.png`})
  await page.locator('[data-action="practice-wave"]').click()
  assert.match(await page.locator('#prepare-watch').innerText(),/Practice/)
  await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:cracker"]').click();await page.locator('[data-action="place:0:cracker"]').click()
  await page.locator('[data-action="plot:3"]').click();await page.locator('[data-action="build:3:wick"]').click();await page.locator('[data-action="place:3:wick"]').click()
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/practice-planning-${width}.png`})
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'planning overflow')
  console.log(`BUILT ${width}`);await page.locator('[data-action="begin-next"]').click()
  await page.locator('.practice-result').waitFor({timeout:60000})
  console.log(`HELD ${width}`);assert.match(await page.locator('#dialog-title').innerText(),/wave held/)
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/practice-held-${width}.png`})
  assert.deepEqual(await storage(),before,'practice must not write saves, checkpoint, backup or rewards')
  const wave=await page.locator('#wave').innerText();await page.waitForTimeout(4500);assert.equal(await page.locator('#wave').innerText(),wave,'a rehearsal must stop after one wave')
  console.log(`REPEAT ${width}`);await page.locator('[data-action="practice-repeat"]').click();assert.equal(await page.locator('#glow').innerText(),'1200','repeat resets original budget')
  await page.locator('[data-action="menu"]').click();await page.locator('[data-action="practice-return"]').click();await page.locator('[data-action="practice-wave"]').waitFor();assert.equal(await page.locator('#light').innerText(),'0')
  await page.locator('[data-action="practice-wave"]').click();await page.reload();assert(await page.locator('[data-action="resume:campaign"]').count(),'reload retains the original failed report')
  console.log(`CROWN ${width}`);await page.evaluate(save=>localStorage.setItem('lanternlocks.fixed1.campaign',save),fixture.crown);await page.reload();await page.locator('[data-action="resume:campaign"]').click()
  await page.locator('[data-action="plot:0"]').click();assert.match(await page.locator('.crown-technique').innerText(),/Ashfall/)
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/crown-bond-${width}.png`});await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.locator('[data-action="forecast"]').click();assert.match(await page.locator('.encounter-sequence').innerText(),/side inlet/)
  await page.waitForTimeout(300);await page.screenshot({animations:'disabled',path:`${out}/encounter-${width}.png`})
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'forecast overflow')
  assert.equal(errors.length,0,errors.join('\n'));rows.push({width,height,practiceHeld:true,storageUnchanged:true,oneWaveOnly:true,repeatAndReturn:true,reloadSafe:true,errors})
  console.log(`PASS ${width}×${height}: practice victory, isolated storage, stop/repeat/return/reload, crown and encounter UI`)
  await ctx.close()
 }
 writeFileSync(`${out}/browser-report.json`,JSON.stringify(rows,null,2))
}finally{await browser.close()}
