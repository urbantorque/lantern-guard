import type { Sim, Enemy, Tower } from '../game/sim'
import { ENEMIES, type EnemyId } from '../game/defs'
import type { ViewState } from './renderer'
import { drawFixedTower, TOWER_COLOURS } from './fixed-towers'
import { drawFixedEnemy } from './fixed-enemies'
import { currentPalette } from './palette'
import { block, plant, polygon, windows, setArchitectureLight, lightPool } from './architecture'

const terrain=new WeakMap<Sim['level'],{key:string;canvas:HTMLCanvasElement}>()
export const districtGround=(s:Sim)=>s.sky.night?['#153c47','#193d49','#20374f','#193e43'][s.challenge.variant??0]:['#82b798','#98b892','#89bcb3','#a8b99c'][s.challenge.variant??0]
const buildingColours=[['#ce7965','#f3be8a','#8b5360'],['#438a91','#a0d3bd','#2e586c'],['#557eaf','#a9c6df','#354e7b'],['#b58a59','#e9d2a0','#79604e'],['#5b9873','#bfdb9b','#396657']]
const clearAt=(s:Sim,x:number,y:number,r:number)=>Math.hypot(s.level.def.home.x-x,s.level.def.home.y-y)>r+50&&s.pads.every(p=>Math.hypot(p.x-x,p.y-y)>r+35)&&[...s.level.segs.values()].every(seg=>seg.line.distanceTo(x,y)>r+32)

/** Expensive detail is painted once per district/lighting change, never per frame. */
function scenery(s:Sim,stage:number,keepsakes:readonly string[]){
  const day=!s.sky.night,key=stage+':'+keepsakes.join(',')+':'+day,old=terrain.get(s.level)
  if(old?.key===key)return old.canvas
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1920
  const c=canvas.getContext('2d')!;c.scale(2,2);c.translate(0,105);setArchitectureLight(c,day)
  c.fillStyle=districtGround(s);c.fillRect(0,-105,720,960)
  for(const [i,[x,y,w,h]] of [[28,42,188,112],[449,32,223,302],[26,480,170,230],[522,410,155,150],[35,746,140,77]].entries()){
    c.fillStyle=day?'#d8d6b3':'#527780';c.fillRect(x-7,y-7,w+14,h+14)
    c.fillStyle=day?(i%2?'#6eac82':'#70a98a'):(i%2?'#235c55':'#255b60');c.fillRect(x,y,w,h)
    c.strokeStyle=day?'#f2e5c559':'#93c4ba24';c.lineWidth=1
    for(let n=0;n<w;n+=24){c.beginPath();c.moveTo(x+n,y-7);c.lineTo(x+n,y);c.moveTo(x+n,y+h);c.lineTo(x+n,y+h+7);c.stroke()}
  }
  for(let i=0;i<240;i++){const x=12+(i*173)%696,y=-60+(i*137)%894;if(!clearAt(s,x,y,2))continue;c.fillStyle=day?'#e4e5a52e':'#69b39112';c.fillRect(x,y,3+i%3,2)}
  for(const seg of s.level.segs.values()){
    c.lineJoin='round';c.lineCap='butt'
    const path=()=>{c.beginPath();seg.line.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke()}
    c.save();c.translate(5,8);c.strokeStyle=day?'#3b77736b':'#081f3599';c.lineWidth=62;path();c.restore()
    c.strokeStyle=day?'#f0e1b8':'#80a7a7';c.lineWidth=60;path();c.strokeStyle=day?'#75999a':'#345c75';c.lineWidth=48;path();c.strokeStyle=day?'#178f9f':'#145b79';c.lineWidth=39;path();c.strokeStyle=day?'#32b8ba':'#207e95';c.lineWidth=25;path()
    for(let at=65;at<seg.line.length;at+=125){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});for(const side of [-1,1]){
      const x=p.x-p.ty*33*side,y=p.y+p.tx*33*side
      if(s.pads.some(pad=>Math.hypot(pad.x-x,pad.y-y)<36))continue
      if(!day)lightPool(c,x,y,36,'#ffc766',.6)
      block(c,x,y,5,5,9,day?'#728c81':'#355d71','#c4ccaa','#274757');c.fillStyle=day?'#fbe6a2':'#ffe6a0';c.fillRect(x-2,y-12,4,4)
    }}
  }
  let buildings=0
  for(let y=123;y<825;y+=106)for(let x=53;x<695;x+=102){
    if(!clearAt(s,x,y,32))continue
    const style=buildings%5,w=43+(buildings%3)*8,h=27+(buildings%4)*12,[front,roof,side]=buildingColours[style]
    polygon(c,[[x-28,y+5],[x+43,y+5],[x+67,y-10],[x-7,y-24]],day?'#234f5d3d':'#061b354d')
    if(!day)lightPool(c,x,y+2,w,'#ffc56c',.32)
    block(c,x,y,w,32,h,day?front:side,day?roof:front,day?side:'#233c52');windows(c,x,y,w,h,h>40?2:1,true)
    c.fillStyle=day?'#b1eadf':'#ffd589';for(let j=0;j<2;j++)polygon(c,[[x+w/2+3+j*5,y-h+9-j*2],[x+w/2+6+j*5,y-h+7-j*2],[x+w/2+6+j*5,y-h+14-j*2],[x+w/2+3+j*5,y-h+16-j*2]],c.fillStyle as string)
    block(c,x,y-h+1,w+3,34,3,day?roof:front,day?roof:front,side)
    c.fillStyle=style%2?'#e6a55b':'#366778';c.fillRect(x-w/2+6,y-14,9,14)
    if(buildings%2===0){block(c,x+4,y-h-5,w-7,23,4,'#759b75',day?'#8dbf73':'#43806b','#396559');for(let j=0;j<3;j++)plant(c,x-10+j*11,y-h-12,5)}
    else{polygon(c,[[x-13,y-h-8],[x-6,y-h-17],[x+14,y-h-17],[x+7,y-h-8]],day?'#356e91':'#234660');c.strokeStyle='#90cbd199';c.lineWidth=1;c.strokeRect(x-8,y-h-15,12,5)}
    if(buildings%3===0||keepsakes.includes('market')){block(c,x-9,y+8,29,16,13,day?'#bc6b62':'#784f60',day?'#f3b28b':'#c27d79','#704859');for(let j=0;j<4;j++)polygon(c,[[x-25+j*8,y-6],[x-20+j*8,y-12],[x-13+j*8,y-12],[x-18+j*8,y-6]],j%2?'#ffe3b1':'#e58472')}
    if(keepsakes.includes('glass')){c.fillStyle='#94e5df';c.fillRect(x+w/2+8,y-21,4,12)}
    buildings++
  }
  for(let i=0;i<82;i++){
    const x=22+(i*173)%678,y=5+(i*137)%810;if(!clearAt(s,x,y,14))continue
    const size=12+(i%3)*3;polygon(c,[[x-6,y+5],[x+24,y+5],[x+35,y-5],[x+3,y-14]],'#17475235')
    c.fillStyle=day?'#796c59':'#40525b';c.fillRect(x-2,y-12,4,18);plant(c,x,y-10,size)
    if(i%4===0){c.fillStyle=day?'#f4ba85':'#d68691';for(let j=0;j<3;j++){c.beginPath();c.arc(x-7+j*6,y-22-j%2*5,3.5,0,Math.PI*2);c.fill()}}
  }
  for(let i=0;i<38;i++){const x=25+(i*191)%665,y=32+(i*113)%760;if(!clearAt(s,x,y,8))continue;block(c,x,y,16,11,4,'#526d64','#6a9966','#385c55');for(let j=0;j<3;j++){c.fillStyle=['#f4c766','#ed998b','#e6d1ef'][i%3];c.fillRect(x-5+j*5,y-9-j%2*3,4,4)}}
  if(stage>=2||keepsakes.includes('garden'))for(const [x,y] of [[45,780],[590,90],[620,100]])if(clearAt(s,x,y,16)){block(c,x,y,25,17,6,'#72996e','#aad288');plant(c,x,y-10,9)}
  terrain.set(s.level,{key,canvas});return canvas
}

function movingWater(c:CanvasRenderingContext2D,s:Sim,time:number){
  c.save();c.lineCap='round'
  for(const seg of s.level.segs.values())for(let i=0;i<Math.ceil(seg.line.length/72);i++){
    const at=(i*72+time*17)%seg.line.length,p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),off=Math.sin(i*7)*10
    c.strokeStyle=s.sky.night?'#77dfd54d':'#c2fff378';c.lineWidth=i%3===0?2:1
    const x=p.x-p.ty*off,y=p.y+p.tx*off;c.beginPath();c.moveTo(x-p.tx*5,y-p.ty*5);c.lineTo(x+p.tx*6,y+p.ty*6);c.stroke()
  }
  c.restore()
}

const arrivals=new WeakMap<Tower,{born:number;upgrade:number;lastUpgrade:number}>()
const lightChanges=new WeakMap<Sim,{canvas:HTMLCanvasElement;previous:HTMLCanvasElement|null;at:number}>()
export function drawFixedWorld(c:CanvasRenderingContext2D,s:Sim,view:ViewState,stage:number,keepsakes:readonly string[],crest:string,scale:number,reducedMotion=false,time=0){
  setArchitectureLight(c,!s.sky.night)
  const scene=scenery(s,stage,keepsakes);let light=lightChanges.get(s)
  if(!light){light={canvas:scene,previous:null,at:time};lightChanges.set(s,light)}
  else if(light.canvas!==scene){light.previous=light.canvas;light.canvas=scene;light.at=time}
  c.drawImage(scene,0,-105,720,960)
  if(light.previous&&!reducedMotion&&time-light.at<.8){c.save();c.globalAlpha=1-(time-light.at)/.8;c.drawImage(light.previous,0,-105,720,960);c.restore()}else light.previous=null
  movingWater(c,s,reducedMotion?0:time)
  const selected=view.selection?.kind==='tower'?view.selection.tower:null
  if(selected){c.fillStyle='#d1f9e016';c.strokeStyle=s.sky.night?'#a5e8caaf':'#315f76aa';c.lineWidth=1.5;c.beginPath();c.arc(selected.x,selected.y,s.effRange(selected),0,Math.PI*2);c.fill();c.stroke()
    for(const bond of s.bonds){if(bond.a!==selected.uid&&bond.b!==selected.uid)continue;const partner=s.towers.find(t=>t.uid===(bond.a===selected.uid?bond.b:bond.a));if(partner){c.strokeStyle='#ffdc8fcc';c.setLineDash([5,5]);c.lineDashOffset=reducedMotion?0:-time*12;c.beginPath();c.moveTo(selected.x,selected.y);c.lineTo(partner.x,partner.y);c.stroke();c.setLineDash([]);c.lineDashOffset=0}}
  }
  for(const [i,p] of s.pads.entries()){
    if(!s.padRevealed(i))continue
    if(s.challenge.blockedPad===i){block(c,p.x,p.y,44,30,8,'#587b70','#91ba83');continue}
    const chosen=view.selection?.kind==='pad'&&view.selection.index===i
    block(c,p.x,p.y,48,29,5,s.sky.night?'#496876':'#74958e',chosen?'#fbd18e':s.sky.night?'#85b4b0':'#d8dbb7','#3f666f')
    if(!p.tower){const unlocked=s.padAvailable(i);c.strokeStyle=unlocked?'#fff3c9':'#679593';c.lineWidth=1.5;c.strokeRect(p.x-19,p.y-20,38,18);c.fillStyle=s.sky.night?'#edffe8':'#284e5a';c.font=`650 ${Math.max(15,11/scale)}px "DM Sans Variable",sans-serif`;c.textAlign='center';c.fillText(unlocked?String(i+1):'+',p.x+3,p.y-4)}
  }
  const sprites=[...s.towers.map(t=>({y:t.y,t,e:null})),...s.enemies.filter(e=>e.alive).map(e=>({y:e.y,t:null,e}))].sort((a,b)=>a.y-b.y)
  for(const item of sprites){
    if(item.t){const t=item.t;let a=arrivals.get(t);if(!a){a={born:s.time-t.bornT<.2?time:-9,upgrade:-9,lastUpgrade:t.upT};arrivals.set(t,a)}if(a.lastUpgrade!==t.upT){a.lastUpgrade=t.upT;a.upgrade=time}
      drawFixedTower(c,t.x,t.y,{...t,crest,hero:s.challenge.hero,time:reducedMotion?0:time,since:reducedMotion?9:s.time-t.fireT,age:reducedMotion?9:time-a.born,upAge:reducedMotion?9:time-a.upgrade,reducedMotion})
    }else drawFixedEnemy(c,item.e!,reducedMotion)
  }
  for(const p of s.projs){
    c.save();const colour=s.challenge.hero?p.tower.def.hue:TOWER_COLOURS[p.tower.id].accent,travelled=Math.hypot(p.x-p.tower.x,p.y-p.tower.y),lift=Math.max(0,1-travelled/95)*28
    c.translate(p.x,p.y-lift);c.rotate(Math.atan2(p.vy,p.vx));c.lineCap='round';c.strokeStyle=colour+'55';c.lineWidth=p.heavy?8:6;c.beginPath();c.moveTo(-15,0);c.lineTo(0,0);c.stroke()
    c.strokeStyle=colour;c.lineWidth=p.kind==='bolt'?3:2;c.beginPath();c.moveTo(-12,0);c.lineTo(2,0);c.stroke()
    if(s.challenge.hero==='ivo'){c.strokeStyle='#e5eaff';c.lineWidth=1.5;c.beginPath();c.moveTo(-16,0);c.lineTo(-11,-3);c.lineTo(-7,3);c.lineTo(0,0);c.stroke()}
    if(s.challenge.hero==='mira'){c.strokeStyle='#b0fff0';c.lineWidth=1;c.beginPath();c.ellipse(-5,0,7,3,0,-1.2,1.2);c.stroke()}
    if(p.kind==='bolt')polygon(c,[[5,0],[-3,-4],[-3,4]],'#fff0bf')
    else if(p.kind==='feather'||p.kind==='moth'){const wing=reducedMotion?4:3+Math.abs(Math.sin(time*28))*5;polygon(c,[[-5,0],[-1,-wing],[5,0],[-1,wing]],'#dbffb3')}
    else{c.fillStyle='#fff6d1';c.beginPath();c.arc(0,0,p.heavy?3.5:2.6,0,Math.PI*2);c.fill()}
    c.restore()
  }
  for(const t of s.towers)if(t.id==='beam')for(const target of t.beamTargets)if(target?.alive){const height=52+(t.refinement?4:Math.max(t.a,t.b))*7;c.lineCap='round';for(const [width,col]of [[9,'#ffd56c22'],[4,'#ffdb7999'],[1.6,'#fff2b9']]as const){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(t.x+4,t.y-height-12);c.lineTo(target.x,target.y-8);c.stroke()}lightPool(c,target.x,target.y-8,19,'#ffdb79',.6,1)}
  const home=s.level.def.home
  if(s.sky.night)lightPool(c,home.x,home.y,100,'#ffcb73',.85)
  block(c,home.x,home.y+7,58,36,9,'#487b87','#a1cdc5','#2e5367');block(c,home.x,home.y,31,25,65);windows(c,home.x,home.y,31,65,4,s.lives>0)
  block(c,home.x,home.y-67,46,32,22,'#cc9865','#f1ce8e','#7e6461');windows(c,home.x,home.y-67,46,22,1,s.lives>0);block(c,home.x,home.y-91,34,24,5,'#377485','#8ccecb','#254957')
  if(s.lives>0)lightPool(c,home.x,home.y-81,35,'#ffdc80',s.sky.night?.65:.2,1)
  const sky=s.sky
  if(sky.weather==='mist'){c.fillStyle=sky.night?'#bddeef0c':'#f2ffe921';for(let i=0;i<4;i++){c.beginPath();c.ellipse(160+i*120,120+i*180,240,40,0,0,Math.PI*2);c.fill()}}
  if(sky.weather==='rain'&&!reducedMotion){c.strokeStyle=sky.night?'#b4e2ee66':'#2c6e7d55';c.lineWidth=1;for(let i=0;i<36;i++){const x=(i*173+time*12)%720,y=(i*97+time*160)%840;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+12);c.stroke()}}
  if(sky.weather==='breeze'&&!reducedMotion){c.fillStyle='#ffd594b0';for(let i=0;i<7;i++){const x=(i*173+time*28)%720,y=80+i*105+Math.sin(time+i)*7;c.save();c.translate(x,y);c.rotate(time+i);c.fillRect(-3,-1,6,2);c.restore()}}
  for(const source of s.level.def.sources){if(source.openWave>s.planningWave&&source.id!=='west')continue;const p=s.level.segs.get(source.seg)!.line.at(0,{x:0,y:0,tx:0,ty:0});c.fillStyle=sky.night?'#d8efde':'#244f5b';c.font=`550 ${Math.max(15,10/scale)}px "DM Sans Variable",sans-serif`;c.textAlign=source.id==='west'?'left':'center';c.fillText(source.id==='west'?(s.planningWave<11?'Side inlet · wave 11':'Side inlet'):'North stream',Math.max(18,p.x),Math.max(13,p.y-17))}
}

const icons=new Map<string,string>()
export function fixedEnemyIcon(id:EnemyId){
  const key=id+':'+currentPalette();if(icons.has(key))return icons.get(key)!
  const cv=document.createElement('canvas');cv.width=96;cv.height=96;const c=cv.getContext('2d')!,def=ENEMIES[id]
  const k=def.boss?64/(def.radius*1.24*2.45):1.5;c.translate(48,def.boss?76:66);c.scale(k,k)
  drawFixedEnemy(c,{x:0,y:0,def,hp:1,maxHp:1,shell:def.shell??0,visScale:1,revealedPerm:true,seenT:0,shrouded:false,slowT:0}as Enemy,true)
  const url=cv.toDataURL();icons.set(key,url);return url
}
