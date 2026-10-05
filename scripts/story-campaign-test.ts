import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {Sim,DT} from '../src/game/sim'
import {MISSIONS,storyChallenge} from '../src/game/story'
import {HERO_IDS} from '../src/game/heroes'
import {techniqueOffers} from '../src/game/watch-craft'
import {passagePending,type Passage} from '../src/game/watch-director'
import {validSnapshot} from '../src/game/save-store'
import {planComposition,COMPOSITIONS} from './second-compositions'
import {commandMoment} from './director-command-bot'

mkdirSync('artifacts/story',{recursive:true})
const rows:{mission:string;hero:string;build:string;passage:string;won:boolean;wave:number;light:number;seconds:number;commands:number;spent:number;glow:number}[]=[]
for(const m of MISSIONS.slice(1))for(const hero of HERO_IDS)for(const branch of [0,1])for(const passage of (m.passage?['convoy','runners']:['convoy']) as Passage[]){
 const s=new Sim('standard',storyChallenge(m.id,hero))
 while(!s.over&&s.wave<s.finalWave){
  if(passagePending(s))assert(s.choosePassage(passage))
  const offer=techniqueOffers(s);if(offer.length)assert(s.chooseTechnique(offer[branch].id))
  planComposition(s,branch)
  assert(validSnapshot(s.snapshot()),`${m.id} ${hero} planning ${s.wave}`)
  assert.equal(s.level.def.sources.find(q=>q.id==='west')!.openWave,m.inlet)
  if(hero==='ivo'&&branch===1&&passage==='convoy'&&[3,6,m.waves.length-1].includes(s.wave))writeFileSync(`artifacts/story/${m.id}-${s.wave}.json`,JSON.stringify(s.snapshot()))
  assert(s.startWave());let tick=0
  while(s.waveActive&&!s.over&&tick++<30000){
   commandMoment(s);s.step(DT);s.events=[];if(tick%240===0)planComposition(s,branch)
   if(tick===300){const snap=s.snapshot();assert(validSnapshot(snap),`${m.id} active ${s.wave}`);const r=Sim.restore(structuredClone(snap));assert.deepEqual(r.snapshot(),snap);assert.deepEqual(r.level.def.sources,s.level.def.sources);for(let i=0;i<60;i++){s.step(DT);r.step(DT)}assert.deepEqual(r.snapshot(),s.snapshot())}
  }
  assert(tick<30000,`${m.id} stalled`)
 }
 const row={mission:m.id,hero,build:COMPOSITIONS[hero][branch].name,passage,won:s.won,wave:s.wave,light:s.lives,seconds:Math.round(s.time),commands:s.director!.commands,spent:s.towers.reduce((n,t)=>n+t.spent,0),glow:Math.round(s.glow)}
 rows.push(row);console.log(JSON.stringify(row))
}
writeFileSync('artifacts/story/campaign-matrix.json',JSON.stringify(rows,null,2))
console.log(`${rows.filter(r=>r.won).length}/${rows.length} paid campaign reference wins; all planning/active saves and passage source timings checked`)
assert(MISSIONS.slice(1).every(m=>rows.some(r=>r.mission===m.id&&r.won)),'Each mission needs a paid winning reference')
assert(MISSIONS.slice(1).every(m=>HERO_IDS.every(h=>rows.some(r=>r.mission===m.id&&r.hero===h&&r.won))),'Each keeper needs a paid winning reference on every mission')
