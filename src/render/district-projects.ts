import { PROJECTS, projectProgress, type ProjectId } from '../game/district-projects'
import type { VillageProfile } from '../game/fixed-store'
import { block, polygon, windows, plant, lightPool, setArchitectureLight } from './architecture'

/** A small, authored panorama; cosmetic progress never adds combat clutter. */
export function districtPanorama(p:VillageProfile){
  const cv=document.createElement('canvas');cv.width=1000;cv.height=340
  const c=cv.getContext('2d')!;c.scale(2,2);setArchitectureLight(c,false)
  const g=c.createLinearGradient(0,0,500,170);g.addColorStop(0,'#345675');g.addColorStop(1,'#13283f');c.fillStyle=g;c.fillRect(0,0,500,170)
  c.lineCap='round';c.lineWidth=32;c.strokeStyle='#90bdbd';c.beginPath();c.moveTo(-20,140);c.bezierCurveTo(130,100,250,184,525,90);c.stroke();c.lineWidth=24;c.strokeStyle='#229cad';c.stroke()
  const draw=(id:ProjectId,x:number,y:number)=>{
    const q=PROJECTS.find(q=>q.id===id)!,on=projectProgress(p,id)>=1,col=on?q.colours[p.districtStyles?.[id]??0]:'#526778'
    if(on)lightPool(c,x,y,78,col,.32)
    block(c,x,y,78,46,7,'#759393','#a9c1b1','#416278')
    if(id==='market'){
      block(c,x,y-6,65,34,32,'#bc756b','#e2bd8a','#775573');windows(c,x,y-6,65,32,1,on)
      for(let i=0;i<3;i++){const a=x-24+i*24;block(c,a,y+6,19,14,16,'#7e7278',col,'#43566a');polygon(c,[[a-12,y-13],[a+10,y-13],[a+17,y-5],[a-5,y-5]],col)}
    }else if(id==='observatory'){
      block(c,x,y-7,47,34,49,'#567d99','#a1bdc7','#354563');windows(c,x,y-7,47,49,2,on)
      c.fillStyle=col;c.beginPath();c.ellipse(x,y-63,25,20,0,Math.PI,Math.PI*2);c.fill();c.fillStyle='#dce4cb';c.fillRect(x-2,y-86,4,25)
      polygon(c,[[x+3,y-77],[x+28,y-88],[x+32,y-80],[x+5,y-69]],on?'#f1d592':'#69808d')
    }else{
      block(c,x,y-7,66,40,15,'#548b81','#8dbba1','#315668')
      for(let i=0;i<6;i++){const a=x-26+(i%3)*23,b=y-16-Math.floor(i/3)*20;plant(c,a,b,10);if(on){c.fillStyle=col;for(let j=0;j<5;j++){c.beginPath();c.arc(a+Math.cos(j*1.26)*5,b-9+Math.sin(j*1.26)*4,3,0,Math.PI*2);c.fill()}}}
    }
    c.fillStyle=on?'#f4e7cb':'#a3b6c1';c.font='600 11px "DM Sans Variable",sans-serif';c.textAlign='center';c.fillText(q.name,x,y+28)
  }
  draw('market',83,88);draw('observatory',251,92);draw('gardens',416,74)
  return cv.toDataURL()
}
