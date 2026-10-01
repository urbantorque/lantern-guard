import type { Tower, Sim } from './sim'
import { stageOf } from './fixed'
import type { TowerId } from './defs'

/** Roles describe the whole stream; benefits describe only the next purchase. */
export const STREAM_ROLES:Record<TowerId,readonly [string,string]>={
  wick:['Crowd volleys','Piercing sparks'],cracker:['Wide blasts','Guided fire'],
  bell:['Slow & stun','Weaken & reveal'],owl:['Armour hunter','Tower support'],
  garden:['Bigger harvests','Defend & earn'],beam:['Piercing beam','Wider coverage'],
  storm:['Long chains','Heavy arcs'],ballista:['Siege hits','Rapid fire'],
}
const n=(v:number)=>String(+v.toFixed(2))

/** Bundles include the foundation in the comparison with the actual tower. */
export function upgradeBenefits(sim:Sim,t:Tower,branch:0|1,bundle=false) {
  const stage=stageOf(t),target=bundle?2:stage+1
  const next=stage===3?sim.towerStats(t.id,t.a,t.b,1):sim.towerStats(t.id,target===1?1:branch===0?target:0,target===1?0:branch===1?target:0)
  const old=t.stats,lines:string[]=[]
  if(next.heavy&&!old.heavy)lines.push('Breaks armour')
  if(next.detect&&!old.detect)lines.push('Targets hidden foes')
  if(next.revealPerm&&!old.revealPerm)lines.push('Reveals foes permanently')
  if(next.brittle&&!old.brittle)lines.push('Weakens armour')
  if(next.stunEvery!==old.stunEvery)lines.push(`Stuns every ${next.stunEvery} tolls`)
  if(next.mothEvery&&!old.mothEvery)lines.push('Moths attack nearby foes')
  if(next.income!==old.income)lines.push(`Glow / wave ${n(old.income)} → ${n(next.income)}`)
  if(next.lifePerWave>old.lifePerWave)lines.push(`Restores ${next.lifePerWave} light / full wave`)
  if(next.lure>old.lure)lines.push(`Nearby kills +${Math.round(next.lure*100)}% glow`)
  if(next.auraRange!==old.auraRange)lines.push(`Nearby tower reach +${Math.round(next.auraRange*100)}%`)
  if(next.auraRate!==old.auraRate)lines.push(`Nearby tower fire rate +${Math.round(next.auraRate*100)}%`)
  if(next.beams!==old.beams)lines.push(`Beams ${old.beams} → ${next.beams}`)
  if(next.count!==old.count)lines.push(`${t.id==='storm'?'Targets':'Shots'} ${old.count} → ${next.count}`)
  if(next.slow!==old.slow||next.slowDur!==old.slowDur)lines.push(`Slow ${Math.round(next.slow*100)}% for ${n(next.slowDur)}s`)
  if(next.damage!==old.damage)lines.push(`Damage${t.id==='beam'?' / sec':''} ${n(old.damage)} → ${n(next.damage)}`)
  if(next.interval!==old.interval&&!['beam','garden'].includes(t.id))lines.push(`Reload ${n(old.interval)}s → ${n(next.interval)}s`)
  if(old.mothEvery&&next.mothEvery!==old.mothEvery)lines.push(`Moth reload ${n(old.mothEvery)}s → ${n(next.mothEvery)}s`)
  if(next.range!==old.range)lines.push(`Reach ${Math.round(old.range)} → ${Math.round(next.range)}`)
  if(next.pierce!==old.pierce)lines.push(`Pierces ${next.pierce} foes${t.id==='beam'?' (secondary hits: 50%)':''}`)
  if(next.splash!==old.splash)lines.push(`${t.id==='storm'?'Jump reach':'Blast radius'} ${Math.round(old.splash)} → ${Math.round(next.splash)}`)
  if(next.burn!==old.burn)lines.push(`Burn ${n(next.burn)} damage / sec`)
  if(next.dive!==old.dive)lines.push(`Dive ${n(next.dive)} damage / 3s`)
  if(next.gardenSlow!==old.gardenSlow)lines.push(`Nearby foes ${Math.round(next.gardenSlow*100)}% slower`)
  return lines
}
export const upgradeDetail=(sim:Sim,t:Tower,branch:0|1,bundle=false)=>upgradeBenefits(sim,t,branch,bundle).join(' · ')
