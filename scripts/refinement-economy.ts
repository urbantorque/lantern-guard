import {writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {Sim} from '../src/game/sim'
import {HERO_IDS} from '../src/game/heroes'
import {HERO_BUILDS} from '../src/game/watch-refinement'
import {techniqueOffers} from '../src/game/watch-craft'
import {runFixed,type Strategy} from './fixed-bot'

const rows=[]
for(const [i,hero]of HERO_IDS.entries())for(const scenario of ['seed-a','seed-b','greedy','no-garden','legacy'] as const){
 const refined=scenario!=='legacy',build=HERO_BUILDS[hero][scenario==='seed-b'?1:0],variant=scenario.startsWith('seed')?i:2,seed=scenario.startsWith('seed')?98117:1047
 const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,...(refined?{refinedWatch:1 as const}:{}),hero,variant},seed)
 const checkpoints:unknown[]=[]
 let lastBoss:unknown=null
 runFixed(s,(['greedy','no-garden'].includes(scenario)?scenario:'mixed') as Strategy,q=>{
  const offers=techniqueOffers(q);if(offers.length)q.chooseTechnique(offers[Number(build.pair[q.techniques.length])].id)
  if([10,20,30,39].includes(q.wave))checkpoints.push({wave:q.wave,glow:Math.round(q.glow),light:q.lives,spent:q.towers.reduce((n,t)=>n+t.spent,0)})
 },build.branches,q=>{const boss=q.enemies.find(e=>e.alive&&e.def.boss);if(boss)lastBoss={type:boss.def.id,hp:Math.round(boss.hp),maxHp:boss.maxHp,segment:boss.seg.id}})
 const row={hero,scenario,seed,variant,build:build.name,won:s.won,wave:s.wave,light:s.lives,healed:s.stats.lightRestored??0,leaks:s.stats.leaked,lastBoss,checkpoints};rows.push(row)
 console.log(JSON.stringify(row));writeFileSync('artifacts/refinement-economy.json',JSON.stringify(rows,null,2))
}

// Weather runs are stress probes, not promised perfect-play wins.
assert(rows.filter(r=>r.scenario==='no-garden').every(r=>r.won),'A Garden-free build must stay viable for each hero')
