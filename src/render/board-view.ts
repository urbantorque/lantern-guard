/** Presentation only. Routes, ranges, saves and balance stay in world coordinates. */
export const BOARD_DEPTH=.55
export const boardPoint=(x:number,y:number,wide:boolean)=>wide?{x:y,y:-x*BOARD_DEPTH}:{x,y}
export const worldPoint=(x:number,y:number,wide:boolean)=>wide?{x:-y/BOARD_DEPTH,y:x}:{x,y}
export const elevated=(x:number,y:number,height:number,wide:boolean)=>wide?{x:x+height/BOARD_DEPTH,y}:{x,y:y-height}

/** Keep miniature buildings, creatures and labels upright when the board turns. */
export function upright(c:CanvasRenderingContext2D,x:number,y:number,wide:boolean,paint:()=>void){
  c.save()
  if(wide){c.translate(x,y);c.rotate(Math.PI/2);c.scale(1,1/BOARD_DEPTH);c.translate(-x,-y)}
  paint();c.restore()
}

export function boardBounds(wide:boolean){
  return wide?{x:-50,y:-900*BOARD_DEPTH,w:920,h:900*BOARD_DEPTH}:{x:20,y:-105,w:680,h:970}
}
