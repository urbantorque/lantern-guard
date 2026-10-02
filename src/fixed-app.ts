import { LIVING_RULES, currentWeek, weeklyWatch, livingTechnique, MASTERY, nextMastery } from './game/living-watch'
import { BESTIARY, enemyName, bestiaryText } from './game/bestiary'
import { TECHNIQUES, CRAFT_RULES, techniqueOffers, towerObstacle, dredgerOpen, type TechniqueId } from './game/watch-craft'
import { PROJECTS, projectProgress, districtKeepsakes } from './game/district-projects'
import { districtPanorama } from './render/district-projects'
import { watchLesson, watchInsights } from './game/watch-guidance'
import { Sim, DT, type Tower, type SaveSnapshotV2 } from './game/sim'
import { TOWERS, TOWER_ORDER, ENEMIES, DIFFICULTY, type TowerId, type Difficulty, type EnemyId } from './game/defs'
import { ACTS, fixedLevel, stageOf, STAGES, upgradePrice, FIXED_UNLOCK, FIXED_TIPS, COMMISSIONS, bondName, BOND_HELP } from './game/fixed'
import { WATCH_NAMES } from './game/compact'
import { WEATHER, SKY_TOWER_HELP, DAY_SECONDS, NIGHT_SECONDS, clockText, lamplit } from './game/environment'
import { Renderer, type Selection } from './render/renderer'
import { livingBoardBounds } from './render/board-view'
import { fixedTowerIcon } from './render/fixed-towers'
import { fixedEnemyIcon as enemyIcon } from './render/fixed-world'
import { icon } from './ui/icons'
import { sound, profileSound } from './core/audio'
import { watchAppState } from './core/platform'
import { upgradeBenefits, STREAM_ROLES, streamChoice } from './game/fixed-copy'
import { wardenEscorts } from './game/harbour'
import { WATCH_TEMPO, waveCountdown } from './game/watch-tempo'
import { DEPTH_RULES, EXPEDITIONS, EXPEDITION_UNLOCK, expeditionBonus, featuredExpedition, isExpedition, hasSunReserve, landmark, SUN_HELP } from './game/watch-depth'
import { setPalette } from './render/palette'
import { HEROES, HERO_IDS, isHero, heroTower, type HeroId } from './game/heroes'
import { heroPortrait } from './render/heroes'
import { loadProgress } from './game/progress'
import { buildLevel } from './game/level'
import { loadVillage, loadWatch, saveWatch, recordWatch, bestWave, legacyExists, storageMessage, writeJSON, loadPlanning, type Slot } from './game/fixed-store'

const role:Record<TowerId,string>={wick:'Reliable sparks',cracker:'Armour & crowds',bell:'Slows groups',owl:'Reveals hidden foes',garden:'Income over time',beam:'Sustained heavy damage',storm:'Chain lightning',ballista:'Heavy single hits'}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T
const button=(action:string,label:string,cls='',disabled=false,name?:string)=>`<button data-action="${action}" class="${cls}" ${name?`aria-label="${name}"`:''} ${disabled?'disabled':''}>${label}</button>`

export class FixedApp {
  private sim:Sim|null=null
  private renderer:Renderer|null=null
  private profile=loadVillage()
  private slot:Slot='campaign'
  private selection:Selection=null
  private background=false
  private map=0
  private difficulty:Difficulty='standard'
  private drawer=''
  private moving:number|null=null
  private lastFrame=0
  private accumulator=0
  private lastSave=0
  private lastHUD=''
  private recap=''
  private observer:ResizeObserver|null=null
  private previousFocus:HTMLElement|null=null
  private endShown=false
  private guardian='lantern'
  private qa=false
  private hero:HeroId='sol'
  private sessionMuted=false
  private nextWaveIn:number|null=null

  constructor() {
    this.qa=import.meta.env.DEV && new URLSearchParams(location.search).has('qa')
    this.sessionMuted=this.qa||new URLSearchParams(location.search).get('muted')==='1'
    this.map=this.profile.lastMap
    this.hero=this.profile.lastHero??'sol'
    this.guardian=this.profile.guardian??'lantern'
    this.applySettings()
    document.addEventListener('click',e=>{
      const target=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
      if(target && !target.disabled) { sound.unlock(); this.action(target.dataset.action!) }
    })
    document.addEventListener('keydown',e=>this.key(e))
    watchAppState(()=>{this.background=true;this.accumulator=0;this.save();sound.suspend()},()=>{this.background=false;this.lastFrame=0;this.accumulator=0;if(sound.ctx)sound.unlock()})
    this.home()
    if(this.qa) {
      const bar=document.createElement('nav');bar.className='qa-bar';bar.innerHTML=[0,15,30,39].map(n=>button('fixture:'+n,'Test wave '+n)).join('')+button('fixture:day','Test day')+button('fixture:night','Test night')+button('fixture:dredger','Test Dredger');$('app').append(bar)
    }
    requestAnimationFrame(t=>this.frame(t))
  }

  private applySettings() {
    document.documentElement.classList.toggle('large-text',this.profile.settings.largeText)
    document.documentElement.classList.toggle('reduced-motion',this.profile.settings.reducedMotion)
    sound.settings=profileSound(this.profile.settings,this.sessionMuted); sound.applySettings()
    setPalette(this.profile.settings.clearPalette?'clear':'standard')
    if(this.renderer) { this.renderer.settings={calmFx:true,reduceMotion:this.profile.settings.reducedMotion,shake:false}; this.renderer.setBigText(this.profile.settings.largeText) }
  }
  private home() {
    sound.beam(0)
    document.body.classList.remove('playing')
    this.save(); this.sim=null; this.renderer=null; this.observer?.disconnect();this.drawer='';this.nextWaveIn=null
    const saved=loadWatch('campaign'), commission=loadWatch('commission')
    const best=Math.max(0,...Object.entries(this.profile.records).filter(([key])=>/^[0-3]:/.test(key)).map(([,r])=>r.wave))
    $('app').innerHTML=`<main class="home"><div class="title-art" role="img" aria-label="A colourful canal district at sunset, with planted terraces and golden windows"></div><div class="home-content"><p class="eyebrow">The city sleeps. You keep the light.</p><h1>Nightward<span class="title-dot">.</span></h1><p class="home-intro">Build with care.<br>Be ready for the night.</p><div class="home-actions">
      ${saved&&!saved.snapshot.over?button('resume:campaign',`Continue watch <small>Wave ${saved.snapshot.wave || 1} · ${WATCH_NAMES[saved.snapshot.challenge.variant??0]}${saved.snapshot.challenge.hero?" · "+HEROES[saved.snapshot.challenge.hero].name:""}</small>`,'primary'):''}
      ${button('choose','Begin a watch',saved&&!saved.snapshot.over?'secondary':'primary')}
      <div class="home-links">${button('district','The district')}${button('bestiary','Creatures')}${button('expeditions','Expeditions')}${button('settings',icon('gear')+'<span class="sr-only">Settings</span>')}</div>
      ${commission&&!commission.snapshot.over?button('resume:commission',commission.snapshot.challenge.weekly!==undefined?'Continue weekly watch':commission.snapshot.challenge.expedition?'Continue expedition':'Continue commission','text-button'):''}</div><p class="home-note">${best?`Best watch · ${best}/40 waves`:'40 waves · Four waterways · One flowing watch'}</p></div></main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div>`
  }
  private show(title:string,content:string,kind='') {
    if(!this.drawer) this.previousFocus=document.activeElement as HTMLElement
    this.drawer=kind||title
    const live=!!this.sim&&!this.sim.over,main=document.querySelector('main')
    main?.toggleAttribute('inert',!live);main?.classList.toggle('inspecting',live)
    $('modal-root').innerHTML=`${live?'':'<div class="scrim" data-action="close"></div>'}<section class="drawer ${kind} ${live?'live-panel':''}" role="dialog" aria-modal="${!live}" aria-labelledby="dialog-title"><header><h2 id="dialog-title">${title}</h2>${button('close',icon('close')+'<span class="sr-only">Close</span>','icon-button')}</header>${live?'<div class="inspector-toolbar"><span id="inspector-state"></span><b id="inspector-glow"></b></div>':''}<div class="drawer-body">${this.kitCopy(content)}</div></section>`
    $('modal-root').querySelector<HTMLButtonElement>('.drawer button')?.focus()
    this.refresh()
    if(live)this.resize()
  }
  private close() {
    const pad=this.selection?.kind==='tower'?this.selection.tower.pad:this.selection?.kind==='pad'?this.selection.index:null
    this.drawer='';$('modal-root').innerHTML=''; this.selection=null
    document.querySelector('main')?.removeAttribute('inert')
    document.querySelector('main')?.classList.remove('inspecting')
    this.refresh();this.resize()
    const plot=pad!==null?document.querySelector<HTMLButtonElement>(`[data-action="plot:${pad}"]`):null
    if(plot)plot.focus({preventScroll:true})
    else if(this.previousFocus?.isConnected)this.previousFocus.focus()
    else document.querySelector<HTMLButtonElement>('.plot-hit, .home-actions button')?.focus()
  }
  private choose(focusAction?:string) {
    const scroll=document.querySelector<HTMLElement>(".drawer-body")?.scrollTop??0
    this.show('Choose your watch',`${this.heroChoices()}<p class="muted">Four fixed waterways. Every entrance has one clear route to the lantern.</p><div class="map-list">${WATCH_NAMES.map((name,i)=>button(`map:${i}`,`${this.preview(i)}<span><b>${name}</b><small>${['Shared bends and a revealing moon spring.','Wide harbour banks. Storm towers thrive at night.','A tight crossing. The sun terrace rewards early income.','A long lower basin. The tide bell slows the night.'][i]}</small><em>${bestWave(this.profile,i,this.difficulty,this.hero)}/40 waves held</em></span>`,this.map===i?'map-choice selected':'map-choice')).join('')}</div><fieldset><legend>Difficulty</legend><div class="segmented">${(['relaxed','standard','nightfall'] as Difficulty[]).map(d=>button('mode:'+d,DIFFICULTY[d].name,this.difficulty===d?'selected':'')).join('')}</div><p class="muted">${this.difficulty==='relaxed'?'50 light. Gentler enemies. Retry any wave.':this.difficulty==='standard'?'25 light. Thoughtful planning, with a retry when you need it.':'15 light. Stronger enemies. Retrying records this watch as practice.'} Build and upgrade while the watch runs.</p></fieldset>${loadWatch('campaign')&&!loadWatch('campaign')!.snapshot.over?'<p class="notice">Beginning replaces your current fixed-path watch. Your records stay in the district.</p>':''}${button('new','Begin in '+WATCH_NAMES[this.map],'primary wide')}${legacyExists()?'<p class="small muted">Your previous edition’s watch is archived on this device. Its routes cannot carry into this edition. Your journal and achievements remain in the district.</p>':''}`,'choose')
    if(focusAction){document.querySelector<HTMLButtonElement>('[data-action="'+focusAction+'"]')?.focus({preventScroll:true});const body=document.querySelector<HTMLElement>('.drawer-body');if(body)body.scrollTop=scroll}
  }
  private towerDef(id:TowerId){return heroTower(id,this.sim?this.sim.challenge.hero:this.hero)}
  private kitCopy(text:string){
    text=bestiaryText(text)
    const hero=this.sim?this.sim.challenge.hero:this.hero;if(!hero)return text
    text=text.replaceAll('An Owl guides a Wickling hit','A scout guides a spark').replaceAll('an Owl','a scout tower').replaceAll('An Owl','A scout tower')
    for(const id of TOWER_ORDER)text=text.replaceAll(TOWERS[id].name,HEROES[hero].towers[id].name)
    return text.replace(/\bWicklings\b/g,HEROES[hero].towers.wick.name+' towers').replace(/\bMoonbells\b/g,HEROES[hero].towers.bell.name+' towers').replace(/\bLighthouses\b/g,HEROES[hero].towers.beam.name+' towers').replace(/\bOwls\b/g,'scout towers').replace(/\bOwl\b/g,'scout tower').replace(/(?<!Waterfront )\bGardens\b/g,'income towers').replace(/\bCrackers\b/g,'blast towers').replace(/\bBallistas\b/g,'bolt towers')
  }
  private towerFacts(t:Tower){
    const s=t.stats,n=(x:number)=>Number(x.toFixed(2)),facts:string[]=[]
    if(t.id==='garden')facts.push(`<b>${s.income}</b> base glow / wave`)
    else if(t.id==='bell')facts.push(`<b>${Math.round(s.slow*100)}%</b> slow · <b>${n(s.slowDur)}s</b>`)
    else facts.push(`<b>${n(s.damage)}</b> damage ${t.id==='beam'?'/ second':'/ hit'}`)
    if(t.id!=='garden'&&t.id!=='beam')facts.push(`<b>${n(s.interval)}s</b> reload`)
    if(s.count>1&&t.id!=='garden')facts.push(`<b>${s.count}</b> ${t.id==='storm'?'arc targets':'shots'}`)
    if(t.id==='beam')facts.push(`<b>${s.beams}</b> ${s.beams===1?'beam':'beams'}`)
    facts.push(`<b>${Math.round(s.range)}</b> base reach`)
    return `<div class="tower-facts">${facts.map(f=>`<span>${f}</span>`).join('')}</div>`
  }
  private heroChoices(){
    return `<p class="lead">Choose the keeper of this watch.</p><div class="hero-choices" role="group" aria-label="Choose a hero">${HERO_IDS.map(id=>{const h=HEROES[id];return `<button class="hero-choice ${this.hero===id?'selected':''}" data-action="hero:${id}" aria-pressed="${this.hero===id}" style="--hero:${h.colour}"><img src="${heroPortrait(id)}" alt=""/><span><b>${h.name}</b><small>${h.title}</small><em>${h.approach}</em></span>${this.hero===id?icon('check'):''}</button>`}).join('')}</div><p class="small muted">${HEROES[this.hero].tradeoff} Your hero and eight-tower roster stay fixed for the watch.</p>${button('roster',`Meet ${HEROES[this.hero].name}’s eight towers`,'secondary wide')}<h3 class="watch-waterway">Choose a waterway</h3>`
  }
  private roster(){
    const id=this.sim?this.sim.challenge.hero:this.hero,h=id?HEROES[id]:null
    const unlocks=this.sim?.challenge.expedition?EXPEDITION_UNLOCK:FIXED_UNLOCK
    this.show(h?`${h.name} · ${h.title}`:'The original keepers',`${h?`<div class="hero-intro"><img src="${heroPortrait(id!)}" alt="${h.name}, ${h.title}"/><div><p class="lead">${h.approach}</p><p class="small muted">${h.tradeoff}</p></div></div>`:''}<p class="small muted">All three heroes are available immediately. Each tower has two specialisations and five stages.</p><div class="roster-list">${[...TOWER_ORDER].sort((a,b)=>unlocks[a]-unlocks[b]).map(t=>`<article><img src="${fixedTowerIcon(t,1,0,0,id)}" alt=""/><div><h3>${heroTower(t,id).name}</h3><p class="roster-role">${role[t]} · Wave ${unlocks[t]} · ${TOWERS[t].cost} glow</p><p>${h?h.towers[t].trait:TOWERS[t].blurb}</p><small>${heroTower(t,id).paths.map(p=>p.name).join(' / ')}</small></div></article>`).join('')}</div>${!this.sim?button('choose','Back to watch setup','primary wide'):''}`,'roster')
  }
  private preview(map:number) {
    const level=buildLevel(fixedLevel(map,true))
    return `<svg class="map-preview" viewBox="0 0 720 840" aria-hidden="true">${[...level.segs.values()].map(s=>`<polyline points="${s.line.pts.map(p=>p.x+','+p.y).join(' ')}"/>`).join('')}<circle cx="${level.def.home.x}" cy="${level.def.home.y}" r="27"/></svg>`
  }
  private newWatch(commissionId?:string,sameSeed?:number) {
    const c=COMMISSIONS.find(q=>q.id===commissionId)
    this.slot=c?'commission':'campaign'; this.map=c?.variant??this.map
    const hero=sameSeed!==undefined?this.sim?.challenge.hero??this.hero:this.hero
    const challenge={fixed:1 as const,compact:1 as const,guard:1 as const,depth:1 as const,balance:1 as const,variant:this.map,...(hero?{hero}:{}),...(c?{commission:c.id,blockedPad:c.blockedPad,id:`commission:${c.id}:fixed1`,skirmish:{from:c.from,to:c.to,glow:c.glow,seed:c.seed}}:{watchDepth:DEPTH_RULES,watchCraft:CRAFT_RULES,livingWatch:LIVING_RULES})}
    this.profile.lastMap=this.map;this.profile.lastHero=this.hero;writeJSON('profile',this.profile)
    this.begin(new Sim(this.difficulty,challenge,sameSeed??Math.floor(Math.random()*4294967295)))
    this.writePlanning(this.sim!.snapshot()); this.save()
  }
  private begin(sim:Sim,blooms:number[]=[]) {
    document.body.classList.add('playing')
    this.sim=sim;if(sim.challenge.hero)this.hero=sim.challenge.hero;this.map=sim.challenge.variant??0;this.difficulty=sim.difficulty;this.selection=null;this.moving=null;this.accumulator=0;this.endShown=false;this.drawer='';this.recap='';this.lastHUD='';this.nextWaveIn=null
    $('app').innerHTML=`<main class="game"><header class="hud"><div class="stat">${icon('heart')}<b id="light"></b><span>Light</span></div><div class="stat">${icon('sparkle')}<b id="glow"></b><span>Glow</span></div><div class="wave-stat" id="wave"></div>${button('menu',icon('gear')+'<span class="sr-only">Watch menu</span>','icon-button')}</header><section id="battlefield" class="battlefield" aria-label="Battlefield"><canvas id="canvas" aria-label="Fixed paths through the district"></canvas><div id="plots" aria-label="Tower plots"></div><button id="sky" class="sky-strip" data-action="sky"></button><div id="board-status" class="board-status"></div><button id="watch-lesson" class="watch-lesson" data-action="lesson" hidden></button><div id="boss-status" class="boss-status" hidden></div><div class="map-caption"><span>${WATCH_NAMES[this.map]}${sim.challenge.hero?" · "+HEROES[sim.challenge.hero].name:""}</span><span id="act"></span></div></section><footer class="playbar"><div class="wave-brief"><button data-action="forecast" class="forecast-button" id="forecast"></button><span id="wave-recap" class="wave-recap"></span></div><button id="technique-offer" data-action="techniques" class="technique-offer" hidden>Choose a technique</button><div class="watch-flow"><span id="flow-label"></span><div id="wave-progress" class="wave-progress" role="progressbar" aria-label="Wave cleared" aria-valuemin="0" aria-valuemax="100"><i></i></div></div></footer></main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div><p id="save-warning" role="status"></p>`
    this.renderer=new Renderer($<HTMLCanvasElement>('canvas')); this.renderer.attach(sim);if(blooms.length)this.renderer.importBlooms(blooms)
    if(sim.challenge.watchDepth)$('act').outerHTML='<button id="act" class="landmark-link" data-action="landmark"></button>'
    document.querySelector('.hud .icon-button')?.insertAdjacentHTML('beforebegin','<button id="sound-toggle" data-action="sound" class="sound-toggle"></button>')
    this.renderer.settlement=Math.max(this.profile.settlement,loadProgress().settlement??0)
    this.renderer.bunting=this.profile.commissions.includes('market')
    this.renderer.keepsakes=districtKeepsakes(this.profile);this.renderer.crest=this.guardian
    this.applySettings()
    this.observer?.disconnect(); this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('battlefield'));this.resize();this.refresh()
  }
  private resize() {
    if(!this.renderer)return
    this.renderer.fixedLandscape=innerWidth>innerHeight*1.15
    this.renderer.fixedBounds=this.sim?.challenge.livingWatch?livingBoardBounds(this.sim,this.renderer.fixedLandscape):null
    this.renderer.fixedTopInset=getComputedStyle($('sky')).position==='fixed'?0:48
    const r=$('battlefield').getBoundingClientRect(),sheet=document.querySelector('.drawer.live-panel')
    const focus=innerWidth<=999&&innerHeight>innerWidth&&!!this.selection&&['tower','build','plot'].includes(this.drawer)
    this.renderer.fixedFrameHeight=focus?r.height+Math.min(80,(sheet?.getBoundingClientRect().height??0)*.28):0
    this.renderer.fixedFocus=focus?(this.selection?.kind==='tower'?this.selection.tower:this.selection?.kind==='pad'?this.sim!.pads[this.selection.index]:null):null
    this.renderer.resize(r.width,r.height,Math.min(innerWidth<700?1.6:2,devicePixelRatio));this.plots()
  }
  private plots() {
    if(!this.sim||!this.renderer)return
    const focused=$('plots').contains(document.activeElement)?(document.activeElement as HTMLElement).dataset.action:null
    const s=this.sim
    $('plots').innerHTML=s.pads.map((p,i)=>{
      if(!s.padRevealed(i)||s.challenge.blockedPad===i)return ''
      const point=this.renderer!.toScreen(p.x,p.y)
      // A phone inspector frames its selected tower. Off-camera plots return
      // to the keyboard order when the full board is restored on Close.
      if(point.y+22<0||point.y-84>this.renderer!.h)return ''
      const label=p.tower?`${p.tower.def.name}, ${STAGES[stageOf(p.tower)]}, plot ${i+1}`:s.padAvailable(i)?`Build on plot ${i+1}`:`Unlock plot ${i+1} for ${s.plotCost(i)} glow`
      const empty=!p.tower,open=s.padAvailable(i)
      return `<button class="plot-hit${empty?' is-empty':''}${empty&&!open?' is-locked':''}" data-action="plot:${i}" style="left:${point.x}px;top:${point.y}px;--tower-hit:${Math.max(44,Math.min(84,90*this.renderer!.scale))}px" aria-label="${label}">${empty?`<span class="plot-marker" aria-hidden="true">${open?icon('plus'):icon('lock')}</span><span class="plot-label" aria-hidden="true">${open?'Build':s.plotCost(i)+' glow'}</span>`:`<span class="plot-number">${i+1}</span>`}</button>`
    }).join('')
    if(focused)document.querySelector<HTMLButtonElement>(`[data-action="${focused}"]`)?.focus({preventScroll:true})
  }
  private refresh() {
    const s=this.sim;if(!s||!$('light'))return
    $('light').textContent=String(s.lives);$('glow').textContent=String(Math.floor(s.glow))
    const audio=$('sound-toggle');if(audio){audio.innerHTML=icon(sound.settings.muted?'speakerOff':'speaker')+`<span>Sound ${sound.settings.muted?'off':'on'}</span>`;audio.setAttribute('aria-label',this.sessionMuted?'Sound muted for this playtest':this.profile.settings.muted?'Turn sound on':'Turn sound off');audio.setAttribute('aria-pressed',String(!sound.settings.muted));(audio as HTMLButtonElement).disabled=this.sessionMuted}
    const sky=s.sky
    $('battlefield').classList.toggle('is-day',!sky.night)
    $('battlefield').classList.toggle('wave-active',s.waveActive)
    $('sky').classList.toggle('is-night',sky.night)
    const soon=sky.phaseLeft<=10
    $('sky').classList.toggle('sky-soon',soon)
    $('sky').style.setProperty('--phase-progress',`${100*(1-sky.phaseLeft/(sky.night?NIGHT_SECONDS:DAY_SECONDS))}%`)
    $('sky').innerHTML=`<span><i class="sky-disc" aria-hidden="true"></i>${soon?(sky.night?'Dawn in':'Nightfall in'):sky.night?'Night':'Daylight'} <b>${clockText(sky.phaseLeft/WATCH_TEMPO)}</b></span><span>${sky.weatherLeft<=8?'Next: '+WEATHER[sky.nextWeather].name:WEATHER[sky.weather].name} ${icon('caretRight')}</span>`
    $('sky').setAttribute('aria-label',`${sky.night?'Night, dawn':'Daylight, nightfall'} in ${clockText(sky.phaseLeft/WATCH_TEMPO)}. ${WEATHER[sky.weather].name}. Open sky forecast`)
    $('wave').innerHTML=`<span>${s.challenge.weekly!==undefined?'Weekly':s.challenge.expedition?'Expedition':s.isChallenge?'Commission':'Wave'}</span><b>${s.wave-s.waveOffset}<small> / ${s.finalWave-s.waveOffset}</small></b>`
    $('act').textContent=s.challenge.watchDepth?landmark(s).name+' ›':ACTS[Math.min(7,Math.floor(Math.max(0,s.planningWave-1)/5))]
    const remaining=s.enemies.filter(e=>e.alive).length+s.spawners.reduce((n,sp)=>n+sp.group.count-sp.spawned,0)
    const total=s.waveDef(Math.max(1,s.wave)).groups.reduce((n,g)=>n+g.count,0)
    const progress=s.waveActive?Math.max(0,Math.min(100,100*(1-remaining/total))):s.wave?100:0
    $('flow-label').textContent=s.over?'Watch complete':s.waveActive?`${remaining} on the way`:this.nextWaveIn!==null?`Wave ${s.wave+1-s.waveOffset} in ${Math.ceil(this.nextWaveIn)}s`:'Build to begin'
    $('wave-progress').setAttribute('aria-valuenow',String(Math.round(progress)))
    $('wave-progress').style.setProperty('--wave-progress',progress+'%')
    const boss=s.enemies.find(e=>e.alive&&e.def.boss),bossStatus=$('boss-status')
    bossStatus.hidden=!boss
    if(boss){const health=Math.max(0,Math.round(100*boss.hp/boss.maxHp)),phase=boss.def.id==='dredger'?(dredgerOpen(boss)?'Core exposed: +40% damage':'Armour closed: 60% damage'):s.challenge.watchDepth?(boss.def.id==='warden'?(boss.phase===0?'Escorts at 70%':boss.phase===1?'Escorts incoming':boss.phase>=3?'Surging':wardenEscorts(s,boss).length?'Clear escorts':'Shield down'):boss.def.id==='gloom'&&boss.shrouded?'Splits at the stone':boss.def.id==='bloomheart'&&(boss.signalT??0)>0?s.challenge.livingWatch?'Healing: stun to interrupt':'Healing pulse incoming':boss.def.id==='toad'&&boss.phase===0?'Escort at half health':boss.def.id==='toad'&&(boss.signalT??0)>0?'Escort incoming':''):'';bossStatus.innerHTML=`<span>${boss.def.name}${phase?` · ${phase}`:''}</span><b>${health}%</b><i style="width:${health}%"></i>`;bossStatus.setAttribute('aria-label',`${boss.def.name}: ${health}% health. ${phase}`)}
    const previewWave=Math.min(s.finalWave,s.wave+1),preview=s.waveDef(previewWave),groups=preview.groups
    const unique=[...new Set(groups.map(g=>g.type))]
    $('forecast').innerHTML=`<span class="eyebrow">${s.over?'Watch complete':s.wave===s.finalWave?'Final wave':`Next · Wave ${previewWave-s.waveOffset}`} ${icon('caretRight')}</span><b>${bestiaryText(preview.encounter??unique.slice(0,3).map(e=>enemyName(e)).join(' · '))}${!preview.encounter&&unique.length>3?' +'+(unique.length-3):''}</b>`
    $('board-status').textContent=this.moving!==null?'Choose an empty plot · 25 glow':!s.towers.length?(s.wave===s.waveOffset?'Tap a + to build your first tower':'Build a tower to guard the water'):''
    $('wave-recap').textContent=!s.waveActive?this.recap:''
    const phase=$('sky-panel-phase');if(phase)phase.textContent=`${sky.night?'Dawn':'Nightfall'} in ${clockText(sky.phaseLeft/WATCH_TEMPO)}`
    const weather=$('sky-panel-weather');if(weather)weather.textContent=WEATHER[sky.weather].name
    const effect=$('sky-panel-effect');if(effect)effect.textContent=WEATHER[sky.weather].effect
    const next=$('sky-panel-next');if(next)next.textContent=`Next: ${WEATHER[sky.nextWeather].name} in ${clockText(sky.weatherLeft/WATCH_TEMPO)}`
    document.querySelectorAll('.sky-cycle>div').forEach((e,i)=>e.classList.toggle('current',i===Number(sky.night)))
    const offer=$('technique-offer');if(offer){offer.hidden=!!s.over||!techniqueOffers(s).length;offer.textContent=`Choose technique ${s.techniques.length+1}/2`}
    const lesson=watchLesson(s,this.profile.lessons),hint=$('watch-lesson');if(hint){hint.hidden=!lesson||!!this.drawer;hint.textContent=lesson?lesson.text+'  ×':'';hint.setAttribute('aria-label',lesson?lesson.text+' Dismiss tip':'Tip')}
    const obstacle=$('tower-obstacle');if(obstacle&&this.selection?.kind==='tower'){obstacle.textContent=towerObstacle(s,this.selection.tower);obstacle.hidden=!obstacle.textContent}
    $('save-warning').textContent=storageMessage
    document.querySelectorAll<HTMLButtonElement>('[data-cost]').forEach(b=>{b.disabled=s.glow<Number(b.dataset.cost)||s.planningWave<Number(b.dataset.wave??0)||!!s.over})
    if($('inspector-state')){
      $('inspector-state').textContent=s.waveActive?'Watch running':s.towers.length?'Next wave approaching':'Build to begin'
      $('inspector-glow').textContent=Math.floor(s.glow)+' glow'
      if(this.selection?.kind==='tower'){
        const t=this.selection.tower
        const reach=$('tower-reach'),damage=$('tower-damage');if(reach)reach.textContent=String(Math.round(s.effRange(t)));if(damage)damage.textContent=String(Math.round(t.damageDealt??0))
        const status=$('tower-synergy')
        if(status){
          const bond=s.bonds.find(b=>b.a===t.uid||b.b===t.uid),partner=bond?s.towers.find(q=>q.uid===(bond.a===t.uid?bond.b:bond.a)):null
          const parts=[partner?`${bondName(t.id,partner.id,true)} linked`:'',hasSunReserve(t)?`${Math.floor((t.sunlight??0)/6)}/3 night charges${(t.sunPulse??0)>0?' · Pulse active':''}`:''].filter(Boolean)
          status.textContent=parts.join(' · ');status.hidden=!parts.length
        }
      }
    }
  }
  private selectPlot(i:number) {
    const s=this.sim!,p=s.pads[i];if(!p)return
    if(this.moving!==null) {
      const tower=s.towers.find(t=>t.uid===this.moving)!
      if(!p.tower&&s.padAvailable(i))this.change(()=>s.relocate(tower,i))
      this.moving=null;this.close();this.plots();return
    }
    this.selection=p.tower?{kind:'tower',tower:p.tower}:{kind:'pad',index:i}
    if(p.tower){this.towerSheet(p.tower);return}
    const cost=s.plotCost(i)
    if(cost!==null) {this.show('A little more room',`<p>Unlock plot ${i+1} for ${cost} glow. Building a tower costs extra.</p>${`<button data-action="unlock:${i}" data-cost="${cost}" class="primary wide">Unlock · ${cost} glow</button>`}`,'plot');return}
    const cards=TOWER_ORDER.filter(id=>s.keeperAllowed(id)).map(id=>`<button data-action="build:${i}:${id}" data-cost="${s.towerCost(id)}" class="build-card" ${s.glow<s.towerCost(id)?'disabled':''}><img src="${fixedTowerIcon(id,0,0,0,this.sim?.challenge.hero)}" alt=""/><span><b>${this.towerDef(id).name}</b><small>${role[id]} · ${id==='garden'?'Daylight income':id==='owl'?'Night shelter':lamplit(id)?'Lamplit':'Needs night shelter'}</small>${s.previewBond(i,id)?`<em>Pairs with ${s.previewBond(i,id)!.def.name}</em>`:''}</span><strong>${s.towerCost(id)} <small>glow</small></strong></button>`).join('')
    const next=TOWER_ORDER.filter(id=>s.keeperWave(id)>s.planningWave).sort((a,b)=>s.keeperWave(a)-s.keeperWave(b))[0]
    this.show(`Build on plot ${i+1}`,`<p class="muted">Choose a tower. Place it straight into action.</p><div class="build-list">${cards}</div>${next?`<p class="small muted">${this.towerDef(next).name} arrives at wave ${s.keeperWave(next)}.</p>`:''}`,'build')
  }
  private towerUpgrades(t:Tower){
    const s=this.sim!,stage=stageOf(t),path=t.b?1:0
    const buy=(action:string,label:string,cost:number,wave=0,name=label)=>`<button data-action="${action}" data-cost="${cost}" data-wave="${wave}" aria-label="${name} · ${cost} glow" class="live-purchase primary" ${s.glow<cost||s.planningWave<wave?'disabled':''}><span>${label}</span><b>${cost}<small> glow</small></b></button>`
    const benefits=(branch:0|1,bundle=false)=>{
      const lines=upgradeBenefits(s,t,branch,bundle)
      return `<ul class="upgrade-benefits">${lines.slice(0,2).map(l=>`<li>${l}</li>`).join('')}</ul>${lines.length>2?`<details class="upgrade-preview"><summary>All changes</summary><p>${lines.slice(2).join(' · ')}</p></details>`:''}`
    }
    if(stage>=2){
      const wave=s.challenge.expedition?(stage===2?7:10):(stage===2?16:31),cost=upgradePrice(t)
      return `<div class="specialised-upgrade"><div class="upgrade-caption"><b>${STREAM_ROLES[t.id][path]}</b><span>${STAGES[stage]}</span></div>${cost!==null?`${benefits(path)}${buy(`upgrade:${t.uid}:${path}`,s.planningWave<wave?`Opens wave ${wave}`:stage===2?'Master':'Crown',cost,wave)}`:'<p class="stream-complete">Fully upgraded</p>'}</div>`
    }
    return `<p class="upgrade-hint">Choose one path.${stage===0?' Includes foundation.':''}</p><div class="quick-branches">${t.def.paths.map((_,i)=>`<article><h3>${STREAM_ROLES[t.id][i]}</h3>${`<p class="branch-benefit">${streamChoice(s,t,i as 0|1)[0]}</p><p class="branch-cost">${streamChoice(s,t,i as 0|1)[1]}</p>`}${buy(`specialise:${t.uid}:${i}`,'Choose',s.specialiseCost(t)!,0,'Choose '+STREAM_ROLES[t.id][i])}</article>`).join('')}</div><details class="branch-stats"><summary>Compare numbers</summary><div class="quick-branches">${[0,1].map(i=>`<div><b>${STREAM_ROLES[t.id][i]}</b>${benefits(i as 0|1,true)}</div>`).join('')}</div></details>${stage===0?`<div class="foundation-quick"><span>Decide later</span>${buy('upgrade:'+t.uid+':0','Improve',upgradePrice(t)!,0,'Improve foundation')}</div>`:''}`
  }
  private towerSheet(t:Tower,reset=false) {
    const s=this.sim!,stage=stageOf(t)
    const replacing=this.drawer==='tower',body=document.querySelector<HTMLElement>('.drawer-body'),scroll=body?.scrollTop??0,focus=(document.activeElement as HTMLElement)?.dataset.action
    this.selection={kind:'tower',tower:t}
    const upgrades=this.towerUpgrades(t)
    const bond=s.bonds.find(b=>b.a===t.uid||b.b===t.uid),partner=bond?s.towers.find(q=>q.uid===(bond.a===t.uid?bond.b:bond.a)):null
    const partners=s.towers.filter(q=>q!==t&&bondName(t.id,q.id)&&s.sharedCoverage(t,q)&&!s.bonds.some(b=>[b.a,b.b].includes(q.uid)))
    const income=t.id==='garden'?`<p class="notice">${Math.round(t.stats.income*1.4)} glow in a daylight wave, ${Math.round(t.stats.income*.55)} at night, before rain. Pays at wave end for time active. Selling loses unpaid harvest; ${s.finalWave-s.wave} remain. Invested: ${t.spent}. Earned: ${Math.floor(t.earned)}.</p>`:''
    this.show(t.def.name,`<div class="tower-heading compact"><img src="${fixedTowerIcon(t.id,t.a,t.b,t.refinement,this.sim?.challenge.hero)}" alt="${STAGES[stage]} ${t.def.name}"/><div><p class="eyebrow">${role[t.id]}</p><div class="tier-pips" aria-label="Stage ${stage+1} of 5">${[0,1,2,3,4].map(i=>`<i class="${i<=stage?'filled':''}"></i>`).join('')}</div><p class="muted"><span id="tower-reach">${Math.round(s.effRange(t))}</span> reach · <span id="tower-damage">${Math.round(t.damageDealt??0)}</span> damage</p></div></div>${s.challenge.watchDepth?'<p id="tower-synergy" class="tower-synergy" hidden></p><p id="tower-obstacle" class="tower-obstacle" hidden></p>':''}${upgrades}<details class="tower-details"><summary>Stats & manage</summary>${s.challenge.hero?`<p class="notice">${HEROES[s.challenge.hero].towers[t.id].trait}</p>`:''}${income}${this.towerFacts(t)}<p class="small muted">Dashed violet ring: night reach.</p><p class="sky-tower-note">${SKY_TOWER_HELP[t.id]}${!lamplit(t.id)?` <b>${s.sheltered(t)?'Sheltered by an Owl.':'Outside Owl shelter.'}</b>`:''}</p>
      ${s.challenge.watchDepth?`<div class="bond-section"><h3>Automatic Bond</h3>${partner?`<p><b>${bondName(t.id,partner.id,true)}</b> · ${partner.def.name}</p><p class="small muted">${BOND_HELP[bondName(t.id,partner.id,true)!]} Both towers must reach the target.</p>`:`<p class="small muted">Nearby compatible towers pair automatically when their ranges share the stream. One partner per tower; ${s.bondSlots} of 2 slots open.</p>`}${hasSunReserve(t)?`<p class="small muted">${SUN_HELP}</p>`:''}</div>`:s.wave>=5?`<div class="bond-section"><h3>Tower Bond</h3>${partner?`<p><b>${bondName(t.id,partner.id)}</b> with ${partner.def.name}.</p><p class="small muted">${BOND_HELP[bondName(t.id,partner.id)!]} Activated ${bond!.activations} times.</p>${button('unbond:'+t.uid,'Remove Bond','secondary')}`:partners.length?`<p class="small muted">One tower per Bond. ${s.wave>=20?2:1} Bond slots available for this watch.</p>${partners.map(q=>button(`bond:${t.uid}:${q.uid}`,`${bondName(t.id,q.id)} · ${q.def.name}`,'secondary wide',s.bonds.length>=(s.wave>=20?2:1))).join('')}`:'<p class="small muted">A Moonbell and Cracker, or an Owl and Wickling, can bond when their ranges share the stream.</p>'}</div>`:''}
      <p class="small muted">Build, upgrade or move while the watch runs.</p><div class="utility-actions"><button data-action="move:${t.uid}" data-cost="25" class="secondary">Move · 25</button>${button('sell:'+t.uid,`Sell · ${s.sellValue(t)}`,'secondary',s.challenge.commission==='garden'&&t.id==='garden')}</div></details>`,'tower')
    if(replacing){const next=document.querySelector<HTMLElement>('.drawer-body');if(next)next.scrollTop=reset?0:scroll;if(!reset)document.querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)?.focus({preventScroll:true})}
  }
  private forecast() {
    const s=this.sim!,n=Math.min(s.finalWave,s.wave+1),w=s.waveDef(n)
    const counts=new Map<EnemyId,number>();w.groups.forEach(g=>counts.set(g.type,(counts.get(g.type)??0)+g.count))
    this.show(`Wave ${n-s.waveOffset} forecast`,`<p class="lead">${w.note}</p>${button('sky','Day, night & weather','secondary wide')}<div class="enemy-list">${[...counts].map(([id,count])=>`<article><img src="${enemyIcon(id)}" alt=""/><div><h3>${count} ${ENEMIES[id].name}${count>1?'s':''}</h3><p>${FIXED_TIPS[id]}</p></div></article>`).join('')}</div><p class="notice">Entrances: ${[...new Set(w.groups.map(g=>g.src==='west'?'Side inlet':'North stream'))].join(' and ')}. Surviving this wave earns ${Math.round((s.challenge.expedition?expeditionBonus(n):125+n*15)*DIFFICULTY[s.difficulty].bonus)} glow, plus defeated enemies and Gardens.</p>${this.recap?`<p>${this.recap}</p>`:''}`,'forecast')
  }
  private skyForecast() {
    const s=this.sim!,sky=s.sky,exposed=s.towers.filter(t=>!lamplit(t.id)&&!s.sheltered(t))
    this.show('Plan for the sky',`<p id="sky-panel-phase" class="lead">${sky.night?'Dawn':'Nightfall'} in ${clockText(sky.phaseLeft/WATCH_TEMPO)}</p><div class="sky-cycle"><div class="${!sky.night?'current':''}"><b>Daylight</b><span>${clockText(DAY_SECONDS/WATCH_TEMPO)}</span><small>Income +40%<br>Bolt tower reach +12%</small></div><div class="${sky.night?'current':''}"><b>Night</b><span>${clockText(NIGHT_SECONDS/WATCH_TEMPO)}</span><small>Enemies 8% faster<br>Income −45%</small></div></div><h3>Be ready for night</h3><p>Scout towers shelter nearby defences. Without shelter, blast, lightning and bolt towers lose 15% reach.</p><p class="notice">${exposed.length?exposed.length+' exposed '+(exposed.length===1?'tower':'towers')+'. Check that their night reach still covers the stream.':'Your attack towers are lamplit or sheltered.'}</p><p class="small muted">Spark, chime, scout and beam towers keep their reach. Spark towers fire 12% faster at night; beams deal 12% more damage.</p><h3 id="sky-panel-weather">${WEATHER[sky.weather].name}</h3><p id="sky-panel-effect">${WEATHER[sky.weather].effect}</p><p id="sky-panel-next" class="small muted">Next: ${WEATHER[sky.nextWeather].name} in ${clockText(sky.weatherLeft/WATCH_TEMPO)}. Weather shifts about every 23 seconds of combat.</p><details class="rule-details"><summary>How the clock and income work</summary><p class="small muted">The sky advances during combat. A short countdown connects each wave. Reloading or retrying keeps the same forecast.</p><p class="small muted">Harvests average the day, night and weather fought through in that wave. Waiting cannot earn extra glow.</p></details>`,'sky-forecast')
  }
  private bestiary(){
    this.show('Creatures of the canal',`<p class="small muted">Watch the shape. Learn the counter.</p><div class="bestiary-grid">${Object.entries(BESTIARY).map(([id,e])=>`<article class="creature-card"><div class="creature-art"><img src="${enemyIcon(id as EnemyId)}" alt="${e.form}"/></div><div><p class="eyebrow">${e.role}</p><h3>${e.name}</h3><p>${e.counter}</p></div></article>`).join('')}</div>`,'bestiary')
  }
  private techniqueSheet(){
    const s=this.sim!;if(!s.challenge.watchCraft)return
    const offers=techniqueOffers(s).map(t=>({...t,...(s.challenge.livingWatch?livingTechnique(t.id):{})}))
    this.show('Watch techniques',`<p class="small muted">Two choices per watch. Each stays for the run.</p>${s.techniques.map(id=>{const base=TECHNIQUES.find(t=>t.id===id)!,t={...base,...(s.challenge.livingWatch?livingTechnique(id):{})};return `<p class="chosen-technique"><b>${t.name}</b><span>${t.benefit} ${t.cost}</span></p>`}).join('')}${offers.length?`<h3>Choice ${s.techniques.length+1} of 2</h3><div class="technique-cards">${offers.map(t=>`<article><h3>${t.name}</h3><p>${t.benefit}</p><p class="tradeoff">${t.cost}</p>${button('technique:'+t.id,'Choose '+t.name,'primary wide')}</article>`).join('')}</div>`:s.techniques.length===2?'<p class="small muted">Both techniques chosen.</p>':`<p class="small muted">Next choice at wave ${(s.challenge.expedition?[4,8]:[6,16])[s.techniques.length]}.</p>`}`,'techniques')
  }
  private district() {
    const legacy=loadProgress()
    const journal={...legacy.journal};for(const [id,n] of Object.entries(this.profile.journal)) journal[id as EnemyId]=(journal[id as EnemyId]??0)+(n??0)
    this.show('The district',`<img class="district-panorama" src="${districtPanorama(this.profile)}" alt="Night Market, Canal Observatory and Waterfront Gardens; restored buildings glow in your chosen colours"/><p class="small muted">Restore your district. Choose its colours. Rewards are cosmetic.</p><div class="project-list">${PROJECTS.map(p=>{const progress=projectProgress(this.profile,p.id),ready=progress>=1;return `<article><div><h3>${p.name}</h3><span>${ready?'Restored':Math.round(progress*100)+'%'}</span></div><p>${ready?'Choose an appearance.':p.need}</p>${ready?`<div class="segmented">${p.styles.map((name,i)=>`<button data-action="project:${p.id}:${i}" aria-pressed="${(this.profile.districtStyles?.[p.id]??0)===i}" class="${(this.profile.districtStyles?.[p.id]??0)===i?'selected':''}">${name}</button>`).join('')}</div>`:`<progress value="${progress}" max="1" aria-label="${p.name} restoration"></progress>`}</article>`}).join('')}</div>${this.masteryCards()}${button('bestiary','Explore the creature guide','secondary wide')}<div class="keepsakes">${[...COMMISSIONS,...EXPEDITIONS].map(c=>`<span class="keepsake ${this.profile.commissions.includes(c.id)?'earned':''}">${this.profile.commissions.includes(c.id)?icon('check'):icon('lock')}${c.reward}</span>`).join('')}</div><h3>Your watches</h3><div class="records">${WATCH_NAMES.map((name,i)=>`<p><b>${name}</b><span>${(['relaxed','standard','nightfall'] as Difficulty[]).map(d=>`${DIFFICULTY[d].name} ${bestWave(this.profile,i,d)}/40`).join(' · ')}</span></p>`).join('')}</div>${Object.entries(this.profile.records).filter(([k,r])=>k.endsWith(':practice')&&r.practice).length?'<p class="small muted">Assisted Nightfall watches are kept separately as practice.</p>':''}<h3>Field journal</h3><div class="enemy-list">${Object.entries(journal).filter(([,n])=>(n??0)>0).map(([id,n])=>`<article><img src="${enemyIcon(id as EnemyId)}" alt=""/><div><h3>${enemyName(id as EnemyId)} · ${Math.floor(n??0)}</h3><p>${BESTIARY[id as EnemyId].counter}</p></div></article>`).join('')||'<p class="muted">Meet the first Drips to begin your journal.</p>'}</div><p class="small muted">Previous edition: ${legacy.runs} watches and ${Object.values(legacy.feats).filter(Boolean).length} achievements retained.</p>`,'district')
  }
  private commissions() {
    this.show('District Commissions',`<p class="lead">A short watch with one thoughtful constraint.</p><p class="small muted">Playing as ${HEROES[this.hero].name}. Choose another hero in watch setup. Every commission stays available.</p>${COMMISSIONS.map(c=>`<article class="commission"><p class="eyebrow">Five waves · ${WATCH_NAMES[c.variant]}</p><h3>${c.name}</h3><p>${c.desc}</p><p class="small muted">Keepsake: ${c.reward}${this.profile.commissions.includes(c.id)?' · earned':''}</p>${button('commission:'+c.id,'Accept commission','secondary wide')}</article>`).join('')}<p class="small muted">Your campaign has its own save slot. Starting a commission replaces your saved short watch, including an expedition.</p>`,'commissions')
  }
  private expeditions(focusAction?:string){
    const featured=featuredExpedition(),saved=loadWatch('commission'),scroll=document.querySelector<HTMLElement>('.drawer-body')?.scrollTop??0
    const ordered=[featured,...EXPEDITIONS.filter(e=>e!==featured)]
    this.show('Expeditions',`${button('weekly:'+currentWeek(),'Weekly watch · '+weeklyWatch(currentWeek()).rule.name,'weekly-entry wide')}<p class="lead">Twelve waves. Eight towers. One final encounter.</p><p class="small muted">Every expedition stays available. Finish with each hero to complete its mastery stamps.</p><div class="segmented expedition-heroes" role="group" aria-label="Expedition hero">${HERO_IDS.map(id=>`<button data-action="expedition-hero:${id}" aria-pressed="${id===this.hero}" class="${id===this.hero?'selected':''}">${HEROES[id].name}</button>`).join('')}</div><p class="small muted">${HEROES[this.hero].approach}</p>${saved&&!saved.snapshot.over?`<p class="notice">Starting replaces your saved short watch. Your campaign has its own save.</p>${button('resume:commission','Continue saved short watch','secondary wide')}`:''}<div class="expedition-list">${ordered.map(e=>`<article class="expedition-card expedition-${e.id}"><div class="expedition-map" aria-hidden="true">${this.preview(e.variant)}</div><div><p class="eyebrow">${e===featured?'Featured this week':'Always available'} · ${WATCH_NAMES[e.variant]}</p><h3>${e.name}</h3><p>${e.id==='sunforge'?'Ambush the Dredger at marked bends. Slows keep its core exposed longer.':e.desc}</p><p class="expedition-reward">${this.profile.commissions.includes(e.id)?icon('check')+' Earned':'Keepsake'} · ${e.reward}</p><div class="mastery-stamps" aria-label="Hero victories">${HERO_IDS.map(id=>{const won=this.profile.records[`expedition:${e.id}:depth1:standard:${id}:standard`]?.won;return `<span class="${won?'earned':''}" aria-label="${HEROES[id].name}: ${won?'completed':'not completed'}">${won?icon('check'):icon('sparkle')}${HEROES[id].name}</span>`}).join('')}</div>${button('expedition:'+e.id,'Begin expedition','primary wide',false,'Begin '+e.name)}</div></article>`).join('')}</div><p class="expedition-reward">District overture: ${EXPEDITIONS.filter(e=>this.profile.commissions.includes(e.id)).length}/3 keepsakes. Complete the set to add a new soundtrack accompaniment.</p><p class="small muted">New towers arrive by wave 9. Master upgrades open at 7; crowns at 10. Keepsakes change the district’s appearance, never tower strength.</p>${button('commissions','Five-wave commissions','secondary wide')}`,'expeditions')
    if(focusAction){document.querySelector<HTMLButtonElement>(`[data-action="${focusAction}"]`)?.focus({preventScroll:true});const body=document.querySelector<HTMLElement>('.drawer-body');if(body)body.scrollTop=scroll}
  }
  private masteryCards(){
    return `<h3>Master the watch</h3><div class="mastery-goals">${MASTERY.map(m=>{const earned=this.profile.mastery?.includes(m.id);return `<article class="${earned?'earned':''}"><span>${icon(earned?'check':'sparkle')}</span><div><b>${m.name}</b><p>${earned?m.reward+' earned':m.hint}</p>${!earned?`<small>${m.reward}</small>`:''}</div></article>`}).join('')}</div>`
  }
  private weekly(week:number){
    const latest=currentWeek();if(!Number.isInteger(week)||week<0||week>latest)return
    const w=weeklyWatch(week),record=this.profile.records[`${w.id}:standard:${this.hero}:standard`]
    this.show('Weekly watch',`<p class="eyebrow">${w.date} · ${WATCH_NAMES[w.variant]}</p><h3>${w.rule.name}</h3><p class="lead">${w.rule.text}</p><p class="small muted">Twelve waves. ${w.expedition.name}. Same seed for every hero and retry.</p><div class="segmented">${HERO_IDS.map(id=>button(`weekly-hero:${id}:${week}`,HEROES[id].name,id===this.hero?'selected':'')).join('')}</div><p class="weekly-best">${record?`Personal best · ${record.wave}/12 waves · ${record.light} light`:'A fresh watch. Set your first personal best.'}</p>${button('weekly-start:'+week,'Begin weekly watch','primary wide')}<p class="small muted">Replaces your saved short watch. Your campaign is kept.</p><div class="weekly-archive">${button('weekly:'+(week-1),'Earlier watch','secondary',week===0)}${button('weekly:'+(week+1),'Later watch','secondary',week===latest)}</div><p class="small muted">Every past week stays available. No streak to maintain.</p>${this.masteryCards()}`,'weekly')
  }
  private newWeekly(week:number){
    if(!Number.isInteger(week)||week<0||week>currentWeek())return
    const w=weeklyWatch(week)
    this.slot='commission';this.map=w.variant;this.difficulty='standard';this.profile.lastHero=this.hero;writeJSON('profile',this.profile)
    this.begin(new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:DEPTH_RULES,watchCraft:CRAFT_RULES,livingWatch:LIVING_RULES,weekly:week,hero:this.hero,variant:w.variant,expedition:w.expedition.id,id:w.id,skirmish:{from:0,to:12,glow:w.glow,seed:w.seed}},w.seed))
    this.writePlanning(this.sim!.snapshot());this.save()
  }
  private newExpedition(id:string){
    if(!isExpedition(id))return
    const e=EXPEDITIONS.find(e=>e.id===id)!
    this.slot='commission';this.map=e.variant;this.difficulty='standard';this.profile.lastHero=this.hero;writeJSON('profile',this.profile)
    this.begin(new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:DEPTH_RULES,watchCraft:CRAFT_RULES,livingWatch:LIVING_RULES,hero:this.hero,variant:e.variant,expedition:id,id:`expedition:${id}:depth1`,skirmish:{from:0,to:e.waves,glow:e.glow,seed:e.seed}},e.seed))
    this.writePlanning(this.sim!.snapshot());this.save()
  }
  private landmarkSheet(){
    const s=this.sim!;if(!s.challenge.watchDepth)return
    const l=landmark(s)
    this.show(l.name,`<p class="lead">${l.help}</p><p class="small muted">The coloured ring marks its area. This landmark works automatically.</p><h3>Prepare for night</h3><p class="small muted">${SUN_HELP} Choose the support stream on a scout tower to store sunlight.</p><h3>Build a Bond</h3><p class="small muted">The nearest compatible towers pair when they share a stretch of the stream. Existing pairs stay together until moved out of shared reach. One partner per tower.</p><div class="bond-recipes">${([['bell','cracker'],['owl','wick'],['bell','beam'],['garden','storm'],['owl','ballista']] as const).map(([a,b])=>`<p><b>${{bell:'Chime',cracker:'Blast',owl:'Scout',wick:'Spark',beam:'Beam',garden:'Garden',storm:'Storm',ballista:'Bolt'}[a]} + ${{bell:'Chime',cracker:'Blast',owl:'Scout',wick:'Spark',beam:'Beam',garden:'Garden',storm:'Storm',ballista:'Bolt'}[b]}</b><span>${BOND_HELP[bondName(a,b,true)!]}</span></p>`).join('')}</div><p class="small muted">${s.challenge.expedition?'Bond slots open at waves 3 and 7.':'Bond slots open at waves 5 and 20.'} Both towers must reach a target for their bonus to activate.</p>`,'landmark')
  }
  private settings() {
    const s=this.profile.settings
    this.show('Make yourself comfortable',`<h3>Sound</h3>${this.sessionMuted?'<p class="notice">This playtest link is silent. Your saved sound preference is unchanged.</p>':''}<div class="setting-list">${button('setting:muted',`<span>Sound</span><b>${s.muted?'Off':'On'}</b>`,'',this.sessionMuted)}${([['music','Soundtrack & atmosphere'],['effects','Combat sounds'],['largeText','Larger text'],['reducedMotion','Reduced motion'],['clearPalette','Distinct colours']] as const).map(([key,name])=>`<button data-action="setting:${key}" role="switch" aria-checked="${s[key]}"><span>${name}</span><b>${s[key]?'On':'Off'}</b></button>`).join('')}</div><p class="muted">Reduced motion stills the water, weather and tower animation and softens combat effects. The watch continues while you build or browse. Switching apps protects your run and silences sound; returning continues it.</p><h3>District crest</h3><p class="small muted">A cosmetic detail on your towers. Your hero stays the same.</p><div class="segmented">${['lantern','ember','reed','tide'].map(g=>button('guardian:'+g,g[0].toUpperCase()+g.slice(1),this.guardian===g?'selected':'')).join('')}</div><p class="small muted">Keyboard: Tab moves between controls and plots. Enter selects. Escape closes a panel.</p>`,'settings')
  }
  private menu() {const s=this.sim!;this.show('Your watch',`${button('roster',s.challenge.hero?HEROES[s.challenge.hero].name+' · View eight towers':'Original district roster','hero-roster-link secondary wide')}<p>${WATCH_NAMES[this.map]} · ${DIFFICULTY[this.difficulty].name}${this.sim?.challenge.practice?' · Practice':''}</p>${button('forecast','Wave forecast','secondary wide')}${button('bestiary','Creature guide','secondary wide')}${s.challenge.watchCraft?button('techniques','Watch techniques','secondary wide'):''}${button('sky','Day, night & weather','secondary wide')}${button('district','District & journal','secondary wide')}${button('settings','Settings','secondary wide')}${button('home','Save & return to district','secondary wide')}<p class="small muted">Waves never advance while you are away.</p>`,'menu')}
  private result() {
    const s=this.sim!;this.endShown=true
    const won=s.over==='won'
    this.show(won?'The lantern is still alight':'A little light for next time',`<p class="eyebrow">${WATCH_NAMES[this.map]} · ${DIFFICULTY[s.difficulty].name}${s.challenge.practice?' · Practice':''}</p><p class="result-number">${s.wave-(won?0:1)-s.waveOffset}<small> waves held</small></p><p>${won?'The district remembers your watch.':s.lastLeak?`${enemyName(s.lastLeak.enemy)} reached the lantern${s.lastLeak.armoured?' with armour remaining':''}${s.lastLeak.hidden?' while still hidden':''}. ${FIXED_TIPS[s.lastLeak.enemy]}`:'Try building around a longer shared stretch of the stream.'}</p><ul class="watch-insights">${watchInsights(s).map(line=>`<li>${line}</li>`).join('')}</ul>${won?button('rematch','Rematch this seed','primary wide'):button('retry',s.difficulty==='nightfall'?'Retry as practice':'Retry this wave','primary wide',!loadPlanning(this.slot))}${won&&!s.isChallenge?button('nextmap','Try the next waterway','secondary wide'):''}${nextMastery(this.profile)?`<p class="next-goal"><b>Next: ${nextMastery(this.profile)!.name}</b><span>${nextMastery(this.profile)!.hint}</span></p>`:''}${button('home','Return to the district','secondary wide')}`,'result')
    if(won&&s.challenge.expedition&&s.challenge.weekly===undefined){const e=EXPEDITIONS.find(e=>e.id===s.challenge.expedition)!;document.querySelector('.result .drawer-body')?.insertAdjacentHTML('afterbegin',`<p class="earned-reward">${icon('check')} ${e.reward} earned · ${HEROES[this.hero].name} stamp complete</p>`)}
  }
  private change(fn:()=>unknown) {
    if(this.sim!.over)return
    fn();this.save();this.plots();this.refresh()
  }
  private startNextWave(){
    const s=this.sim!;this.nextWaveIn=null
    if(s.over||s.waveActive||!s.towers.length&&s.wave===s.waveOffset)return
    this.writePlanning(s.snapshot());this.recap=''
    if(s.startWave()){
      $('live').textContent=`Wave ${s.wave-s.waveOffset} begins.`;this.save()
      if(this.drawer==='tower'&&this.selection?.kind==='tower')this.towerSheet(this.selection.tower)
      else if(['build','plot'].includes(this.drawer)&&this.selection?.kind==='pad')this.selectPlot(this.selection.index)
      else if(this.drawer==='forecast')this.forecast()
    }
  }
  private action(action:string) {
    const [cmd,a,b]=action.split(':'),s=this.sim
    if(cmd==='fixture'&&import.meta.env.DEV&&['0','15','30','39','day','night','dredger'].includes(a)) {
      void fetch(`${import.meta.env.BASE_URL}artifacts/${a==='dredger'?'craft-dredger-active':`fixed-wave-${a==='day'||a==='night'?'39':a}`}.json`).then(r=>r.json()).then((snap:SaveSnapshotV2)=>{this.qa=true;if(a==='day'||a==='night')snap.climate={elapsed:a==='day'?0:DAY_SECONDS,waveSeconds:0,gardenExposure:0};snap.challenge.hero=this.hero;snap.challenge.watchDepth=DEPTH_RULES;snap.challenge.watchCraft=CRAFT_RULES;snap.techniques=[];this.begin(Sim.restore(snap))})
      return
    }
    if(cmd==='close'){this.close();return}
    if(cmd==='hero'&&isHero(a)&&this.drawer==='choose'){this.hero=a;this.choose(action);return}
    if(cmd==='roster'){this.roster();return}
    if(cmd==='choose'){this.choose();return}
    if(cmd==='map'){this.map=Number(a);this.choose(action);return}
    if(cmd==='mode'){this.difficulty=a as Difficulty;this.choose(action);return}
    if(cmd==='new'){this.newWatch();return}
    if(cmd==='home'){this.home();return}
    if(cmd==='resume'){const run=loadWatch(a as Slot);if(run){this.slot=a as Slot;this.begin(Sim.restore(run.snapshot),run.blooms)}return}
    if(cmd==='bestiary'){this.bestiary();return}
    if(cmd==='project'){const p=PROJECTS.find(p=>p.id===a),style=Number(b);if(p&&projectProgress(this.profile,p.id)>=1&&(style===0||style===1)){this.profile.districtStyles??={};this.profile.districtStyles[p.id]=style;writeJSON('profile',this.profile);if(this.renderer)this.renderer.keepsakes=districtKeepsakes(this.profile);this.district()}return}
    if(cmd==='district'){this.district();return}
    if(cmd==='commissions'){this.commissions();return}
    if(cmd==='weekly'){this.weekly(Number(a));return}
    if(cmd==='weekly-start'){this.newWeekly(Number(a));return}
    if(cmd==='weekly-hero'&&isHero(a)){this.hero=a;this.weekly(Number(b));return}
    if(cmd==='expeditions'){this.expeditions();return}
    if(cmd==='expedition-hero'&&isHero(a)){this.hero=a;this.expeditions(action);return}
    if(cmd==='expedition'){this.newExpedition(a);return}
    if(cmd==='commission'){this.difficulty='standard';this.newWatch(a);return}
    if(cmd==='settings'){this.settings();return}
    if(cmd==='setting'){const k=a as keyof typeof this.profile.settings;if(!(k in this.profile.settings))return;this.profile.settings[k]=!this.profile.settings[k];writeJSON('profile',this.profile);this.applySettings();sound.unlock();this.settings();return}
    if(cmd==='sound'){this.profile.settings.muted=!this.profile.settings.muted;writeJSON('profile',this.profile);this.applySettings();sound.unlock();this.refresh();return}
    if(cmd==='guardian'){this.guardian=a;this.profile.guardian=a;writeJSON('profile',this.profile);if(this.renderer)this.renderer.crest=a;this.settings();return}
    if(!s)return
    if(cmd==='lesson'){const tip=watchLesson(s,this.profile.lessons);if(tip){this.profile.lessons??=[];this.profile.lessons.push(tip.id);if(!this.qa)writeJSON('profile',this.profile)}this.refresh();return}
    if(cmd==='techniques'){this.techniqueSheet();return}
    if(cmd==='technique'){if(s.chooseTechnique(a as TechniqueId)){this.save();this.close();this.recap=(s.challenge.livingWatch?livingTechnique(a as TechniqueId)?.name:undefined)??TECHNIQUES.find(t=>t.id===a)!.name;this.recap+=' chosen.'}return}
    const tower=()=>s.towers.find(t=>t.uid===Number(a))!
    if(cmd==='menu')this.menu()
    if(cmd==='landmark')this.landmarkSheet()
    if(cmd==='sky')this.skyForecast()
    if(cmd==='forecast')this.forecast()
    if(cmd==='plot')this.selectPlot(Number(a))
    if(cmd==='unlock'){this.change(()=>s.unlockPlot(Number(a)));this.selectPlot(Number(a))}
    if(cmd==='build'){this.change(()=>s.build(Number(a),b as TowerId));const t=s.pads[Number(a)].tower;if(t){this.close();this.selection={kind:'tower',tower:t};this.recap=`${t.def.name} ready.`}}
    if(cmd==='upgrade'){const t=tower();if(t){this.change(()=>stageOf(t)===3?s.refine(t):s.upgrade(t,Number(b) as 0|1));this.towerSheet(t,true)}}
    if(cmd==='specialise'){const t=tower();if(t){this.change(()=>s.specialise(t,Number(b) as 0|1));this.towerSheet(t,true)}}
    if(cmd==='bond'){const t=tower();this.change(()=>s.bond(t,s.towers.find(q=>q.uid===Number(b))!));this.towerSheet(t)}
    if(cmd==='unbond'){const t=tower();this.change(()=>s.unbond(t));this.towerSheet(t)}
    if(cmd==='move'){this.moving=Number(a);this.close()}
    if(cmd==='sell'){this.change(()=>s.sell(tower()));this.close()}
    if(cmd==='retry'){const p=loadPlanning(this.slot);if(p){p.challenge.practice ||=s.difficulty==='nightfall';p.stats.retries=(s.stats.retries??0)+1;this.begin(Sim.restore(p));this.save()}}
    if(cmd==='rematch'){if(s.challenge.weekly!==undefined)this.newWeekly(s.challenge.weekly);else if(s.challenge.expedition)this.newExpedition(s.challenge.expedition);else this.newWatch(s.challenge.commission,s.seed)}
    if(cmd==='nextmap'){this.map=(this.map+1)%4;this.newWatch()}
    this.refresh()
  }
  private key(e:KeyboardEvent) {
    if(e.key==='Escape'){if(this.drawer)this.close();else{this.moving=null;this.refresh()}return}
    if(this.drawer&&(!this.sim||!!this.sim.over)&&e.key==='Tab') {
      const all=[...document.querySelectorAll<HTMLElement>('.drawer button:not(:disabled), .drawer summary, .drawer a[href], .drawer [tabindex="0"]')],first=all[0],last=all[all.length-1]
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
  }
  private writePlanning(snapshot:SaveSnapshotV2) {if(!this.qa)writeJSON(this.slot+'.planning',snapshot)}
  private save() {if(!this.qa&&this.sim&&this.renderer)saveWatch(this.sim,this.renderer.exportBlooms(),this.slot)}
  private frame(now:number) {
    const dt=Math.min(.1,(now-(this.lastFrame||now))/1000);this.lastFrame=now
    const s=this.sim,r=this.renderer
    if(s&&r) {
      const hidden=document.hidden||this.background
      this.nextWaveIn=waveCountdown(this.nextWaveIn,dt,s.towers.length>0||s.wave>s.waveOffset,s.waveActive,hidden,!!s.over)
      if(this.nextWaveIn===0&&!hidden)this.startNextWave()
      if(!hidden&&s.waveActive&&!s.over){this.accumulator+=dt*WATCH_TEMPO;while(this.accumulator>=DT&&s.waveActive&&!s.over){s.step(DT);this.accumulator-=DT}}
      else this.accumulator=0
      for(const e of s.events) {
        if(e.t==='waveEnd') {
          const damage=s.waveReports.find(q=>q.wave===e.n)?.damage??{}
          const top=Object.entries(damage).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]
          this.recap=`Wave ${e.n-s.waveOffset} held · +${e.bonus+e.income} glow${top?` · ${this.towerDef(top[0] as TowerId).name}`:''}`
          this.nextWaveIn=null
          const unlock=TOWER_ORDER.find(id=>s.keeperWave(id)===s.wave+1)
          if(unlock)this.recap+=` · ${this.towerDef(unlock).name} unlocked`
          if(!this.qa)recordWatch(this.profile,s);r.settlement=Math.max(r.settlement,this.profile.settlement);r.keepsakes=districtKeepsakes(this.profile);this.resize();$('live').textContent=this.recap
          this.save()
          if(this.drawer==='tower'&&this.selection?.kind==='tower')this.towerSheet(this.selection.tower)
        }
        if(e.t==='defeat'||e.t==='victory'){if(!this.qa)recordWatch(this.profile,s);this.save()}
      }
      r.handleEvents(s)
      r.draw(s,dt,{selection:this.selection,preview:null,armed:null,hint:null,paused:document.hidden||this.background})
      if(s.over&&!this.endShown)this.result()
      const key=`${s.glow}:${s.lives}:${s.wave}:${s.waveActive}:${s.enemies.length}:${Math.floor(s.climate.elapsed)}:${Math.ceil(this.nextWaveIn??-1)}`
      if(key!==this.lastHUD){this.lastHUD=key;this.refresh()}
      if(now-this.lastSave>5000){this.lastSave=now;this.save()}
    }
    // Title music also starts on the first gesture. Hidden tabs never schedule audio.
    if(!document.hidden&&!this.background)sound.tick(dt,s?.waveActive?Math.min(1,s.enemies.length/22):0,{night:s?.sky.night??false,weather:s?.sky.weather??'clear',hero:s?.challenge.hero??this.hero,wave:s?.wave??0,playing:!!s?.waveActive,boss:!!s?.enemies.some(e=>e.alive&&e.def.boss),district:this.map,outcome:s?.over??null,overture:EXPEDITIONS.every(e=>this.profile.commissions.includes(e.id))})
    requestAnimationFrame(t=>this.frame(t))
  }
}
