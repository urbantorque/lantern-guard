import type { Enemy, Sim } from './sim'
import type { WaveDef } from './waves'
import type { TechniqueId } from './watch-craft'
import type { VillageProfile } from './fixed-store'
import { EXPEDITIONS } from './watch-depth'

/** A new simulation boundary. Released watches keep their original timings and geometry. */
export const LIVING_RULES = 1 as const
const WEEK_MS = 7 * 86400000
const EPOCH = Date.UTC(2026, 8, 28)
export const currentWeek = (now = Date.now()) => Math.max(0, Math.floor((now - EPOCH) / WEEK_MS))
export const WEEK_RULES = [
  { name:'Quick current', text:'Razorfins and Ramming Skiffs move 20% faster.', reward:'Current pennant' },
  { name:'Iron tide', text:'Armoured enemies carry 25% more shell.', reward:'Copper pennant' },
  { name:'Small beginnings', text:'Start with 620 glow. Wave rewards stay the same.', reward:'Dawn pennant' },
] as const
export function weeklyWatch(week:number,experience=false) {
  const expedition=EXPEDITIONS[week%3],rule=WEEK_RULES[Math.floor(week/3)%3]
  return {week,expedition,rule,seed:(92047+week*7919)>>>0,variant:week%4,glow:rule===WEEK_RULES[2]?620:760,
    id:`weekly:${week}:${experience?'experience1':'living1'}`,date:new Date(EPOCH+week*WEEK_MS).toISOString().slice(0,10)}
}
export function formationAt(n:number,short=false) {
  const cycle=short ? [0,0,1,2,3,0,1,2,3,0,4,5][Math.min(11,n-1)] : n<7?0:(n-7)%6
  return [
    {name:'Open water',hint:'A lighter crossing. Invest before the next formation.',pressure:.84},
    {name:'Iron escort',hint:'Armoured escorts shelter the healer. Heavy hits ignore their cover.',pressure:1.04},
    {name:'Close procession',hint:'A tight crowd. Blasts and chained attacks catch several foes.',pressure:1.02},
    {name:'Runner wake',hint:'Armour draws fire, then runners follow. Leave slowing power downstream.',pressure:1.04},
    {name:'Hidden crossing',hint:'Hidden foes are crossing. Share scout sight across the bend.',pressure:1.02},
    {name:'High tide',hint:'Two entrances, overlapping arrivals. Anchor the shared lower bank.',pressure:1.08},
  ][cycle]
}
export function livingWave(base:WaveDef,n:number,short=false):WaveDef {
  if(!short&&n===40)return {...base,note:'Healing takes 3 seconds. A stunning chime toll interrupts the pulse.'}
  if(!short&&n===10)return {...base,note:'Mire Tyrant calls a crowd after a 2-second warning. Keep blasts near its back.'}
  // Preserve the first counter lessons and boss set pieces.
  if(n<5||(!short&&[6,8,10,11,16,25,30,40].includes(n))||short&&n===12)return base
  const beat=formationAt(n,short)
  const groups=base.groups.map(g=>({...g,count:Math.max(1,Math.round(g.count*beat.pressure))}))
  if(beat.name==='Iron escort') {
    const armour=groups.find(g=>g.type==='shell'||g.type==='vshell')
    if(armour){armour.at=0;armour.gap=1.1
      if(n>=(short?7:12)&&!groups.some(g=>g.type==='mender'))groups.push({type:'mender',count:1,gap:1,at:1.7,src:armour.src})
      for(const g of groups)if(g.type==='mender'){g.at=1.7;g.src=armour.src}
    }
  } else if(beat.name==='Close procession')for(const g of groups){g.gap*=.72;g.at=Math.min(g.at,5)}
  else if(beat.name==='Runner wake')for(const g of groups){if(['shell','vshell'].includes(g.type))g.at=0;if(['skitter','skiff'].includes(g.type))g.at=6}
  else if(beat.name==='High tide')for(const g of groups){g.at*=.65;g.gap*=.9}
  // Some authored set pieces omit this cycle's defining enemy. Keep their own
  // forecast rather than promising an escort, runner or hidden foe that isn't there.
  const armour=groups.some(g=>['shell','vshell'].includes(g.type))
  const matches=beat.name==='Iron escort'?armour&&groups.some(g=>g.type==='mender')
    :beat.name==='Runner wake'?armour&&groups.some(g=>['skitter','skiff'].includes(g.type))
    :beat.name==='Hidden crossing'?groups.some(g=>['veil','vshell'].includes(g.type)):true
  return {...base,groups,...(matches?{encounter:beat.name,note:beat.hint}:{})}
}
/** Cover is directional, local and never stacks. Heavy damage bypasses it. */
export function escortCover(s:Sim,e:Enemy):Enemy|undefined {
  if(!s.challenge.livingWatch||e.def.id!=='mender')return
  return s.enemies.find(o=>o.alive&&['shell','vshell'].includes(o.def.id)&&o.shell>0&&o.seg===e.seg&&o.s>e.s&&o.s-e.s<90)
}
export function livingTechnique(id:TechniqueId){
  const copy:Partial<Record<TechniqueId,{name:string;benefit:string;cost:string}>>={
    'long-embers':{name:'Wildfire',benefit:'Burning defeats spread fire to 2 nearby foes.',cost:'Spread burns deal half damage.'},
    flashpoint:{name:'Flashpoint',benefit:'Heavy hits cash in up to 2s of burning damage.',cost:'The stored burn is consumed.'},
    'deep-freeze':{name:'Still tide',benefit:'Every third chime freezes ordinary foes.',cost:'Chimes reload 15% slower.'},
    'tidal-echo':{name:'Undertow',benefit:'Every fourth chime pushes slowed foes back.',cost:'No push against bosses. Reloads 8% slower.'},
    'forked-current':{name:'Forked current',benefit:'Lightning reaches 2 more enemies.',cost:'Each hit deals 15% less damage.'},
    capacitor:{name:'Capacitor',benefit:'Every third volley doubles its first lightning hit.',cost:'One fewer jump. Reloads 10% slower.'},
  }
  return copy[id]
}

export const MASTERY = [
  {id:'clear-water',name:'Clear water',hint:'Win a watch without letting an enemy through.',reward:'Pearl tower trim'},
  {id:'specialists',name:'A crafted defence',hint:'Win with at least 4 specialised tower types.',reward:'Engraved tower plinths'},
  {id:'night-keeper',name:'Keep the night',hint:'Win with a scout that uses stored sunlight.',reward:'Star lanterns'},
  {id:'weekly',name:'A new current',hint:'Complete any weekly watch.',reward:'District pennants'},
] as const
export type MasteryId=typeof MASTERY[number]['id']
export function earnedMastery(s:Sim):MasteryId[]{
  if(!s.challenge.livingWatch||!s.won||s.challenge.practice)return []
  const ids:MasteryId[]=[]
  if(Object.values(s.stats.leaksBy).every(n=>!n))ids.push('clear-water')
  if(new Set(s.towers.filter(t=>Math.max(t.a,t.b)>=2).map(t=>t.id)).size>=4)ids.push('specialists')
  if(s.towers.some(t=>t.id==='owl'&&t.b>=2&&(t.sunUsed??0)>0))ids.push('night-keeper')
  if(s.challenge.weekly!==undefined)ids.push('weekly')
  return ids
}
export function nextMastery(p:VillageProfile){return MASTERY.find(m=>!p.mastery?.includes(m.id))}
