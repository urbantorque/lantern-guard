import {secondWatch} from '../game/second-watch'
import { paintCanalLandscape, groveCanopies } from './canal-art'
import { districtStyle } from './district-style'
import { upright } from './board-view'
import type { Sim } from '../game/sim'
import { setArchitectureLight, lightPool } from './architecture'
import { districtLayout } from './district-layout'
import { projectDetails } from './place-art'

const terrain=new WeakMap<Sim['level'],{key:string;canvas:HTMLCanvasElement}>()
const groundTones=(s:Sim)=>secondWatch(s.challenge)?s.sky.night?['#132b37','#203d44','#112733']:['#435b5c','#64756b','#344d53']:s.sky.night?districtStyle(s.challenge.variant).night:districtStyle(s.challenge.variant).day
export const districtGround=(s:Sim)=>groundTones(s)[1]
export function districtGradient(c:CanvasRenderingContext2D,s:Sim,x=0,y=-105,w=720,h=960){
  const tones=groundTones(s),ground=c.createLinearGradient(x,y,x+w,y+h);ground.addColorStop(0,tones[0]);ground.addColorStop(.48,tones[1]);ground.addColorStop(1,tones[2]);return ground
}

/** Paint once per district/lighting change; keep the playable centre free of decoration. */
export function scenery(s:Sim,stage:number,keepsakes:readonly string[],wide=false){
  const day=!s.sky.night,chapter=Math.min(3,Math.floor(s.wave/10)),key=stage+':'+chapter+':'+keepsakes.join(',')+':'+day+':'+wide,old=terrain.get(s.level)
  if(old?.key===key)return old.canvas
  const canvas=document.createElement('canvas');canvas.width=1840;canvas.height=2140
  const c=canvas.getContext('2d')!;c.scale(2,2);c.translate(50,140);setArchitectureLight(c,day)
  paintCanalLandscape(c,s,stage,keepsakes,wide)
  terrain.set(s.level,{key,canvas});return canvas
}

export function movingWater(c:CanvasRenderingContext2D,s:Sim,time:number){
  c.save();c.lineCap='round'
  for(const seg of s.level.segs.values())for(let i=0;i<Math.ceil(seg.line.length/88);i++){
    const at=(i*88+time*30)%seg.line.length,p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),off=Math.sin(i*7+time*.45)*9
    const x=p.x-p.ty*off,y=p.y+p.tx*off
    c.globalAlpha=.2+Math.sin(time*1.1+i)*.08;c.strokeStyle=s.sky.night?'#adebdd':'#e5efcb';c.lineWidth=i%3===0?1.6:1
    c.beginPath();c.moveTo(x-p.tx*14,y-p.ty*14);c.bezierCurveTo(x-p.tx*6-p.ty*3,y-p.ty*6+p.tx*3,x+p.tx*5+p.ty*3,y+p.ty*5-p.tx*3,x+p.tx*13,y+p.ty*13);c.stroke()
    if(i%3===0){c.globalAlpha=.1;c.lineWidth=.8;c.beginPath();c.moveTo(x-p.tx*8-p.ty*5,y-p.ty*8+p.tx*5);c.quadraticCurveTo(x-p.ty*8,y+p.tx*8,x+p.tx*8-p.ty*4,y+p.ty*8+p.tx*4);c.stroke()}
  }
  c.restore()
}

export function livingDistrict(c:CanvasRenderingContext2D,s:Sim,time:number,reduced:boolean,keepsakes:readonly string[]=[],wide=false){
  groveCanopies(c,s,time,reduced,wide)
  if(s.challenge.watchExperience){
    const homes=districtLayout(s).filter(p=>p.kind==='house'),ids=['market','observatory','gardens'] as const
    for(const [i,p] of homes.entries()){
      const id=ids[i%3],restored=keepsakes.some(k=>k.startsWith('project:'+id+':')),celebrating=s.won
      if(!restored&&!celebrating)continue
      const {x,y}=p
      upright(c,x,y,wide,()=>{
        c.save();lightPool(c,x,y,restored?45:25,'#ffe5ac',s.sky.night||celebrating?.6:.18)
        if(restored){c.save();c.translate(x,y);c.scale(.8,.8);projectDetails(c,0,0,id,time,reduced);c.restore()}
        // Residents stay on reserved plazas, never over water or tower plots.
        if(!s.waveActive||celebrating)for(let j=0;j<2;j++){const dx=x-10+j*20+(reduced?0:Math.sin(time*.7+i+j)*3),dy=y+18;c.fillStyle='#ffe2ae';c.beginPath();c.arc(dx,dy-6,2.5,0,Math.PI*2);c.fill();c.fillStyle=j?'#a2dace':'#cf9398';c.fillRect(dx-2,dy-3,4,6)}
        c.restore()
      })
    }
  }
  if(reduced)return
  for(const [i,p] of districtLayout(s).entries()){
    if(p.kind!=='tree'||secondWatch(s.challenge))continue
    const x=p.x+Math.sin(time*.8+i)*13,y=p.y-26+Math.cos(time*1.1+i)*6
    if(s.sky.night){lightPool(c,x,y,13,'#ffdc80',.35+Math.sin(time*2+i)*.2,1);c.fillStyle='#ffe9ad';c.fillRect(x-1,y-1,2,2)}
    else if(i%3===0){const wing=2+Math.abs(Math.sin(time*9+i))*3;c.fillStyle='#ffdc87';c.beginPath();c.ellipse(x-3,y,wing,2,-.4,0,Math.PI*2);c.ellipse(x+3,y,wing,2,.4,0,Math.PI*2);c.fill()}
  }
  c.save();c.strokeStyle=s.sky.night?'#70a99e':'#497e69';c.lineWidth=1.5
  for(const seg of s.level.segs.values())for(let at=100;at<seg.line.length;at+=240){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0}),x=p.x-p.ty*42,y=p.y+p.tx*42;if(s.pads.some(pad=>Math.hypot(pad.x-x,pad.y-y)<62))continue;const sway=Math.sin(time*(s.sky.weather==='breeze'?2.2:1)+at)*3;for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(x+k*3,y);c.quadraticCurveTo(x+k*3+sway,y-7,x+k*4+sway*1.5,y-13+Math.abs(k)*3);c.stroke()}}
  c.restore()
  if(!s.sky.night)for(let i=0;i<2;i++)lightPool(c,(time*9+i*470)%1100-190,210+i*390,200,'#254e67',.13,.3)
}
