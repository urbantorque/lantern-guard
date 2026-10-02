import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim } from '../src/game/sim'
import { HERO_IDS } from '../src/game/heroes'
import { EXPEDITIONS } from '../src/game/watch-depth'
import { techniqueOffers } from '../src/game/watch-craft'
import { weeklyWatch } from '../src/game/living-watch'
import { runFixed,type Strategy } from './fixed-bot'
import { validSnapshot } from '../src/game/save-store'

const rows:Array<{mode:string;hero:string;strategy:string;pair:string;map:number;won:boolean;wave:number;light:number;glow:number;leaks:number}>=[]
const record=(s:Sim,mode:string,strategy:Strategy,pair:string)=>{
  runFixed(s,strategy,q=>{const offers=techniqueOffers(q);if(offers.length)q.chooseTechnique(offers[Number(pair[q.techniques.length])].id);assert(validSnapshot(q.snapshot()))})
  rows.push({mode,hero:s.challenge.hero!,strategy,pair,map:s.challenge.variant!,won:s.won,wave:s.wave,light:s.lives,glow:Math.floor(s.glow),leaks:Object.values(s.stats.leaksBy).reduce((a,b)=>a+(b??0),0)})
  console.log(JSON.stringify(rows.at(-1)))
}
for(const hero of HERO_IDS)for(const strategy of ['mixed','greedy','no-garden','sparks'] as Strategy[])for(const variant of [0,1,2,3]){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,hero,variant},1047)
  record(s,'campaign',strategy,strategy==='mixed'?'01':'10')
}
for(const hero of HERO_IDS)for(const pair of ['00','01','10','11'])for(const e of EXPEDITIONS){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,hero,variant:e.variant,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)
  record(s,e.id,'mixed',pair)
}
for(let week=0;week<9;week++)for(const hero of HERO_IDS){
  const w=weeklyWatch(week),s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,weekly:week,hero,variant:w.variant,expedition:w.expedition.id,id:w.id,skirmish:{from:0,to:12,glow:w.glow,seed:w.seed}},w.seed)
  record(s,`week-${week}`,'mixed','01')
}
writeFileSync('artifacts/living-watch-balance.json',JSON.stringify(rows,null,2))
for(const hero of HERO_IDS)assert(rows.filter(r=>r.hero===hero&&r.mode==='campaign'&&r.strategy==='mixed').every(r=>r.won),`${hero} needs a reference win on every map`)
for(const hero of HERO_IDS)for(const pair of ['00','01','10','11'])assert(rows.filter(r=>r.hero===hero&&r.pair===pair&&['sunforge','moonwake','stormglass'].includes(r.mode)).every(r=>r.won),`${hero} ${pair} expedition viability`)
console.log(`PASS ${rows.filter(r=>r.won).length}/${rows.length} paid strategy runs won; see report for tradeoffs`)
