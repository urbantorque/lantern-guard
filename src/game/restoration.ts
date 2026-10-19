import type {Sim} from './sim'
import {siegeHeld} from './siege'
import type {ProjectId} from './district-projects'

export const RESTORATIONS:Record<number,{title:string;detail:string;project:ProjectId|'beacon'}>={
 5:{title:'The first shop opens',detail:'Shutters lift. A warm light returns to the canal.',project:'market'},
 8:{title:'The night market returns',detail:'The stalls are open. Your defence carries into wave 9.',project:'market'},
 16:{title:'The observatory wakes',detail:'Its lens turns toward the water. Choose the passage your defence will hold.',project:'observatory'},
 24:{title:'Light through the moon gates',detail:'The observatory lights the crossing. Both banks are yours to defend.',project:'observatory'},
 32:{title:'The waterfront blooms',detail:'The gardens open. Eight waves remain before dawn.',project:'gardens'},
 40:{title:'You brought the city back',detail:'The beacon answers every lamp along the water. All 40 waves held.',project:'beacon'},
}
export function earnedRestoration(s:Sim,id:ProjectId){
 if(s.challenge.siege!==2)return 0
 const held=siegeHeld(s),steps=id==='market'?[5,8,16]:id==='observatory'?[16,24,40]:[24,32,40]
 return steps.filter(n=>held>=n).length
}
