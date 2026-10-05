import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {Sim,DT,type Challenge,type Tower} from '../src/game/sim'
import {type TowerId} from '../src/game/defs'
import {type HeroId,HERO_IDS} from '../src/game/heroes'
import {EXPEDITIONS} from '../src/game/watch-depth'
import {HERO_BUILDS} from '../src/game/watch-refinement'
import {techniqueOffers} from '../src/game/watch-craft'
import {CONTRACTS,contractDef,contractStatus,lowerBend,lowerGuard,type ContractId} from '../src/game/watch-mastery'
import {stageOf} from '../src/game/fixed'
import {validSnapshot} from '../src/game/save-store'
import {planFixed} from './fixed-bot'

export const masteryRules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,hero:'sol',variant:0}
export function contractWatch(id:ContractId,hero:HeroId='sol'){
 const c=contractDef(id)!,e=EXPEDITIONS.find(e=>e.id===c.expedition)!
 return new Sim('standard',{...masteryRules,hero,contract:id,expedition:e.id,variant:e.variant,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}},e.seed)
}
/** A six-tower paid defence. Scores water coverage; never grants glow, towers or ranks. */
function smallCompany(s:Sim){
 const branches=HERO_BUILDS[s.challenge.hero!][0].branches
 const primary=s.challenge.hero==='ivo'?'storm':'cracker'
 const leader=s.towers.find(t=>t.id===primary)
 if(leader&&s.planningWave>=7){while(stageOf(leader)<3&&s.upgrade(leader,branches[primary]??0)){};if(s.planningWave>=10&&!leader.refinement)s.refine(leader)}
 const recipe:TowerId[]=s.challenge.hero==='ivo'?['wick','storm','bell','owl','cracker','ballista']:['wick','cracker','bell','owl','beam','ballista']
 for(const id of recipe){
  if(s.towers.some(t=>t.id===id)||!s.keeperAllowed(id))continue
  if(s.towers.length>=4&&!leader?.refinement)continue
  const stats=s.towerStats(id,0,0)
  const candidates=s.pads.flatMap((p,i)=>!p.tower&&s.padRevealed(i)?[{p,i}]:[]).map(({p,i})=>{
   let score=0
   for(const seg of s.level.segs.values())for(let at=0;at<seg.line.length;at+=15){const q=seg.line.at(at,{x:0,y:0,tx:0,ty:0});if(Math.hypot(q.x-p.x,q.y-p.y)<stats.range)score+=(seg.id==='e2'||seg.id==='m1')?1.6:1}
   if(id==='owl'||id==='bell')score+=s.towers.filter(t=>Math.hypot(t.x-p.x,t.y-p.y)<stats.range).length*15
   return {i,score,cost:s.towerCost(id)+(s.plotCost(i)??0)}
  }).sort((a,b)=>b.score-a.score)
  const pad=candidates.find(p=>p.cost<=s.glow)
  if(pad&&(s.padAvailable(pad.i)||s.unlockPlot(pad.i))){
   const first=s.director&&id==='storm'?s.towers.find(t=>t.id==='wick'):null
   if(first){if(s.glow<s.towerCost(id)+25)return;const original=first.pad;if(s.relocate(first,pad.i))s.build(original,id)}
   else s.build(pad.i,id)
  }
 }
 for(let n=0;n<30;n++){
  const t=[...s.towers].filter(t=>s.fixedPrice(t)!==null&&s.fixedPrice(t)!<=s.glow).sort((a,b)=>stageOf(a)-stageOf(b)||recipe.indexOf(a.id)-recipe.indexOf(b.id)).find(t=>stageOf(t)<2||t.id===primary&&(stageOf(t)===2&&s.planningWave>=7||stageOf(t)===3&&s.planningWave>=10))
  if(!t)break
  const ok=stageOf(t)===3?s.refine(t):s.upgrade(t,stageOf(t)===0?0:branches[t.id]??0);if(!ok)break
 }
 s.syncBonds()
}
function coverBend(s:Sim){
 const p=lowerBend(s),range=(t:Tower)=>Math.min(s.nightRange(t),s.effRange(t))/t.rangeMul,cover=(t:Tower)=>Math.hypot(t.x-p.x,t.y-p.y)<=range(t)
 for(const role of ['scout','attack','attack'] as const){
  const eligible=s.towers.filter(t=>role==='scout'?t.id==='owl':!['owl','bell','garden'].includes(t.id))
  const need=role==='scout'?1:2;if(eligible.filter(cover).length>=need)continue
  const moves=eligible.filter(t=>!cover(t)).flatMap(t=>s.pads.flatMap((pad,i)=>!pad.tower&&s.padRevealed(i)&&Math.hypot(pad.x-p.x,pad.y-p.y)<range(t)-10?[{t,i,range:range(t),cost:25+(s.plotCost(i)??0)}]:[])).sort((a,b)=>b.range-a.range)
  const m=moves.find(m=>m.cost<=s.glow);if(m&&(s.padAvailable(m.i)||s.unlockPlot(m.i)))s.relocate(m.t,m.i)
 }
}
/** Put control before blasts; reserve the downstream shared bend for the guided bolt. */
function twinSignals(s:Sim){
 const late=s.wave>=8
 if(late)for(const [id,pad] of [['bell',6],['cracker',5],['owl',0]] as const){
  const t=s.towers.find(t=>t.id===id);if(t&&t.pad!==pad&&!s.pads[pad].tower&&s.glow>=25+(s.plotCost(pad)??0)&&(s.padAvailable(pad)||s.unlockPlot(pad)))s.relocate(t,pad)
 }
 for(const [id,pad] of (late?[['cracker',5],['bell',6],['owl',0],['ballista',3]]:[['cracker',3],['bell',0],['owl',7]]) as [TowerId,number][]){
  if(!s.keeperAllowed(id)||s.towers.some(t=>t.id===id)||!s.padRevealed(pad))continue
  if(s.glow>=s.towerCost(id)+(s.plotCost(pad)??0)&&(s.padAvailable(pad)||s.unlockPlot(pad)))s.build(pad,id)
 }
 for(const id of ['bell','owl','cracker','ballista'] as const){const t=s.towers.find(t=>t.id===id);if(!t)continue
  while(stageOf(t)<(id==='ballista'?3:2)&&s.upgrade(t,0)){}
 }
 for(const [a,b] of [['bell','cracker'],['owl','ballista']] as const){const x=s.towers.find(t=>t.id===a),y=s.towers.find(t=>t.id===b);if(x&&y)s.selectBond(x,y)}
}
export function planContract(s:Sim){
 const offers=techniqueOffers(s);if(offers.length)assert(s.chooseTechnique(offers[s.challenge.contract==='small-company'&&s.challenge.hero==='ivo'?1:0].id))
 if(s.challenge.contract==='small-company')smallCompany(s)
 else if(s.challenge.contract==='twin-signals')twinSignals(s)
 else{
  if(s.challenge.contract==='last-lantern'&&s.wave>=7)coverBend(s)
  planFixed(s,'mixed',HERO_BUILDS[s.challenge.hero!][0].branches)
  if(s.challenge.contract==='last-lantern'&&s.wave>=8)coverBend(s)
 }
}
export function runContract(s:Sim,fixtures=false){
 while(!s.over&&s.wave<s.finalWave){
  planContract(s);assert(validSnapshot(s.snapshot()),'contract planning validates')
  if(fixtures&&s.wave===11)writeFileSync(`artifacts/mastery-qa/${s.challenge.contract}-${s.challenge.hero}-planning.json`,JSON.stringify(s.snapshot()))
  assert(s.startWave());let steps=0
  while(s.waveActive&&!s.over&&steps++<36000){s.step(DT);s.events=[];if(steps%480===0&&!s.over)planContract(s)}
  assert(steps<36000);assert(validSnapshot(s.snapshot()),'contract end validates')
 }
 return s
}
if(process.argv.includes('--contracts')){
 mkdirSync('artifacts/mastery-qa',{recursive:true});const rows=[]
 for(const c of CONTRACTS)for(const hero of HERO_IDS){
  const s=runContract(contractWatch(c.id,hero),true),status=contractStatus(s)!
  const row={contract:c.id,hero,won:s.won,light:s.lives,met:status.met,progress:status.progress,guard:lowerGuard(s),roster:s.towers.map(t=>({id:t.id,pad:t.pad,stage:stageOf(t)}))}
  rows.push(row);console.log(JSON.stringify(row));writeFileSync(`artifacts/mastery-qa/${c.id}-${hero}-result.json`,JSON.stringify(s.snapshot()))
 }
 writeFileSync('artifacts/mastery-contracts.json',JSON.stringify(rows,null,2))
 assert(rows.every(r=>r.won&&r.met),'Each contract needs a paid completion for every hero')
}
