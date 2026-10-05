import { PROJECTS, projectProgress } from '../game/district-projects'
import type { VillageProfile } from '../game/fixed-store'
import { lightPool, setArchitectureLight } from './architecture'
import { drawProjectMiniature, projectDetails } from './place-art'

/** A small, authored panorama; cosmetic progress never adds combat clutter. */
export function districtPanorama(p:VillageProfile){
  const cv=document.createElement('canvas');cv.width=2000;cv.height=680
  const c=cv.getContext('2d')!;c.scale(4,4);setArchitectureLight(c,false)
  const g=c.createLinearGradient(0,0,500,170);g.addColorStop(0,'#365b59');g.addColorStop(1,'#18343f');c.fillStyle=g;c.fillRect(0,0,500,170)
  c.lineCap='round';c.lineWidth=32;c.strokeStyle='#8ea59b';c.beginPath();c.moveTo(-20,141);c.bezierCurveTo(130,107,250,171,525,110);c.stroke();c.lineWidth=25;c.strokeStyle='#356d79';c.stroke();c.lineWidth=1;c.strokeStyle='#b5d9c75c';c.beginPath();c.moveTo(0,139);c.bezierCurveTo(130,117,250,161,500,116);c.stroke()
  for(const [i,q]of PROJECTS.entries()){
    const x=83+i*167,y=108,on=projectProgress(p,q.id)>=1,col=q.colours[p.districtStyles?.[q.id]??0]
    if(on)lightPool(c,x,y,70,col,.2)
    c.save();c.translate(x,y);c.scale(1.1,1.1);drawProjectMiniature(c,0,0,q.id,on,col,true);if(on)projectDetails(c,0,0,q.id,0,true);c.restore()
    c.fillStyle=on?'#f4e7cb':'#bdcfc7';c.font='600 11px "DM Sans Variable",sans-serif';c.textAlign='center';c.fillText(q.name,x,154)
  }
  return cv.toDataURL()
}
