import type { Challenge, Sim } from './sim'
import type { TowerId, TowerStats } from './defs'
import { ENEMIES } from './defs'
import type { TechniqueId } from './watch-craft'
import type { WaveDef } from './waves'
import { bondName } from './fixed'

export const MASTERY_RULES=1 as const
export type BondName=NonNullable<ReturnType<typeof bondName>>
export const CONTRACTS=[
  {id:'small-company',expedition:'sunforge',name:'Small company',goal:'Win with at most 6 towers at any time and at least one crowned tower.',reward:'Copper laurel crowns'},
  {id:'last-lantern',expedition:'moonwake',name:'The last lantern',goal:'Hold waves 10–12 without leaks. At each wave end, cover the marked bend with 2 attack towers and a Scout.',reward:'Moon-glass lantern charms'},
  {id:'twin-signals',expedition:'stormglass',name:'Twin signals',goal:'Win after triggering Shatterburst 3 times and Beacon Volley 6 times.',reward:'Silver Bond inlays'},
] as const
export type ContractId=typeof CONTRACTS[number]['id']
export const contractDef=(id:unknown)=>CONTRACTS.find(c=>c.id===id)
export interface SurgeState {wave:number;tower:number;phase:'charging'|'held'|'release'|'spent'}
export interface WatchMastery {
  peakTowers:number
  bonds:Partial<Record<BondName,number>>
  lowerWaves:number
  waveLeaks:number
  surge:SurgeState|null
  commands:number
}
export const freshMastery=():WatchMastery=>({peakTowers:0,bonds:{},lowerWaves:0,waveLeaks:0,surge:null,commands:0})

/** Control and armour coverage are Ivo's weak points, not his crowd damage. */
export function masteryStats(s:TowerStats,id:TowerId,hero:Challenge['hero']){
  // Two starter hits should finish a Guttermaw, rather than leave 0.16 health.
  if(hero==='ivo'&&id==='wick'){s.damage=Math.max(1,s.damage);s.range+=6}
  if(hero==='ivo'&&id==='bell')s.slow+=.04
  if(hero==='ivo'&&id==='owl')s.range+=12
  return s
}
export function masteryTechnique(id:TechniqueId){return id==='capacitor'?{benefit:'Every third volley triples its first hit and pierces armour. Seeks a boss or durable target.'}:undefined}

export function masteryWave(base:WaveDef,n:number,short:boolean):WaveDef {
  // Keep all bosses, teaching waves and the authored tactical set pieces intact.
  const quiet=short?[10]:[7,14,19,24,29,36,39]
  const edited=(groups:WaveDef['groups'],extra:Partial<WaveDef>={}):WaveDef=>({...base,...extra,groups,clearBonus:Math.round(base.groups.reduce((n,g)=>n+g.count*ENEMIES[g.type].reward*.25,0)-groups.reduce((n,g)=>n+g.count*ENEMIES[g.type].reward*.25,0))})
  if(quiet.includes(n))return edited(base.groups.map(g=>({...g,count:Math.max(1,Math.ceil(g.count*.6)),gap:g.gap*.65,at:g.at*.65})))
  if((short?[7]:[13,22,34]).includes(n)){
    const groups=base.groups.map((g,i)=>({...g,count:Math.max(1,Math.ceil(g.count*.75)),gap:Math.max(1.15,g.gap*1.35),at:i%2?4:0}))
    return edited(groups,{encounter:'Broken ranks',note:'Spaced arrivals give blasts and chains fewer neighbours. Keep a beam or heavy bolt covering the isolated survivors.'})
  }
  return base
}

export function lowerBend(s:Sim){const seg=s.level.segs.get('e2')!;return seg.line.at(seg.line.length*.72,{x:0,y:0,tx:0,ty:0})}
export function lowerGuard(s:Sim){
  const p=lowerBend(s),towers=s.towers.filter(t=>Math.hypot(t.x-p.x,t.y-p.y)<=s.effRange(t))
  return {damage:towers.filter(t=>!['owl','bell','garden'].includes(t.id)&&t.stats.damage>0).length,scouts:towers.filter(t=>t.id==='owl').length}
}
export function contractStatus(s:Sim){
  const def=contractDef(s.challenge.contract),m=s.mastery;if(!def||!m)return null
  if(def.id==='small-company'){const crowned=s.towers.some(t=>t.refinement);return {def,met:m.peakTowers<=6&&crowned,failed:m.peakTowers>6,short:`${m.peakTowers}/6 towers`,progress:`${m.peakTowers}/6 peak towers · ${crowned?'crown ready':'crown needed'}`}}
  if(def.id==='last-lantern'){const g=lowerGuard(s);return {def,met:m.lowerWaves===3,failed:s.wave>=10&&s.wave-(s.waveActive?1:0)-9>m.lowerWaves,short:`${m.lowerWaves}/3 holds`,progress:`${m.lowerWaves}/3 clean holds · bend: ${Math.min(g.damage,2)}/2 attacks, ${Math.min(g.scouts,1)}/1 Scout`}}
  const shatter=m.bonds.Shatterburst??0,beacon=m.bonds['Beacon Volley']??0
  return {def,met:shatter>=3&&beacon>=6,failed:false,short:`${Math.min(3,shatter)+Math.min(6,beacon)}/9 signals`,progress:`Shatterburst ${Math.min(3,shatter)}/3 · Beacon Volley ${Math.min(6,beacon)}/6`}
}
export const commandAvailable=(s:Pick<Sim,'challenge'|'techniques'>)=>!!s.challenge.watchMastery&&s.challenge.expedition==='sunforge'&&s.challenge.hero==='ivo'&&s.techniques.includes('capacitor')

/** Cosmetic timing only: every simulation tick still runs at DT. Do not rush threats or held commands. */
export function cleanupSpeed(s:Sim):number {
  if(s.director?.command&&s.director.command.phase!=='spent')return 1
  if(!s.challenge.watchMastery||!s.waveActive||s.spawners.length||s.over||s.mastery?.surge&&['charging','held','release'].includes(s.mastery.surge.phase))return 1
  const enemies=s.enemies.filter(e=>e.alive)
  if(!enemies.length||enemies.length>2||enemies.some(e=>e.def.boss||e.def.split||e.shell>0||e.def.hidden||e.remaining<320))return 1
  return enemies.every(e=>s.towers.some(t=>!['bell','garden'].includes(t.id)&&t.stats.damage>=e.hp&&Math.hypot(t.x-e.x,t.y-e.y)<s.effRange(t)))?1.6:1
}

/** Command targeting favours a boss, then a durable target; the leak rescue rule stays first. */
export function surgeTarget(candidates:readonly import('./sim').Enemy[]){
  return [...candidates].sort((a,b)=>{
    const urgentA=a.remaining<a.speedNow*1.2,urgentB=b.remaining<b.speedNow*1.2
    if(urgentA||urgentB)return urgentA&&urgentB?a.remaining-b.remaining:urgentA?-1:1
    return Number(!!b.def.boss)-Number(!!a.def.boss)||(b.hp+b.shell)-(a.hp+a.shell)||a.uid-b.uid
  })[0]??null
}
