import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {Sim,DT} from '../src/game/sim'
import {HERO_IDS} from '../src/game/heroes'
import {CONTRACTS,contractStatus} from '../src/game/watch-mastery'
import {passagePending} from '../src/game/watch-director'
import {validSnapshot} from '../src/game/save-store'
import {contractWatch,planContract} from './mastery-reference'
import {commandMoment} from './director-command-bot'

const rows=[]
for(const c of CONTRACTS)for(const hero of HERO_IDS){
  const base=contractWatch(c.id,hero),s=new Sim('standard',{...base.challenge,watchDirector:process.argv.includes('--second')?2:1},base.seed)
 while(!s.over&&s.wave<s.finalWave){
  if(passagePending(s))assert(s.choosePassage('convoy'))
  planContract(s);assert(validSnapshot(s.snapshot()));assert(s.startWave());let steps=0
  while(s.waveActive&&!s.over&&steps++<36000){commandMoment(s);s.step(DT);s.events=[];if(steps%480===0&&!s.over)planContract(s)}
  assert(steps<36000);assert(validSnapshot(s.snapshot()))
 }
 const status=contractStatus(s)!,row={contract:c.id,hero,won:s.won,wave:s.wave,light:s.lives,met:status.met,progress:status.progress,commands:s.director!.commands,roster:s.towers.map(t=>({id:t.id,pad:t.pad,a:t.a,b:t.b}))}
 rows.push(row);console.log(JSON.stringify(row))
}
writeFileSync(`artifacts/${process.argv.includes('--second')?'second-watch':'director-qa'}/contracts.json`,JSON.stringify(rows,null,2))
assert(rows.every(r=>r.won&&r.met),'Every contract needs a paid completion for every hero')
