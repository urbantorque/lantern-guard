import {drawFixedTower} from '../src/render/fixed-towers'
import {drawFixedEnemy} from '../src/render/fixed-enemies'
import {block,lightPool,setArchitectureLight} from '../src/render/architecture'
import {quayHouse} from '../src/render/quay-art'
import {ENEMIES} from '../src/game/defs'
import type {Enemy} from '../src/game/sim'

/** Authored storefront composition using the game's own vector models, at native output resolution. */
export function drawCover(canvas:HTMLCanvasElement){
 const c=canvas.getContext('2d')!,w=1000,h=canvas.height/canvas.width*w,wide=h<700,portrait=h>1100
 c.save();c.scale(canvas.width/w,canvas.width/w)
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#071c2a');bg.addColorStop(.6,'#153c49');bg.addColorStop(1,'#071921');c.fillStyle=bg;c.fillRect(0,0,w,h)
 setArchitectureLight(c,false)
 lightPool(c,720,h*.59,520,'#52bac0',.5,1)
 // A continuous waterway leads the eye from the defence into the siege engine.
 const water=()=>{c.beginPath();c.moveTo(-120,h*.9);c.bezierCurveTo(260,h*.93,300,h*(portrait?.28:.39),670,h*(portrait?.49:.62));c.bezierCurveTo(860,h*(portrait?.62:.75),1080,h*.27,1150,h*.35)}
 c.lineCap='round';water();c.strokeStyle='#071b28';c.lineWidth=154;c.stroke();water();c.strokeStyle='#829b91';c.lineWidth=126;c.stroke();water();c.strokeStyle='#1d4958';c.lineWidth=110;c.stroke();water();c.strokeStyle='#317e89';c.lineWidth=85;c.stroke();water();c.strokeStyle='#78c6bd55';c.lineWidth=2;c.stroke()
 const house=(x:number,y:number,k:number,style:number)=>{c.save();c.translate(x,y);c.scale(k,k);quayHouse(c,0,0,style,true);c.restore()}
 c.globalAlpha=.65;house(80,h*.47,wide?1.5:2,0);house(875,h*.39,wide?1.5:2,1);house(945,h*.42,wide?1.2:1.6,2);c.globalAlpha=1
 for(let i=0;i<32;i++){const x=(i*137+51)%1000,y=h*.37+((i*97)%Math.max(1,h*.6));lightPool(c,x,y,2+(i%3),'#f6cc7d',.7,1)}
 const tower=(x:number,y:number,k:number,id:'wick'|'cracker'|'ballista',hero:'sol'|'ivo',a=2)=>{c.save();c.translate(x,y);c.scale(k,k);setArchitectureLight(c,false);block(c,0,15,85,45,24,'#375361','#72958f','#1c3542');drawFixedTower(c,0,0,{id,a,b:0,hero,refinement:1,angle:-.35,time:1,since:1,reducedMotion:true});c.restore()}
 tower(142,h*(portrait?.56:.62),wide?1.15:1.8,'wick','sol')
 const boss=ENEMIES.dredger,bx=wide?700:680,by=h*(portrait?.49:.64),bs=wide?2.6:portrait?4.1:3.4
 c.save();c.translate(bx,by);c.scale(bs,bs)
 drawFixedEnemy(c,{x:0,y:0,def:boss,hp:440,maxHp:440,shell:24,maxShell:24,uid:16,age:2,hitT:0,heatT:0,stunT:0,tx:-1,ty:0,visScale:1,revealedPerm:true,seenT:0,shrouded:false,slowT:0}as Enemy,true,false)
 c.restore()
 tower(295,h*(portrait?.83:.87),wide?2.2:portrait?4.1:3.6,'cracker','sol')
 tower(875,h*.92,wide?1.35:2.1,'ballista','ivo')
 // A single shell and its warm trail make the conflict legible at thumbnail size.
 const sx=350,sy=h*(portrait?.83:.87)-(wide?120:portrait?230:195),ex=bx-35,ey=by-30
 c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+ex)/2,Math.min(sy,ey)-100,ex,ey);c.strokeStyle='#ffc96c35';c.lineWidth=12;c.stroke();c.strokeStyle='#ffe5a8';c.lineWidth=3;c.stroke()
 lightPool(c,ex,ey,65,'#ffc56d',.8,1);c.fillStyle='#fff0be';c.beginPath();c.arc(ex,ey,7,0,Math.PI*2);c.fill()
 // Only the game title appears on covers, per the publisher's artwork rules.
  // Publisher badge rectangles differ by aspect ratio. Keep landscape/square
  // titles to their right and the portrait title below the reserved region.
  const sideTitle=!portrait,titleY=wide?140:portrait?420:190,titleSize=sideTitle?92:136
 const shade=c.createLinearGradient(0,0,0,titleY+120);shade.addColorStop(0,'#061722');shade.addColorStop(.58,'#061722eb');shade.addColorStop(1,'#06172200');c.fillStyle=shade;c.fillRect(0,0,w,titleY+120)
  c.textAlign=sideTitle?'right':'center';c.font=`800 ${titleSize}px "DM Sans Variable",sans-serif`;c.letterSpacing='-6px'
  c.shadowColor='#00000090';c.shadowBlur=14;c.shadowOffsetY=7;c.fillStyle='#f5dba3';c.fillText('NIGHTWARD',sideTitle?950:500,titleY,sideTitle?530:900)
 c.shadowBlur=0;c.shadowOffsetY=0;c.restore()
}
