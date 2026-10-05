import {readJSON,writeJSON} from './fixed-store'
import {decodeRun,encodeRun,validSnapshot} from './save-store'
import {Sim,type SaveSnapshotV2} from './sim'
import {sameSiege,siegeBoundary,siegeCheckpointWave} from './siege'

const KEY='siege.checkpoints'
interface ActSaves {v:1;entries:string[]}
function entries():string[]{
 const value=readJSON(KEY) as ActSaves|null
 return value?.v===1&&Array.isArray(value.entries)&&value.entries.length<=5?value.entries.filter(e=>typeof e==='string'):[]
}
/** Immutable pre-preparation saves. Buying, reloading and retrying cannot replace them. */
export function saveActCheckpoint(sim:Sim,blooms:number[]=[]):boolean {
 if(!sim.challenge.siege||sim.challenge.practice||sim.over||sim.waveActive||!siegeBoundary(sim.wave))return false
 const snapshot=sim.snapshot();if(!validSnapshot(snapshot))return false
 const current=entries().filter(raw=>{const run=decodeRun(raw);return run?.snapshot.v===2&&sameSiege(snapshot,run.snapshot)})
 if(current.some(raw=>decodeRun(raw)!.snapshot.wave===snapshot.wave))return true
 return writeJSON(KEY,{v:1,entries:[...current,encodeRun(snapshot,blooms)].slice(-5)} satisfies ActSaves)
}
export function loadActCheckpoint(sim:Sim):{snapshot:SaveSnapshotV2;blooms:number[]}|null {
 if(!sim.challenge.siege||sim.challenge.practice||sim.difficulty==='nightfall')return null
 const snapshot=sim.snapshot(),wave=siegeCheckpointWave(sim)
 for(const raw of entries()){
  const run=decodeRun(raw)
  if(run?.snapshot.v===2&&sameSiege(snapshot,run.snapshot)&&run.snapshot.wave===wave&&!run.snapshot.over&&!run.snapshot.enemies.length&&!run.snapshot.spawners.length&&!run.snapshot.wavesPending.length&&siegeBoundary(wave))return {snapshot:run.snapshot,blooms:run.blooms}
 }
 return null
}
export function retrySiegeAct(sim:Sim):{sim:Sim;blooms:number[]}|null {
 if(sim.over!=='lost')return null
 const saved=loadActCheckpoint(sim);if(!saved)return null
 saved.snapshot.stats.retries=(sim.stats.retries??0)+1
 return {sim:Sim.restore(saved.snapshot),blooms:saved.blooms}
}
