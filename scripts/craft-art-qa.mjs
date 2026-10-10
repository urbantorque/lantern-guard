import {createRequire} from 'node:module'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/craft';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const errors=[],page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message))
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1',{waitUntil:'networkidle'})
 await page.evaluate(async snap=>{const {Sim}=await import('/src/game/sim.ts'),{encodeRun}=await import('/src/game/save-store.ts'),{loadVillage,recordWatch}=await import('/src/game/fixed-store.ts');const s=Sim.restore(snap);recordWatch(loadVillage(),s);localStorage.setItem('lanternlocks.fixed1.siege',encodeRun(s.snapshot(),[]))},JSON.parse(readFileSync('artifacts/siege/active-40.json','utf8')))
 await page.reload({waitUntil:'networkidle'});await page.locator('[data-action="resume:siege"]').click();await page.waitForTimeout(1700);await page.locator('[data-action="pause"]').click()
 await page.screenshot({path:out+'/late-restoration-1280.png'})
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:out+'/late-restoration-390.png'})
 await page.locator('[data-action="menu"]').click();await page.locator('[data-action="settings"]').click()
 const setting=page.locator('[data-action="setting:ambience"]');assert.equal(await setting.getAttribute('aria-checked'),'true');await setting.click();assert.equal(await setting.getAttribute('aria-checked'),'false');assert.equal(await page.locator('[data-action="setting:music"]').getAttribute('aria-checked'),'true');await page.screenshot({path:out+'/audio-settings-390.png'})
 await page.reload({waitUntil:'networkidle'});const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('lanternlocks.fixed1.profile')).settings);assert.equal(prefs.ambience,false);assert.equal(prefs.music,true)
 await page.setViewportSize({width:1080,height:640})
 await page.evaluate(async()=>{const {heroPortrait}=await import('/src/render/heroes.ts');document.body.innerHTML='<main style="display:flex;gap:24px;padding:40px;background:#142d38">'+['sol','mira','ivo'].map(id=>`<article style="color:#dccda7"><h2>${id}</h2><img width="300" height="350" src="${heroPortrait(id)}"></article>`).join('')+'</main>';await Promise.all([...document.images].map(i=>i.decode()))})
 await page.screenshot({path:out+'/portraits.png'});assert.deepEqual(errors,[]);writeFileSync(out+'/art-browser.json',JSON.stringify({restoredWave:40,viewports:[1280,390],independentAmbience:true,settingsPersist:true,errors},null,2))
 console.log('PASS restored district, portraits, independent ambience and settings persistence')
}finally{await browser.close()}
