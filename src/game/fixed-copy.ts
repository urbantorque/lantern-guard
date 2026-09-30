import type { Tower, Sim } from './sim'
import { fixedStats,stageOf,upgradePrice } from './fixed'

export function upgradeDetail(sim:Sim,t:Tower,branch:0|1) {
  const stage=stageOf(t)
  const next=stage===3?fixedStats(t.id,t.a,t.b,1):fixedStats(t.id,stage===0?1:branch===0?stage+1:0,stage===0?0:branch===1?stage+1:0)
  const old=t.stats,lines:string[]=[]
  if(next.damage!==old.damage)lines.push(`${+next.damage.toFixed(1)} damage${t.id==='beam'?' / second':' per hit'}`)
  if(next.interval!==old.interval&&t.id!=='beam')lines.push(`${+next.interval.toFixed(2)}s between attacks`)
  if(next.range!==old.range)lines.push(`${Math.round(next.range)} reach`)
  if(next.count!==old.count)lines.push(`${next.count} ${t.id==='storm'?'lightning targets':'shots'}`)
  if(next.pierce!==old.pierce)lines.push(`Hits up to ${next.pierce} targets${t.id==='beam'?' (secondary hits deal half damage)':''}`)
  if(next.splash!==old.splash)lines.push(`${Math.round(next.splash)} blast radius`)
  if(next.heavy&&!old.heavy)lines.push('Full damage against armour')
  if(next.detect&&!old.detect)lines.push('Can target hidden enemies')
  if(next.slow!==old.slow||next.slowDur!==old.slowDur)lines.push(`${Math.round(next.slow*100)}% slow for ${+next.slowDur.toFixed(1)}s`)
  if(next.stunEvery!==old.stunEvery)lines.push(`Every ${next.stunEvery}th toll stuns ordinary enemies`)
  if(next.brittle&&!old.brittle)lines.push('Tolls weaken armour for follow-up hits')
  if(next.revealPerm&&!old.revealPerm)lines.push('Reveals hidden enemies permanently')
  if(next.burn!==old.burn)lines.push(`${next.burn} burn damage / second`)
  if(next.beams!==old.beams)lines.push(`${next.beams} beams against different enemies`)
  if(next.auraRange!==old.auraRange)lines.push(`Nearby towers gain ${Math.round(next.auraRange*100)}% reach`)
  if(next.auraRate!==old.auraRate)lines.push(`Nearby towers gain ${Math.round(next.auraRate*100)}% firing speed`)
  if(next.dive!==old.dive)lines.push(`${next.dive} heavy dive damage every 3s`)
  if(next.mothEvery&&!old.mothEvery)lines.push('Moths attack nearby enemies, including hidden ones')
  if(next.gardenSlow!==old.gardenSlow)lines.push(`${Math.round(next.gardenSlow*100)}% nearby slow`)
  if(next.lifePerWave>old.lifePerWave)lines.push(`Restores ${next.lifePerWave} light per wave`)
  if(next.income>old.income) {
    const payback=Math.ceil(upgradePrice(t)!/(next.income-old.income))
    lines.push(`${next.income} glow per wave. Base payback ${payback} waves (daylight is faster, night slower); ${sim.finalWave-sim.wave} remain`)
  }
  if(next.lure>old.lure)lines.push(`${Math.round(next.lure*100)}% extra glow from nearby defeated enemies`)
  return lines.join(' · ')+'.'
}
