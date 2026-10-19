import {COACH,recoveryPlan,threatPlan} from '../game/watch-coach'
import {ROLE_NAMES} from '../game/watch-clarity'
import type {Sim} from '../game/sim'
import {fixedTowerIcon} from '../render/fixed-towers'
import {fixedEnemyIcon} from '../render/fixed-world'
import {icon} from './icons'

export function lessonCard(s:Sim,lesson:{id:string;text:string}){
 const cue=COACH[lesson.id]
 return `<div class="coach-explanation">${cue?`<div class="coach-pair" aria-hidden="true"><img src="${fixedTowerIcon(cue.tower,0,0,0,s.challenge.hero)}"/>${icon('caretRight')}${cue.enemy?`<img src="${fixedEnemyIcon(cue.enemy)}"/>`:icon('waves')}</div><div><b>${cue.title}</b><p>${cue.effect}</p></div>`:`<p>${lesson.text}</p>`}</div><div class="coach-actions"><button data-action="lesson" aria-label="Dismiss this teaching tip">Got it</button><button data-action="coach-hide">Hide tips</button></div>`
}
export function threatCard(s:Sim,wave:number){
 const plan=threatPlan(s,wave);if(!plan)return ''
 return `<aside class="counter-plan"><img src="${fixedTowerIcon(plan.tower,0,0,0,s.challenge.hero)}" alt="${ROLE_NAMES[plan.tower]}"/><div><b>${plan.title}</b><p>${plan.text}</p></div></aside>`
}
export function recoveryCard(s:Sim){
 const plan=recoveryPlan(s);if(!plan)return ''
 return `<aside class="counter-plan recovery-plan"><img src="${fixedTowerIcon(plan.tower,0,0,0,s.challenge.hero)}" alt="${plan.role}"/><div><b>Try this adjustment</b><p>${plan.text}</p><small>Based on the last breach. Check coverage before you buy.</small></div></aside>`
}
