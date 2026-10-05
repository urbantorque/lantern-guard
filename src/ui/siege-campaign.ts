import {SIEGE_ACTS,siegeAct} from '../game/siege'
import {bestSiegeWave} from '../game/district-projects'
import type {VillageProfile} from '../game/fixed-store'
import type {SaveSnapshotV2} from '../game/sim'
import type {HeroId} from '../game/heroes'
import type {Difficulty} from '../game/defs'
import {keeperSelector,menuButton as button} from './front-menus'
import {fixedEnemyIcon} from '../render/fixed-world'
import {icon} from './icons'

export function siegeTimeline(wave:number){
 return `<ol class="siege-timeline" aria-label="Five acts of the campaign">${SIEGE_ACTS.map(a=>`<li class="${wave>=a.to?'held':wave>=a.from-1&&wave<a.to?'current':''}"><span class="siege-act-number">${wave>=a.to?icon('check'):String(SIEGE_ACTS.indexOf(a)+1).padStart(2,'0')}</span><div><span class="siege-range">Waves ${a.from}–${a.to}</span><h3>${a.name}</h3><p>${a.brief}</p></div><img src="${fixedEnemyIcon(a.boss)}" alt=""/></li>`).join('')}</ol>`
}
export function siegeCampaignScreen(profile:VillageProfile,hero:HeroId,difficulty:Difficulty,preview:string,saved?:SaveSnapshotV2){
 const active=saved&&!saved.over,held=bestSiegeWave(profile),wave=active?saved.wave:0
 const launch=`${keeperSelector(hero,'siege-hero')}<fieldset class="siege-difficulty"><legend>Choose the pressure</legend><div class="segmented">${(['relaxed','standard','nightfall'] as const).map(d=>`<button data-action="siege-mode:${d}" aria-pressed="${difficulty===d}" class="${difficulty===d?'selected':''}">${d==='relaxed'?'Gentle':d==='standard'?'Standard':'Nightfall'}</button>`).join('')}</div><p class="small muted">${difficulty==='nightfall'?'15 light. Stronger fleets. A defeat ends the run. Saves still let you leave and resume.':`${difficulty==='relaxed'?'50':'25'} light. Defeat lets you retry the current act from its saved defence and budget.`}</p></fieldset>${active?'<p class="menu-save-note">Starting again replaces this 40-wave defence. Earned district progress stays.</p>':''}${button('siege-begin','Begin wave 1','primary wide')}`
 return `<div class="siege-introduction"><p class="menu-lead">One canal. Forty waves. Your defence carries through.</p><p>Keep every tower, upgrade and passage choice as the siege grows. Save and continue whenever you leave.</p></div><div class="siege-layout"><section class="siege-route">${siegeTimeline(wave)}<p class="small muted">${held?`Furthest held · ${held}/40 waves`:'Five captains stand between the first lamp and dawn.'}</p></section><section class="siege-launch"><div class="campaign-chart">${preview}<span>40 waves · 5 acts</span></div><h3>The Long Watch</h3><p class="resident-line">“I kept the stall keys. I hoped someone would come back.”<small>Nessa, market keeper</small></p>${active?`${button('resume:siege',`Continue defence · Wave ${Math.min(40,saved.wave+(saved.enemies.length||saved.spawners.length?0:1))}/40`,'primary wide')}<p class="small muted">${siegeAct(Math.max(1,saved.wave)).name} · ${saved.towers.length} towers · ${saved.lives} light</p><details class="siege-new"><summary>Start a new defence</summary>${launch}</details>`:launch}</section></div><nav class="campaign-other" aria-label="Other ways to play">${button('short-practice','Short encounter practice')}${button('expeditions','Expeditions')}${button('choose','Custom watches')}</nav>`
}
