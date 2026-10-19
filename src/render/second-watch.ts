import {bossReadout} from '../game/boss-readout'
import type { Sim } from '../game/sim'
import { secondWatch, designatedTarget } from '../game/second-watch'
import { commandTargets,commandTower } from '../game/watch-director'
import { upright } from './board-view'
import { block, lightPool } from './architecture'

/** Persistent construction and targeting share the simulation's actual positions. */
export function drawSecondWatch(c:CanvasRenderingContext2D,s:Sim,time:number,still:boolean,wide:boolean,signals=false,scale=1){
  if(!secondWatch(s.challenge))return
  c.save()
  if(!signals&&s.director?.passage==='convoy'){
    const p=s.pads[12]
    upright(c,p.x,p.y,wide,()=>{
      block(c,p.x,p.y+4,78,46,7,'#4c666c','#96a18c','#223f50')
      c.strokeStyle='#c6af7d';c.lineWidth=2
      for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(p.x+i*10,p.y-14);c.lineTo(p.x+i*10+10,p.y+15);c.stroke()}
      for(const dx of [-39,39]){block(c,p.x+dx,p.y-8,6,6,15,'#566964','#c7ae75');lightPool(c,p.x+dx,p.y-24,13,'#ffdb94',s.sky.night?.5:.15,1)}
    })
  }
  if(!signals&&s.director?.passage==='runners'){
    const seg=s.level.segs.get('inlet')!,p=seg.line.at(seg.line.length*.15,{x:0,y:0,tx:0,ty:0})
    for(const side of [-1,1]){const x=p.x-p.ty*37*side,y=p.y+p.tx*37*side;upright(c,x,y,wide,()=>{block(c,x,y,14,13,25,'#385563','#a6b6a1');c.strokeStyle='#d2b276';c.lineWidth=3;c.beginPath();c.arc(x,y-24,9,0,Math.PI*2);c.stroke()})}
  }
  if(!signals){c.restore();return}
  const owner=commandTower(s),phase=s.director?.command?.phase
  if(owner&&phase&&phase!=='spent'){
    // Mark the actual weapon that is giving up its normal fire for a command.
    // Four brass corners remain visible without adding another combat label.
    const r=34,pulse=still?1:.8+Math.sin(time*3)*.2
    c.strokeStyle=phase==='held'?'#ffe5ad':'#b4d4d7';c.lineWidth=phase==='held'?3:2;c.globalAlpha=pulse
    for(const sx of [-1,1])for(const sy of [-1,1]){c.beginPath();c.moveTo(owner.x+sx*(r-10),owner.y+sy*r);c.lineTo(owner.x+sx*r,owner.y+sy*r);c.lineTo(owner.x+sx*r,owner.y+sy*(r-10));c.stroke()}
    c.globalAlpha=1
  }
  // One actual counter outcome, anchored to the affected creature.
  if(s.challenge.siege===2&&s.wave<=3){
    const proof=s.enemies.find(e=>e.alive&&(e.slowT>0||e.maxShell>0&&e.shell<e.maxShell*.5))
    if(proof)upright(c,proof.x,proof.y,wide,()=>{const label=proof.maxShell>0&&proof.shell<proof.maxShell*.5?(proof.shell<=0?'ARMOUR BROKEN':'ARMOUR CRACKED'):'SLOWED';c.font=`700 ${Math.max(12,10/scale)}px sans-serif`;c.textAlign='center';c.lineWidth=5;c.strokeStyle='#102430';c.fillStyle='#cffff0';c.strokeText(label,proof.x,proof.y-proof.def.radius*2-20);c.fillText(label,proof.x,proof.y-proof.def.radius*2-20)})
  }
  for(const boss of s.enemies){
    if(boss.alive&&boss.def.boss){const read=bossReadout(s,boss);upright(c,boss.x,boss.y,wide,()=>{
      const y=boss.y-boss.def.radius*2.8-20,font=Math.max(13,10/scale);c.font=`750 ${font}px sans-serif`;c.textAlign='center';const w=c.measureText(read.label).width+16
      c.fillStyle='#0a1c29';c.fillRect(boss.x-w/2,y-font,w,font+8);c.fillStyle=read.colour;c.fillRect(boss.x-w/2,y+7,w,2/scale);c.fillText(read.label,boss.x,y)
    })}

    if(boss.alive&&boss.def.boss&&(boss.signalT??0)>0){
      const r=Math.max(46,boss.def.radius*1.3),arc=-Math.PI/2+Math.PI*2*Math.min(1,boss.signalT!/3)
      c.strokeStyle='#101e2a';c.lineWidth=7;c.beginPath();c.arc(boss.x,boss.y,r,-Math.PI/2,arc);c.stroke()
      c.strokeStyle='#ffb36c';c.lineWidth=3;c.stroke()
    }
    if(!boss.alive||!boss.channelLink||(boss.signalT??0)<=0)continue
    const escort=s.enemies.find(e=>e.alive&&e.uid===boss.channelLink);if(!escort)continue
    c.strokeStyle='#182e32';c.lineWidth=7;c.beginPath();c.moveTo(boss.x,boss.y);c.lineTo(escort.x,escort.y);c.stroke()
    c.strokeStyle='#dce99c';c.lineWidth=2.5;c.setLineDash([9,5]);c.lineDashOffset=still?0:-time*24;c.stroke();c.setLineDash([])
    c.strokeStyle='#fff0b6';c.lineWidth=2.5;c.beginPath();c.arc(escort.x,escort.y,escort.def.radius+10,0,Math.PI*2);c.stroke()
    upright(c,escort.x,escort.y,wide,()=>{c.font=`650 ${Math.max(12,10/scale)}px "DM Sans Variable",sans-serif`;c.textAlign='center';c.fillStyle='#fff0b6';c.strokeStyle='#102733';c.lineWidth=5;c.strokeText('BREAK TETHER',escort.x,escort.y-escort.def.radius*2-15);c.fillText('BREAK TETHER',escort.x,escort.y-escort.def.radius*2-15)})
  }
  if(s.director?.command?.phase==='held'){
    const chosen=s.challenge.hero==='ivo'?designatedTarget(s):null
    for(const e of commandTargets(s)){
      const selected=s.challenge.hero!=='ivo'||chosen===e,r=e.def.radius+9
      if(!selected)continue
      c.strokeStyle=selected?'#ffe2a0':'#9cb8ba80';c.lineWidth=selected?3:1.5
      for(const side of [-1,1]){c.beginPath();c.moveTo(e.x+side*(r-7),e.y-r);c.lineTo(e.x+side*r,e.y-r);c.lineTo(e.x+side*r,e.y+r);c.lineTo(e.x+side*(r-7),e.y+r);c.stroke()}
    }
  }
  c.restore()
}
