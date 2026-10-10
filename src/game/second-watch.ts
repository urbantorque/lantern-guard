import type { Challenge, Sim, Tower } from './sim'
import type { LevelDef } from './level'
import type { Passage } from './watch-director'
import type { WaveDef } from './waves'

/** A rules boundary: director 1 snapshots continue to simulate exactly as published. */
export const secondWatch = (c: Challenge) => c.watchDirector === 2
export const SECOND_STAGES = ['Base', 'Specialisation', 'Crown'] as const
export const JETTY_PAD = 12

/** All original plots remain in place. Only the empty side inlet is rebuilt. */
export function passageLevel(base: LevelDef, passage: Passage | null): LevelDef {
  if (!passage) return base
  const level = structuredClone(base), inlet = level.segments.find(s => s.id === 'inlet')!
  if (passage === 'convoy') {
    // A new, free plot beside the island's downstream face.
    const sites:Record<string,{x:number;y:number}>={Millpond:{x:440,y:400},'Reed Crossing':{x:480,y:385},'Lantern Reach':{x:580,y:280},'Stone Weir':{x:540,y:385}}
    level.pads.push(sites[level.name])
  } else {
    const first = inlet.pts[0], last = inlet.pts[inlet.pts.length - 1]
    // The reopened basin adds two long banks before rejoining the same canal.
    const bend=level.name==='Reed Crossing'?[[705,615],[580,670],[515,585],[535,530]]:last.x===210?[[20,550],[100,700],[245,655],[255,550]]:first.x>360?[[700,520],[540,560],[400,490]]:[[20,520],[180,560],[320,490]]
    inlet.pts = [first,...bend.map(([x,y])=>({x,y})),last]
    inlet.curve = undefined
  }
  return level
}

export function passageDescription(id: Passage) {
  return id === 'convoy'
    ? {name:'Restore the island jetty',reward:'New plot 13 + 180 glow',risk:'Three extra armoured fronts over the next three waves.',plan:'A free building plot beside the island. Invest the advance in a specialist.'}
    : {name:'Reopen the lower sluice',reward:'Longer side approach + 270 glow',risk:'Two additional runner groups per wave for three waves.',plan:'A permanent detour buys a longer firing window. Earn 90 glow after each hold.'}
}

export function secondWave(base: WaveDef, c: Challenge, n: number): WaveDef {
  if (!secondWatch(c)) return base
  const groups = base.groups.map(g=>({...g}))
  if (!c.expedition && !c.endurance && [14,18,21].includes(n)) {
    groups.push({type:'shell',count:3,gap:1.6,at:9,src:'west'})
  }
  if (groups.some(g=>g.type==='toad')) return {...base,groups,note:'The captain links one escort while calling its brood. Break the glowing tether by destroying that escort, or interrupt the call.'}
  if (groups.some(g=>g.type==='bloomheart')) return {...base,groups,note:'The Matriarch links an escort before healing. Destroy the tethered escort or interrupt the channel, then strike the exposed core.'}
  const note=(base.note??'').replace('Compare a tower’s two streams. Choose a specialisation now, or improve its foundation first.','Choose one tower specialisation. Save for its Crown or extend coverage with a second tower.').replace('Mastered upgrades','Crown upgrades').replace('Lighthouses and Mastered','Lighthouses and Crown')
  return {...base,groups,note}
}

export function designatedTarget(s: Sim) {
  const t = s.director?.command && s.towers.find(t=>t.uid===s.director!.command!.tower)
  if (!t) return null
  const eligible = s.enemies.filter(e=>e.alive && Math.hypot(e.x-t.x,e.y-t.y)<=s.effRange(t) && s.canSee(e,t.stats.detect))
  if (s.director?.target) return eligible.find(e=>e.uid===s.director!.target)??null
  return eligible.sort((a,b)=>Number(!!b.def.boss)-Number(!!a.def.boss)||(b.hp+b.shell)-(a.hp+a.shell)||a.uid-b.uid)[0]??null
}

export function commandReadout(s:Sim, tower:Tower|null, targets:Sim['enemies']) {
  if (!tower) return 'Select a command tower in its inspection panel.'
  const owner=`${tower.def.name}${s.director?.command?.phase==='held'?' · holding fire':''}`
  if (s.challenge.hero==='sol') return `${owner} · ${targets.length} burns${targets.length?` · first expires in ${Math.min(...targets.map(e=>e.burnT)).toFixed(1)}s`:''}`
  if (s.challenge.hero==='mira') return `${owner} · ${targets.length} in reach${targets.some(e=>(e.signalT??0)>0)?' · INTERRUPT NOW':''}`
  const target=designatedTarget(s)
  return `${owner} · ${target?`${target.def.name} · ${Math.ceil(target.hp+target.shell)} health + armour`:s.director?.target?'Chosen target out of reach':'Bank to aim'}`
}
