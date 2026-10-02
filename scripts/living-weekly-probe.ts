import { Sim } from '../src/game/sim'
import { weeklyWatch } from '../src/game/living-watch'
import { techniqueOffers } from '../src/game/watch-craft'
import { runFixed,type Strategy } from './fixed-bot'
import type { HeroId } from '../src/game/heroes'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const rows=[]
for(const [week,hero]of [[7,'sol'],[8,'mira']] as [number,HeroId][]){
 for(const strategy of ['no-garden','mixed','greedy'] as Strategy[])for(const pair of ['00','10','11']){
  const w=weeklyWatch(week),s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,weekly:week,hero,variant:w.variant,expedition:w.expedition.id,id:w.id,skirmish:{from:0,to:12,glow:w.glow,seed:w.seed}},w.seed)
  runFixed(s,strategy,q=>{const offers=techniqueOffers(q);if(offers.length)q.chooseTechnique(offers[Number(pair[q.techniques.length])].id)})
  const row={week,hero,strategy,pair,won:s.won,wave:s.wave,light:s.lives};rows.push(row);console.log(JSON.stringify(row))
 }
 assert(rows.some(r=>r.week===week&&r.hero===hero&&r.won),'Each weekly needs an attainable hero strategy')
}
writeFileSync('artifacts/living-weekly-probe.json',JSON.stringify(rows,null,2))
