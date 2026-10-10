import type {Sim} from '../game/sim'
import {upright} from './board-view'

/** A planning layer uses real spawn groups and real canal geometry. */
export function drawThreatMap(c:CanvasRenderingContext2D,s:Sim,wave:number,wide:boolean,scale:number,labels=false){
 const groups=s.waveDef(wave).groups
 c.save();c.lineCap='round';c.lineJoin='round'
 for(const source of s.level.def.sources){
  const incoming=groups.filter(g=>(g.src??'north')===source.id)
  if(!incoming.length)continue
  const seg=s.level.segs.get(source.seg);if(!seg)continue
  const side=source.id==='west',colour=side?'#ecc594':'#a1dfdf'
  if(!labels){c.strokeStyle=colour;c.lineWidth=5;c.setLineDash([10,7]);c.beginPath()
  for(let at=0;at<=Math.min(seg.line.length,280);at+=5){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});at?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)}c.stroke();c.setLineDash([])
  for(const at of [55,125,195]){if(at>seg.line.length)continue;const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.ty,p.tx));c.fillStyle=colour;c.beginPath();c.moveTo(9,0);c.lineTo(-6,-6);c.lineTo(-3,0);c.lineTo(-6,6);c.closePath();c.fill();c.restore()}continue}
  const p=seg.line.at(Math.min(45,seg.line.length),{x:0,y:0,tx:0,ty:0}),count=incoming.reduce((a,g)=>a+g.count,0)
  upright(c,p.x,p.y,wide,()=>{
   const text=`${side?'SIDE':'NORTH'} · ${count}`,font=Math.max(17,11/scale)
   c.font=`650 ${font}px "DM Sans Variable",sans-serif`;const w=c.measureText(text).width+20
   const x=p.x+(side?25:55),y=p.y-48
   c.strokeStyle=colour;c.lineWidth=1.5;c.beginPath();c.moveTo(p.x,p.y-6);c.lineTo(x+6,y+11);c.stroke()
   c.fillStyle='#0c2535f2';c.strokeStyle=colour;c.lineWidth=1.5;c.beginPath();c.roundRect(x,y-font,w,font+14,4);c.fill();c.stroke();c.fillStyle=colour;c.textAlign='left';c.fillText(text,x+10,y+2)
  })
 }
 c.restore()
}
