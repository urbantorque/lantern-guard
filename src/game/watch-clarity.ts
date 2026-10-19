import type {Sim} from './sim'
import {ENEMIES,type TowerId,type EnemyId} from './defs'
import {siegeBossBreach} from './siege'

export function bossBreachText(s:Sim,id:EnemyId){
  const cost=siegeBossBreach(s.challenge,s.difficulty,id)??ENEMIES[id].weight
  return cost>=999?'Boss escape causes immediate defeat.':`Boss escape costs ${cost} light.`
}

export const ROLE_NAMES:Record<TowerId,string>={wick:'Spark',cracker:'Blast',bell:'Chime',owl:'Scout',garden:'Garden',beam:'Beam',storm:'Storm',ballista:'Bolt'}
const livePanels=new Set(['','tower','build','placement','plot'])
/** Reference screens pause both the simulation and the inter-wave countdown. */
export const battlePaused=(manual:boolean,panel:string)=>manual||!livePanels.has(panel)
export function forecastWave(s:Pick<Sim,'wave'|'finalWave'|'waveOffset'>,current=false){
  return Math.max(s.waveOffset+1,Math.min(s.finalWave,s.wave+(current?0:1)))
}
export function preparationSummary(s:Sim){
  if(!s.challenge.siege)return ''
  if(s.challenge.siege===2){const opening:Record<number,string>={2:s.towers.some(t=>t.id==='bell')?'Chime is ready. Watch runners slow under fire.':'Fast fins incoming. Put a Chime beside your Spark.',3:s.towers.some(t=>t.id==='cracker')?'Blast is ready. Watch it crack the armoured front.':'Armour incoming. Build a Blast over the same bend.',4:s.techniques.length?'Your command charges while towers fire. Use it on the packed front.':'Choose a signature. Your command charges while towers fire.',8:'Mire Tyrant: break the glowing escort or interrupt its call. Escape costs 8 light.'};if(opening[s.wave+1])return opening[s.wave+1]}
  return ({1:'Build a Spark beside the upper bend.',4:'Choose a signature, then prepare your first command.',8:'Break the captain’s escort tether or interrupt its call.',9:'Repair convoys approach. Add heavy damage.',16:'Stack heavy damage over the two marked bends.',17:'Side inlet opens. Cover the arches with Scouts and damage.',24:'The Leviathan divides. Guard the canal beyond the stone.',25:'Both entrances attack. Strengthen your finishing line.',32:'Clear the four escorts to expose the Dreadnought.',33:'Eight waves remain. Cover both banks with sight and heavy damage.',40:'Interrupt the healing signal, then strike the exposed core.'} as Record<number,string>)[s.wave+1]??''
}
export function commandPreview(s:Sim){
  if(s.challenge.siege===2)return s.challenge.hero==='sol'?'Burst the crowd · burning targets take extra damage':s.challenge.hero==='mira'?'Freeze this bend · interrupt a signal':'Strike the strongest target · pierces armour'
  return s.challenge.hero==='mira'?'Freeze foes · interrupt a boss':s.challenge.hero==='sol'?'Detonate visible burns':'One armour-piercing hit'
}
