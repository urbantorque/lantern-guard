import type {Sim,Enemy} from './sim'
import {dredgerOpen} from './watch-craft'
import {wardenEscorts} from './harbour'

export function bossReadout(s:Sim,e:Enemy){
 if((e.signalT??0)>0)return {phase:'signal',label:e.def.id==='bloomheart'?'HEALING SIGNAL':e.def.id==='warden'?'ESCORT SIGNAL':'BROOD SIGNAL',colour:'#ffab88',help:`${e.signalT!.toFixed(1)}s · ${e.channelLink!==undefined?'break the tether or interrupt':'interrupt the call'}`}
 if((e.exposedT??0)>0)return {phase:'exposed',label:'INTERRUPTED',colour:'#d9ffb6',help:`Heavy hits +20% · ${Math.ceil(e.exposedT!)}s`}
 if(e.def.id==='dredger')return dredgerOpen(e)?{phase:'exposed',label:'CORE OPEN',colour:'#d9ffb6',help:'Damage +40% · slow it in the marked bend'}:{phase:'shielded',label:'PLATES CLOSED',colour:'#d9bd92',help:'Prepare heavy damage at the marked bends'}
 if(e.def.id==='warden'&&wardenEscorts(s,e).length)return {phase:'shielded',label:'ESCORT SHIELD',colour:'#d9bd92',help:'Clear the linked escorts'}
 if(e.def.id==='gloom'&&e.shrouded)return {phase:'shielded',label:'SPLIT AHEAD',colour:'#c3c7fa',help:'Keep damage beyond the meeting stone'}
 return {phase:'advance',label:'ADVANCING',colour:'#ffb9a5',help:e.def.id==='toad'?'Brood call at half health':'Stop it before the lantern'}
}
