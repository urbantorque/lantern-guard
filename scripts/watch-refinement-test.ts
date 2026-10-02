import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {validSnapshot} from '../src/game/save-store'
import {HERO_IDS,type HeroId} from '../src/game/heroes'
import {techniqueOffers} from '../src/game/watch-craft'
import {restorationLimit,HERO_BUILDS,lateRewardScale} from '../src/game/watch-refinement'
import {watchLesson} from '../src/game/watch-guidance'
import {upgradePrice} from '../src/game/fixed'
import {FrameBudget} from '../src/render/frame-budget'
import {scoreStep} from '../src/core/watch-score'

const fresh=(hero:HeroId='sol',variant=0)=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,hero,variant},1047)
for(const hero of HERO_IDS)for(const variant of [0,1,2,3])for(const build of HERO_BUILDS[hero]){
  const s=fresh(hero,variant);s.wave=15;s.glow=10000
  for(const pick of build.pair)s.chooseTechnique(techniqueOffers(s)[Number(pick)].id)
  const t=s.build(0,'cracker')!;assert(s.specialise(t,build.branches.cracker??0));s.build(3,'bell');s.build(6,'owl')
  s.startWave();for(let i=0;i<240;i++)s.step(DT)
  assert(validSnapshot(s.snapshot()));const resumed=Sim.restore(s.snapshot())
  for(let i=0;i<240;i++){s.step(DT);resumed.step(DT);s.events=[];resumed.events=[]}
  assert.deepEqual(resumed.snapshot(),s.snapshot())
}
console.log('PASS 24 refined hero/build/map exact replays')

const price=fresh();price.wave=15;price.glow=10000;const tower=price.build(0,'wick')!
assert.equal(price.fixedPrice(tower),upgradePrice(tower),'opening cost unchanged')
assert(price.specialise(tower,0));assert.equal(price.fixedPrice(tower),Math.round(upgradePrice(tower)!*1.12))
const cash=price.glow,cost=price.fixedPrice(tower)!;assert(price.upgrade(tower,0));assert.equal(cash-price.glow,cost)
const legacy=fresh();delete legacy.challenge.refinedWatch;legacy.glow=10000;const old=legacy.build(0,'wick')!;legacy.specialise(old,0)
assert.equal(legacy.fixedPrice(old),upgradePrice(old),'published rules retain their cost')
assert.equal(lateRewardScale(15,false),1);assert.equal(lateRewardScale(40,false),.88);assert.equal(lateRewardScale(40,true),1)

// Resolve empty fixture waves with measured Garden healing. Neither selling nor
// reloading can replenish the watch-wide restoration budget.
const garden=fresh();garden.wave=20;garden.glow=10000;garden.lives=10
const g=garden.build(0,'garden')!;garden.climate.waveSeconds=1;g.healing=4
const clear=(s:Sim,n:number)=>{s.wavesPending.add(n);s.waveAlive.set(n,0);(s as unknown as {checkWaves():void}).checkWaves()}
clear(garden,1);assert.equal(garden.stats.lightRestored,4);assert.equal(garden.lives,14)
const saved=Sim.restore(garden.snapshot());clear(saved,2);assert.equal(saved.stats.lightRestored,6);assert.equal(saved.lives,16)
saved.sell(saved.towers[0]);const replacement=saved.build(0,'garden')!;replacement.healing=10
clear(saved,3);assert.equal(saved.lives,16);assert.equal(saved.stats.lightRestored,6)
const full=fresh();full.wave=20;full.glow=10000;full.climate.waveSeconds=1;full.build(0,'garden')!.healing=4
clear(full,1);assert.equal(full.stats.lightRestored,0,'full health spends no restoration')
const corrupt=full.snapshot();corrupt.stats.lightRestored=7;assert.equal(validSnapshot(corrupt),false);corrupt.stats.lightRestored=0;corrupt.challenge.weekly=0;assert.equal(validSnapshot(corrupt),false)
assert.equal(restorationLimit('relaxed'),12);assert.equal(restorationLimit('nightfall'),3)
console.log('PASS paid prices, legacy economy and persistent shared healing limits')

for(const variant of [0,1,2,3]){
  const s=fresh('sol',variant),procession=s.waveDef(18),shell=procession.groups.find(g=>g.type==='shell'||g.type==='vshell')!,jelly=procession.groups.find(g=>g.type==='mender')!
  assert(shell&&jelly);assert.equal(shell.at,0);assert.equal(jelly.at,2);assert.equal(shell.src,jelly.src)
  const wake=s.waveDef(23);assert(wake.groups.some(g=>g.at===0));assert(wake.groups.some(g=>g.at>=6))
  assert(s.waveDef(28).groups.every(g=>g.at===0||g.at===8))
  for(const n of [19,24,29,36]){const previous=fresh('sol',variant);delete previous.challenge.refinedWatch;assert(s.waveDef(n).groups.reduce((a,g)=>a+g.count,0)<previous.waveDef(n).groups.reduce((a,g)=>a+g.count,0),JSON.stringify({variant,n,groups:s.waveDef(n).groups,old:previous.waveDef(n).groups}))}
}
const intro=fresh();assert.equal(watchLesson(intro)?.id,'refined-place');intro.build(0,'wick');assert.equal(watchLesson(intro)?.id,'refined-flow')
intro.spawnEnemy('veil',intro.level.segs.get('w1')!,100,1);assert.equal(watchLesson(intro)?.id,'refined-hidden','live threats outrank opening tips')
assert.notEqual(watchLesson(intro,['refined-hidden'])?.id,'refined-hidden')
console.log('PASS authored formations, recovery waves and contextual lesson order')

const fire=fresh();fire.wave=15;fire.chooseTechnique('dividend');fire.chooseTechnique('long-embers')
const ember=fire.spawnEnemy('drip',fire.level.segs.get('w1')!,100,15),near=fire.spawnEnemy('drip',ember.seg,110,15)
ember.burnT=2;ember.burnDps=8;fire.events=[];fire.damage(ember,999,true,null)
assert.equal(near.burnDps,4);assert(fire.events.some(e=>e.t==='tactic'&&e.kind==='spread'&&e.tx===near.x))
const solar=fresh();solar.wave=15;solar.glow=10000;const scout=solar.build(0,'owl')!;solar.specialise(scout,1);scout.sunlight=18;solar.climate.elapsed=60;solar.events=[]
;(solar as unknown as {updateDepth(dt:number):void}).updateDepth(DT)
assert(solar.events.some(e=>e.t==='tactic'&&e.kind==='sun'));assert(!solar.events.some(e=>e.t==='phase'))
const ivo=fresh('ivo');ivo.wave=25;ivo.glow=10000;ivo.chooseTechnique('circuit');ivo.chooseTechnique('capacitor')
const coil=ivo.build(0,'storm')!,foe=ivo.spawnEnemy('bloat',ivo.level.segs.get('w1')!,100,16)
coil.x=foe.x;coil.y=foe.y;coil.tolls=2;coil.cd=0;foe.hp=10000;ivo.events=[];ivo.step(DT)
assert(ivo.events.some(e=>e.t==='tactic'&&e.kind==='charged'))
console.log('PASS fire spread, sunlight and third-volley combat cues')

const budget=new FrameBudget();for(let i=0;i<119;i++)assert(!budget.observe(30,true));assert(budget.observe(30,true));assert.equal(budget.cap,1.25)
for(let i=0;i<1200;i++)assert(!budget.observe(5,true));assert(budget.observe(5,true));assert.equal(budget.cap,1.6)
for(const n of [NaN,Infinity,-1])assert(!budget.observe(n,true));assert(!budget.observe(100,false))
for(const hero of HERO_IDS)for(const night of [true,false])for(let step=0;step<1024;step++){
  const notes=scoreStep(step,{hero,night,weather:'rain',playing:true,wave:35,boss:true,overture:true},.6)
  assert(notes.length<=8);assert(notes.every(n=>n.gain>0&&n.gain<=.15&&Number.isFinite(n.midi)))
}
console.log('PASS render-quality hysteresis and bounded full-score scheduling')
