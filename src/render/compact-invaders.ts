import type {Enemy} from '../game/sim'
import {polygon} from './architecture'

/** At portal scale, retain the threatening silhouette and material, drop subpixel ornament. */
export function drawCompactInvader(c:CanvasRenderingContext2D,e:Enemy,colour:string){
 const id=e.def.id,armoured=e.shell>0,ink='#091b27',edge=armoured?'#e7b27a':'#b1c7c4'
 c.lineJoin='miter';c.lineWidth=.1;c.strokeStyle=ink
 const hull=(points:number[][],fill=colour)=>{polygon(c,points,fill);c.stroke()}
 if(id==='skitter'||id==='skiff'){
  hull([[-1.3,.35],[-.55,-.3],[-1.1,-.8],[.3,-.6],[1.5,-.18],[.3,.5],[-.5,.7]])
  hull([[-.65,-.18],[.35,-.65],[1.15,-.2],[.25,.17]],armoured?'#b89b7a':'#3a6774')
 }else if(id==='shell'||id==='vshell'){
  hull([[-1,.4],[-1.15,-.4],[-.65,-1.18],[.35,-1.4],[1,-.6],[.9,.4]])
  hull([[-.85,-.45],[-.55,-1.03],[.25,-1.18],[.75,-.55],[.3,-.13]],armoured?'#d2a778':'#4c5963')
  for(const x of [-.7,0,.7])hull([[x-.18,.1],[x,.72],[x+.22,.08]],'#8d7460')
 }else if(id==='mender'){
  hull([[-.6,.4],[-.7,-.7],[0,-1.7],[.7,-.7],[.6,.4]])
  for(const x of [-1,1])hull([[x*.4,0],[x*1.2,-1.2],[x*.9,.3]],'#52786d')
  c.strokeStyle='#e6ffc2';c.lineWidth=.18;c.beginPath();c.moveTo(-.34,-.65);c.lineTo(.34,-.65);c.moveTo(0,-1.03);c.lineTo(0,-.3);c.stroke()
 }else if(id==='veil'){
  hull([[-1,.4],[-.8,-.75],[0,-1.5],[.85,-.7],[1,.4],[.2,0],[0,-.5],[-.2,0]],'#a3c5e1')
 }else if(id==='wisp'){
  hull([[-.9,.3],[-.55,-.3],[-.7,-1],[0,-.65],[.6,-1.1],[.5,-.15],[1,.25],[0,.6]],'#d99a60')
 }else if(id==='reedling'){
  hull([[-.8,.5],[-.7,-.65],[-1,-1.2],[-.25,-.9],[0,-1.85],[.3,-.9],[1,-1.3],[.65,-.25],[.7,.5]])
 }else if(id==='bloat'){
  hull([[-1.2,.15],[-.8,-.8],[-1,-1.3],[-.2,-1.1],[.5,-1.5],[.8,-.7],[1.2,-.2],[.85,.65],[-.7,.65]])
 }else{
  hull([[-1,.35],[-.7,-.45],[-.9,-1.15],[-.2,-.8],[.5,-1.2],[1,-.5],[.7,.35],[0,.65]])
 }
 if(id!=='mender'){c.strokeStyle=edge;c.lineWidth=.1;c.beginPath();c.moveTo(-.42,-.45);c.lineTo(.45,-.45);c.stroke();c.fillStyle=ink;c.fillRect(-.33,-.15,.72,.16);c.fillStyle='#ff937f';c.fillRect(.16,-.14,.23,.1)}
}
