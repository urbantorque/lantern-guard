import type { Sim, Tower, Enemy } from './sim'
import type { HeroId } from './heroes'
import type { TowerId, TowerStats } from './defs'
import type { WaveDef } from './waves'
import { techniqueWaves, techniqueRound } from './watch-experience'

export const CRAFT_RULES=1 as const
export const TECHNIQUES=[
  {id:'dividend',hero:'sol',round:0,name:'Day dividend',benefit:'Daylight harvests +18%.',cost:'Night harvests −12%.'},
  {id:'afterglow',hero:'sol',round:0,name:'Ember watch',benefit:'Night attacks deal +8% damage.',cost:'Day attacks deal −4%.'},
  {id:'long-embers',hero:'sol',round:1,name:'Long embers',benefit:'Burns last 1.5s longer.',cost:'Burn damage per second −10%.'},
  {id:'flashpoint',hero:'sol',round:1,name:'Flashpoint',benefit:'Burn damage per second +40%.',cost:'Burns expire 30% sooner.'},
  {id:'stillwater',hero:'mira',round:0,name:'Stillwater',benefit:'Chime slows last 25% longer.',cost:'Attack damage −4%.'},
  {id:'moon-sight',hero:'mira',round:0,name:'Moon sight',benefit:'Scout sight and shelter +15%.',cost:'Chime slows are 15% weaker.'},
  {id:'deep-freeze',hero:'mira',round:1,name:'Deep freeze',benefit:'Chime slows are 5 points stronger.',cost:'Chime slows expire 15% sooner.'},
  {id:'tidal-echo',hero:'mira',round:1,name:'Tidal echo',benefit:'Chimes stun at least every 4 tolls.',cost:'Chimes reload 8% slower.'},
  {id:'circuit',hero:'ivo',round:0,name:'Circuit',benefit:'Nearby pairs fire 10% faster.',cost:'Isolated towers fire 5% slower.'},
  {id:'outrider',hero:'ivo',round:0,name:'Outrider',benefit:'Isolated towers gain 10% reach.',cost:'Close groups deal 4% less damage.'},
  {id:'forked-current',hero:'ivo',round:1,name:'Forked current',benefit:'Lightning jumps to one extra foe.',cost:'Each hit deals 10% less damage.'},
  {id:'capacitor',hero:'ivo',round:1,name:'Capacitor',benefit:'Lightning damage +18%.',cost:'Lightning reloads 10% slower.'},
] as const
export type TechniqueId=typeof TECHNIQUES[number]['id']
export function techniqueOffers(s:Pick<Sim,'challenge'|'techniques'|'planningWave'>){
  if(!s.challenge.watchCraft||!s.challenge.hero||s.techniques.length>=(s.challenge.watchDirector?1:2))return []
  const wave=techniqueWaves(s.challenge)
  return s.planningWave>=wave[s.techniques.length]?TECHNIQUES.filter(t=>t.hero===s.challenge.hero&&t.round===techniqueRound(s.challenge,s.techniques.length)):[]
}
export function validTechniques(ids:unknown,hero:HeroId|undefined,wave:number,short:boolean,experience=false,directed=false){
  const c={...(short?{expedition:'sunforge' as const}:{}),...(experience?{watchExperience:1 as const}:{}),...(directed?{watchDirector:1 as const}:{})}
  return Array.isArray(ids)&&ids.length<=(directed?1:2)&&ids.every((id,i)=>TECHNIQUES.some(t=>t.id===id&&t.hero===hero&&t.round===techniqueRound(c,i))&&wave+1>=techniqueWaves(c)[i])
}
export function techniqueStats(stats:TowerStats,id:TowerId,ids:readonly TechniqueId[],living=false){
  if(ids.includes('stillwater')){stats.slowDur*=1.25;stats.damage*=.96}
  if(ids.includes('moon-sight')){if(id==='owl')stats.range*=1.15;if(id==='bell')stats.slow*=.85}
  if(ids.includes('long-embers')&&stats.burn>0&&!living){stats.burnDur+=1.5;stats.burn*=.9}
  if(ids.includes('flashpoint')&&stats.burn>0&&!living){stats.burn*=1.4;stats.burnDur*=.7}
  if(ids.includes('deep-freeze')&&stats.slow>0){if(living){stats.stunEvery=3;stats.stunDur=Math.max(.7,stats.stunDur);stats.interval*=1.15}else{stats.slow=Math.min(.8,stats.slow+.05);stats.slowDur*=.85}}
  if(ids.includes('tidal-echo')&&id==='bell'){if(!living){stats.stunEvery=stats.stunEvery?Math.min(4,stats.stunEvery):4;stats.stunDur=Math.max(.3,stats.stunDur)}stats.interval*=1.08}
  if(ids.includes('forked-current')&&id==='storm'){stats.count+=living?2:1;stats.damage*=living?.85:.9}
  if(ids.includes('capacitor')&&id==='storm'){if(living)stats.count=Math.max(1,stats.count-1);else stats.damage*=1.18;stats.interval*=1.1}
  return stats
}
export function hasNeighbour(s:Sim,t:Pick<Tower,'x'|'y'|'uid'>){return s.towers.some(o=>o.uid!==t.uid&&(o.x-t.x)**2+(o.y-t.y)**2<=140**2)}
export const DREDGER_BENDS=[{segment:'w1',fraction:.56},{segment:'e2',fraction:.52}] as const
export const DREDGER_WINDOW=125
export function dredgerOpen(e:Pick<Enemy,'seg'|'s'>){return DREDGER_BENDS.some(b=>e.seg?.id===b.segment&&Math.abs(e.s-e.seg.line.length*b.fraction)<=DREDGER_WINDOW)}
export function craftWave(wave:WaveDef,n:number,expedition?:string):WaveDef{
  if(expedition==='sunforge'&&n===12)return {...wave,groups:wave.groups.map(g=>g.type==='toad'?{...g,type:'dredger'}:g),encounter:'The Dredger',note:'Its armour opens at the two marked bends. Overlap damage there; slows extend each opening.'}
  return wave
}
export function towerObstacle(s:Sim,t:Tower){
  const foes=s.enemies.filter(e=>e.alive&&(e.x-t.x)**2+(e.y-t.y)**2<=s.effRange(t)**2)
  if(foes.length&&foes.every(e=>!s.canSee(e,t.stats.detect)))return 'Hidden foes: add scout sight.'
  if(!t.stats.heavy&&t.id!=='owl'&&foes.some(e=>e.shell>0))return 'Armour resists these hits. Add heavy damage.'
  if(s.challenge.watchCraft&&s.techniques.includes('circuit'))return hasNeighbour(s,t)?'Circuit active · +10% fire rate':'Isolated · 5% slower'
  if(s.challenge.watchCraft&&s.techniques.includes('outrider'))return hasNeighbour(s,t)?'Close group · 4% less damage':'Outrider active · +10% reach'
  return ''
}
