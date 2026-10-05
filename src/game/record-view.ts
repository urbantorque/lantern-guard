import { CAMPAIGN_WAVES } from './watch-director'
import type { Difficulty } from './defs'
import type { HeroId } from './heroes'

/** One decoder for every published long-watch record. Unknown formats earn no credit. */
export function watchRecord(key:string,wave:number) {
  const match=/^(?:(chapter[12]|endurance[12]):)?([0-3]):(relaxed|standard|nightfall)(?::(sol|mira|ivo))?:(standard|practice)$/.exec(key)
  if(!match)return null
  const format=match[1]??'original',chapter=format.startsWith('chapter')
  const held=Math.max(0,Math.min(chapter?24:40,Math.floor(wave)))
  return {format,map:Number(match[2]),difficulty:match[3] as Difficulty,hero:match[4] as HeroId|undefined,practice:match[5]==='practice',wave:held,restorationWave:chapter?(held?CAMPAIGN_WAVES[held-1]:0):held}
}
