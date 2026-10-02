import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim,DT } from '../src/game/sim'
import { HERO_IDS } from '../src/game/heroes'
import { EXPEDITIONS } from '../src/game/watch-depth'
import { techniqueOffers } from '../src/game/watch-craft'
import { validSnapshot } from '../src/game/save-store'
import { runFixed } from './fixed-bot'

const rows:Array<{mode:string;hero:string;choices:string;map:number;won:boolean;wave:number;light:number}>=[]
for(const hero of HERO_IDS)for(const choices of ['00','01','10','11']){
  const choose=(s:Sim)=>{const offer=techniqueOffers(s);if(offer.length)assert(s.chooseTechnique(offer[Number(choices[s.techniques.length])].id));assert(validSnapshot(s.snapshot()))}
  for(const e of EXPEDITIONS){
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,hero,variant:e.variant,expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)
    runFixed(s,'mixed',q=>{choose(q);if(hero==='sol'&&choices==='00'&&e.id==='sunforge'&&q.wave===11)writeFileSync('artifacts/craft-dredger.json',JSON.stringify(q.snapshot()))})
    rows.push({mode:e.id,hero,choices,map:e.variant,won:s.won,wave:s.wave,light:s.lives});console.log(JSON.stringify(rows.at(-1)))
  }
  const map=Number(choices[0])*2+Number(choices[1]),s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,hero,variant:map},1047)
  runFixed(s,'mixed',choose);rows.push({mode:'campaign',hero,choices,map,won:s.won,wave:s.wave,light:s.lives});console.log(JSON.stringify(rows.at(-1)))
}
writeFileSync('artifacts/watch-craft-balance.json',JSON.stringify(rows,null,2))
for(const hero of HERO_IDS)for(const choices of ['00','01','10','11'])assert(rows.some(r=>r.hero===hero&&r.choices===choices&&r.won),'Every pair of techniques needs a viable run')
for(const e of EXPEDITIONS)for(const hero of HERO_IDS)assert(rows.some(r=>r.mode===e.id&&r.hero===hero&&r.won),`${e.id} needs a viable ${hero} run`)
// A deterministic active boss fixture to inspect both animation and live upgrades.
const snap=JSON.parse((await import('node:fs')).readFileSync('artifacts/craft-dredger.json','utf8')),demo=Sim.restore(snap);demo.startWave()
for(let i=0;i<60;i++)demo.step(DT)
assert(validSnapshot(demo.snapshot()));writeFileSync('artifacts/craft-dredger-active.json',JSON.stringify(demo.snapshot()))
console.log(`PASS ${rows.filter(r=>r.won).length}/${rows.length} reference wins with paid builds`)
