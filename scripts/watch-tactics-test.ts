import assert from 'node:assert/strict'
import { Sim,DT,type Challenge,type Tower } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { breachAdvice,breachDetail,crownTechnique,matchingCheckpoint } from '../src/game/watch-tactics'
import { HERO_IDS } from '../src/game/heroes'
import { HERO_BUILDS } from '../src/game/watch-refinement'
import { techniqueOffers,type TechniqueId } from '../src/game/watch-craft'
import { EXPEDITIONS } from '../src/game/watch-depth'
import { planFixed } from './fixed-bot'

const rules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,hero:'sol',variant:0}
const fresh=(hero:Challenge['hero']='sol')=>new Sim('standard',{...rules,hero},1047)
const arena=(hero:Challenge['hero'],technique?:TechniqueId)=>{const s=fresh(hero);s.wave=30;s.glow=100000;if(technique)assert(s.chooseTechnique(technique));return s}
const enemy=(s:Sim,type='shell' as Parameters<Sim['spawnEnemy']>[0],at=140)=>s.spawnEnemy(type,s.level.segs.get('w1')!,at,s.wave+1)
const crown=(s:Sim,t:Tower)=>{assert(s.specialise(t,1));assert(s.upgrade(t,1));assert(s.refine(t));assert(crownTechnique(s,t))}

const shatter=arena('sol'),bell=shatter.build(0,'bell')!,blast=shatter.build(3,'cracker')!
bell.x=blast.x=220;bell.y=blast.y=200;shatter.syncBonds();assert.equal(shatter.bonds.length,1)
shatter.bonds[0].readyAt=0
const foes=Array.from({length:4},(_,i)=>enemy(shatter,'shell',140+i*5))
for(const e of foes){e.x=220;e.y=200;e.shell=100;e.hp=100;e.slowT=2}bell.fireT=shatter.time
shatter.damage(foes[0],10,true,blast)
assert.deepEqual(foes.map(e=>e.shell),[76,88,88,100]);assert.deepEqual(foes.map(e=>e.exposedT??0),[3,3,3,0])
assert.equal(bell.armourRemoved,36);assert.equal(shatter.bonds[0].activations,1)
shatter.damage(foes[0],10,true,blast);assert.equal(shatter.bonds[0].activations,1,'cooldown prevents retrigger')
const lone=enemy(shatter);lone.x=220;lone.y=200;lone.slowT=0;shatter.bonds[0].readyAt=0;shatter.damage(lone,1,true,blast);assert.equal(shatter.bonds[0].activations,1,'slow is required')

const beacon=arena('sol'),scout=beacon.build(0,'owl')!,bolt=beacon.build(3,'ballista')!,line=enemy(beacon,'bloat')
scout.x=bolt.x=line.x;scout.y=bolt.y=line.y-60;scout.cd=100;bolt.cd=0;line.hp=10000;beacon.syncBonds();beacon.bonds[0].readyAt=0;beacon.step(DT)
const lance=beacon.projs.find(p=>p.kind==='bolt')!;assert(lance?.beacon);assert(lance.heavy);assert.equal(lance.pierce,bolt.stats.pierce+2);assert.equal(lance.dmg,bolt.stats.damage*1.3)
assert.equal(beacon.bonds[0].activations,1)
console.log('PASS formation Shatterburst, cooldown and slow requirement; real Beacon projectile with extra pierces')

const fire=arena('sol','long-embers'),cannon=fire.build(0,'cracker')!;crown(fire,cannon)
for(let i=0;i<5;i++){const e=enemy(fire,'drip',140+i*8);e.burnSource=cannon.uid;e.burnT=1;e.burnDps=12;fire.damage(e,999,true,cannon)}
assert.equal(fire.embers.length,3,'Ashfall has a per-tower pool cap');assert(fire.embers.every(p=>p.life===2.5))
const ember=enemy(fire,'drip'),near=enemy(fire,'shell',145);ember.burnSource=cannon.uid;ember.burnT=.4;ember.burnDps=12;fire.damage(ember,999,true,cannon);assert.equal(near.burnT,3);assert.equal(near.burnDps,9)
const flash=arena('sol','flashpoint'),rocket=flash.build(0,'cracker')!;crown(flash,rocket)
const first=enemy(flash,'bloat'),second=enemy(flash,'bloat',145);first.hp=second.hp=1000;first.burnDps=10;first.burnT=3;flash.damage(first,10,true,rocket);assert.equal(second.hp,980);assert.equal(rocket.crownReadyAt,flash.time+4)
first.burnT=3;first.burnDps=10;flash.damage(first,10,true,rocket);assert.equal(second.hp,980,'Backdraft is capped by cooldown')

for(const technique of ['capacitor','forked-current'] as const){
  const s=arena('ivo',technique),storm=s.build(0,'storm')!;crown(s,storm)
  const target=enemy(s,'shell'),crowd=[145,150,155,160].map(at=>enemy(s,'shell',at))
  storm.x=target.x;storm.y=target.y;storm.cd=0;storm.tolls=2;storm.priority='close';target.shell=technique==='capacitor'?10000:0;target.hp=technique==='capacitor'?10000:1
  for(const e of crowd){e.hp=technique==='capacitor'?10000:1;if(technique==='forked-current')e.shell=0}
  s.step(DT)
  if(technique==='capacitor'){assert.equal(crowd.filter(e=>e.stunT>0).length,3);assert(s.events.some(e=>e.t==='craft'&&e.label==='Thunderhead'))}
  else assert(s.events.some(e=>e.t==='craft'&&e.label.startsWith('Cascade')))
}
for(const technique of ['tidal-echo','deep-freeze'] as const){
  const s=arena('mira',technique),chime=s.build(0,'bell')!;crown(s,chime)
  const target=enemy(s,'shell');chime.x=target.x;chime.y=target.y;chime.cd=0;chime.tolls=2;target.slowT=2;target.hp=10000
  s.step(DT);assert.equal(target.exposedT,3)
}
console.log('PASS all six crown behaviours: Ashfall, Backdraft, Thunderhead, Cascade, Dragnet, Icebreak')

for(const s of [fire,flash]){
  const snap=s.snapshot();assert(validSnapshot(snap));const restored=Sim.restore(structuredClone(snap))
  for(let i=0;i<80;i++){s.step(DT);restored.step(DT);s.events=[];restored.events=[]}
  assert.deepEqual(restored.snapshot(),s.snapshot(),'burn ownership, fire pools and crown cooldown survive resume')
}
const savedLance=fresh();savedLance.wave=30;savedLance.glow=10000
const spotter=savedLance.build(0,'owl')!,archer=savedLance.build(3,'ballista')!
savedLance.syncBonds();savedLance.bonds[0].readyAt=0;spotter.cd=100;archer.cd=0
const seg=savedLance.level.segs.get('w1')!
let shared=0;for(let d=0;d<seg.line.length;d+=5){const p=seg.line.at(d,{x:0,y:0,tx:0,ty:0});if(Math.hypot(p.x-spotter.x,p.y-spotter.y)<savedLance.effRange(spotter)-12&&Math.hypot(p.x-archer.x,p.y-archer.y)<savedLance.effRange(archer)-12){shared=d;break}}
assert(shared>0);savedLance.spawnEnemy('bloat',seg,shared,31);savedLance.step(DT)
assert(savedLance.projs.some(p=>p.beacon));const lanceSnapshot=savedLance.snapshot();assert(validSnapshot(lanceSnapshot));const lanceCopy=Sim.restore(structuredClone(lanceSnapshot))
for(let i=0;i<90;i++){savedLance.step(DT);lanceCopy.step(DT);savedLance.events=[];lanceCopy.events=[]}
assert.deepEqual(lanceCopy.snapshot(),savedLance.snapshot(),'a Beacon lance resumes identically while in flight')
for(const corrupt of [(s:typeof lanceSnapshot)=>{s.projs[0].beacon='yes' as unknown as boolean},(s:typeof lanceSnapshot)=>{s.enemies[0].exposedT=5},(s:typeof lanceSnapshot)=>{s.enemies[0].burnSource=-1}]){const invalid=structuredClone(lanceSnapshot);corrupt(invalid);assert.equal(validSnapshot(invalid),false)}
console.log('PASS new fire/cooldown state and in-flight Beacon replay; malformed new fields are rejected')

for(const type of ['toad','bloomheart'] as const){const s=arena('mira','deep-freeze'),t=s.build(0,'bell')!,boss=enemy(s,type);t.x=boss.x;t.y=boss.y;t.tolls=2;t.cd=0;boss.phase=1;boss.signalT=2;s.step(DT);assert.equal(boss.signalT,0);assert.equal(boss.phase,2);assert.equal(boss.exposedT,4);assert.equal(boss.stunT,0)}
const escort=arena('ivo'),captain=enemy(escort,'warden'),guard=enemy(escort,'skiff');guard.escortOf=captain.uid;escort.damage(guard,10000,true,null);assert.equal(captain.exposedT,4)
console.log('PASS boss signals can be interrupted; last escort defeat creates a bounded heavy-damage opening')

const leaked=fresh(),skiff=enemy(leaked,'skiff');skiff.shell=0;const detail=breachDetail(leaked,skiff);assert.equal(detail.cause,'runaway');assert.match(breachAdvice({enemy:'skiff',route:'',hidden:false,armoured:false,wave:1,light:1,detail}),/no slowing tower/)
const checkpoint=fresh().snapshot(),failed=structuredClone(checkpoint);failed.wave=1;failed.over='lost';failed.lives=0
assert(matchingCheckpoint(failed,checkpoint));for(const change of [{seed:99},{wave:2},{over:'lost'},{enemies:[{}]}])assert(!matchingCheckpoint(failed,{...checkpoint,...change} as typeof checkpoint))
const bad=fresh().snapshot();bad.challenge.watchTactics=2 as 1;assert.equal(validSnapshot(bad),false);bad.challenge.watchTactics=1;bad.challenge.weekly=1;assert.equal(validSnapshot(bad),false)
console.log('PASS factual breach advice, checkpoint matching and invalid rule rejection')

let resumes=0
for(const hero of HERO_IDS)for(const [buildIndex,build] of HERO_BUILDS[hero].entries())for(const short of [false,true]){
  const e=EXPEDITIONS[buildIndex],seed=short?e.seed:1047
  const s=new Sim('standard',{...rules,hero,variant:short?e.variant:0,...(short?{expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed}}:{})},seed)
  for(let n=1;n<=s.finalWave&&!s.over;n++){
    const offers=techniqueOffers(s);if(offers.length)assert(s.chooseTechnique(offers[buildIndex].id));planFixed(s,'mixed',build.branches)
    assert(validSnapshot(s.snapshot()),`planning ${hero} ${n}`);assert(s.startWave())
    for(let i=0;s.waveActive&&!s.over&&i<30000;i++){
      s.step(DT);s.events=[]
      if(i%480===479&&!s.over)planFixed(s,'mixed',build.branches)
      if(i===250&&[short?8:23,short?11:33].includes(n)){
        const snap=s.snapshot();assert(validSnapshot(snap),`active ${hero} ${n}`)
        const copy=Sim.restore(structuredClone(snap));for(let j=0;j<120&&!s.over;j++){s.step(DT);copy.step(DT);s.events=[];copy.events=[]}
        assert.deepEqual(copy.snapshot(),s.snapshot(),`exact tactical resume ${hero} ${n}`);resumes++
      }
    }
    assert(validSnapshot(s.snapshot()),`end ${hero} ${n}`)
  }
  assert(s.won,`${hero} ${build.name} ${short?'expedition':'campaign'} needs a viable paid defence`)
}
console.log(`PASS 12 paid complete watches and ${resumes} deterministic mid-encounter resumes`)
