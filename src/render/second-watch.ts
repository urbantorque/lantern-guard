import type { Sim } from '../game/sim'
import { secondWatch, designatedTarget } from '../game/second-watch'
import { commandTargets } from '../game/watch-director'
import { upright } from './board-view'
import { block, lightPool } from './architecture'

/** Persistent construction and targeting share the simulation's actual positions. */
export function drawSecondWatch(c:CanvasRenderingContext2D,s:Sim,time:number,still:boolean,wide:boolean,signals=false){
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
  for(const boss of s.enemies){
    if(!boss.alive||!boss.channelLink||(boss.signalT??0)<=0)continue
    const escort=s.enemies.find(e=>e.alive&&e.uid===boss.channelLink);if(!escort)continue
    c.strokeStyle='#182e32';c.lineWidth=7;c.beginPath();c.moveTo(boss.x,boss.y);c.lineTo(escort.x,escort.y);c.stroke()
    c.strokeStyle='#dce99c';c.lineWidth=2.5;c.setLineDash([9,5]);c.lineDashOffset=still?0:-time*24;c.stroke();c.setLineDash([])
    c.strokeStyle='#fff0b6';c.lineWidth=2.5;c.beginPath();c.arc(escort.x,escort.y,escort.def.radius+10,0,Math.PI*2);c.stroke()
    upright(c,escort.x,escort.y,wide,()=>{c.font='600 12px "DM Sans Variable",sans-serif';c.textAlign='center';c.fillStyle='#fff0b6';c.strokeStyle='#102733';c.lineWidth=4;c.strokeText('BREAK TETHER',escort.x,escort.y-escort.def.radius*2-15);c.fillText('BREAK TETHER',escort.x,escort.y-escort.def.radius*2-15)})
  }
  if(s.director?.command?.phase==='held'){
    const chosen=s.challenge.hero==='ivo'?designatedTarget(s):null
    for(const e of commandTargets(s)){
      const selected=s.challenge.hero!=='ivo'||chosen===e,r=e.def.radius+9
      c.strokeStyle=selected?'#ffe2a0':'#9cb8ba80';c.lineWidth=selected?3:1.5
      for(const side of [-1,1]){c.beginPath();c.moveTo(e.x+side*(r-7),e.y-r);c.lineTo(e.x+side*r,e.y-r);c.lineTo(e.x+side*r,e.y+r);c.lineTo(e.x+side*(r-7),e.y+r);c.stroke()}
    }
  }
  c.restore()
}
