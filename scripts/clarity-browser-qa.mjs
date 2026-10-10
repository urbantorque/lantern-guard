import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/craft';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const reports=[]
try{for(const [width,height]of [[390,844],[320,740],[1280,800],[844,390]]){
 if(process.env.QA_WIDTH&&width!==Number(process.env.QA_WIDTH))continue
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'}),page=await ctx.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
 const shot=async name=>{await page.waitForTimeout(250);await page.screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),name+' horizontal overflow')}
 const visible=async selector=>{const b=await page.locator(selector).boundingBox();assert(b&&b.y>=0&&b.y+b.height<=height&&b.x>=0&&b.x+b.width<=width,selector+' fits viewport')}
 const savedTime=()=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('lanternlocks.fixed1.siege')).payload).snapshot.time)
  await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle'})
  if(width===320){await page.evaluate(async()=>{const {loadVillage,writeJSON}=await import('/src/game/fixed-store.ts');const p=loadVillage();p.settings.largeText=true;writeJSON('profile',p)});await page.reload({waitUntil:'networkidle'})}
 await shot('title');await page.locator('[data-action="campaign"]').click();await shot('campaign');await visible('[data-action="siege-begin"]')
 await page.locator('[data-action="siege-begin"]').click();await shot('preparation')
 const prep=await page.locator('#prepare-watch').boundingBox(),board=await page.locator('#battlefield').boundingBox();assert(prep.y>=board.y+board.height-1,'Preparation does not cover canal')
 await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:wick"]').click();await shot('placement');await visible('[data-action="place:0:wick"]')
 assert(!await page.locator('.placement').innerText().then(t=>t.includes('Stable day / night')))
  await page.locator('[data-action="place:0:wick"]').click();await page.locator('[data-action="plot:0"]').click();await shot('upgrades');await visible('.quick-branches article:first-child .live-purchase');await visible('.quick-branches article:last-child .live-purchase');await page.locator('button[data-action="close"]').click();await page.locator('[data-action="begin-next"]').click()
 if(width===390){
  await page.locator('[data-action="menu"]').click();await page.waitForTimeout(5600);const t=await savedTime();await page.waitForTimeout(5600);assert.equal(await savedTime(),t,'Menu pauses simulation');await shot('paused-menu')
  await page.locator('button[data-action="close"]').click();await page.waitForTimeout(5600);assert((await savedTime())>t,'Closing reference resumes combat')
  await page.locator('[data-action="pause"]').click();await page.waitForTimeout(5600);const p=await savedTime();await page.locator('[data-action="plot:0"]').click();await page.waitForTimeout(5600);assert.equal(await savedTime(),p,'Manual pause survives tower inspection');await page.locator('button[data-action="close"]').click();assert.equal(await page.locator('#pause-toggle').getAttribute('aria-pressed'),'true');await page.keyboard.press('p');assert.equal(await page.locator('#pause-toggle').getAttribute('aria-pressed'),'false')
 }
 await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()
 await page.evaluate(async snap=>{const {encodeRun}=await import('/src/game/save-store.ts');localStorage.setItem('lanternlocks.fixed1.siege',encodeRun(snap,[]))},JSON.parse(readFileSync('artifacts/siege/active-17.json','utf8')))
 await page.reload({waitUntil:'networkidle'});await page.locator('[data-action="resume:siege"]').click();assert((await page.locator('#wave').innerText()).includes('17'))
 await page.locator('[data-action="forecast"]').click();assert.equal(await page.locator('#dialog-title').innerText(),'Wave 18 forecast');await shot('forecast-next');await page.locator('[data-action="forecast:current"]').click();assert.equal(await page.locator('#dialog-title').innerText(),'Wave 17 forecast');await shot('forecast-current')
 await page.locator('button[data-action="close"]').click();await shot('combat');assert.deepEqual(errors,[])
  reports.push({width,height,largeText:width===320,placementActionVisible:true,upgradeChoicesVisible:true,preparationOutsideBoard:true,forecastLabels:true,pause:width===390?'verified':'shared logic',errors});console.log('PASS clarity '+width+'x'+height);await ctx.close()
}writeFileSync(`${out}/clarity-browser.json`,JSON.stringify(reports,null,2))}finally{await browser.close()}
