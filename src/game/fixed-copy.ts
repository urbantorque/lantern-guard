import type { Tower, Sim } from './sim'
import { stageOf } from './fixed'
import type { TowerId } from './defs'
import { CROWN_HELP } from './watch-depth'

/** Roles describe the whole stream; benefits describe only the next purchase. */
export const STREAM_ROLES:Record<TowerId,readonly [string,string]>={
  wick:['Crowd volleys','Piercing sparks'],cracker:['Wide blasts','Guided fire'],
  bell:['Slow & stun','Weaken & reveal'],owl:['Armour hunter','Tower support'],
  garden:['Bigger harvests','Defend & earn'],beam:['Piercing beam','Wider coverage'],
  storm:['Long chains','Heavy arcs'],ballista:['Siege hits','Rapid fire'],
}
/** The immediate purchase, with the opportunity cost of choosing this branch. */
export const STREAM_CHOICE:Record<TowerId,readonly [readonly[string,string],readonly[string,string]]>={
  wick:[['A wider volley of sparks.','Light hits struggle with armour.'],['Piercing, armour-breaking sparks.','Fewer sparks per volley.']],
  cracker:[['Wider, faster explosions.','Shots do not track runners.'],['Rockets track and burn foes.','Smaller blasts.']],
  bell:[['Stronger slows, with damage.','Shorter reach.'],['Wider slows weaken armour.','A gentler slow.']],
  owl:[['Faster, armour-breaking shots.','Less support for neighbours.'],['More reach and stored sunlight.','Less direct damage.']],
  garden:[['Larger harvests every wave.','Gives up the defence branch.'],['Moths defend and earn glow.','Smaller harvests.']],
  beam:[['Heavy damage through a line.','Shorter reach.'],['Long reach, sees hidden foes.','Less damage per target.']],
  storm:[['Lightning jumps farther.','Light hits struggle with armour.'],['Stronger, armour-breaking arcs.','Shorter jumps.']],
  ballista:[['Much heavier single hits.','Slower reload.'],['Faster bolts see hidden foes.','Less damage per bolt.']],
}
export function streamChoice(sim:Sim,t:Tower,branch:0|1):readonly[string,string]{
  const copy=STREAM_CHOICE[t.id][branch]
  if(t.id==='owl'&&branch===1&&!sim.challenge.watchDepth)return ['More reach for nearby towers.',copy[1]]
  if(t.id==='storm'&&branch===0&&sim.towerStats(t.id,2,0).heavy)return [copy[0],'Less damage per hit.']
  if(t.id==='garden'&&branch===0)return [copy[0],sim.challenge.hero==='ivo'?'Moths reload more slowly.':'Gives up attacking moths.']
  return copy
}
const n=(v:number)=>String(+v.toFixed(2))

/** Bundles include the foundation in the comparison with the actual tower. */
export function upgradeBenefits(sim:Sim,t:Tower,branch:0|1,bundle=false) {
  const stage=stageOf(t),target=bundle?2:stage+1
  const next=stage===3?sim.towerStats(t.id,t.a,t.b,1):sim.towerStats(t.id,target===1?1:branch===0?target:0,target===1?0:branch===1?target:0)
  const old=t.stats,lines:string[]=[]
  if(sim.challenge.watchDepth&&stage===3)lines.push(CROWN_HELP[t.id][branch])
  if(sim.challenge.watchDepth&&t.id==='owl'&&branch===1&&target===2)lines.push('Banks 3 night pulses: wider sight, +12% fire rate')
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
