/** Presentation only. Routes, ranges, saves and balance stay in world coordinates. */
export const BOARD_DEPTH=.55
export const boardPoint=(x:number,y:number,wide:boolean)=>wide?{x:y,y:-x*BOARD_DEPTH}:{x,y}
export const worldPoint=(x:number,y:number,wide:boolean)=>wide?{x:-y/BOARD_DEPTH,y:x}:{x,y}
export const elevated=(x:number,y:number,height:number,wide:boolean)=>wide?{x:x+height/BOARD_DEPTH,y}:{x,y:y-height}
export const boardAngle=(angle:number,wide:boolean)=>{const p=boardPoint(Math.cos(angle),Math.sin(angle),wide);return Math.atan2(p.y,p.x)}

/** Keep miniature buildings, creatures and labels upright when the board turns. */
export function upright(c:CanvasRenderingContext2D,x:number,y:number,wide:boolean,paint:()=>void){
  c.save()
  if(wide){c.translate(x,y);c.rotate(Math.PI/2);c.scale(1,1/BOARD_DEPTH);c.translate(-x,-y)}
  paint();c.restore()
}

export function boardBounds(wide:boolean){
  return wide?{x:-50,y:-900*BOARD_DEPTH,w:920,h:900*BOARD_DEPTH}:{x:20,y:-105,w:680,h:970}
}

/** Frame the water and usable plots; reserve roof space only where a tower stands. */
export function livingBoardBounds(s:import('../game/sim').Sim,wide:boolean){
  if(!wide)return s.challenge.watchDirector&&s.challenge.variant===1?{x:-5,y:-105,w:760,h:1010}:boardBounds(false)
  const points=[...s.level.segs.values()].flatMap(seg=>seg.line.pts.map(p=>({...boardPoint(p.x,p.y,true),roof:38})))
  for(const [i,p]of s.pads.entries())if(s.padRevealed(i))points.push({...boardPoint(p.x,p.y,true),roof:p.tower?150:26})
  points.push({...boardPoint(s.level.def.home.x,s.level.def.home.y,true),roof:120})
  const minX=Math.min(...points.map(p=>p.x))-35,maxX=Math.max(...points.map(p=>p.x))+40
  const minY=Math.min(...points.map(p=>p.y-p.roof))-14,maxY=Math.max(...points.map(p=>p.y))+38
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY}
}
