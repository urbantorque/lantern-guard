import {polygon} from './architecture'
export interface Glaze {front:string;roof:string;side:string;accent:string}
export const BRASS:Glaze={front:'#bd9258',roof:'#fff0b2',side:'#655341',accent:'#ffe2a0'}
export const STONE:Glaze={front:'#82968e',roof:'#e4dfc4',side:'#3c5d62',accent:'#eee3bb'}
export const TAU=Math.PI*2
export function line(c:CanvasRenderingContext2D,points:number[][],colour:string,width=2){c.strokeStyle=colour;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
export function oval(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string,edge?:string){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1;c.stroke()}}
/** Rounded ceramic volume, warm key light, cool reflected foot. */
export function vessel(c:CanvasRenderingContext2D,x:number,y:number,r:number,d:number,h:number,m:Glaze){
 const g=c.createLinearGradient(x-r,y,x+r,y);g.addColorStop(0,m.side);g.addColorStop(.24,m.front);g.addColorStop(.4,m.front);g.addColorStop(.85,m.side);g.addColorStop(1,m.side)
 c.fillStyle=g;c.beginPath();c.moveTo(x-r,y-h);c.lineTo(x-r,y);c.bezierCurveTo(x-r,y+d,x+r,y+d,x+r,y);c.lineTo(x+r,y-h);c.closePath();c.fill();oval(c,x,y-h,r,d,m.roof,'#16364077')
 c.strokeStyle='#fff5d870';c.lineWidth=1.1;c.beginPath();c.ellipse(x,y-h,r-.7,Math.max(1,d-.5),0,Math.PI,TAU);c.stroke();c.strokeStyle='#16384266';c.beginPath();c.ellipse(x,y,r,d,0,0,Math.PI);c.stroke();line(c,[[x-r*.57,y-h+3],[x-r*.57,y-3]],'#fff5d530',1.8)
}
export function orb(c:CanvasRenderingContext2D,x:number,y:number,r:number,colour:string,shadow:string){const g=c.createRadialGradient(x-r*.32,y-r*.4,r*.04,x,y,r);g.addColorStop(0,'#fff7de');g.addColorStop(.2,colour);g.addColorStop(.68,colour);g.addColorStop(1,shadow);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.strokeStyle='#17373e99';c.lineWidth=1;c.stroke();oval(c,x-r*.3,y-r*.43,r*.22,r*.11,'#ffffffa8')}
export function leaf(c:CanvasRenderingContext2D,x:number,y:number,length:number,angle:number,colour:string){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=colour;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-length*.5,-length*.35,-length*.36,-length*.84,0,-length);c.bezierCurveTo(length*.5,-length*.68,length*.3,-length*.16,0,0);c.fill();line(c,[[0,-1],[0,-length*.77]],'#eef3b644',.7);c.restore()}
export function gem(c:CanvasRenderingContext2D,x:number,y:number,r:number,m:Glaze){polygon(c,[[x,y-r],[x+r*.68,y-r*.2],[x+r*.5,y+r*.55],[x,y+r],[x-r*.6,y+r*.3],[x-r*.68,y-r*.2]],m.accent);polygon(c,[[x,y-r],[x,y+r],[x-r*.6,y+r*.3],[x-r*.68,y-r*.2]],m.front);polygon(c,[[x,y-r],[x+r*.68,y-r*.2],[x,y+r*.13],[x-r*.68,y-r*.2]],m.roof);line(c,[[x,y-r],[x-r*.68,y-r*.2],[x-r*.6,y+r*.3]],'#fff9dbb0',1)}
export function gear(c:CanvasRenderingContext2D,x:number,y:number,r:number,angle:number,colour:string){c.save();c.translate(x,y);c.rotate(angle);c.strokeStyle=colour;c.lineWidth=Math.max(1.5,r*.25);c.beginPath();c.arc(0,0,r*.75,0,TAU);c.stroke();for(let i=0;i<8;i++){const a=i*TAU/8;line(c,[[Math.cos(a)*r*.8,Math.sin(a)*r*.8],[Math.cos(a)*r,Math.sin(a)*r]],colour,Math.max(1.5,r*.32))}line(c,[[-r*.6,0],[r*.6,0]],colour,1.3);line(c,[[0,-r*.6],[0,r*.6]],colour,1.3);c.restore()}
export function arch(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,fill:string){c.fillStyle=fill;c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+w/2);c.arc(x,y-h+w/2,w/2,Math.PI,TAU);c.lineTo(x+w/2,y);c.closePath();c.fill()}
