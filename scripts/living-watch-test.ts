import assert from 'node:assert/strict'
import { Sim,DT } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { techniqueOffers } from '../src/game/watch-craft'
import { weeklyWatch,currentWeek,escortCover,earnedMastery } from '../src/game/living-watch'
import { HERO_IDS,type HeroId } from '../src/game/heroes'
import { landmark } from '../src/game/watch-depth'
import { scoreStep } from '../src/core/watch-score'
import { loadVillage, recordWatch } from '../src/game/fixed-store'

const fresh=(hero:HeroId='sol',variant=0)=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,hero,variant},1047)
for(const hero of HERO_IDS)for(const variant of [0,1,2,3])for(const pair of ['00','01','10','11']){
  const s=fresh(hero,variant);s.wave=15;s.glow=5000
  s.chooseTechnique(techniqueOffers(s)[Number(pair[0])].id);s.chooseTechnique(techniqueOffers(s)[Number(pair[1])].id)
  s.build(0,'cracker');s.build(3,'bell');s.build(6,'owl');s.startWave()
  for(let i=0;i<300;i++){s.step(DT);s.events=[]}
  assert(validSnapshot(s.snapshot()),'new watch must save')
  const restored=Sim.restore(s.snapshot())
  for(let i=0;i<300;i++){s.step(DT);restored.step(DT);s.events=[];restored.events=[]}
  assert.deepEqual(s.snapshot(),restored.snapshot(),'all maps and techniques resume exactly')
  for(const seg of s.level.segs.values()){
    if('seg' in seg.next){const next=s.level.segs.get(seg.next.seg)!,a=seg.line.at(seg.line.length,{x:0,y:0,tx:0,ty:0}),b=next.line.at(0,{x:0,y:0,tx:0,ty:0});assert(Math.hypot(a.x-b.x,a.y-b.y)<.01,'connected water')}
  }
  for(const [i,p]of s.pads.entries())assert(Math.min(...[...s.level.segs.values()].map(seg=>seg.line.distanceTo(p.x,p.y)))>=35,`map ${variant} plot ${i} must clear the water`)
}
console.log('PASS 48 map/hero/technique exact replays and connected, buildable geometry')

for(const variant of [0,1,2,3])for(let n=1;n<=40;n++){
  const wave=fresh('sol',variant).waveDef(n),types=wave.groups.map(g=>g.type)
  if(wave.encounter==='Iron escort')assert(types.includes('mender')&&types.some(t=>t==='shell'||t==='vshell'))
  if(wave.encounter==='Runner wake')assert(types.some(t=>t==='shell'||t==='vshell')&&types.some(t=>t==='skitter'||t==='skiff'))
  if(wave.encounter==='Hidden crossing')assert(types.some(t=>t==='veil'||t==='vshell'))
}
console.log('PASS formation forecasts describe enemies that actually arrive')

const cover=fresh();const seg=cover.level.segs.get('w1')!,crab=cover.spawnEnemy('shell',seg,100,12),jelly=cover.spawnEnemy('mender',seg,70,12)
assert.equal(escortCover(cover,jelly),crab);jelly.hp=100;cover.damage(jelly,10,false,null);assert.equal(jelly.hp,93)
cover.damage(jelly,10,true,null);assert.equal(jelly.hp,83);crab.shell=0;assert(!escortCover(cover,jelly))
const snail=cover.spawnEnemy('vshell',seg,105,12);assert.equal(escortCover(cover,jelly),snail)
snail.s=60;assert(!escortCover(cover,jelly),'an escort behind the healer gives no cover')
console.log('PASS directional escort cover, heavy bypass and armour-break counter')

const sol=fresh();sol.wave=15;sol.glow=5000;sol.chooseTechnique('afterglow');sol.chooseTechnique('flashpoint');const cannon=sol.build(0,'cracker')!
const target=sol.spawnEnemy('bloat',sol.level.segs.get('w1')!,100,15);target.hp=100;target.burnT=3;target.burnDps=5
sol.damage(target,10,true,cannon);assert.equal(target.burnT,0);assert(Math.abs(target.hp-80.4)<.001)
const fire=fresh();fire.wave=15;fire.chooseTechnique('dividend');fire.chooseTechnique('long-embers')
const burning=fire.spawnEnemy('drip',fire.level.segs.get('w1')!,100,15),near=fire.spawnEnemy('drip',fire.level.segs.get('w1')!,110,15),far=fire.spawnEnemy('drip',fire.level.segs.get('w1')!,300,15)
burning.burnT=2;burning.burnDps=8;fire.damage(burning,999,true,null);assert.equal(near.burnDps,4);assert.equal(far.burnDps,0)
console.log('PASS Flashpoint consumes burning damage; Wildfire spreads locally at half strength')

const mira=fresh('mira');mira.wave=15;mira.glow=5000;mira.chooseTechnique('stillwater');mira.chooseTechnique('tidal-echo')
const chime=mira.build(0,'bell')!;chime.tolls=3;chime.cd=0
const foe=mira.spawnEnemy('drip',mira.level.segs.get('w1')!,170,15);chime.x=foe.x;chime.y=foe.y;foe.slowT=2;foe.slowF=.4
const at=foe.s;mira.step(DT);assert(foe.s<at-20,'Undertow pushes previously slowed targets')
const freezing=fresh('mira');freezing.wave=15;freezing.chooseTechnique('stillwater');freezing.chooseTechnique('deep-freeze')
assert.equal(freezing.towerStats('bell',0,0).stunEvery,3)
console.log('PASS Still tide and Undertow produce different control behaviours')

const ivo=fresh('ivo');ivo.wave=25;ivo.glow=5000;ivo.chooseTechnique('circuit');ivo.chooseTechnique('capacitor')
const coil=ivo.build(0,'storm')!,conductor=ivo.spawnEnemy('bloat',ivo.level.segs.get('w1')!,100,16)
coil.x=conductor.x;coil.y=conductor.y;coil.tolls=0;coil.cd=0;conductor.hp=10000
const before=conductor.hp;ivo.step(DT);const ordinary=before-conductor.hp
coil.cd=0;coil.tolls=2;const charged=conductor.hp;ivo.step(DT)
assert(Math.abs(charged-conductor.hp-ordinary*2)<1e-6,'third volley doubles only the first hit')
assert.equal(coil.tolls,3)
console.log('PASS Capacitor charges on real volleys and doubles the third opening hit')

const bossWatch=fresh('mira');bossWatch.wave=39;bossWatch.glow=5000;bossWatch.chooseTechnique('stillwater');bossWatch.chooseTechnique('deep-freeze')
const gong=bossWatch.build(0,'bell')!,matriarch=bossWatch.spawnEnemy('bloomheart',bossWatch.level.segs.get('w1')!,100,40)
const companion=bossWatch.spawnEnemy('bloat',matriarch.seg,110,40);companion.hp=10;companion.maxHp=100
gong.x=matriarch.x;gong.y=matriarch.y;gong.cd=0;gong.tolls=2;matriarch.phase=1;matriarch.signalT=2
bossWatch.step(DT);assert.equal(matriarch.phase,2);assert.equal(matriarch.signalT,0);assert.equal(matriarch.stunT,0,'boss is interrupted, not immobilised')
gong.cd=100;for(let i=0;i<150;i++)bossWatch.step(DT);assert.equal(companion.hp,10,'interrupted healing never arrives later')
const brood=fresh();brood.wave=10
const mossjaw=brood.spawnEnemy('toad',brood.level.segs.get('w1')!,100,10);mossjaw.hp=mossjaw.maxHp*.49;mossjaw.spawnCd=100
brood.step(DT);assert.equal(mossjaw.phase,1);assert((mossjaw.signalT??0)>1.9);assert.equal(brood.enemies.length,1)
assert(validSnapshot(brood.snapshot()),'the escort warning must be saveable')
const continued=Sim.restore(brood.snapshot())
for(let i=0;i<125;i++){brood.step(DT);continued.step(DT);brood.events=[];continued.events=[]}
assert.equal(mossjaw.phase,2);assert.equal(brood.enemies.filter(e=>e.def.id==='drip').length,6)
assert.deepEqual(brood.snapshot(),continued.snapshot(),'warning resumes without duplicating escorts')
console.log('PASS boss interrupt, delayed escort and exact warning-state continuation')

const solar=fresh();solar.wave=15;solar.glow=5000;const reserve=solar.build(0,'owl')!;assert(solar.specialise(reserve,1))
solar.won=true;solar.over='won';assert(!earnedMastery(solar).includes('night-keeper'),'ownership alone does not earn sunlight mastery')
solar.won=false;solar.over=null;reserve.sunlight=18;solar.climate.elapsed=60
;(solar as unknown as {updateDepth(dt:number):void}).updateDepth(DT)
assert.equal(reserve.sunUsed,1);assert.equal(reserve.sunPulse,4);assert(validSnapshot(solar.snapshot()))
assert.deepEqual(Sim.restore(solar.snapshot()).snapshot(),solar.snapshot())
solar.won=true;solar.over='won';assert(earnedMastery(solar).includes('night-keeper'))
solar.stats.leaksBy.drip=1;assert(!earnedMastery(solar).includes('clear-water'),'restored health cannot erase a leak')
const broken=solar.snapshot();(broken.towers as unknown[])[0]=null;assert.equal(validSnapshot(broken),false)
console.log('PASS actual sunlight use persists; mastery rejects ownership, healed leaks and malformed towers')

for(let week=0;week<12;week++){
  const w=weeklyWatch(week),s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,weekly:week,hero:'ivo',variant:w.variant,expedition:w.expedition.id,id:w.id,skirmish:{from:0,to:12,glow:w.glow,seed:w.seed}},w.seed)
  assert(validSnapshot(s.snapshot()));s.build(0,'wick');s.startWave();for(let i=0;i<90;i++)s.step(DT)
  assert(validSnapshot(s.snapshot()));assert.deepEqual(Sim.restore(s.snapshot()).snapshot(),s.snapshot())
  const bad=s.snapshot();bad.seed++;assert(!validSnapshot(bad),'weekly seed tampering rejected')
  const plain=fresh();const a=s.spawnEnemy('shell',s.level.segs.get('w1')!,100,1),b=plain.spawnEnemy('shell',plain.level.segs.get('w1')!,100,1)
  if(w.rule.name==='Iron tide')assert.equal(a.shell,b.shell*1.25)
  const runner=s.spawnEnemy('skitter',s.level.segs.get('w1')!,100,1),normal=plain.spawnEnemy('skitter',plain.level.segs.get('w1')!,100,1)
  if(w.rule.name==='Quick current')assert.equal(runner.speedBase,normal.speedBase*1.2)
}
assert.equal(currentWeek(Date.UTC(2026,8,28)),0);assert.equal(currentWeek(Date.UTC(2026,9,5)),1)
const win=fresh();win.won=true;win.over='won';assert(earnedMastery(win).includes('clear-water'));win.challenge.practice=true;assert.equal(earnedMastery(win).length,0)
assert.equal(landmark(fresh('sol',2)).id,'sunterrace')
console.log('PASS weekly seeds, three constraints, archive dates, validation and cosmetic-only mastery')

const storage=new Map<string,string>(),previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}})
try{
  const profile=loadVillage(),week=weeklyWatch(0),complete=fresh()
  Object.assign(complete.challenge,{weekly:0,expedition:week.expedition.id,id:week.id});complete.wave=12;complete.won=true;complete.over='won'
  recordWatch(profile,complete);const once=JSON.stringify(profile);recordWatch(profile,complete)
  assert.equal(JSON.stringify(profile),once,'same completion earns no duplicate progress')
  assert(profile.mastery?.includes('weekly'));assert(!profile.commissions.includes(week.expedition.id),'weekly does not grant the ordinary expedition keepsake')
  assert(profile.records[`${week.id}:standard:sol:standard`]?.won)
  assert.deepEqual(loadVillage().mastery,profile.mastery,'mastery survives a storage reload')
}finally{if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else Reflect.deleteProperty(globalThis,'localStorage')}
console.log('PASS weekly personal bests, separate rewards and idempotent persistent mastery')

for(const hero of HERO_IDS)for(const night of [false,true])for(const outcome of [null,'won','lost'] as const)for(let step=0;step<1024;step++){
  const notes=scoreStep(step,{hero,night,weather:'clear',playing:true,wave:32,boss:true,overture:true,outcome},.85)
  assert(notes.length<=8);assert(notes.every(n=>n.gain<=.15&&n.gain>0&&Number.isFinite(n.midi)))
}
console.log('PASS musical phrases, outcome codas and bounded scheduling')
