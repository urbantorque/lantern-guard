import type {TowerId} from '../game/defs'
import type {HeroId} from '../game/heroes'
import {isDaylit,lightPool,polygon,setArchitectureLight} from './architecture'
import {BRASS,STONE,TAU,arch,gear,gem,leaf,line,orb,oval,vessel,type Glaze} from './miniature-art'
export interface Miniature {id:TowerId;a:number;b:number;refinement?:number;angle?:number;crest?:string;time?:number;since?:number;age?:number;upAge?:number;reducedMotion?:boolean;hero?:HeroId;charge?:number;volleyCharge?:number;mastery?:readonly string[];firing?:boolean}
export const TOWER_COLOURS:Record<TowerId,Glaze>={
 wick:{front:'#dd8446',roof:'#ffe4a3',side:'#834943',accent:'#ffd175'},cracker:{front:'#c65f64',roof:'#ffd9b3',side:'#653d4c',accent:'#ffb590'},bell:{front:'#409fa3',roof:'#c5f5e5',side:'#285465',accent:'#a8f1e5'},owl:{front:'#578b72',roof:'#e1e8b3',side:'#304f4e',accent:'#dcf3a1'},garden:{front:'#66915d',roof:'#d8df9d',side:'#345653',accent:'#ebed9a'},beam:{front:'#c1a45c',roof:'#fff0bc',side:'#66564d',accent:'#ffe5a1'},storm:{front:'#728bac',roof:'#d9eaf2',side:'#3b4a66',accent:'#b4ecfa'},ballista:{front:'#8e7061',roof:'#e7c28d',side:'#4c4e57',accent:'#d2eee5'},
}
const rank=(t:Miniature)=>t.refinement?4:Math.max(t.a,t.b)
/** Bevelled hardware contrasts with the district's softer ceramic buildings. */
function armour(c:CanvasRenderingContext2D,p:number[][],m:Glaze){
 const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),g=c.createLinearGradient(Math.min(...xs),Math.min(...ys),Math.max(...xs)+1,Math.max(...ys)+1)
 g.addColorStop(0,m.roof);g.addColorStop(.22,m.front);g.addColorStop(.64,m.front);g.addColorStop(1,m.side)
 c.fillStyle=g;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.strokeStyle='#193540';c.lineWidth=1.25;c.stroke();line(c,p.slice(0,3),m.roof,.8)
}
function vent(c:CanvasRenderingContext2D,x:number,y:number,n:number,colour:string){for(let i=0;i<n;i++){line(c,[[x+i*3,y],[x+i*3-1,y+6]],'#233b43',1.8);line(c,[[x+i*3+.6,y+1],[x+i*3-.4,y+5]],colour,.5)}}
function ignition(c:CanvasRenderingContext2D,x:number,y:number,a:number,amount:number,colour:string){
 if(amount<=0)return;c.save();c.translate(x,y);c.rotate(a);c.globalAlpha*=amount
 polygon(c,[[0,-3],[9,-5],[5,-1],[21*amount+5,0],[6,2],[10,5],[0,3]],colour)
 polygon(c,[[0,-1.5],[12*amount+3,0],[0,1.5]],'#fffceb');c.restore()
}
export function fixedMuzzle(t:Miniature){const s=rank(t);return {x:0,y:-({wick:43,cracker:43,bell:47,owl:49,garden:40,beam:68,storm:57,ballista:39}[t.id]+s*(t.id==='beam'?7:4))}}
/** Screen-local firing socket, shared by the weapon and its contact effects. */
export function fixedShotOrigin(t:Miniature){
 const p=fixedMuzzle(t),a=t.angle??-.65,s=rank(t)
 if(t.id==='wick'){const reach=s>=2&&t.b?26:19;return {x:Math.cos(a)*reach,y:p.y+5+Math.sin(a)*reach}}
 if(t.id==='ballista')return {x:Math.cos(a)*42,y:p.y+4+Math.sin(a)*42}
 if(t.id==='cracker')return {x:s>=2&&!t.b?-14:-7,y:p.y-5-s*2}
 return {x:0,y:p.y+({bell:12,beam:-1,storm:-3,owl:2,garden:0}[t.id])}
}
const bases=new Map<string,HTMLCanvasElement>()
function foundation(c:CanvasRenderingContext2D,t:Miniature,day:boolean){
 const s=rank(t),m=TOWER_COLOURS[t.id],key=[t.id,s,t.b>0,t.hero,day].join(':');let cv=bases.get(key)
 if(!cv){
  cv=document.createElement('canvas');cv.width=240;cv.height=260;const g=cv.getContext('2d')!;g.scale(2,2);g.translate(60,110)
  oval(g,5,5,34,12,'#102f3c38');vessel(g,0,2,29,10,6,STONE);vessel(g,0,-5,25,9,5,BRASS)
  for(const side of [-1,1])armour(g,[[side*19,-26],[side*26,-20],[side*32,-2],[side*21,2],[side*16,-8]],{...m,front:m.side,roof:m.front})
  const body=t.id==='beam'?35+s*5:t.id==='bell'?11:17+s*2
  vessel(g,0,-10,t.id==='beam'?17:22,8,body,m);vessel(g,0,-10-body,24,8,3,BRASS)
  for(const x of [-11,0,11]){arch(g,x,-13,6,10,day?'#294f53':'#ffd48d');line(g,[[x-4,-12],[x+4,-12]],m.roof,1)}
  for(const side of [-1,1]){armour(g,[[side*16,-13],[side*20,-14],[side*21,-body-7],[side*17,-body-10]],BRASS);oval(g,side*18,-16,1,1,BRASS.roof)}
  for(const side of [-1,1])vent(g,side<0?-28:24,-11,2,m.accent)
  line(g,[[-19,-9],[19,-9]],m.side,1.2);for(let i=0;i<=s;i++)oval(g,-s*3+i*6,-2,1.7,1.3,m.roof)
  if(t.hero==='sol'){gear(g,0,-24,5,0,'#ffe3a0');for(const x of [-23,23]){vessel(g,x,-8,4,3,7,BRASS);leaf(g,x,-17,7,x<0?-.45:.45,'#f2d48d')}}
  if(t.hero==='mira'){for(const side of [-1,1]){leaf(g,side*20,-9,20,side*.58,'#85b9a0');leaf(g,side*23,-6,12,side*1.1,'#c0d7a8')}line(g,[[-4,-24],[0,-19],[4,-24]],'#c9edcb',1.5)}
  if(t.hero==='ivo'){for(const side of [-1,1]){line(g,[[side*23,-8],[side*23,-31]],'#536978',2.5);vessel(g,side*23,-26,4,2,6,BRASS);orb(g,side*23,-34,3,'#cce9ef','#467485')}polygon(g,[[0,-29],[-4,-22],[1,-22],[-2,-17],[5,-24],[0,-24]],'#d3f1f5')}
  if(s>=3)for(const side of [-1,1]){vessel(g,side*25,-3,4,3,10,m);oval(g,side*25,-14,2,2,m.roof)}
  if(s===4){for(const side of [-1,1])armour(g,[[side*22,-3],[side*32,-8],[side*29,-19],[side*22,-15]],BRASS);for(let i=0;i<5;i++)gem(g,(i-2)*9,-9,2.5,m)}
  if(bases.size>=80)bases.delete(bases.keys().next().value!);bases.set(key,cv)
 }
 c.drawImage(cv,-60,-110,120,130)
}
/** Art pose follows real firing and reload timers without changing the simulation. */
export function drawFixedTower(c:CanvasRenderingContext2D,x:number,y:number,t:Miniature){
 const s=rank(t),m=TOWER_COLOURS[t.id],special=s>=2,crown=s===4,day=isDaylit(c),still=!!t.reducedMotion
 const time=still?0:t.time??0,since=still?9:t.since??9,charge=Math.max(0,Math.min(1,t.charge??.45)),aim=t.angle??-.65,mu=fixedMuzzle(t)
 const kick=Math.min(1,2.4*Math.exp(-since*12)*Math.sin(Math.min(1,since/.1)*Math.PI/2)),flare=Math.max(0,1-since/.13),settle=Math.sin(since*23)*Math.exp(-since*8)
 c.save();c.translate(x,y)
 if(!still&&(t.age??9)<.65){const q=Math.min(1,(t.age??9)/.65),rise=1-(1-q)**3;c.translate(0,(1-rise)*24);c.scale(1+Math.sin(q*Math.PI)*.055,Math.max(.1,rise+Math.sin(q*Math.PI)*.1))}
 if(!still&&(t.upAge??9)<.6){const q=Math.sin((t.upAge??9)/.6*Math.PI);c.scale(1+q*.045,1+q*.06)}
 if(!day)lightPool(c,0,-10,40,m.accent,.3);foundation(c,t,day)
 const badge=t.crest==='ember'?'#d98c70':t.crest==='reed'?'#a4cf99':t.crest==='tide'?'#9bced8':'#ebd39b'
 oval(c,-14,-12,4.5,4.5,BRASS.side);gem(c,-14,-12,3,{...BRASS,accent:badge,front:badge})
 const pipe=(px:number,py:number,r:number,h:number)=>{vessel(c,px,py,r,r*.45,h,m);vessel(c,px,py-h+2,r+1,r*.48,3,BRASS)}
 const rim=(px:number,py:number,r:number)=>{c.strokeStyle=BRASS.front;c.lineWidth=3;c.beginPath();c.ellipse(px,py,r,r*.42,0,0,TAU);c.stroke();c.strokeStyle=BRASS.roof;c.lineWidth=.8;c.beginPath();c.ellipse(px,py-1,r,r*.42,0,Math.PI,TAU);c.stroke()}
 if(t.id==='wick'){
  const cy=mu.y+5;pipe(0,-29-s*2,9,10+s*2);c.save();c.translate(-Math.cos(aim)*kick*7,cy-Math.sin(aim)*kick*3)
  for(let i=0;i<(special?8:6);i++){c.save();c.rotate(i*TAU/(special?8:6)+time*.12);const reach=19+charge*3-kick*4;armour(c,[[5,-5],[reach,-6],[reach+3,-1],[10,4]],i%2?BRASS:m);c.restore()}
  orb(c,0,0,10,m.accent,m.side);c.save();c.rotate(aim);const end=special&&t.b?26:19
  armour(c,[[3,-6],[end-3,-4],[end,0],[end-3,4],[3,6]],m);line(c,[[4,-3],[end-2,-2]],BRASS.roof,1.8);line(c,[[7,3],[end-3,3]],BRASS.side,2);oval(c,end,0,2.2,4,'#362e33',BRASS.front);oval(c,end+.5,0,1,2.4,'#fff0af');ignition(c,end+1,0,0,flare,'#ffc779');c.restore();lightPool(c,0,0,16+flare*10,m.accent,.2+flare*.5,1);c.restore()
 }else if(t.id==='cracker'){
  const n=special&&!t.b?3:2
  for(let i=0;i<n;i++){const px=(i-(n-1)/2)*14,cy=mu.y+16+(i%2)*3+kick*(i===0?10:6);vessel(c,px,cy,8,4,19+s*2,m);vessel(c,px,cy-16-s*2,9,4.6,5,BRASS);oval(c,px,cy-21-s*2,6,3,'#273943');oval(c,px,cy-21-s*2,3.6,1.8,flare>.01?'#fff1c2':'#bc7758');line(c,[[px-4,cy-13],[px-4,cy-3]],m.roof,1.4)}
  for(const side of [-1,1]){line(c,[[side*19,-23],[side*20,mu.y+10+kick*7]],BRASS.side,5);line(c,[[side*19,-24],[side*20,mu.y+11+kick*7]],BRASS.roof,1.6);armour(c,[[side*9,-24],[side*23,-32],[side*25,-21],[side*13,-17]],m)}
  gear(c,-23,-26,6,charge*TAU,BRASS.front);gear(c,23,-26,5,-charge*TAU,BRASS.front);vent(c,-5,-27,4,m.accent)
  ignition(c,fixedShotOrigin(t).x,mu.y-5-s*2,-Math.PI/2,flare,'#ffd0a3')
  if(special&&t.b){gem(c,0,mu.y-16,9,m);line(c,[[-19,mu.y+7],[0,mu.y-8],[19,mu.y+7]],BRASS.roof,2)}
  if(!still&&since<.7)for(let i=0;i<3;i++){const p=Math.min(1,(since+i*.08)/.7);oval(c,(i-1)*6+p*4,mu.y-8-p*21,2+p*4,2+p*3,`rgba(230,222,188,${(1-p)*.25})`)}
 }else if(t.id==='bell'){
  const roof=mu.y-22;for(const side of [-1,1]){pipe(side*22,-14,5,-roof-13);vessel(c,side*22,roof+8,7,3,4,BRASS)}
  c.strokeStyle=m.side;c.lineWidth=8;c.beginPath();c.moveTo(-22,roof+4);c.quadraticCurveTo(0,roof-16,22,roof+4);c.stroke();c.strokeStyle=m.roof;c.lineWidth=3;c.stroke()
  c.save();c.translate(0,roof+3);c.rotate(still?0:Math.sin(since*18)*Math.exp(-since*2.8)*.48);line(c,[[0,0],[0,9]],BRASS.front,3)
  const g=c.createLinearGradient(-15,0,17,0);g.addColorStop(0,BRASS.side);g.addColorStop(.3,BRASS.roof);g.addColorStop(.65,BRASS.front);g.addColorStop(1,BRASS.side);c.fillStyle=g;c.beginPath();c.moveTo(-6,8);c.bezierCurveTo(-13,13,-7,26,-18,31);c.quadraticCurveTo(0,38,18,31);c.bezierCurveTo(7,26,13,13,6,8);c.closePath();c.fill();rim(0,31,18);orb(c,Math.sin(since*18)*kick*6,34,3,BRASS.roof,BRASS.side);c.restore();gem(c,0,roof-12,7,m)
  if(special&&t.b)for(const side of [-1,1]){line(c,[[side*18,roof+8],[side*18,mu.y+11]],BRASS.front,1);orb(c,side*18,mu.y+13+settle*2,4,m.accent,m.side)}
  if(!still&&since<.9){c.save();c.globalAlpha=(1-since/.9)*.55;c.strokeStyle=m.accent;c.lineWidth=1.5;for(const d of [0,7]){c.beginPath();c.ellipse(0,mu.y+10,18+since*24+d,8+since*9,0,0,TAU);c.stroke()}c.restore()}
 }else if(t.id==='owl'){
  const cy=mu.y+12,breathe=Math.sin(time*1.8)*.35
  for(const side of [-1,1]){c.save();c.translate(side*11,cy+5);c.rotate(side*(-.1-kick*.55));for(let i=3;i>=0;i--)armour(c,[[side*i*4,3+i*3],[side*(19+i*4),-12+i*2],[side*(14+i*3),10+i*4],[side*3,15]],i%2?m:{...m,front:m.side});line(c,[[0,3],[side*25,-7]],BRASS.roof,1);gear(c,side*2,4,4,kick*2,BRASS.front);c.restore()}
  armour(c,[[-14,cy-9],[14,cy-9],[17,cy+7],[0,cy+23],[-17,cy+7]],m);armour(c,[[-7,cy+3],[7,cy+3],[0,cy+17]],BRASS)
  c.save();c.translate(Math.cos(aim)*2,cy-10+breathe);c.rotate(still?0:Math.sin(time*.8)*.02)
  armour(c,[[-18,-7],[-15,-21],[-6,-13],[6,-13],[15,-21],[18,-7],[13,10],[0,14],[-13,10]],m)
  for(const side of [-1,1]){orb(c,side*7,-2,6,BRASS.front,BRASS.side);oval(c,side*7,-2,4.2,4.5,'#1a3640');oval(c,side*7+Math.cos(aim)*1.2,-2+Math.sin(aim),1.8,2.2,m.accent);line(c,[[side*2,-7],[side*15,-10]],m.roof,3);line(c,[[side*3,3],[side*13,2]],BRASS.side,1.3)}armour(c,[[0,-3],[-4,3],[0,10],[4,3]],BRASS);c.restore()
  if(!still&&since<.24){c.save();c.globalAlpha=(1-since/.24)*.65;for(const side of [-1,1])line(c,[[side*19,cy-4],[side*32,cy-12]],m.accent,1.8);c.restore()}
  if(special&&t.b){rim(0,cy-12,25);for(const side of [-1,1])armour(c,[[side*17,cy+2],[side*31,cy-13],[side*26,cy+10]],BRASS)}
 }else if(t.id==='garden'){
  const cy=mu.y+14;vessel(c,0,cy+12,24,10,8,BRASS);oval(c,0,cy+3,21,8,'#425c47')
  for(let i=0;i<7;i++){const px=(i-3)*5,py=cy+2-Math.abs(i-3)*.5,sway=still?0:Math.sin(time*1.35+i)*.12,stem=16+(i%3)*6;line(c,[[px,py],[px+Math.sin(sway)*8,py-stem]],'#4f7e57',1.5);leaf(c,px,py-5,11,-.75+sway,'#9bbb74');leaf(c,px,py-7,10,.75+sway,'#b9d496');const fx=px+Math.sin(sway)*8,fy=py-stem;for(let a=0;a<5;a++)oval(c,fx+Math.cos(a*TAU/5)*3,fy+Math.sin(a*TAU/5)*3,3,2,i%2?'#e49c92':'#eee0a3');oval(c,fx,fy,1.8,1.8,BRASS.front)}
  c.fillStyle='#c4f5df28';c.beginPath();c.ellipse(0,cy-8,26,28,0,Math.PI,TAU);c.lineTo(26,cy+5);c.quadraticCurveTo(0,cy+17,-26,cy+5);c.closePath();c.fill();c.strokeStyle='#b8d2bca0';c.lineWidth=1.2;c.beginPath();c.ellipse(0,cy-8,26,28,0,Math.PI,TAU);c.stroke();line(c,[[0,cy-36],[0,cy+8]],'#e5efd58c',1);rim(0,cy+6,26);gem(c,0,cy-39,3,BRASS)
  if(special&&!t.b)for(const side of [-1,1]){vessel(c,side*27,-9,7,4,8,m);leaf(c,side*27,-18,20,side*.7,m.roof)}
  for(const side of [-1,1]){line(c,[[side*22,cy+5],[side*19,cy-24]],BRASS.front,1.5);gem(c,side*23,cy+3,3,m)}
  c.save();c.globalAlpha=.5;const flow=still?.4:(time*.25)%1;c.strokeStyle=m.accent;c.lineWidth=.8;c.beginPath();c.ellipse(0,cy+3-flow*29,Math.max(8,24-flow*10),6,0,Math.PI*.05,Math.PI*.95);c.stroke();c.restore()
 }else if(t.id==='beam'){
  const cy=mu.y+3;vessel(c,0,cy+14,24,9,5,BRASS);for(const side of [-1,1])line(c,[[side*18,cy+9],[side*18,cy-17]],m.side,3)
  const g=c.createLinearGradient(-18,0,18,0);g.addColorStop(0,'#f6cf6c55');g.addColorStop(.5,t.firing?'#fff8da':'#fff0b1bb');g.addColorStop(1,'#e9ab4540');c.fillStyle=g;c.fillRect(-18,cy-18,36,28);orb(c,0,cy-4,12,day?'#fff1be':'#ffe29b','#be914a');rim(0,cy-18,24)
  c.fillStyle=m.front;c.beginPath();c.moveTo(-25,cy-21);c.quadraticCurveTo(-13,cy-35,0,cy-40);c.quadraticCurveTo(13,cy-35,25,cy-21);c.closePath();c.fill();line(c,[[-25,cy-21],[25,cy-21]],BRASS.roof,2);gem(c,0,cy-42,4,BRASS)
  const sweep=still?-.4:Math.sin(time*.8)*.9;line(c,[[Math.sin(sweep)*14-3,cy-15],[Math.sin(sweep)*14-3,cy+7]],'#fffceda0',2);lightPool(c,0,cy-4,t.firing?39:25,m.accent,t.firing?.7:.23,1)
  if(special&&t.b)for(const side of [-1,1]){line(c,[[side*16,cy+13],[side*28,cy-1]],BRASS.front,3);orb(c,side*28,cy-4,6,m.accent,m.side)}
  c.save();c.translate(0,cy-4);c.rotate(aim);for(const side of [-1,1]){const open=t.firing?4:0;armour(c,[[-11,side*(7+open)],[6,side*(12+open)],[11,side*(7+open)],[0,side*(4+open)]],BRASS)}c.restore()
  if(t.firing){c.strokeStyle='#fff3c0';c.lineWidth=1.1;c.beginPath();c.ellipse(0,cy-4,16,16,0,0,TAU);c.stroke()}
 }else if(t.id==='storm'){
  const cy=mu.y+8,spin=still?.4:time*(t.b?.65:1.15)
  for(const side of [-1,1]){line(c,[[side*19,-27],[side*19,cy-7]],BRASS.side,4);for(let i=0;i<4;i++)vessel(c,side*19,cy+21-i*7,6,2.8,3,m);orb(c,side*19,cy-8,5,m.roof,m.side)}
  pipe(0,-30-s*2,7,14);c.save();c.translate(0,cy-11);c.strokeStyle=BRASS.front;c.lineWidth=2.5;c.beginPath();c.ellipse(0,0,21,9,spin,0,TAU);c.stroke();c.strokeStyle='#d4edf2';c.lineWidth=1.4;c.beginPath();c.ellipse(0,0,9,21,-spin*.7,0,TAU);c.stroke()
  const bob=still?0:Math.sin(time*2)*2;gem(c,0,bob,9+Number(special&&!!t.b)*4,m);lightPool(c,0,bob,18+charge*8,m.accent,.25+flare*.65,1)
  if(!still&&(flare>0||charge>.8)){const q=Math.sin(time*37)*3;line(c,[[-19,3],[-9,-3+q],[-5,4],[3,-8],[12,-2-q],[19,3]],'#effcff',flare>0?2.1:.8)}c.restore()
  for(const side of [-1,1]){armour(c,[[side*15,cy+14],[side*24,cy+9],[side*23,cy-4],[side*18,cy-8]],m);line(c,[[side*19,cy+7],[side*19,cy-2]],m.accent,1.6)}
  if(!still&&flare>0){c.save();c.globalAlpha=flare;for(let i=0;i<3;i++){const a=i*TAU/3+time*3;line(c,[[Math.cos(a)*8,cy-11+Math.sin(a)*8],[Math.cos(a+.25)*18,cy-11+Math.sin(a+.25)*18],[Math.cos(a)*27,cy-11+Math.sin(a)*27]],'#e2fbff',1.2)}c.restore()}
  if(t.volleyCharge!==undefined)for(let i=0;i<3;i++)orb(c,(i-1)*8,-28-s*2,2.3,i<t.volleyCharge?'#e8fcff':'#5b6b81',m.side)
 }else{
  const cy=mu.y+4;vessel(c,0,cy+12,12,5,8,BRASS);c.save();c.translate(0,cy);c.rotate(aim+Math.PI/2);const pull=still?4:charge*10-kick*12
  line(c,[[0,12],[0,-28]],m.side,10);line(c,[[-2,10],[-2,-27]],m.roof,2);c.strokeStyle=m.front;c.lineWidth=5;c.beginPath();c.moveTo(-27,-14);c.quadraticCurveTo(-18,-30,0,-22);c.quadraticCurveTo(18,-30,27,-14);c.stroke();line(c,[[-27,-14],[0,pull],[27,-14]],'#f4e4be',1.3);line(c,[[0,7-kick*10],[0,-34-kick*5]],BRASS.roof,2.8);polygon(c,[[0,-42],[-4,-31],[4,-31]],'#e8efe0');gear(c,-9,8,4,charge*2,BRASS.front);gear(c,9,8,4,-charge*2,BRASS.front)
  for(const side of [-1,1]){armour(c,[[side*7,-19],[side*17,-27],[side*28,-17],[side*27,-11],[side*16,-20]],m);line(c,[[side*5,10],[side*5,-24]],BRASS.front,1.2);oval(c,side*26,-15,2,2,m.accent)}
  if(special&&!t.b){line(c,[[-29,-9],[-19,-21]],'#aac7be',2);line(c,[[29,-9],[19,-21]],'#aac7be',2)}
  if(special&&t.b)for(const side of [-1,1]){line(c,[[side*7,9],[side*7,-25]],m.front,3);polygon(c,[[side*7,-32],[side*7-3,-23],[side*7+3,-23]],BRASS.roof)}c.restore()
 }
 if(crown){line(c,[[-27,-7],[-27,-30]],BRASS.front,2);c.fillStyle=m.accent;c.beginPath();c.moveTo(-27,-30);c.quadraticCurveTo(-19,-33,-13,-27+(still?0:Math.sin(time*3)));c.lineTo(-27,-22);c.closePath();c.fill()}
 if(t.mastery?.includes('mastery:clear-water')){c.strokeStyle='#fff0bb';c.lineWidth=1.2;c.beginPath();c.ellipse(0,0,29,10,0,0,Math.PI);c.stroke()}
 if(t.mastery?.includes('mastery:night-keeper'))gem(c,29,-12,4,BRASS)
 if(t.mastery?.includes('mastery:specialists'))for(const side of [-1,1])gem(c,side*19,-5,2.8,m)
 if(crown&&t.mastery?.includes('contract:small-company'))for(const side of [-1,1]){line(c,[[side*25,-5],[side*29,-19]],'#dba075',1.5);for(let i=0;i<3;i++)leaf(c,side*(26+i),-9-i*4,5,side*.7,'#f5c690')}
 if(t.mastery?.includes('contract:last-lantern')){line(c,[[26,-28],[30,-23],[30,-12]],'#a6dae8',1.2);vessel(c,30,-8,4,2,7,{...m,front:'#91c7d3',side:'#3f708c',roof:'#e0faf4'});orb(c,30,-12,2.5,'#e4fcf5','#80bed6')}
 if(t.mastery?.includes('contract:twin-signals'))for(const y of [-2,2]){c.strokeStyle='#bed3e6';c.lineWidth=1.3;c.beginPath();c.ellipse(0,y,29,9,0,.05,Math.PI-.05);c.stroke()}
 c.restore()
}
const icons=new Map<string,string>()
export function fixedTowerIcon(id:TowerId,a=0,b=0,refinement=0,hero?:HeroId){const key=[id,a,b,refinement,hero].join(':');if(icons.has(key))return icons.get(key)!;const cv=document.createElement('canvas');cv.width=cv.height=192;const c=cv.getContext('2d')!;setArchitectureLight(c,true);c.translate(96,165);const k=id==='beam'?1.08:1.4;c.scale(k,k);drawFixedTower(c,0,0,{id,a,b,refinement,hero,angle:-.7,time:0,reducedMotion:true});const url=cv.toDataURL();icons.set(key,url);return url}
