import {createRequire} from 'node:module'
import {createServer} from 'node:http'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import assert from 'node:assert/strict'
import {encodeRun} from '../src/game/save-store.ts'
import {Sim} from '../src/game/sim.ts'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/crazygames',root=resolve('dist-crazygames'),prefix='/games/nightward/'
mkdirSync(out,{recursive:true})
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}
const server=createServer((req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.startsWith(prefix))throw Error('Outside bundle');const file=resolve(root,path.slice(prefix.length)||'index.html');if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\'))throw Error('Outside bundle');res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(readFileSync(file))}catch{res.statusCode=404;res.end()}})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}${prefix}?muted=1`
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const reports=[],sizes=[[907,510],[821,462],[1216,684],[1077,606],[1366,768],[1920,1080],[1536,864],[1280,720],[800,450],[1080,607],[390,844],[320,740]]
const key='lanternlocks.fixed1.siege'
try{
 for(const [width,height] of sizes){
  if(process.argv.includes('--smoke')&&width!==907)continue
  if(process.env.QA_WIDTH&&width!==Number(process.env.QA_WIDTH))continue
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<900,reducedMotion:width===320?'reduce':'no-preference'}),page=await ctx.newPage(),errors=[],bad=[],external=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});page.on('request',r=>{if(!r.url().startsWith(`http://127.0.0.1:`)&&!r.url().startsWith('data:'))external.push(r.url())})
  page.setDefaultTimeout(12000)
  const visible=async selector=>{try{await page.locator(selector).waitFor({state:'visible'})}catch(e){await page.screenshot({path:`${out}/failed-${width}.png`});throw e}const b=await page.locator(selector).boundingBox();assert(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${width} ${selector} fits`)}
  const saved=()=>page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key)).payload).snapshot,key)
  const shot=async name=>{await page.screenshot({path:`${out}/${name}-${width}.png`});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'No horizontal overflow')}
  const start=Date.now();await page.goto(url,{waitUntil:'networkidle'});await page.locator('[data-action="portal-build"]').waitFor()
  await page.waitForFunction(()=>{const c=document.querySelector('canvas'),p=c?.getContext('2d')?.getImageData(c.width/2,c.height/2,1,1).data;return p&&p[3]>0&&p[0]+p[1]+p[2]>20});const readyMs=Date.now()-start
  assert.equal(await page.locator('.home').count(),0);assert.equal(await page.locator('.drawer').count(),0)
  assert.equal((await saved()).challenge.hero,'sol');assert.equal((await saved()).difficulty,'standard');assert.equal((await saved()).challenge.skirmish.to,40)
  if(width===320){await page.locator('[data-action="menu"]').click();await page.locator('[data-action="settings"]').click();await page.locator('[data-action="setting:largeText"]').click();await page.locator('button[data-action="close"]').click()}
  await visible('[data-action="portal-build"]');await visible('[data-action="plot:0"]');await shot('opening')
  await page.locator('[data-action="plot:0"]').click();await visible('[data-action="place:0:wick"]');await shot('placement')
  await page.locator('.placement-actions [data-action="close"]').click();assert.equal((await saved()).glow,330);assert.equal((await saved()).towers.length,0);await page.locator('[data-action="portal-build"]').click()
  await page.locator('[data-action="place:0:wick"]').click();await visible('[data-action="begin-next"]');assert.equal((await saved()).towers.length,1)
  await page.locator('[data-action="begin-next"]').click();await page.waitForTimeout(650);await shot('first-wave')
  await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click();const before=await saved()
  await page.reload({waitUntil:'networkidle'});await visible('[data-action="portal-continue"]');assert.equal(await page.locator('#pause-toggle').getAttribute('aria-pressed'),'true')
  assert.deepEqual(await saved(),before);await shot('resume')
  if(width===907){await page.waitForTimeout(5500);assert.deepEqual(await saved(),before,'Returning campaign remains frozen');await page.locator('[data-action="portal-continue"]').click();await page.waitForTimeout(5500);assert((await saved()).time>before.time,'Continue advances combat')}
  await page.locator('[data-action="plot:0"]').click();await visible('.quick-branches article:first-child .live-purchase');await visible('.quick-branches article:last-child .live-purchase');await shot('upgrades')
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(external,[])
  reports.push({width,height,readyMs,firstPlacement:true,fortyWaves:true,resumeExact:true,upgradesVisible:true,largeText:width===320,errors,bad,external});console.log(`PASS portal ${width}x${height}`);await ctx.close()
 }
 const ctx=await browser.newContext({viewport:{width:907,height:510}}),page=await ctx.newPage()
 const fixture=n=>JSON.parse(readFileSync(`qa/fixtures/crazygames/${n}.json`,'utf8'))
 const leave=async()=>{if(!await page.locator('.game').count())return;if(await page.locator('[data-action="home"]').isVisible()){await page.locator('[data-action="home"]').click();return}if(await page.locator('.drawer').count())await page.locator('button[data-action="close"]').click();await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click()}
 const inject=async snap=>{await leave();await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key,value:encodeRun(snap,[])});await page.reload({waitUntil:'networkidle'})}
 await page.goto(url);const boundary=fixture('boundary-8');await inject(boundary)
 await page.locator('[data-action="portal-continue"]').click();assert((await page.locator('#prepare-watch').innerText()).includes('The Iron Procession'))
 await page.locator('[data-action="begin-next"]').click();await page.locator('[data-action="menu"]').click();await page.locator('[data-action="home"]').click();const next=await savedIn(page)
 const investment=s=>s.towers.map(({uid,id,pad,a,b,refinement,spent})=>({uid,id,pad,a,b,refinement,spent}))
 assert.equal(next.wave,9);assert.equal(next.challenge.skirmish.to,40);assert.deepEqual(investment(next),investment(boundary));assert.equal(next.glow,boundary.glow);assert.equal(next.lives,boundary.lives)
 await inject(fixture('active-17'));await page.locator('[data-action="portal-continue"]').click();await page.locator('[data-action="pause"]').click();await page.locator('[data-action="forecast"]').click();assert.equal(await page.locator('#dialog-title').innerText(),'Wave 17 forecast');await page.screenshot({path:`${out}/late-forecast.png`})
 const checkpoint=fixture('boundary-24'),lost=Sim.restore(checkpoint);lost.startWave();lost.over='lost';lost.lives=0
 await leave();await page.evaluate(value=>localStorage.setItem('lanternlocks.fixed1.siege.checkpoints',value),JSON.stringify({v:1,entries:[encodeRun(checkpoint,[])]}));await inject(lost.snapshot())
 await page.locator('[data-action="retry-act"]').click();assert.equal((await savedIn(page)).lives,checkpoint.lives);assert.equal((await savedIn(page)).glow,checkpoint.glow);assert.deepEqual(investment(await savedIn(page)),investment(checkpoint))
 await inject(fixture('final'));await page.locator('.siege-result').waitFor();assert.equal((await savedIn(page)).won,true,'Completed campaign is not replaced')
 await leave();await page.evaluate(key=>{localStorage.setItem(key,'damaged');localStorage.removeItem(key+'.backup')},key);await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.home').count(),1);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'damaged')
 await ctx.close()
 writeFileSync(`${out}/browser-report.json`,JSON.stringify({edition:'production Basic Launch, served under a nested path',viewports:reports,continuity8to9:true,freeActRetry:true,lateForecast:true,completedSavePreserved:true,damagedSavePreserved:true,physicalDeviceTested:false,humanPlaytest:false},null,2)+'\n')
 console.log('PASS act continuity, free retry, late forecast, completed save and damaged save preservation')
}finally{await browser.close();await new Promise(r=>server.close(r))}
async function savedIn(page){return page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key)).payload).snapshot,key)}
