/** Orthographic solids: separate flat front, side and roof planes. */
export const CITY={ground:'#183e48',road:'#71948d',edge:'#b4c6af',water:'#167c8e',roof:'#7aa6b0',front:'#365f79',side:'#224456',window:'#ffe397',leaf:'#47976c',leafDark:'#22634f'}
const daylight=new WeakMap<CanvasRenderingContext2D,boolean>()
export function setArchitectureLight(c:CanvasRenderingContext2D,day:boolean){daylight.set(c,day)}
export function isDaylit(c:CanvasRenderingContext2D){return daylight.get(c)??false}
export function polygon(c:CanvasRenderingContext2D,points:number[][],fill:string){c.fillStyle=fill;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
export function block(c:CanvasRenderingContext2D,x:number,y:number,w:number,d:number,h:number,front=CITY.front,roof=CITY.roof,side=CITY.side){
  if(daylight.get(c)){if(front===CITY.front)front='#487f94';if(roof===CITY.roof)roof='#c1ded8';if(side===CITY.side)side='#305866'}
  const dx=d*.45,dy=d*.45
  polygon(c,[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y],[x-w/2,y]],front)
  polygon(c,[[x+w/2,y-h],[x+w/2+dx,y-h-dy],[x+w/2+dx,y-dy],[x+w/2,y]],side)
  polygon(c,[[x-w/2,y-h],[x-w/2+dx,y-h-dy],[x+w/2+dx,y-h-dy],[x+w/2,y-h]],roof)
  c.strokeStyle='#ecffe328';c.lineWidth=1;c.beginPath();c.moveTo(x-w/2,y-h);c.lineTo(x+w/2,y-h);c.lineTo(x+w/2+dx,y-h-dy);c.stroke()
}
export function windows(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,rows=1,on=true){
  for(let i=0;i<rows;i++){
    c.fillStyle=daylight.get(c)?(on?'#c9f7ee':'#285867'):(on?CITY.window:'#417589');c.fillRect(x-w/2+5,y-h+8+i*13,w-10,6)
    c.fillStyle=CITY.front;c.fillRect(x+1,y-h+8+i*13,2,6)
  }
}
export function plant(c:CanvasRenderingContext2D,x:number,y:number,size=10){
  polygon(c,[[x-size,y],[x-size*.75,y-size],[x,y-size*1.65],[x+size*.8,y-size],[x+size,y],[x,y+size*.25]],daylight.get(c)?'#7abe70':CITY.leaf)
  polygon(c,[[x,y-size*1.65],[x+size*.8,y-size],[x+size,y],[x,y+size*.25]],CITY.leafDark)
}

/** A bounded pool of light, drawn with cached sprites rather than canvas shadow blur. */
const lights=new Map<string,HTMLCanvasElement>()
export function lightPool(c:CanvasRenderingContext2D,x:number,y:number,r:number,color='#ffc466',strength=.4,flat=.65){
  let cv=lights.get(color)
  if(!cv){cv=document.createElement('canvas');cv.width=cv.height=96;const g=cv.getContext('2d')!;const fill=g.createRadialGradient(48,48,0,48,48,48);fill.addColorStop(0,color+'aa');fill.addColorStop(.35,color+'55');fill.addColorStop(1,color+'00');g.fillStyle=fill;g.fillRect(0,0,96,96);lights.set(color,cv)}
  c.save();c.globalAlpha*=strength;c.drawImage(cv,x-r,y-r*flat,r*2,r*2*flat);c.restore()
}
