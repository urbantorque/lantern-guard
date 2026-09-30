import type { Enemy } from '../game/sim'
import type { EnemyId } from '../game/defs'
import { currentPalette, ENEMY_MARK } from './palette'
import { lightPool, polygon } from './architecture'

const colours:Record<EnemyId,string>={drip:'#58d5ca',skitter:'#ffbd59',shell:'#f38469',veil:'#b6a2f1',bloat:'#ee88ae',wisp:'#fbd681',mender:'#80d59b',vshell:'#a0a1ec',toad:'#53bcb0',gloom:'#b593de',skiff:'#f0a06a',warden:'#749cdf',reedling:'#9cce68',bloomheart:'#eb91ba'}

/** Silhouettes communicate speed, armour and support before the colour is learned. */
export function drawFixedEnemy(c:CanvasRenderingContext2D,e:Enemy,reducedMotion=false){
  const r=e.def.radius*(e.visScale??1)*1.24,hidden=e.def.hidden&&!e.revealedPerm&&e.seenT<=0
  const phase=(e.age??0)*(e.def.id==='skitter'?14:7)+(e.uid??0)*1.7
  const moving=!reducedMotion&&!(e.stunT>0),bob=moving?Math.sin(phase)*r*.15:0
  const hit=!reducedMotion?Math.max(0,e.hitT??0)/.12:0
  const col=currentPalette()==='clear'?ENEMY_MARK[e.def.id]:colours[e.def.id]
  c.save();c.translate(e.x,e.y);c.globalAlpha=hidden?.48:1
  c.fillStyle='#092c4655';c.beginPath();c.ellipse(2,5,r*1.07,r*.36,0,0,Math.PI*2);c.fill()
  // A travelling wake anchors every creature to the canal surface.
  c.strokeStyle='#c5fff5a0';c.lineWidth=1.6
  for(let i=0;i<2;i++){const drift=moving?((e.age??0)*2.5+i*.5)%1:i*.5;c.save();c.globalAlpha*=1-drift*.7;c.beginPath();c.ellipse(-(e.tx??0)*drift*r,4-(e.ty??0)*drift*r,r*(1.05+drift*.55),r*(.35+drift*.17),0,.1,Math.PI-.1);c.stroke();c.restore()}
  c.save();c.translate(0,-2-bob);const squash=moving?Math.sin(phase)*.035:0;c.scale(1+hit*.14+squash,1-hit*.18-squash)
  const boss=e.def.boss,armoured=(e.shell??0)>0,swift=e.def.id==='skitter'||e.def.id==='skiff'
  if(swift){
    // Low hull, pointed nose and paddles for the fast families.
    for(const side of [-1,1]){c.save();c.translate(side*r*.8,-r*.2);c.rotate(side*(.4+(moving?Math.sin(phase)*.35:0)));polygon(c,[[0,-3],[side*r*.6,0],[side*r*.5,5],[0,3]],'#ffe3a0');c.restore()}
    polygon(c,[[-r,-r*.2],[-r*.5,-r*1.1],[r*.5,-r*1.1],[r*1.15,-r*.3],[r*.7,r*.3],[-r*.7,r*.3]],col)
    polygon(c,[[0,-r*1.1],[r*.5,-r*1.1],[r*1.15,-r*.3],[r*.7,r*.3],[0,0]],'#582f4844')
  }else if(e.def.hidden||e.def.id==='wisp'){
    // Floating cloaks have a scalloped hem and long ears.
    polygon(c,[[-r,r*.1],[-r*.8,-r],[-r*.3,-r*1.65],[r*.3,-r*1.65],[r*.8,-r],[r,r*.1],[r*.4,-r*.12],[0,r*.3],[-r*.4,-r*.12]],col)
    polygon(c,[[0,-r*1.65],[r*.3,-r*1.65],[r*.8,-r],[r,r*.1],[r*.4,-r*.12],[0,r*.3]],'#45346844')
  }else{
    // Soft polygonal bodies still belong to the miniature architecture.
    const body=[[-r,-r*.25],[-r*.85,-r*.9],[-r*.35,-r*1.35],[r*.4,-r*1.35],[r*.92,-r*.78],[r,r*.05],[r*.5,r*.3],[-r*.5,r*.3]]
    polygon(c,body,col)
    polygon(c,[[r*.4,-r*1.35],[r*.92,-r*.78],[r,r*.05],[r*.5,r*.3],[0,0],[0,-r*.7]],'#23365d44')
    c.fillStyle='#ffffff38';c.beginPath();c.ellipse(-r*.4,-r*.9,r*.3,r*.13,-.5,0,Math.PI*2);c.fill()
    if(e.def.id==='bloat'||boss){for(const side of [-1,1])polygon(c,[[side*r*.6,-r],[side*r*.9,-r*1.65],[side*r*.15,-r*1.2]],col)}
  }
  if(armoured){
    polygon(c,[[-r,-r*.35],[-r*.65,-r*1.25],[0,-r*1.55],[r*.8,-r*1.1],[r,-r*.35],[r*.52,-r*.6],[0,-r*.95],[-r*.6,-r*.65]],'#f4d3a0')
    c.strokeStyle='#aa7460';c.lineWidth=2;c.beginPath();c.moveTo(0,-r*1.55);c.lineTo(0,-r*.95);c.stroke()
  }
  if(boss){
    polygon(c,[[-r*.7,-r*1.2],[-r*.8,-r*1.95],[-r*.28,-r*1.65],[0,-r*2.15],[r*.3,-r*1.65],[r*.8,-r*1.95],[r*.7,-r*1.2]],'#ffd075')
    c.fillStyle='#fff2b4';c.fillRect(-3,-r*1.75,6,7)
  }
  if(e.shrouded){c.fillStyle='#60509b55';c.beginPath();c.ellipse(0,-r*.5,r*1.17,r*1.2,0,0,Math.PI*2);c.fill()}
  const look=Math.max(-2,Math.min(2,(e.tx??0)*2)),ey=-r*.5
  c.fillStyle='#173c50';c.beginPath();c.roundRect(-r*.65,ey-r*.18,r*1.22,r*.4,r*.16);c.fill()
  c.fillStyle='#fff6cd';for(const x of [-r*.37,r*.28]){c.beginPath();c.ellipse(x+look,ey,r*.11,r*.14,0,0,Math.PI*2);c.fill()}
  if((e.hitT??0)>0){c.strokeStyle='#fff6ca';c.lineWidth=2;c.beginPath();c.arc(0,-r*.5,r*.87,Math.PI,Math.PI*1.8);c.stroke()}
  if((e.heatT??0)>0)lightPool(c,0,-r*.5,r*1.6,'#ffad56',.5,1)
  if(e.def.heal||e.def.id==='bloomheart'){c.strokeStyle='#e4ffc9';c.lineWidth=3;c.beginPath();c.moveTo(-5,-r*1.02);c.lineTo(5,-r*1.02);c.moveTo(0,-r*1.02-5);c.lineTo(0,-r*1.02+5);c.stroke()}
  c.restore()
  if(e.slowT>0){c.strokeStyle='#d7faff';c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.ellipse(0,4,r*1.2,r*.4,0,0,Math.PI*2);c.stroke();c.setLineDash([])}
  if(e.stunT>0){c.fillStyle='#fff0a3';for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(reducedMotion?0:(e.age??0)*4);const x=Math.cos(a)*r*.9,y=-r*1.75+Math.sin(a)*r*.22;polygon(c,[[x,y-3],[x+3,y],[x,y+3],[x-3,y]],'#fff0a3')}}
  if(e.def.hidden){c.strokeStyle='#e3cfff';c.lineWidth=1.5;c.setLineDash(hidden?[3,3]:[]);c.beginPath();c.ellipse(0,4,r*.8,r*.27,0,0,Math.PI*2);c.stroke();c.setLineDash([])}
  if(boss||e.hp<e.maxHp){const w=Math.max(24,r*1.9),y=-r*(boss?2.45:1.85);c.fillStyle='#173546';c.fillRect(-w/2-1,y-1,w+2,6);c.fillStyle='#a8f0aa';c.fillRect(-w/2,y,w*Math.max(0,e.hp/e.maxHp),4)}
  if(e.signalT&&e.signalT>0){c.strokeStyle='#ffdc8f';c.lineWidth=3;c.beginPath();c.arc(0,0,Math.max(r,50),-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e.signalT/3));c.stroke()}
  c.restore()
}
