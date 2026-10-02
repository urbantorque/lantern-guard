import type { Sim } from '../game/sim'
import { hasSunReserve, landmark, SUN_CAPACITY } from '../game/watch-depth'
import { block, polygon, lightPool } from './architecture'
import { upright } from './board-view'

/** One useful focal point per map. Small silhouettes keep routes and build pads clear. */
export function drawLandmark(c:CanvasRenderingContext2D,s:Sim,time:number,still:boolean,wide:boolean){
  if(!s.challenge.watchDepth)return
  const l=landmark(s),{x,y}=l,night=s.sky.night
  const active=l.id==='moonwell'?night&&s.climate.elapsed%12<(s.challenge.livingWatch?6:4):l.id==='stormgarden'?s.sky.weather==='rain':l.id==='sunterrace'?!night:night
  c.save();c.fillStyle=l.colour+(active?'0e':'06');c.strokeStyle=l.colour+(active?'66':'2b');c.lineWidth=1.3;c.setLineDash([3,8]);c.beginPath();c.arc(x,y,l.radius,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([])
  upright(c,x,y,wide,()=>{
    polygon(c,[[x-26,y+3],[x,y+15],[x+29,y-1],[x+3,y-16]],night?'#35596c':'#d8d6b5')
    if(active)lightPool(c,x,y,50,l.colour,.45)
    if(l.id==='moonwell'){
      block(c,x,y,32,22,9,'#4d8794','#bad9d3','#355c78')
      c.fillStyle=active?'#b9ffef':'#368caf';c.beginPath();c.ellipse(x,y-11,12,7,0,0,Math.PI*2);c.fill()
      c.strokeStyle=l.colour;c.lineWidth=2;c.beginPath();c.arc(x,y-18,9,.25,Math.PI-.25);c.stroke()
    }else if(l.id==='stormgarden'){
      block(c,x,y,30,22,7,'#69876e','#b4d6a3','#406461')
      for(const [dx,h]of [[-10,14],[1,29],[12,19]])polygon(c,[[x+dx,y-h-9],[x+dx+5,y-h],[x+dx,y-7],[x+dx-5,y-h]],active?'#f0d3ff':'#b4b5e5')
    }else if(l.id==='sunterrace'){
      block(c,x,y,36,24,10,'#b88259','#edd1a0','#826853')
      for(let i=0;i<3;i++)polygon(c,[[x-15+i*10,y-12],[x-10+i*10,y-25],[x-2+i*10,y-25],[x-7+i*10,y-12]],active?'#ffe4a0':'#687da0')
    }else{
      block(c,x,y,27,19,6,'#679690','#c1d4b8','#426c73')
      c.strokeStyle='#cab281';c.lineWidth=3;c.beginPath();c.moveTo(x-10,y-8);c.lineTo(x-10,y-29);c.quadraticCurveTo(x,y-39,x+10,y-29);c.lineTo(x+10,y-8);c.stroke()
      const sway=still?0:Math.sin(time*1.4)*(active?2:1)
      polygon(c,[[x-5+sway,y-28],[x+5+sway,y-28],[x+8+sway,y-16],[x-8+sway,y-16]],'#eecb7d')
    }
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
