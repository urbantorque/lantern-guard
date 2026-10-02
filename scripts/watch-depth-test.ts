import assert from 'node:assert/strict'
import { Sim, DT, type Enemy } from '../src/game/sim'
import { TOWER_ORDER } from '../src/game/defs'
import { validSnapshot } from '../src/game/save-store'
import { fixedWave } from '../src/game/fixed'
import { EXPEDITIONS, depthWave, landmark, nearLandmark, SUN_CAPACITY } from '../src/game/watch-depth'
import { loadVillage, recordWatch } from '../src/game/fixed-store'

const fresh=(variant=0)=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,hero:'sol',variant},1047)
const stocked=(variant=0)=>{const s=fresh(variant);s.wave=30;s.glow=50000;for(let i=0;i<12;i++)if(!s.padAvailable(i))s.unlockPlot(i);return s}

for(let map=0;map<4;map++){
  const s=fresh(map),l=landmark(s)
  assert(l.x>=88&&l.x<=632,'functional landmarks stay inside the phone framing')
  assert(s.pads.some(p=>nearLandmark(s,p)),'at least one build site can use the landmark')
  assert(s.pads.every(p=>Math.hypot(p.x-l.x,p.y-l.y)>=62),'landmarks leave build sites clear')
  const water=Math.min(...[...s.level.segs.values()].map(seg=>seg.line.distanceTo(l.x,l.y)))
  assert(water>=49&&water<l.radius,'landmarks sit beside the path and affect part of it')
  assert.deepEqual(l,landmark(Sim.restore(s.snapshot())),'landmark position survives restore')
}
console.log('PASS four distinct landmarks, safe build clearance and deterministic placement')

const bonds=stocked(),bell=bonds.build(0,'bell')!,blast=bonds.build(3,'cracker')!
assert(bonds.sharedCoverage(bell,blast));assert.equal(bonds.bonds.length,1)
const pair={...bonds.bonds[0]};bonds.syncBonds();assert.deepEqual(bonds.bonds[0],pair)
assert(!bonds.bond(bell,blast));assert(!bonds.unbond(bell),'automatic pairs have no manual reset')
bonds.sell(blast);assert.equal(bonds.bonds.length,0)
const newBlast=bonds.build(3,'cracker')!;assert.equal(bonds.bonds.length,1);assert(bonds.bonds[0].readyAt>=bonds.time+4)
const old=fresh();delete old.challenge.watchDepth;old.wave=5;old.glow=2000;const a=old.build(0,'bell')!,b=old.build(3,'cracker')!;assert.equal(old.bonds.length,0);assert(old.bond(a,b),'old saves retain manual Bonds')
assert(newBlast)
console.log('PASS automatic pairing, selling, bounded slots and no cooldown reset; legacy Bonds preserved')

for(const [support,attacker]of [['bell','beam'],['garden','storm'],['owl','ballista']] as const){
  const s=stocked(),a=s.build(0,support)!,b=s.build(3,attacker)!
  if(!s.sharedCoverage(a,b)){
    const pad=s.pads.findIndex(p=>!p.tower&&s.sharedCoverage(a,{...b,x:p.x,y:p.y}))
    assert(pad>=0);assert(s.relocate(b,pad))
  }
  assert(s.bonds.length===1,`${support}+${attacker} pairs automatically`)
  const seg=s.level.segs.get('w1')!
  let at=0
  for(;at<seg.line.length;at+=2){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});if(Math.hypot(p.x-a.x,p.y-a.y)<s.effRange(a)&&Math.hypot(p.x-b.x,p.y-b.y)<s.effRange(b))break}
  assert(at<seg.line.length)
  const e=s.spawnEnemy('shell',seg,at,s.wave);e.hp=100;e.maxHp=100;e.slowT=2;e.slowF=.2;s.time=5;const armour=e.shell
  s.damage(e,.1,true,b,attacker==='beam');assert.equal(s.bonds[0].activations,1)
  if(attacker==='beam')assert(e.shell<=armour-8,'Moonbeam strips 8 armour')
  if(attacker==='storm')assert.equal(e.slowF,.25,'Wild Current slows')
  if(attacker==='ballista')assert.equal(e.burnDps,6,'Beacon Volley burns')
  s.damage(e,.1,true,b,attacker==='beam');assert.equal(s.bonds[0].activations,1,'combo cooldown prevents stacking')
}
console.log('PASS all three new Bond effects and shared cooldown limits')

const solar=stocked(),owl=solar.build(0,'owl')!
assert(solar.specialise(owl,1));assert.equal(owl.sunlight??0,0)
for(let i=0;i<600;i++)solar.step(DT)
assert.equal(owl.sunlight??0,0,'planning cannot bank sunlight')
const internals=solar as unknown as {updateDepth(dt:number):void}
for(let i=0;i<2400;i++){solar.time+=DT;internals.updateDepth(DT)}
assert.equal(owl.sunlight,SUN_CAPACITY)
solar.climate.elapsed=60;internals.updateDepth(DT)
assert.equal(owl.sunlight,12);assert.equal(owl.sunPulse,4);assert(solar.sunlit(owl))
const snap=solar.snapshot();assert(validSnapshot(snap));const restored=Sim.restore(snap)
assert.deepEqual(restored.snapshot(),snap)
const corrupt=structuredClone(snap);corrupt.towers[0].sunlight=19;assert(!validSnapshot(corrupt))
console.log('PASS sunlight capacity, no idle charging, automatic night pulse and save validation')

const live=stocked();live.build(0,'wick');const scout=live.build(3,'owl')!;live.specialise(scout,1);scout.sunlight=18
live.climate.elapsed=59.9;live.startWave()
for(let i=0;i<60;i++)live.step(DT)
assert(validSnapshot(live.snapshot()));const clone=Sim.restore(live.snapshot())
for(let i=0;i<1000;i++){live.step(DT);clone.step(DT);live.events=[];clone.events=[]}
assert.deepEqual(live.snapshot(),clone.snapshot(),'mid-combat resume preserves Bonds, pulses and enemies')
console.log('PASS exact combat replay through a dusk transition')

for(const id of TOWER_ORDER){
  const s=stocked(),a=s.towerStats(id,3,0,1),b=s.towerStats(id,0,3,1)
  assert.notDeepEqual(a,b,`${id} crowns retain distinct branches`)
  for(const stats of [a,b])assert(Object.values(stats).every(v=>typeof v==='boolean'||Number.isFinite(v)))
}
// A third beam must choose a third target and persist it.
const beams=stocked(),beam=beams.build(0,'beam')!;beams.specialise(beam,1);beams.upgrade(beam,1);beams.refine(beam)
assert.equal(beam.stats.beams,3)
beams.startWave();for(let i=0;i<300;i++)beams.step(DT)
assert(validSnapshot(beams.snapshot()));assert.deepEqual(Sim.restore(beams.snapshot()).snapshot(),beams.snapshot())
const targets=beam.beamTargets.filter(Boolean);assert.equal(new Set(targets).size,targets.length)
console.log('PASS behaviour-changing crowns and distinct multi-beam targets')

for(let wave=1;wave<=40;wave++){
  const base=fixedWave(wave,0,1047),next=depthWave(base,wave,1047)
  assert.deepEqual(depthWave(base,wave,1047),next)
  for(const g of next.groups){assert(g.count>0&&g.gap>0&&g.at>=0);assert(base.groups.some(o=>o.type===g.type),'no premature new enemy roles')}
}
for(const e of EXPEDITIONS){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,hero:'mira',variant:e.variant,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)
  assert(validSnapshot(s.snapshot()));assert.equal(s.finalWave,12)
  assert.equal(s.level.def.sources.find(q=>q.id==='west')!.openWave,6)
  s.wave=8;assert(TOWER_ORDER.every(id=>s.keeperAllowed(id)))
  assert(s.waveDef(12).groups.some(g=>g.type===e.boss));assert(!s.waveDef(5).groups.some(g=>g.src==='west'))
  s.glow=50000;const t=s.build(0,'wick')!;s.specialise(t,0);assert(s.upgrade(t,0));s.wave=9;assert(s.refine(t));assert(validSnapshot(s.snapshot()))
}
console.log('PASS authored encounters and all three compressed expedition progressions')

// Landmarks provide real, bounded combat/economy effects, not just decorative labels.
const well=stocked(),l=landmark(well)
const foe={x:l.x,y:l.y,def:{hidden:true},revealedPerm:false,seenT:0} as Enemy
well.climate.elapsed=60;assert(well.canSee(foe,false));well.climate.elapsed=65;assert(!well.canSee(foe,false))
const terrace=stocked(2),point=landmark(terrace);assert(nearLandmark(terrace,point));assert(!nearLandmark(terrace,{x:-1000,y:-1000}))
console.log('PASS timed Moonwell reveal and bounded landmark areas')

const memory=new Map<string,string>()
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
const profile=loadVillage()
for(const e of EXPEDITIONS){
  const s=fresh(e.variant);s.challenge.expedition=e.id;s.challenge.id=`expedition:${e.id}:depth1`;s.wave=12;s.won=true;s.over='won'
  recordWatch(profile,s);recordWatch(profile,s)
  assert.equal(profile.commissions.filter(id=>id===e.id).length,1,'retries do not duplicate rewards')
  assert(profile.records[`expedition:${e.id}:depth1:standard:sol:standard`].won)
}
assert.deepEqual(loadVillage().commissions,EXPEDITIONS.map(e=>e.id),'all cosmetic rewards persist')
console.log('PASS permanent expedition rewards, per-hero mastery and idempotent completion credit')
