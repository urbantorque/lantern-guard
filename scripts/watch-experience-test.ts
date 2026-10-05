import assert from 'node:assert/strict'
import {Sim,DT,type Challenge} from '../src/game/sim'
import {HERO_IDS,type HeroId} from '../src/game/heroes'
import {techniqueOffers} from '../src/game/watch-craft'
import {preparationBeat} from '../src/game/watch-experience'
import {validSnapshot} from '../src/game/save-store'
import {skyDamage,skyRate,skySpeed,gardenYield,skyReach} from '../src/game/environment'
import {weeklyWatch} from '../src/game/living-watch'
const rules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,variant:0}
const fresh=(hero:HeroId='sol')=>new Sim('standard',{...rules,hero},1047)
for(const hero of HERO_IDS)for(const first of [0,1])for(const second of [0,1]){
 const s=fresh(hero);s.wave=3;s.glow=10000
 const offers=techniqueOffers(s);assert.equal(offers.length,2);assert(offers.every(t=>t.round===1));assert(s.chooseTechnique(offers[first].id))
 assert.equal(techniqueOffers(s).length,0);s.wave=11;assert(s.chooseTechnique(techniqueOffers(s)[second].id))
 const t=s.build(0,hero==='ivo'?'storm':hero==='mira'?'bell':'cracker')!;assert(t);assert(s.specialise(t,first as 0|1))
 s.build(3,'wick');s.build(6,'owl');s.startWave();for(let i=0;i<400;i++)s.step(DT)
 assert(validSnapshot(s.snapshot()),`${hero} snapshot`)
 const copy=Sim.restore(s.snapshot());for(let i=0;i<400;i++){s.step(DT);copy.step(DT);s.events=[];copy.events=[]}
 assert.deepEqual(copy.snapshot(),s.snapshot(),`${hero} exact resume`)
}
console.log('PASS all 12 technique combinations, new order and exact mid-wave replay')
const ivo=fresh('ivo');assert.equal(ivo.keeperWave('storm'),3);ivo.wave=2
const initial=ivo.snapshot(),preview=ivo.previewTower(0,'storm')!;assert(preview);assert.deepEqual(ivo.snapshot(),initial)
const coil=ivo.build(0,'storm')!;assert.equal(coil.spent,280);assert.equal(ivo.glow,120);assert(validSnapshot(ivo.snapshot()))
const old=new Sim('standard',{...rules,hero:'ivo',watchExperience:undefined},1047);assert.equal(old.keeperWave('storm'),21);assert.equal(old.towerCost('storm'),480)
assert.equal(fresh('mira').keeperWave('bell'),1);assert(fresh().towerStats('cracker',0,0).burn>0)
assert(preparationBeat(rules,4));assert(preparationBeat(rules,40));assert.equal(preparationBeat(rules,5),null);assert.equal(preparationBeat({...rules,watchExperience:undefined},40),null)
const clear={...ivo.sky,weather:'clear' as const},rain={...ivo.sky,weather:'rain' as const},mist={...ivo.sky,weather:'mist' as const},breeze={...ivo.sky,weather:'breeze' as const}
assert.equal(skyDamage('storm',clear),skyDamage('storm',rain));assert.equal(gardenYield(clear),gardenYield(rain));assert.equal(skyReach('storm',clear,false),skyReach('storm',mist,false));assert.equal(skyRate('cracker',clear),skyRate('cracker',breeze));assert.equal(skySpeed(clear),skySpeed(breeze))
assert.notEqual(skySpeed({...clear,night:false}),skySpeed({...clear,night:true}))
console.log('PASS early hero identity, read-only preview, weather simplification and preparation beats')
const pair=fresh();pair.wave=20;pair.glow=10000
const bell=pair.build(0,'bell')!,blast=pair.build(3,'cracker')!,beam=pair.build(6,'beam')!
for(const t of [bell,blast,beam]){t.x=235;t.y=250}
pair.syncBonds();assert(pair.bonds.some(b=>[b.a,b.b].includes(blast.uid)))
pair.bonds[0].readyAt=100;assert(pair.selectBond(bell,beam));assert.equal(pair.bonds[0].readyAt,100)
pair.syncBonds();assert(pair.bonds.some(b=>[b.a,b.b].includes(beam.uid)));assert(!pair.selectBond(bell,beam));assert(!pair.selectBond(bell,bell))
pair.bonds[0].readyAt=0;const crab=pair.spawnEnemy('shell',pair.level.segs.get('w1')!,100,16);crab.x=235;crab.y=250;crab.slowT=1;pair.events=[];pair.damage(crab,3,true,beam)
assert((bell.armourRemoved??0)>0);assert(pair.events.some(e=>e.t==='craft'&&e.kind==='bond'))
const bad=ivo.snapshot();bad.challenge.watchExperience=2 as 1;assert.equal(validSnapshot(bad),false);bad.challenge.watchExperience=1;bad.techniques=['circuit'];assert.equal(validSnapshot(bad),false)
for(const week of [0,1,6]){const w=weeklyWatch(week,true),s=new Sim('standard',{...rules,hero:'sol',weekly:week,variant:w.variant,expedition:w.expedition.id,id:w.id,skirmish:{from:0,to:12,glow:w.glow,seed:w.seed}},w.seed);assert(validSnapshot(s.snapshot()));assert.notEqual(w.id,weeklyWatch(week).id)}
console.log('PASS explicit Bond replacement, cooldown protection, support credit and versioned weekly saves')

const full=fresh('ivo');full.wave=30;full.glow=50000;full.unlockPlot(1);full.unlockPlot(2)
const towers=[full.build(0,'bell')!,full.build(3,'cracker')!,full.build(6,'owl')!,full.build(10,'wick')!,full.build(1,'garden')!,full.build(2,'storm')!]
for(const t of towers){t.x=235;t.y=250}full.syncBonds();assert.equal(full.bonds.length,2)
const retained={...full.bonds[1]};full.bonds[0].readyAt=100
assert.equal(full.selectBond(towers[4],towers[5]),false,'full unrelated slots need an explicit replacement')
assert(full.selectBond(towers[4],towers[5],0));full.syncBonds()
assert(full.bonds.some(b=>b.a===retained.a&&b.b===retained.b));assert.equal(full.bonds.find(b=>[b.a,b.b].includes(towers[4].uid))!.readyAt,100)

const ignite=fresh();ignite.wave=3;ignite.glow=5000;assert(ignite.chooseTechnique('flashpoint'))
const cannon=ignite.build(0,'cracker')!,target=ignite.spawnEnemy('bloat',ignite.level.segs.get('w1')!,100,4)
target.hp=100;target.burnT=3;target.burnDps=5;ignite.damage(target,10,true,cannon)
assert.equal(target.hp,65);assert.equal(target.burnT,0);assert.equal(cannon.signatureHits,1)
const fire=fresh();fire.wave=3;assert(fire.chooseTechnique('long-embers'))
const burning=fire.spawnEnemy('drip',fire.level.segs.get('w1')!,100,4),neighbours=[110,120,130,140].map(at=>fire.spawnEnemy('drip',burning.seg,at,4))
burning.burnT=3;burning.burnDps=8;fire.damage(burning,999,true,null)
assert.deepEqual(neighbours.map(e=>e.burnDps),[6,6,6,0]);assert.equal(fire.stats.firesSpread,3)
const tide=fresh('mira');tide.wave=3;tide.glow=5000;assert(tide.chooseTechnique('tidal-echo'))
const chime=tide.build(0,'bell')!,foe=tide.spawnEnemy('drip',tide.level.segs.get('w1')!,170,4),boss=tide.spawnEnemy('toad',foe.seg,170,4)
chime.x=foe.x;chime.y=foe.y;chime.tolls=2;chime.cd=0;foe.slowT=boss.slowT=2;foe.slowF=boss.slowF=.4
const at=foe.s;tide.step(DT);assert(foe.s<at-38);assert(boss.s>=at);assert.equal(chime.signatureHits,1)
const power=fresh('ivo');power.wave=3;power.glow=5000;assert(power.chooseTechnique('capacitor'))
const storm=power.build(0,'storm')!,conductor=power.spawnEnemy('bloat',power.level.segs.get('w1')!,100,4)
storm.x=conductor.x;storm.y=conductor.y;storm.cd=0;conductor.hp=10000
const hp=conductor.hp;power.step(DT);const ordinary=hp-conductor.hp
storm.cd=0;storm.tolls=2;const charged=conductor.hp;power.step(DT)
assert(Math.abs(charged-conductor.hp-ordinary*3)<1e-6);assert.equal(storm.signatureHits,1)
const freeze=fresh('mira');freeze.wave=39;freeze.glow=5000;assert(freeze.chooseTechnique('deep-freeze'))
const gong=freeze.build(0,'bell')!,matriarch=freeze.spawnEnemy('bloomheart',freeze.level.segs.get('w1')!,100,40)
gong.x=matriarch.x;gong.y=matriarch.y;gong.tolls=2;gong.cd=0;matriarch.phase=1;matriarch.signalT=2
freeze.step(DT);assert.equal(matriarch.phase,2);assert.equal(gong.interrupts,1);assert.equal(matriarch.stunT,0)
console.log('PASS actual signature effects: 2.5x ignition, three wildfire spreads, longer push, triple discharge and credited boss interrupt')
