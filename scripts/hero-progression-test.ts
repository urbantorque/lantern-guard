import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim } from '../src/game/sim'
import { HERO_IDS } from '../src/game/heroes'
import { COMMISSIONS } from '../src/game/fixed'
import { bestWave,loadVillage,loadWatch,saveWatch,recordWatch,writeJSON } from '../src/game/fixed-store'
import { validSnapshot } from '../src/game/save-store'
import { runFixed } from './fixed-bot'
const memory=new Map<string,string>()
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)},configurable:true})
const profile=loadVillage()
for(const [i,hero] of HERO_IDS.entries()){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:0,hero},123)
  s.wave=5+i;s.stats.cheered={drip:20};recordWatch(profile,s);recordWatch(profile,s)
  assert.equal(bestWave(profile,0,'standard',hero),5+i)
  assert(saveWatch(s,[],'campaign'));assert.equal(loadWatch('campaign')!.snapshot.challenge.hero,hero)
  profile.lastHero=hero;writeJSON('profile',profile);assert.equal(loadVillage().lastHero,hero)
}
assert.equal(profile.journal.drip,60,'same-seed watches credit each hero once')
assert.equal(bestWave(profile,0,'standard'),7)
writeJSON('profile',{...profile,lastHero:'missing'});assert.equal(loadVillage().lastHero,'sol')
const rows=[]
for(const hero of HERO_IDS)for(const c of COMMISSIONS){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:c.variant,hero,commission:c.id,blockedPad:c.blockedPad,id:`commission:${c.id}:fixed1`,skirmish:{from:c.from,to:c.to,glow:c.glow,seed:c.seed}})
  assert(validSnapshot(s.snapshot()));runFixed(s);assert(s.won,`${hero} ${c.id} must be achievable`)
  assert(saveWatch(s,[],'commission'));assert.equal(loadWatch('campaign')!.snapshot.challenge.hero,'ivo')
  rows.push({hero,commission:c.id,won:s.won,light:s.lives})
}
const alternate=runFixed(new Sim('nightfall',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:1,hero:'ivo'},1047),'sparks')
console.log('Ivo, Reed Crossing, Nightfall alternate fan build:',alternate.won,alternate.wave,alternate.lives)
writeFileSync('artifacts/hero-progression.json',JSON.stringify({commissions:rows,alternate:{hero:'ivo',map:1,mode:'nightfall',seed:1047,strategy:'sparks',won:alternate.won,wave:alternate.wave,light:alternate.lives}},null,2)+'\n')
console.log('PASS separate hero records, idempotent journal, saved selection, separate save slots and all nine hero commissions')
