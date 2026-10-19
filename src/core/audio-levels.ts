export interface AudioLevels {music:number;effects:number;ambience:number}
export const DEFAULT_AUDIO_LEVELS:AudioLevels={music:.6,effects:.7,ambience:.35}
export function audioLevels(value?:Partial<AudioLevels>):AudioLevels{
 const safe=(key:keyof AudioLevels)=>typeof value?.[key]==='number'&&Number.isFinite(value[key])?Math.max(0,Math.min(1,value[key]!)):DEFAULT_AUDIO_LEVELS[key]
 return {music:safe('music'),effects:safe('effects'),ambience:safe('ambience')}
}
