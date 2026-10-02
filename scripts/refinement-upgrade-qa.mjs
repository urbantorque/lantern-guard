import {createRequire} from 'node:module'
import {writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
const rows=[]
try{
  for(const [width,height]of [[320,740],[844,390]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage()
    await page.goto('http://127.0.0.1:5173/?muted=1&qa=1')
    const fixtures=await page.evaluate(async()=>{
      const {Sim}=await import('/src/game/sim.ts'),{encodeRun}=await import('/src/game/save-store.ts'),{TOWER_ORDER}=await import('/src/game/defs.ts'),rows=[]
      for(const hero of ['sol','mira','ivo'])for(const id of TOWER_ORDER){
        const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,hero,variant:0},1047)
        s.wave=30;s.glow=5000;s.build(0,id);rows.push({hero,id,save:encodeRun(s.snapshot(),[])})
      }
      return rows
    })
    for(const f of fixtures){
      await page.evaluate(save=>localStorage.setItem('lanternlocks.fixed1.campaign',save),f.save)
      await page.reload();await page.locator('[data-action="resume:campaign"]').click();await page.locator('[data-action="plot:0"]').click()
      // Finish the short drawer entrance before measuring the controls.
      await page.locator('.quick-branches').first().waitFor();await page.waitForTimeout(300)
      const fits=await page.evaluate(()=>[...document.querySelectorAll('.quick-branches .live-purchase')].map(b=>{const r=b.getBoundingClientRect(),body=b.closest('.drawer-body').getBoundingClientRect();return r.height>=43.9&&r.top>=body.top&&r.bottom<=Math.min(body.bottom,innerHeight)}))
      const row={width,height,hero:f.hero,tower:f.id,fits};rows.push(row)
      assert.equal(fits.length,2);assert(fits.every(Boolean),JSON.stringify(row))
    }
    await context.close()
  }
  writeFileSync('artifacts/refinement-qa/upgrade-roster-results.json',JSON.stringify(rows,null,2));console.log(`PASS ${rows.length} hero/tower/viewport upgrade layouts`)
}finally{await browser.close()}
