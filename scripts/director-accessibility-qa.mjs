import {createRequire} from 'node:module'
import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const out='artifacts/director-qa',rows=[]
try{
 for(const [width,height] of [[320,740],[844,390]]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle'})
  await page.locator('[data-action="settings"]').click();await page.locator('[data-action="setting:largeText"]').click();assert.equal(await page.locator('[data-action="setting:largeText"]').getAttribute('aria-checked'),'true');await page.keyboard.press('Escape')
  const fixture=JSON.parse(readFileSync(`${out}/moonwake-11.json`,'utf8'))
  await page.evaluate(async snap=>{const {encodeRun}=await import('/src/game/save-store.ts'),{Sim}=await import('/src/game/sim.ts');localStorage.setItem('lanternlocks.fixed1.commission',encodeRun(snap,[]));const s=new Sim('standard',{...snap.challenge,expedition:undefined,id:undefined,skirmish:undefined,variant:0},1047);localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(s.snapshot(),[]))},fixture)
  await page.reload();assert.equal(await page.locator('.title-art').evaluate(e=>getComputedStyle(e).animationName),'none')
  for(const action of ['resume:campaign','resume:commission','expeditions','choose','district','bestiary','settings']){const el=page.locator(`[data-action="${action}"]`),box=await el.boundingBox();assert(box&&box.y>=0&&box.y+box.height<=height+.5,`${action} outside ${width}x${height}: ${JSON.stringify(box)}`);assert(box.height>=44,'touch target height');await el.focus();assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),action)}
  await page.screenshot({path:`${out}/accessible-saved-title-${width}.png`,animations:'disabled'})
  await page.locator('[data-action="choose"]').click();await page.locator('[data-action="watch-length:endurance"]').click();assert.equal(await page.locator('[data-action="watch-length:endurance"]').getAttribute('aria-pressed'),'true');await page.locator('[data-action="new"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/accessible-setup-${width}.png`,animations:'disabled'});await page.keyboard.press('Escape')
  await page.locator('[data-action="expeditions"]').click();await page.locator('[data-action="expedition-select:moonwake"]').click();await page.locator('[data-action="expedition:moonwake"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/accessible-expedition-${width}.png`,animations:'disabled'});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.keyboard.press('Escape')
  await page.locator('[data-action="resume:commission"]').click();await page.screenshot({path:`${out}/moon-gates-${width}.png`,animations:'disabled'})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);assert.deepEqual(errors,[]);rows.push({width,height,largeText:true,reducedMotion:true,twoSavedRuns:true,keyboardFocus:true,moonGates:true,errors});await ctx.close()
 }
 writeFileSync(`${out}/accessibility-report.json`,JSON.stringify(rows,null,2));console.log('PASS large text, reduced motion, keyboard focus, both saved slots and moon gates at 320x740 and 844x390')
}finally{await browser.close()}
