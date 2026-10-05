import {createRequire} from 'node:module'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/story-release';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const reports=[]
try{for(const [width,height] of [[1280,800],[390,844],[320,740],[844,390]].filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle'})
 const capture=async name=>{await page.screenshot({path:`${out}/${name}-${width}.png`});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(el=>({tag:el.tagName,id:el.id,cls:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right}))));assert(!overflow,name+' overflow')}
 const leave=async()=>{await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()}
 await page.evaluate(async()=>{const {loadVillage}=await import('/src/game/fixed-store.ts'),{MISSIONS}=await import('/src/game/story.ts');const p=loadVillage();for(const m of MISSIONS)p.records[`story1:${m.id}:standard:mira:standard`]={wave:m.waves.length,won:true,light:20,practice:false};p.settings.reducedMotion=true;p.settings.largeText=true;localStorage.setItem('lanternlocks.fixed1.profile',JSON.stringify(p))})
 await page.reload();await page.locator('[data-action="campaign"]').first().click();assert.equal(await page.locator('.campaign-route button').count(),8)
 await page.locator('[data-action="mission:last-bloom"]').click();assert((await page.locator('.campaign-copy').innerText()).includes('Matriarch'));await capture('campaign-large-text');await page.locator('button[data-action="close"]').click()
 await page.locator('[data-action="district"]').click();assert.equal(await page.locator('.project-stages .complete').count(),9);await capture('restored-district');await page.locator('button[data-action="close"]').click()
 await page.evaluate(async snap=>{
  const {Sim}=await import('/src/game/sim.ts'),{encodeRun,validSnapshot}=await import('/src/game/save-store.ts');const s=Sim.restore(snap);s.startWave();s.spawners=[];s.enemies=[]
  const t=s.towers.find(t=>t.id==='storm');if(!t)throw Error('No Storm in paid target fixture');s.director.command=null;s.designateCommand(t)
  const spots=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.ceil(seg.line.length/10)},(_,i)=>({seg,at:i*10,p:seg.line.at(i*10,{x:0,y:0,tx:0,ty:0})}))).filter(p=>Math.hypot(p.p.x-t.x,p.p.y-t.y)<s.effRange(t)-20)
  for(const p of [spots[Math.floor(spots.length/3)],spots[Math.floor(spots.length*2/3)]]){const e=s.spawnEnemy('shell',p.seg,p.at,s.wave);e.hp=e.maxHp=10000;e.stunT=90}
  if(!s.bankCommand())throw Error('Cannot bank fixture command');s.director.command.phase='held'
  const save=s.snapshot();if(!validSnapshot(save))throw Error('Invalid target fixture');localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(save,[]))
 },JSON.parse(readFileSync('artifacts/story/copper-procession-3.json','utf8')))
 await page.reload();await page.locator('[data-action="resume:campaign"]').click();await page.locator('#command-aim').click();assert.equal(await page.locator('#aim-help').isVisible(),true);assert.equal(await page.locator('#plots').getAttribute('inert'),'')
 await capture('direct-target');const target=page.locator('.aim-enemy').last();assert((await target.boundingBox()).width>=44);await target.click();assert.equal(await page.locator('#aim-help').isVisible(),false);assert((await page.locator('#command-readout').innerText()).includes('paused'))
 await page.locator('#command-aim').click();await page.locator('[data-action="command-list"]').click();await page.locator('.command-target-list button').first().click();await page.locator('#surge-command').click();assert((await page.locator('#surge-command').innerText()).includes('used'));await capture('released-command');await leave()
 await page.evaluate(async snap=>{const {encodeRun}=await import('/src/game/save-store.ts');localStorage.setItem('lanternlocks.fixed1.campaign',encodeRun(snap,[]))},JSON.parse(readFileSync('artifacts/story/last-bloom-11.json','utf8')))
 await page.reload();await page.locator('[data-action="resume:campaign"]').click();await page.locator('[data-action="begin-next"]').click();await page.waitForTimeout(4500);await capture('final-combat')
 const timing=await page.evaluate(()=>new Promise(resolve=>{const gaps=[];let last=performance.now();const tick=now=>{gaps.push(now-last);last=now;if(gaps.length<90)requestAnimationFrame(tick);else{gaps.sort((a,b)=>a-b);resolve({median:gaps[45],p95:gaps[85],samples:gaps.length})}};requestAnimationFrame(tick)}))
 assert.deepEqual(errors,[]);assert.equal(await page.locator('#save-warning').innerText(),'');reports.push({width,height,largeText:true,reducedMotion:true,districtStages:9,directTarget:true,listFallback:true,release:true,frameIntervals:timing,errors});console.log('PASS release '+width+'x'+height,JSON.stringify(timing));await ctx.close()
}
writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2))
}finally{await browser.close()}
