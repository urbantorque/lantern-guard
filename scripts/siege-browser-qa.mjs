import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/siege';mkdirSync(out,{recursive:true})
const fixture=name=>JSON.parse(readFileSync(`${out}/${name}.json`,'utf8'))
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const reports=[],url=process.env.QA_URL||'http://127.0.0.1:5176/?muted=1'
try{for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]]){
 if(process.env.QA_WIDTH&&width!==Number(process.env.QA_WIDTH))continue
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'}),page=await ctx.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
 const shot=async name=>{await page.screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),name+' horizontal overflow')}
 const leave=async()=>{await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()}
 const inject=async(name,extra={})=>{
  await page.evaluate(async({snap,extra})=>{
   const {Sim}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts'),{saveActCheckpoint}=await import('/src/game/siege-store.ts')
   const s=Sim.restore(snap);if(extra.checkpoint)saveActCheckpoint(s,[2,4]);if(extra.lost){s.startWave();s.over='lost';s.lives=0}
   if(!validSnapshot(s.snapshot()))throw Error('Invalid injected fixture')
   localStorage.setItem('lanternlocks.fixed1.siege',encodeRun(s.snapshot(),[]))
   if(s.won){const {loadVillage,recordWatch}=await import('/src/game/fixed-store.ts');recordWatch(loadVillage(),s)}
  },{snap:fixture(name),extra});await page.reload({waitUntil:'networkidle'});await page.locator('[data-action="resume:siege"]').click()
 }
 await page.goto(url,{waitUntil:'networkidle'});await shot('title')
 await page.locator('[data-action="campaign"]').click();assert.equal(await page.locator('.siege-timeline li').count(),5);await shot('campaign')
 await page.locator('[data-action="siege-hero:mira"]').click();await page.locator('[data-action="siege-begin"]').click()
 assert((await page.locator('#wave').innerText()).includes('40'));assert((await page.locator('#prepare-watch').innerText()).includes('First Lights'))
 await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:wick"]').click();await page.locator('[data-action="place:0:wick"]').click();await page.locator('[data-action="begin-next"]').click();await shot('first-wave');await leave()
 assert((await page.locator('[data-action="resume:siege"]').innerText()).includes('Wave 1/40'));await page.locator('[data-action="resume:siege"]').click();assert.equal(await page.locator('.plot-number').count(),1);await leave()
 // Independent slots stay discoverable alongside a live siege.
 await page.evaluate(async()=>{const {Sim}=await import('/src/game/sim.ts'),{storyChallenge}=await import('/src/game/story.ts'),{encodeRun}=await import('/src/game/save-store.ts');for(const slot of ['campaign','commission'])localStorage.setItem('lanternlocks.fixed1.'+slot,encodeRun(new Sim('standard',storyChallenge('first-lights')).snapshot(),[]))})
 await page.reload();await shot('resume-and-legacy');assert(await page.locator('[data-action="resume:campaign"]').isVisible());assert(await page.locator('[data-action="resume:commission"]').isVisible())
 await inject('boundary-8',{checkpoint:true});assert((await page.locator('#prepare-watch').innerText()).includes('The Iron Procession'));assert.equal(await page.locator('.plot-number').count(),fixture('boundary-8').towers.length);assert.equal(await page.locator('.result').count(),0);await shot('act-transition');await leave()
 await inject('boundary-16',{checkpoint:true});await page.locator('[data-action="passages"]').click();await shot('passage');await page.locator('[data-action="passage:convoy"]').click();assert(await page.locator('[data-action="plot:12"]').isVisible());assert((await page.locator('#prepare-watch').innerText()).includes('Moon Gates'));await shot('moon-gates');await leave()
 // A real pre-act snapshot is rewound after a synthetic loss. Balance uses paid full runs.
 await inject('boundary-24',{checkpoint:true,lost:true});await page.locator('[data-action="retry-act"]').waitFor();assert((await page.locator('[data-action="retry-act"]').innerText()).includes('wave 25'));await shot('defeat');await page.locator('[data-action="retry-act"]').click()
 assert.equal(Number(await page.locator('#light').innerText()),fixture('boundary-24').lives);assert.equal(Number(await page.locator('#glow').innerText()),Math.floor(fixture('boundary-24').glow));assert.equal(await page.locator('.plot-number').count(),fixture('boundary-24').towers.length);await shot('act-retry');await leave()
 await inject('active-40');await shot('last-bloom');await leave()
 // The paid final state supplies the result and in-run restoration checks.
 await inject('final');await page.locator('.siege-result').waitFor();assert((await page.locator('#dialog-title').innerText()).includes('dawn'));assert.equal(await page.locator('.celebration').count(),0);await shot('victory');await page.locator('[data-action="home"]').click();await page.locator('[data-action="district"]').click();assert.equal(await page.locator('.project-stages li.complete').count(),9);await shot('restored-district');await page.locator('button[data-action="close"]').click()
 await page.locator('[data-action="campaign"]').click();await page.locator('[data-action="short-practice"]').click();await page.locator('[data-action="mission:last-bloom"]').click();await page.locator('[data-action="story-begin:last-bloom"]').click();await leave()
 const preserved=await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('lanternlocks.fixed1.siege')).payload).snapshot.won);assert(preserved,'Practice must preserve the campaign save')
 if(width===320){await page.locator('[data-action="settings"]').click();await page.locator('[data-action="setting:largeText"]').click();await page.locator('button[data-action="close"]').click();await page.locator('[data-action="campaign"]').click();await shot('large-text')}
 assert.deepEqual(errors,[]);reports.push({width,height,opening:true,saveResume:true,earlierSlots:true,actContinuity:true,passage:true,checkpointRetry:true,finalCombat:true,restoration:true,isolatedPractice:true,errors});console.log(`PASS continuous campaign ${width}x${height}`);await ctx.close()
}writeFileSync(`${out}/browser-report.json`,JSON.stringify(reports,null,2))}finally{await browser.close()}
