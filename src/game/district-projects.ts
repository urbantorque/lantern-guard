import {missionWon,type MissionId} from './story'
import {SIEGE_RESTORATION} from './siege'
import { CONTRACTS } from './watch-mastery'
import { watchRecord } from './record-view'
import type { VillageProfile } from './fixed-store'

export const PROJECTS=[
  {id:'market',name:'Night Market',need:'Hold 8 chapter waves or finish Sunforge.',styles:['Saffron awnings','Sea-glass awnings'],colours:['#eead64','#7dd7c4']},
  {id:'observatory',name:'Canal Observatory',need:'Hold 16 chapter waves or finish Moonwake.',styles:['Copper dome','Indigo dome'],colours:['#e99973','#aaa0ee']},
  {id:'gardens',name:'Waterfront Gardens',need:'Finish a campaign or win expeditions with two heroes.',styles:['Coral blossoms','Moon lilies'],colours:['#f6a7b2','#bdf5df']},
] as const
export type ProjectId=typeof PROJECTS[number]['id']
export const PROJECT_STEPS:Record<ProjectId,{missions:MissionId[];names:string[]}>={
 market:{missions:['first-lights','copper-procession','repair-convoy'],names:['Shutters reopened','Awnings raised','Evening stalls lit']},
 observatory:{missions:['moon-gates','broken-formation','last-bloom'],names:['Lens repaired','Dome reopened','Beacon relit']},
 gardens:{missions:['below-island','restore-waterway','last-bloom'],names:['Terraces cleared','Water beds planted','Night flowers open']},
}
export const projectStage=(p:VillageProfile,id:ProjectId)=>Math.min(3,Math.floor(projectProgress(p,id)*3+1e-6))
export function projectNext(p:VillageProfile,id:ProjectId){const stage=projectStage(p,id);return stage<3?`Hold campaign wave ${SIEGE_RESTORATION[id][stage]} · ${PROJECT_STEPS[id].names[stage]}.`:'All three stages restored.'}
export function projectProgress(p:VillageProfile,id:ProjectId){
  const held=bestSiegeWave(p)
  const story=Math.max(PROJECT_STEPS[id].missions.filter(m=>missionWon(p,m)).length,SIEGE_RESTORATION[id].filter(w=>held>=w).length)/3
  const best=Math.max(0,...Object.entries(p.records).flatMap(([key,r])=>{const record=watchRecord(key,r.wave);return record&&!record.practice&&!r.practice?[record.restorationWave]:[]}))
  const heroes=new Set(Object.entries(p.records).filter(([k,r])=>k.startsWith('expedition:')&&r.won&&!r.practice).map(([k])=>k.split(':').at(-2)))
  if(id==='market')return p.commissions.includes('sunforge')?1:Math.max(story,Math.min(1,best/10))
  if(id==='observatory')return p.commissions.includes('moonwake')?1:Math.max(story,Math.min(1,best/25))
  return Math.min(1,Math.max(story,best/40,heroes.size/2))
}
export function bestSiegeWave(p:Pick<VillageProfile,'records'>){return Math.max(0,...Object.entries(p.records).filter(([key,r])=>/^siege1:(relaxed|standard|nightfall):(sol|mira|ivo):standard$/.test(key)&&!r.practice).map(([,r])=>r.wave))}
export function validStyles(value:unknown):Partial<Record<ProjectId,0|1>>{
  if(!value||typeof value!=='object')return {}
  return Object.fromEntries(PROJECTS.flatMap(p=>{const v=(value as Record<string,unknown>)[p.id];return v===0||v===1?[[p.id,v]]:[]}))
}
export function districtKeepsakes(p:VillageProfile){return [...p.commissions,...CONTRACTS.filter(c=>Object.keys(p.contractRecords??{}).some(k=>k.startsWith(c.id+':'))).map(c=>'contract:'+c.id),...(p.mastery??[]).map(id=>'mastery:'+id),...PROJECTS.filter(q=>projectStage(p,q.id)>0).map(q=>`stage:${q.id}:${projectStage(p,q.id)}`),...PROJECTS.filter(q=>projectProgress(p,q.id)>=1).map(q=>`project:${q.id}:${p.districtStyles?.[q.id]??0}`)]}
