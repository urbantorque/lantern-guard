import type { TowerId } from '../game/defs'
import type { HeroId } from '../game/heroes'
import { CITY, block, polygon, plant, windows, isDaylit, lightPool } from './architecture'
export interface Miniature { id:TowerId;a:number;b:number;refinement?:number;angle?:number;crest?:string;time?:number;since?:number;age?:number;upAge?:number;reducedMotion?:boolean;hero?:HeroId }
export const TOWER_COLOURS:Record<TowerId,{front:string;roof:string;side:string;accent:string}>={
  wick:{front:'#c9764e',roof:'#ffd097',side:'#83484a',accent:'#ffc261'},
  cracker:{front:'#c55f68',roof:'#ffbca1',side:'#743f59',accent:'#ff9874'},
  bell:{front:'#498ca4',roof:'#b4e9e6',side:'#345676',accent:'#a6efff'},
  owl:{front:'#568e7b',roof:'#b8d994',side:'#315c60',accent:'#c9f38c'},
  garden:{front:'#50936a',roof:'#c2e199',side:'#2f6356',accent:'#bbee76'},
  beam:{front:'#c99752',roof:'#ffe5a8',side:'#7e634d',accent:'#ffe18b'},
  storm:{front:'#6b72bb',roof:'#cbc9fb',side:'#474376',accent:'#b5c5ff'},
  ballista:{front:'#497c99',roof:'#a2cee1',side:'#2e4c69',accent:'#75e1e0'},
}

/** Shared anchor keeps muzzle flashes and departing shots attached to the actual roof. */
export function fixedMuzzle(t:Miniature){
  const stage=t.refinement?4:Math.max(t.a,t.b),h=26+stage*3
  return {x:t.id==='wick'?4:0,y:t.id==='beam'?-64-stage*7:t.id==='bell'?-30:t.id==='storm'?-h-40:t.id==='ballista'?-h-12:-h-24}
}

/** Low-poly architectural keepers, drawn as vectors for clear phone-scale silhouettes. */
export function drawFixedTower(c:CanvasRenderingContext2D,x:number,y:number,t:Miniature) {
  c.save();c.translate(x,y)
  const colour=TOWER_COLOURS[t.id],time=t.time??0,since=t.since??9
  const recoil=t.reducedMotion?0:Math.max(0,1-since/.32),day=isDaylit(c)
  const age=t.age??9,upAge=t.upAge??9
  if(age<.55){const q=Math.min(1,age/.55),rise=1-Math.pow(1-q,3);c.translate(0,(1-rise)*22);c.scale(1+Math.sin(q*Math.PI)*.08,Math.max(.12,rise+Math.sin(q*Math.PI)*.18))}
  if(upAge<.55){const pulse=Math.sin(upAge/.55*Math.PI);c.scale(1+pulse*.09,1+pulse*.09)}
  const stage=t.refinement?4:Math.max(t.a,t.b),special=stage>=2,master=stage>=3,crown=stage===4
  const h=26+stage*3,w=46+Math.min(2,stage)*2
  const house=(bx:number,by:number,bw:number,bd:number,bh:number)=>block(c,bx,by,bw,bd,bh,colour.front,colour.roof,colour.side)
  if(!day)lightPool(c,0,0,47,colour.accent,.48)
  if(recoil>0){lightPool(c,0,-18,36+recoil*14,colour.accent,recoil*.7);c.translate(-Math.cos(t.angle??0)*recoil*2,-recoil*2)}
  polygon(c,[[-28,7],[25,7],[43,-7],[-9,-15]],'#15253555')
  block(c,0,3,w+8,28,6,'#698f91','#c2d5ba','#385c72')
  const line=(points:number[][],color:string,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='butt';c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.stroke()}
  const lamp=(lx:number,ly:number,height=13)=>{block(c,lx,ly,7,6,height,'#c9cbb0','#c1c7bb','#909d9e');c.fillStyle=CITY.window;c.fillRect(lx-2,ly-height+2,4,height-4)}
  if(t.id==='wick'){
    house(0,-2,w,23,h);windows(c,0,-2,w,h,stage>=1?2:1)
    c.save();c.translate(-Math.cos(t.angle??0)*recoil*6,-Math.sin(t.angle??0)*recoil*4)
    house(4,-h-9,19,18,special?22:15);lamp(4,-h-17,special?14:10)
    lightPool(c,4,-h-26,17+recoil*15,colour.accent,.45+recoil*.5,1)
    // A visible aiming arm connects the architectural tower to its next shot.
    const aim=t.angle??-.8;line([[4,-h-24],[4+Math.cos(aim)*18,-h-24+Math.sin(aim)*12]],'#fff2b6',4)
    c.restore()
    if(master){block(c,-20,-6,13,14,25);windows(c,-20,-6,13,25)}
    if(crown){block(c,18,-h-10,11,12,34);lamp(18,-h-39,8)}
    if(t.b&&special)line([[13,-h-19],[25,-h-39]],'#899ca7',3)
  }else if(t.id==='cracker'){
    house(0,-2,w,25,h);windows(c,0,-2,w,h,1)
    for(let i=0;i<(special?3:2);i++){const px=-14+i*14,kick=recoil*(i===0?10:5);house(px,-h-5+kick,11,13,master?26:19);c.fillStyle='#352a49';c.fillRect(px-4,-h-(master?28:21)+kick,8,6);c.fillStyle=colour.accent;c.fillRect(px-4,-h-12+kick,8,4)}
    if(crown){block(c,-25,-4,13,17,27);windows(c,-25,-4,13,27);block(c,18,-h-11,10,12,35,'#73828a')}
  }else if(t.id==='bell'){
    house(-19,-3,9,12,56);house(19,-3,9,12,56);house(0,-59,53,25,7)
    c.save();c.translate(5,-60);c.rotate(t.reducedMotion?0:Math.sin(since*22)*Math.exp(-since*4)*.52);c.translate(-5,60)
    line([[5,-65],[5,-42]],'#aab4b3',2)
    polygon(c,[[-4,-44],[13,-44],[16,-28],[22,-24],[-13,-24],[-7,-29]],special?'#ffe9a0':'#eebc71');polygon(c,[[4,-44],[13,-44],[16,-28],[22,-24],[7,-24]],'#b98156');c.fillStyle='#ffe9a3';c.fillRect(-12,-26,33,4)
    c.restore()
    c.fillStyle=CITY.window;c.fillRect(-16,-48,3,34);c.fillRect(17,-48,3,34)
    if(master){block(c,0,-65,27,17,13);windows(c,0,-65,27,13)}
    if(crown){block(c,-26,-5,9,11,39);block(c,26,-5,9,11,39);lamp(-26,-41,9);lamp(26,-41,9)}
    if(t.b&&special)for(const bx of [-12,15]){line([[bx,-58],[bx,-48]],'#aab4b3');polygon(c,[[bx-4,-48],[bx+4,-48],[bx+7,-37],[bx-7,-37]],'#b3bba7')}
  }else if(t.id==='owl'){
    house(0,-2,w,25,h);windows(c,0,-2,w,h)
    const by=-h-4
    polygon(c,[[-22,by],[-24,by-17],[-15,by-33],[4,by-38],[22,by-27],[28,by-9],[22,by]],colour.roof);polygon(c,[[4,by-38],[22,by-27],[28,by-9],[22,by],[5,by]],colour.front);polygon(c,[[-24,by-17],[-15,by-33],[4,by-38],[-6,by-18]],'#e0edbd')
    const look=Math.cos(t.angle??0)*4;block(c,look,by-9,27,8,14,'#26484f','#789c75');c.fillStyle=colour.accent;c.fillRect(look-10,by-20,7,7);c.fillRect(look+3,by-20,7,7)
    for(const side of [-1,1]){const lift=recoil*18;polygon(c,[[side*20,by-6],[side*34,by-16-lift],[side*31,by+1],[side*21,by+5]],colour.roof)}
    if(special)line([[17,by-25],[29,by-45]],'#96a6af',3)
    if(master){block(c,-25,-3,11,15,25);windows(c,-25,-3,11,25)}
    if(crown){block(c,23,-5,13,16,35);lamp(23,-36,16);line([[-16,by-35],[-25,by-45]],'#a4b6b9',3)}
    if(t.b&&special){block(c,-22,by-6,12,13,17,'#778f9b');windows(c,-22,by-6,12,17)}
  }else if(t.id==='garden'){
    house(0,-2,w+6,34,h);windows(c,0,-2,w+6,h);block(c,4,-h-6,w,28,4,'#8cb382','#a8cd79','#376a55')
    for(let i=0;i<5;i++)plant(c,-17+i*9,-h-10-(i%2)*6,4+Number(special)*1.5)
    for(let i=0;i<4;i++){const sway=t.reducedMotion?0:Math.sin(time*1.5+i)*1.5;c.fillStyle=['#ffe393','#ff9b91','#c1ed93','#ffd68c'][i];c.beginPath();c.arc(-12+i*9+sway,-h-20-i%2*6,3,0,Math.PI*2);c.fill()}
    if(master){block(c,-24,-3,12,20,18);plant(c,-21,-28,8)}
    if(crown){block(c,20,-h-8,14,17,15,'#637e6d','#7f9979');plant(c,22,-h-32,10)}
    if(t.b&&special){block(c,22,-h-2,9,8,18);lamp(22,-h-17,9)}
  }else if(t.id==='beam'){
    const height=52+stage*7
    house(0,-2,34,27,height);windows(c,0,-2,34,height,master?4:special?3:2);house(0,-height-4,43,29,20);windows(c,0,-height-4,43,20);block(c,0,-height-25,33,25,5,'#568b8c','#b7ddd1','#31596d')
    lightPool(c,0,-height-14,30,colour.accent,day?.2:.6,1);c.fillStyle='#fff0b1';c.fillRect(-14,-height-17,28,7)
    if(special){block(c,22,-2,13,18,28);windows(c,22,-2,13,28)}
    if(crown){line([[5,-height-34],[5,-height-53]],'#9aa9ae',3);lamp(5,-height-47,8)}
    if(t.b&&special){block(c,-23,-height+9,18,18,25,'#718592','#91a3aa');windows(c,-23,-height+9,18,25);block(c,26,-height+9,18,18,25,'#718592','#91a3aa');windows(c,26,-height+9,18,25)}
  }else if(t.id==='storm'){
    house(0,-2,w,24,h);windows(c,0,-2,w,h)
    for(let i=0;i<(special?3:2);i++){const px=-15+i*15;line([[px,-h-4],[px,-h-35-(i%2)*11]],'#9d9cd2',5);for(let j=0;j<3;j++)block(c,px,-h-15-j*8,13,9,4,colour.front,colour.roof,colour.side);lightPool(c,px,-h-38-(i%2)*11,10+recoil*12,colour.accent,.3+recoil*.6,1);c.fillStyle='#e0eeff';c.fillRect(px-3,-h-38-(i%2)*11,6,5)}
    if(recoil>.1)line([[-15,-h-39],[-5,-h-46],[1,-h-36],[6,-h-51]],'#dfedff',2)
    if(master){block(c,22,-3,12,13,27);windows(c,22,-3,12,27)}
    if(crown)line([[-15,-h-42],[0,-h-59],[15,-h-42]],'#a8bec6',4)
  }else{
    house(0,-2,w,26,h);windows(c,0,-2,w,h)
    c.save();c.translate(3,-h-8);c.rotate((t.angle??-.8)+Math.PI/2)
    c.translate(0,recoil*9)
    polygon(c,[[-7,12],[7,12],[8,-30],[-8,-30]],'#dab57f');polygon(c,[[1,12],[7,12],[8,-30],[2,-30]],'#987a67')
    line([[-29,-10],[-22,-20],[0,-25],[22,-20],[29,-10]],colour.accent,5);line([[-29,-10],[0,9-recoil*9],[29,-10]],'#f2e1b8',1.5);line([[0,9],[0,-37]],'#fff0b9',3)
    if(special)line([[-23,-3],[0,-12],[23,-3]],'#667f90',4)
    if(master){line([[-32,0],[-24,-10],[0,-16],[24,-10],[32,0]],'#99aab0',4);line([[-32,0],[0,13],[32,0]],'#c3c9bc',1)}
    if(crown){line([[-5,12],[-5,-34]],'#bdcbc9',3);line([[5,12],[5,-34]],'#bdcbc9',3)}
    c.restore()
  }
  c.fillStyle=t.crest==='ember'?'#b58b79':t.crest==='reed'?'#9fae89':t.crest==='tide'?'#91b2bd':'#c3baa0';c.fillRect(-15,-8,5,5)
  // Hero architecture changes the silhouette as well as its insignia.
  if(t.hero==='sol'){
    house(-w/2-3,-3,10,14,18+stage*2);c.fillStyle='#ffce85';c.fillRect(-w/2-6,-18,6,5)
    c.strokeStyle='#ffe0a0';c.lineWidth=2;c.beginPath();c.arc(1,-15,6,0,Math.PI*2);c.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[1+Math.cos(a)*9,-15+Math.sin(a)*9],[1+Math.cos(a)*12,-15+Math.sin(a)*12]],'#ffd182',1.5)}
  }else if(t.hero==='mira'){
    for(const side of [-1,1]){polygon(c,[[side*(w/2-3),-1],[side*(w/2+12),-15],[side*(w/2+7),-35],[side*(w/2-3),-24]],side<0?'#b0dfbc':'#599d98');plant(c,side*(w/2+3),-13,7)}
    c.strokeStyle='#bbf9d5';c.lineWidth=2;c.beginPath();c.arc(0,-14,7,.4,Math.PI*1.6);c.stroke()
  }else if(t.hero==='ivo'){
    for(const side of [-1,1]){line([[side*(w/2+3),-4],[side*(w/2+3),-h-12]],'#777db6',3);block(c,side*(w/2+3),-h-11,8,7,7,'#918ece','#dae1fa','#4b557f')}
    polygon(c,[[-4,-24],[6,-24],[0,-15],[7,-15],[-6,-4],[-2,-14],[-7,-14]],'#d5e8ff')
  }
  // Each upgrade adds a readable rank mark to the base, including at phone scale.
  c.fillStyle=colour.accent;for(let i=0;i<=stage;i++)c.fillRect(-13+i*6,0,4,3)
  c.restore()
}
const cache=new Map<string,string>()
export function fixedTowerIcon(id:TowerId,a=0,b=0,refinement=0,hero?:HeroId) {
  const key=`${id}:${a}:${b}:${refinement}:${hero??''}`;if(cache.has(key))return cache.get(key)!
  const cv=document.createElement('canvas');cv.width=160;cv.height=160;const c=cv.getContext('2d')!;const scale=id==='beam'?0.93:1.2;c.translate(80,148);c.scale(scale,scale)
  drawFixedTower(c,0,0,{id,a,b,refinement,angle:-.8,hero});const url=cv.toDataURL();cache.set(key,url);return url
}
