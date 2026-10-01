/** One authored tempo for the watch. All combat, cooldowns and sky share this clock. */
export const WATCH_TEMPO = 1.3
export const WAVE_BREATH = 4

/** Initial placement is unhurried. After the first tower, the watch flows continuously. */
export function waveCountdown(current:number|null,dt:number,ready:boolean,active:boolean,hidden:boolean,over:boolean) {
  if(over||active)return null
  if(!ready)return null
  if(hidden)return current
  return Math.max(0,(current??WAVE_BREATH)-dt)
}
