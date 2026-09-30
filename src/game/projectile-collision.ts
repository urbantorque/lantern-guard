/** First contact along a projectile's swept segment; null means a clean miss. */
export function contactTime(ax:number,ay:number,bx:number,by:number,x:number,y:number,radius:number):number|null {
  const dx=bx-ax,dy=by-ay,ox=ax-x,oy=ay-y,c=ox*ox+oy*oy-radius*radius
  if(c<=0)return 0
  const a=dx*dx+dy*dy;if(a===0)return null
  const b=2*(ox*dx+oy*dy),d=b*b-4*a*c
  if(d<0)return null
  const t=(-b-Math.sqrt(d))/(2*a)
  return t>=0&&t<=1?t:null
}
