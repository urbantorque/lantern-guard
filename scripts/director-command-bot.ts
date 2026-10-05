import type {Sim} from '../src/game/sim'
import {commandTargets} from '../src/game/watch-director'

/** Deliberate commands follow visible battlefield cues; they spend no extra resources. */
export function commandMoment(s:Sim){
  if(!s.director||!s.waveActive||s.over)return
  const targets=commandTargets(s),q=s.director.command,hero=s.challenge.hero
  const bossWave=s.waveDef(s.wave).groups.some(g=>['toad','warden','gloom','bloomheart','dredger'].includes(g.type))
  const opportunity=hero==='sol'?targets.length>=3||targets.some(e=>e.def.boss):hero==='mira'?targets.some(e=>(e.signalT??0)>0)||!bossWave&&targets.filter(e=>!e.def.boss).length>=6:targets.some(e=>e.def.boss)||targets.length<=2&&targets.some(e=>e.shell>0)
  if(opportunity){if(!q)s.bankCommand();else if(q.phase==='held')s.releaseCommand()}
  if(q?.phase==='held'&&!targets.length&&!s.spawners.length&&s.enemies.filter(e=>e.alive).every(e=>e.remaining<200))s.cancelCommand()
}
