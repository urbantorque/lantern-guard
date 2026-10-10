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
  c.fillStyle=day?`rgba(132,157,159,${.025+grain(n)*.04})`:`rgba(119,153,166,${.018+grain(n)*.025})`
  c.fillRect(x+1,y+1,48,25)
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

export function quayHouse(c:CanvasRenderingContext2D,x:number,y:number,style:number,night:boolean){
 const w=42+style%2*7,h=58+(style%3)*8,front=night?'#3c525c':'#7c8c8b',side=night?'#233b49':'#3d5864',stone=night?'#869990':'#c1bda4'
 c.save();c.translate(x,y)
 block(c,0,4,w+13,30,7,side,stone,side)
 block(c,0,-3,w,25,h,front,stone,side)
 // Masonry courses, projecting cornices and an actual upper storey.
 for(let cy=-17;cy>-h;cy-=13){line(c,[[-w/2,cy],[w/2,cy]],night?'#142d394f':'#324e5b4c',1);for(let cx=-w/2+7;cx<w/2;cx+=17)line(c,[[cx,cy],[cx,cy+8]],night?'#142d3938':'#324e5b30',.8)}
 for(const cy of [-h-3,-h*.52,-5])line(c,[[-w/2-2,cy],[w/2+2,cy]],stone,2.8)
 for(const dx of [-12,10])for(const yy of [-13,-h*.57]){
  arch(c,dx,yy,9,16,night?'#edc48a':'#183948');line(c,[[dx-5,yy+1],[dx+5,yy+1]],stone,2)
  line(c,[[dx,yy-13],[dx,yy]],side,1);line(c,[[dx-4,yy-7],[dx+4,yy-7]],side,1)
  if(night)lightPool(c,dx,yy-7,15,'#efba73',.22,1)
 }
 const ridge=-h-22,roof=style%2?'#365666':'#575b60'
 polygon(c,[[-w/2-5,-h-4],[0,ridge],[w/2+7,-h-4],[7,-h+3]],roof)
 polygon(c,[[0,ridge],[12,ridge-8],[w/2+18,-h-12],[w/2+7,-h-4]],'#213d4b')
 for(let i=1;i<4;i++){const q=i/4;line(c,[[-(w/2+5)*q,ridge+18*q],[(w/2+7)*q,ridge+18*q]],night?'#73959555':'#a1b5b777',1)}
 line(c,[[-w/2-5,-h-4],[7,-h+3],[w/2+7,-h-4]],'#bc9a65',2)
 block(c,-10,-h-11,6,6,17,front,stone,side)
 arch(c,0,0,11,22,night?'#a38358':'#263b44');line(c,[[-6,0],[6,0]],stone,2)
 // A hanging brass lantern and one quiet shop sign give the row a human scale.
 line(c,[[w/2,-26],[w/2+9,-26],[w/2+9,-20]],'#bda476',1.5)
 c.fillStyle=night?'#ffe0a0':'#c3b386';c.fillRect(w/2+6,-21,6,9);line(c,[[w/2+5,-22],[w/2+13,-22]],'#3b4b4d',2)
 if(night)lightPool(c,w/2+9,-16,28,'#e9b976',.4,1)
 oval(c,-w/2+3,-1,4,2,'#293f47');c.restore()
}
