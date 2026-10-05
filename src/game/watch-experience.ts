import type { Challenge } from './sim'
import type { HeroId } from './heroes'
import type { TowerId, TowerStats } from './defs'
import type { TechniqueId } from './watch-craft'
import type { WaveDef } from './waves'
import { directorPreparation } from './watch-director'
import {storyMission} from './story'
import {SIEGE_PREPARATIONS} from './siege'

export const EXPERIENCE_RULES=1 as const
export const experiencePrice=(id:TowerId,hero:HeroId|undefined,base:number)=>hero==='ivo'&&id==='storm'?280:base
export const experienceUnlock=(id:TowerId,hero:HeroId|undefined,short:boolean)=>hero==='ivo'&&id==='storm'?(short?2:3):hero==='mira'&&id==='bell'?1:undefined
export const techniqueWaves=(c:Challenge)=>c.story?(c.mission==='first-lights'?[1]:[3]):c.watchDirector?(c.expedition?[3]:[4]):c.watchExperience?(c.expedition?[3,7]:[4,12]):c.expedition?[4,8]:[6,16]
export const techniqueRound=(c:Challenge,index:number)=>c.watchExperience?1-index:index
export function experienceStats(s:TowerStats,id:TowerId,hero:HeroId|undefined,ids:readonly TechniqueId[]){
  if(hero==='sol'&&id==='cracker'){s.burn=Math.max(1.5,s.burn);s.burnDur=Math.max(2.5,s.burnDur)}
  if(hero==='ivo'){
    if(id==='storm'){s.damage*=1.3;s.range+=12}
    if(id==='cracker')s.damage*=.82
  }
  if(ids.includes('long-embers')&&id==='cracker')s.damage*=.85
  if(ids.includes('forked-current')&&id==='storm'){s.count++;s.damage*=.94}
  if(ids.includes('tidal-echo')&&id==='bell')s.interval*=1.12/1.08
  return s
}
export function experienceTechnique(id:TechniqueId){
  return ({
    'long-embers':{name:'Wildfire',benefit:'Burning defeats spread fire to 3 nearby foes.',cost:'Spread burns keep 75% strength. Blast hits deal 15% less.'},
    flashpoint:{name:'Flashpoint',benefit:'Heavy hits ignite stored burns for 2.5× their damage.',cost:'Consumes up to 2 seconds of fire. Pair fire with heavy hits.'},
    'deep-freeze':{name:'Still tide',benefit:'Every third chime freezes ordinary foes.',cost:'Chimes reload 15% slower. Bosses resist freezing.'},
    'tidal-echo':{name:'Undertow',benefit:'Every third chime pushes slowed foes back farther.',cost:'No push against bosses. Chimes reload 12% slower.'},
    'forked-current':{name:'Forked current',benefit:'Lightning reaches 3 more enemies.',cost:'Each hit deals 20% less damage. Build for crowds.'},
    capacitor:{name:'Capacitor',benefit:'Every third volley triples its first lightning hit.',cost:'One fewer jump. Reloads 10% slower. Build for heavy targets.'},
  } as Partial<Record<TechniqueId,{name:string;benefit:string;cost:string}>>)[id]
}

/** Preparation is driven by the next encounter, never by real-world waiting. */
export function preparationBeat(c:Challenge,wave:number):string|null {
  if(c.siege)return SIEGE_PREPARATIONS[wave]??null
  if(c.story)return storyMission(c)?.preparations[wave]??null
  if(!c.watchExperience||wave<=1)return null
  if(techniqueWaves(c).includes(wave))return 'Choose your technique and shape the next stretch.'
  if(c.watchDirector)return directorPreparation(c,wave)
  if(c.expedition)return ({6:'The side inlet opens. Cover the shared lower bend.',12:'Final encounter. Inspect the forecast and prepare your defence.'} as Record<number,string>)[wave]??null
  return ({10:'Mire Tyrant brings an escort. Prepare crowd damage.',11:'The side inlet opens. Strengthen the shared lower bank.',25:'The Umbra Leviathan divides at the stone. Prepare the downstream bend.',30:'The Dreadnought brings a shielded escort. Prepare blasts or chains.',40:'The Matriarch signals healing. Prepare a stunning chime or focused damage.'} as Record<number,string>)[wave]??null
}
export function experienceWave(base:WaveDef,n:number,short:boolean):WaveDef {
  const groups=base.groups.map(g=>({...g}))
  // Teach the lower bank before testing it. Later wakes alternate the inlet
  // with the established upper defence instead of making every wave denser.
  if(n===(short?5:9))return {...base,groups:groups.map(g=>({...g,count:Math.max(1,Math.ceil(g.count*.7))})),encounter:'Room to prepare',note:short?'The side inlet opens next. Save glow for the lower bank.':'Mire Tyrant arrives next. Save glow for blasts and control.'}
  if(n===(short?6:11))return {...base,groups,encounter:'The lower bank',note:'The side inlet joins below your opening towers. Add damage where both routes meet.'}
  if(n===(short?9:23)){
    for(const [i,g] of groups.entries()){g.src=i%2?'west':'north';g.at=i%2?8:0}
    return {...base,groups,encounter:'Two-bank wake',note:'Armour upstream, then arrivals from the side inlet. Share sight and damage across the lower bend.'}
  }
  if(!short&&n===24)return {...base,groups:groups.map(g=>({...g,count:Math.max(1,Math.ceil(g.count*.75))})),encounter:'Before the dividing current',note:'The Umbra Leviathan divides at the meeting stone next. Place control and damage beyond it.'}
  if(!short&&n===29)return {...base,groups:groups.map(g=>({...g,count:Math.max(1,Math.ceil(g.count*.75))})),encounter:'Before the captain',note:'The Warden shields itself with escorts next. Blasts and lightning clear them together.'}
  if(!short&&n===39)return {...base,groups:groups.map(g=>({...g,count:Math.max(1,Math.ceil(g.count*.8))})),encounter:'Before the last bloom',note:'A stunning chime can interrupt the Matriarch’s healing. Concentrated damage can clear its neighbours.'}
  return {...base,groups}
}
