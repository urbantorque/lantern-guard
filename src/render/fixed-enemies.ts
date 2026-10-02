import type { Enemy } from '../game/sim'
import type { EnemyId } from '../game/defs'
import { currentPalette, ENEMY_MARK } from './palette'
import { lightPool, polygon } from './architecture'
import { dredgerOpen } from '../game/watch-craft'

const colours:Record<EnemyId,string>={drip:'#d2ae79',skitter:'#6be6da',shell:'#ee8762',veil:'#8fd9ff',bloat:'#edb85d',wisp:'#ffdb97',mender:'#91e2ba',vshell:'#c3b5fc',toad:'#85b77b',gloom:'#749dd5',skiff:'#edb775',warden:'#829cb3',reedling:'#b0cf73',bloomheart:'#f195b6',dredger:'#e8b781'}
const oval=(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
const stroke=(c:CanvasRenderingContext2D,points:number[][],colour:string,width=.08)=>{c.strokeStyle=colour;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
const eye=(c:CanvasRenderingContext2D,x:number,y:number,size=.1)=>{oval(c,x,y,size*1.4,size*1.45,'#fff6d7');oval(c,x+.025,y,size*.58,size*.88,'#163340')}
const fin=(c:CanvasRenderingContext2D,points:number[][],fill:string)=>polygon(c,points,fill)

/** Fifteen independent silhouettes. Animation follows anatomy, rather than a shared bob. */
export function drawFixedEnemy(c:CanvasRenderingContext2D,e:Enemy,reducedMotion=false,showBars=true){
  const id=e.def.id,r=e.def.radius*(e.visScale??1)*(e.def.boss?1.1:1.32)
  const hidden=e.def.hidden&&!e.revealedPerm&&e.seenT<=0,moving=!reducedMotion&&e.stunT<=0
  const t=moving?e.age:0,phase=t+(moving?e.uid*.37:0),col=currentPalette()==='clear'?ENEMY_MARK[id]:colours[id]
  const plated=e.shell>0,fractured=plated&&e.shell<e.maxShell*.5,hit=reducedMotion?0:Math.max(0,e.hitT)/.12
  c.save();c.translate(e.x,e.y)
  oval(c,2,5,r*(id==='gloom'?1.65:1.05),r*.3,'#082c4650')
  c.strokeStyle='#bcebe870';c.lineWidth=1
  if(!['wisp','mender','reedling'].includes(id)){c.beginPath();c.ellipse(0,5,r*1.22,r*.43,0,.15,Math.PI-.15);c.stroke()}
  c.save();c.globalAlpha=hidden?.58:1;c.scale(r,r);c.translate(-hit*.1,0)
  if(id==='drip'){
    // Pebble Pup: low salamander, four feet and a wagging paddle tail.
    const step=Math.sin(phase*11)*.13
    fin(c,[[-.7,-.24],[-1.2,-.16+step],[-1.05,.14],[-.4,.12]],'#7d8471')
    for(const side of [-1,1])for(const x of [-.45,.4])oval(c,x+step*side,.2,.2,.1,'#6c7568')
    oval(c,0,-.24,.78,.53,col);oval(c,.33,-.41,.5,.38,'#eee0b6')
    for(const x of [-.38,-.12,.1])oval(c,x,-.62,.09,.06,'#8e9476')
    eye(c,.24,-.48,.11);eye(c,.57,-.44,.09);stroke(c,[[.27,-.18],[.54,-.17]],'#6e796a',.045)
  }else if(id==='skitter'){
    // Needlefin: a long, pointed fish. Tail beats; the body remains a clean dart.
    c.rotate(Math.atan2(e.ty,e.tx)*.25);const tail=Math.sin(phase*22)*.23
    fin(c,[[-.72,-.22],[-1.6,-.75+tail],[-1.28,-.05],[-1.6,.55+tail],[-.72,.16]],'#2994ae')
    fin(c,[[-1,-.18],[.28,-.58],[1.65,-.08],[.25,.25],[-1,.13]],col)
    fin(c,[[-.2,-.46],[-.4,-1],[.55,-.37]],'#d7fff0')
    fin(c,[[-.1,.13],[-.4,.65],[.6,.15]],'#f5d990');eye(c,.6,-.15,.1)
    stroke(c,[[-.65,-.07],[.75,-.09],[1.37,-.08]],'#dffff3',.055)
  }else if(id==='shell'){
    // Ironback: articulated crab legs, exposed eyes and a segmented metal shell.
    for(const side of [-1,1])for(let i=0;i<3;i++){const kick=Math.sin(phase*8+i*2)*.13;stroke(c,[[side*.65,-.2+i*.14],[side*(1.15+i*.08),-.38+i*.28],[side*(1.35+i*.05),.18+i*.12+kick]],'#694653',.12)}
    oval(c,0,-.15,.8,.52,'#98596a')
    for(const side of [-1,1]){stroke(c,[[side*.64,-.4],[side*1.02,-.8]],col,.17);fin(c,[[side*.98,-.66],[side*1.4,-1.05],[side*1.28,-.58],[side*.98,-.48]],col);eye(c,side*.36,-.7,.12)}
    if(plated){fin(c,[[-.85,-.35],[-.65,-1.04],[0,-1.25],[.7,-1.04],[.88,-.35],[.45,-.06],[-.45,-.06]],col);stroke(c,[[0,-1.2],[0,-.16]],'#ffd5a2',.075);for(const x of [-.43,.43])oval(c,x,-.66,.09,.08,'#ffe6b1')}
    else{oval(c,0,-.44,.52,.27,'#ffa98d');stroke(c,[[-.27,-.51],[.27,-.51]],'#ffe5bb',.06)}
  }else if(id==='wisp'){
    // Lantern moth: wings beat around a narrow luminous abdomen, no humanoid face.
    const wing=.65+Math.abs(Math.sin(phase*15))*.55
    for(const side of [-1,1]){fin(c,[[side*.12,-.6],[side*1.2*wing,-1.05],[side*1.48*wing,-.4],[side*.25,-.2]],'#fff1bd');fin(c,[[side*.15,-.25],[side*1.1*wing,.35],[side*.8*wing,.58],[side*.08,.1]],'#ef9c92');oval(c,side*.75*wing,-.55,.17,.12,col)}
    oval(c,0,-.28,.19,.56,'#a06652');oval(c,0,-.18,.12,.24,'#ffefac');eye(c,0,-.75,.1)
    stroke(c,[[-.06,-.72],[-.3,-1.1]],'#ffeac0',.04);stroke(c,[[.06,-.72],[.3,-1.1]],'#ffeac0',.04)
  }else if(id==='veil'){
    // Glass ray: wide kite wings, sweeping tail and a transparent rib structure.
    const wing=Math.sin(phase*4)*.2
    stroke(c,[[0,.02],[.24,.7],[-.2,1.25],[.15,1.7]],'#b7d5fa',.055)
    fin(c,[[0,-1.1],[-.45,-.56],[-1.55,-.25+wing],[-.92,.48],[0,.08],[.92,.48],[1.55,-.25-wing],[.45,-.56]],col)
    fin(c,[[0,-1.1],[-.45,-.56],[-1.55,-.25+wing],[0,-.22]],'#e2ffff65')
    for(const side of [-1,1]){stroke(c,[[0,-.64],[side*.9,-.14],[side*.95,.34]],'#ecffff8c',.04);eye(c,side*.19,-.48,.08)}
  }else if(id==='bloat'){
    // Brinebelly: the roster's one inflated body. Spines and tiny fins signal fragility.
    const breath=1+Math.sin(phase*3)*.035;c.scale(breath,breath)
    for(let i=0;i<10;i++){const a=i*Math.PI/5;fin(c,[[Math.cos(a)*.82,Math.sin(a)*.82-.3],[Math.cos(a+.1)*1.17,Math.sin(a+.1)*1.17-.3],[Math.cos(a+.24)*.82,Math.sin(a+.24)*.82-.3]],'#d58456')}
    oval(c,0,-.32,.92,.87,col);oval(c,0,.01,.62,.43,'#ffe4a6')
    for(const side of [-1,1]){fin(c,[[side*.7,-.15],[side*1.28,-.48+Math.sin(phase*9)*.1],[side*1.18,.03]],'#f5c9a4');eye(c,side*.35,-.51,.14)}
    oval(c,0,-.22,.09,.14,'#9e5d52');for(const x of [-.52,-.1,.36])oval(c,x,-.86,.085,.09,'#b78454')
  }else if(id==='mender'){
    // Bloom Jelly: breathing bell and trailing tendrils, with a living flower at its crown.
    for(let i=0;i<5;i++){c.strokeStyle=i%2?'#d3ffcb':'#67c8bc';c.lineWidth=.07;c.beginPath();c.moveTo((i-2)*.3,-.1);c.bezierCurveTo((i-2)*.38,.4,(i-2)*.25+Math.sin(phase*3+i)*.2,.7,(i-2)*.35,.97+Math.sin(phase*4+i)*.13);c.stroke()}
    oval(c,0,-.65,.92,.65,col);fin(c,[[-.9,-.34],[-.42,-.13],[0,-.32],[.45,-.12],[.9,-.34]],'#d2f6c3')
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(c,Math.cos(a)*.23,-1.06+Math.sin(a)*.19,.17,.12,'#fff0c7')}
    oval(c,0,-1.06,.12,.12,'#f3b779');eye(c,-.26,-.55,.075);eye(c,.26,-.55,.075)
  }else if(id==='vshell'){
    // Mirror Snail: heavy spiral glass shell and two high eye stalks.
    c.translate(Math.sin(phase*3)*.035,0)
    fin(c,[[-.9,.2],[-.65,-.15],[.85,-.22],[1.35,.16],[.87,.36],[-.95,.34]],'#679eac')
    for(const side of [-1,1]){const tip=.8+side*.17+Math.sin(phase*2+side)*.065;stroke(c,[[.75,-.08],[tip,-.64]],'#91c8d3',.1);eye(c,tip,-.69,.1)}
    if(plated){oval(c,-.23,-.7,.8,.82,col);c.strokeStyle='#f6ecff';c.lineWidth=.075;c.beginPath();for(let i=0;i<42;i++){const a=i*.27,rad=.65*(1-i/44),x=-.23+Math.cos(a)*rad,y=-.72+Math.sin(a)*rad;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();fin(c,[[-.73,-1.13],[-.15,-1.45],[.14,-.94],[-.21,-.76]],'#ffffff55')}
    else oval(c,-.3,-.23,.56,.28,'#a6bbc4')
  }else if(id==='skiff'){
    // Rivet Racer: mechanical launch, a working propeller and a chimney.
    const spin=Math.sin(phase*(plated?14:25));stroke(c,[[-1.1,-.1],[-1.35,-.1]],'#d9e5d5',.09);stroke(c,[[-1.35,-.1-spin*.3],[-1.35,-.1+spin*.3]],'#f3ce8f',.08)
    fin(c,[[-1.1,-.35],[.88,-.42],[1.4,-.14],[.83,.27],[-.76,.26]],plated?col:'#b36958')
    fin(c,[[-.8,-.45],[.66,-.5],[.25,-.9],[-.62,-.82]],'#fff0bc');c.fillStyle='#4f6b79';c.fillRect(-.48,-1.35,.22,.62);c.fillStyle='#eccb98';c.fillRect(-.51,-1.4,.28,.1)
    for(let i=0;i<3;i++)oval(c,-.44+i*.37,-.16,.085,.09,'#243e50');oval(c,.28,-.66,.2,.13,'#8be3e0')
    if(moving){c.globalAlpha*=.4;oval(c,-.4-Math.sin(phase*2)*.08,-1.7-(phase%1)*.24,.17,.12,'#dae8d6')}
  }else if(id==='reedling'){
    // Stiltroot: a tall seedpod on four walking stems, unlike every swimming form.
    for(let i=0;i<4;i++){const side=i<2?-1:1,kick=Math.sin(phase*8+i*2)*.17;stroke(c,[[side*.3,-.6],[side*(.75+(i%2)*.25),-.1+kick],[side*(.65+(i%2)*.42),.62-kick]],'#557c64',.105)}
    fin(c,[[0,-1.7],[-.55,-1.23],[-.48,-.56],[0,-.24],[.5,-.56],[.58,-1.23]],plated?'#d7be7d':col)
    fin(c,[[0,-1.65],[.58,-1.23],[.5,-.56],[0,-.24]],'#588a6d');stroke(c,[[0,-1.6],[0,-.45]],'#dfefb4',.06)
    fin(c,[[-.05,-1.5],[-.73,-1.99],[-.74,-1.56],[-.1,-1.3]],'#a9d786');fin(c,[[.03,-1.6],[.51,-2.2],[.76,-1.98],[.08,-1.43]],'#d2e59d');eye(c,-.18,-.93,.09);eye(c,.21,-.93,.09)
  }else if(id==='toad'){
    // Mossjaw: broad jaw and haunches, a whole moss island on its back.
    const breath=Math.sin(phase*2)*.05
    for(const side of [-1,1]){oval(c,side*.97,-.1,.42,.38,'#587f69');fin(c,[[side*.7,.05],[side*1.35,.35],[side*.7,.3]],'#c5c998')}
    oval(c,0,-.55,1.08,.9,col);oval(c,0,-.07,.87,.42,'#d5d3a5')
    for(const side of [-1,1]){oval(c,side*.62,-1,.34,.3,'#639668');eye(c,side*.62,-1.03,.17)}
    stroke(c,[[-.74,-.13],[-.3,.02],[.32,.02+breath],[.75,-.14]],'#355b4c',.1)
    for(let i=0;i<5;i++)fin(c,[[(i-2)*.3-.17,-1.12],[(i-2)*.3,-1.72-(i%2)*.22],[(i-2)*.3+.2,-1.1]],i%2?'#497e62':'#b5cc81')
    for(const x of [-.44,.27])oval(c,x,-1.57,.16,.1,'#efc896')
  }else if(id==='gloom'){
    // Umbra Leviathan: jointed serpent with a dorsal sail and a narrow predatory head.
    for(let i=5;i>=0;i--){const x=(i-2)*.48,y=-.25+Math.sin(phase*2-i*.75)*.17,sz=.57-i*.06;oval(c,x,y,sz,sz*.74,i%2?'#507cb0':col);fin(c,[[x-.18,y-.3],[x+.12,y-.94-i*.02],[x+.36,y-.28]],'#b4c4f3')}
    fin(c,[[-1.38,-.77],[-.85,-1.06],[-.34,-.73],[-.54,-.1],[-1.44,-.11],[-1.88,-.35]],'#a6d4ec');eye(c,-1.23,-.63,.14)
    stroke(c,[[-1.77,-.31],[-.72,-.28]],'#29466f',.08);for(let i=0;i<4;i++)fin(c,[[-1.48+i*.18,-.31],[-1.41+i*.18,-.08],[-1.34+i*.18,-.31]],'#fff2cb')
    if(e.shrouded){c.globalAlpha*=.45;oval(c,0,-.38,1.75,.88,'#313e78')}
  }else if(id==='warden'){
    // Warden: an ironclad vessel. Funnels, bridge and bow replace the old crowned blob.
    const roll=Math.sin(phase*1.5)*.025;c.rotate(roll)
    fin(c,[[-1.34,-.39],[.87,-.46],[1.48,-.05],[.94,.44],[-.9,.44],[-1.47,.05]],'#3b596c')
    fin(c,[[-1.2,-.38],[.88,-.41],[1.3,-.06],[.7,.08],[-1.19,.1]],col)
    for(const x of [-.85,-.43,0,.43,.83]){c.fillStyle=plated?'#dec68f':'#819cad';c.fillRect(x,-.05,.25,.22)}
    c.fillStyle='#425b72';c.fillRect(-.54,-1.1,.33,.86);c.fillRect(.04,-1.28,.3,1.03);c.fillStyle='#e1c58f';c.fillRect(-.59,-1.15,.43,.12);c.fillRect(-.01,-1.33,.4,.12)
    fin(c,[[.46,-.27],[.46,-1.5],[.99,-1.5],[1.1,-.29]],'#769cab');c.fillStyle='#ffdfa0';c.fillRect(.56,-1.32,.35,.17);stroke(c,[[.72,-1.5],[.72,-1.95]],'#dde7cf',.045);fin(c,[[.72,-1.92],[1.2,-1.77],[.72,-1.63]],'#e7967a')
    for(const x of [-.78,-.2,.37])oval(c,x,.07,.045,.045,'#f3ddb0')
  }else if(id==='bloomheart'){
    // Thorn Matriarch: radial petals, clawing roots and a seed-filled open maw.
    for(let i=0;i<6;i++){const a=i*Math.PI/3,sw=Math.sin(phase*2+i)*.12;stroke(c,[[Math.cos(a)*.5,-.2+Math.sin(a)*.3],[Math.cos(a)*1.12,-.2+Math.sin(a)*.62],[Math.cos(a+sw)*1.55,.14+Math.sin(a)*.7]],'#4c8c76',.16)}
    c.save();c.translate(0,-.85);c.rotate(moving?Math.sin(phase)*.04:0)
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,reach=1.16+Math.sin(phase*1.5+i)*.04;fin(c,[[Math.cos(a-.3)*.43,Math.sin(a-.3)*.43],[Math.cos(a-.2)*reach,Math.sin(a-.2)*reach],[Math.cos(a)*1.4,Math.sin(a)*1.4],[Math.cos(a+.22)*reach,Math.sin(a+.22)*reach],[Math.cos(a+.3)*.43,Math.sin(a+.3)*.43]],i%2?'#d56e9a':col)}
    oval(c,0,0,.55,.55,'#553658');for(let i=0;i<8;i++){const a=i*Math.PI/4;fin(c,[[Math.cos(a-.2)*.47,Math.sin(a-.2)*.47],[Math.cos(a)*.26,Math.sin(a)*.26],[Math.cos(a+.2)*.47,Math.sin(a+.2)*.47]],'#ffe7bc')}
    oval(c,0,0,.15,.19,'#f1c176');c.restore()
  }else if(id==='dredger'){
    // Dredger: hinged nautilus shell reveals a hot coral core at marked bends.
    const open=dredgerOpen(e),hinge=open?.35:0
    for(let i=0;i<5;i++){const x=(i-2)*.4;stroke(c,[[x,-.15],[x+Math.sin(phase*3+i)*.15,.33],[x-.15,.55]],'#a47470',.13)}
    oval(c,0,-.55,1.02,.87,'#805b68');oval(c,0,-.55,.6,.6,open?'#ffd29b':'#8e7779')
    if(open){c.save();c.globalAlpha=.32;oval(c,0,-.55,.83,.83,'#fff2bc');c.restore();fin(c,[[0,-1.04],[.36,-.57],[0,-.13],[-.36,-.57]],'#fff2bc')}
    for(const side of [-1,1]){c.save();c.translate(side*hinge,-hinge*.4);fin(c,[[side*.04,-1.53],[side*.75,-1.28],[side*1.05,-.64],[side*.9,.04],[side*.2,.18],[side*.4,-.48]],col);stroke(c,[[side*.31,-1.35],[side*.67,-.92],[side*.72,-.35],[side*.37,.01]],'#916570',.07);c.restore()}
    for(const side of [-1,1]){stroke(c,[[side*.5,-.13],[side*.9,-.42]],'#aa9c88',.1);eye(c,side*.94,-.42,.105)}
  }
  if(fractured){stroke(c,[[-.21,-1],[-.06,-.72],[-.29,-.48],[.09,-.32]],'#503f54',.06);stroke(c,[[-.06,-.72],[.22,-.79]],'#fff0c5',.045)}
  if(e.hitT>0){c.strokeStyle='#fff3c3';c.lineWidth=.065;c.beginPath();c.arc(0,-.4,.72,Math.PI*1.03,Math.PI*1.77);c.stroke()}
  c.restore()
  if(e.heatT>0)lightPool(c,0,-r*.45,r*1.4,'#ffc074',.23,1)
  if(e.slowT>0){c.strokeStyle='#d5ffff';c.lineWidth=1.4;c.setLineDash([4,5]);c.beginPath();c.ellipse(0,5,r*1.12,r*.35,0,0,Math.PI*2);c.stroke();c.setLineDash([])}
  if(e.stunT>0)for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(moving?t*4:0),x=Math.cos(a)*r*.65,y=-r*1.85+Math.sin(a)*r*.15;polygon(c,[[x,y-2],[x+2,y],[x,y+2],[x-2,y]],'#fff0a3')}
  if(e.def.hidden){c.strokeStyle=hidden?'#c9dcff':'#fff0b5';c.lineWidth=1.3;c.setLineDash(hidden?[3,4]:[]);c.beginPath();c.ellipse(0,4,r*.8,r*.27,0,0,Math.PI*2);c.stroke();c.setLineDash([])}
  const barY=-r*(e.def.boss?2.25:id==='reedling'?2.4:1.75),barW=Math.max(19,r*1.8)
  if(showBars&&(e.def.boss||e.hp<e.maxHp)){c.fillStyle='#173546';c.fillRect(-barW/2-1,barY-1,barW+2,5);c.fillStyle='#bcf1bb';c.fillRect(-barW/2,barY,barW*Math.max(0,e.hp/e.maxHp),3)}
  if(showBars&&plated){c.fillStyle='#273d50';c.fillRect(-barW/2,barY+5,barW,2);c.fillStyle='#ffce89';c.fillRect(-barW/2,barY+5,barW*Math.max(0,e.shell/e.maxShell),2)}
  if(e.signalT&&e.signalT>0){c.strokeStyle='#ffdc8f';c.lineWidth=2;c.beginPath();c.arc(0,0,Math.max(r,46),-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e.signalT/3));c.stroke()}
  c.restore()
}
