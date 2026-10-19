import type {Sim} from '../game/sim'
import {districtLayout} from './district-layout'
import {block,lightPool,polygon} from './architecture'
import {arch,line,oval} from './miniature-art'

const grain=(n:number)=>{const v=Math.sin(n*17.713)*43758.54;return v-Math.floor(v)}
/** Cached masonry establishes a place without competing with moving units. */
export function paintQuayGround(c:CanvasRenderingContext2D,s:Sim){
 const day=!s.sky.night
 const base=c.createLinearGradient(-50,-140,820,930);base.addColorStop(0,day?'#233c46':'#101f2c');base.addColorStop(.5,day?'#344c52':'#192e39');base.addColorStop(1,day?'#1e3642':'#0e202e');c.fillStyle=base;c.fillRect(-50,-140,920,1070)
 // Broad worn flagstones, with quiet seams and occasional chipped corners.
 for(let row=0;row<42;row++)for(let col=0;col<19;col++){
  const x=-80+col*50+(row%2)*25,y=-140+row*27,n=row*19+col
  c.fillStyle=day?`rgba(132,157,159,${.012+grain(n)*.023})`:`rgba(119,153,166,${.009+grain(n)*.018})`
  if(grain(n+31)>.16)c.fillRect(x+1,y+1,48,25)
  if(grain(n+122)>.77){line(c,[[x+4,y+3],[x+16,y+3]],day?'#9aaca317':'#6b92a20e',.7)}
 }
 for(const p of districtLayout(s)){
  if(p.kind!=='house')continue
  c.fillStyle=day?'#566466':'#293f49';c.fillRect(p.x-43,p.y-26,86,54)
  c.strokeStyle=day?'#9a9f873f':'#75878c2d';c.lineWidth=1;c.strokeRect(p.x-40,p.y-23,80,48)
  for(let i=0;i<4;i++)line(c,[[p.x-39,p.y-18+i*12],[p.x+39,p.y-18+i*12]],day?'#263e493f':'#122a3877',1)
 }
 // Long cast shadows tie every structure and tree to the same afternoon light.
 for(const p of districtLayout(s)){
  c.save();c.globalAlpha=day?.2:.16
  polygon(c,[[p.x-19,p.y],[p.x+17,p.y-8],[p.x+55,p.y+29],[p.x+27,p.y+41]],'#071c28');c.restore()
 }
}

export function quayHouse(c:CanvasRenderingContext2D,x:number,y:number,style:number,night:boolean,reopened=false){
 const type=style%3,w=type===0?57:type===1?42:49,h=type===0?42:type===1?78:62
 const front=night?['#4a4544','#3e515c','#4b5555'][type]:['#77615a','#6e8286','#7b8275'][type],side=night?'#20313d':'#374b55',stone=night?'#8e968a':'#b7b59d'
 c.save();c.translate(x,y)
 block(c,0,4,w+13,30,7,side,stone,side)
 block(c,0,-3,w,25,h,front,stone,side)
 // Masonry courses, projecting cornices and an actual upper storey.
 for(let cy=-17;cy>-h;cy-=13){line(c,[[-w/2,cy],[w/2,cy]],night?'#142d394f':'#324e5b4c',1);for(let cx=-w/2+7;cx<w/2;cx+=17)line(c,[[cx,cy],[cx,cy+8]],night?'#142d3938':'#324e5b30',.8)}
 for(const cy of [-h-3,-h*.52,-5])line(c,[[-w/2-2,cy],[w/2+2,cy]],stone,2.8)
 for(const dx of [-12,10])for(const yy of [-13,-h*.57]){
  const lit=reopened||type===1&&dx<0
  arch(c,dx,yy,9,16,lit?'#edc48a':'#152e3a');line(c,[[dx-5,yy+1],[dx+5,yy+1]],stone,2)
  line(c,[[dx,yy-13],[dx,yy]],side,1);line(c,[[dx-4,yy-7],[dx+4,yy-7]],side,1)
  if(lit)lightPool(c,dx,yy-7,15,'#efba73',night?.3:.12,1)
 }
 const ridge=-h-22,roof=style%2?'#365666':'#575b60'
 polygon(c,[[-w/2-5,-h-4],[0,ridge],[w/2+7,-h-4],[7,-h+3]],roof)
 polygon(c,[[0,ridge],[12,ridge-8],[w/2+18,-h-12],[w/2+7,-h-4]],'#213d4b')
 for(let i=1;i<4;i++){const q=i/4;line(c,[[-(w/2+5)*q,ridge+18*q],[(w/2+7)*q,ridge+18*q]],night?'#73959555':'#a1b5b777',1)}
 line(c,[[-w/2-5,-h-4],[7,-h+3],[w/2+7,-h-4]],'#bc9a65',2)
 block(c,-10,-h-11,6,6,17,front,stone,side)
 // Warehouses have hoists; the tall clockmaker has a copper cupola.
 if(type===0){line(c,[[4,-h-3],[4,-h-19],[21,-h-19]],'#a88c66',2);line(c,[[19,-h-18],[19,-h+1]],'#a99d80',.9);oval(c,19,-h+2,3,2,'#182f39')}
 if(type===1){block(c,0,-h-18,14,10,14,front,stone,side);polygon(c,[[-10,-h-31],[0,-h-43],[12,-h-31],[3,-h-27]],'#6a9189');oval(c,0,-h-23,5,5,'#d1bd8b');line(c,[[0,-h-26],[0,-h-23],[3,-h-22]],'#263845',1)}
 arch(c,0,0,11,22,reopened?'#f2ca8a':'#152d38');line(c,[[-6,0],[6,0]],stone,2)
 if(reopened){
  // This actual storefront reopens after wave five, before the first act reward.
  polygon(c,[[-24,-21],[21,-21],[29,-11],[-29,-11]],'#98684c')
  for(let i=0;i<5;i++)polygon(c,[[-24+i*9,-21],[-19+i*9,-21],[-16+i*10,-11],[-22+i*10,-11]],'#d4b77e')
  line(c,[[-28,-10],[28,-10]],'#f2d699',2);block(c,14,7,20,9,7,'#6d5540','#c2a16a','#3b3c39')
  for(let i=0;i<4;i++)oval(c,7+i*5,-2,2,2,i%2?'#d8ac56':'#8caa72')
  lightPool(c,0,-7,52,'#f6c783',night?.6:.28)
 }else if(type===0){for(const dx of [-10,10]){block(c,dx,4,14,11,12,'#4a4e46','#7f7961','#303e3e');line(c,[[dx-5,2],[dx+5,-7]],'#918467',1)}}
 // Rain pipes, balcony rails and steps stay within the reserved plaza.
 line(c,[[w/2-3,-h],[w/2-3,1]],'#223b45',2);line(c,[[-19,6],[20,6]],stone,2)
 if(type===2){block(c,0,-h*.5+3,w+5,9,3,side,stone,side);for(let i=-2;i<=2;i++)line(c,[[i*9,-h*.5],[i*9,-h*.5-8]],'#a2a08a',.9);line(c,[[-23,-h*.5-8],[23,-h*.5-8]],'#b5ab8f',1.3)}
 // A hanging brass lantern and one quiet shop sign give the row a human scale.
 line(c,[[w/2,-26],[w/2+9,-26],[w/2+9,-20]],'#bda476',1.5)
 c.fillStyle=night?'#ffe0a0':'#c3b386';c.fillRect(w/2+6,-21,6,9);line(c,[[w/2+5,-22],[w/2+13,-22]],'#3b4b4d',2)
 if(night)lightPool(c,w/2+9,-16,28,'#e9b976',.4,1)
 oval(c,-w/2+3,-1,4,2,'#293f47');c.restore()
}
