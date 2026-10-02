import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const rows=[];mkdirSync('artifacts/refinement-qa',{recursive:true})
try{
 for(const [width,height]of [[320,740],[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5173/?muted=1&qa=1')
  const fixtures=await page.evaluate(async()=>{
   const {Sim}=await import('/src/game/sim.ts'),{encodeRun}=await import('/src/game/save-store.ts'),rows=[]
   for(const hero of ['sol','mira','ivo'])for(const round of [0,1]){
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,hero,variant:0},1047)
    s.wave=15;s.glow=5000;s.build(0,'wick');if(round)s.chooseTechnique(({sol:'dividend',mira:'stillwater',ivo:'circuit'})[hero])
    rows.push({hero,round,save:encodeRun(s.snapshot(),[])})
   }return rows
  })
  for(const f of fixtures){
   await page.evaluate(save=>localStorage.setItem('lanternlocks.fixed1.campaign',save),f.save)
   await page.reload();await page.locator('[data-action="resume:campaign"]').click();await page.locator('[data-action="techniques"]').click();await page.waitForTimeout(350)
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,choices:[...document.querySelectorAll('.technique-cards button')].map(b=>{const r=b.getBoundingClientRect(),body=b.closest('.drawer-body').getBoundingClientRect();return {h:r.height,visible:r.top>=body.top&&r.bottom<=Math.min(innerHeight,body.bottom)}})}))
   rows.push({width,height,hero:f.hero,round:f.round,...layout});assert(!layout.overflow);assert.equal(layout.choices.length,2);assert(layout.choices.every(b=>b.h>=43.9&&b.visible),JSON.stringify(rows.at(-1)))
   if(f.round===1&&f.hero==='sol')await page.screenshot({path:`artifacts/refinement-qa/techniques-${width}.png`})
  }
  assert.equal(errors.length,0,errors.join('\n'));await context.close()
 }
 writeFileSync('artifacts/refinement-qa/technique-results.json',JSON.stringify(rows,null,2));console.log(`PASS ${rows.length} hero/round/touch-viewport technique layouts`)
}finally{await browser.close()}
