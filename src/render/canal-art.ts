import {secondWatch} from '../game/second-watch'
import type {Sim} from '../game/sim'
import {districtStyle} from './district-style'
import {districtLayout} from './district-layout'
import {upright} from './board-view'
import {block,lightPool,polygon,setArchitectureLight} from './architecture'
import {BRASS,STONE,TAU,arch,leaf,line,orb,oval,vessel} from './miniature-art'
import {drawProjectMiniature} from './place-art'
import {PROJECTS} from '../game/district-projects'

const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)}
const trees=new Map<string,HTMLCanvasElement>()
function crown(day:boolean,style:number){
 const key=day+':'+style;let cv=trees.get(key);if(cv)return cv
 cv=document.createElement('canvas');cv.width=160;cv.height=170;const c=cv.getContext('2d')!;c.scale(2,2);c.translate(40,74)
 const shades=day?['#597e60','#739c6e','#91b17a','#aec28a']:['#254951','#305d5c','#457571','#638b7c']
 for(const [i,[x,y,r]]of [[0,-27,18],[-13,-35,15],[13,-39,17],[-4,-50,18],[8,-58,14]].entries()){
  const g=c.createRadialGradient(x-5,y-7,1,x,y,r);g.addColorStop(0,shades[3]);g.addColorStop(.5,shades[2-i%2]);g.addColorStop(1,shades[0]);c.fillStyle=g;c.beginPath();c.ellipse(x,y,r,r*.85,0,0,TAU);c.fill()
  for(let j=0;j<5;j++){const a=j*2.4+i;leaf(c,x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.4,4+j%2,-.5+a,shades[(j+i)%3+1])}
 }
 if(style===2)for(let i=0;i<9;i++)oval(c,(noise(i+81)-.5)*35,-28-noise(i+20)*36,2,1.8,day?'#edcaa0':'#bad2b0')
 trees.set(key,cv);return cv
}
export function groveCanopies(c:CanvasRenderingContext2D,s:Sim,time:number,reduced:boolean,wide:boolean){
 for(const [i,p]of districtLayout(s).entries())if(p.kind==='tree')upright(c,p.x,p.y,wide,()=>{c.save();c.translate(p.x,p.y);c.rotate(reduced?0:Math.sin(time*.65+i)*.016);c.drawImage(crown(!s.sky.night,p.style),-40,-74,80,85);c.restore()})
}
/** Ground detail is deterministic and painted once into the terrain cache. */
export function paintCanalLandscape(c:CanvasRenderingContext2D,s:Sim,stage:number,keepsakes:readonly string[],wide:boolean){
 const day=!s.sky.night,urban=secondWatch(s.challenge),mat=districtStyle(s.challenge.variant);setArchitectureLight(c,day)
 for(let i=0;i<34;i++){const x=noise(i+4)*900-80,y=noise(i+75)*980-80;c.fillStyle=day?(i%2?'#d8d8aa14':'#2d705a0b'):'#7aa29106';c.beginPath();c.ellipse(x,y,30+noise(i+123)*100,20+noise(i+333)*60,i,0,TAU);c.fill()}
 for(let i=0;i<1600;i++){const x=noise(i+91)*920-50,y=noise(i+822)*1070-140;c.fillStyle=day?(i%3?'#354e4421':'#e2e9bd5c'):'#b8ceb511';c.fillRect(x,y,.5+noise(i+11)*2,.5+noise(i+32))}
 c.lineJoin='round';c.lineCap='round'
 const network=()=>{c.beginPath();for(const seg of s.level.segs.values())seg.line.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke()}
 c.save();c.translate(3,8);c.strokeStyle=day?'#264e4945':'#061b3199';c.lineWidth=78;network();c.restore()
 for(const [w,col]of [[112,urban?(day?'#75817a':'#344c53'):'transparent'],[77,day?'#75977a':'#2e5358'],[70,urban?(day?'#b3b3a0':'#718a8c'):day?mat.bank[0]:'#7f9299'],[62,urban?(day?'#7a908b':'#435f69'):day?mat.bank[1]:'#4c676f'],[53,day?'#385c58':'#193b50']]as const){c.lineWidth=w;c.strokeStyle=col;network()}
 const water=c.createLinearGradient(0,0,650,840);water.addColorStop(0,urban?(day?'#396c70':'#1c4d60'):day?mat.water[1]:'#376f78');water.addColorStop(.45,urban?(day?'#234f61':'#12354b'):day?mat.water[0]:'#204c63');water.addColorStop(1,urban?(day?'#507e7d':'#2f6871'):day?mat.water[1]:'#326d79');c.strokeStyle=water;c.lineWidth=47;network()
 c.strokeStyle=day?'#9bc9b22c':'#a6e8dc0e';c.lineWidth=24;network()
 for(const seg of s.level.segs.values())for(let at=15;at<seg.line.length;at+=21){
  const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0})
  for(const side of [-1,1]){
   const x=p.x-p.ty*30*side,y=p.y+p.tx*30*side
   if([...s.level.segs.values()].some(other=>other!==seg&&other.line.distanceTo(x,y)<34))continue
   c.save();c.translate(x,y);c.rotate(Math.atan2(p.ty,p.tx));c.fillStyle=day?(Math.floor(at)%3?'#d6d0b0':'#eee4c4'):'#8c9f9b';c.beginPath();c.roundRect(-8,-3.6,15,7,2);c.fill();line(c,[[-7,-3],[6,-3]],day?'#fff2d788':'#b6c8c066',.9);line(c,[[7,-1],[7,3]],'#36575377',1);c.restore()
   if(!urban&&Math.floor(at/21)%4===0&&!s.pads.some(q=>Math.hypot(q.x-x,q.y-y)<63)){
    const rx=x-p.ty*side*11,ry=y+p.tx*side*11;for(let j=0;j<3;j++)leaf(c,rx+j*2,ry,6+j*2,(j-1)*.5,day?'#73915d':'#376764')
   }
  }
 }
 for(const seg of s.level.segs.values())for(let at=86;at<seg.line.length;at+=190){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),x=p.x-p.ty*38,y=p.y+p.tx*38;if(s.pads.some(q=>Math.hypot(q.x-x,q.y-y)<52)||[...s.level.segs.values()].some(other=>other!==seg&&other.line.distanceTo(x,y)<32))continue
  if(!day)lightPool(c,x,y,43,'#ffd392',.7);upright(c,x,y,wide,()=>{line(c,[[x,y],[x,y-15]],'#4b655e',2);vessel(c,x,y-12,3,2,6,BRASS);arch(c,x,y-13,3,4,day?'#efe2a6':'#fff0b7')})
 }
 let houseIndex=0
 for(const p of districtLayout(s))upright(c,p.x,p.y,wide,()=>{
  const {x,y,style}=p
  if(p.kind==='tree'){oval(c,x+9,y+3,28,10,day?'#183f4430':'#071e3033');line(c,[[x,y],[x-2,y-31]],day?'#6d6a4f':'#344f52',5);line(c,[[x-1,y-15],[x-12,y-33]],day?'#827653':'#40575a',2.5);return}
  const project=PROJECTS[houseIndex++%3],restored=keepsakes.find(k=>k.startsWith('project:'+project.id+':')),restoration=Number(keepsakes.find(k=>k.startsWith('stage:'+project.id+':'))?.split(':')[2]??0)
  if(restored||restoration){c.save();c.translate(x,y);c.scale(.8,.8);drawProjectMiniature(c,0,0,project.id,restored?3:restoration,project.colours[restored?.endsWith(':1')?1:0],!day);c.restore();return}
  const w=34+style%2*5,h=(urban?46:28)+style%3*5,[front,roof,side]=urban?['#71837f','#a7b3a0','#314f5b']:mat.walls
  oval(c,x+8,y+4,37,15,day?'#294e442b':'#0c283331');vessel(c,x,y+2,31,10,3,STONE)
  if(!day)lightPool(c,x,y,40,'#ffce91',.42)
  block(c,x,y,w,22,h,day?front:side,roof,side)
  for(const dx of [-9,7]){arch(c,x+dx,y-6,7,13,day?'#315c62':'#f3cf90');line(c,[[x+dx-4,y-6],[x+dx+4,y-6]],roof,1.4)}
  arch(c,x+1,y,8,15,side);arch(c,x+1,y,5.5,12,day?'#4d706e':'#b4bb97')
  // Pitched clay roofs, overlapping tile courses and brass gutters.
  const ridge=y-h-17,roofCol=keepsakes.includes('sunforge')?'#c88868':style%2?'#5a8a83':'#b88565'
  polygon(c,[[x-w/2-5,y-h],[x+1,ridge],[x+w/2+7,y-h],[x+8,y-h+9]],roofCol);polygon(c,[[x+1,ridge],[x+13,ridge-8],[x+w/2+17,y-h-8],[x+w/2+7,y-h]],side)
  for(let j=1;j<4;j++){const q=j/4;line(c,[[x+1-(w/2+5)*q,ridge+17*q],[x+1+(w/2+6)*q,ridge+17*q]],'#f1d4a65c',1)}
  line(c,[[x-w/2-5,y-h],[x+8,y-h+9],[x+w/2+7,y-h]],BRASS.front,1.6)
  vessel(c,x-10,y-h-9,3,2,12,{front,roof,side,accent:roof})
  for(const dx of [-w/2-5,w/2+8]){vessel(c,x+dx,y+1,5,3,5,{front:'#8d7c5e',roof:'#b7ba86',side:'#526554',accent:roof});leaf(c,x+dx,y-6,11,dx<0?-.3:.4,day?'#8baa78':'#487775')}
  if(stage>0){line(c,[[x-w/2,y-5],[x+w/2,y-5]],'#fff0b57a',1);for(let j=0;j<4;j++)oval(c,x-w/2+5+j*8,y-3,1.5,2,day?'#d5ae71':'#ffe3a2')}
  if(keepsakes.includes('moonwake'))orb(c,x+w/2+7,y-19,3,'#c7eff1','#618b9a')
  if(keepsakes.includes('stormglass'))for(let i=0;i<3;i++)oval(c,x-8+i*6,y-h+5,2,2,['#edc999','#abdaca','#b3bfd7'][i])
 })
}

export function heartLantern(c:CanvasRenderingContext2D,x:number,y:number,alive:boolean,night:boolean,time:number,reduced:boolean){
 c.save();c.translate(x,y);c.scale(.84,.84);oval(c,8,7,43,15,'#0d2d3d44');vessel(c,0,6,35,12,8,STONE);vessel(c,0,-4,27,10,6,BRASS)
 const body={front:'#668f8b',roof:'#dfdfb9',side:'#345661',accent:'#e5d4a2'};vessel(c,0,-10,20,8,47,body)
 for(const dx of [-9,7]){arch(c,dx,-18,6,25,alive?'#edce8d':'#2b4b54');line(c,[[dx-3,-32],[dx+3,-32]],body.side,1.4)}
 vessel(c,0,-58,30,11,6,BRASS)
 for(const side of [-1,1])line(c,[[side*23,-65],[side*23,-97]],body.side,4)
 c.fillStyle=alive?'#ffe6ac77':'#7e9e9833';c.fillRect(-23,-97,46,33)
 if(alive){const pulse=reduced?0:Math.sin(time*1.6)*.06;lightPool(c,0,-79,night?92:50,'#ffdc95',(night?.65:.3)+pulse,1);orb(c,0,-79,14,'#fff2b9','#bd975b')}
 vessel(c,0,-98,30,11,5,BRASS);c.fillStyle='#486e72';c.beginPath();c.moveTo(-31,-104);c.quadraticCurveTo(-14,-123,0,-127);c.quadraticCurveTo(14,-123,31,-104);c.closePath();c.fill();line(c,[[-29,-104],[29,-104]],BRASS.roof,1.5);orb(c,0,-129,3,'#eed9a3','#8d805e')
 if(night&&alive)lightPool(c,0,0,90,'#ffc97c',.42)
 for(const side of [-1,1]){vessel(c,side*30,0,6,4,7,STONE);leaf(c,side*30,-9,17,side*.3,'#88aa7c');leaf(c,side*30,-9,12,side*.9,'#b6c797')}
 c.restore()
}
