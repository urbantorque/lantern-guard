/** Orthographic solids: separate flat front, side and roof planes. */
export const CITY={ground:'#344553',road:'#596a75',edge:'#74838a',water:'#304b60',roof:'#657889',front:'#3e4b5d',side:'#303e50',window:'#ede7ad',leaf:'#687b68',leafDark:'#4c645b'}
const daylight=new WeakMap<CanvasRenderingContext2D,boolean>()
export function setArchitectureLight(c:CanvasRenderingContext2D,day:boolean){daylight.set(c,day)}
export function polygon(c:CanvasRenderingContext2D,points:number[][],fill:string){c.fillStyle=fill;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
export function block(c:CanvasRenderingContext2D,x:number,y:number,w:number,d:number,h:number,front=CITY.front,roof=CITY.roof,side=CITY.side){
  if(daylight.get(c)){if(front===CITY.front)front='#6d7d87';if(roof===CITY.roof)roof='#a8b2b6';if(side===CITY.side)side='#536a7b'}
  const dx=d*.45,dy=d*.45
  polygon(c,[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y],[x-w/2,y]],front)
  polygon(c,[[x+w/2,y-h],[x+w/2+dx,y-h-dy],[x+w/2+dx,y-dy],[x+w/2,y]],side)
  polygon(c,[[x-w/2,y-h],[x-w/2+dx,y-h-dy],[x+w/2+dx,y-h-dy],[x+w/2,y-h]],roof)
}
export function windows(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,rows=1,on=true){
  for(let i=0;i<rows;i++){
    c.fillStyle=daylight.get(c)?(on?'#c4c9b7':'#5a6f7c'):(on?CITY.window:'#536270');c.fillRect(x-w/2+5,y-h+8+i*13,w-10,6)
    c.fillStyle=CITY.front;c.fillRect(x+1,y-h+8+i*13,2,6)
  }
}
export function plant(c:CanvasRenderingContext2D,x:number,y:number,size=10){
  polygon(c,[[x-size,y],[x-size*.75,y-size],[x,y-size*1.65],[x+size*.8,y-size],[x+size,y],[x,y+size*.25]],daylight.get(c)?'#8b9c78':CITY.leaf)
  polygon(c,[[x,y-size*1.65],[x+size*.8,y-size],[x+size,y],[x,y+size*.25]],CITY.leafDark)
}
