import type { TowerId } from '../game/defs'
import { CITY, block, polygon, plant, windows } from './architecture'
export interface Miniature { id:TowerId;a:number;b:number;refinement?:number;angle?:number;crest?:string }

/** Low-poly architectural keepers, drawn as vectors for clear phone-scale silhouettes. */
export function drawFixedTower(c:CanvasRenderingContext2D,x:number,y:number,t:Miniature) {
  c.save();c.translate(x,y)
  const stage=t.refinement?4:Math.max(t.a,t.b),special=stage>=2,master=stage>=3,crown=stage===4
  const h=23+stage*3,w=42+Math.min(2,stage)*2
  polygon(c,[[-28,7],[25,7],[43,-7],[-9,-15]],'#15253555')
  block(c,0,3,w+8,26,5,'#7b8589','#8c9697','#5c6d77')
  const line=(points:number[][],color:string,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='butt';c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.stroke()}
  const lamp=(lx:number,ly:number,height=13)=>{block(c,lx,ly,7,6,height,'#c9cbb0','#c1c7bb','#909d9e');c.fillStyle=CITY.window;c.fillRect(lx-2,ly-height+2,4,height-4)}
  if(t.id==='wick'){
    block(c,0,-2,w,23,h);windows(c,0,-2,w,h,stage>=1?2:1)
    block(c,4,-h-9,14,15,special?22:12,'#566271','#81909d','#34485a');lamp(4,-h-13,special?14:10)
    if(master){block(c,-20,-6,13,14,25);windows(c,-20,-6,13,25)}
    if(crown){block(c,18,-h-10,11,12,34);lamp(18,-h-39,8)}
    if(t.b&&special)line([[13,-h-19],[25,-h-39]],'#899ca7',3)
  }else if(t.id==='cracker'){
    block(c,0,-2,w,25,h);windows(c,0,-2,w,h,1)
    for(let i=0;i<(special?3:2);i++){const px=-14+i*13;block(c,px,-h-5,9,12,master?24:16,'#596677','#85939d','#364759');c.fillStyle=t.b?'#c6bca2':'#91a5b0';c.fillRect(px-3,-h-(master?26:18),6,5)}
    if(crown){block(c,-25,-4,13,17,27);windows(c,-25,-4,13,27);block(c,18,-h-11,10,12,35,'#73828a')}
  }else if(t.id==='bell'){
    block(c,-19,-3,8,11,56,'#5d6c79','#8d999f');block(c,19,-3,8,11,56,'#586674','#8394a0');block(c,0,-59,50,25,6,'#556477','#7b8d9b','#3c4d62')
    line([[5,-65],[5,-42]],'#aab4b3',2)
    polygon(c,[[-4,-44],[13,-44],[16,-28],[22,-24],[-13,-24],[-7,-29]],special?'#b4b5a0':'#8e9b9f');polygon(c,[[4,-44],[13,-44],[16,-28],[22,-24],[7,-24]],'#718385')
    c.fillStyle=CITY.window;c.fillRect(-16,-48,3,34);c.fillRect(17,-48,3,34)
    if(master){block(c,0,-65,27,17,13);windows(c,0,-65,27,13)}
    if(crown){block(c,-26,-5,9,11,39);block(c,26,-5,9,11,39);lamp(-26,-41,9);lamp(26,-41,9)}
    if(t.b&&special)for(const bx of [-12,15]){line([[bx,-58],[bx,-48]],'#aab4b3');polygon(c,[[bx-4,-48],[bx+4,-48],[bx+7,-37],[bx-7,-37]],'#b3bba7')}
  }else if(t.id==='owl'){
    block(c,0,-2,w,25,h);windows(c,0,-2,w,h)
    const by=-h-4
    polygon(c,[[-22,by],[-24,by-17],[-15,by-33],[4,by-38],[22,by-27],[28,by-9],[22,by]],'#8b9ba5');polygon(c,[[4,by-38],[22,by-27],[28,by-9],[22,by],[5,by]],'#667e91');polygon(c,[[-24,by-17],[-15,by-33],[4,by-38],[-6,by-18]],'#a7b2b5')
    block(c,0,by-9,19,8,10,'#2e4455','#607783');c.fillStyle=CITY.window;c.fillRect(-7,by-16,5,4);c.fillRect(2,by-16,5,4)
    if(special)line([[17,by-25],[29,by-45]],'#96a6af',3)
    if(master){block(c,-25,-3,11,15,25);windows(c,-25,-3,11,25)}
    if(crown){block(c,23,-5,13,16,35);lamp(23,-36,16);line([[-16,by-35],[-25,by-45]],'#a4b6b9',3)}
    if(t.b&&special){block(c,-22,by-6,12,13,17,'#778f9b');windows(c,-22,by-6,12,17)}
  }else if(t.id==='garden'){
    block(c,0,-2,w+6,34,h);windows(c,0,-2,w+6,h);block(c,4,-h-6,w,28,4,'#92a29b','#6b816b','#576d61')
    for(let i=0;i<5;i++)plant(c,-17+i*9,-h-10-(i%2)*6,4+Number(special)*1.5)
    if(master){block(c,-24,-3,12,20,18);plant(c,-21,-28,8)}
    if(crown){block(c,20,-h-8,14,17,15,'#637e6d','#7f9979');plant(c,22,-h-32,10)}
    if(t.b&&special){block(c,22,-h-2,9,8,18);lamp(22,-h-17,9)}
  }else if(t.id==='beam'){
    const height=52+stage*7
    block(c,0,-2,31,27,height);windows(c,0,-2,31,height,master?4:special?3:2);block(c,0,-height-4,40,29,19,'#85959d','#80929f','#647c8f');windows(c,0,-height-4,40,19);block(c,0,-height-24,29,23,4,'#596b7d','#738696')
    if(special){block(c,22,-2,13,18,28);windows(c,22,-2,13,28)}
    if(crown){line([[5,-height-34],[5,-height-53]],'#9aa9ae',3);lamp(5,-height-47,8)}
    if(t.b&&special){block(c,-23,-height+9,18,18,25,'#718592','#91a3aa');windows(c,-23,-height+9,18,25);block(c,26,-height+9,18,18,25,'#718592','#91a3aa');windows(c,26,-height+9,18,25)}
  }else if(t.id==='storm'){
    block(c,0,-2,w,24,h);windows(c,0,-2,w,h)
    for(let i=0;i<(special?3:2);i++){const px=-15+i*15;line([[px,-h-4],[px,-h-35-(i%2)*11]],'#869eac',5);for(let j=0;j<3;j++)block(c,px,-h-15-j*8,11,8,3,'#647b8a','#a4b8bd','#4a6171')}
    if(master){block(c,22,-3,12,13,27);windows(c,22,-3,12,27)}
    if(crown)line([[-15,-h-42],[0,-h-59],[15,-h-42]],'#a8bec6',4)
  }else{
    block(c,0,-2,w,26,h);windows(c,0,-2,w,h)
    c.save();c.translate(3,-h-8);c.rotate((t.angle??-.8)+Math.PI/2)
    polygon(c,[[-7,12],[7,12],[8,-30],[-8,-30]],'#9aabb2');polygon(c,[[1,12],[7,12],[8,-30],[2,-30]],'#637d8e')
    line([[-29,-10],[-22,-20],[0,-25],[22,-20],[29,-10]],'#9badb4',5);line([[-29,-10],[0,9],[29,-10]],'#c3c9bc',1);line([[0,9],[0,-37]],'#d0d3be',3)
    if(special)line([[-23,-3],[0,-12],[23,-3]],'#667f90',4)
    if(master){line([[-32,0],[-24,-10],[0,-16],[24,-10],[32,0]],'#99aab0',4);line([[-32,0],[0,13],[32,0]],'#c3c9bc',1)}
    if(crown){line([[-5,12],[-5,-34]],'#bdcbc9',3);line([[5,12],[5,-34]],'#bdcbc9',3)}
    c.restore()
  }
  c.fillStyle=t.crest==='ember'?'#b58b79':t.crest==='reed'?'#9fae89':t.crest==='tide'?'#91b2bd':'#c3baa0';c.fillRect(-15,-8,5,5)
  c.restore()
}
const cache=new Map<string,string>()
export function fixedTowerIcon(id:TowerId,a=0,b=0,refinement=0) {
  const key=`${id}:${a}:${b}:${refinement}`;if(cache.has(key))return cache.get(key)!
  const cv=document.createElement('canvas');cv.width=160;cv.height=160;const c=cv.getContext('2d')!;const scale=id==='beam'?0.93:1.2;c.translate(80,148);c.scale(scale,scale)
  drawFixedTower(c,0,0,{id,a,b,refinement,angle:-.8});const url=cv.toDataURL();cache.set(key,url);return url
}
