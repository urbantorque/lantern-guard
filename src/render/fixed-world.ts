import type { Sim, Enemy } from '../game/sim'
import { ENEMIES, type EnemyId } from '../game/defs'
import type { ViewState } from './renderer'
import { drawFixedTower } from './fixed-towers'
import { currentPalette, ENEMY_MARK } from './palette'
import { block, CITY, plant, polygon, windows, setArchitectureLight } from './architecture'

const terrain=new WeakMap<Sim['level'],{key:string;canvas:HTMLCanvasElement}>()
export const districtGround=(s:Sim)=>s.sky.night?['#243644','#2c3b45','#29394a','#2b3742'][s.challenge.variant??0]:['#aab2a5','#b4b5a4','#a5b4b1','#b6b3a4'][s.challenge.variant??0]
function scenery(s:Sim,stage:number,keepsakes:readonly string[]) {
  const day=!s.sky.night
  const key=stage+':'+keepsakes.join(',')+':'+day;const old=terrain.get(s.level);if(old?.key===key)return old.canvas
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1680
  const c=canvas.getContext('2d')!;c.scale(2,2);setArchitectureLight(c,day)
  c.fillStyle=districtGround(s);c.fillRect(0,0,720,840)
  // Quiet rectilinear ground planes and walks surround the recognisable water route.
  for(const [x,y,w,h] of [[32,45,190,80],[440,50,230,295],[32,485,155,205],[515,70,145,75],[53,745,128,70]]){
    c.fillStyle=day?'#8d9b80':'#3d514c';c.fillRect(x,y,w,h);c.strokeStyle=day?'#c0c2b5':'#596e77';c.lineWidth=8;c.strokeRect(x-5,y-5,w+10,h+10)
  }
  for(const seg of s.level.segs.values()) {
    c.lineJoin='round';c.lineCap='butt'
    const path=()=>{c.beginPath();seg.line.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke()}
    c.save();c.translate(4,8);c.strokeStyle='#203141';c.lineWidth=57;path();c.restore()
    c.strokeStyle=day?'#c4c9c5':'#6c818d';c.lineWidth=57;path();c.strokeStyle=day?'#83979b':'#465f71';c.lineWidth=44;path();c.strokeStyle=day?'#597c89':CITY.water;c.lineWidth=34;path()
    for(let at=45;at<seg.line.length;at+=160){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));c.strokeStyle='#9cb5bd66';c.lineWidth=2;c.beginPath();c.moveTo(-4,-4);c.lineTo(2,0);c.lineTo(-4,4);c.stroke();c.restore()}
  }
  const clear=(x:number,y:number,r:number)=>s.level.def.home.y-y>70&&s.pads.every(p=>Math.hypot(p.x-x,p.y-y)>r+40)&&[...s.level.segs.values()].every(seg=>seg.line.distanceTo(x,y)>r+32)
  let buildings=0
  for(let y=125;y<800;y+=116)for(let x=65;x<690;x+=113){
    if(!clear(x,y,35))continue
    const w=38+(buildings%3)*9,h=25+(buildings%3)*12
    polygon(c,[[x-25,y+6],[x+45,y+6],[x+60,y-9],[x-10,y-19]],'#192b3c55')
    block(c,x,y,w,30,h);windows(c,x,y,w,h,h>38?2:1,buildings%5<=stage)
    if(buildings%2===0){block(c,x+5,y-h-7,w-8,22,3,'#5e7865','#778b72');for(let j=0;j<3;j++)plant(c,x-10+j*11,y-h-13,4)}
    if(keepsakes.includes('market')&&buildings%3===0){block(c,x-12,y+7,27,13,15,'#788b8a','#a1aaa0');windows(c,x-12,y+7,27,15)}
    if(keepsakes.includes('glass')){c.fillStyle=CITY.window;c.fillRect(x+w/2+8,y-17,3,9)}
    buildings++
  }
  for(let i=0;i<40;i++){
    const x=28+(i*173)%650,y=65+(i*137)%725
    if(!clear(x,y,18))continue
    c.fillStyle='#20323b55';c.fillRect(x-6,y+3,24,8);c.fillStyle='#6a746b';c.fillRect(x-2,y-14,4,18);plant(c,x,y-12,11+(i%3)*2)
  }
  if(stage>=2||keepsakes.includes('garden'))for(const [x,y] of [[45,780],[590,90],[620,100]]){if(clear(x,y,16)){block(c,x,y,25,17,6,'#7d8781','#566f61');plant(c,x,y-10,9)}}
  terrain.set(s.level,{key,canvas});return canvas
}

const enemyColour:Record<EnemyId,string>={drip:'#b6b8a2',skitter:'#9ebfc8',shell:'#bd9e90',veil:'#a7bda4',bloat:'#b2aac5',wisp:'#c8b290',mender:'#bfb6a0',vshell:'#a1b9ad',toad:'#9aa7b0',gloom:'#818fa7',skiff:'#a8b9c2',warden:'#8e9fb3',reedling:'#a7b89c',bloomheart:'#b2acbd'}
export function drawFixedEnemy(c:CanvasRenderingContext2D,e:Enemy) {
  const r=e.def.radius*(e.visScale??1)*1.18,x=e.x,y=e.y,hidden=e.def.hidden&&!e.revealedPerm&&e.seenT<=0
  c.save();c.globalAlpha=hidden?.48:1
  polygon(c,[[x-r,y+6],[x+r,y+6],[x+r*1.2,y],[x-r*.6,y-r*.15]],'#11253766')
  const body=[[x-r,y-r*.35],[x-r*.65,y-r*1.3],[x+r*.2,y-r*1.55],[x+r,y-r*.75],[x+r*.8,y+r*.15],[x-r*.45,y+r*.25]]
  polygon(c,body,currentPalette()==='clear'?ENEMY_MARK[e.def.id]:enemyColour[e.def.id]);polygon(c,[[x+r*.2,y-r*1.55],[x+r,y-r*.75],[x+r*.8,y+r*.15],[x,y],[x-r*.12,y-r*.65]],'#586e8199')
  c.strokeStyle='#344a5b';c.lineWidth=1.4;c.beginPath();body.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.stroke()
  if(e.shell>0){c.strokeStyle='#ded5b7';c.lineWidth=3;c.beginPath();c.moveTo(x-r,y-r*.2);c.lineTo(x-r*.7,y-r);c.lineTo(x+r*.15,y-r*1.3);c.lineTo(x+r*.83,y-r*.67);c.stroke()}
  if(e.shrouded){c.fillStyle='#61708488';c.beginPath();c.arc(x,y-r*.5,r*1.2,0,Math.PI*2);c.fill()}
  c.fillStyle='#f0e8b5';c.fillRect(x-r*.49,y-r*.68,Math.max(2,r*.17),Math.max(2,r*.17));c.fillRect(x+r*.1,y-r*.68,Math.max(2,r*.17),Math.max(2,r*.17))
  if(e.def.heal||e.def.id==='bloomheart'){c.strokeStyle='#d6ddbf';c.lineWidth=2;c.beginPath();c.moveTo(x-4,y-r*.9);c.lineTo(x+4,y-r*.9);c.moveTo(x,y-r*.9-4);c.lineTo(x,y-r*.9+4);c.stroke()}
  if(e.slowT>0){c.strokeStyle='#a8d3d9';c.lineWidth=2;c.beginPath();c.moveTo(x-r,y+6);c.lineTo(x+r,y+6);c.stroke()}
  if(e.def.hidden){c.strokeStyle='#cedcc4';c.lineWidth=1.5;c.setLineDash(hidden?[3,3]:[]);c.beginPath();c.ellipse(x,y-r*.1,r*.7,r*.24,0,0,Math.PI*2);c.stroke();c.setLineDash([])}
  if(e.def.boss||e.hp<e.maxHp){const w=Math.max(22,r*1.8);c.fillStyle='#213445';c.fillRect(x-w/2,y-r*1.8-4,w,4);c.fillStyle='#d1d5b4';c.fillRect(x-w/2,y-r*1.8-4,w*Math.max(0,e.hp/e.maxHp),4)}
  if(e.signalT&&e.signalT>0){c.strokeStyle='#e8ce91';c.lineWidth=3;c.beginPath();c.arc(x,y,Math.max(r,50),-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e.signalT/3));c.stroke()}
  c.restore()
}

export function drawFixedWorld(c:CanvasRenderingContext2D,s:Sim,view:ViewState,stage:number,keepsakes:readonly string[],crest:string,scale:number,reducedMotion=false) {
  setArchitectureLight(c,!s.sky.night)
  c.drawImage(scenery(s,stage,keepsakes),0,0,720,840)
  const selected=view.selection?.kind==='tower'?view.selection.tower:null
  if(selected){c.fillStyle=s.sky.night?'#eae4b30b':'#2c52660d';c.strokeStyle=s.sky.night?'#eae4b38c':'#3d6276bb';c.lineWidth=1.5;c.beginPath();c.arc(selected.x,selected.y,s.effRange(selected),0,Math.PI*2);c.fill();c.stroke()
    for(const bond of s.bonds){if(bond.a!==selected.uid&&bond.b!==selected.uid)continue;const partner=s.towers.find(t=>t.uid===(bond.a===selected.uid?bond.b:bond.a));if(partner){c.strokeStyle=s.sky.night?'#c9d4b099':'#405c66bb';c.setLineDash([5,5]);c.beginPath();c.moveTo(selected.x,selected.y);c.lineTo(partner.x,partner.y);c.stroke();c.setLineDash([])}}
  }
  for(const [i,p] of s.pads.entries()){
    if(!s.padRevealed(i))continue
    if(s.challenge.blockedPad===i){block(c,p.x,p.y,44,30,8,'#6f807c','#91a38b');continue}
    block(c,p.x,p.y,44,26,3,'#667985','#89989d','#526673')
    if(!p.tower){const unlocked=s.padAvailable(i);c.strokeStyle=s.sky.night?'#cad5c599':'#3f5b6988';c.lineWidth=1.5;c.strokeRect(p.x-19,p.y-18,38,18);c.fillStyle=s.sky.night?'#dbe1c7':'#263f4e';c.font=`500 ${Math.max(15,11/scale)}px "DM Sans Variable",sans-serif`;c.textAlign='center';c.fillText(unlocked?String(i+1):'+',p.x+3,p.y-2)}
  }
  const sprites=[...s.towers.map(t=>({y:t.y,t,e:null})),...s.enemies.filter(e=>e.alive).map(e=>({y:e.y,t:null,e}))].sort((a,b)=>a.y-b.y)
  for(const item of sprites){if(item.t)drawFixedTower(c,item.t.x,item.t.y,{...item.t,crest});else drawFixedEnemy(c,item.e!)}
  for(const p of s.projs){c.strokeStyle=p.heavy?'#e7c8a7':'#e4e2b3';c.lineWidth=p.kind==='bolt'?3.5:2;c.beginPath();c.moveTo(p.x,p.y);const len=Math.hypot(p.vx,p.vy)||1;c.lineTo(p.x-p.vx/len*9,p.y-p.vy/len*9);c.stroke()}
  for(const t of s.towers)if(t.id==='beam')for(const target of t.beamTargets)if(target?.alive){c.strokeStyle='#ebe6b5a6';c.lineWidth=2;c.beginPath();c.moveTo(t.x+4,t.y-60);c.lineTo(target.x,target.y-8);c.stroke()}
  const home=s.level.def.home
  block(c,home.x,home.y+7,52,34,7,'#6f838c','#96a4a4');block(c,home.x,home.y,28,23,63);windows(c,home.x,home.y,28,63,4,s.lives>0);block(c,home.x,home.y-67,42,30,20,'#6d818e','#7b8d9b');windows(c,home.x,home.y-67,42,20,1,s.lives>0)
  if(s.planningWave>=24){const p=s.level.segs.get('m1')!.line.at(0,{x:0,y:0,tx:0,ty:0});c.strokeStyle='#d0d4bd99';c.lineWidth=2;for(const dx of [-5,5]){c.beginPath();c.moveTo(p.x+dx-3,p.y-6);c.lineTo(p.x+dx+3,p.y);c.lineTo(p.x+dx-3,p.y+6);c.stroke()}}
  const sky=s.sky
  if(sky.weather==='mist'){c.fillStyle=sky.night?'#cad7da0b':'#eef2e918';c.fillRect(0,0,720,840)}
  if(sky.weather==='rain'&&!reducedMotion){c.strokeStyle=sky.night?'#a7c5d032':'#536b7638';c.lineWidth=1;for(let i=0;i<24;i++){const x=(i*173+s.climate.elapsed*12)%720,y=(i*97+s.climate.elapsed*110)%840;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+9);c.stroke()}}
  if(sky.weather==='breeze'&&!reducedMotion){c.fillStyle='#88996a66';for(let i=0;i<5;i++){const x=(i*173+s.climate.elapsed*25)%720,y=120+i*125+Math.sin(s.climate.elapsed+i)*4;c.fillRect(x,y,5,2)}}
  for(const source of s.level.def.sources){if(source.openWave>s.planningWave&&source.id!=='west')continue;const p=s.level.segs.get(source.seg)!.line.at(0,{x:0,y:0,tx:0,ty:0});c.fillStyle=sky.night?'#d2d9cf':'#334e5a';c.font=`500 ${Math.max(15,10/scale)}px "DM Sans Variable",sans-serif`;c.textAlign=source.id==='west'?'left':'center';c.fillText(source.id==='west'?(s.planningWave<11?'Side inlet · wave 11':'Side inlet'):'North stream',Math.max(18,p.x),Math.max(13,p.y-17))}
}

const icons=new Map<string,string>()
export function fixedEnemyIcon(id:EnemyId){
  const key=id+':'+currentPalette();if(icons.has(key))return icons.get(key)!
  const cv=document.createElement('canvas');cv.width=96;cv.height=96;const c=cv.getContext('2d')!,def=ENEMIES[id]
  const k=def.radius>28?.65:1.6;c.translate(48,64);c.scale(k,k)
  drawFixedEnemy(c,{x:0,y:0,def,hp:1,maxHp:1,shell:def.shell??0,visScale:1,revealedPerm:true,seenT:0,shrouded:false,slowT:0} as Enemy)
  const url=cv.toDataURL();icons.set(key,url);return url
}
