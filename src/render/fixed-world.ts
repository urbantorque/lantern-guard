import { escortCover } from '../game/living-watch'
import { upright, elevated } from './board-view'
import type { Sim, Enemy, Tower } from '../game/sim'
import { ENEMIES, type EnemyId } from '../game/defs'
import type { ViewState } from './renderer'
import { drawFixedTower, TOWER_COLOURS } from './fixed-towers'
import { drawFixedEnemy } from './fixed-enemies'
import { currentPalette } from './palette'
import { block, polygon, windows, setArchitectureLight, lightPool } from './architecture'

import { scenery, movingWater, livingDistrict } from './fixed-scenery'
import { DREDGER_BENDS, DREDGER_WINDOW } from '../game/watch-craft'
import { drawLandmark, drawSunReserves } from './watch-depth'

const arrivals=new WeakMap<Tower,{born:number;upgrade:number;lastUpgrade:number;fire:number;shot:number;angle:number;frame:number}>()
const lightChanges=new WeakMap<Sim,{canvas:HTMLCanvasElement;previous:HTMLCanvasElement|null;at:number;wide:boolean}>()
export function drawFixedWorld(c:CanvasRenderingContext2D,s:Sim,view:ViewState,stage:number,keepsakes:readonly string[],crest:string,scale:number,reducedMotion=false,time=0,wide=false){
  setArchitectureLight(c,!s.sky.night)
  const scene=scenery(s,stage,keepsakes,wide);let light=lightChanges.get(s)
  if(!light||light.wide!==wide){light={canvas:scene,previous:null,at:time,wide};lightChanges.set(s,light)}
  else if(light.canvas!==scene){light.previous=light.canvas;light.canvas=scene;light.at=time}
  if(light.previous&&!reducedMotion&&time-light.at<2){
    const mix=(time-light.at)/2;c.save();c.globalAlpha=1-mix;c.drawImage(light.previous,-50,-140,920,1070);c.globalAlpha=mix;c.drawImage(scene,-50,-140,920,1070);c.restore()
  }else{light.previous=null;c.drawImage(scene,-50,-140,920,1070)}
  movingWater(c,s,reducedMotion?0:time)
  livingDistrict(c,s,time,reducedMotion)
  drawLandmark(c,s,time,reducedMotion,wide)
  drawSunReserves(c,s,reducedMotion,wide)
  if(s.challenge.watchCraft&&s.challenge.expedition==='sunforge'&&s.planningWave>=10){
    for(const bend of DREDGER_BENDS){const seg=s.level.segs.get(bend.segment);if(!seg)continue
      c.save();c.strokeStyle='#ffe0a4';c.lineWidth=3;c.setLineDash([4,7]);c.beginPath()
      for(let d=-DREDGER_WINDOW;d<=DREDGER_WINDOW;d+=5){const p=seg.line.at(seg.line.length*bend.fraction+d,{x:0,y:0,tx:0,ty:0});if(d===-DREDGER_WINDOW)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y)}c.stroke();c.setLineDash([])
      const p=seg.line.at(seg.line.length*bend.fraction,{x:0,y:0,tx:0,ty:0});upright(c,p.x,p.y,wide,()=>{c.font='600 12px "DM Sans Variable",sans-serif';c.textAlign='center';c.fillStyle=s.sky.night?'#ffe6ac':'#3c5260';c.fillText('CORE OPENS',p.x,p.y-35)});c.restore()
    }
  }
  // Show the true footprint of lingering fire below units, so its damage has a visible cause.
  for(const p of s.embers){
    c.save();c.globalAlpha=Math.min(.35,p.life*.22);c.fillStyle='#ed9554';c.strokeStyle='#ffcf86';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,p.radius,0,Math.PI*2);c.fill();c.stroke()
    for(let i=0;i<4;i++){const phase=reducedMotion?.35:(time*1.2+i*.25)%1,x=p.x+Math.sin(i*8)*p.radius*.6,y=p.y+Math.cos(i*8)*p.radius*.4-phase*13;lightPool(c,x,y,8,'#ffdd86',1-phase,1)}c.restore()
  }
  const selected=view.selection?.kind==='tower'?view.selection.tower:null
  if(selected){c.fillStyle='#d1f9e016';c.strokeStyle=s.sky.night?'#a5e8caaf':'#315f76aa';c.lineWidth=1.5;c.beginPath();c.arc(selected.x,selected.y,s.effRange(selected),0,Math.PI*2);c.fill();c.stroke()
    const nightReach=s.nightRange(selected)
    if(!s.sky.night&&Math.abs(nightReach-s.effRange(selected))>3){c.save();c.strokeStyle='#9870ad';c.setLineDash([5,5]);c.beginPath();c.arc(selected.x,selected.y,nightReach,0,Math.PI*2);c.stroke();c.restore()}
    for(const bond of s.bonds){if(bond.a!==selected.uid&&bond.b!==selected.uid)continue;const partner=s.towers.find(t=>t.uid===(bond.a===selected.uid?bond.b:bond.a));if(partner){c.strokeStyle='#ffdc8fcc';c.setLineDash([5,5]);c.lineDashOffset=reducedMotion?0:-time*12;c.beginPath();c.moveTo(selected.x,selected.y);c.lineTo(partner.x,partner.y);c.stroke();c.setLineDash([]);c.lineDashOffset=0}}
  }
  for(const [i,p] of s.pads.entries()){
    if(!s.padRevealed(i))continue
    upright(c,p.x,p.y,wide,()=>{
    if(s.challenge.blockedPad===i){block(c,p.x,p.y,44,30,8,'#587b70','#91ba83');return}
    const chosen=view.selection?.kind==='pad'&&view.selection.index===i
    const accent=p.tower?TOWER_COLOURS[p.tower.id].accent:s.padAvailable(i)?'#ffe3a1':'#a0cbc6'
    if(p.tower){
      const active=selected===p.tower
      lightPool(c,p.x,p.y,active?59:42,accent,active?.6:.25)
      c.strokeStyle=active?'#fff0bc':accent+'a0';c.lineWidth=active?3:2;c.beginPath();c.ellipse(p.x+4,p.y,34,17,0,0,Math.PI*2);c.stroke()
    }else{
      c.fillStyle='#173f4b66';c.beginPath();c.ellipse(p.x+3,p.y+8,34,19,0,0,Math.PI*2);c.fill()
      c.fillStyle=chosen?'#426b71':s.sky.night?'#234f5d':'#3c7178';c.strokeStyle=accent;c.lineWidth=2.5;c.beginPath();c.ellipse(p.x,p.y,33,20,0,0,Math.PI*2);c.fill();c.stroke()
      if(!reducedMotion&&s.padAvailable(i)&&!s.waveActive){const phase=(time*.55+i*.17)%1;c.save();c.globalAlpha=(1-phase)*.5;c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,34+phase*13,21+phase*8,0,0,Math.PI*2);c.stroke();c.restore()}
    }
    })
  }
  const sprites=[...s.towers.map(t=>({y:t.y,t,e:null})),...s.enemies.filter(e=>e.alive).map(e=>({y:e.y,t:null,e}))].sort((a,b)=>wide?((b.t??b.e)!.x-(a.t??a.e)!.x):a.y-b.y)
  for(const item of sprites){
    if(item.t){const t=item.t;let a=arrivals.get(t);if(!a){a={born:s.time-t.bornT<.2?time:-9,upgrade:-9,lastUpgrade:t.upT,fire:t.fireT,shot:s.time-t.fireT<.2?time:-9,angle:t.angle,frame:time};arrivals.set(t,a)}if(a.lastUpgrade!==t.upT){a.lastUpgrade=t.upT;a.upgrade=time}
      if(a.fire!==t.fireT){a.fire=t.fireT;a.shot=time}
      const turn=Math.atan2(Math.sin(t.angle-a.angle),Math.cos(t.angle-a.angle));a.angle+=turn*Math.min(1,(time-a.frame)*18);a.frame=time
      upright(c,t.x,t.y,wide,()=>drawFixedTower(c,t.x,t.y,{...t,angle:(reducedMotion?t.angle:a.angle)-(wide?Math.PI/2:0),crest,hero:s.challenge.hero,mastery:keepsakes,volleyCharge:s.challenge.refinedWatch&&t.id==='storm'&&s.techniques.includes('capacitor')?t.tolls%3:undefined,charge:1-Math.max(0,t.cd)/t.stats.interval,time:reducedMotion?0:time,since:reducedMotion?9:time-a.shot,age:reducedMotion?9:time-a.born,upAge:reducedMotion?9:time-a.upgrade,reducedMotion}))
    }else {const e=item.e!;
      if(escortCover(s,e)){c.save();c.strokeStyle='#ffdda5aa';c.lineWidth=2.5;c.beginPath();c.arc(e.x,e.y,25,-Math.PI*.8,Math.PI*.1);c.stroke();c.restore()}
      upright(c,e.x,e.y,wide,()=>drawFixedEnemy(c,wide?{...e,tx:e.ty,ty:-e.tx}:e,reducedMotion))}
  }
  for(const p of s.projs){
    if(!p.alive)continue
    c.save();const colour=s.challenge.hero?p.tower.def.hue:TOWER_COLOURS[p.tower.id].accent
    // Use the same elevation as impact flashes. Distance-dependent muzzle
    // offsets made straight sparks appear to curve through, then off, a foe.
    const at=elevated(p.x,p.y,8,wide);c.translate(at.x,at.y);c.rotate(Math.atan2(p.vy,p.vx));c.lineCap='round';c.strokeStyle=colour+'55';c.lineWidth=p.heavy?10:7;c.beginPath();c.moveTo(-16,0);c.lineTo(0,0);c.stroke()
    c.strokeStyle=colour;c.lineWidth=p.kind==='bolt'?3.5:2.8;c.beginPath();c.moveTo(-19,0);c.lineTo(2,0);c.stroke()
    lightPool(c,0,0,p.heavy?15:10,colour,.6,1)
    if(s.challenge.hero==='ivo'){c.strokeStyle='#e5eaff';c.lineWidth=1.5;c.beginPath();c.moveTo(-16,0);c.lineTo(-11,-3);c.lineTo(-7,3);c.lineTo(0,0);c.stroke()}
    if(s.challenge.hero==='mira'){c.strokeStyle='#b0fff0';c.lineWidth=1;c.beginPath();c.ellipse(-5,0,7,3,0,-1.2,1.2);c.stroke()}
    if(p.kind==='bolt')polygon(c,[[5,0],[-3,-4],[-3,4]],'#fff0bf')
    else if(p.kind==='feather'||p.kind==='moth'){const wing=reducedMotion?4:3+Math.abs(Math.sin(time*28))*5;polygon(c,[[-5,0],[-1,-wing],[5,0],[-1,wing]],'#dbffb3')}
    else{c.fillStyle='#fff6d1';c.beginPath();c.arc(0,0,p.heavy?3.5:2.6,0,Math.PI*2);c.fill()}
    c.restore()
  }
  for(const t of s.towers)if(t.id==='beam')for(const target of t.beamTargets)if(target?.alive){const height=52+(t.refinement?4:Math.max(t.a,t.b))*7,from=elevated(t.x,t.y,height+12,wide),to=elevated(target.x,target.y,8,wide);c.lineCap='round';for(const [width,col]of [[12,'#ffd56c22'],[5,'#ffdb7999'],[2,'#fff2b9']]as const){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke()}lightPool(c,to.x,to.y,24,'#ffdb79',.75,1)
    if(!reducedMotion){const k=(time*2)%1;lightPool(c,from.x+(to.x-from.x)*k,from.y+(to.y-from.y)*k,13,'#fff1b5',.8,1)}
  }
  const home=s.level.def.home
  upright(c,home.x,home.y,wide,()=>{
  if(s.sky.night)lightPool(c,home.x,home.y,100,'#ffcb73',.85)
  block(c,home.x,home.y+7,58,36,9,'#487b87','#a1cdc5','#2e5367');block(c,home.x,home.y,31,25,65);windows(c,home.x,home.y,31,65,4,s.lives>0)
  block(c,home.x,home.y-67,46,32,22,'#cc9865','#f1ce8e','#7e6461');windows(c,home.x,home.y-67,46,22,1,s.lives>0);block(c,home.x,home.y-91,34,24,5,'#377485','#8ccecb','#254957')
  if(s.lives>0){const pulse=reducedMotion?0:Math.sin(time*1.8)*.08;lightPool(c,home.x,home.y-81,40,'#ffdc80',(s.sky.night?.75:.25)+pulse,1)}
  })
  const sky=s.sky
  if(sky.weather==='mist'){c.fillStyle=sky.night?'#bddeef0c':'#f2ffe921';for(let i=0;i<4;i++){const drift=reducedMotion?0:Math.sin(time*.15+i)*30;c.beginPath();c.ellipse(160+i*120+drift,120+i*180,240,40,0,0,Math.PI*2);c.fill()}}
  if(sky.weather==='rain'&&!reducedMotion){c.strokeStyle=sky.night?'#b4e2ee66':'#2c6e7d55';c.lineWidth=1;for(let i=0;i<36;i++){const x=(i*173+time*12)%720,y=(i*97+time*160)%840;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+12);c.stroke()}}
  if(sky.weather==='breeze'&&!reducedMotion){c.fillStyle='#ffd594b0';for(let i=0;i<7;i++){const x=(i*173+time*28)%720,y=80+i*105+Math.sin(time+i)*7;c.save();c.translate(x,y);c.rotate(time+i);c.fillRect(-3,-1,6,2);c.restore()}}
  if(!s.waveActive)for(const source of s.level.def.sources){if(source.openWave>s.planningWave&&source.id!=='west')continue;const p=s.level.segs.get(source.seg)!.line.at(0,{x:0,y:0,tx:0,ty:0});c.fillStyle=sky.night?'#d8efde':'#244f5b';c.font=`550 ${Math.max(15,10/scale)}px "DM Sans Variable",sans-serif`;c.textAlign=source.id==='west'?'left':'center';upright(c,p.x,p.y,wide,()=>c.fillText(source.id==='west'?(s.planningWave<source.openWave?'Opens · wave '+source.openWave:'Side inlet'):'Main inlet',p.x,p.y-44))}
}

const icons=new Map<string,string>()
export function fixedEnemyIcon(id:EnemyId){
  const key=id+':'+currentPalette();if(icons.has(key))return icons.get(key)!
  const cv=document.createElement('canvas');cv.width=96;cv.height=96;const c=cv.getContext('2d')!,def=ENEMIES[id]
  const k=Math.min(1.7,78/(def.radius*(def.boss?1.1:1.32)*(id==='gloom'?4.6:id==='reedling'?3.8:3.6)));c.translate(48,id==='reedling'?66:60);c.scale(k,k)
  drawFixedEnemy(c,{x:0,y:0,def,hp:1,maxHp:1,shell:def.shell??0,maxShell:def.shell??0,uid:0,age:0,hitT:0,heatT:0,stunT:0,tx:1,ty:0,visScale:1,revealedPerm:true,seenT:0,shrouded:false,slowT:0}as Enemy,true,false)
  const url=cv.toDataURL();icons.set(key,url);return url
}
