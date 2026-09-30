import type { Tower, Enemy } from './sim'
import { dist2 } from '../core/math'

/** Candidates have already passed range, visibility and exclusion checks. */
export function automaticTarget(t:Tower,candidates:readonly Enemy[]):Enemy|null{
  let best:Enemy|null=null,bestScore=Infinity
  for(const e of candidates){
    let score=e.remaining
    if(t.id==='ballista')score-=(e.hp+e.shell)*10000
    else if(t.id==='owl'&&e.def.hidden&&!e.revealedPerm)score-=100000
    else if(t.id==='cracker'||t.id==='storm'){
      const radius=t.stats.splash
      if(radius>0){
        let neighbours=0
        for(const o of candidates)if(o!==e&&dist2(e.x,e.y,o.x,o.y)<=(radius+o.def.radius)**2)neighbours++
        score-=Math.min(neighbours,t.id==='storm'?t.stats.count-1:8)*600
      }
    }
    // Rescue an imminent leak before chasing value further up the canal.
    if(e.remaining<e.def.speed*1.2)score=-1e9+e.remaining
    if(score<bestScore||(score===bestScore&&e.uid<(best?.uid??Infinity))){best=e;bestScore=score}
  }
  return best
}
