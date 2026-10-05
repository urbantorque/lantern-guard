import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {Sim,DT,type Challenge} from '../src/game/sim'
import {HERO_IDS} from '../src/game/heroes'
import {HERO_BUILDS} from '../src/game/watch-refinement'
import {EXPEDITIONS} from '../src/game/watch-depth'
import {techniqueOffers} from '../src/game/watch-craft'
import {passagePending,type Passage} from '../src/game/watch-director'
import {validSnapshot} from '../src/game/save-store'
import {planFixed} from './fixed-bot'
import {commandMoment} from './director-command-bot'

const out='artifacts/director-qa';mkdirSync(out,{recursive:true})
const rows=[]
const quick=process.argv.includes('--quick'),stress=process.argv.includes('--stress'),maps=process.argv.includes('--maps'),command=process.argv.includes('--commands')
for(const hero of HERO_IDS)for(const [buildIndex,build] of HERO_BUILDS[hero].entries())for(const mode of (maps?['campaign2','campaign3','endurance']:stress?['nightfall']:quick?['sunforge','campaign']:['sunforge','moonwake','stormglass','campaign']))for(const passage of (quick||stress||maps?['convoy']:['convoy','runners']) as Passage[]){
  if(quick&&buildIndex===1)continue
  if(mode==='endurance'&&buildIndex===1)continue
  const e=EXPEDITIONS.find(e=>e.id===mode),variant=e?.variant??(mode==='campaign2'?2:mode==='campaign3'?3:stress?2:buildIndex?1:0)
  const challenge:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:1,hero,variant,...(e?{expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}}:{})}
  if(mode==='endurance')challenge.endurance=true
  const s=new Sim(stress?'nightfall':'standard',challenge,e?.seed??1047)
  while(!s.over&&s.wave<s.finalWave){
    if(passagePending(s))assert(s.choosePassage(passage))
    planFixed(s,'mixed',build.branches)
    const offer=techniqueOffers(s);if(offer.length)assert(s.chooseTechnique(offer[buildIndex].id))
    assert(validSnapshot(s.snapshot()),`Invalid planning save ${hero} ${mode} ${s.wave}`)
    if(hero==='ivo'&&buildIndex===0&&passage==='convoy'&&[6,11,16,23].includes(s.wave))writeFileSync(`${out}/${mode}-${s.wave}.json`,JSON.stringify(s.snapshot()))
    assert(s.startWave(),`Wave refused ${hero} ${mode} ${s.wave}`)
    let tick=0
    while(s.waveActive&&!s.over&&tick++<36000){if(command)commandMoment(s);s.step(DT);s.events=[];if(tick%480===0)planFixed(s,'mixed',build.branches)}
    assert(tick<36000,'Wave never settled')
  }
  assert(validSnapshot(s.snapshot()),`Invalid final save ${hero} ${mode} ${s.wave}`)
  const row={hero,build:build.name,mode,variant,passage,won:s.won,wave:s.wave,leaks:s.stats.leaked,light:s.lives,glow:Math.round(s.glow),minutes:+((s.stats.activeTime/1.3+s.wave*4)/60).toFixed(1)}
  rows.push(row);console.log(JSON.stringify(row))
}
writeFileSync(`${out}/${quick?'quick':stress?'stress':maps?'maps':command?'balance-commands':'balance'}.json`,JSON.stringify(rows,null,2))
console.log(`${rows.filter(r=>r.won).length}/${rows.length} paid reference wins`)
