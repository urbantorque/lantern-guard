import type { TowerId } from './defs'

/** Only active combat advances the sky. A pause never creates income or rerolls weather. */
// Keep the original 5:4 light ratio, so quicker cycles don't buff Garden income.
export const DAY_SECONDS = 60
export const NIGHT_SECONDS = 48
export const WEATHER_SECONDS = 30
export type Weather = 'clear' | 'rain' | 'mist' | 'breeze'
export interface ClimateState { elapsed:number; waveSeconds:number; gardenExposure:number }
export interface Sky {
  night:boolean
  phaseLeft:number
  cycle:number
  weather:Weather
  weatherLeft:number
  nextWeather:Weather
  atmosphereOnly?:boolean
  steadyCombat?:boolean
}
export const WEATHER:Record<Weather,{name:string;effect:string}> = {
  clear:{name:'Clear skies',effect:'No weather modifier.'},
  rain:{name:'Light rain',effect:'Storm damage +8%; Garden yield +5%.'},
  mist:{name:'River mist',effect:'Unlit towers lose another 4% reach. Owls shelter nearby towers.'},
  breeze:{name:'Canal breeze',effect:'Cracker and Ballista fire 5% faster; enemies move 2% faster.'},
}

/** Separate hash stream: weather never changes enemy RNG draws or rerolls on load. */
export function weatherAt(seed:number,interval:number):Weather {
  let n=(seed^Math.imul(interval+1,0x9e3779b9))>>>0
  n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);n=(n^(n>>>15))>>>0
  return (['clear','clear','rain','mist','breeze'] as Weather[])[n%5]
}
export function skyAt(elapsed:number,seed:number):Sky {
  const cycleLength=DAY_SECONDS+NIGHT_SECONDS,cycle=Math.floor(elapsed/cycleLength)
  const phase=elapsed-cycle*cycleLength,night=phase>=DAY_SECONDS,interval=Math.floor(elapsed/WEATHER_SECONDS)
  return {night,cycle:cycle+1,phaseLeft:(night?cycleLength:DAY_SECONDS)-phase,weather:weatherAt(seed,interval),weatherLeft:WEATHER_SECONDS-elapsed%WEATHER_SECONDS,nextWeather:weatherAt(seed,interval+1)}
}
export const lamplit=(id:TowerId)=>['wick','beam','owl','bell','garden'].includes(id)
export function skyReach(id:TowerId,sky:Sky,warded:boolean) {
  if(sky.steadyCombat)return 1
  let reach=!sky.night&&id==='ballista'?1.12:1
  if(!lamplit(id)&&!warded){if(sky.night)reach*=.85;if(!sky.atmosphereOnly&&sky.weather==='mist')reach*=.96}
  return reach
}
export const skyRate=(id:TowerId,sky:Sky)=>(!sky.steadyCombat&&sky.night&&id==='wick'?1.12:1)*(!sky.atmosphereOnly&&sky.weather==='breeze'&&['cracker','ballista'].includes(id)?1.05:1)
export const skyDamage=(id:TowerId,sky:Sky)=>(!sky.steadyCombat&&sky.night&&id==='beam'?1.12:1)*(!sky.atmosphereOnly&&sky.weather==='rain'&&id==='storm'?1.08:1)
export const skySpeed=(sky:Sky)=>(sky.night?1.08:1)*(!sky.atmosphereOnly&&sky.weather==='breeze'?1.02:1)
export const gardenYield=(sky:Sky)=>(sky.night?.55:1.4)*(!sky.atmosphereOnly&&sky.weather==='rain'?1.05:1)
export const clockText=(seconds:number)=>`${Math.floor(Math.ceil(seconds)/60)}:${String(Math.ceil(seconds)%60).padStart(2,'0')}`
export const SKY_TOWER_HELP:Record<TowerId,string>={
  wick:'Lamplit: keeps its reach and fires 12% faster at night.',
  cracker:'Loses 15% reach at night unless an Owl shelters it. Breeze adds 5% firing speed.',
  bell:'Lamplit: keeps its reach at night. Slowing offsets the faster night current.',
  owl:'Lamplit: shelters towers inside its sight radius from darkness and mist.',
  garden:'Day yield +40%; night yield −45%. Rain adds 5%. Payout averages the time fought in each condition.',
  beam:'Lamplit: keeps its reach and deals 12% more damage at night.',
  storm:'Loses 15% reach at night unless sheltered. Light rain adds 8% damage.',
  ballista:'Day reach +12%; unsheltered night reach −15%. Breeze adds 5% firing speed.',
}
export function skyTowerHelp(id:TowerId,atmosphereOnly=false,steady=false){
  if(steady)return id==='owl'?'Reveals hidden foes. The support stream stores sunlight for visible night pulses.':id==='garden'?'Day income +40%; night income −45%. Paid for time active.':'Stable reach and damage through day and night.'
  if(!atmosphereOnly)return SKY_TOWER_HELP[id]
  return SKY_TOWER_HELP[id].replace(/ Breeze adds 5% firing speed\./,'').replace(/ Light rain adds 8% damage\./,'').replace(/ Rain adds 5%\./,'').replace('darkness and mist','darkness')
}
