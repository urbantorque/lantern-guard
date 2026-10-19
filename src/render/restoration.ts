import type {Sim} from '../game/sim'
import {RESTORATIONS} from '../game/restoration'
import {districtLayout} from './district-layout'
import {upright} from './board-view'
import {lightPool} from './architecture'

/** Focus the earned building in the real district. No camera movement or battlefield reset. */
export function drawRestoration(c:CanvasRenderingContext2D,s:Sim,wave:number,progress:number,wide:boolean,scale:number,still:boolean){
 const beat=RESTORATIONS[wave];if(!beat)return
 const homes=districtLayout(s).filter(p=>p.kind==='house'),index=beat.project==='observatory'?1:beat.project==='gardens'?2:0
 const p=beat.project==='beacon'?s.level.def.home:homes[index]??homes[0];if(!p)return
 const reveal=still?1:Math.min(1,progress*2),alpha=progress>.85?(1-progress)/.15:1
 c.save();c.globalAlpha=alpha
 lightPool(c,p.x,p.y-25,95+reveal*45,'#ffe2a1',.45,1)
 upright(c,p.x,p.y,wide,()=>{
  const y=p.y-105,font=Math.max(14,11/scale),text=beat.project==='beacon'?'THE CITY IS AWAKE':beat.project==='market'?'OPEN AGAIN':beat.project==='gardens'?'GARDENS RESTORED':'OBSERVATORY ALIGHT'
  c.font=`700 ${font}px sans-serif`;c.textAlign='center';c.strokeStyle='#0b2230';c.lineWidth=5;c.strokeText(text,p.x,y);c.fillStyle='#fff0bf';c.fillText(text,p.x,y)
  c.strokeStyle='#f6d590';c.lineWidth=2;c.beginPath();c.moveTo(p.x,y+8);c.lineTo(p.x,p.y-75);c.stroke()
 })
 if(wave===40){
  for(const seg of s.level.segs.values()){
   c.strokeStyle='#ffe5a2';c.lineWidth=3;c.globalAlpha=alpha*.6;c.beginPath()
   const end=seg.line.length*(still?1:Math.min(1,progress*1.5))
   for(let at=0;at<=end;at+=8){const q=seg.line.at(at,{x:0,y:0,tx:0,ty:0});if(at)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y)}c.stroke()
  }
 }
 c.restore()
}
