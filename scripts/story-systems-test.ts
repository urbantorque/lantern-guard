import assert from 'node:assert/strict'
import {MISSIONS,storyChallenge,missionOpen,missionWon} from '../src/game/story'
import {projectStage,PROJECTS,districtKeepsakes} from '../src/game/district-projects'
import {Sim} from '../src/game/sim'
import {placementReadout} from '../src/game/placement'
import type {VillageProfile} from '../src/game/fixed-store'
const p={records:{},commissions:[],contractRecords:{},mastery:[]} as unknown as VillageProfile
assert.deepEqual(PROJECTS.map(q=>projectStage(p,q.id)),[0,0,0])
for(const [i,m] of MISSIONS.entries()){
 assert(missionOpen(p,m.id));if(i+1<MISSIONS.length)assert(!missionOpen(p,MISSIONS[i+1].id))
 p.records[`story1:${m.id}:standard:mira:standard`]={wave:m.waves.length,light:1,won:true,practice:false}
 assert(missionWon(p,m.id))
 if(i===0)assert.equal(projectStage(p,'market'),1)
 if(i===1)assert.equal(projectStage(p,'market'),2)
 if(i===4)assert.equal(projectStage(p,'market'),3)
 for(const g of m.waves.flatMap((w,n)=>w.groups.map(g=>({...g,wave:n+1}))))assert(g.src!=='west'||g.wave>=m.inlet,`${m.id} closed inlet spawn`)
}
assert.deepEqual(PROJECTS.map(q=>projectStage(p,q.id)),[3,3,3]);assert.equal(districtKeepsakes(p).filter(k=>k.startsWith('stage:')).length,3)
for(const r of Object.values(p.records))r.practice=true
assert.deepEqual(PROJECTS.map(q=>projectStage(p,q.id)),[0,0,0])
const s=new Sim('standard',storyChallenge('first-lights')),before=s.snapshot(),t=s.previewTower(0,'wick')!,a=placementReadout(s,t)
assert(a.zones.some(z=>z.percent>0));assert(!a.zones.some(z=>z.id==='side'));assert.deepEqual(s.snapshot(),before,'Preview is read only')
const late=new Sim('standard',storyChallenge('restore-waterway'));late.wave=4
assert(late.choosePassage('runners'));const ghost=late.previewTower(0,'wick')!,b=placementReadout(late,ghost)
assert(b.zones.some(z=>z.id==='side'));assert.equal(late.level.def.sources.find(q=>q.id==='west')!.openWave,5)
console.log('PASS sequential campaign, three restoration stages, practice exclusion, no premature side spawns, real placement geometry and fixed passage timings')
