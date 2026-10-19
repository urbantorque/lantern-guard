import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {siegeChallenge} from '../src/game/siege'
import {techniqueOffers} from '../src/game/watch-craft'
import {passagePending} from '../src/game/watch-director'
import {planComposition,COMPOSITIONS} from './second-compositions'
import {commandMoment} from './director-command-bot'

// Paid reference runs, not player win rates. Preserve the original recipes as controls.
const rows:{hero:string;adapted:boolean;passage:string;won:boolean;wave:number;light:number;roster:unknown[];waves:unknown[]}[]=[]
for(const hero of ['mira','ivo'] as const)for(const adapted of [false,true])for(const passage of ['convoy','runners'] as const){
 const original=structuredClone(COMPOSITIONS[hero][0])
 if(adapted){
  const r=COMPOSITIONS[hero][0]
  if(hero==='mira'){r.roster=['wick','cracker','bell','owl','cracker','bell','beam','ballista','garden'];r.paths.beam=0;r.invest=['beam','cracker','bell','ballista','wick']}
  else{r.roster=['wick','storm','bell','owl','cracker','storm','beam','bell','ballista'];r.paths.beam=0;r.invest=['beam','storm','cracker','ballista','wick']}
 }
 const s=new Sim('standard',siegeChallenge(hero)),waves=[]
 while(!s.over&&s.wave<40){
  if(passagePending(s))assert(s.choosePassage(passage))
  const offers=techniqueOffers(s);if(offers.length)assert(s.chooseTechnique(offers[0].id))
  if(adapted&&s.wave<3){
   const id=s.wave===0?'wick':s.wave===1?'bell':hero==='ivo'?'storm':'cracker'
   assert(s.build(s.wave===0?0:s.wave===1?3:6,id),'Reserve income for the next counter instead of upgrading early')
  }else planComposition(s,0)
  assert(s.startWave());let tick=0,bossExit:unknown=null
  while(s.waveActive&&!s.over&&tick++<36000){
   commandMoment(s);s.step(DT)
   for(const e of s.events)if(e.t==='leak')bossExit=s.lastLeak
   s.events=[];if(tick%240===0&&(!adapted||s.wave>3))planComposition(s,0)
  }
  assert(tick<36000)
  waves.push({wave:s.wave,light:s.lives,bank:Math.round(s.glow),leak:bossExit})
 }
 const row={hero,adapted,passage,won:s.won,wave:s.wave,light:s.lives,roster:s.towers.map(t=>({id:t.id,pad:t.pad,spent:t.spent,a:t.a,b:t.b})),waves}
 rows.push(row);console.log(JSON.stringify({...row,roster:undefined,waves:undefined}))
 COMPOSITIONS[hero][0]=original
}
mkdirSync('artifacts/approval',{recursive:true})
writeFileSync('artifacts/approval/balance-diagnostic.json',JSON.stringify(rows,null,2)+'\n')
for(const hero of ['mira','ivo'])for(const passage of ['convoy','runners']){
 const baseline=rows.find(r=>r.hero===hero&&r.passage===passage&&!r.adapted)!,adapted=rows.find(r=>r.hero===hero&&r.passage===passage&&r.adapted)!
 assert(adapted.wave>baseline.wave,'Paid preparation must improve the investigated failure')
}
