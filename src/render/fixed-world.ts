import {heartLantern} from './canal-art'
import {lowerBend,lowerGuard} from '../game/watch-mastery'
import {MOON_ARCHES,hasMoonArches,commandTower} from '../game/watch-director'
import {drawCanalShot,drawCanalBeam} from './shot-art'
import { escortCover } from '../game/living-watch'
import { upright, boardAngle } from './board-view'
import type { Sim, Enemy, Tower } from '../game/sim'
import { ENEMIES, type EnemyId } from '../game/defs'
import type { ViewState } from './renderer'
import { drawFixedTower, TOWER_COLOURS } from './fixed-towers'
import { drawFixedEnemy } from './fixed-enemies'
import {drawThreatMap} from './threat-map'
import { currentPalette } from './palette'
import { block, setArchitectureLight, lightPool } from './architecture'

import { scenery, movingWater, livingDistrict } from './fixed-scenery'
import { DREDGER_BENDS, DREDGER_WINDOW } from '../game/watch-craft'
import { drawLandmark, drawSunReserves } from './watch-depth'
import { drawSecondWatch } from './second-watch'

const arrivals=new WeakMap<Tower,{born:number;upgrade:number;lastUpgrade:number;fire:number;shot:number;angle:number;frame:number}>()
const lightChanges=new WeakMap<Sim,{canvas:HTMLCanvasElement;previous:HTMLCanvasElement|null;at:number;wide:boolean}>()
/** The highlighted water uses the same two range checks as Bond activation. */
function sharedWater(c:CanvasRenderingContext2D,s:Sim,a:Tower,b:Tower){
  const ar=s.effRange(a),br=s.effRange(b)
  c.save();c.lineCap='round'
  for(const [width,colour] of [[13,'#76ffe14d'],[4,'#c3fff3']] as const){
    c.lineWidth=width;c.strokeStyle=colour
    for(const seg of s.level.segs.values()){
      if(seg.id==='inlet'&&s.planningWave<(s.level.def.sources.find(q=>q.id==='west')?.openWave??99))continue
      let drawing=false;c.beginPath()
      for(let at=0;at<=seg.line.length;at+=4){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),covered=Math.hypot(p.x-a.x,p.y-a.y)<=ar&&Math.hypot(p.x-b.x,p.y-b.y)<=br;if(covered){if(drawing)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y)}drawing=covered}
      c.stroke()
    }
  }
  c.restore()
}
export function drawFixedWorld(c:CanvasRenderingContext2D,s:Sim,view:ViewState,stage:number,keepsakes:readonly string[],crest:string,scale:number,reducedMotion=false,time=0,wide=false){
  setArchitectureLight(c,!s.sky.night)
  const scene=scenery(s,stage,keepsakes,wide);let light=lightChanges.get(s)
  if(!light||light.wide!==wide){light={canvas:scene,previous:null,at:time,wide};lightChanges.set(s,light)}
  else if(light.canvas!==scene){light.previous=light.canvas;light.canvas=scene;light.at=time}
  if(light.previous&&!reducedMotion&&time-light.at<2){
    const mix=(time-light.at)/2;c.save();c.globalAlpha=1-mix;c.drawImage(light.previous,-50,-140,920,1070);c.globalAlpha=mix;c.drawImage(scene,-50,-140,920,1070);c.restore()
  }else{light.previous=null;c.drawImage(scene,-50,-140,920,1070)}
  movingWater(c,s,reducedMotion?0:time)
  livingDistrict(c,s,time,reducedMotion,keepsakes,wide)
  drawLandmark(c,s,time,reducedMotion,wide)
  drawSunReserves(c,s,reducedMotion,wide)
  drawSecondWatch(c,s,time,reducedMotion,wide)
  if(view.forecastWave)drawThreatMap(c,s,view.forecastWave,wide,scale)
  if(hasMoonArches(s.challenge)&&(!s.challenge.siege||s.planningWave>=17))for(const arch of MOON_ARCHES){
    const seg=s.level.segs.get(arch.seg)!,p=seg.line.at(seg.line.length*arch.fraction,{x:0,y:0,tx:0,ty:0}),nx=-p.ty,ny=p.tx
    c.save();c.strokeStyle='#b1e7e2';c.lineWidth=3;c.shadowColor='#b5ffef';c.shadowBlur=reducedMotion?0:8
    c.beginPath();c.moveTo(p.x+nx*29,p.y+ny*29);c.lineTo(p.x-nx*29,p.y-ny*29);c.stroke();c.shadowBlur=0
    lightPool(c,p.x,p.y,42,'#b7ece5',.23,1)
    for(const side of [-1,1]){const x=p.x+nx*35*side,y=p.y+ny*35*side;upright(c,x,y,wide,()=>{block(c,x,y,12,12,25,'#527e89','#b4d8d0');lightPool(c,x,y-28,17,'#c5fff0',.6,1);c.fillStyle='#e5fff3';c.fillRect(x-3,y-32,6,8)})}
    if(!s.waveActive)upright(c,p.x,p.y,wide,()=>{c.font='600 11px "DM Sans Variable",sans-serif';c.textAlign='center';c.fillStyle=s.sky.night?'#d4fff2':'#204b5d';c.fillText('REVEALS · 6s',p.x,p.y-40)})
    c.restore()
  }
  const held=s.director?.command?.phase==='held'?commandTower(s):null
  if(held){c.save();c.strokeStyle=s.challenge.hero==='sol'?'#ffd196':'#bff4ed';c.fillStyle=s.challenge.hero==='sol'?'#ffc1700c':'#bff4ed0c';c.lineWidth=2;c.setLineDash([9,7]);c.lineDashOffset=reducedMotion?0:-time*15;c.beginPath();c.arc(held.x,held.y,s.effRange(held),0,Math.PI*2);c.fill();c.stroke();c.restore()}
  if(s.challenge.contract==='last-lantern'){
    const p=lowerBend(s),g=lowerGuard(s);c.save();c.strokeStyle=g.damage>=2&&g.scouts>=1?'#c8fff0':'#c6cbe9';c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.arc(p.x,p.y,25,0,Math.PI*2);c.stroke();c.setLineDash([])
    upright(c,p.x,p.y,wide,()=>{c.font='600 11px "DM Sans Variable",sans-serif';c.textAlign='center';c.fillStyle=s.sky.night?'#d5edf5':'#2a485c';c.fillText('LAST LANTERN',p.x,p.y+43)});c.restore()
  }
  if(s.challenge.watchCraft&&(s.challenge.expedition==='sunforge'&&s.planningWave>=10||(!!s.challenge.story||!!s.challenge.siege)&&s.waveDef(Math.min(s.finalWave,s.planningWave)).groups.some(g=>g.type==='dredger'))){
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
  const ghost=view.selection?.kind==='pad'&&view.preview?s.previewTower(view.selection.index,view.preview):null
  if(s.challenge.watchTactics&&selected){const bond=s.bonds.find(b=>b.a===selected.uid||b.b===selected.uid),partner=bond&&s.towers.find(t=>t.uid===(bond.a===selected.uid?bond.b:bond.a));if(partner)sharedWater(c,s,selected,partner)}
  if(ghost){
    const reach=s.effRange(ghost),night=s.nightRange(ghost)
    c.save();c.strokeStyle='#ffe5a1';c.fillStyle='#ffe5a115';c.lineWidth=2;c.beginPath();c.arc(ghost.x,ghost.y,reach,0,Math.PI*2);c.fill();c.stroke()
    if(Math.abs(night-reach)>3){c.setLineDash([5,5]);c.strokeStyle='#b699df';c.beginPath();c.arc(ghost.x,ghost.y,night,0,Math.PI*2);c.stroke();c.setLineDash([])}
    c.strokeStyle='#ffe5a1';c.lineWidth=7;c.lineCap='round'
    for(const seg of s.level.segs.values()){
      if(seg.id==='inlet'&&s.planningWave<(s.level.def.sources.find(q=>q.id==='west')?.openWave??99))continue
      let drawing=false;c.beginPath()
      for(let at=0;at<=seg.line.length;at+=5){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),covered=Math.hypot(p.x-ghost.x,p.y-ghost.y)<=reach;if(covered){if(drawing)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y)}drawing=covered}c.stroke()
    }
    const partner=s.previewBond(ghost.pad,ghost.id);if(partner){if(s.challenge.watchTactics)sharedWater(c,s,ghost,partner);c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.moveTo(ghost.x,ghost.y);c.lineTo(partner.x,partner.y);c.stroke();c.setLineDash([])}
    c.globalAlpha=.7;upright(c,ghost.x,ghost.y,wide,()=>drawFixedTower(c,ghost.x,ghost.y,{id:ghost.id,a:0,b:0,hero:s.challenge.hero,time:0,age:9,since:9,reducedMotion:true}));c.restore()
  }
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
  // The beacon belongs in the same depth order as towers and creatures.
  const home=s.level.def.home
  const sprites=[...s.towers.map(t=>({x:t.x,y:t.y,t,e:null})),...s.enemies.filter(e=>e.alive).map(e=>({x:e.x,y:e.y,t:null,e})),{x:home.x,y:home.y,t:null,e:null}].sort((a,b)=>wide?b.x-a.x:a.y-b.y)
  for(const item of sprites){
    if(item.t){const t=item.t;let a=arrivals.get(t);if(!a){a={born:s.time-t.bornT<.2?time:-9,upgrade:-9,lastUpgrade:t.upT,fire:t.fireT,shot:s.time-t.fireT<.2?time:-9,angle:t.angle,frame:time};arrivals.set(t,a)}if(a.lastUpgrade!==t.upT){a.lastUpgrade=t.upT;a.upgrade=time}
      if(a.fire!==t.fireT){a.fire=t.fireT;a.shot=time}
      const turn=Math.atan2(Math.sin(t.angle-a.angle),Math.cos(t.angle-a.angle));a.angle+=turn*Math.min(1,(time-a.frame)*18);a.frame=time
      if(s.waveActive&&(held===t||s.mastery?.surge?.tower===t.uid&&['held','release'].includes(s.mastery.surge.phase))){upright(c,t.x,t.y,wide,()=>{c.save();const y=t.y-70,col=s.challenge.hero==='sol'?'#ffd196':'#b9f5ff';lightPool(c,t.x,y,33,col,.5,1);c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.ellipse(t.x,y,23,9,reducedMotion?0:Math.sin(time)*.2,0,Math.PI*2);c.stroke();c.restore()})}
      upright(c,t.x,t.y,wide,()=>drawFixedTower(c,t.x,t.y,{...t,angle:boardAngle(reducedMotion?t.angle:a.angle,wide),crest,hero:s.challenge.hero,mastery:keepsakes,firing:t.id==='beam'&&t.beamTargets.some(e=>e?.alive),volleyCharge:s.challenge.refinedWatch&&t.id==='storm'&&s.techniques.includes('capacitor')?t.tolls%3:undefined,charge:1-Math.max(0,t.cd)/t.stats.interval,time:reducedMotion?0:time,since:reducedMotion?9:time-a.shot,age:reducedMotion?9:time-a.born,upAge:reducedMotion?9:time-a.upgrade,reducedMotion}))
    }else if(item.e){const e=item.e;
      if((e.exposedT??0)>0){c.save();c.strokeStyle='#ffdf91';c.lineWidth=2.5;for(let i=0;i<3;i++){c.beginPath();c.arc(e.x,e.y,e.def.radius+10,i*Math.PI*2/3,i*Math.PI*2/3+1.25);c.stroke()}c.restore()}
      if(escortCover(s,e)){c.save();c.strokeStyle='#ffdda5aa';c.lineWidth=2.5;c.beginPath();c.arc(e.x,e.y,25,-Math.PI*.8,Math.PI*.1);c.stroke();c.restore()}
      upright(c,e.x,e.y,wide,()=>drawFixedEnemy(c,e,reducedMotion,true,wide,scale))}
    else upright(c,home.x,home.y,wide,()=>heartLantern(c,home.x,home.y,s.lives>0,s.sky.night,time,reducedMotion))
  }
  for(const p of s.projs){
    if(!p.alive)continue
    drawCanalShot(c,p,time,reducedMotion,wide)
  }
  for(const t of s.towers)if(t.id==='beam')for(const target of t.beamTargets)if(target?.alive)drawCanalBeam(c,t,target,time,reducedMotion,wide)
  drawSecondWatch(c,s,time,reducedMotion,wide,true)
  const breach=s.lastLeak?.detail
  if(breach&&(!s.waveActive||s.over)&&!selected&&!ghost){upright(c,breach.x,breach.y,wide,()=>{c.save();c.fillStyle='#372c35';c.strokeStyle='#ffbe8e';c.lineWidth=2;c.beginPath();c.arc(breach.x,breach.y,16,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#ffe5c2';c.font='bold 20px sans-serif';c.textAlign='center';c.fillText('!',breach.x,breach.y+7);c.restore()})}
  const sky=s.sky
  if(sky.weather==='mist')for(let i=0;i<4;i++){const drift=reducedMotion?0:Math.sin(time*.15+i)*30;lightPool(c,160+i*120+drift,120+i*180,260,sky.night?'#bddeef':'#f2ffe9',sky.night?.08:.1,.2)}
  if(sky.weather==='rain'&&!reducedMotion){c.strokeStyle=sky.night?'#b4e2ee66':'#2c6e7d55';c.lineWidth=1;for(let i=0;i<36;i++){const x=(i*173+time*12)%720,y=(i*97+time*160)%840;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+12);c.stroke()}}
  if(sky.weather==='breeze'&&!reducedMotion){c.fillStyle='#ffd594b0';for(let i=0;i<7;i++){const x=(i*173+time*28)%720,y=80+i*105+Math.sin(time+i)*7;c.save();c.translate(x,y);c.rotate(time+i);c.fillRect(-3,-1,6,2);c.restore()}}
  if(!s.waveActive)for(const source of s.level.def.sources){if(source.openWave>s.finalWave||source.openWave>s.planningWave&&source.id!=='west')continue;const p=s.level.segs.get(source.seg)!.line.at(0,{x:0,y:0,tx:0,ty:0});c.fillStyle=sky.night?'#d8efde':'#244f5b';c.font=`550 ${Math.max(15,10/scale)}px "DM Sans Variable",sans-serif`;c.textAlign=source.id==='west'?'left':'center';upright(c,p.x,p.y,wide,()=>c.fillText(source.id==='west'?(s.planningWave<source.openWave?'Opens · wave '+source.openWave:'Side inlet'):'Main inlet',p.x,p.y-44))}
}

const icons=new Map<string,string>()
export function fixedEnemyIcon(id:EnemyId){
  const key=id+':'+currentPalette();if(icons.has(key))return icons.get(key)!
  const raw=document.createElement('canvas');raw.width=raw.height=640;const c=raw.getContext('2d')!,def=ENEMIES[id],detail=Math.min(12,150/(def.radius*(def.boss?1.16:1.42)));c.translate(320,400);c.scale(detail,detail)
  drawFixedEnemy(c,{x:0,y:0,def,hp:1,maxHp:1,shell:def.shell??0,maxShell:def.shell??0,uid:0,age:0,hitT:0,heatT:0,stunT:0,tx:1,ty:0,visScale:1,revealedPerm:true,seenT:0,shrouded:false,slowT:0}as Enemy,true,false)
  // Render small swarm anatomy large first, then fit the full silhouette. The
  // 320px result covers the guide's 132px portraits on high-density screens.
  const data=c.getImageData(0,0,640,640).data;let left=640,top=640,right=0,bottom=0
  for(let y=0;y<640;y++)for(let x=0;x<640;x++)if(data[(y*640+x)*4+3]>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
  const w=right-left+3,h=bottom-top+3,k=Math.min(272/w,272/h),cv=document.createElement('canvas');cv.width=cv.height=320
  cv.getContext('2d')!.drawImage(raw,left-1,top-1,w,h,160-w*k/2,160-h*k/2,w*k,h*k)
  const url=cv.toDataURL();icons.set(key,url);return url
}
