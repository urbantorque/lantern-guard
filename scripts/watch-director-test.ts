import assert from 'node:assert/strict'
import {Sim,DT,type Challenge,type SaveSnapshotV2} from '../src/game/sim'
import {HERO_IDS,type HeroId} from '../src/game/heroes'
import {EXPEDITIONS} from '../src/game/watch-depth'
import {COMMANDS,MOON_ARCHES,campaignBeat,campaignReward,campaignUnlock,passagePending,commandTargets} from '../src/game/watch-director'
import {techniqueOffers} from '../src/game/watch-craft'
import {validSnapshot} from '../src/game/save-store'
import {cleanupSpeed} from '../src/game/watch-mastery'
import {loadVillage,recordWatch,bestWave} from '../src/game/fixed-store'

const rules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:1,variant:0,hero:'ivo'}
function expedition(hero:HeroId='ivo',id:'sunforge'|'moonwake'|'stormglass'='sunforge'){
  const e=EXPEDITIONS.find(e=>e.id===id)!
  return new Sim('standard',{...rules,hero,expedition:id,id:`expedition:${id}:depth1`,variant:e.variant,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)
}
function arena(hero:HeroId,signature=0){
  const s=expedition(hero);s.wave=3;s.glow=100000;assert(s.chooseTechnique(techniqueOffers(s)[signature].id))
  const t=s.build(0,COMMANDS[hero].tower)!;assert(t);t.cd=0;if(hero==='ivo')t.tolls=2
  assert(s.startWave());s.spawners=[]
  const points=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.floor(seg.line.length/5)},(_,i)=>{const at=i*5,p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});return {seg,at,d:Math.hypot(t.x-p.x,t.y-p.y)}})).sort((a,b)=>a.d-b.d)
  const p=points[0],e=s.spawnEnemy('shell',p.seg,p.at,s.wave);e.hp=e.maxHp=10000;e.shell=e.maxShell=10000;e.burnT=8;e.burnDps=10
  return {s,t,e}
}
for(const hero of HERO_IDS)for(const sig of [0,1]){
  const {s,t,e}=arena(hero,sig);assert(s.bankCommand());assert(!s.bankCommand());assert(!s.releaseCommand());s.step(DT)
  assert.equal(s.director!.command!.phase,'held');assert(commandTargets(s).length);assert.equal(cleanupSpeed(s),1)
  const tolls=t.tolls;for(let i=0;i<10;i++)s.step(DT);assert.equal(t.tolls,tolls,'held tower stops firing')
  const held=s.snapshot();assert(validSnapshot(held),`${hero} held save validates`)
  const copy=Sim.restore(structuredClone(held));assert.deepEqual(copy.snapshot(),held)
  const before=e.hp+e.shell,burn=e.burnT
  assert(s.releaseCommand());assert(copy.releaseCommand());assert.equal(s.director!.commands,1);assert(!s.bankCommand())
  if(hero==='sol'){assert(e.hp+e.shell<before);assert.equal(e.burnT,burn-2,'manual ignition consumes only its two seconds, including Flashpoint')}
  if(hero==='mira'){assert(e.slowT>0);assert(e.stunT>0)}
  if(hero==='ivo')assert(e.hp+e.shell<before)
  for(let i=0;i<120;i++){s.step(DT);copy.step(DT);s.events=[];copy.events=[]}
  assert.deepEqual(copy.snapshot(),s.snapshot(),`${hero} / ${sig} exact continuation`)
  for(const corrupt of [
    (q:SaveSnapshotV2)=>{delete q.director},
    (q:SaveSnapshotV2)=>{q.director!.command!.tower=999999},
    (q:SaveSnapshotV2)=>{q.director!.command!.phase='bad' as never},
    (q:SaveSnapshotV2)=>{q.director!.command!.wave=3},
    (q:SaveSnapshotV2)=>{q.director!.commands=-1},
    (q:SaveSnapshotV2)=>{q.director!.passage='runners'},
    (q:SaveSnapshotV2)=>{q.challenge.watchDirector=3 as never},
  ]){const bad=structuredClone(held);corrupt(bad);assert(!validSnapshot(bad),`${hero} malformed state rejected`)}
}
const sold=arena('ivo');assert(sold.s.bankCommand());sold.s.step(DT);sold.s.sell(sold.t);assert.equal(sold.s.director!.command!.phase,'spent');assert(!sold.s.bankCommand());assert(validSnapshot(sold.s.snapshot()))
const discarded=arena('mira');assert(discarded.s.bankCommand());assert(discarded.s.cancelCommand());assert(discarded.s.bankCommand());discarded.s.step(DT);assert(discarded.s.cancelCommand());assert.equal(discarded.s.director!.command!.phase,'spent')
const interrupt=arena('mira'),boss=interrupt.s.spawnEnemy('toad',interrupt.e.seg,interrupt.e.s,4);boss.signalT=1;boss.phase=1;boss.hp=boss.maxHp=10000;assert(interrupt.s.bankCommand());interrupt.s.step(DT);assert(interrupt.s.releaseCommand());assert.equal(boss.signalT,0);assert.equal(boss.exposedT,4);assert.equal(interrupt.t.interrupts,1)
console.log('PASS all six signature commands, actual effects, once-per-wave ownership, discard/sale, exact held-command saves, boss interruption and corrupt state rejection')

for(const id of ['sunforge','moonwake','stormglass'] as const)for(const passage of ['convoy','runners'] as const){
  const s=expedition('ivo',id);s.wave=6
  assert(passagePending(s));assert(!s.startWave());const before=s.glow;assert(s.choosePassage(passage));assert(!s.choosePassage(passage));assert.equal(s.glow,before+(passage==='convoy'?180:0))
  assert(validSnapshot(s.snapshot()));const copy=Sim.restore(s.snapshot());assert.deepEqual(copy.waveDef(7),s.waveDef(7))
  const base=expedition('ivo',id)
  for(const n of [7,8,9])assert(s.waveDef(n).groups.length>base.waveDef(n).groups.length)
  assert.deepEqual(s.waveDef(10),base.waveDef(10),'passage lasts exactly three waves')
  assert(s.startWave());assert(copy.startWave());for(let i=0;i<300;i++){s.step(DT);copy.step(DT)}
  assert(validSnapshot(s.snapshot()));assert.deepEqual(copy.snapshot(),s.snapshot(),'passage mid-wave continuation')
}
const moon=expedition('mira','moonwake');moon.wave=3;assert(moon.startWave());moon.spawners=[]
for(const arch of MOON_ARCHES){const seg=moon.level.segs.get(arch.seg)!,e=moon.spawnEnemy('veil',seg,seg.line.length*arch.fraction-.05,4);moon.step(DT);assert(e.seenT>5.9,'moon gate reveals the actual crossing')}
console.log('PASS both passages on every expedition, reward idempotence, three-wave scope, exact mid-wave saves and six-second moon gates')

const chapter=new Sim('standard',rules,1047),old=new Sim('standard',{...rules,watchDirector:undefined},1047),endurance=new Sim('standard',{...rules,endurance:true},1047)
assert.equal(chapter.finalWave,24);assert.equal(old.finalWave,40);assert.equal(endurance.finalWave,40)
assert.equal(campaignUnlock(rules,11),9);assert.equal(campaignUnlock(rules,31),20);assert.equal(campaignBeat(rules,24),40)
assert.equal(Array.from({length:24},(_,i)=>campaignReward(rules,i+1)).reduce((a,b)=>a+b),Array.from({length:40},(_,i)=>125+(i+1)*15).reduce((a,b)=>a+b),'removed waves keep their clear income')
chapter.wave=4;assert(chapter.chooseTechnique(techniqueOffers(chapter)[0].id));chapter.wave=12;assert.equal(techniqueOffers(chapter).length,0,'no secondary percentage choice')
assert(!old.director);assert(validSnapshot(old.snapshot()));assert.deepEqual(Sim.restore(old.snapshot()).snapshot(),old.snapshot())
const reed=expedition('ivo','stormglass'),legacyReed=new Sim('standard',{...rules,watchDirector:undefined,variant:1},1047)
assert.notDeepEqual(reed.level.def.pads,legacyReed.level.def.pads)
const island=reed.pads[4],seg=reed.level.segs.get('w1')!,inside:number[]=[]
for(let at=0;at<seg.line.length;at+=5){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});if(Math.hypot(p.x-island.x,p.y-island.y)<165)inside.push(at)}
assert(inside.some((v,i)=>i>0&&v-inside[i-1]>40),'central island has separated firing passes')
console.log('PASS 24-wave pacing, retained income, remapped unlocks, 40-wave endurance, legacy isolation and double-pass geometry')

class MemoryStorage implements Storage{data=new Map<string,string>();get length(){return this.data.size}getItem(k:string){return this.data.get(k)??null}setItem(k:string,v:string){this.data.set(k,v)}removeItem(k:string){this.data.delete(k)}clear(){this.data.clear()}key(n:number){return [...this.data.keys()][n]??null}}
Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true})
const p=loadVillage();chapter.wave=24;chapter.over='won';chapter.won=true;recordWatch(p,chapter);assert.equal(bestWave(p,0,'standard','ivo','chapter1'),24);assert.equal(bestWave(p,0,'standard','ivo'),0)
old.stats.cheered.drip=3;const oldId=`${old.seed}:0:standard:campaign:ivo`;p.credits[oldId]={wave:0,journal:{drip:3}};p.journal.drip=3;recordWatch(p,old);assert.equal(p.journal.drip,3,'existing credit identifiers remain idempotent')
console.log('PASS separate format records and historical credit idempotence')
