import {drawCompactInvader} from './compact-invaders'
import type { Enemy } from '../game/sim'
import type { EnemyId } from '../game/defs'
import { currentPalette, ENEMY_MARK } from './palette'
import { lightPool, polygon } from './architecture'
import { dredgerOpen } from '../game/watch-craft'
import { boardPoint } from './board-view'
import { drawInvader } from './invader-art'

const colours:Record<EnemyId,string>={drip:'#7b8672',skitter:'#659aa1',shell:'#c18a63',veil:'#a5cce1',bloat:'#b89856',wisp:'#e5a966',mender:'#81ae8e',vshell:'#8d81a3',toad:'#8b9360',gloom:'#6f8daf',skiff:'#aa8a70',warden:'#7a95a0',reedling:'#94a06d',bloomheart:'#bf7d84',dredger:'#c39e70'}
const oval=(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
const stroke=(c:CanvasRenderingContext2D,points:number[][],colour:string,width=.08)=>{c.strokeStyle=colour;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
const shellPoses=new WeakMap<Enemy,{age:number;open:number}>()
const headings=new WeakMap<Enemy,number>()
const locomotion=new WeakMap<Enemy,{age:number;phase:number}>()

/** Hostile anatomy owns the silhouette; this wrapper keeps combat state readable. */
export function drawFixedEnemy(c:CanvasRenderingContext2D,e:Enemy,reducedMotion=false,showBars=true,wide=false,viewScale=1){
  const id=e.def.id,base=e.def.radius*(e.visScale??1)*(e.def.boss?1.2:1.62),r=base*Math.min(1.3,Math.max(1,9/Math.max(1,base*viewScale)))
  const hidden=e.def.hidden&&!e.revealedPerm&&e.seenT<=0,moving=!reducedMotion&&e.stunT<=0
  const gait=locomotion.get(e)??{age:e.age,phase:e.age+e.uid*.37}
  if(moving)gait.phase+=Math.max(0,Math.min(.15,e.age-gait.age))*(e.slowT>0?.48:1)
  gait.age=e.age;locomotion.set(e,gait)
  const t=reducedMotion?0:gait.phase,phase=t,col=currentPalette()==='clear'?ENEMY_MARK[id]:colours[id]
  const direction=boardPoint(e.tx,e.ty,wide),tx=direction.x,ty=direction.y
  const facing=tx>.18?1:tx<-.18?-1:headings.get(e)??1;headings.set(e,facing)
  const mirrored=['drip','vshell','skiff','warden'].includes(id)?facing:id==='gloom'?-facing:1
  const plated=e.shell>0,fractured=plated&&e.shell<e.maxShell*.5,hit=reducedMotion?0:Math.max(0,e.hitT)/.12
  c.save();c.translate(e.x,e.y)
  oval(c,3,6,r*(id==='gloom'?1.65:1.05),r*.34,'#07192191')
  if(!['wisp','mender','reedling'].includes(id)){
    c.strokeStyle='#bcebe85c';c.lineWidth=1;c.beginPath();c.ellipse(0,5,r*1.22,r*.43,0,.15,Math.PI-.15);c.stroke()
    if(moving){c.save();const opacity=c.globalAlpha;c.strokeStyle='#d4f0dd55';c.lineWidth=.8;for(let i=0;i<2;i++){const q=(phase*.8+i*.5)%1;c.globalAlpha=opacity*(1-q)*.45;c.beginPath();c.ellipse(-tx*r*q*.6,5-ty*r*q*.25,r*(1.1+q*.45),r*(.3+q*.16),0,.1,Math.PI-.1);c.stroke()}c.restore()}
  }
  let shellOpen=0
  if(id==='dredger'){
    const old=shellPoses.get(e),target=dredgerOpen(e)?1:0
    shellOpen=reducedMotion?target:old?old.open+(target-old.open)*Math.min(1,Math.max(0,e.age-old.age)*9):target
    shellPoses.set(e,{age:e.age,open:shellOpen})
  }
  c.save();c.globalAlpha*=hidden?.58:1;c.scale(r*mirrored,r);c.translate(-hit*.1,0);c.scale(1+hit*.06,1-hit*.065)
  if(!reducedMotion){
    if(['shell','vshell','dredger','toad'].includes(id))c.rotate(Math.sin(phase*4)*.023)
    if(['wisp','veil','mender'].includes(id))c.translate(0,Math.sin(phase*3)*.075)
  }
  if(id==='skitter')c.rotate(Math.atan2(ty,tx))
  if(showBars&&!e.def.boss&&r*viewScale<18)drawCompactInvader(c,e,col)
  else drawInvader(c,e,phase,col,shellOpen)
  if(plated&&e.shell/e.maxShell<.28){stroke(c,[[.48,-1.02],[.26,-.72],[.51,-.47],[.3,-.13]],'#3d354f',.09);stroke(c,[[-.56,-.6],[-.36,-.48],[-.49,-.2]],'#fff0c5',.065)}
  if(fractured){stroke(c,[[-.21,-1],[-.06,-.72],[-.29,-.48],[.09,-.32]],'#503f54',.06);stroke(c,[[-.06,-.72],[.22,-.79]],'#fff0c5',.045)}
  if(e.hitT>0){c.strokeStyle='#fff3c3';c.lineWidth=.065;c.beginPath();c.arc(0,-.4,.72,Math.PI*1.03,Math.PI*1.77);c.stroke()}
  c.restore()
  if(e.heatT>0)lightPool(c,0,-r*.45,r*1.4,'#ffc074',.23,1)
  if(e.burnT>0){
    for(const side of [-1,1]){const flicker=reducedMotion?.5:(Math.sin(t*12+side)+1)/2,x=side*r*.54,y=-r*.25;
      polygon(c,[[x-3,y],[x-4,y-5],[x+side*2,y-12-flicker*5],[x+4,y-4],[x+3,y+1]],'#ffb064')
      polygon(c,[[x-2,y],[x,y-8-flicker*3],[x+2,y]],'#ffe5a3')
    }
  }
  if(e.slowT>0){c.strokeStyle='#b7f2ed';c.lineWidth=1.4;c.beginPath();c.ellipse(0,5,r*1.12,r*.35,0,0,Math.PI*2);c.stroke();for(const side of [-1,1])polygon(c,[[side*r*.8,6],[side*r*1.1,-4],[side*r*1.3,5]],'#a8dfe0a8')}
  if(e.stunT>0)for(let i=0;i<3;i++){const x=(i-1)*r*.7,y=4;polygon(c,[[x-3,y],[x-5,y-r*.5],[x+1,y-r*(.85+i*.12)],[x+5,y-4]],'#c7f5edaa');stroke(c,[[x+1,y-r*(.85+i*.12)],[x+2,y-3]],'#f0fffa',1)}
  if(e.def.hidden){c.strokeStyle=hidden?'#c9dcff':'#fff0b5';c.lineWidth=1.3;c.setLineDash(hidden?[3,4]:[]);c.beginPath();c.ellipse(0,4,r*.8,r*.27,0,0,Math.PI*2);c.stroke();c.setLineDash([])}
  const barY=-r*(e.def.boss?2.25:id==='reedling'?2.5:id==='shell'?2.05:1.85),barW=Math.max(19,r*1.8)
  if(showBars&&(e.def.boss||e.hp<e.maxHp)){c.fillStyle='#101d29';c.fillRect(-barW/2-1,barY-1,barW+2,5);c.fillStyle='#ffb397';c.fillRect(-barW/2,barY,barW*Math.max(0,e.hp/e.maxHp),3)}
  // Intact armour is visible in the anatomy. Reserve meters for actual damage.
  if(showBars&&plated&&(e.def.boss||e.shell<e.maxShell)){c.fillStyle='#273d50';c.fillRect(-barW/2,barY+5,barW,2);c.fillStyle='#ffce89';c.fillRect(-barW/2,barY+5,barW*Math.max(0,e.shell/e.maxShell),2)}
  if(!e.def.boss&&e.signalT&&e.signalT>0){
    // A backed countdown is visible over both pale paving and dark water.
    const tellR=Math.max(r,46),arc=-Math.PI/2+Math.PI*2*Math.min(1,e.signalT/3)
    c.strokeStyle='#102330';c.lineWidth=5;c.beginPath();c.arc(0,0,tellR,-Math.PI/2,arc);c.stroke()
    c.strokeStyle=e.def.boss?'#ffb36c':'#c9efa6';c.lineWidth=2.6;c.stroke()
    polygon(c,[[0,-tellR-8],[-5,-tellR-15],[5,-tellR-15]],'#ffdb9b')
  }
  c.restore()
}
