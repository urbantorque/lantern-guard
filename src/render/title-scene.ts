import {drawFixedTower} from './fixed-towers'
import {drawFixedEnemy} from './fixed-enemies'
import {block,lightPool,setArchitectureLight} from './architecture'
import {quayHouse} from './quay-art'
import {ENEMIES,type TowerId} from '../game/defs'
import type {Enemy} from '../game/sim'

let cached=''
/** The title uses the exact battlefield models, composed as a quiet canal ambush. */
export function titleScene(){
 if(cached)return cached
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000
 const c=canvas.getContext('2d')!;setArchitectureLight(c,false)
 const bg=c.createLinearGradient(0,0,1600,1000);bg.addColorStop(0,'#091b27');bg.addColorStop(.6,'#153b46');bg.addColorStop(1,'#0a222d');c.fillStyle=bg;c.fillRect(0,0,1600,1000)
 lightPool(c,1120,550,650,'#479ca8',.22,1)
 const canal=()=>{c.beginPath();c.moveTo(1770,140);c.bezierCurveTo(1100,60,1380,530,990,520);c.bezierCurveTo(620,490,840,900,1710,940)}
 c.lineCap='round'
 for(const [width,colour] of [[174,'#071620'],[153,'#526c70'],[139,'#172f3c'],[121,'#246071'],[91,'#2c7580']] as const){canal();c.lineWidth=width;c.strokeStyle=colour;c.stroke()}
 canal();c.lineWidth=2;c.strokeStyle='#93c9c04d';c.stroke()
 const house=(x:number,y:number,k:number,style:number)=>{c.save();c.translate(x,y);c.scale(k,k);quayHouse(c,0,0,style,true);c.restore()}
 house(960,280,2.3,1);house(1400,360,2.8,2);house(1510,650,2.5,0)
 for(const [x,y] of [[830,370],[1240,160],[1350,720],[830,840]]){block(c,x,y,14,14,45,'#294452','#c5b581');lightPool(c,x,y-48,34,'#ffd193',.55,1)}
 const tower=(x:number,y:number,k:number,id:TowerId,a:number,b=0)=>{c.save();c.translate(x,y);c.scale(k,k);block(c,0,12,90,48,18,'#344f5b','#8fa69d','#162e3c');drawFixedTower(c,0,0,{id,a,b,hero:'sol',angle:-.6,time:1,since:9,age:9,reducedMotion:true});c.restore()}
 tower(1100,790,4.4,'cracker',2);tower(820,460,2.35,'bell',0,2);tower(1460,930,2.3,'wick',2)
 c.save();c.translate(1300,340);c.scale(2.7,2.7)
 drawFixedEnemy(c,{x:0,y:0,def:ENEMIES.dredger,hp:440,maxHp:440,shell:24,maxShell:24,uid:16,age:2,hitT:0,heatT:0,stunT:0,tx:-1,ty:0,visScale:1,revealedPerm:true,seenT:0,shrouded:false,slowT:0}as Enemy,true,false);c.restore()
 // The left bank is intentionally quiet for the title and primary action.
 const shade=c.createLinearGradient(0,0,1050,0);shade.addColorStop(0,'#091b27');shade.addColorStop(.55,'#091b27eb');shade.addColorStop(1,'#091b2700');c.fillStyle=shade;c.fillRect(0,0,1600,1000)
 cached=canvas.toDataURL('image/webp',.92);return cached
}
