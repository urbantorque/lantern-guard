import { upright } from './board-view'
import type { Sim } from '../game/sim'
import { block, plant, polygon, windows, setArchitectureLight, lightPool } from './architecture'
import { districtLayout } from './district-layout'

const terrain=new WeakMap<Sim['level'],{key:string;canvas:HTMLCanvasElement}>()
export const districtGround=(s:Sim)=>s.sky.night?['#143b45','#173d47','#1b394f','#163e40'][s.challenge.variant??0]:['#73a98a','#81ad87','#73aba1','#8bad89'][s.challenge.variant??0]
export function districtGradient(c:CanvasRenderingContext2D,s:Sim,x=0,y=-105,w=720,h=960){
  const ground=c.createLinearGradient(x,y,x+w,y+h);ground.addColorStop(0,s.sky.night?'#255957':'#acd39d');ground.addColorStop(.48,districtGround(s));ground.addColorStop(1,s.sky.night?'#102c40':'#598e7b');return ground
}
const colours=[['#ce7965','#f3be8a','#8b5360'],['#438a91','#a0d3bd','#2e586c'],['#557eaf','#a9c6df','#354e7b'],['#b58a59','#e9d2a0','#79604e'],['#5b9873','#bfdb9b','#396657']]

/** Paint once per district/lighting change; keep the playable centre free of decoration. */
export function scenery(s:Sim,stage:number,keepsakes:readonly string[],wide=false){
  const day=!s.sky.night,key=stage+':'+keepsakes.join(',')+':'+day+':'+wide,old=terrain.get(s.level)
  if(old?.key===key)return old.canvas
  const canvas=document.createElement('canvas');canvas.width=1840;canvas.height=2140
  const c=canvas.getContext('2d')!;c.scale(2,2);c.translate(50,140);setArchitectureLight(c,day)
  // Transparent terrain blends into the full viewport. Extra headroom keeps
  // upright buildings intact on a turned board.
  for(const [x,y,rx,ry] of [[160,110,120,175],[605,260,85,200],[145,670,110,135],[540,755,145,65]]){
    c.fillStyle=day?'#b8d79224':'#548e7e14';c.beginPath();c.ellipse(x,y,rx,ry,-.35,0,Math.PI*2);c.fill()
  }
  // Stroke the whole network once per layer. A downstream bank must never
  // paint across upstream water (especially where the side inlet merges).
  c.lineJoin='round';c.lineCap='round'
  const network=()=>{c.beginPath();for(const seg of s.level.segs.values())seg.line.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke()}
  c.save();c.translate(5,8);c.strokeStyle=day?'#3b77736b':'#081f3599';c.lineWidth=62;network();c.restore()
  for(const [width,colour] of [[60,day?'#e7dabb':'#80a7a7'],[48,day?'#346e78':'#284f6b'],[39,day?'#087d94':'#11566f'],[27,day?'#20aeba':'#167d91'],[13,day?'#59d5ca66':'#49bcbc33']] as const){c.strokeStyle=colour;c.lineWidth=width;network()}
  for(const seg of s.level.segs.values()){
    for(let at=65;at<seg.line.length;at+=150){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});for(const side of [-1,1]){
      const x=p.x-p.ty*33*side,y=p.y+p.tx*33*side
      if(s.pads.some(pad=>Math.hypot(pad.x-x,pad.y-y)<48))continue
      if([...s.level.segs.values()].some(other=>other!==seg&&other.line.distanceTo(x,y)<32))continue
      if(!day)lightPool(c,x,y,38,'#ffc766',.7)
      upright(c,x,y,wide,()=>{block(c,x,y,5,5,9,day?'#728c81':'#355d71','#c4ccaa','#274757');c.fillStyle=day?'#fbe6a2':'#ffe6a0';c.fillRect(x-2,y-12,4,4)})
    }}
  }
  for(const prop of districtLayout(s)){
    const {x,y,style}=prop
    upright(c,x,y,wide,()=>{
    if(prop.kind==='tree'){
      polygon(c,[[x-6,y+5],[x+24,y+5],[x+35,y-5],[x+3,y-14]],'#17475225')
      c.fillStyle=day?'#796c59':'#40525b';c.fillRect(x-2,y-12,4,18);plant(c,x,y-10,14+style*2);return
    }
    const w=37+style%2*6,h=24+style%3*6,[front,roof,side]=colours[style]
    c.save();c.globalAlpha=.78
    c.fillStyle=day?'#c5ccb299':'#638c7b55';c.beginPath();c.ellipse(x+7,y,43,21,-.25,0,Math.PI*2);c.fill()
    polygon(c,[[x-24,y+4],[x+29,y+4],[x+48,y-9],[x-4,y-22]],day?'#234f5d3d':'#061b354d')
    if(!day)lightPool(c,x,y+2,w,'#ffc56c',.4)
    block(c,x,y,w,28,h,day?front:side,day?roof:front,day?side:'#233c52');windows(c,x,y,w,h,1,true)
    block(c,x,y-h+1,w+3,30,3,day?roof:front,day?roof:front,side)
    c.fillStyle=style%2?'#e6a55b':'#366778';c.fillRect(x-w/2+6,y-12,8,12)
    if(style%2===0){block(c,x+4,y-h-5,w-7,20,4,'#759b75',day?'#8dbf73':'#43806b','#396559');for(let j=0;j<3;j++)plant(c,x-8+j*9,y-h-10,4)}
    else polygon(c,[[x-11,y-h-7],[x-5,y-h-15],[x+13,y-h-15],[x+7,y-h-7]],day?'#356e91':'#234660')
    if(style===0&&keepsakes.includes('market'))block(c,x-9,y+8,25,14,11,day?'#bc6b62':'#784f60',day?'#f3b28b':'#c27d79','#704859')
    if(keepsakes.includes('glass')){c.fillStyle='#94e5df';c.fillRect(x+w/2+6,y-19,3,10)}
    if(stage>=2||keepsakes.includes('garden')){c.fillStyle='#f9c68c';c.fillRect(x-10,y-8,4,4);c.fillRect(x-3,y-10,4,4)}
    c.restore()
    })
  }
  terrain.set(s.level,{key,canvas});return canvas
}

export function movingWater(c:CanvasRenderingContext2D,s:Sim,time:number){
  c.save();c.lineCap='round'
  for(const seg of s.level.segs.values())for(let i=0;i<Math.ceil(seg.line.length/88);i++){
    const at=(i*88+time*30)%seg.line.length,p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),off=Math.sin(i*7+time*.45)*9
    const x=p.x-p.ty*off,y=p.y+p.tx*off
    c.globalAlpha=.45+Math.sin(time*1.5+i)*.2;c.strokeStyle=s.sky.night?'#8df7dc':'#d8fff0';c.lineWidth=i%3===0?2.4:1.4
    c.beginPath();c.moveTo(x-p.tx*10,y-p.ty*10);c.quadraticCurveTo(x-p.ty*2,y+p.tx*2,x+p.tx*9,y+p.ty*9);c.stroke()
    if(i%3===0){c.globalAlpha=s.waveActive?.18:.36;c.lineWidth=2;c.beginPath();c.moveTo(x-p.tx*4-p.ty*6,y-p.ty*4+p.tx*6);c.lineTo(x+p.tx*3,y+p.ty*3);c.lineTo(x-p.tx*4+p.ty*6,y-p.ty*4-p.tx*6);c.stroke()}
  }
  c.restore()
}

export function livingDistrict(c:CanvasRenderingContext2D,s:Sim,time:number,reduced:boolean){
  if(reduced)return
  for(const [i,p] of districtLayout(s).entries()){
    if(p.kind!=='tree')continue
    const x=p.x+Math.sin(time*.8+i)*13,y=p.y-26+Math.cos(time*1.1+i)*6
    if(s.sky.night){lightPool(c,x,y,13,'#ffdc80',.35+Math.sin(time*2+i)*.2,1);c.fillStyle='#ffe9ad';c.fillRect(x-1,y-1,2,2)}
    else if(i%3===0){const wing=2+Math.abs(Math.sin(time*9+i))*3;c.fillStyle='#ffdc87';c.beginPath();c.ellipse(x-3,y,wing,2,-.4,0,Math.PI*2);c.ellipse(x+3,y,wing,2,.4,0,Math.PI*2);c.fill()}
  }
  if(!s.sky.night)for(let i=0;i<2;i++)lightPool(c,(time*9+i*470)%1100-190,210+i*390,200,'#254e67',.13,.3)
}
