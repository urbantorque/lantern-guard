import {writeFileSync} from 'node:fs'
import {Sim} from '../src/game/sim'
import {HERO_IDS} from '../src/game/heroes'
import {HERO_BUILDS} from '../src/game/watch-refinement'
import {EXPEDITIONS} from '../src/game/watch-depth'
import {techniqueOffers} from '../src/game/watch-craft'
import {runFixed} from './fixed-bot'
import {validSnapshot} from '../src/game/save-store'
import assert from 'node:assert/strict'

const rows=[]
const probe=process.argv.includes('--probe')
for(const hero of HERO_IDS)for(const [buildIndex,build]of HERO_BUILDS[hero].entries()){
  for(const short of [false,true])for(const variant of short?[0,1,2]:[0,1,2,3]){
    if(probe&&(buildIndex!==0||short||!((hero==='sol'&&variant===2)||(hero!=='sol'&&[0,2].includes(variant)))))continue
    const e=short?EXPEDITIONS[variant]:null,seed=e?.seed??1047
    const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,hero,variant:e?.variant??variant,...(e?{expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed}}:{})},seed)
    const checkpoints:unknown[]=[]
    runFixed(s,'mixed',q=>{const offers=techniqueOffers(q);if(offers.length)q.chooseTechnique(offers[Number(build.pair[q.techniques.length])].id);assert(validSnapshot(q.snapshot()));if(q.wave%10===0||q.wave===q.finalWave-1)checkpoints.push({wave:q.wave,glow:Math.round(q.glow),light:q.lives})},build.branches)
    const row={hero,build:build.name,buildIndex,mode:e?.id??'campaign',map:s.challenge.variant,won:s.won,wave:s.wave,light:s.lives,glow:Math.round(s.glow),techniques:s.techniques,roster:s.towers.map(t=>({id:t.id,a:t.a,b:t.b,damage:Math.round(t.damageDealt??0),volleys:t.tolls})),healed:s.stats.lightRestored??0,leaks:s.stats.leaked,checkpoints}
    if(hero==='ivo')assert(s.towers.some(t=>t.id==='storm'&&(t.damageDealt??0)>100),'Ivo must use his lightning technique');rows.push(row);console.log(JSON.stringify(row))
    writeFileSync(probe?'artifacts/refinement-probe.json':'artifacts/refinement-balance.json',JSON.stringify(rows,null,2))
  }
}
console.log(`${rows.filter(r=>r.won).length}/${rows.length} reference wins`)
assert(rows.every(r=>r.won),'Both hero builds need a reference win on every map and expedition')
