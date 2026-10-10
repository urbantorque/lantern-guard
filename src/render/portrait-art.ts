import {HEROES,type HeroId} from '../game/heroes'
import {polygon,lightPool} from './architecture'
import {line,oval} from './miniature-art'

const portraits=new Map<HeroId,string>()
/** Working keepers, lit by the same warm lamps and cool masonry as the canal. */
export function heroPortrait(id:HeroId){
 const old=portraits.get(id);if(old)return old
 const cv=document.createElement('canvas');cv.width=360;cv.height=420
 const c=cv.getContext('2d')!;c.scale(1.5,1.5)
 const accent=HEROES[id].colour,sol=id==='sol',mira=id==='mira',coat=sol?'#995643':mira?'#366e73':'#4c5f78',skin=sol?'#c18a65':mira?'#a87558':'#d6aa85',hair=sol?'#322f31':mira?'#142e3a':'#d5d7c6'
 const bg=c.createLinearGradient(0,0,240,280);bg.addColorStop(0,'#344d58');bg.addColorStop(1,'#112c38');c.fillStyle=bg;c.fillRect(0,0,240,280)
 c.strokeStyle='#c8be9330';c.lineWidth=2;c.beginPath();c.roundRect(16,15,208,284,94);c.stroke()
 lightPool(c,72,80,148,accent,.23,1)
 for(const x of [31,199]){line(c,[[x,75],[x,256]],'#8aa19c24',2);line(c,[[x+4,80],[x+4,250]],'#172c3929',4)}
 // A broad, continuous silhouette keeps shoulders and face readable at 56 px.
 c.fillStyle=coat;c.beginPath();c.moveTo(5,280);c.bezierCurveTo(12,220,31,209,84,187);c.lineTo(157,185);c.bezierCurveTo(217,207,232,229,239,280);c.closePath();c.fill()
 polygon(c,[[6,280],[40,221],[88,197],[112,239],[103,280]],'#162f3d70')
 polygon(c,[[119,213],[153,189],[186,204],[166,280],[133,280]],'#ffffff0b')
 const neck=c.createLinearGradient(95,175,148,216);neck.addColorStop(0,'#775541');neck.addColorStop(1,skin);c.fillStyle=neck;c.beginPath();c.moveTo(93,166);c.lineTo(149,166);c.lineTo(154,204);c.quadraticCurveTo(124,235,88,204);c.closePath();c.fill()
 if(mira){c.fillStyle=hair;c.beginPath();c.moveTo(53,192);c.bezierCurveTo(47,155,49,58,83,36);c.bezierCurveTo(130,4,188,41,188,111);c.lineTo(181,213);c.quadraticCurveTo(149,235,151,138);c.lineTo(86,115);c.quadraticCurveTo(91,203,53,222);c.closePath();c.fill()}
 const face=c.createLinearGradient(70,85,170,133);face.addColorStop(0,'#e1b089');face.addColorStop(.27,skin);face.addColorStop(.73,skin);face.addColorStop(1,sol?'#885b47':mira?'#714935':'#987358')
 c.fillStyle=face;c.beginPath();c.moveTo(77,89);c.bezierCurveTo(79,48,148,45,170,83);c.quadraticCurveTo(180,119,166,158);c.quadraticCurveTo(151,184,128,192);c.quadraticCurveTo(94,185,82,153);c.quadraticCurveTo(71,124,77,89);c.closePath();c.fill()
 oval(c,79,128,7,12,skin);oval(c,170,128,6,11,skin)
 c.fillStyle=hair;c.beginPath()
 if(sol){c.moveTo(70,113);c.bezierCurveTo(53,49,81,38,105,41);c.bezierCurveTo(131,16,158,48,174,43);c.bezierCurveTo(191,60,184,96,171,113);c.lineTo(162,82);c.quadraticCurveTo(140,79,133,64);c.quadraticCurveTo(102,87,84,80);c.lineTo(79,114)}
 else if(mira){c.moveTo(70,158);c.bezierCurveTo(51,115,66,48,101,39);c.bezierCurveTo(143,23,181,58,176,103);c.quadraticCurveTo(151,94,137,65);c.quadraticCurveTo(110,101,82,102);c.lineTo(81,151)}
 else{c.moveTo(74,110);c.quadraticCurveTo(60,72,75,47);c.quadraticCurveTo(92,26,112,44);c.lineTo(129,23);c.quadraticCurveTo(144,52,164,37);c.quadraticCurveTo(180,33,177,59);c.quadraticCurveTo(194,80,169,110);c.lineTo(161,78);c.quadraticCurveTo(133,63,117,81);c.quadraticCurveTo(97,95,81,83)}
 c.closePath();c.fill()
 // Brows, a shaded nose and narrow eyes replace the small square facial marks.
 for(const [x,tilt]of [[101,sol?-.05:.08],[149,sol?.12:-.04]]){
  line(c,[[x-11,108],[x+8,107+tilt*20]],mira?'#20292a':'#3a342e',3)
  c.strokeStyle='#253039';c.lineWidth=2;c.beginPath();c.moveTo(x-7,119);c.quadraticCurveTo(x,114,x+7,119);c.stroke();oval(c,x,119,2.2,3,'#152e35');oval(c,x-.7,118,.8,.8,'#f1e3c9')
 }
 c.fillStyle='#704d3d44';c.beginPath();c.moveTo(125,116);c.lineTo(120,142);c.quadraticCurveTo(128,146,133,140);c.closePath();c.fill()
 line(c,[[114,158],[128,160],[140,155]],sol?'#5f4335':'#704c42',2.3)
 line(c,[[116,168],[129,170]],'#ffe4bf44',1.8)
 if(sol){c.fillStyle='#433a3299';c.beginPath();c.moveTo(85,150);c.quadraticCurveTo(111,179,128,177);c.quadraticCurveTo(151,177,166,148);c.quadraticCurveTo(157,184,129,192);c.quadraticCurveTo(96,183,85,150);c.fill();line(c,[[92,70],[112,58],[146,59]],'#88715b66',2)}
 if(mira){for(const side of [-1,1])oval(c,124+side*48,143,3,7,'#d7b77c');line(c,[[155,62],[161,39]],'#c5caa6',3);polygon(c,[[159,48],[175,32],[171,52]],'#a6d1bc')}
 if(!sol&&!mira){for(const x of [101,149]){c.strokeStyle='#c2ad80';c.lineWidth=3;c.beginPath();c.ellipse(x,120,15,14,0,0,Math.PI*2);c.stroke()}line(c,[[116,119],[133,119]],'#c2ad80',2);line(c,[[87,113],[76,108]],'#c2ad80',2);line(c,[[91,146],[99,143]],'#8d6a5460',1.5);line(c,[[146,145],[156,148]],'#8d6a5460',1.5)}
 polygon(c,[[84,189],[117,216],[153,187],[173,204],[127,245],[91,219]],sol?'#c79965':mira?'#85b8a7':'#a9b9c2')
 polygon(c,[[84,189],[100,224],[115,238],[113,210]],coat)
 line(c,[[130,245],[125,280]],'#dac9a070',2);for(const y of [246,263])oval(c,151,y,2.7,2.7,'#d0b682')
 // Tools connect the portrait to each keeper's tower material.
 const x=mira?33:207;line(c,[[x,278],[x,157]],'#293e43',10);line(c,[[x-2,278],[x-2,157]],'#bb9c67',4)
 if(sol){c.fillStyle='#f1bb75';c.beginPath();c.moveTo(x-10,162);c.quadraticCurveTo(x-24,141,x-4,123);c.quadraticCurveTo(x-7,143,x+8,138);c.quadraticCurveTo(x+25,153,x+10,164);c.fill();lightPool(c,x,148,34,'#ffb269',.45,1);oval(c,x,154,5,9,'#fff0c1')}
 else if(mira){c.strokeStyle='#b4d2bb';c.lineWidth=4;c.beginPath();c.arc(x,149,15,.5,Math.PI*1.85);c.stroke();oval(c,x+3,150,5,6,'#bceade')}
 else{line(c,[[x-8,151],[x+8,151]],'#d4c49a',3);oval(c,x,145,8,10,'#abcad3');line(c,[[x-9,162],[x-9,131],[x+9,131],[x+9,162]],'#b19b76',2)}
 const url=cv.toDataURL();portraits.set(id,url);return url
}
