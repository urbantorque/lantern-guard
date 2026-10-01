import assert from 'node:assert/strict'
import { Sim,DT,type Tower,type Proj } from '../src/game/sim'
import { TOWER_ORDER } from '../src/game/defs'
import { HERO_IDS } from '../src/game/heroes'
import { validSnapshot } from '../src/game/save-store'
import { contactTime } from '../src/game/projectile-collision'
import { waveCountdown,WATCH_TEMPO,WAVE_BREATH } from '../src/game/watch-tempo'
import { upgradeBenefits } from '../src/game/fixed-copy'

const fresh=()=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:0},1047)
for(const hero of HERO_IDS)for(const id of TOWER_ORDER)for(const branch of [0,1]as const){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:0,hero},1047)
  s.wave=30;s.glow=50000;const t=s.build(0,id)!,cost=s.specialiseCost(t)!,before=s.glow
  s.startWave();const wave=s.wave,time=s.time
  assert(s.specialise(t,branch),`${hero} ${id} can specialise in combat`)
  assert.equal(s.events.filter(e=>e.t==='upgrade').length,1,'a bundled purchase has one upgrade cue')
  assert.equal(s.glow,before-cost);assert.equal(t.a,branch===0?2:0);assert.equal(t.b,branch===1?2:0)
  assert.equal(s.time,time);assert.equal(s.wave,wave);assert(s.waveActive)
  assert.equal(s.upgradeCost(t,branch===0?1:0),null,'the competing stream locks')
  assert(!s.specialise(t,branch));assert(s.upgrade(t,branch));assert(s.refine(t))
  assert(s.build(3,'wick'));assert(s.canRelocate(t));assert(!s.refine(t))
  assert(validSnapshot(s.snapshot()))
  const restored=Sim.restore(s.snapshot())
  for(let i=0;i<100;i++){s.step(DT);restored.step(DT);s.events=[];restored.events=[]}
  assert.deepEqual(s.snapshot(),restored.snapshot(),'live purchases resume exactly')
}
const poor=fresh(),t=poor.build(0,'wick')!;poor.glow=poor.specialiseCost(t)!-1
const before=poor.snapshot();assert(!poor.specialise(t,1));assert.deepEqual(poor.snapshot(),before,'a rejected bundle spends nothing')
assert(poor.upgrade(t,0));const improvedCost=poor.specialiseCost(t)!
poor.glow=improvedCost;assert(poor.specialise(t,1));assert.equal(poor.glow,0,'an improved tower only pays the remaining stage')
assert.equal(poor.upgradeCost(t,1),null,'mastery still waits until wave 16')
console.log('PASS 48 live specialisation/mastery/crown paths, live building, atomic costs, unlock gates and exact saves')

assert(WATCH_TEMPO>1&&WATCH_TEMPO<1.5)
assert.equal(waveCountdown(null,.1,false,false,false,false),null,'first placement has no deadline')
assert.equal(waveCountdown(null,.1,true,false,false,false),WAVE_BREATH-.1)
assert.equal(waveCountdown(2,10,true,false,true,false),2,'background time never consumes the countdown')
assert.equal(waveCountdown(2,10,true,false,false,false),0,'waves advance without a transport control')
assert.equal(waveCountdown(2,.1,true,true,false,false),null)
assert.equal(waveCountdown(2,.1,true,false,false,true),null)
const live=fresh();live.glow=10000;live.wave=15
const farm=live.build(0,'garden')!,gunLive=live.build(3,'wick')!
live.startWave();for(let i=0;i<120;i++)live.step(DT)
const worked=farm.harvest!;assert(worked>0)
const late=live.build(6,'garden')!;assert.equal(late.harvest,0,'new farms do not inherit elapsed-wave income')
const originalIncome=farm.stats.income
assert(live.specialise(farm,0));assert.equal(farm.harvest,worked,'a live upgrade cannot rewrite earned harvest')
live.step(DT);assert(farm.harvest!>worked);assert(late.harvest!<farm.harvest!)
assert(upgradeBenefits(live,gunLive,0,true).includes(`Damage ${gunLive.stats.damage} → ${live.towerStats('wick',2,0).damage}`),'bundle preview includes foundation and specialisation')
const saved=live.snapshot();assert(validSnapshot(saved));assert.deepEqual(Sim.restore(saved).snapshot(),saved)
const invalid=structuredClone(saved);invalid.towers[0].harvest=-1;assert(!validSnapshot(invalid))
const oldSave=structuredClone(saved);for(const t of oldSave.towers){delete t.harvest;delete t.healing}
assert(validSnapshot(oldSave));assert(Sim.restore(oldSave).towers[0].harvest!>0,'old live saves migrate conservatively')
assert(live.unlockPlot(1),'plots unlock during combat');assert(live.relocate(gunLive,1))
const glow=live.glow;live.sell(gunLive);assert(live.glow>glow,'selling remains available in combat')
assert(originalIncome<farm.stats.income)
const bonded=fresh();bonded.wave=5;bonded.glow=10000
const chime=bonded.build(0,'bell')!,blast=bonded.build(3,'cracker')!
bonded.startWave();assert(bonded.bond(chime,blast));assert.equal(bonded.bonds[0].readyAt,bonded.time+4)
assert(bonded.unbond(chime));bonded.step(DT);assert(bonded.bond(chime,blast));assert.equal(bonded.bonds[0].readyAt,bonded.time+4,'re-linking cannot bypass the combat cooldown')
const shortHarvest=fresh();shortHarvest.wave=10;shortHarvest.glow=10000
shortHarvest.startWave();for(let i=0;i<120;i++)shortHarvest.step(DT)
const lastMoment=shortHarvest.build(0,'garden')!
shortHarvest.spawners=[];shortHarvest.enemies=[];shortHarvest.waveAlive.set(shortHarvest.wave,0)
shortHarvest.step(DT);assert.equal(lastMoment.earned,0,'a last-moment build cannot collect a full-wave payout')
console.log('PASS one-tempo countdown, hidden-tab protection, live purchases, weighted harvest, legacy save migration and exact bundle copy')

assert.equal(contactTime(0,0,100,0,50,0,10),.4)
assert.equal(contactTime(0,0,100,0,50,20,10),null)
assert.equal(contactTime(50,0,50,0,50,0,10),0)
const shots=fresh(),gun=shots.build(0,'wick')!
const a=shots.spawnEnemy('drip',shots.level.segs.get('w1')!,0,1),b=shots.spawnEnemy('drip',shots.level.segs.get('w1')!,0,1)
a.x=160;a.y=200;a.hp=a.maxHp=100;b.x=240;b.y=200;b.hp=b.maxHp=100
shots.enemies=[b,a]
const internals=shots as unknown as {buildGrid():void;updateProjs(dt:number):void;makeProj(t:Tower,kind:'spark'|'bolt',angle:number,target:typeof a|null,range:number):Proj}
internals.buildGrid()
const shot=(pierce:number)=>{const p=internals.makeProj(gun,'spark',0,null,400);p.x=100;p.y=200;p.vx=10000;p.vy=0;p.speed=10000;p.pierce=pierce;p.life=2;return p}
const single=shot(1);shots.projs=[single];internals.updateProjs(.02)
assert(!single.alive,'base spark ends on contact');assert.deepEqual(single.hit,[a.uid]);assert.equal(b.hp,100)
const piercing=shot(3);shots.projs=[piercing];internals.updateProjs(.02)
assert.deepEqual(piercing.hit,[a.uid,b.uid],'piercing hits occur in travel order, not grid order')
const hitHp=a.hp;piercing.vx=-10000;internals.updateProjs(.02);assert.equal(a.hp,hitHp,'piercing never damages the same enemy twice')
const bolt=internals.makeProj(gun,'bolt',0,a,400);bolt.x=210;bolt.y=200;bolt.hit=[a.uid];shots.projs=[bolt]
internals.updateProjs(DT);assert.equal(bolt.target,null);assert(bolt.vx>0,'a pierced bolt cannot curl back into its first target')
console.log('PASS swept high-speed contact, single-hit removal, ordered piercing and no return-to-hit-target loop')
