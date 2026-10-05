import type {Enemy,Proj,Tower} from '../game/sim'
import {boardPoint,elevated,upright,worldPoint} from './board-view'
import {fixedShotOrigin,TOWER_COLOURS} from './fixed-towers'
import {lightPool,polygon} from './architecture'
import {line,oval} from './miniature-art'

/** Lobbed rounds lift vertically in either camera. Straight shots keep the
 * simulation's contact plane so their visible tip still meets the hit flash. */
export function shotPose(p:Proj,wide:boolean){
 const lob=p.kind==='firework'||p.kind==='mini'
 if(!lob){const at=elevated(p.x,p.y,8,wide),v=boardPoint(p.vx,p.vy,wide);return {...at,angle:Math.atan2(v.y,v.x)}}
 const k=Math.max(0,Math.min(1,p.t/Math.max(.001,p.dur))),small=p.kind==='mini'
 const socket=small?{x:0,y:-8}:fixedShotOrigin(p.tower),sx=small?p.sx:p.tower.x,sy=small?p.sy:p.tower.y,arc=small?30:70
 const offset=worldPoint(socket.x*(1-k),socket.y*(1-k)-8*k-Math.sin(k*Math.PI)*arc,wide)
 const v=boardPoint(p.ex-sx,p.ey-sy,wide)
 return {x:sx+(p.ex-sx)*k+offset.x,y:sy+(p.ey-sy)*k+offset.y,angle:Math.atan2(v.y-socket.y-8-Math.cos(k*Math.PI)*Math.PI*arc,v.x-socket.x)}
}

/** A focused sun lance: bright core, two narrow energy filaments and a contact lens. */
export function drawCanalBeam(c:CanvasRenderingContext2D,t:Tower,target:Enemy,time:number,reduced:boolean,wide:boolean){
 const source=fixedShotOrigin(t),offset=worldPoint(source.x,source.y,wide),from={x:t.x+offset.x,y:t.y+offset.y},to=elevated(target.x,target.y,8,wide)
 const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len
 c.save();c.lineCap='round'
 for(const [width,col]of [[10,'#ffd56c20'],[4,'#ffc46b99'],[1.65,'#fff6d1']]as const){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke()}
 if(!reduced){
  for(const side of [-1,1]){c.strokeStyle=side<0?'#ffe7a58c':'#eab77799';c.lineWidth=.7;c.beginPath();for(let i=0;i<=12;i++){const u=i/12,sway=Math.sin(u*Math.PI)*Math.sin(u*18-time*9)*2.5*side,x=from.x+dx*u+nx*sway,y=from.y+dy*u+ny*sway;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
  const u=(time*1.7)%1;lightPool(c,from.x+dx*u,from.y+dy*u,8,'#fff4c0',.55,1)
 }
 lightPool(c,to.x,to.y,reduced?13:20,'#ffe0a0',reduced?.35:.65,1)
 upright(c,to.x,to.y,wide,()=>{c.strokeStyle='#fff4ce';c.lineWidth=1;c.beginPath();c.ellipse(to.x,to.y,3.2,4.6,0,0,Math.PI*2);c.stroke()});c.restore()
}

export function drawCanalShot(c:CanvasRenderingContext2D,p:Proj,time:number,reduced:boolean,wide:boolean){
 const pose=shotPose(p,wide),colour=p.beacon?'#aaffed':TOWER_COLOURS[p.tower.id].accent,lob=p.kind==='firework'||p.kind==='mini'
 if(lob){
  const u=Math.min(1,p.t/Math.max(.001,p.dur)),x=p.sx+(p.ex-p.sx)*u,y=p.sy+(p.ey-p.sy)*u
  c.save();c.globalAlpha*=.28;upright(c,x,y,wide,()=>oval(c,x,y,4+(p.heavy?2:0),2,'#081e2b'));c.restore()
 }
 // Sample the authored ballistic arc, not a straight smoke line across its bend.
 // Six short segments are the entire trail budget; no particle history is retained.
 if(lob&&!reduced){
  c.save();c.lineCap='round';let last=pose
  for(let i=1;i<=6;i++){const at=shotPose({...p,t:Math.max(0,p.t-i*.018)},wide),alpha=(1-i/7)*.65;c.globalAlpha=alpha;c.strokeStyle=i<3?'#ffe9ab':'#df8669';c.lineWidth=Math.max(.7,(p.heavy?4.5:3.2)*(1-i/8));c.beginPath();c.moveTo(last.x,last.y);c.lineTo(at.x,at.y);c.stroke();last=at}c.restore()
 }
 upright(c,pose.x,pose.y,wide,()=>{
  c.save();c.translate(pose.x,pose.y);c.rotate(pose.angle)
  const tail=reduced?8:p.kind==='bolt'?32:p.kind==='rocket'?27:lob?11:23
  if(!lob){const g=c.createLinearGradient(-tail,0,5,0);g.addColorStop(0,colour+'00');g.addColorStop(.6,colour+'65');g.addColorStop(1,colour);c.fillStyle=g;c.beginPath();c.moveTo(-tail,0);c.quadraticCurveTo(-8,-4.5,4,0);c.quadraticCurveTo(-8,4.5,-tail,0);c.fill()}
  lightPool(c,0,0,p.heavy?13:8,colour,.4,1)
  if(p.kind==='bolt'){
   if(p.beacon){line(c,[[-34,-3],[11,-3]],'#aaffed',1.5);line(c,[[-34,3],[11,3]],'#aaffed',1.5);lightPool(c,4,0,18,'#d8fff2',.55,1)}
   line(c,[[-20,0],[3,0]],'#172e38',4);line(c,[[-20,-.6],[3,-.6]],'#f0d39e',1.8)
   for(const side of [-1,1]){polygon(c,[[-12,0],[-21,side*4],[-18,0]],side<0?'#d0e8d9':'#5f9388');line(c,[[-19,side*2],[-12,0]],'#f9f0c7',.5)}
   polygon(c,[[9,0],[0,-4],[2,0],[0,4]],'#b7d9d4');polygon(c,[[9,0],[0,-4],[2,0]],'#fff7d9');line(c,[[-tail,0],[-22,0]],'#e6fff5',.7)
  }else if(p.kind==='feather'||p.kind==='moth'){
   const wing=reduced?4:3+Math.abs(Math.sin(time*28))*3.5
   for(const side of [-1,1]){polygon(c,[[5,0],[-5,side*wing],[-3,side*wing*.4],[-11,side*wing*.58],[-6,0]],side<0?'#edf5bd':'#6ea993');line(c,[[-9,side*wing*.4],[5,0]],'#e7f6c3',.7)}
   polygon(c,[[8,0],[-3,-1],[-6,0],[-3,1]],'#fff8d5')
   if(!reduced)for(const side of [-1,1]){c.strokeStyle='#c4eea888';c.lineWidth=.7;c.beginPath();c.moveTo(-7,side*2);c.quadraticCurveTo(-13,side*5,-22,side*(3+Math.sin(time*13)));c.stroke()}
  }else if(p.kind==='rocket'){
   const flame=reduced?8:14+Math.sin(time*49)*4
   polygon(c,[[-6,-2],[-13,-3],[-10,0],[-9-flame,0],[-13,3],[-6,2]],'#f19960');polygon(c,[[-6,-1.3],[-15-flame*.4,0],[-6,1.3]],'#fff2c4')
   polygon(c,[[9,0],[2,-3.5],[-7,-3.5],[-7,3.5],[2,3.5]],'#b88364');polygon(c,[[9,0],[2,-3.5],[2,3.5]],'#ffe0a3');line(c,[[-5,-2],[2,-2]],'#f8e3b6',1)
   for(const side of [-1,1])polygon(c,[[-4,side*2],[-10,side*6],[-8,0]],side<0?'#c9d7c5':'#608a8e')
  }else if(lob){
   const r=p.heavy?5:3.8;oval(c,0,0,r*1.15,r,'#483b45','#edc78f');polygon(c,[[r,0],[1,-r],[-2,-r],[-2,r],[1,r]],'#cb8d64');line(c,[[0,-r+.5],[0,r-.5]],'#ffedba',1.4);line(c,[[1,-r+1],[r-1,-.6]],'#fff7d7',.8)
   polygon(c,[[-r,-2],[-r-5,-3],[-r-3,0],[-r-5,3],[-r,2]],'#a3b9b0');oval(c,-r-2,0,2.1,1.1,'#fff3bf')
  }else{
   const r=p.heavy?4:2.8
   polygon(c,[[6,0],[-2,-r],[-10,-r*.3],[-tail,0],[-9,r*.45],[-2,r]],'#f9b668');polygon(c,[[5,0],[-2,-r*.5],[-13,0],[-2,r*.5]],'#fff9d6')
   if(!reduced){c.strokeStyle='#ffeab4';c.lineWidth=.8;c.beginPath();c.moveTo(-4,-2);c.quadraticCurveTo(-11,-4-Math.sin(time*33),-18,-1);c.stroke()}
  }
  c.restore()
 })
}
