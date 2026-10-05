import { icon } from './icons'
import { HEROES, HERO_IDS, type HeroId } from '../game/heroes'
import { heroPortrait } from '../render/heroes'
import { fixedEnemyIcon } from '../render/fixed-world'
import { EXPEDITIONS, type ExpeditionId } from '../game/watch-depth'
import { COMMANDS, shortCampaign } from '../game/watch-director'
import {mission} from '../game/story'
import { WATCH_NAMES } from '../game/compact'
import { PROJECTS, projectProgress } from '../game/district-projects'
import type { VillageProfile } from '../game/fixed-store'
import type { SaveSnapshotV2 as SaveSnapshot } from '../game/sim'

export const menuButton=(action:string,label:string,cls='')=>`<button data-action="${action}" class="${cls}">${label}</button>`
const chevron=()=>icon('caretRight')
export function titleScreen(profile:VillageProfile,campaign:SaveSnapshot|undefined,expedition:SaveSnapshot|undefined,siege?:SaveSnapshot){
  const saved=siege&&!siege.over?{snapshot:siege,slot:'siege'}:null
  const completed=PROJECTS.filter(p=>projectProgress(profile,p.id)>=1).length
  const resume=saved?`<button data-action="resume:siege" class="title-primary"><span>Continue defence<small>Wave ${Math.min(40,saved.snapshot.wave+(saved.snapshot.enemies.length||saved.snapshot.spawners.length?0:1))}/40 · ${saved.snapshot.towers.length} towers · ${saved.snapshot.lives} light</small></span>${chevron()}</button>`:''
  const earlier=campaign&&!campaign.over?`<button data-action="resume:campaign" class="title-review">Continue earlier ${campaign.challenge.mission?mission(campaign.challenge.mission)!.name:WATCH_NAMES[campaign.challenge.variant??0]} · ${campaign.wave}/${campaign.challenge.mission?mission(campaign.challenge.mission)!.waves.length:shortCampaign(campaign.challenge)?24:40}</button>`:''
  return `<main class="home nocturne-home"><img class="title-art" src="${import.meta.env.BASE_URL}nightward-nocturne.png" alt="A brass lantern tower watches over a winding canal and the illuminated city after dusk" fetchpriority="high"/><div class="home-shade"></div>
    <header class="title-top"><span class="title-emblem" aria-hidden="true">${icon('waves')}</span>${menuButton('settings',icon('gear')+'<span>Settings</span>','title-settings')}</header>
    <div class="home-content"><p class="eyebrow">A canal defence game</p><h1 class="wordmark" aria-label="Nightward">NIGHT<span>WARD</span></h1><p class="home-intro">Defend the city after dark.</p><div class="home-actions">${resume}
      <button data-action="campaign" class="${saved?'title-secondary':'title-primary'}"><span>${saved?'The Long Watch':'Begin the campaign'}<small>40 waves · One continuous defence</small></span>${chevron()}</button>
      <button data-action="expeditions" class="title-secondary"><span>Play expedition<small>12 waves · Choose your passage</small></span>${chevron()}</button>
      ${siege?.over?menuButton('resume:siege',`${siege.won?'View completed defence':'Review defence'} · Wave ${siege.wave}`,'title-review'):''}
      ${earlier}
      ${!saved&&campaign?.over==='lost'?menuButton('resume:campaign','Review last defence','title-review'):''}
      ${expedition&&!expedition.over?menuButton('resume:commission','Continue saved expedition','title-review'):''}
    </div></div>
    <footer class="title-bottom"><nav aria-label="Explore Nightward">${menuButton('district','The district'+(completed?`<small>${completed} restored</small>`:''))}${menuButton('bestiary','Invaders')}</nav><p>The city sleeps.<br>You keep the light.</p></footer>
  </main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div>`
}

export function keeperSelector(hero:HeroId,action='hero'){
  return `<div class="keeper-select" role="group" aria-label="Choose your keeper">${HERO_IDS.map(id=>`<button data-action="${action}:${id}" class="keeper-option ${id===hero?'selected':''}" aria-pressed="${id===hero}"><img src="${heroPortrait(id)}" alt=""/><span><b>${HEROES[id].name}</b><small>${id==='sol'?'Fire & ignition':id==='mira'?'Control & timing':'Chains & discharge'}</small></span>${id===hero?icon('check'):''}</button>`).join('')}</div>`
}

export const EXPEDITION_BRIEFS={
  sunforge:{title:'Break the convoy.',description:'Armoured fronts, sheltered healers and a siege engine with a vulnerable core.',boss:'dredger' as const,bossName:'The Dredger',acts:['Crack the vanguard','Choose a passage','Ambush the core'],strategy:'Build overlapping heavy damage around the marked bends. Slows hold the core open longer.',colour:'#edba79'},
  moonwake:{title:'Hold the light.',description:'Hidden fleets move between revealing arches. Make every second in sight count.',boss:'gloom' as const,bossName:'Umbra Leviathan',acts:['Cover the moon gates','Guard both entrances','Catch the divided fleet'],strategy:'The moon gates reveal passing foes for six seconds. Build over that water or extend your sight with Scouts.',colour:'#9ad9dd'},
  stormglass:{title:'Break their formation.',description:'A return canal, two firing passes and a captain protected by linked escorts.',boss:'warden' as const,bossName:'The Dreadnought',acts:['Command the island','Separate the escort','Expose the captain'],strategy:'Long reach covers both sides of the upper island. Keep a second defence for the side inlet.',colour:'#b6c9eb'},
}
export function expeditionScreen(props:{hero:HeroId;selected:ExpeditionId;profile:VillageProfile;saved:boolean;preview:(variant:number)=>string;contract:(id:ExpeditionId)=>string}){
  const {hero,selected,profile,preview,contract}=props,e=EXPEDITIONS.find(q=>q.id===selected)!,brief=EXPEDITION_BRIEFS[selected]
  return `<div class="expedition-head"><p class="menu-lead">Three waterways. Three ways to hold the night.</p>${keeperSelector(hero,'expedition-hero')}</div>
  <div class="expedition-browser"><nav class="passage-index" aria-label="Choose an expedition">${EXPEDITIONS.map(q=>`<button data-action="expedition-select:${q.id}" aria-pressed="${q.id===selected}" class="${q.id===selected?'selected':''}"><span class="index-map">${preview(q.variant)}</span><span><b>${q.name.replace('The ','')}</b><small>${WATCH_NAMES[q.variant]}</small></span>${chevron()}</button>`).join('')}</nav>
  <article class="expedition-feature" style="--expedition:${brief.colour}"><div class="expedition-illustration" aria-hidden="true"><div class="route-drawing">${preview(e.variant)}</div><img src="${fixedEnemyIcon(brief.boss)}" alt=""/><span>${brief.bossName}</span></div>
  <div class="expedition-copy"><p class="expedition-format">12 waves · A choice at wave 6</p><h3>${brief.title}</h3><p class="expedition-description">${brief.description}</p><ol class="encounter-arc">${brief.acts.map(a=>`<li>${a}</li>`).join('')}</ol><p class="expedition-strategy">${brief.strategy}</p>
  <div class="expedition-commit">${contract(e.id)}<button class="primary expedition-begin" data-action="expedition:${e.id}">Begin expedition ${chevron()}</button><p class="expedition-reward">${profile.commissions.includes(e.id)?'Keepsake earned':'Keepsake'} · ${e.reward}</p></div></div>
  <div class="expedition-footer"><span>Keepers who held this water</span><div class="mastery-stamps">${HERO_IDS.map(id=>{const won=Object.entries(profile.records).some(([k,r])=>k.startsWith(`expedition:${e.id}:`)&&k.endsWith(`:${id}:standard`)&&r.won);return `<span class="${won?'earned':''}">${won?icon('check'):''}${HEROES[id].name}</span>`}).join('')}</div></div></article></div>
  ${props.saved?`<p class="menu-save-note">Beginning replaces your saved expedition. Your campaign is kept. ${menuButton('resume:commission','Continue saved expedition','text-button')}</p>`:''}
  <p class="keeper-command-note"><b>${HEROES[hero].name} · ${COMMANDS[hero].name}</b>${COMMANDS[hero].help}</p>`
}
