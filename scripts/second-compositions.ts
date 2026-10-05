import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {Sim,DT,type Challenge,type Tower} from '../src/game/sim'
import type {TowerId} from '../src/game/defs'
import {HERO_IDS,type HeroId} from '../src/game/heroes'
import {EXPEDITIONS} from '../src/game/watch-depth'
import {techniqueOffers} from '../src/game/watch-craft'
import {stageOf} from '../src/game/fixed'
import {passagePending,type Passage} from '../src/game/watch-director'
import {validSnapshot} from '../src/game/save-store'
import {commandMoment} from './director-command-bot'

type Composition={name:string;roster:TowerId[];paths:Partial<Record<TowerId,0|1>>;invest:TowerId[]}
export const COMPOSITIONS:Record<HeroId,Composition[]>={
 sol:[
  {name:'Wildfire relay',roster:['wick','cracker','bell','owl','cracker','cracker','bell','ballista','garden'],paths:{wick:1,cracker:1,bell:0,owl:1,ballista:0},invest:['cracker','ballista','wick','bell']},
  {name:'Ignition siege',roster:['wick','cracker','bell','owl','beam','ballista','ballista','owl','garden'],paths:{wick:1,cracker:1,bell:0,beam:1,ballista:0,owl:1},invest:['ballista','beam','cracker','wick']},
 ],
 mira:[
  {name:'Frozen battery',roster:['wick','cracker','bell','owl','cracker','bell','cracker','ballista','garden'],paths:{wick:1,cracker:0,bell:0,owl:1,ballista:0},invest:['cracker','bell','ballista','wick']},
  {name:'Undertow corridor',roster:['wick','cracker','bell','owl','bell','beam','beam','ballista','bell','garden'],paths:{wick:1,cracker:0,bell:1,beam:0,owl:1,ballista:0},invest:['beam','ballista','bell','cracker']},
 ],
 ivo:[
  {name:'Chain network',roster:['wick','storm','bell','owl','cracker','storm','cracker','storm','ballista'],paths:{wick:1,storm:0,bell:0,owl:1,cracker:0,ballista:0},invest:['storm','cracker','ballista','wick']},
  {name:'Capacitor bastion',roster:['wick','storm','bell','owl','cracker','beam','ballista','bell','ballista'],paths:{wick:1,storm:1,bell:1,owl:1,cracker:0,beam:0,ballista:0},invest:['storm','ballista','beam','cracker']},
 ],
}
export function planComposition(s:Sim,index:number){
 const inlet=s.challenge.story?s.level.def.sources.find(q=>q.id==='west')?.openWave??99:6
 const recipe=COMPOSITIONS[s.challenge.hero!][index],count=(id:TowerId)=>s.towers.filter(t=>t.id===id).length
 const path=(t:Tower)=>recipe.paths[t.id]??0
 const buy=(id:TowerId)=>{
  if(!s.keeperAllowed(id))return false
  const stats=s.towerStats(id,0,0)
  const candidates=s.pads.flatMap((p,i)=>!p.tower&&s.padRevealed(i)?[{p,i}]:[]).map(({p,i})=>{
   let score=0
   for(const seg of s.level.segs.values())for(let at=0;at<seg.line.length;at+=16){
    if(seg.id==='inlet'&&s.planningWave<(s.challenge.story?inlet-1:inlet))continue
    const q=seg.line.at(at,{x:0,y:0,tx:0,ty:0});if(Math.hypot(p.x-q.x,p.y-q.y)<=stats.range)score+=seg.id==='m1'||seg.id==='e2'?1.5:1
   }
   if(s.planningWave<(s.challenge.story?inlet-1:7)&&p.y>440)score*=.55
   if(id==='bell'||id==='owl')score+=s.towers.filter(t=>t.stats.damage>0&&Math.hypot(p.x-t.x,p.y-t.y)<stats.range).length*12
   if(id==='cracker'&&index===0&&count('cracker'))score+=s.towers.filter(t=>t.id==='cracker'&&Math.hypot(p.x-t.x,p.y-t.y)<stats.range*1.25).length*25
   if(id==='ballista'&&index===1)score+=s.towers.filter(t=>t.id==='cracker'&&Math.hypot(p.x-t.x,p.y-t.y)<stats.range).length*22
   if(id==='beam'&&s.challenge.hero==='mira')score+=s.towers.filter(t=>t.id==='bell'&&Math.hypot(p.x-t.x,p.y-t.y)<stats.range).length*20
   return {i,score,cost:s.towerCost(id)+(s.plotCost(i)??0)}
  }).sort((a,b)=>b.score-a.score||a.i-b.i)
  const chosen=candidates.find(q=>q.cost<=s.glow);if(!chosen)return false
  if(!s.padAvailable(chosen.i)&&!s.unlockPlot(chosen.i))return false
  return !!s.build(chosen.i,id)
 }
 const needed=()=>{const seen:Partial<Record<TowerId,number>>={};return recipe.roster.find(id=>{seen[id]=(seen[id]??0)+1;return count(id)<seen[id]!&&s.keeperAllowed(id)})}
 for(let n=0;n<24;n++){
  const hidden=s.challenge.story&&s.waveDef(Math.min(s.finalWave,s.planningWave)).groups.some(g=>['veil','vshell'].includes(g.type))
  const want=hidden&&!count('owl')?'owl':needed(),limit=s.challenge.story?(s.planningWave<2?2:s.planningWave<3?3:s.planningWave<5?5:s.planningWave<8?7:recipe.roster.length):s.planningWave<4?2:s.planningWave<7?4:s.planningWave<10?6:recipe.roster.length
  if(want&&s.towers.length<limit&&buy(want))continue
  const upgrade=s.towers.filter(t=>{const cost=s.upgradeCost(t,path(t));return cost!==null&&cost<=s.glow}).sort((a,b)=>stageOf(a)-stageOf(b)||recipe.invest.indexOf(a.id)-recipe.invest.indexOf(b.id))[0]
  if(upgrade&&s.upgrade(upgrade,path(upgrade)))continue
  break
 }
}

if(process.argv[1]?.endsWith('second-compositions.ts')){
 const out='artifacts/second-watch';mkdirSync(out,{recursive:true});const rows=[]
 const modeFilter=process.argv.find(a=>a.startsWith('--mode='))?.split('=')[1],heroFilter=process.argv.find(a=>a.startsWith('--hero='))?.split('=')[1]
 const modes=modeFilter?[modeFilter]:process.argv.includes('--all')?['chapter','sunforge','moonwake','stormglass','nightfall','endurance']:['chapter']
 for(const mode of modes)for(const hero of HERO_IDS.filter(h=>!heroFilter||h===heroFilter))for(const index of [0,1])for(const passage of (process.argv.includes('--both')?['convoy','runners']:['convoy']) as Passage[]){
  const e=EXPEDITIONS.find(e=>e.id===mode),rules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:2,hero,variant:e?.variant??1,...(mode==='endurance'?{endurance:true}:{}),...(e?{expedition:e.id,id:`expedition:${e.id}:depth1`,skirmish:{from:0,to:12,glow:e.glow,seed:e.seed}}:{})}
  const s=new Sim(mode==='nightfall'?'nightfall':'standard',rules,e?.seed??1047)
  while(!s.over&&s.wave<s.finalWave){
   if(passagePending(s))assert(s.choosePassage(passage))
   const offer=techniqueOffers(s);if(offer.length)assert(s.chooseTechnique(offer[index].id))
   planComposition(s,index);assert(validSnapshot(s.snapshot()),`${hero} planning ${s.wave}`)
   if(mode==='chapter'&&hero==='ivo'&&index===0&&[6,12,16,23].includes(s.wave))writeFileSync(`${out}/chapter-${s.wave}.json`,JSON.stringify(s.snapshot()))
   assert(s.startWave());let tick=0
   while(s.waveActive&&!s.over&&tick++<36000){commandMoment(s);s.step(DT);s.events=[];if(tick%240===0)planComposition(s,index)}
   assert(tick<36000)
  }
  assert(validSnapshot(s.snapshot()),`${hero} final ${s.wave}`)
  const row={mode,hero,composition:COMPOSITIONS[hero][index].name,passage,won:s.won,wave:s.wave,light:s.lives,glow:Math.round(s.glow),commands:s.director!.commands,roster:s.towers.map(t=>({id:t.id,pad:t.pad,spent:t.spent,stage:stageOf(t)}))}
  rows.push(row);console.log(JSON.stringify(row))
 }
 writeFileSync(`${out}/${modeFilter??(process.argv.includes('--all')?'matrix':'compositions')}${heroFilter?'-'+heroFilter:''}${process.argv.includes('--both')?'-both':''}.json`,JSON.stringify(rows,null,2))
 console.log(`${rows.filter(r=>r.won).length}/${rows.length} paid composition wins`)
}
