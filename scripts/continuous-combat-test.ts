import assert from 'node:assert/strict'
import { Sim,DT,type Tower,type Proj } from '../src/game/sim'
import { TOWER_ORDER } from '../src/game/defs'
import { HERO_IDS } from '../src/game/heroes'
import { validSnapshot } from '../src/game/save-store'
import { contactTime } from '../src/game/projectile-collision'

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
  assert(!s.build(3,'wick'));assert(!s.canRelocate(t));assert(!s.refine(t))
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
console.log('PASS 48 live specialisation/mastery/crown paths, atomic costs, lockouts, planning gates and exact saves')

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
