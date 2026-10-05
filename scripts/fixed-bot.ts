import { Sim,DT,type Tower } from '../src/game/sim'
import { type TowerId } from '../src/game/defs'
import { stageOf } from '../src/game/fixed'
import { campaignBeat, campaignUnlock } from '../src/game/watch-director'

export type Strategy='mixed'|'no-beam'|'no-garden'|'no-bonds'|'sparks'|'greedy'
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y)
export function planFixed(s:Sim,strategy:Strategy='mixed',branches:Partial<Record<TowerId,0|1>>={}) {
  const progress=s.challenge.expedition?Math.floor(s.wave*40/12):s.wave?campaignBeat(s.challenge,s.wave):0
  const recipe=!!s.challenge.refinedWatch&&Object.keys(branches).length>0,finale=recipe&&s.wave>=s.finalWave-1
  const authored=recipe&&s.challenge.hero==='ivo'
  if(finale)for(const t of [...s.towers])if(t.id==='garden')s.sell(t)
  const count=(id:TowerId)=>s.towers.filter(t=>t.id===id).length
  const paths:Partial<Record<TowerId,0|1>>={wick:strategy==='sparks'?0:1,cracker:0,bell:0,owl:0,beam:0,storm:1,ballista:0,garden:0,...branches}
  const build=(id:TowerId)=>{
    if(!s.keeperAllowed(id))return false
    const stats=s.towerStats(id,0,0)
    const candidates=s.pads.flatMap((p,i)=>!p.tower&&s.padRevealed(i)&&s.challenge.blockedPad!==i?[{p,i}]:[]).map(({p,i})=>{
      let score=0
      for(const seg of s.level.segs.values())for(let at=0;at<seg.line.length;at+=15){
        if(seg.id==='inlet'&&s.planningWave<(s.challenge.expedition?6:11))continue
        const q=seg.line.at(at,{x:0,y:0,tx:0,ty:0})
        if(distance(p,q)<stats.range)score+=seg.id==='e2'||seg.id==='m1'?1.6:1
      }
      if(id==='owl'||id==='bell')score+=s.towers.filter(t=>['wick','cracker','beam','ballista'].includes(t.id)&&distance(t,p)<stats.range).length*15
      if(id==='owl'&&count('owl')>0)score+=s.towers.filter(t=>['cracker','ballista','storm'].includes(t.id)&&!s.sheltered(t)&&distance(t,p)<stats.range+50).length*90
      if(s.planningWave<8&&p.y>400)score*=.7
      return {i,score,cost:s.towerCost(id)+(s.plotCost(i)??0)}
    }).sort((a,b)=>b.score-a.score)
    const p=candidates.find(q=>q.cost<=s.glow)
    if(!p)return false
    if(!s.padAvailable(p.i)&&!s.unlockPlot(p.i))return false
    if(authored&&id==='storm'){
      const first=s.towers.find(t=>t.id==='wick'),cost=s.towerCost(id)+25
      if(first&&s.glow>=cost){const original=first.pad;if(s.relocate(first,p.i))return !!s.build(original,id)}
    }
    return !!s.build(p.i,id)
  }
  const improve=(t:Tower)=>stageOf(t)===3?s.refine(t):s.upgrade(t,stageOf(t)===0&&s.challenge.watchDirector!==2?0:t.id==='owl'&&s.towers.filter(q=>q.id==='owl').indexOf(t)>0?1:paths[t.id]??0)
  // Role coverage first, then alternate investment in fewer strong towers and new banks.
  if(!count('wick'))build('wick')
  if(s.challenge.watchExperience&&s.challenge.hero==='ivo'&&!count('storm')){
    if(!s.keeperAllowed('storm')||!build('storm'))return
  }
  if(!count('cracker')&&progress>=(s.challenge.watchExperience&&s.challenge.hero==='ivo'?8:1))build('cracker')
  if(progress>=3&&!count('bell'))build('bell')
  if(progress>=6&&!count('owl'))build('owl')
  if(!finale&&strategy==='greedy'&&progress>=10){
    while(count('garden')<2&&build('garden')){}
    const garden=s.towers.find(t=>t.id==='garden'&&stageOf(t)<(progress>=15?3:2))
    if(garden){while(improve(garden)){};return}
  }
  if(!finale&&!authored&&progress>=16&&strategy!=='no-garden'&&!count('garden'))build('garden')
  if(progress>=16&&strategy!=='no-beam'&&strategy!=='sparks'&&!count('beam'))build('beam')
  if(authored&&progress>=21&&!count('storm'))build('storm')
  // Bank for the Warden's heavy counter before a second night shelter.
  if(progress>=30&&strategy!=='greedy'&&(!authored||count('ballista')>0)&&count('owl')<2&&s.towers.length<(authored?12:11))build('owl')
  if(progress>=25&&!count('ballista')) { if(!build('ballista'))return }
  if(progress>=25) {
    const heavy=s.towers.find(t=>t.id==='ballista'&&stageOf(t)<3)
    if(heavy) { while(stageOf(heavy)<3&&improve(heavy)){}; if(stageOf(heavy)<3)return }
  }
  for(let pass=0;pass<20;pass++) {
    const eligible=s.towers.filter(t=>t.id!=='garden' || progress<27).filter(t=>{
      const price=s.fixedPrice(t);return price!==null&&price<=s.glow&& (stageOf(t)<2||stageOf(t)===2&&s.planningWave>=(s.challenge.expedition?7:campaignUnlock(s.challenge,16))||stageOf(t)===3&&s.planningWave>=(s.challenge.expedition?10:campaignUnlock(s.challenge,31)))
    }).sort((a,b)=>stageOf(a)-stageOf(b)||((authored?['storm','cracker','wick','beam','ballista','bell','owl','garden']:['cracker','wick','beam','ballista','storm','bell','owl','garden']).indexOf(a.id)-(authored?['storm','cracker','wick','beam','ballista','bell','owl','garden']:['cracker','wick','beam','ballista','storm','bell','owl','garden']).indexOf(b.id)))
    if(eligible.length&&improve(eligible[0]))continue
    const roster:TowerId[]=progress>=26?['ballista','storm','cracker','wick','owl','bell']:progress>=21?['storm','cracker','wick','bell']:['cracker','wick','bell']
    const id=roster.find(id=>count(id)<(id==='cracker'||id==='wick'?3:2))
    if(progress>=9&&s.towers.length<(finale?12:authored?7:9)&&id&&build(id))continue
    break
  }
  if(strategy!=='no-bonds')for(const t of s.towers)for(const o of s.towers)s.bond(t,o)
  s.events=[]
}
export function runFixed(s:Sim,strategy:Strategy='mixed',onWave?:(sim:Sim)=>void,branches:Partial<Record<TowerId,0|1>>={},onStep?:(sim:Sim)=>void) {
  while(!s.over&&s.wave<s.finalWave) {
    planFixed(s,strategy,branches);onWave?.(s)
    if(!s.startWave())throw Error('Wave refused')
    let steps=0
    while(s.waveActive&&!s.over&&steps++<36000){onStep?.(s);s.step(DT);s.events=[];if(!s.over&&s.challenge.refinedWatch&&Object.keys(branches).length&&steps%480===0)planFixed(s,strategy,branches)}
    if(steps>=36000)throw Error('Wave did not settle')
  }
  return s
}
