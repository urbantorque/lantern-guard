import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'

const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base=process.env.QA_BASE_URL||'https://urbantorque.github.io/lantern-guard/'
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
mkdirSync('dist-artifact',{recursive:true})
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  const response=await page.request.get(new URL('build-info.json',base).href+'?verify='+Date.now())
  assert(response.ok());const build=await response.json()
  if(process.env.EXPECTED_COMMIT)assert.equal(build.sourceCommit,process.env.EXPECTED_COMMIT)
  await page.goto(base+'?muted=1')
  await page.getByRole('button',{name:'Expeditions',exact:true}).click()
  await page.locator('[data-action^="weekly:"]').first().click()
  await page.getByRole('button',{name:'Begin weekly watch',exact:true}).click()
  await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action="build:0:wick"]').click()
  await page.locator('[data-action="plot:0"]').click();await page.locator('[data-action^="specialise:"]').first().click()
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.waitForFunction(()=>{const saved=localStorage.getItem('lanternlocks.fixed1.commission');return saved&&JSON.parse(JSON.parse(saved).payload).snapshot.time>0},undefined,{timeout:15000})
  const snapshot=await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('lanternlocks.fixed1.commission')).payload).snapshot)
  assert.equal(snapshot.challenge.livingWatch,1);assert.equal(typeof snapshot.challenge.weekly,'number')
  assert(snapshot.towers.some(t=>t.id==='wick'&&t.a===2));assert(snapshot.time>0,'combat continues after upgrading')
  await page.reload();await page.locator('[data-action="resume:commission"]').click()
  await page.locator('[data-action="plot:0"]').click();await page.locator('.specialised-upgrade').waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.equal(errors.length,0,errors.join('\n'))
  await page.screenshot({path:'dist-artifact/living-production-phone.png',animations:'disabled'})
  const result={base,sourceCommit:build.sourceCommit,viewport:'390 × 844',weekly:snapshot.challenge.weekly,specialisationSaved:true,combatContinues:true,resumePassed:true,errors}
  writeFileSync('dist-artifact/living-production-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{await browser.close()}
