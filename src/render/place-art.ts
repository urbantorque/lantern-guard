import type {ProjectId} from '../game/district-projects'
import {lightPool,polygon} from './architecture'
import {BRASS,STONE,TAU,arch,gem,leaf,line,orb,oval,vessel,type Glaze} from './miniature-art'

const pottery:Glaze={front:'#709b91',roof:'#dddcbc',side:'#355c63',accent:'#d9e6bd'}
function flower(c:CanvasRenderingContext2D,x:number,y:number,col:string,open:boolean){
 line(c,[[x,y],[x,y-15]],'#6b9270',1.4);leaf(c,x,y-4,9,-.65,'#a5bc85');leaf(c,x,y-6,8,.7,'#80aa83')
 if(open){for(let i=0;i<5;i++)oval(c,x+Math.cos(i*TAU/5)*3.6,y-16+Math.sin(i*TAU/5)*3,3,2.4,col);oval(c,x,y-16,1.5,1.5,BRASS.roof)}else oval(c,x,y-14,2,3,'#688c77')
}

/** The same earned buildings appear in the district portrait and battlefield. */
export function drawProjectMiniature(c:CanvasRenderingContext2D,x:number,y:number,id:ProjectId,on:boolean,col:string,night:boolean){
 c.save();c.translate(x,y);const m={...pottery,front:on?pottery.front:'#526f70',roof:on?pottery.roof:'#95a99a'},accent=on?col:'#6b8986'
 oval(c,6,6,40,12,'#0d2c3938');vessel(c,0,3,36,12,6,STONE)
 if(on&&night)lightPool(c,0,-20,60,col,.35)
 if(id==='market'){
  vessel(c,0,-4,27,9,32,m)
  for(const dx of [-15,0,15])arch(c,dx,-9,7,18,on&&night?'#ffdfa2':'#274e54')
  polygon(c,[[-32,-39],[0,-61],[32,-39],[0,-31]],'#b88167');line(c,[[-32,-39],[0,-31],[32,-39]],BRASS.front,2)
  for(const dx of [-21,0,21]){
   vessel(c,dx,0,10,5,12,m);for(const side of [-1,1])line(c,[[dx+side*9,-6],[dx+side*9,-28]],BRASS.side,1.5)
   c.fillStyle=accent;c.beginPath();c.moveTo(dx-12,-27);c.quadraticCurveTo(dx,-35,dx+12,-27);c.lineTo(dx+12,-19);c.quadraticCurveTo(dx+8,-15,dx+4,-19);c.quadraticCurveTo(dx,-15,dx-4,-19);c.quadraticCurveTo(dx-8,-15,dx-12,-19);c.closePath();c.fill();line(c,[[dx-4,-28],[dx-4,-19]],'#fff0c477',2)
   if(on)for(let j=0;j<3;j++)orb(c,dx-5+j*5,-11,2.2,j%2?'#e8bf83':'#bfcd87','#697b60')
  }
  if(on){line(c,[[-33,-35],[0,-30],[33,-35]],'#f4d6a590',.8);for(let i=0;i<7;i++)orb(c,-30+i*10,-33+Math.sin(i*Math.PI/6)*3,1.6,BRASS.roof,BRASS.side)}
 }else if(id==='observatory'){
  vessel(c,0,-4,23,9,48,m);vessel(c,0,-50,29,10,5,BRASS)
  for(const dx of [-13,0,13]){arch(c,dx,-12,7,24,on&&night?'#f9dba3':'#284f59');line(c,[[dx-3,-24],[dx+3,-24]],m.side,1)}
  const g=c.createLinearGradient(-25,0,25,0);g.addColorStop(0,'#455f66');g.addColorStop(.4,accent);g.addColorStop(1,'#566b76');c.fillStyle=g;c.beginPath();c.ellipse(0,-55,25,23,0,Math.PI,TAU);c.fill()
  for(const side of [-1,1]){c.strokeStyle='#f3dfae77';c.lineWidth=1;c.beginPath();c.moveTo(0,-78);c.quadraticCurveTo(side*14,-69,side*16,-55);c.stroke()}
  gem(c,0,-80,3,BRASS);line(c,[[-30,-49],[30,-49]],BRASS.roof,1.5)
  for(const side of [-1,1]){line(c,[[side*28,-8],[side*28,-40]],BRASS.side,1.2);orb(c,side*28,-41,2.3,on?'#fbe0aa':'#718d89',BRASS.side)}
 }else{
  vessel(c,0,-4,29,10,9,m);oval(c,0,-15,27,9,'#46664e')
  for(let i=0;i<7;i++)flower(c,(i-3)*8,-14-Math.sin(i)*3,accent,on)
  c.strokeStyle=on?'#bfd9c291':'#748f8b';c.lineWidth=1.7;c.beginPath();c.ellipse(0,-34,30,28,0,Math.PI,TAU);c.lineTo(30,-12);c.stroke()
  c.beginPath();c.ellipse(0,-34,16,28,0,Math.PI,TAU);c.lineTo(16,-11);c.stroke();line(c,[[0,-62],[0,-8]],'#dddcc094',1.3)
  gem(c,0,-64,3,BRASS)
  for(const side of [-1,1]){vessel(c,side*30,0,7,4,8,BRASS);flower(c,side*30,-10,accent,on)}
 }
 c.restore()
}

export function projectDetails(c:CanvasRenderingContext2D,x:number,y:number,id:ProjectId,time:number,still:boolean){
 if(id!=='observatory')return
 c.save();c.translate(x,y-65);c.rotate(still?-.43:-.43+Math.sin(time*.2)*.2);line(c,[[-4,0],[24,0]],BRASS.side,9);line(c,[[0,-2],[22,-2]],BRASS.front,6);line(c,[[23,-3],[23,3]],BRASS.roof,3);oval(c,25,0,2,4,'#b8e9e0');c.restore()
}

export function drawLandmarkMiniature(c:CanvasRenderingContext2D,id:string,x:number,y:number,active:boolean,night:boolean,time:number,still:boolean){
 c.save();c.translate(x,y);vessel(c,0,2,25,9,4,STONE)
 const blue:Glaze={front:'#619ba0',roof:'#c3e7da',side:'#345f73',accent:'#abe8e4'}
 if(id==='moonwell'){
  vessel(c,0,-3,19,8,7,blue);oval(c,0,-11,16,6,active?'#9fe6df':'#397a8a');c.strokeStyle='#e2f4d3aa';c.lineWidth=1;c.beginPath();c.ellipse(0,-12,9,3,0,.3,5.8);c.stroke()
  for(const side of [-1,1]){leaf(c,side*20,-3,13,side*.6,'#87ac8b');line(c,[[side*13,-12],[side*13,-30]],BRASS.front,1.8)}
  c.strokeStyle=BRASS.roof;c.lineWidth=3;c.beginPath();c.arc(0,-33,10,.25,Math.PI*1.85);c.stroke();orb(c,3,-34,4,active?'#eefff0':'#bfd9d4','#638f96')
 }else if(id==='stormgarden'){
  vessel(c,0,-3,21,8,5,pottery)
  for(const [dx,h]of [[-12,17],[0,30],[13,21]]){line(c,[[dx,-8],[dx,-h-3]],BRASS.front,2);gem(c,dx,-h,dx===0?9:6,{...blue,accent:active?'#eed5fc':'#accddd'});leaf(c,dx,-8,10,dx*.035,'#7da58d')}
  if(active&&!still){const a=Math.sin(time*7)*3;line(c,[[-12,-17],[-6,-24+a],[0,-30],[7,-25-a],[13,-21]],'#e6f6ff',1)}
 }else if(id==='sunterrace'){
  vessel(c,0,-3,22,8,7,BRASS);vessel(c,0,-10,15,6,5,pottery)
  c.save();c.translate(0,-23);for(let i=0;i<8;i++){const a=i*TAU/8+(still?0:time*.06);leaf(c,Math.cos(a)*4,Math.sin(a)*3,12,a+Math.PI/2,active?'#f2d38a':'#8da397')}orb(c,0,0,7,active?'#ffedb4':'#d3c997','#8f7a56');c.restore()
 }else{
  for(const side of [-1,1]){vessel(c,side*17,-3,4,3,29,blue);orb(c,side*17,-34,3,BRASS.roof,BRASS.side)}
  c.strokeStyle=BRASS.front;c.lineWidth=3;c.beginPath();c.moveTo(-17,-32);c.quadraticCurveTo(0,-47,17,-32);c.stroke()
  c.save();c.translate(0,-36);c.rotate(still?0:Math.sin(time*1.4)*(active?.13:.045));line(c,[[0,0],[0,7]],BRASS.front,2);vessel(c,0,20,9,4,12,BRASS);orb(c,0,24,2.5,BRASS.roof,BRASS.side);c.restore()
 }
 if(active&&night)lightPool(c,0,-15,35,id==='stormgarden'?'#d1b6ef':'#d8ead1',.3)
 c.restore()
}
