import assert from 'node:assert/strict'
import {projectProgress} from '../src/game/district-projects'
import {bestWave,type VillageProfile} from '../src/game/fixed-store'
import {watchRecord} from '../src/game/record-view'
import {PlaytestLog} from '../src/game/playtest-log'
const profile=(key:string,wave:number,practice=false)=>({records:{[key]:{wave,light:25,won:wave===24||wave===40,practice}},commissions:[]} as unknown as VillageProfile)
for(const format of ['chapter1','chapter2','endurance1','endurance2'] as const){
 const key=`${format}:0:standard:mira:standard`,p=profile(key,format.startsWith('chapter')?24:40)
 for(const id of ['market','observatory','gardens'] as const)assert.equal(projectProgress(p,id),1,format+' '+id)
 assert.equal(bestWave(p,0,'standard','mira',format),p.records[key].wave)
 assert.deepEqual(JSON.parse(JSON.stringify(p)),p);for(let i=0;i<3;i++)assert.equal(projectProgress(p,'market'),1)
 p.records[key].practice=true;assert.equal(projectProgress(p,'market'),0);assert.equal(bestWave(p,0,'standard',undefined,format),0)
}
assert.equal(projectProgress(profile('chapter2:0:standard:mira:standard',8),'market'),1)
assert.equal(projectProgress(profile('chapter2:0:standard:mira:standard',16),'observatory'),1)
assert.equal(projectProgress(profile('chapter2:0:standard:mira:practice',24),'gardens'),0)
assert.equal(projectProgress(profile('chapter99:0:standard:mira:standard',24),'gardens'),0)
assert.equal(projectProgress(profile('0:standard:mira:standard',40),'gardens'),1)
assert.equal(watchRecord('chapter2:0:standard:mira:standard',0)?.restorationWave,0)
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
const log=new PlaytestLog(storage,()=> 'test');log.start({mission:'first-lights'});assert.equal(JSON.parse(log.export()).sessions.length,0)
log.setEnabled(true);log.start({mission:'first-lights'});log.tick(2);log.record('purchase',{tower:'bell',glow:100});log.flush()
assert.equal(JSON.parse(new PlaytestLog(storage).export()).sessions[0].events[1].at,2)
for(let i=0;i<700;i++)log.record('action',{n:i});assert.equal(JSON.parse(log.export()).sessions[0].events.length,600)
log.clear();assert.equal(JSON.parse(log.export()).sessions.length,0)
console.log('PASS current and historical restoration, milestones, practice exclusion, idempotence and bounded local playtest recording')
