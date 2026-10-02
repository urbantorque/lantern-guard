import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim } from '../src/game/sim'
import { HERO_IDS } from '../src/game/heroes'
import { runFixed } from './fixed-bot'

// The income landmark is the most favourable place for early two-Garden greed.
// Compare it with role coverage under a second forecast; also check harder-mode viability.
const rows=[]
for(const hero of HERO_IDS){
  for(const strategy of ['mixed','greedy'] as const){
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,hero,variant:2},4099)
    runFixed(s,strategy)
    rows.push({hero,strategy,mode:'standard',map:2,seed:4099,won:s.won,wave:s.wave,light:s.lives})
  }
  const hard=new Sim('nightfall',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,hero,variant:0},4099)
  runFixed(hard)
  rows.push({hero,strategy:'mixed',mode:'nightfall',map:0,seed:4099,won:hard.won,wave:hard.wave,light:hard.lives})
}
writeFileSync('artifacts/watch-depth-economy.json',JSON.stringify(rows,null,2)+'\n')
console.log(JSON.stringify(rows,null,2))
const balanced=rows.filter(r=>r.mode==='standard'&&r.strategy==='mixed'),greedy=rows.filter(r=>r.strategy==='greedy')
assert(balanced.every(r=>r.won),'each hero has a viable balanced defence beside the Sun terrace')
assert(balanced.reduce((n,r)=>n+r.light,0)>=greedy.reduce((n,r)=>n+r.light,0),'early income stacking must not dominate balanced role coverage')
assert(rows.filter(r=>r.mode==='nightfall').some(r=>r.won),'Nightfall must retain a viable paid-build defence')
console.log('PASS new-rule economy, second forecast and Nightfall viability')
