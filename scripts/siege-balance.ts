import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {Sim,DT} from '../src/game/sim'
import {siegeChallenge,SIEGE_INLET} from '../src/game/siege'
import {HERO_IDS} from '../src/game/heroes'
import {techniqueOffers} from '../src/game/watch-craft'
import {passagePending,type Passage} from '../src/game/watch-director'
import {validSnapshot} from '../src/game/save-store'
import {planComposition,COMPOSITIONS} from './second-compositions'
import {commandMoment} from './director-command-bot'
import {stageOf} from '../src/game/fixed'
import type {Difficulty} from '../src/game/defs'

mkdirSync('artifacts/siege',{recursive:true})
type WaveResult={wave:number;light:number;spent:number;glow:number;crowns:number;seconds:number;commands:number}
const rows:{hero:string;build:string;passage:string;won:boolean;wave:number;light:number;seconds:number;commands:number;waves:WaveResult[]}[]=[]
const heroFilter=process.argv.find(a=>a.startsWith('--hero='))?.split('=')[1]
const difficulty=(process.argv.find(a=>a.startsWith('--difficulty='))?.split('=')[1]??'standard') as Difficulty
assert(['relaxed','standard','nightfall'].includes(difficulty))
for(const hero of HERO_IDS.filter(h=>!heroFilter||h===heroFilter))for(const branch of [0,1])for(const passage of ['convoy','runners'] as Passage[]){
 const s=new Sim(difficulty,siegeChallenge(hero)),waves=[]
 const fixture=difficulty==='standard'&&hero==='mira'&&branch===1&&passage==='convoy'
 while(!s.over&&s.wave<40){
  if(fixture&&[0,8,16,24,32,39].includes(s.wave))writeFileSync(`artifacts/siege/boundary-${s.wave}.json`,JSON.stringify(s.snapshot()))
  if(passagePending(s))assert(s.choosePassage(passage))
  const offer=techniqueOffers(s);if(offer.length)assert(s.chooseTechnique(offer[branch].id))
  planComposition(s,branch)
  assert(validSnapshot(s.snapshot()),`${hero} planning ${s.wave}`)
  assert.equal(s.level.def.sources.find(q=>q.id==='west')!.openWave,SIEGE_INLET)
  const identity=s.towers.map(t=>({uid:t.uid,pad:t.pad,spent:t.spent})),light=s.lives,bank=s.glow
  if(fixture&&[0,8,16,24,32,39].includes(s.wave))writeFileSync(`artifacts/siege/planned-${s.wave}.json`,JSON.stringify(s.snapshot()))
  assert(s.startWave());let tick=0
  for(const t of identity)assert(s.towers.some(q=>q.uid===t.uid&&q.pad===t.pad&&q.spent===t.spent),'Starting a wave must preserve the defence')
  assert.equal(s.lives,light);assert.equal(s.glow,bank)
  while(s.waveActive&&!s.over&&tick++<36000){
   commandMoment(s);s.step(DT);s.events=[];if(tick%240===0)planComposition(s,branch)
   if(tick===480&&[8,16,17,24,32,40].includes(s.wave)){
    const snap=s.snapshot();assert(validSnapshot(snap),`${hero} active ${s.wave}`)
    const r=Sim.restore(structuredClone(snap));assert.deepEqual(r.snapshot(),snap);assert.deepEqual(r.level.def.sources,s.level.def.sources)
    for(let i=0;i<60;i++){s.step(DT);r.step(DT)}assert.deepEqual(r.snapshot(),s.snapshot())
    if(fixture)writeFileSync(`artifacts/siege/active-${s.wave}.json`,JSON.stringify(snap))
   }
  }
  assert(tick<36000,'Encounter stalled')
  waves.push({wave:s.wave,light:s.lives,spent:s.towers.reduce((n,t)=>n+t.spent,0),glow:Math.round(s.glow),crowns:s.towers.filter(t=>stageOf(t)===4).length,seconds:Math.round(s.time),commands:s.director!.commands})
 }
 assert(validSnapshot(s.snapshot()),`${hero} end ${s.wave}`)
 if(fixture)writeFileSync('artifacts/siege/final.json',JSON.stringify(s.snapshot()))
 const row={hero,build:COMPOSITIONS[hero][branch].name,passage,won:s.won,wave:s.wave,light:s.lives,seconds:Math.round(s.time),commands:s.director!.commands,waves}
 rows.push(row);console.log(JSON.stringify({...row,waves:undefined}))
}
writeFileSync(`artifacts/siege/balance${difficulty==='standard'?'':'-'+difficulty}${heroFilter?'-'+heroFilter:''}.json`,JSON.stringify(rows,null,2))
if(!process.argv.includes('--diagnose'))assert(HERO_IDS.filter(h=>!heroFilter||h===heroFilter).every(hero=>['convoy','runners'].every(p=>rows.some(r=>r.hero===hero&&r.passage===p&&r.won))),'Every keeper needs a paid winning reference on either passage')
console.log(`${rows.filter(r=>r.won).length}/${rows.length} full-campaign reference wins`)
