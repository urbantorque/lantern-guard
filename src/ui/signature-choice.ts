import type {Sim} from '../game/sim'
import type {TowerId} from '../game/defs'
import {fixedTowerIcon} from '../render/fixed-towers'
import {ROLE_NAMES} from '../game/watch-clarity'

const choices:Record<string,{benefit:string;cost:string;tip:string;towers:TowerId[]}>={
 'long-embers':{benefit:'Burning enemies spread fire when defeated.',cost:'Blast hits deal 15% less damage.',tip:'Build a Blast beside your Spark. Add a second Blast later to carry the fire farther.',towers:['cracker','wick']},
 flashpoint:{benefit:'A second heavy tower detonates the first tower’s fire.',cost:'Needs two towers covering the same water.',tip:'Place two Blasts along the bend. One starts a burn; the other bursts it.',towers:['cracker','cracker']},
 'deep-freeze':{benefit:'Every third Chime pulse freezes ordinary enemies.',cost:'Chimes reload 15% more slowly.',tip:'Place your Spark and Blast beside a Chime. Their attacks land during the freeze.',towers:['bell','cracker']},
 'tidal-echo':{benefit:'Every third Chime pulse pushes slowed enemies back.',cost:'Bosses cannot be pushed. Chimes reload 12% more slowly.',tip:'Put a Chime just after your Spark to send enemies through its fire again.',towers:['wick','bell']},
 'forked-current':{benefit:'Lightning jumps through longer lines of enemies.',cost:'Each lightning hit is lighter.',tip:'Place a Storm at a busy bend. A Chime keeps the crowd together.',towers:['storm','bell']},
 capacitor:{benefit:'Every third lightning volley delivers a heavy first hit.',cost:'Fewer jumps and slower reloads.',tip:'Place one Storm beside a Chime. Upgrade the Storm to break the armoured front.',towers:['storm','bell']},
}
export function signatureChoice(s:Sim,id:string){return s.challenge.siege===2?choices[id]:undefined}
export function signatureDiagram(s:Sim,id:string){
 const choice=signatureChoice(s,id);if(!choice)return ''
 return `<div class="signature-diagram" aria-label="${choice.towers.map(t=>ROLE_NAMES[t]).join(' with ')}">${choice.towers.map((t,i)=>`${i?'<span class="signature-link" aria-hidden="true">→</span>':''}<figure><img src="${fixedTowerIcon(t,0,0,0,s.challenge.hero)}" alt=""/><figcaption>${ROLE_NAMES[t]}</figcaption></figure>`).join('')}<span class="signature-water" aria-hidden="true"></span></div>`
}
