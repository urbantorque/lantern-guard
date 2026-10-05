import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/experience-qa';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const rows=[]
try{
 for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]].filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5174/?muted=1')
  const shot=async name=>{await page.waitForTimeout(250);await page.screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'})}
  const layout=async label=>{const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.live-purchase,[data-action^="place:"],.technique-cards button')].map(b=>{const r=b.getBoundingClientRect();return {h:r.height,visible:r.top>=0&&r.bottom<=innerHeight}})}));rows.push({width,height,label,...result});assert(!result.overflow,label+' overflow');assert(result.buttons.every(b=>b.h>=43.9&&b.visible),label+' purchases must fit')}
  await shot('home');await page.locator('[data-action="choose"]').click();await page.locator('[data-action="new"]').click()
  await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:wick"]').click();assert.equal(await page.locator('#glow').innerText(),'400')
  await shot('placement');await layout('placement');await page.locator('[data-action="place:0:wick"]').click();assert.equal(await page.locator('#glow').innerText(),'290')
  await page.locator('[data-action="plot:0"]').click();await shot('upgrade');await layout('upgrade');await page.locator('[data-action^="specialise:"]').first().click();await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.waitForTimeout(4600);assert.match(await page.locator('#wave').innerText(),/1/)
  const fixtures=await page.evaluate(async()=>{
   const {Sim}=await import('/src/game/sim.ts'),{encodeRun}=await import('/src/game/save-store.ts'),{validSnapshot}=await import('/src/game/save-store.ts')
   const rules={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,hero:'ivo',variant:0}
   const prep=new Sim('standard',rules,1047);prep.wave=3;prep.glow=2000;prep.build(0,'storm')
   const bond=new Sim('standard',rules,1047);bond.wave=20;bond.glow=10000;bond.unlockPlot(1);bond.build(0,'bell');bond.build(3,'cracker');bond.build(1,'beam');bond.build(6,'owl');bond.build(9,'wick');bond.syncBonds()
   const threat=Sim.restore(bond.snapshot());threat.startWave();const exit=[...threat.level.segs.values()].find(s=>'home' in s.next),e=threat.spawnEnemy('shell',exit,exit.line.length-15,21);e.hp=10000;e.stunT=20
   const budget=new Sim('standard',rules,1047);budget.wave=2;budget.glow=1
   const {DAY_SECONDS}=await import('/src/game/environment.ts'),dusk=new Sim('standard',rules,1047);dusk.wave=4;dusk.glow=2000;dusk.build(0,'wick');dusk.climate.elapsed=DAY_SECONDS-6;dusk.startWave()
   return [prep,bond,threat,budget,dusk].map(s=>{if(!validSnapshot(s.snapshot()))throw Error('Invalid browser fixture');return encodeRun(s.snapshot(),[])})
  })
  const restore=async save=>{await page.goto('http://127.0.0.1:5174/?muted=1');await page.evaluate(save=>localStorage.setItem('lanternlocks.fixed1.campaign',save),save);await page.reload();await page.locator('[data-action="resume:campaign"]').click()}
  await restore(fixtures[3]);await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:storm"]').click();assert(await page.locator('[data-action="place:0:storm"]').isDisabled());assert.equal(await page.locator('#glow').innerText(),'1')
  await restore(fixtures[4]);await page.locator('[data-action="plot:3"]').click();await page.locator('[data-action="build:3:storm"]').click();const dayReach=parseInt(await page.locator('#placement-reach').innerText());await page.waitForTimeout(5500);assert(parseInt(await page.locator('#placement-reach').innerText())<dayReach,'preview reach follows nightfall')
  await restore(fixtures[0]);await page.locator('[data-action="techniques"]').click();await shot('techniques');await layout('techniques')
  if(width<500){assert(await page.locator('#inspector-state').isVisible());assert.match(await page.locator('#inspector-state').innerText(),/take your time/)}
  const before=await page.locator('#sky').innerText();await page.waitForTimeout(4300);assert.equal(await page.locator('#sky').innerText(),before,'preparation freezes sky')
  await page.locator('[data-action="technique:forked-current"]').click();await shot('preparation');await page.locator('[data-action="begin-next"]').click();assert.match(await page.locator('#wave').innerText(),/4/)
  await restore(fixtures[1]);await page.locator('[data-action="plot:0"]').click();await page.locator('.bond-picker summary').click();await shot('bonds');const link=page.locator('[data-action^="link:"]').first(),partner=(await link.innerText()).replace('Link with ','');await link.click();assert((await page.locator('.bond-slot-list').innerText()).includes(partner));await shot('chosen-bond')
  await restore(fixtures[2]);await page.locator('[data-action="plot:0"]').click();await shot('lantern-alert');assert(await page.locator('#lantern-watch').isVisible())
  await page.reload();await page.locator('[data-action="expeditions"]').click();await shot('expeditions');await page.locator('.expedition-variations summary').click();assert.equal(await page.locator('[data-action^="commission:"]').count(),3)
  await page.locator('[data-action^="weekly:"]').first().click();await page.locator('[data-action^="weekly-start:"]').click();assert.match(await page.locator('#wave').innerText(),/Weekly/)
  await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:wick"]').click();await page.locator('[data-action="place:0:wick"]').click();await page.waitForTimeout(5100)
  assert.equal(await page.locator('#save-warning').innerText(),'');await page.reload();assert(await page.locator('[data-action="resume:commission"]').count())
  const victory=JSON.parse(readFileSync(`${out}/victory.json`,'utf8'))
  // Replay the paid reference defence's final encounter, then resume its last
  // second through the normal save path to exercise the real victory event.
  const finale=await page.evaluate(async snap=>{
   const {Sim,DT}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts')
   const s=Sim.restore({...snap,over:null,won:false,wave:11}),recent=[];s.startWave()
   for(let i=0;!s.over&&i<20000;i++){if(i%15===0){recent.push(s.snapshot());if(recent.length>4)recent.shift()}s.step(DT);s.events=[]}
   if(!s.won||!validSnapshot(recent[0]))throw Error('Finale fixture did not win or validate')
   return encodeRun(recent[0],[])
  },victory)
  await restore(finale);await page.locator('.celebration').waitFor({state:'visible',timeout:15000});await shot('victory');await page.locator('[data-action="celebration-done"]').click();await shot('watch-report');assert(await page.locator('.celebration').count()===0)
  assert.equal(errors.length,0,errors.join('\n'));console.log(`PASS ${width}×${height}: all gameplay flows and victory`);await ctx.close()
 }
 writeFileSync(`${out}/browser-results${process.env.QA_WIDTH?'-'+process.env.QA_WIDTH:''}.json`,JSON.stringify(rows,null,2));console.log('PASS placement, live night reach, purchases, safe preparation, techniques, Bond choice, lantern alert, consolidated modes and weekly persistence')
}finally{await browser.close()}
