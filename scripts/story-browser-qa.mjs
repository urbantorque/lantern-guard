import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/story';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']});const reports=[]
try{for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]]){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
 const shot=async name=>{await page.screenshot({path:`${out}/${name}-${width}.png`,animations:'disabled'});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),name+' horizontal overflow')}
 const leave=async()=>{await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()}
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle'});await shot('title')
 await page.locator('[data-action="settings"]').click();await page.locator('[data-action="playtest-toggle"]').click();assert((await page.locator('[data-action="playtest-toggle"]').innerText()).includes('On'));await page.locator('button[data-action="close"]').click()
 await page.locator('[data-action="story-begin:first-lights"]').click();assert.equal(await page.locator('#technique-offer').isVisible(),false)
 await page.locator('[data-action="plot:0"]').click();assert.equal(await page.locator('.build-card').count(),1);await page.locator('[data-action="build:0:wick"]').click();await page.locator('[data-action="place:0:wick"]').click();await page.locator('[data-action="begin-next"]').click();await shot('first-defence');await leave()
 await page.locator('[data-action="resume:campaign"]').click();assert((await page.locator('#wave').innerText()).includes('1'));await leave()
 await page.locator('[data-action="campaign"]').first().click();await shot('campaign');await page.locator('button[data-action="close"]').click()
 await page.evaluate(async snap=>{
  const {Sim}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts');const s=Sim.restore(snap);s.over=null;s.won=false;s.wave=5;s.startWave();s.spawners=[];const t=s.towers[0],points=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.ceil(seg.line.length/10)},(_,i)=>({seg,at:i*10,p:seg.line.at(i*10,{x:0,y:0,tx:0,ty:0})}))).sort((a,b)=>Math.hypot(a.p.x-t.x,a.p.y-t.y)-Math.hypot(b.p.x-t.x,b.p.y-t.y)),p=points[0],e=s.spawnEnemy('drip',p.seg,p.at,6);e.hp=1;e.stunT=10;t.cd=0;const save=s.snapshot();if(!validSnapshot(save))throw Error('Invalid reward fixture');localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(save,[]))
 },JSON.parse(readFileSync(`${out}/first-lights-won.json`,'utf8')))
 await page.reload();await page.locator('[data-action="resume:campaign"]').click();await page.locator('[data-action="celebration-done"]').waitFor({timeout:20000});await page.locator('[data-action="celebration-done"]').click();assert((await page.locator('.story-reward').innerText()).includes('Night Market'));await shot('reward')
 await page.locator('[data-action="home"]').click();await page.locator('[data-action="settings"]').click();const download=page.waitForEvent('download');await page.locator('[data-action="playtest-export"]').click();const file=await download;await file.saveAs(`${out}/playtest-${width}.json`);const log=JSON.parse(readFileSync(`${out}/playtest-${width}.json`));assert(log.sessions.some(s=>s.events.some(e=>e.event==='build')));assert.deepEqual(errors,[])
 reports.push({width,height,firstPurchase:true,guidance:true,saveResume:true,campaign:true,reward:true,localExport:true,errors});console.log(`PASS story ${width}x${height}`);await ctx.close()
}writeFileSync(`${out}/browser-report.json`,JSON.stringify(reports,null,2))}finally{await browser.close()}
