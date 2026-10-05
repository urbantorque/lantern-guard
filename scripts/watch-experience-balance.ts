import {cleanupSpeed} from '../src/game/watch-mastery'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {Sim} from '../src/game/sim'
import {HERO_IDS} from '../src/game/heroes'
import {HERO_BUILDS} from '../src/game/watch-refinement'
import {EXPEDITIONS} from '../src/game/watch-depth'
import {techniqueOffers} from '../src/game/watch-craft'
import {validSnapshot} from '../src/game/save-store'
import {runFixed} from './fixed-bot'
const mastery=process.argv.includes('--mastery'),tactics=mastery||process.argv.includes('--tactics'),suite=mastery?'mastery':tactics?'tactics':'experience'
mkdirSync(`artifacts/${suite}-qa`,{recursive:true})
const rows=[]
const stress=process.argv.includes('--stress')
for(const difficulty of stress?['relaxed','nightfall'] as const:['standard'] as const)for(const hero of HERO_IDS)for(const [buildIndex,build] of HERO_BUILDS[hero].entries())for(const short of stress?[false]:[false,true])for(const variant of stress?[2]:short?[0,1,2]:[0,1,2,3]){
 const e=short?EXPEDITIONS[variant]:null,seed=e?.seed??(stress?4099:1047)
 const s=new Sim(difficulty,{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,...(tactics?{watchTactics:1 as const}:{}),...(mastery?{watchMastery:1 as const}:{}),hero,variant:e?.variant??variant,...(e?{expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed}}:{})},seed)
 let cleanupSaved=0
 runFixed(s,'mixed',q=>{const offers=techniqueOffers(q);if(offers.length)assert(q.chooseTechnique(offers[buildIndex].id));assert(validSnapshot(q.snapshot()),`${hero} ${q.wave}`)
 if(hero==='ivo'&&buildIndex===0&&!short&&variant===0&&[3,11,29,39].includes(q.wave))writeFileSync(`artifacts/${suite}-qa/wave-${q.wave}.json`,JSON.stringify(q.snapshot()))
 },build.branches,q=>{cleanupSaved+=(1-1/cleanupSpeed(q))/60/1.3})
 const row={hero,build:build.name,difficulty,seed,mode:e?.id??'campaign',map:s.challenge.variant,won:s.won,wave:s.wave,light:s.lives,leaks:s.stats.leaked,glow:Math.round(s.glow),techniques:s.techniques,roster:s.towers.map(t=>({id:t.id,damage:Math.round(t.damageDealt??0),armour:Math.round(t.armourRemoved??0),signatures:t.signatureHits??0})),cleanupSavedSeconds:Math.round(cleanupSaved),minutes:Number(((s.stats.activeTime/1.3-cleanupSaved+4*s.wave)/60).toFixed(1))}
 rows.push(row);console.log(JSON.stringify(row));assert(validSnapshot(s.snapshot()))
 if(hero==='sol'&&short&&variant===0&&buildIndex===0)writeFileSync(`artifacts/${suite}-qa/victory.json`,JSON.stringify(s.snapshot()))
}
writeFileSync(`artifacts/${suite}-${stress?'stress':'balance'}.json`,JSON.stringify(rows,null,2));console.log(`${rows.filter(r=>r.won).length}/${rows.length} paid reference wins`)
assert(rows.filter(r=>r.difficulty!=='nightfall').every(r=>r.won),'Every supported build needs a viable paid reference run')
