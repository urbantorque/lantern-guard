import type { Sim } from '../game/sim'
import { hasSunReserve, landmark, SUN_CAPACITY } from '../game/watch-depth'
import { polygon, lightPool } from './architecture'
import { drawLandmarkMiniature } from './place-art'
import { upright } from './board-view'

/** One useful focal point per map. Small silhouettes keep routes and build pads clear. */
export function drawLandmark(c:CanvasRenderingContext2D,s:Sim,time:number,still:boolean,wide:boolean){
  if(!s.challenge.watchDepth)return
  const l=landmark(s),{x,y}=l,night=s.sky.night
  if(s.challenge.watchDirector===2&&l.id!=='moonwell'){upright(c,x,y,wide,()=>drawLandmarkMiniature(c,l.id,x,y,false,night,time,still));return}
  const active=l.id==='moonwell'?night&&s.climate.elapsed%12<(s.challenge.livingWatch?6:4):l.id==='stormgarden'?s.sky.weather==='rain':l.id==='sunterrace'?!night:night
  c.save();c.fillStyle=l.colour+(active?'0e':'06');c.strokeStyle=l.colour+(active?'66':'2b');c.lineWidth=1.3;c.setLineDash([3,8]);c.beginPath();c.arc(x,y,l.radius,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([])
  upright(c,x,y,wide,()=>{
    if(active)lightPool(c,x,y,50,l.colour,.45)
    drawLandmarkMiniature(c,l.id,x,y,active,night,time,still)
    if(active&&!still){const phase=(time*.3)%1;c.strokeStyle=l.colour;c.globalAlpha=(1-phase)*.35;c.beginPath();c.ellipse(x,y-4,16+phase*12,8+phase*6,0,0,Math.PI*2);c.stroke()}
  });c.restore()
}

export function drawSunReserves(c:CanvasRenderingContext2D,s:Sim,still:boolean,wide:boolean){
  if(!s.challenge.watchDepth)return
  for(const t of s.towers){
    if(!hasSunReserve(t))continue
    const charge=(t.sunlight??0)/SUN_CAPACITY,pulse=t.sunPulse??0
    if(pulse>0){
      c.save();c.strokeStyle='#ffde9155';c.lineWidth=2;c.beginPath();c.arc(t.x,t.y,still?t.stats.range*1.4:(1-pulse/4)*t.stats.range*1.4,0,Math.PI*2);c.stroke();c.restore()
    }
    upright(c,t.x,t.y,wide,()=>{
      for(let i=0;i<3;i++){
        const x=t.x-10+i*10,y=t.y+12,lit=charge*3>=i+1
        polygon(c,[[x,y-4],[x+3,y],[x,y+4],[x-3,y]],lit?'#ffe3a4':'#34546a')
        if(lit)lightPool(c,x,y,7,'#ffdc8b',.25,1)
      }
    })
  }
}
