import type {Sim, SaveSnapshotV2} from './sim'
import type {TowerId} from './defs'
import {ROLE_NAMES} from './watch-clarity'

/** Score only water the new tower can actually reach, with extra credit for shared fire. */
export function teachingPlot(s:Sim,id:TowerId){
 if(!s.keeperAllowed(id))return null
 const choices=s.pads.flatMap((p,index)=>{
  if(p.tower||!s.padAvailable(index))return []
  const tower=s.previewTower(index,id);if(!tower)return []
  let covered=0,shared=0
  for(const seg of s.level.segs.values()){
   if(seg.id==='inlet'&&!s.openSources.has('west'))continue
   for(let at=0;at<seg.line.length;at+=12){
    const q=seg.line.at(at,{x:0,y:0,tx:0,ty:0})
    if(Math.hypot(q.x-p.x,q.y-p.y)>s.effRange(tower))continue
    covered++
    if(s.towers.some(t=>(t.stats.damage>0||t.stats.slow>0)&&Math.hypot(q.x-t.x,q.y-t.y)<=s.effRange(t)))shared++
   }
  }
  return [{index,covered,shared,score:covered+shared*3}]
 }).sort((a,b)=>b.score-a.score||a.index-b.index)
 return choices.find(p=>p.covered>0)??null
}

export function reserveWarning(s:Sim,cost:number){
 if(s.challenge.siege!==2||s.waveActive||s.wave>2)return ''
 const id:TowerId=s.planningWave===2?'bell':s.planningWave===3?'cracker':'wick'
 if(s.planningWave<2||s.towers.some(t=>t.id===id))return ''
 const left=Math.floor(s.glow-cost),needed=s.towerCost(id)
 return left>=0&&left<needed?`Leaves ${left} glow. ${ROLE_NAMES[id]} costs ${needed} for the next wave.`:''
}

/** A preparation undo cannot roll back combat, rewards, a different run, or a reload. */
export class PreparationHistory {
 private entries:SaveSnapshotV2[]=[]
 clear(){this.entries=[]}
 get size(){return this.entries.length}
 capture(s:Sim){return s.challenge.siege===2&&!s.waveActive&&!s.over?s.snapshot():null}
 commit(before:SaveSnapshotV2|null,s:Sim){
  if(before&&before.wave===s.wave&&!s.waveActive&&JSON.stringify(before)!==JSON.stringify(s.snapshot())){
   this.entries.push(before);if(this.entries.length>12)this.entries.shift()
  }
 }
 take(s:Sim){
  const p=this.entries.at(-1)
  if(!p||s.waveActive||s.over||p.wave!==s.wave||p.seed!==s.seed||JSON.stringify(p.challenge)!==JSON.stringify(s.challenge)){this.clear();return null}
  return this.entries.pop()!
 }
}
