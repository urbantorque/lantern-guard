import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {SIEGE_ACTS,SIEGE_ENCOUNTERS,SIEGE_RESTORATION,siegeChallenge,siegeCheckpointWave} from '../src/game/siege'
import {loadVillage,loadWatch,saveWatch,recordWatch,type VillageProfile} from '../src/game/fixed-store'
import {saveActCheckpoint,loadActCheckpoint,retrySiegeAct} from '../src/game/siege-store'
import {validSnapshot,encodeRun} from '../src/game/save-store'
import {projectStage,bestSiegeWave} from '../src/game/district-projects'
import {storyChallenge} from '../src/game/story'
import {campaignReward,campaignUnlock,passagePending,shortCampaign} from '../src/game/watch-director'
import {preparationBeat} from '../src/game/watch-experience'

class MemoryStorage implements Storage {
 data=new Map<string,string>();fail=false
 get length(){return this.data.size} getItem(k:string){return this.data.get(k)??null}
 setItem(k:string,v:string){if(this.fail)throw Error('quota');this.data.set(k,v)}
 removeItem(k:string){this.data.delete(k)} key(n:number){return [...this.data.keys()][n]??null} clear(){this.data.clear()}
}
const storage=new MemoryStorage();Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true})
const fresh=(hero:'sol'|'mira'|'ivo'='mira',seed=27041)=>new Sim('standard',siegeChallenge(hero,seed),seed)
const s=fresh();assert(validSnapshot(s.snapshot()));assert.equal(s.finalWave,40);assert(!shortCampaign(s.challenge));assert.equal(s.level.def.sources.find(q=>q.id==='west')!.openWave,17)
assert.equal(SIEGE_ENCOUNTERS.length,40)
for(const act of SIEGE_ACTS){assert(SIEGE_ENCOUNTERS[act.to-1].groups.some(g=>g.type===act.boss));assert(preparationBeat(s.challenge,act.from));assert(preparationBeat(s.challenge,act.to))}
assert(SIEGE_ENCOUNTERS.slice(0,16).every(w=>w.groups.every(g=>g.src!=='west'&&!['veil','vshell'].includes(g.type))))
assert.equal(campaignUnlock(s.challenge,16),17);assert(campaignReward(s.challenge,32)>campaignReward(s.challenge,8))
assert.equal(s.keeperWave('owl'),12);assert.equal(fresh('ivo').keeperWave('storm'),3)
console.log('PASS forty authored waves, five bosses, rising rewards, gradual unlocks and previewed side entrance')

const old=new Sim('standard',storyChallenge('first-lights'));assert(saveWatch(old,[],'campaign'))
const expedition=new Sim('standard',storyChallenge('copper-procession'));assert(saveWatch(expedition,[],'commission'))
assert(saveWatch(s,[],'siege'));assert(saveActCheckpoint(s,[1,2]))
const opening=s.snapshot();const tower=s.build(0,'wick')!;assert(tower);assert(saveActCheckpoint(s,[9]));assert.deepEqual(loadActCheckpoint(s)!.snapshot,opening,'Buying during preparation cannot overwrite the start')
assert(s.startWave());for(let i=0;i<180;i++)s.step(DT)
const active=s.snapshot();assert(validSnapshot(active));const resumed=Sim.restore(structuredClone(active));assert.deepEqual(resumed.snapshot(),active)
for(let i=0;i<60;i++){s.step(DT);resumed.step(DT)}assert.deepEqual(resumed.snapshot(),s.snapshot())
assert(saveWatch(s,[],'siege'));assert.equal(loadWatch('campaign')!.snapshot.challenge.mission,'first-lights');assert.equal(loadWatch('commission')!.snapshot.challenge.mission,'copper-procession')
console.log('PASS exact live continuation and independent campaign, earlier-mission and expedition saves')

// Isolated state fixtures test checkpoint boundaries; paid progression is covered by siege-balance.
const boundary=fresh();boundary.build(0,'wick');boundary.wave=8;boundary.glow=720;boundary.lives=17
assert(validSnapshot(boundary.snapshot()));assert(saveActCheckpoint(boundary,[3,4]));const atEight=boundary.snapshot()
boundary.build(1,'bell');assert(saveActCheckpoint(boundary));assert.deepEqual(loadActCheckpoint(boundary)!.snapshot,atEight)
assert(boundary.startWave());boundary.over='lost';boundary.lives=0
assert.equal(siegeCheckpointWave(boundary),8)
const retry=retrySiegeAct(boundary)!;assert(retry);assert.equal(retry.sim.wave,8);assert.equal(retry.sim.lives,17);assert.equal(retry.sim.glow,720);assert.deepEqual(retry.blooms,[3,4]);assert.equal(retry.sim.stats.retries,1)
const expected=structuredClone(atEight);expected.stats.retries=1;assert.deepEqual(retry.sim.snapshot(),expected)
assert.equal(loadActCheckpoint(fresh('sol')),null);assert.equal(loadActCheckpoint(fresh('mira',999)),null)
const finalAct=fresh();finalAct.wave=16;assert(passagePending(finalAct));assert(saveActCheckpoint(finalAct));assert(finalAct.choosePassage('convoy'))
assert(saveActCheckpoint(finalAct));assert.equal(loadActCheckpoint(finalAct)!.snapshot.director!.passage,null,'Retry can reconsider the passage without stacking its grant')
finalAct.wave=32;assert(saveActCheckpoint(finalAct));finalAct.startWave();finalAct.over='lost';finalAct.lives=0
assert.equal(retrySiegeAct(finalAct)!.sim.wave,32)
const night=new Sim('nightfall',siegeChallenge());assert(saveActCheckpoint(night));night.startWave();night.over='lost';night.lives=0;assert.equal(retrySiegeAct(night),null)
console.log('PASS immutable act checkpoints, exact budget/tower rewind, passage reconsideration, identity checks and Nightfall full-run loss')

const profile=loadVillage();const recorded=fresh()
for(const wave of [7,8,16,24,32,40]){
 recorded.wave=wave;recorded.won=wave===40;recorded.over=wave===40?'won':null;recordWatch(profile,recorded)
 assert.equal(bestSiegeWave(profile),wave)
 for(const id of ['market','observatory','gardens'] as const)assert.equal(projectStage(profile,id),SIEGE_RESTORATION[id].filter(n=>wave>=n).length)
}
const copy=structuredClone(profile);recordWatch(profile,recorded);assert.deepEqual(profile,copy)
const practice={records:{'siege1:standard:mira:practice':{wave:40,light:25,won:true,practice:true}},commissions:[]} as unknown as VillageProfile
assert.equal(bestSiegeWave(practice),0);assert.equal(projectStage(practice,'gardens'),0)
const earned={...loadVillage(),records:{'story1:first-lights:standard:mira:standard':{wave:6,light:25,won:true,practice:false}}};assert.equal(projectStage(earned,'market'),1)
console.log('PASS in-run restoration at authored milestones, idempotence, practice exclusion and earlier rewards retained')

for(const changes of [{siege:2},{story:1},{variant:2},{endurance:true},{id:'siege2'},{skirmish:{from:8,to:40,glow:440,seed:27041}}]){const snap=fresh().snapshot();Object.assign(snap.challenge,changes);assert(!validSnapshot(snap))}
const boss=fresh();boss.wave=15;assert(boss.startWave());for(let i=0;i<370;i++)boss.step(DT);assert(boss.enemies.some(e=>e.def.id==='dredger'));assert(validSnapshot(boss.snapshot()),'Dredger saves stay valid while the engine is alive')
const before=storage.getItem('lanternlocks.fixed1.siege');storage.fail=true;assert(!saveWatch(fresh(),[],'siege'));storage.fail=false;assert.equal(storage.getItem('lanternlocks.fixed1.siege'),before)
storage.setItem('lanternlocks.fixed1.siege.checkpoints',JSON.stringify({v:1,entries:[encodeRun({...atEight,glow:-1},[])]}));assert.equal(loadActCheckpoint(boundary),null)
console.log('PASS malformed rules, active Dredger saves, storage failure and corrupt-checkpoint rejection')
