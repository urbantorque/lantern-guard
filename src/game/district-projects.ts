import type { VillageProfile } from './fixed-store'

export const PROJECTS=[
  {id:'market',name:'Night Market',need:'Hold 10 campaign waves or finish Sunforge.',styles:['Saffron awnings','Sea-glass awnings'],colours:['#eead64','#7dd7c4']},
  {id:'observatory',name:'Canal Observatory',need:'Hold 25 campaign waves or finish Moonwake.',styles:['Copper dome','Indigo dome'],colours:['#e99973','#aaa0ee']},
  {id:'gardens',name:'Waterfront Gardens',need:'Finish a campaign or win expeditions with two heroes.',styles:['Coral blossoms','Moon lilies'],colours:['#f6a7b2','#bdf5df']},
] as const
export type ProjectId=typeof PROJECTS[number]['id']
export function projectProgress(p:VillageProfile,id:ProjectId){
  const best=Math.max(0,...Object.entries(p.records).filter(([k,r])=>/^[0-3]:/.test(k)&&!r.practice).map(([,r])=>r.wave))
  const heroes=new Set(Object.entries(p.records).filter(([k,r])=>k.startsWith('expedition:')&&r.won&&!r.practice).map(([k])=>k.split(':').at(-2)))
  if(id==='market')return p.commissions.includes('sunforge')?1:Math.min(1,best/10)
  if(id==='observatory')return p.commissions.includes('moonwake')?1:Math.min(1,best/25)
  return Math.min(1,Math.max(best/40,heroes.size/2))
}
export function validStyles(value:unknown):Partial<Record<ProjectId,0|1>>{
  if(!value||typeof value!=='object')return {}
  return Object.fromEntries(PROJECTS.flatMap(p=>{const v=(value as Record<string,unknown>)[p.id];return v===0||v===1?[[p.id,v]]:[]}))
}
export function districtKeepsakes(p:VillageProfile){return [...p.commissions,...PROJECTS.filter(q=>projectProgress(p,q.id)>=1).map(q=>`project:${q.id}:${p.districtStyles?.[q.id]??0}`)]}
