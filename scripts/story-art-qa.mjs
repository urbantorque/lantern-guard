import {createRequire} from 'node:module'
import {mkdirSync} from 'node:fs'
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/roger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const out='artifacts/story-release';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5176/?muted=1')
 await page.evaluate(async()=>{
  const {TOWER_ORDER}=await import('/src/game/defs.ts'),{fixedTowerIcon}=await import('/src/render/fixed-towers.ts')
  document.body.innerHTML='<main class="art-audit"><h1>Nightward / weapon silhouettes</h1><p>Base · Specialisation · Crown, both paths</p><section id="gallery"></section></main>'
  const style=document.createElement('style');style.textContent='body{overflow:auto!important;background:#0d2531!important;color:#eaddc3!important}.art-audit{padding:32px}.art-audit h1{font-size:28px}.art-audit p{color:#9db9b4}.art-audit section{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.art-audit article{padding:14px;background:#183a43;border:1px solid #69827b}.art-audit h2{font-size:18px;margin:0;color:#e4c88c}.art-audit img{width:30%;height:115px;object-fit:contain}.art-audit small{display:block;font-size:11px;color:#a4bdb6}.art-audit .enemies{grid-template-columns:repeat(5,1fr)}.enemies img{width:100%;height:180px}';document.head.append(style)
  document.querySelector('#gallery').innerHTML=TOWER_ORDER.map(id=>`<article><h2>${id}</h2>${[0,1].map(b=>`<div>${[[0,0,0],[b?0:2,b?2:0,0],[b?0:3,b?3:0,1]].map(([a,b,r])=>`<img src="${fixedTowerIcon(id,a,b,r,id==='storm'?'ivo':id==='bell'?'mira':'sol')}"/>`).join('')}<small>${b?'Second':'First'} specialisation</small></div>`).join('')}</article>`).join('')
  await Promise.all([...document.images].map(i=>i.decode()))
 })
 await page.screenshot({path:out+'/weapons.png',fullPage:true})
 await page.evaluate(async()=>{const {ENEMIES}=await import('/src/game/defs.ts'),{fixedEnemyIcon}=await import('/src/render/fixed-world.ts');document.querySelector('h1').textContent='Nightward / hostile silhouettes';const g=document.querySelector('#gallery');g.className='enemies';g.innerHTML=Object.entries(ENEMIES).map(([id,e])=>`<article><h2>${e.name}</h2><img src="${fixedEnemyIcon(id)}"/></article>`).join('');await Promise.all([...document.images].map(i=>i.decode()))})
 await page.screenshot({path:out+'/enemies.png',fullPage:true})
 await page.evaluate(async()=>{const {loadVillage}=await import('/src/game/fixed-store.ts'),{districtPanorama}=await import('/src/render/district-projects.ts'),{PROJECT_STEPS}=await import('/src/game/district-projects.ts'),{mission}=await import('/src/game/story.ts');document.querySelector('h1').textContent='Nightward / restoration stages';const g=document.querySelector('#gallery');g.className='';g.style.gridTemplateColumns='repeat(2,1fr)';g.innerHTML=[0,1,2,3].map(stage=>{const p=loadVillage();p.records={};p.commissions=[];for(const steps of Object.values(PROJECT_STEPS))for(const id of steps.missions.slice(0,stage)){const m=mission(id);p.records[`story1:${id}:standard:mira:standard`]={wave:m.waves.length,won:true,light:25,practice:false}}return `<article><h2>Stage ${stage}</h2><img style="width:100%;height:auto" src="${districtPanorama(p)}"/></article>`}).join('');await Promise.all([...document.images].map(i=>i.decode()))})
 await page.screenshot({path:out+'/restoration-stages.png',fullPage:true});console.log('PASS authored weapons, hostile silhouettes and four restoration states captured')
}finally{await browser.close()}
