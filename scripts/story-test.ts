import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {MISSIONS,storyChallenge,missionOpen,missionWon,storyLesson} from '../src/game/story'
import {validSnapshot} from '../src/game/save-store'
import {commandTargets} from '../src/game/watch-director'
import type {VillageProfile} from '../src/game/fixed-store'
import type {TowerId} from '../src/game/defs'
import {mkdirSync,writeFileSync} from 'node:fs'
const m=MISSIONS[0],s=new Sim('standard',storyChallenge(m.id));assert(validSnapshot(s.snapshot()));assert(storyLesson(s));assert(!s.keeperAllowed('bell'));assert(!s.bankCommand());assert.equal(s.finalWave,6)
const plan=()=>{
 for(const [pad,id] of [[0,'wick'],[3,'bell'],[1,'wick'],[6,'wick'],[7,'bell']] as [number,TowerId][]){if(s.pads[pad].tower||!s.keeperAllowed(id)||!s.padRevealed(pad))continue;if(s.towerCost(id)+(s.plotCost(pad)??0)>s.glow)continue;if(!s.padAvailable(pad))s.unlockPlot(pad);s.build(pad,id)}
 for(const t of s.towers){const path=t.id==='wick'?1:0;s.upgrade(t,path)}
}
mkdirSync('artifacts/story',{recursive:true})
while(!s.over){plan();assert(validSnapshot(s.snapshot()),'planning wave '+s.wave);writeFileSync(`artifacts/story/first-lights-${s.wave}.json`,JSON.stringify(s.snapshot()));assert(s.startWave());let tick=0
 while(s.waveActive&&!s.over&&tick++<20000){if(s.wave>=4){if(!s.director!.command)s.bankCommand();else if(s.director!.command.phase==='held'&&commandTargets(s).length>=1)s.releaseCommand()}s.step(DT);s.events=[];if(tick%360===0)plan();if(tick===300){const saved=s.snapshot();assert(validSnapshot(saved),'active');const r=Sim.restore(structuredClone(saved));assert.deepEqual(r.snapshot(),saved);for(let k=0;k<60;k++){s.step(DT);r.step(DT)}assert.deepEqual(s.snapshot(),r.snapshot())}}
 assert(tick<20000)
}
assert(s.won,'paid guided opening can be completed');assert(s.director!.commands>0,'real command opportunity');assert(validSnapshot(s.snapshot()));writeFileSync('artifacts/story/first-lights-won.json',JSON.stringify(s.snapshot()))
const p={records:{[`story1:${m.id}:standard:mira:standard`]:{wave:6,light:s.lives,won:true,practice:false}}} as unknown as VillageProfile
assert(missionWon(p,m.id));assert(missionOpen(p,m.id));p.records[Object.keys(p.records)[0]].practice=true;assert(!missionWon(p,m.id))
for(const change of [{story:2},{mission:'missing'},{hero:'sol'},{variant:3}]){const snap=s.snapshot();Object.assign(snap.challenge,change);assert(!validSnapshot(snap),'reject bad mission rules')}
console.log(`PASS paid First Lights (${s.lives} light, ${Math.round(s.time)} simulation seconds, ${s.director!.commands} commands), teaching, exact mid-wave saves, progress and malformed rules`)
