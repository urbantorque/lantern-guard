import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const results=[];mkdirSync('artifacts/refinement-qa',{recursive:true})
try{
 for(const [width,height]of [[1280,800],[390,844],[320,740],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500})
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/?muted=1&qa=1');await page.locator('[data-action="choose"]').click()
  await page.locator('[data-action="new"]').click();await page.locator('[data-action="plot:0"]').click()
  await page.locator('[data-action="build:0:wick"]').click();await page.locator('[data-action="plot:0"]').click()
  await page.screenshot({path:`artifacts/refinement-qa/upgrade-${width}.png`,animations:'disabled'})
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.quick-branches .live-purchase')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,visible:r.y>=0&&r.bottom<=innerHeight}}),canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}))
  console.log(JSON.stringify({width,height,layout}));assert(!layout.overflow,'horizontal overflow');assert.equal(layout.buttons.length,2);assert(layout.buttons.every(b=>b.h>=43.9&&b.visible),'upgrade buttons must fit and remain thumb sized')
  await page.locator('[data-action^="specialise:"]').first().click();await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.waitForTimeout(6500);await page.screenshot({path:`artifacts/refinement-qa/combat-${width}.png`})
  assert.equal(errors.length,0,errors.join('\n'))
  results.push({width,height,...layout,errors});await context.close()
 }
 writeFileSync('artifacts/refinement-qa/browser-results.json',JSON.stringify(results,null,2))
 writeFileSync('artifacts/refinement-qa/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
