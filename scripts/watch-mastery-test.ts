import assert from 'node:assert/strict'
import {Sim,DT,type SaveSnapshotV2} from '../src/game/sim'
import {CONTRACTS,contractStatus,cleanupSpeed,masteryWave,lowerBend,lowerGuard} from '../src/game/watch-mastery'
import {validSnapshot} from '../src/game/save-store'
import {loadVillage,recordWatch,writeJSON} from '../src/game/fixed-store'
import {districtKeepsakes} from '../src/game/district-projects'
import {HERO_IDS} from '../src/game/heroes'
import {contractWatch,runContract,masteryRules} from './mastery-reference'

const arena=()=>{
 const s=contractWatch('small-company','ivo');s.wave=9;s.glow=100000;assert(s.chooseTechnique('capacitor'))
 const tower=s.build(0,'storm')!;assert(tower);tower.tolls=2;tower.cd=0
 s.startWave();s.spawners=[]
 const seg=s.level.segs.get('w1')!,points=[]
 for(let at=0;at<seg.line.length;at+=5){const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});points.push({at,d:Math.hypot(p.x-tower.x,p.y-tower.y)})}
 const at=points.sort((a,b)=>a.d-b.d)[0].at,e=s.spawnEnemy('shell',seg,at,s.wave);e.hp=e.maxHp=10000;e.shell=10000
 return {s,tower,e}
}
const {s,tower,e}=arena();assert(s.bankSurge());assert(!s.bankSurge());assert(!s.releaseSurge());s.step(DT)
assert.equal(s.mastery!.surge!.phase,'held');assert.equal(tower.tolls,2);assert.equal(e.hp,10000);assert.equal(cleanupSpeed(s),1)
for(let i=0;i<40;i++)s.step(DT)
assert.equal(tower.tolls,2,'banking withholds fire');assert(!s.cancelSurge(),'a held volley must be released, not cancelled for free')
assert(s.specialise(tower,1));assert.equal(s.mastery!.surge!.phase,'held','upgrades preserve ownership')
const held=s.snapshot();assert(validSnapshot(held),'banked shot validates');const copy=Sim.restore(structuredClone(held));assert(copy.releaseSurge());assert(s.releaseSurge())
for(let i=0;i<120;i++){s.step(DT);copy.step(DT);s.events=[];copy.events=[]}
assert.deepEqual(copy.snapshot(),s.snapshot(),'held command resumes identically');assert.equal(s.mastery!.commands,1);assert.equal(s.mastery!.surge!.phase,'spent');assert(!s.bankSurge())
s.sell(tower);assert(!s.bankSurge(),'selling a spent tower cannot reset the command')
const cancelling=arena();assert(cancelling.s.bankSurge());assert(cancelling.s.cancelSurge());assert(cancelling.s.bankSurge());cancelling.s.step(DT);cancelling.s.sell(cancelling.tower);assert.equal(cancelling.s.mastery!.surge,null)
const passive=arena();passive.s.step(DT);assert(passive.e.shell<10000-passive.tower.stats.damage*2,'passive Capacitor pierces before crowning');assert.equal(passive.tower.tolls,3)
console.log('PASS bank, hold, release, cancel, upgrade, sale, once-per-wave limit and exact held-shot resume')

const controlled=arena();controlled.s.techniques=[];controlled.tower.stats=controlled.s.towerStats('storm',0,0);controlled.e.slowT=2;controlled.s.damage(controlled.e,10,false,controlled.tower);assert.equal(controlled.e.shell,9995.5)
const unSlowed=arena();unSlowed.s.damage(unSlowed.e,10,false,unSlowed.tower);assert.equal(unSlowed.e.shell,9997.5)
const priorIvo=new Sim('standard',{...masteryRules,watchMastery:undefined,hero:'ivo'},1047);const ivo=new Sim('standard',{...masteryRules,hero:'ivo'},1047);assert.equal(ivo.towerStats('wick',0,0).damage,1);assert.equal(ivo.towerStats('bell',0,0).slow,priorIvo.towerStats('bell',0,0).slow+.04)
for(const corrupt of [
 (q:SaveSnapshotV2)=>{delete q.mastery},
 (q:SaveSnapshotV2)=>{q.mastery!.peakTowers=-1},
 (q:SaveSnapshotV2)=>{q.mastery!.surge!.tower=999999},
 (q:SaveSnapshotV2)=>{q.mastery!.surge!.phase='bogus' as never},
 (q:SaveSnapshotV2)=>{q.towers[0].tolls=1},
 (q:SaveSnapshotV2)=>{q.challenge.contract='last-lantern'},
 (q:SaveSnapshotV2)=>{q.mastery!.bonds={fake:10} as never},
 (q:SaveSnapshotV2)=>{q.challenge.watchMastery=2 as never},
 (q:SaveSnapshotV2)=>{q.challenge.weekly=5},
]){const bad=structuredClone(held);corrupt(bad);assert(!validSnapshot(bad),'reject corrupt command/contract state')}
const legacyRules={...masteryRules};delete legacyRules.watchMastery;const legacy=new Sim('standard',legacyRules,1047);assert(!legacy.mastery);assert(validSnapshot(legacy.snapshot()));assert.deepEqual(Sim.restore(legacy.snapshot()).snapshot(),legacy.snapshot());assert(!legacy.bankSurge())
console.log('PASS Ivo armour/control breakpoints, corrupt-state rejection and legacy rules isolation')

const base={groups:[{type:'drip' as const,count:20,gap:1,at:10}]},quiet=masteryWave(base,14,false),spaced=masteryWave(base,13,false)
assert.equal(base.groups[0].count,20);assert(quiet.groups[0].count<20);assert(quiet.groups[0].gap<1);assert((quiet.clearBonus??0)>0);assert(spaced.groups[0].gap>1);assert.equal(masteryWave(base,40,false),base,'boss stays authored')
const clean=arena();clean.s.mastery!.surge=null;clean.e.def={...clean.e.def,hidden:false,boss:false,split:undefined};clean.e.shell=0;clean.e.hp=1;clean.e.remaining=1000;assert.equal(cleanupSpeed(clean.s),1.6);clean.e.remaining=100;assert.equal(cleanupSpeed(clean.s),1);clean.e.remaining=1000;clean.e.shell=1;assert.equal(cleanupSpeed(clean.s),1)
console.log('PASS lighter-wave pacing, transferred bounties, spaced formations and safe-cleanup guards')

const crowded=contractWatch('small-company');crowded.wave=9;crowded.glow=100000
for(let pad=0;pad<7;pad++){if(!crowded.padAvailable(pad))assert(crowded.unlockPlot(pad));assert(crowded.build(pad,'wick'))}
crowded.sell(crowded.towers[0]);assert.equal(crowded.towers.length,6);assert.equal(crowded.mastery!.peakTowers,7);assert(contractStatus(crowded)?.failed)
const breached=contractWatch('last-lantern');breached.wave=9;breached.glow=100000
for(const [pad,id] of [[5,'owl'],[8,'cracker'],[11,'beam']] as const){if(!breached.padAvailable(pad))assert(breached.unlockPlot(pad));assert(breached.build(pad,id))}
assert.deepEqual(lowerGuard(breached),{damage:2,scouts:1})
assert(breached.startWave());breached.spawners=[];const exit=breached.level.segs.get('e2')!,runner=breached.spawnEnemy('drip',exit,exit.line.length-.001,10);runner.hp=runner.maxHp=100000
for(let i=0;i<3000&&breached.waveActive;i++)breached.step(DT)
assert.equal(breached.mastery!.waveLeaks,1);assert.equal(breached.mastery!.lowerWaves,0);assert(contractStatus(breached)?.failed,'one late leak fails the clean hold even with coverage')
console.log('PASS a seventh paid tower remains counted after sale; an actual final-three-wave leak misses the hold')

class MemoryStorage implements Storage{
 data=new Map<string,string>();get length(){return this.data.size}getItem(k:string){return this.data.get(k)??null}setItem(k:string,v:string){this.data.set(k,v)}removeItem(k:string){this.data.delete(k)}clear(){this.data.clear()}key(n:number){return [...this.data.keys()][n]??null}
}
Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true})
const profile=loadVillage()
for(const c of CONTRACTS)for(const hero of HERO_IDS){
 const run=runContract(contractWatch(c.id,hero));assert(run.won&&contractStatus(run)?.met,`${c.id} ${hero} must be achievable with paid defence`)
 assert(validSnapshot(run.snapshot()));assert.deepEqual(Sim.restore(run.snapshot()).snapshot(),run.snapshot())
 const key=c.id+':'+hero;run.challenge.practice=true;recordWatch(profile,run);assert(!profile.contractRecords?.[key]);run.challenge.practice=false;recordWatch(profile,run);assert.equal(loadVillage().contractRecords?.[key].light,run.lives)
 const earned=JSON.stringify(profile.contractRecords);recordWatch(profile,run);assert.equal(JSON.stringify(profile.contractRecords),earned,'contract record is idempotent')
 if(c.id==='small-company'){run.mastery!.peakTowers=7;assert(!contractStatus(run)?.met,'selling cannot erase peak count')}
 if(c.id==='last-lantern'){run.mastery!.lowerWaves=2;assert(!contractStatus(run)?.met);assert(contractStatus(run)?.failed);assert(Number.isFinite(lowerBend(run).x))}
 if(c.id==='twin-signals'){run.mastery!.bonds['Beacon Volley']=5;assert(!contractStatus(run)?.met)}
}
assert.equal(Object.keys(loadVillage().contractRecords??{}).length,9);assert(CONTRACTS.every(c=>districtKeepsakes(profile).includes('contract:'+c.id)))
writeJSON('profile',{...profile,contractRecords:{...profile.contractRecords,'small-company:sol':{light:999},'unknown:ivo':{light:25}}});assert.equal(Object.keys(loadVillage().contractRecords??{}).length,8)
console.log('PASS 9 paid contract wins, every hero, exact final saves, practice isolation, idempotent records and cosmetic rewards')
