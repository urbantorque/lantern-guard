import assert from 'node:assert/strict'
import { Sim,DT } from '../src/game/sim'
import { HERO_IDS, type HeroId } from '../src/game/heroes'
import { ENEMIES, TOWER_ORDER, type EnemyId } from '../src/game/defs'
import { BESTIARY, bestiaryText } from '../src/game/bestiary'
import { EXPEDITIONS } from '../src/game/watch-depth'
import { TECHNIQUES, techniqueOffers, hasNeighbour, dredgerOpen, DREDGER_BENDS, DREDGER_WINDOW, towerObstacle } from '../src/game/watch-craft'
import { validSnapshot } from '../src/game/save-store'
import { projectProgress, validStyles, districtKeepsakes } from '../src/game/district-projects'
import { loadVillage } from '../src/game/fixed-store'
import { watchInsights, watchLesson } from '../src/game/watch-guidance'
import { drawFixedEnemy } from '../src/render/fixed-enemies'
import { scoreStep } from '../src/core/watch-score'

const fresh=(hero:HeroId='sol')=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,hero,variant:0},1047)
const short=()=>{const e=EXPEDITIONS[0];return new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,hero:'sol',variant:e.variant,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)}
for(const hero of HERO_IDS)for(const first of [0,1])for(const second of [0,1]){
  const s=fresh(hero);assert.equal(techniqueOffers(s).length,0);assert(!s.chooseTechnique(TECHNIQUES[0].id))
  s.wave=5;s.glow=5000;const t=s.build(0,'cracker')!;s.upgrade(t,0)
  const cost=s.glow;const a=techniqueOffers(s)[first];assert(a);assert(s.chooseTechnique(a.id));assert.equal(s.glow,cost)
  assert(!s.chooseTechnique(a.id),'cannot swap or stack a chosen round');assert.equal(techniqueOffers(s).length,0)
  s.wave=15;assert(s.chooseTechnique(techniqueOffers(s)[second].id));assert.equal(s.techniques.length,2)
  for(const id of TOWER_ORDER)for(const branch of [0,1])assert(Object.values(s.towerStats(id,branch?0:3,branch?3:0,1)).every(v=>typeof v==='boolean'||Number.isFinite(v)))
  assert(validSnapshot(s.snapshot()));assert.deepEqual(Sim.restore(s.snapshot()).snapshot(),s.snapshot())
  const bad=structuredClone(s.snapshot());bad.techniques!.reverse();assert.equal(validSnapshot(bad),false,'wrong round rejected')
  bad.techniques=['circuit','forked-current'];if(hero!=='ivo')assert(!validSnapshot(bad),'wrong hero rejected')
  s.startWave();for(let i=0;i<250;i++)s.step(DT);const clone=Sim.restore(s.snapshot())
  for(let i=0;i<400;i++){s.step(DT);clone.step(DT);s.events=[];clone.events=[]}
  assert.deepEqual(s.snapshot(),clone.snapshot(),'techniques survive exact mid-combat replay')
}
const legacy=fresh();delete legacy.challenge.watchCraft;legacy.wave=30;assert.equal(techniqueOffers(legacy).length,0);assert(!legacy.chooseTechnique('afterglow'));assert(validSnapshot(legacy.snapshot()))
console.log('PASS all 12 hero-choice combinations, free immutable selections, strict validation and exact replay; legacy rules preserved')

const exp=short();exp.wave=3;assert.equal(techniqueOffers(exp).length,2);assert(exp.chooseTechnique('dividend'));exp.wave=7;assert.equal(techniqueOffers(exp).length,2)
assert(exp.waveDef(12).groups.some(g=>g.type==='dredger'));delete exp.challenge.watchCraft;assert(!exp.waveDef(12).groups.some(g=>g.type==='dredger'))
const boss=short();boss.wave=12;boss.glow=5000;const attacker=boss.build(0,'wick')!
const seg=boss.level.segs.get('w1')!,bend=DREDGER_BENDS[0],centre=seg.line.length*bend.fraction
const e=boss.spawnEnemy('dredger',seg,0,12);e.shell=0;e.hp=e.maxHp=1000
assert(!dredgerOpen(e));boss.damage(e,10,true,attacker);assert.equal(1000-e.hp,6)
e.s=centre;e.hp=1000;assert(dredgerOpen(e));boss.damage(e,10,true,attacker);assert.equal(1000-e.hp,14)
e.s=centre+DREDGER_WINDOW+.01;assert(!dredgerOpen(e))
for(const b of DREDGER_BENDS){const line=boss.level.segs.get(b.segment)!.line;assert(line.length*b.fraction>DREDGER_WINDOW);assert(line.length*(1-b.fraction)>DREDGER_WINDOW)}
const saved=boss.snapshot();assert(validSnapshot(saved));assert.equal(dredgerOpen(Sim.restore(saved).enemies[0]),dredgerOpen(e))
console.log('PASS Dredger schedule, bounded bend windows, armoured/exposed damage, no invulnerability and exact resume')

const ivo=fresh('ivo');ivo.wave=5;ivo.glow=10000;const bolt=ivo.build(0,'cracker')!;const range=ivo.effRange(bolt)
assert(ivo.chooseTechnique('outrider'));assert.equal(ivo.effRange(bolt),range*1.1)
const neighbour=ivo.pads.findIndex((p,i)=>i!==0&&Math.hypot(p.x-bolt.x,p.y-bolt.y)<=140)
assert(neighbour>=0);ivo.unlockPlot(neighbour);assert(ivo.build(neighbour,'wick'));assert(hasNeighbour(ivo,bolt));assert.equal(ivo.effRange(bolt),range)
assert(towerObstacle(ivo,bolt).includes('4% less damage'))
const preview=fresh();preview.wave=10;preview.glow=5000;preview.build(0,'bell');preview.unlockPlot(3)
const before=preview.snapshot();assert(preview.previewBond(3,'cracker'));assert.deepEqual(preview.snapshot(),before,'Bond preview is read only')
const bare=preview.build(3,'cracker')!;assert(preview.nightRange(bare)<=preview.effRange(bare));assert(preview.bonds.length)
const hint=fresh();hint.build(0,'wick');assert(watchLesson(hint));assert(!watchLesson(hint,['bend']))
hint.stats.leaksBy.shell=6;assert(watchInsights(hint).some(t=>t.includes('6')&&t.includes('light')))
console.log('PASS placement tradeoff, read-only Bond prediction, night reach, contextual guidance and factual report metrics')

for(const night of [false,true]){
  const s=fresh();s.wave=11;s.glow=3000;s.build(0,'garden');s.climate.elapsed=night?60:0
  const base=Sim.restore(s.snapshot());assert(s.chooseTechnique('dividend'));s.startWave();base.startWave()
  for(let i=0;i<60;i++){s.step(DT);base.step(DT)}
  assert(Math.abs(s.towers[0].harvest!/base.towers[0].harvest!-(night?.88:1.18))<1e-10,'dividend integrates only the actual daylight/night work')
  const hit=fresh();hit.wave=5;hit.glow=3000;hit.climate.elapsed=night?60:0;const t=hit.build(0,'wick')!;assert(hit.chooseTechnique('afterglow'))
  const target=hit.spawnEnemy('drip',hit.level.segs.get('w1')!,0,6);target.hp=target.maxHp=100;hit.damage(target,10,true,t)
  assert(Math.abs((100-target.hp)-(night?10.8:9.6))<1e-10)
}
const circuit=fresh('ivo');circuit.wave=5;circuit.glow=5000;const coil=circuit.build(0,'wick')!;circuit.chooseTechnique('circuit')
const cool=(s:Sim)=>{s.towers[0].cd=10;(s as unknown as {updateTowers(dt:number):void}).updateTowers(.1);return 10-s.towers[0].cd}
const unmodified=Sim.restore(circuit.snapshot());unmodified.techniques=[]
assert(Math.abs(cool(circuit)/cool(unmodified)-.95)<1e-10)
const pad=circuit.pads.findIndex((p,i)=>i!==0&&Math.hypot(p.x-coil.x,p.y-coil.y)<=140);circuit.unlockPlot(pad);circuit.build(pad,'wick')
assert(Math.abs(cool(circuit)/cool(unmodified)-1.1)<1e-10)
const echo=fresh('mira');echo.wave=15;echo.chooseTechnique('moon-sight');echo.chooseTechnique('tidal-echo')
for(const branch of [0,1]){const stats=echo.towerStats('bell',branch?0:3,branch?3:0);assert(stats.stunEvery<=4&&stats.stunEvery>0&&stats.stunDur>=.3)}
console.log('PASS time-weighted economy, day/night damage tradeoffs, neighbour-dependent firing and useful stun choices on either Chime branch')

const p=loadVillage();assert.equal(projectProgress(p,'market'),0);p.commissions.push('sunforge');assert.equal(projectProgress(p,'market'),1)
p.records['0:standard:sol:standard']={wave:25,light:10,won:false,practice:false};assert.equal(projectProgress(p,'observatory'),1)
for(const hero of ['sol','mira'])p.records[`expedition:moonwake:depth1:standard:${hero}:standard`]={wave:12,light:20,won:true,practice:false}
assert.equal(projectProgress(p,'gardens'),1);p.districtStyles={market:1};assert(districtKeepsakes(p).includes('project:market:1'))
assert.deepEqual(validStyles({market:2,observatory:1,injected:0}),{observatory:1})
assert.equal(projectProgress({...p,records:{},commissions:[]},'gardens'),0)
console.log('PASS named projects, alternative unlock paths, valid cosmetic choices and no combat power rewards')

// Capture vector commands: every creature must render finite geometry and a unique shape.
function drawing(id:EnemyId,age:number,still:boolean){
  const commands:unknown[]=[];let stack=0
  const c=new Proxy({globalAlpha:1} as Record<string|symbol,unknown>, {get(_t,key){if(key in _t)return _t[key];if(key==='createRadialGradient')return ()=>({addColorStop(){}});return (...args:unknown[])=>{for(const v of args)if(typeof v==='number')assert(Number.isFinite(v),`${id}: ${String(key)}`);if(key==='save')stack++;if(key==='restore')stack--;commands.push([key,...args])}},set(_t,key,v){if(typeof v==='number')assert(Number.isFinite(v));commands.push([key,v]);_t[key]=v;return true}}) as unknown as CanvasRenderingContext2D
  const unit=boss.spawnEnemy(id,seg,centre,12,true);unit.age=age;unit.uid=1;unit.x=100;unit.y=100;unit.tx=1;unit.ty=0
  drawFixedEnemy(c,unit,still,false);assert.equal(stack,0,'canvas state restored');return JSON.stringify(commands)
}
assert.equal(bestiaryText('Veiled armour; Veils and Drips.'),'Veiled armour; Glass Rays and Pebble Pups.')
assert.equal(Object.keys(BESTIARY).length,Object.keys(ENEMIES).length)
const silhouettes=new Set<string>()
for(const id of Object.keys(ENEMIES) as EnemyId[]){silhouettes.add(drawing(id,0,true));assert.equal(drawing(id,0,true),drawing(id,5,true),'reduced motion freezes every anatomy');assert.notEqual(drawing(id,0,false),drawing(id,.21,false),`${id} has its own motion`)}
assert.equal(silhouettes.size,15)
for(let district=0;district<4;district++)for(const night of [false,true])for(let step=0;step<1024;step++){
  const notes=scoreStep(step,{district,night,weather:'clear',hero:'sol',playing:true,boss:true,wave:35,overture:true},1)
  assert(notes.length<=8);for(const n of notes)assert(n.gain<=.15&&n.length<=4)
}
const phrase=(district:number)=>JSON.stringify(Array.from({length:128},(_,i)=>scoreStep(i,{district,night:false,weather:'clear'},.5)))
assert.equal(new Set([0,1,2,3].map(phrase)).size,4)
console.log('PASS fifteen distinct animated anatomies, finite drawing geometry, reduced motion and four bounded soundtrack arrangements')
