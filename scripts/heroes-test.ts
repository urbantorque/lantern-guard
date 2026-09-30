import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim,DT,type SaveSnapshotV2 } from '../src/game/sim'
import { HERO_IDS,HEROES,heroStats,heroTower,type HeroId } from '../src/game/heroes'
import { fixedStats } from '../src/game/fixed'
import { TOWER_ORDER,TOWERS,type Difficulty } from '../src/game/defs'
import { validSnapshot } from '../src/game/save-store'
import { runFixed } from './fixed-bot'

const fresh=(hero?:HeroId,map=0,mode:Difficulty='standard',seed=1047)=>new Sim(mode,{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:map,...(hero?{hero}:{})},seed)
assert.equal(new Set(HERO_IDS.flatMap(h=>TOWER_ORDER.map(id=>HEROES[h].towers[id].name))).size,24)
for(const id of TOWER_ORDER){
  assert.deepEqual(fresh().towerStats(id,0,0),fixedStats(id,0,0),'unselected legacy kit keeps exact stats')
  assert.equal(new Set(HERO_IDS.map(hero=>JSON.stringify(heroStats(fixedStats(id,0,0),id,hero)))).size,3,`${id} plays differently for all heroes`)
}
for(const hero of HERO_IDS){
  for(const id of TOWER_ORDER)for(const path of [0,1]as const){
    const s=fresh(hero);s.wave=30;s.glow=50000;const t=s.build(0,id)!
    assert.equal(t.def.name,heroTower(id,hero).name);assert.notEqual(t.def.name,TOWERS[id].name)
    assert(s.upgrade(t,0));assert(s.upgrade(t,path));assert(s.upgrade(t,path));assert(s.refine(t));assert(!s.upgrade(t,path));assert(!s.refine(t))
    assert(validSnapshot(s.snapshot()),`${hero} ${id} crowned save valid`)
    assert.deepEqual(Sim.restore(s.snapshot()).towers[0].stats,t.stats)
  }
  const s=fresh(hero);s.build(0,'wick');s.startWave();for(let i=0;i<180;i++){s.step(DT);s.events=[]}
  const snap=JSON.parse(JSON.stringify(s.snapshot()))as SaveSnapshotV2;assert(validSnapshot(snap));const restored=Sim.restore(snap)
  assert.deepEqual(restored.snapshot(),snap)
  for(let i=0;i<300;i++){s.step(DT);restored.step(DT);s.events=[];restored.events=[]}
  assert.deepEqual(restored.snapshot(),s.snapshot(),`${hero}: exact combat continuation`)
}
const water=fresh('mira');water.wave=30;water.glow=5000;const mortar=water.build(0,'cracker')!;water.startWave();for(let i=0;i<100&&!water.enemies.length;i++)water.step(DT)
const enemy=water.enemies[0];assert(enemy);water.damage(enemy,1,true,mortar);assert.equal(enemy.slowF,.18);assert.equal(enemy.slowT,1.2)
const corrupt=fresh('sol').snapshot();(corrupt.challenge as {hero:string}).hero='unknown';assert(!validSnapshot(corrupt))
const legacy=fresh().snapshot();delete legacy.challenge.fixed;legacy.challenge.hero='sol';assert(!validSnapshot(legacy),'heroes cannot enter legacy rules')
console.log('PASS 24 unique towers, all upgrade branches, legacy balance, save validation, hit control and exact hero continuation')

const results=[]
for(const hero of HERO_IDS)for(let map=0;map<4;map++)for(const mode of ['relaxed','standard','nightfall']as const)for(const seed of [1047,4099]){
  const s=runFixed(fresh(hero,map,mode,seed));results.push({hero,map,mode,seed,won:s.won,wave:s.wave,light:s.lives})

}
writeFileSync('artifacts/hero-balance.json',JSON.stringify(results,null,2)+'\n')
for(const hero of HERO_IDS)console.log(hero,results.filter(r=>r.hero===hero&&r.won).length+'/24 campaigns won',results.filter(r=>r.hero===hero&&!r.won))
assert(results.filter(r=>r.mode!=='nightfall').every(r=>r.won),'Every hero can complete all Standard and Relaxed reference campaigns')
console.log('PASS 72 full hero campaigns across four maps, three difficulties and two seeds')
