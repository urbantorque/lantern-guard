import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { Sim } from '../src/game/sim'
import { type TowerId } from '../src/game/defs'
import { HERO_IDS } from '../src/game/heroes'
import { EXPEDITIONS } from '../src/game/watch-depth'
import { validSnapshot } from '../src/game/save-store'
import { runFixed } from './fixed-bot'

const builds:Record<string,Record<TowerId,0|1>>={
  barrage:{wick:0,cracker:0,bell:0,owl:0,garden:0,beam:1,storm:0,ballista:1},
  precision:{wick:1,cracker:1,bell:1,owl:0,garden:1,beam:0,storm:1,ballista:0},
  shelter:{wick:1,cracker:0,bell:0,owl:1,garden:1,beam:1,storm:0,ballista:1},
}
const rows:Array<{mode:string;hero:string;build:string;map:number;won:boolean;wave:number;light:number;seconds:number}>=[]
const shortOnly=process.argv.includes('--short')
for(const hero of HERO_IDS)for(const [build,branches]of Object.entries(builds)){
  if(!shortOnly)for(let map=0;map<4;map++){
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,hero,variant:map},1047)
    runFixed(s,'mixed',sim=>assert(validSnapshot(sim.snapshot()),'campaign save rejected'),branches)
    const row={mode:'campaign',hero,build,map,won:s.won,wave:s.wave,light:s.lives,seconds:Math.round(s.climate.elapsed)};rows.push(row);console.log(JSON.stringify(row))
  }
  for(const e of EXPEDITIONS){
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,hero,variant:e.variant,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:e.waves,glow:e.glow,seed:e.seed}},e.seed)
    runFixed(s,'mixed',sim=>assert(validSnapshot(sim.snapshot()),'expedition save rejected'),branches)
    const row={mode:e.id,hero,build,map:e.variant,won:s.won,wave:s.wave,light:s.lives,seconds:Math.round(s.climate.elapsed)};rows.push(row);console.log(JSON.stringify(row))
  }
}
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/watch-depth-balance.json',JSON.stringify(rows,null,2))
for(const hero of HERO_IDS)for(const build of Object.keys(builds)){
  if(!shortOnly)assert(rows.some(r=>r.hero===hero&&r.build===build&&r.mode==='campaign'&&r.won),`${hero} needs a viable ${build} campaign`)
  assert(rows.some(r=>r.hero===hero&&r.build===build&&r.mode!=='campaign'&&r.won),`${hero} needs a viable ${build} expedition`)
}
for(const e of EXPEDITIONS)for(const hero of HERO_IDS)assert(rows.some(r=>r.mode===e.id&&r.hero===hero&&r.won),`${e.id} must be winnable by ${hero}`)
console.log(`PASS ${rows.filter(r=>r.won).length}/${rows.length} wins across three independent branch plans`)
