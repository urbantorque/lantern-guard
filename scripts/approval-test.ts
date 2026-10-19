import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {siegeChallenge} from '../src/game/siege'
import {watchLesson,watchInsights} from '../src/game/watch-guidance'
import {campaignMilestone,recoveryPlan,threatPlan} from '../src/game/watch-coach'
import {audioLevels,DEFAULT_AUDIO_LEVELS} from '../src/core/audio-levels'
import {profileSound} from '../src/core/audio'
import {advanceWatchFrame} from '../src/game/frame-clock'
import {loadVillage,writeJSON} from '../src/game/fixed-store'

const s=new Sim('standard',siegeChallenge('sol',541),541)
assert.equal(watchLesson(s)?.id,'siege2-place')
assert.equal(watchLesson(s,['coach-disabled']),null)
assert(s.build(0,'wick'));s.wave=1
assert.equal(watchLesson(s)?.id,'siege2-slow')
assert.equal(threatPlan(s,2)?.tower,'bell')
assert.equal(threatPlan(s,3)?.tower,'cracker')
assert.notEqual(threatPlan(s,6)?.tower,'owl','Swarm wisps are not hidden enemies')
s.wave=16
assert.equal(watchLesson(s,['siege2-place','siege2-slow','siege2-armour','siege2-command','siege2-upgrade','siege2-healer'])?.id,'siege2-hidden')
assert.equal(threatPlan(s,17)?.tower,'owl')
s.wave=4;assert.equal(campaignMilestone(s)?.left,1)
s.wave=3;assert(s.startWave());assert.equal(campaignMilestone(s)?.left,2,'Only held waves advance restoration')
s.spawners=[];s.enemies=[];s.wavesPending.clear();s.wave=5;assert.equal(campaignMilestone(s)?.wave,8)
s.wave=40;assert.equal(campaignMilestone(s)?.left,0)
s.lastLeak={enemy:'shell',route:'north',hidden:false,armoured:true,wave:3,light:2}
assert.equal(recoveryPlan(s)?.tower,'cracker')
s.lastLeak={...s.lastLeak,hidden:true,armoured:false,enemy:'veil'}
assert.equal(recoveryPlan(s)?.tower,'owl')
s.lastLeak={...s.lastLeak,enemy:'dredger',wave:16,hidden:false}
assert(recoveryPlan(s)?.text.includes('core'),'Boss retry advice explains its actual vulnerability')
const earlier=new Sim('standard',siegeChallenge('sol'))
const suggestion=recoveryPlan(earlier,s.lastLeak)
assert(suggestion?.plot!==undefined&&earlier.padAvailable(suggestion.plot)&&!earlier.pads[suggestion.plot].tower,'Retry suggestion uses available plots in the restored checkpoint')
s.towers[0].damageDealt=99;assert(watchInsights(s).some(x=>x.includes('Spark')))

const snapshots=[]
for(const hz of [30,60,120,144,165]){
 const run=new Sim('standard',siegeChallenge('sol',411),411);assert(run.build(0,'wick'));assert(run.startWave())
 let remainder=0
 for(let frame=0;frame<hz*3;frame++)remainder=advanceWatchFrame(remainder,1/hz,1.3,()=>run.step(DT),()=>run.waveActive&&!run.over)
 snapshots.push(run.snapshot());assert(remainder<DT)
}
for(const snap of snapshots)assert.deepEqual(snap,snapshots[0],'Real simulation is identical across render rates')
let ticks=0;advanceWatchFrame(0,30,1,()=>ticks++,()=>true);assert.equal(ticks,6,'A stalled render cannot replay thirty seconds of combat')
assert.deepEqual(audioLevels(),DEFAULT_AUDIO_LEVELS)
assert.deepEqual(audioLevels({music:NaN,effects:2,ambience:-3}),{music:.6,effects:1,ambience:0})
assert.equal(profileSound({muted:false,music:true,effects:true},false,{music:.25}).music,.25)
assert.equal(profileSound({muted:false,music:false,effects:true},false,{music:1}).music,0)
const storage=new Map<string,string>()
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},configurable:true})
const profile=loadVillage();profile.audioLevels={music:.25,effects:.9,ambience:0};profile.lessons=['coach-disabled'];writeJSON('profile',profile)
assert.deepEqual(loadVillage().audioLevels,profile.audioLevels);assert(loadVillage().lessons?.includes('coach-disabled'))
delete profile.audioLevels;writeJSON('profile',profile);assert.deepEqual(loadVillage().audioLevels,DEFAULT_AUDIO_LEVELS,'Older profiles retain their settings and gain defaults')
console.log('PASS contextual counters, skippable teaching, true restoration milestones, breach advice, role names, audio preference migration and 30/60/120/144/165 Hz simulation parity')
