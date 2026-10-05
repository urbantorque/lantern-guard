import assert from 'node:assert/strict'
import {Sim,DT,type Challenge} from '../src/game/sim'
import {validSnapshot} from '../src/game/save-store'
import {commandTower,commandTargets,COMMANDS,routeWave} from '../src/game/watch-director'
import {designatedTarget} from '../src/game/second-watch'
import {techniqueOffers} from '../src/game/watch-craft'
import {stageOf} from '../src/game/fixed'
import {HERO_IDS} from '../src/game/heroes'

export const secondRules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:2,variant:0,hero:'ivo'}
const exact=(s:Sim)=>{const snap=s.snapshot();assert(validSnapshot(snap),'valid snapshot');const r=Sim.restore(structuredClone(snap));assert.deepEqual(r.snapshot(),snap);return r}
for(const variant of [0,1,2,3])for(const id of ['convoy','runners'] as const){
 const s=new Sim('standard',{...secondRules,variant});s.wave=routeWave(s.challenge)
 const initial=s.pads.map(p=>({x:p.x,y:p.y})),length=s.level.segs.get('inlet')!.line.length
 assert(s.choosePassage(id));assert(!s.choosePassage(id));assert.deepEqual(s.pads.slice(0,12).map(p=>({x:p.x,y:p.y})),initial)
 if(id==='convoy'){assert.equal(s.pads.length,13);assert(s.padAvailable(12));const p=s.pads[12];assert(Math.min(...[...s.level.segs.values()].map(seg=>seg.line.distanceTo(p.x,p.y)))>=55,'jetty clears navigable water');assert(s.build(12,'wick'))}
 else {assert(s.level.segs.get('inlet')!.line.length>length+100);assert(s.pads.every(p=>s.level.segs.get('inlet')!.line.distanceTo(p.x,p.y)>=50),'sluice clears existing tower plots')}
 const r=exact(s);assert.deepEqual(r.level.def,s.level.def)
 assert(s.startWave());assert(r.startWave());for(let i=0;i<350;i++){s.step(DT);r.step(DT)}assert.deepEqual(s.snapshot(),r.snapshot())
}
console.log('PASS both permanent constructions on all four maps, original plots retained and exact continuation')

for(const hero of HERO_IDS){
 const s=new Sim('standard',{...secondRules,hero});s.wave=5;s.glow=10000
 assert(s.chooseTechnique(techniqueOffers(s)[1].id))
 s.unlockPlot(1)
 const t=s.build(0,COMMANDS[hero].tower)!,other=s.build(1,COMMANDS[hero].tower)!;assert(t&&other)
 assert(s.designateCommand(t));assert.equal(commandTower(s),t);t.cd=0;t.tolls=2
 assert(s.startWave());s.spawners=[]
 const pos=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.ceil(seg.line.length/10)},(_,i)=>({seg,at:i*10,p:seg.line.at(i*10,{x:0,y:0,tx:0,ty:0})}))).sort((a,b)=>Math.hypot(a.p.x-t.x,a.p.y-t.y)-Math.hypot(b.p.x-t.x,b.p.y-t.y))[0]
 const e=s.spawnEnemy('shell',pos.seg,pos.at,s.wave),e2=s.spawnEnemy('shell',pos.seg,pos.at+5,s.wave)
 for(const enemy of [e,e2]){enemy.hp=enemy.maxHp=10000;enemy.shell=0;enemy.stunT=100;enemy.burnT=8;enemy.burnDps=10}
 assert(s.bankCommand());s.step(DT);assert.equal(s.director!.command!.phase,'held');assert(!s.designateCommand(other));assert(commandTargets(s).length)
 if(hero==='ivo'){assert(s.designateTarget(e2.uid));assert.equal(designatedTarget(s),e2)}
 const copy=exact(s),hp=e2.hp;assert(s.releaseCommand());assert(copy.releaseCommand());assert.deepEqual(copy.snapshot(),s.snapshot())
 if(hero==='ivo')assert(e2.hp<hp)
 const saved=s.snapshot();saved.director!.owner=99999;assert(!validSnapshot(saved))
}
console.log('PASS deliberate tower ownership, target selection, real release effects and saved command identity')

const upgrades=new Sim('standard',secondRules);upgrades.glow=10000
const tower=upgrades.build(0,'wick')!,cost=upgrades.specialiseCost(tower)!,before=upgrades.glow
assert(upgrades.specialise(tower,1));assert.equal(stageOf(tower),2);assert.equal(upgrades.glow,before-cost);assert(!upgrades.upgrade(tower,1))
upgrades.wave=16;upgrades.director!.passage='runners'
assert(upgrades.upgrade(tower,1));assert.equal(stageOf(tower),4);assert(!upgrades.upgrade(tower,1));exact(upgrades)
const range=upgrades.effRange(tower),damage=tower.stats.damage;upgrades.climate.elapsed=65;assert.equal(upgrades.effRange(tower),range);assert.equal(tower.stats.damage,damage)
console.log('PASS three atomic stages, paid costs, crown timing and stable night reach')

for(const type of ['toad','bloomheart'] as const){
 const s=new Sim('standard',{...secondRules,hero:'mira'});s.wave=7;s.glow=10000;s.chooseTechnique(techniqueOffers(s)[0].id)
 assert(s.startWave());s.spawners=[]
 const boss=s.spawnEnemy(type,s.level.segs.get('w1')!,70,s.wave);boss.hp=boss.maxHp*(type==='toad'?.49:.69)
 s.step(DT);assert((boss.signalT??0)>0);assert(boss.channelLink)
 const copy=exact(s),escort=s.enemies.find(e=>e.uid===boss.channelLink)!,other=copy.enemies.find(e=>e.uid===boss.channelLink)!
 escort.hp=other.hp=.001;escort.shell=other.shell=0;escort.burnT=other.burnT=2;escort.burnDps=other.burnDps=100
 s.step(DT);copy.step(DT);assert.equal(boss.signalT,0);assert.equal(boss.channelLink,undefined);assert((boss.exposedT??0)>3.9);assert(boss.stunT>0);assert.deepEqual(s.snapshot(),copy.snapshot());exact(s)
}
console.log('PASS captain teaches the Matriarch tether counter, escort kill staggers and opens the core, exact channel restoration')

const legacy=new Sim('standard',{...secondRules,watchDirector:1});legacy.glow=5000;const t=legacy.build(0,'wick')!;assert(legacy.upgrade(t,0));assert.equal(stageOf(t),1);exact(legacy)
console.log('PASS director 1 retains its historical upgrade rules')
