import { HEROES, type HeroId } from '../game/heroes'
import { polygon, lightPool } from './architecture'

const portraits=new Map<HeroId,string>()
/** Painted miniatures share the world's cut-paper planes and warm lighting. */
export function heroPortrait(id:HeroId){
  const old=portraits.get(id);if(old)return old
  const cv=document.createElement('canvas');cv.width=240;cv.height=280;const c=cv.getContext('2d')!,accent=HEROES[id].colour
  const coat=id==='sol'?'#bd6253':id==='mira'?'#3c8d89':'#6969ad',shadow=id==='sol'?'#7c404c':id==='mira'?'#28596c':'#3d4274'
  const skin=id==='sol'?'#ca8b69':id==='mira'?'#a8735c':'#e2ad81',hair=id==='sol'?'#503d48':id==='mira'?'#233f50':'#dce7d4'
  c.fillStyle=id==='sol'?'#503948':id==='mira'?'#204b54':'#343653';c.fillRect(0,0,240,280)
  lightPool(c,122,109,133,accent,.55,1)
  polygon(c,[[12,280],[24,215],[74,178],[168,177],[214,218],[239,280]],shadow)
  polygon(c,[[28,280],[44,210],[91,181],[123,207],[162,183],[199,217],[210,280]],coat)
  polygon(c,[[100,164],[148,164],[152,206],[122,221],[94,197]],skin)
  polygon(c,[[72,91],[91,61],[145,59],[175,87],[173,149],[151,180],[123,193],[88,169],[72,136]],skin)
  polygon(c,[[145,65],[175,87],[173,149],[151,180],[126,191],[141,143]],id==='ivo'?'#be855f':'#875749')
  if(id==='sol'){
    polygon(c,[[66,112],[62,70],[79,44],[111,35],[143,43],[164,34],[181,59],[183,105],[165,96],[149,71],[119,84],[88,78],[83,113]],hair)
    polygon(c,[[76,166],[98,187],[132,192],[155,175],[150,192],[122,205],[97,192]],hair)
    polygon(c,[[76,187],[119,210],[165,187],[178,211],[128,239],[86,222]],accent)
    polygon(c,[[35,226],[68,214],[82,258],[47,270]],'#e0a064')
  }else if(id==='mira'){
    polygon(c,[[61,160],[60,82],[76,48],[106,35],[151,42],[180,74],[187,166],[169,185],[164,98],[135,69],[98,93],[82,155],[70,197],[50,208]],hair)
    polygon(c,[[87,198],[112,218],[163,184],[177,207],[125,249],[97,231]],accent)
    polygon(c,[[147,54],[155,18],[169,49],[195,36],[178,66]],'#bce4b0')
    c.fillStyle='#f9d991';c.beginPath();c.arc(174,140,5,0,Math.PI*2);c.fill()
  }else{
    polygon(c,[[65,98],[66,56],[94,19],[109,38],[135,15],[149,40],[184,31],[174,63],[184,91],[154,81],[142,63],[112,87],[86,77],[81,109]],hair)
    c.strokeStyle='#314865';c.lineWidth=5;for(const x of [100,151]){c.beginPath();c.arc(x,117,16,0,Math.PI*2);c.stroke()}c.beginPath();c.moveTo(116,116);c.lineTo(134,116);c.stroke()
    polygon(c,[[77,186],[103,201],[112,242],[88,228]],accent);polygon(c,[[159,181],[179,204],[148,245],[131,237]],accent)
    c.fillStyle='#e3eaff';c.fillRect(124,238,7,29)
  }
  c.fillStyle='#203747';for(const x of [99,147]){c.beginPath();c.roundRect(x-5,112,10,6,2);c.fill()}
  c.strokeStyle='#704945';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(114,157);c.quadraticCurveTo(126,163,138,155);c.stroke()
  // A working tool gives each portrait an immediately different outline.
  const sx=id==='mira'?37:202;c.strokeStyle='#ddb77d';c.lineWidth=8;c.beginPath();c.moveTo(sx,274);c.lineTo(sx,125);c.stroke()
  if(id==='sol'){polygon(c,[[sx-15,139],[sx-20,109],[sx-8,96],[sx,74],[sx+8,103],[sx+19,115],[sx+12,139]],'#ffbb6b');polygon(c,[[sx-7,135],[sx,105],[sx+8,130]],'#fff2aa')}
  else if(id==='mira'){c.strokeStyle=accent;c.lineWidth=6;c.beginPath();c.arc(sx,113,21,-Math.PI*.7,Math.PI*.7);c.stroke();lightPool(c,sx,113,27,'#9bead0',.75,1)}
  else{polygon(c,[[sx-9,98],[sx+14,98],[sx+3,117],[sx+14,117],[sx-9,143],[sx-3,121],[sx-14,121]],'#dbe5ff')}
  const url=cv.toDataURL();portraits.set(id,url);return url
}
