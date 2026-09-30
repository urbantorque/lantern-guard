import { Sim, DT, type Tower, type SaveSnapshotV2 } from './game/sim'
import { TOWERS, TOWER_ORDER, ENEMIES, DIFFICULTY, type TowerId, type Difficulty, type EnemyId } from './game/defs'
import { ACTS, MAP_HELP, fixedLevel, stageOf, STAGES, upgradePrice, FIXED_UNLOCK, FIXED_TIPS, COMMISSIONS, bondName, BOND_HELP } from './game/fixed'
import { WATCH_NAMES } from './game/compact'
import { WEATHER, SKY_TOWER_HELP, DAY_SECONDS, NIGHT_SECONDS, clockText, lamplit } from './game/environment'
import { Renderer, type Selection } from './render/renderer'
import { fixedTowerIcon } from './render/fixed-towers'
import { fixedEnemyIcon as enemyIcon } from './render/fixed-world'
import { icon } from './ui/icons'
import { sound, profileSound } from './core/audio'
import { watchAppState } from './core/platform'
import { upgradeDetail, STREAMS } from './game/fixed-copy'
import { setPalette } from './render/palette'
import { HEROES, HERO_IDS, isHero, heroTower, type HeroId } from './game/heroes'
import { heroPortrait } from './render/heroes'
import { loadProgress } from './game/progress'
import { buildLevel } from './game/level'
import { loadVillage, loadWatch, saveWatch, recordWatch, bestWave, legacyExists, storageMessage, writeJSON, loadPlanning, type Slot } from './game/fixed-store'

const role:Record<TowerId,string>={wick:'Reliable sparks',cracker:'Armour & crowds',bell:'Slows groups',owl:'Reveals hidden foes',garden:'Income over time',beam:'Sustained heavy damage',storm:'Chain lightning',ballista:'Heavy single hits'}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T
const button=(action:string,label:string,cls='',disabled=false)=>`<button data-action="${action}" class="${cls}" ${disabled?'disabled':''}>${label}</button>`

export class FixedApp {
  private sim:Sim|null=null
  private renderer:Renderer|null=null
  private profile=loadVillage()
  private slot:Slot='campaign'
  private selection:Selection=null
  private paused=true
  private speed=1
  private map=0
  private difficulty:Difficulty='standard'
  private drawer=''
  private undo:SaveSnapshotV2[]=[]
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
  private autoWaves=false
  private nextWaveIn:number|null=null
  private get panelPauses(){return !!this.drawer&&this.drawer!=='tower'}

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
    watchAppState(()=>{this.nextWaveIn=null;this.paused=true;this.save();sound.suspend();this.refresh()})
    this.home()
    if(this.qa) {
      const bar=document.createElement('nav');bar.className='qa-bar';bar.innerHTML=[0,15,30,39].map(n=>button('fixture:'+n,'Test wave '+n)).join('')+button('fixture:day','Test day')+button('fixture:night','Test night');$('app').append(bar)
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
    this.save(); this.paused=true; this.sim=null; this.renderer=null; this.observer?.disconnect();this.drawer=''
    const saved=loadWatch('campaign'), commission=loadWatch('commission')
    const best=Math.max(0,...Object.values(this.profile.records).map(r=>r.wave))
    $('app').innerHTML=`<main class="home"><div class="title-art" role="img" aria-label="A colourful canal district at sunset, with planted terraces and golden windows"></div><div class="home-content"><p class="eyebrow">The city sleeps. You keep the light.</p><h1>Nightward<span class="title-dot">.</span></h1><p class="home-intro">Build with care.<br>Be ready for the night.</p><div class="home-actions">
      ${saved&&!saved.snapshot.over?button('resume:campaign',`Continue watch <small>Wave ${saved.snapshot.wave || 1} · ${WATCH_NAMES[saved.snapshot.challenge.variant??0]}${saved.snapshot.challenge.hero?" · "+HEROES[saved.snapshot.challenge.hero].name:""}</small>`,'primary'):''}
      ${button('choose','Begin a watch',saved&&!saved.snapshot.over?'secondary':'primary')}
      <div class="home-links">${button('district','The district')}${button('commissions','Commissions')}${button('settings',icon('gear')+'<span class="sr-only">Settings</span>')}</div>
      ${commission&&!commission.snapshot.over?button('resume:commission','Continue commission','text-button'):''}</div><p class="home-note">${best?`Best watch · ${best}/40 waves`:'40 waves · Four waterways · Your own pace'}</p></div></main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div>`
  }
  private show(title:string,content:string,kind='') {
    if(!this.drawer) this.previousFocus=document.activeElement as HTMLElement
    this.drawer=kind||title
    const live=kind==='tower',main=document.querySelector('main')
    if(!live)this.paused=true
    main?.toggleAttribute('inert',!live);main?.classList.toggle('inspecting',live)
    $('modal-root').innerHTML=`${live?'':'<div class="scrim" data-action="close"></div>'}<section class="drawer ${kind}" role="dialog" aria-modal="${!live}" aria-labelledby="dialog-title"><header><h2 id="dialog-title">${title}</h2>${button('close',icon('close')+'<span class="sr-only">Close</span>','icon-button')}</header>${live?'<div class="inspector-toolbar"><span id="inspector-state"></span><b id="inspector-glow"></b></div>':''}<div class="drawer-body">${this.kitCopy(content)}</div></section>`
    $('modal-root').querySelector<HTMLButtonElement>('.drawer button')?.focus()
    this.refresh()
    if(live)this.resize()
  }
  private close() {
    this.drawer='';$('modal-root').innerHTML=''; this.selection=null
    document.querySelector('main')?.removeAttribute('inert')
    document.querySelector('main')?.classList.remove('inspecting')
    if(this.previousFocus?.isConnected)this.previousFocus.focus()
    else document.querySelector<HTMLButtonElement>('.plot-hit, .home-actions button')?.focus()
    this.refresh()
  }
  private choose(focusAction?:string) {
    const scroll=document.querySelector<HTMLElement>(".drawer-body")?.scrollTop??0
    this.show('Choose your watch',`${this.heroChoices()}<p class="muted">Four fixed waterways. Every entrance has one clear route to the lantern.</p><div class="map-list">${WATCH_NAMES.map((name,i)=>button(`map:${i}`,`${this.preview(i)}<span><b>${name}</b><small>${MAP_HELP[i]}</small><em>${bestWave(this.profile,i,this.difficulty,this.hero)}/40 waves held</em></span>`,this.map===i?'map-choice selected':'map-choice')).join('')}</div><fieldset><legend>Difficulty</legend><div class="segmented">${(['relaxed','standard','nightfall'] as Difficulty[]).map(d=>button('mode:'+d,DIFFICULTY[d].name,this.difficulty===d?'selected':'')).join('')}</div><p class="muted">${this.difficulty==='relaxed'?'50 light. Gentler enemies. Retry any wave.':this.difficulty==='standard'?'25 light. Thoughtful planning, with a retry when you need it.':'15 light. Stronger enemies. Retrying records this watch as practice.'} Pause whenever you need.</p></fieldset>${loadWatch('campaign')&&!loadWatch('campaign')!.snapshot.over?'<p class="notice">Beginning replaces your current fixed-path watch. Your records stay in the district.</p>':''}${button('new','Begin in '+WATCH_NAMES[this.map],'primary wide')}${legacyExists()?'<p class="small muted">Your previous edition’s watch is archived on this device. Its routes cannot carry into this edition. Your journal and achievements remain in the district.</p>':''}`,'choose')
    if(focusAction){document.querySelector<HTMLButtonElement>('[data-action="'+focusAction+'"]')?.focus({preventScroll:true});const body=document.querySelector<HTMLElement>('.drawer-body');if(body)body.scrollTop=scroll}
  }
  private towerDef(id:TowerId){return heroTower(id,this.sim?this.sim.challenge.hero:this.hero)}
  private kitCopy(text:string){
    const hero=this.sim?this.sim.challenge.hero:this.hero;if(!hero)return text
    text=text.replaceAll('An Owl guides a Wickling hit','A scout guides a spark').replaceAll('an Owl','a scout tower').replaceAll('An Owl','A scout tower')
    for(const id of TOWER_ORDER)text=text.replaceAll(TOWERS[id].name,HEROES[hero].towers[id].name)
    return text.replace(/\bWicklings\b/g,HEROES[hero].towers.wick.name+' towers').replace(/\bMoonbells\b/g,HEROES[hero].towers.bell.name+' towers').replace(/\bLighthouses\b/g,HEROES[hero].towers.beam.name+' towers').replace(/\bOwls\b/g,'scout towers').replace(/\bOwl\b/g,'scout tower').replace(/\bGardens\b/g,'income towers').replace(/\bCrackers\b/g,'blast towers').replace(/\bBallistas\b/g,'bolt towers')
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
    this.show(h?`${h.name} · ${h.title}`:'The original keepers',`${h?`<div class="hero-intro"><img src="${heroPortrait(id!)}" alt="${h.name}, ${h.title}"/><div><p class="lead">${h.approach}</p><p class="small muted">${h.tradeoff}</p></div></div>`:''}<p class="small muted">All three heroes are available immediately. Towers arrive gradually during a watch; each has two specialisations and five stages. Shared roles make a new roster easy to learn.</p><div class="roster-list">${[...TOWER_ORDER].sort((a,b)=>FIXED_UNLOCK[a]-FIXED_UNLOCK[b]).map(t=>`<article><img src="${fixedTowerIcon(t,1,0,0,id)}" alt=""/><div><h3>${heroTower(t,id).name}</h3><p class="roster-role">${role[t]} · Wave ${FIXED_UNLOCK[t]} · ${TOWERS[t].cost} glow</p><p>${h?h.towers[t].trait:TOWERS[t].blurb}</p><small>${heroTower(t,id).paths.map(p=>p.name).join(' / ')}</small></div></article>`).join('')}</div>${!this.sim?button('choose','Back to watch setup','primary wide'):''}`,'roster')
  }
  private preview(map:number) {
    const level=buildLevel(fixedLevel(map))
    return `<svg class="map-preview" viewBox="0 0 720 840" aria-hidden="true">${[...level.segs.values()].map(s=>`<polyline points="${s.line.pts.map(p=>p.x+','+p.y).join(' ')}"/>`).join('')}<circle cx="${level.def.home.x}" cy="${level.def.home.y}" r="27"/></svg>`
  }
  private newWatch(commissionId?:string,sameSeed?:number) {
    const c=COMMISSIONS.find(q=>q.id===commissionId)
    this.slot=c?'commission':'campaign'; this.map=c?.variant??this.map
    const hero=sameSeed!==undefined?this.sim?.challenge.hero:this.hero
    const challenge={fixed:1 as const,compact:1 as const,guard:1 as const,depth:1 as const,balance:1 as const,variant:this.map,...(hero?{hero}:{}),...(c?{commission:c.id,blockedPad:c.blockedPad,id:`commission:${c.id}:fixed1`,skirmish:{from:c.from,to:c.to,glow:c.glow,seed:c.seed}}:{})}
    this.profile.lastMap=this.map;this.profile.lastHero=this.hero;writeJSON('profile',this.profile)
    this.begin(new Sim(this.difficulty,challenge,sameSeed??Math.floor(Math.random()*4294967295)))
    this.writePlanning(this.sim!.snapshot()); this.save()
  }
  private begin(sim:Sim,blooms:number[]=[]) {
    document.body.classList.add('playing')
    this.sim=sim;if(sim.challenge.hero)this.hero=sim.challenge.hero;this.map=sim.challenge.variant??0;this.difficulty=sim.difficulty;this.undo=[];this.selection=null;this.moving=null;this.paused=true;this.endShown=false;this.drawer='';this.recap='';this.lastHUD='';this.nextWaveIn=null
    $('app').innerHTML=`<main class="game"><header class="hud"><div class="stat">${icon('heart')}<b id="light"></b><span>Light</span></div><div class="stat">${icon('sparkle')}<b id="glow"></b><span>Glow</span></div><div class="wave-stat" id="wave"></div>${button('menu',icon('gear')+'<span class="sr-only">Watch menu</span>','icon-button')}</header><section id="battlefield" class="battlefield" aria-label="Battlefield"><canvas id="canvas" aria-label="Fixed paths through the district"></canvas><div id="plots" aria-label="Tower plots"></div><button id="sky" class="sky-strip" data-action="sky"></button><div id="board-status" class="board-status"></div><div class="map-caption"><span>${WATCH_NAMES[this.map]}${sim.challenge.hero?" · "+HEROES[sim.challenge.hero].name:""}</span><span id="act"></span></div></section><footer class="playbar"><div class="wave-brief"><button data-action="forecast" class="forecast-button" id="forecast"></button><span id="wave-recap" class="wave-recap"></span></div><div class="play-actions">${button('undo','Undo','secondary',true)}${button('speed','1×','secondary')}<button id="go" data-action="go" class="primary"></button></div></footer></main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div><p id="save-warning" role="status"></p>`
    this.renderer=new Renderer($<HTMLCanvasElement>('canvas')); this.renderer.attach(sim);if(blooms.length)this.renderer.importBlooms(blooms)
    document.querySelector('.hud .icon-button')?.insertAdjacentHTML('beforebegin','<button id="sound-toggle" data-action="sound" class="sound-toggle"></button>')
    document.querySelector('[data-action="speed"]')?.insertAdjacentHTML('afterend',button('auto','Auto off','auto-wave secondary'))
    this.renderer.settlement=Math.max(this.profile.settlement,loadProgress().settlement??0)
    this.renderer.bunting=this.profile.commissions.includes('market')
    this.renderer.keepsakes=[...this.profile.commissions];this.renderer.crest=this.guardian
    this.applySettings()
    this.observer?.disconnect(); this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('battlefield'));this.resize();this.refresh()
  }
  private resize() {
    if(!this.renderer)return
    this.renderer.fixedLandscape=innerWidth>innerHeight*1.15
    this.renderer.fixedTopInset=getComputedStyle($('sky')).position==='fixed'?0:48
    const r=$('battlefield').getBoundingClientRect(),sheet=document.querySelector('.drawer.tower')
    const focus=innerWidth<=999&&innerHeight>innerWidth&&this.selection?.kind==='tower'&&this.drawer==='tower'
    this.renderer.fixedFrameHeight=focus?r.height+(sheet?.getBoundingClientRect().height??0):0
    this.renderer.fixedFocus=focus&&this.selection?.kind==='tower'?this.selection.tower:null
    this.renderer.resize(r.width,r.height,Math.min(2,devicePixelRatio));this.plots()
  }
  private plots() {
    if(!this.sim||!this.renderer)return
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
    $('sky').innerHTML=`<span><i class="sky-disc" aria-hidden="true"></i>${soon?(sky.night?'Dawn in':'Nightfall in'):sky.night?'Night':'Daylight'} <b>${clockText(sky.phaseLeft)}</b></span><span>${sky.weatherLeft<=8?'Next: '+WEATHER[sky.nextWeather].name:WEATHER[sky.weather].name} ${icon('caretRight')}</span>`
    $('sky').setAttribute('aria-label',`${sky.night?'Night, dawn':'Daylight, nightfall'} in ${clockText(sky.phaseLeft)}. ${WEATHER[sky.weather].name}. Open sky forecast`)
    $('wave').innerHTML=`<span>${s.isChallenge?'Commission':'Wave'}</span><b>${s.wave-s.waveOffset}<small> / ${s.finalWave-s.waveOffset}</small></b>`
    $('act').textContent=ACTS[Math.min(7,Math.floor(Math.max(0,s.planningWave-1)/5))]
    $('go').textContent=this.nextWaveIn!==null?`Next wave · ${Math.ceil(this.nextWaveIn)}s`:s.over?'View result':s.waveActive?(this.paused?'Resume':'Pause'):`Begin wave ${s.wave+1-s.waveOffset}`
    ;($('go') as HTMLButtonElement).disabled=!s.waveActive&&!s.over&&!s.towers.length
    const undo=document.querySelector<HTMLButtonElement>('[data-action="undo"]');if(undo)undo.disabled=!this.undo.length||s.waveActive||!!s.over
    const speed=document.querySelector('[data-action="speed"]');if(speed)speed.textContent=this.speed+'×'
    const auto=document.querySelector<HTMLButtonElement>('[data-action=auto]');if(auto){auto.textContent=this.autoWaves?'Auto on':'Auto off';auto.setAttribute('aria-pressed',String(this.autoWaves));auto.title='Advance ordinary waves after 6 seconds. New threats wait for you. Any planning action stops the countdown.'}
    const groups=s.waveDef(Math.min(s.finalWave,s.wave+(s.waveActive?0:1))).groups
    const unique=[...new Set(groups.map(g=>g.type))]
    $('forecast').innerHTML=`<span class="eyebrow">${s.waveActive?'On the water':s.over?'Watch complete':'Next on the water'} ${icon('caretRight')}</span><b>${unique.slice(0,3).map(e=>ENEMIES[e].name).join(' · ')}${unique.length>3?' +'+(unique.length-3):''}</b>`
    $('board-status').textContent=this.moving!==null?'Choose an empty plot · 25 glow':s.waveActive&&this.paused?'Paused':!s.towers.length?'Tap a + to build your first tower':''
    $('wave-recap').textContent=!s.waveActive?this.recap:''
    $('save-warning').textContent=storageMessage
    if(this.drawer==='tower'){
      $('inspector-state').textContent=s.waveActive?(this.paused?'Paused':'Live combat'):'Between waves'
      $('inspector-glow').textContent=Math.floor(s.glow)+' glow'
      document.querySelectorAll<HTMLButtonElement>('.live-purchase').forEach(b=>{b.disabled=s.glow<Number(b.dataset.cost)||s.planningWave<Number(b.dataset.wave)||!!s.over})
      if(this.selection?.kind==='tower'){
        const t=this.selection.tower
        const reach=$('tower-reach'),damage=$('tower-damage');if(reach)reach.textContent=String(Math.round(s.effRange(t)));if(damage)damage.textContent=String(Math.round(t.damageDealt??0))
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
    if(cost!==null) {this.show('A little more room',`<p>Unlock plot ${i+1} for ${cost} glow. Building a tower costs extra.</p>${button('unlock:'+i,`Unlock · ${cost} glow`,'primary wide',s.glow<cost||s.waveActive)}${s.waveActive?'<p class="muted">Building happens between waves.</p>':''}`,'plot');return}
    const cards=TOWER_ORDER.filter(id=>s.keeperAllowed(id)).map(id=>`<button data-action="build:${i}:${id}" class="build-card" ${s.glow<s.towerCost(id)||s.waveActive?'disabled':''}><img src="${fixedTowerIcon(id,0,0,0,this.sim?.challenge.hero)}" alt=""/><span><b>${this.towerDef(id).name}</b><small>${role[id]} · ${id==='garden'?'Daylight income':id==='owl'?'Night shelter':lamplit(id)?'Lamplit':'Needs night shelter'}</small></span><strong>${s.towerCost(id)} <small>glow</small></strong></button>`).join('')
    const next=TOWER_ORDER.filter(id=>FIXED_UNLOCK[id]>s.planningWave).sort((a,b)=>FIXED_UNLOCK[a]-FIXED_UNLOCK[b])[0]
    this.show(`Build on plot ${i+1}`,`<p class="muted">${s.waveActive?'Finish this wave before building.':'Choose a role for this part of the stream.'}</p><div class="build-list">${cards}</div>${next?`<p class="small muted">${this.towerDef(next).name} arrives at wave ${FIXED_UNLOCK[next]}.</p>`:''}`,'build')
  }
  private towerUpgrades(t:Tower){
    const s=this.sim!,stage=stageOf(t),path=t.b?1:0
    const buy=(action:string,label:string,cost:number,wave=0)=>`<button data-action="${action}" data-cost="${cost}" data-wave="${wave}" class="live-purchase primary" ${s.glow<cost||s.planningWave<wave?'disabled':''}><span>${label}</span><b>${cost}</b></button>`
    if(stage>=2){
      const wave=stage===2?16:31,cost=upgradePrice(t)
      return `<div class="specialised-upgrade"><div class="upgrade-caption"><b>${t.def.paths[path].name}</b><span>${STAGES[stage]}</span></div><p>${STREAMS[t.id][path]}</p>${cost!==null?`${buy(`upgrade:${t.uid}:${path}`,s.planningWave<wave?`Wave ${wave}`:stage===2?'Master':'Crown',cost,wave)}<details class="upgrade-preview"><summary>What improves?</summary><p>${upgradeDetail(s,t,path)}</p></details>`:'<p class="stream-complete">Fully upgraded</p>'}</div>`
    }
    return `<p class="upgrade-hint">Choose a specialisation. ${stage===0?'Foundation included.':'The other path locks.'}</p><div class="quick-branches">${t.def.paths.map((p,i)=>`<article><h3>${p.name}</h3><p>${STREAMS[t.id][i]}</p>${buy(`specialise:${t.uid}:${i}`,'Choose',s.specialiseCost(t)!)}<details class="upgrade-preview"><summary>Details</summary><p>${upgradeDetail(s,{...t,a:1,b:0,refinement:0,stats:s.towerStats(t.id,1,0)},i as 0|1)}</p></details></article>`).join('')}</div>${stage===0?`<div class="foundation-quick"><span>Keep both options open</span>${buy('upgrade:'+t.uid+':0','Improve',upgradePrice(t)!)}</div>`:''}`
  }
  private towerSheet(t:Tower) {
    const s=this.sim!,stage=stageOf(t),active=s.waveActive
    const replacing=this.drawer==='tower',body=document.querySelector<HTMLElement>('.drawer-body'),scroll=body?.scrollTop??0,focus=(document.activeElement as HTMLElement)?.dataset.action
    this.selection={kind:'tower',tower:t}
    const upgrades=this.towerUpgrades(t)
    const bond=s.bonds.find(b=>b.a===t.uid||b.b===t.uid),partner=bond?s.towers.find(q=>q.uid===(bond.a===t.uid?bond.b:bond.a)):null
    const partners=s.towers.filter(q=>q!==t&&bondName(t.id,q.id)&&s.sharedCoverage(t,q)&&!s.bonds.some(b=>[b.a,b.b].includes(q.uid)))
    const income=t.id==='garden'?`<p class="notice">${Math.round(t.stats.income*1.4)} glow in a daylight wave, ${Math.round(t.stats.income*.55)} at night, before rain. A mixed wave pays the time-weighted average; ${s.finalWave-s.wave} remain. Invested: ${t.spent}. Earned: ${Math.floor(t.earned)}.</p>`:''
    this.show(t.def.name,`<div class="tower-heading compact"><img src="${fixedTowerIcon(t.id,t.a,t.b,t.refinement,this.sim?.challenge.hero)}" alt="${STAGES[stage]} ${t.def.name}"/><div><p class="eyebrow">${role[t.id]}</p><div class="tier-pips" aria-label="Stage ${stage+1} of 5">${[0,1,2,3,4].map(i=>`<i class="${i<=stage?'filled':''}"></i>`).join('')}</div><p class="muted"><span id="tower-reach">${Math.round(s.effRange(t))}</span> current reach · <span id="tower-damage">${Math.round(t.damageDealt??0)}</span> damage dealt</p></div></div>${upgrades}<details class="tower-details"><summary>Stats, sky & tower management</summary>${s.challenge.hero?`<p class="notice">${HEROES[s.challenge.hero].towers[t.id].trait}</p>`:''}${income}${this.towerFacts(t)}<p class="sky-tower-note">${SKY_TOWER_HELP[t.id]}${!lamplit(t.id)?` <b>${s.sheltered(t)?'Sheltered by an Owl.':'Outside Owl shelter.'}</b>`:''}</p>
      ${s.wave>=5?`<div class="bond-section"><h3>Tower Bond</h3>${partner?`<p><b>${bondName(t.id,partner.id)}</b> with ${partner.def.name}.</p><p class="small muted">${BOND_HELP[bondName(t.id,partner.id)!]} Activated ${bond!.activations} times.</p>${button('unbond:'+t.uid,'Remove Bond','secondary',active)}`:partners.length?`<p class="small muted">One tower per Bond. ${s.wave>=20?2:1} Bond slots available for this watch.</p>${partners.map(q=>button(`bond:${t.uid}:${q.uid}`,`${bondName(t.id,q.id)} · ${q.def.name}`,'secondary wide',active||s.bonds.length>=(s.wave>=20?2:1))).join('')}`:'<p class="small muted">A Moonbell and Cracker, or an Owl and Wickling, can bond when their ranges share the stream.</p>'}</div>`:''}
      <p class="small muted">Building, moving, selling and Bonds happen between waves.</p><div class="utility-actions">${button('move:'+t.uid,'Move · 25','secondary',active||s.glow<25)}${button('sell:'+t.uid,`Sell · ${s.sellValue(t)}`,'secondary',active||s.challenge.commission==='garden'&&t.id==='garden')}</div></details>`,'tower')
    if(replacing){const next=document.querySelector<HTMLElement>('.drawer-body');if(next)next.scrollTop=scroll;document.querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)?.focus({preventScroll:true})}
  }
  private forecast() {
    const s=this.sim!,n=Math.min(s.finalWave,s.wave+(s.waveActive?0:1)),w=s.waveDef(n)
    const counts=new Map<EnemyId,number>();w.groups.forEach(g=>counts.set(g.type,(counts.get(g.type)??0)+g.count))
    this.show(`Wave ${n-s.waveOffset} forecast`,`<p class="lead">${w.note}</p>${button('sky',`${s.sky.night?'Dawn':'Nightfall'} in ${clockText(s.sky.phaseLeft)} · ${WEATHER[s.sky.weather].name}`,'secondary wide')}<div class="enemy-list">${[...counts].map(([id,count])=>`<article><img src="${enemyIcon(id)}" alt=""/><div><h3>${count} ${ENEMIES[id].name}${count>1?'s':''}</h3><p>${FIXED_TIPS[id]}</p></div></article>`).join('')}</div><p class="notice">Entrances: ${[...new Set(w.groups.map(g=>g.src==='west'?'Side inlet':'North stream'))].join(' and ')}. Surviving this wave earns ${Math.round((125+n*15)*DIFFICULTY[s.difficulty].bonus)} glow, plus defeated enemies and Gardens.</p>${this.recap?`<p>${this.recap}</p>`:''}`,'forecast')
  }
  private skyForecast() {
    const s=this.sim!,sky=s.sky,exposed=s.towers.filter(t=>!lamplit(t.id)&&!s.sheltered(t))
    this.show('Plan for the sky',`<p class="lead">${sky.night?'Dawn':'Nightfall'} in ${clockText(sky.phaseLeft)}</p><div class="sky-cycle"><div class="${!sky.night?'current':''}"><b>Daylight</b><span>${clockText(DAY_SECONDS)}</span><small>Income +40%<br>Bolt tower reach +12%</small></div><div class="${sky.night?'current':''}"><b>Night</b><span>${clockText(NIGHT_SECONDS)}</span><small>Enemies 8% faster<br>Income −45%</small></div></div><h3>Be ready for night</h3><p>Scout towers shelter nearby defences. Without shelter, blast, lightning and bolt towers lose 15% reach.</p><p class="notice">${exposed.length?exposed.length+' exposed '+(exposed.length===1?'tower':'towers')+'. Check that their night reach still covers the stream.':'Your attack towers are lamplit or sheltered.'}</p><p class="small muted">Spark, chime, scout and beam towers keep their reach. Spark towers fire 12% faster at night; beams deal 12% more damage.</p><h3>${WEATHER[sky.weather].name}</h3><p>${WEATHER[sky.weather].effect}</p><p class="small muted">Next: ${WEATHER[sky.nextWeather].name} in ${clockText(sky.weatherLeft)}. Weather is checked every 30 seconds.</p><details class="rule-details"><summary>How the clock and income work</summary><p class="small muted">The clock runs only during combat, including while upgrading. Planning and pausing stop it; 2× speed also speeds up the sky. Reloading or retrying keeps the same forecast.</p><p class="small muted">Harvests average the day, night and weather fought through in that wave. Waiting cannot earn extra glow.</p></details>`,'sky-forecast')
  }
  private district() {
    const legacy=loadProgress(),settlement=Math.max(legacy.settlement??0,this.profile.settlement)
    const names=['A sleeping district','The first windows glow','The waterside opens','The harbour is restored','The whole district is awake']
    const journal={...legacy.journal};for(const [id,n] of Object.entries(this.profile.journal)) journal[id as EnemyId]=(journal[id as EnemyId]??0)+(n??0)
    this.show('The district',`<div class="district-scene stage-${settlement}" aria-label="${names[settlement]}"><div class="district-houses">${[0,1,2,3,4].map(i=>`<span class="house ${i<=settlement?'lit':''}"></span>`).join('')}</div></div><h3>${names[settlement]}</h3><p class="muted">${settlement<4?`Hold ${[5,10,30,40][settlement]} waves to restore the next part of the district.`:'Every district is lit. Try a different waterway or a commission.'} Restorations and keepsakes never increase combat power.</p><div class="keepsakes">${COMMISSIONS.map(c=>`<span class="keepsake ${this.profile.commissions.includes(c.id)?'earned':''}">${this.profile.commissions.includes(c.id)?icon('check'):icon('lock')}${c.reward}</span>`).join('')}</div><h3>Your watches</h3><div class="records">${WATCH_NAMES.map((name,i)=>`<p><b>${name}</b><span>${(['relaxed','standard','nightfall'] as Difficulty[]).map(d=>`${DIFFICULTY[d].name} ${bestWave(this.profile,i,d)}/40`).join(' · ')}</span></p>`).join('')}</div>${Object.entries(this.profile.records).filter(([k,r])=>k.endsWith(':practice')&&r.practice).length?'<p class="small muted">Assisted Nightfall watches are kept separately as practice.</p>':''}<h3>Field journal</h3><div class="enemy-list">${Object.entries(journal).filter(([,n])=>(n??0)>0).map(([id,n])=>`<article><img src="${enemyIcon(id as EnemyId)}" alt=""/><div><h3>${ENEMIES[id as EnemyId].name} · ${Math.floor(n??0)}</h3><p>${FIXED_TIPS[id as EnemyId]}</p></div></article>`).join('')||'<p class="muted">Meet the first Drips to begin your journal.</p>'}</div><p class="small muted">Previous edition: ${legacy.runs} watches and ${Object.values(legacy.feats).filter(Boolean).length} achievements retained.</p>`,'district')
  }
  private commissions() {
    this.show('District Commissions',`<p class="lead">A short watch with one thoughtful constraint.</p><p class="small muted">Playing as ${HEROES[this.hero].name}. Choose another hero in watch setup. Every commission stays available.</p>${COMMISSIONS.map(c=>`<article class="commission"><p class="eyebrow">Five waves · ${WATCH_NAMES[c.variant]}</p><h3>${c.name}</h3><p>${c.desc}</p><p class="small muted">Keepsake: ${c.reward}${this.profile.commissions.includes(c.id)?' · earned':''}</p>${button('commission:'+c.id,'Accept commission','secondary wide')}</article>`).join('')}<p class="small muted">Your campaign has its own save slot. Starting a commission replaces only a previous commission attempt.</p>`,'commissions')
  }
  private settings() {
    const s=this.profile.settings
    this.show('Make yourself comfortable',`<h3>Sound</h3>${this.sessionMuted?'<p class="notice">This playtest link is silent. Your saved sound preference is unchanged.</p>':''}<div class="setting-list">${button('setting:muted',`<span>Sound</span><b>${s.muted?'Off':'On'}</b>`,'',this.sessionMuted)}${([['music','Soundtrack & atmosphere'],['effects','Combat sounds'],['largeText','Larger text'],['reducedMotion','Reduced motion'],['clearPalette','Distinct colours']] as const).map(([key,name])=>`<button data-action="setting:${key}" role="switch" aria-checked="${s[key]}"><span>${name}</span><b>${s[key]?'On':'Off'}</b></button>`).join('')}</div><p class="muted">Reduced motion stills the water, weather and tower animation and softens combat effects. Tower upgrades keep combat running; menus pause it. Returning from another app leaves it paused and silent until you interact.</p><h3>District crest</h3><p class="small muted">A cosmetic detail on your towers. Your hero stays the same.</p><div class="segmented">${['lantern','ember','reed','tide'].map(g=>button('guardian:'+g,g[0].toUpperCase()+g.slice(1),this.guardian===g?'selected':'')).join('')}</div><p class="small muted">Keyboard: Tab moves between controls and plots. Enter selects. P pauses or resumes. Escape closes a panel.</p>`,'settings')
  }
  private menu() {const s=this.sim!;this.show('Your watch',`${button('roster',s.challenge.hero?HEROES[s.challenge.hero].name+' · View eight towers':'Original district roster','hero-roster-link secondary wide')}<p>${WATCH_NAMES[this.map]} · ${DIFFICULTY[this.difficulty].name}${this.sim?.challenge.practice?' · Practice':''}</p>${button('forecast','Wave forecast','secondary wide')}${button('sky','Day, night & weather','secondary wide')}${button('district','District & journal','secondary wide')}${button('settings','Settings','secondary wide')}${button('home','Save & return to district','secondary wide')}<p class="small muted">Waves never advance while you are away.</p>`,'menu')}
  private result() {
    const s=this.sim!;this.endShown=true
    const won=s.over==='won'
    this.show(won?'The lantern is still alight':'A little light for next time',`<p class="eyebrow">${WATCH_NAMES[this.map]} · ${DIFFICULTY[s.difficulty].name}${s.challenge.practice?' · Practice':''}</p><p class="result-number">${s.wave-(won?0:1)-s.waveOffset}<small> waves held</small></p><p>${won?'The district remembers your watch.':s.lastLeak?`${ENEMIES[s.lastLeak.enemy].name} reached the lantern${s.lastLeak.armoured?' with armour remaining':''}${s.lastLeak.hidden?' while still hidden':''}. ${FIXED_TIPS[s.lastLeak.enemy]}`:'Try building around a longer shared stretch of the stream.'}</p>${won?button('rematch','Rematch this seed','primary wide'):button('retry',s.difficulty==='nightfall'?'Retry as practice':'Retry this wave','primary wide',!loadPlanning(this.slot))}${won&&!s.isChallenge?button('nextmap','Try the next waterway','secondary wide'):''}${button('home','Return to the district','secondary wide')}`,'result')
  }
  private change(fn:()=>unknown,live=false) {
    const s=this.sim!;if(s.waveActive&&!live||s.over)return
    const before=s.waveActive?null:s.snapshot();fn()
    if(before&&JSON.stringify(before)!==JSON.stringify(s.snapshot())){this.undo.push(before);if(this.undo.length>20)this.undo.shift()}
    this.save();this.plots();this.refresh()
  }
  private action(action:string) {
    const [cmd,a,b]=action.split(':'),s=this.sim
    if(!['speed','sound'].includes(cmd))this.nextWaveIn=null
    if(cmd==='fixture'&&import.meta.env.DEV&&['0','15','30','39','day','night'].includes(a)) {
      void fetch(`${import.meta.env.BASE_URL}artifacts/fixed-wave-${a==='day'||a==='night'?'39':a}.json`).then(r=>r.json()).then((snap:SaveSnapshotV2)=>{this.qa=true;if(a==='day'||a==='night')snap.climate={elapsed:a==='day'?0:DAY_SECONDS,waveSeconds:0,gardenExposure:0};snap.challenge.hero=this.hero;this.begin(Sim.restore(snap))})
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
    if(cmd==='district'){this.district();return}
    if(cmd==='commissions'){this.commissions();return}
    if(cmd==='commission'){this.difficulty='standard';this.newWatch(a);return}
    if(cmd==='settings'){this.settings();return}
    if(cmd==='setting'){const k=a as keyof typeof this.profile.settings;if(!(k in this.profile.settings))return;this.profile.settings[k]=!this.profile.settings[k];writeJSON('profile',this.profile);this.applySettings();sound.unlock();this.settings();return}
    if(cmd==='sound'){this.profile.settings.muted=!this.profile.settings.muted;writeJSON('profile',this.profile);this.applySettings();sound.unlock();this.refresh();return}
    if(cmd==='guardian'){this.guardian=a;this.profile.guardian=a;writeJSON('profile',this.profile);if(this.renderer)this.renderer.crest=a;this.settings();return}
    if(!s)return
    const tower=()=>s.towers.find(t=>t.uid===Number(a))!
    if(cmd==='menu')this.menu()
    if(cmd==='sky')this.skyForecast()
    if(cmd==='forecast')this.forecast()
    if(cmd==='plot')this.selectPlot(Number(a))
    if(cmd==='unlock'){this.change(()=>s.unlockPlot(Number(a)));this.selectPlot(Number(a))}
    if(cmd==='build'){this.change(()=>s.build(Number(a),b as TowerId));const t=s.pads[Number(a)].tower;if(t){this.close();this.selection={kind:'tower',tower:t};this.recap=`${t.def.name} ready.`}}
    if(cmd==='upgrade'){const t=tower();if(t){this.change(()=>stageOf(t)===3?s.refine(t):s.upgrade(t,Number(b) as 0|1),true);this.towerSheet(t)}}
    if(cmd==='specialise'){const t=tower();if(t){this.change(()=>s.specialise(t,Number(b) as 0|1),true);this.towerSheet(t)}}
    if(cmd==='bond'){const t=tower();this.change(()=>s.bond(t,s.towers.find(q=>q.uid===Number(b))!));this.towerSheet(t)}
    if(cmd==='unbond'){const t=tower();this.change(()=>s.unbond(t));this.towerSheet(t)}
    if(cmd==='move'){this.moving=Number(a);this.close()}
    if(cmd==='sell'){this.change(()=>s.sell(tower()));this.close()}
    if(cmd==='auto')this.autoWaves=!this.autoWaves
    if(cmd==='speed'){this.speed=this.speed===1?2:1}
    if(cmd==='undo'&&!s.waveActive&&this.undo.length){const snap=this.undo.pop()!,remaining=this.undo;this.begin(Sim.restore(snap),this.renderer!.exportBlooms());this.undo=remaining;this.save()}
    if(cmd==='go') {
      if(s.over)this.result()
      else if(s.waveActive)this.paused=!this.paused
      else if(s.towers.length) {this.writePlanning(s.snapshot());this.undo=[];this.recap='';if(this.drawer!=='tower')this.selection=null;if(s.startWave()){this.paused=false;$('live').textContent=`Wave ${s.wave-s.waveOffset} begins.`;this.save();if(this.drawer==='tower'&&this.selection?.kind==='tower')this.towerSheet(this.selection.tower)}}
    }
    if(cmd==='retry'){const p=loadPlanning(this.slot);if(p){p.challenge.practice ||=s.difficulty==='nightfall';p.stats.retries=(s.stats.retries??0)+1;this.begin(Sim.restore(p));this.save()}}
    if(cmd==='rematch')this.newWatch(s.challenge.commission,s.seed)
    if(cmd==='nextmap'){this.map=(this.map+1)%4;this.newWatch()}
    this.refresh()
  }
  private key(e:KeyboardEvent) {
    if(e.key==='Escape'){this.nextWaveIn=null;if(this.drawer)this.close();else{this.moving=null;this.paused=true;this.refresh()}return}
    if(this.panelPauses&&e.key==='Tab') {
      const all=[...document.querySelectorAll<HTMLElement>('.drawer button:not(:disabled), .drawer summary, .drawer a[href], .drawer [tabindex="0"]')],first=all[0],last=all[all.length-1]
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
    if(e.code==='KeyP'&&!this.panelPauses&&this.sim){e.preventDefault();this.action('go');return}
    if(e.code==='Space'&&!this.drawer&&this.sim&&!(document.activeElement instanceof HTMLButtonElement)){e.preventDefault();this.action('go')}
  }
  private writePlanning(snapshot:SaveSnapshotV2) {if(!this.qa)writeJSON(this.slot+'.planning',snapshot)}
  private save() {if(!this.qa&&this.sim&&this.renderer)saveWatch(this.sim,this.renderer.exportBlooms(),this.slot)}
  private frame(now:number) {
    const dt=Math.min(.1,(now-(this.lastFrame||now))/1000);this.lastFrame=now
    const s=this.sim,r=this.renderer
    if(s&&r) {
      if(this.nextWaveIn!==null&&!document.hidden&&!this.drawer&&!s.over){this.nextWaveIn-=dt;if(this.nextWaveIn<=0)this.action('go')}
      if(!this.paused&&!this.panelPauses&&!s.over){this.accumulator+=dt*this.speed;while(this.accumulator>=DT){s.step(DT);this.accumulator-=DT}}
      else this.accumulator=0
      for(const e of s.events) {
        if(e.t==='waveEnd') {
          const damage=s.waveReports.find(q=>q.wave===e.n)?.damage??{}
          const top=Object.entries(damage).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]
          this.recap=`Wave ${e.n-s.waveOffset} held · +${e.bonus+e.income} glow${top?` · ${this.towerDef(top[0] as TowerId).name}`:''}`
          const milestone=[3,6,8,10,11,16,21,26,31,40].includes(s.wave+1)
          this.nextWaveIn=this.autoWaves&&!milestone&&!s.over&&!this.drawer?6:null
          if(this.autoWaves&&milestone)this.recap+=' · Check the next forecast'
          this.paused=true;if(!this.qa)recordWatch(this.profile,s);r.settlement=Math.max(r.settlement,this.profile.settlement);this.plots();$('live').textContent=this.recap
          this.save()
          if(this.drawer==='tower'&&this.selection?.kind==='tower')this.towerSheet(this.selection.tower)
        }
        if(e.t==='defeat'||e.t==='victory'){if(!this.qa)recordWatch(this.profile,s);this.save()}
      }
      r.handleEvents(s)
      r.draw(s,dt,{selection:this.selection,preview:null,armed:null,hint:null,paused:this.paused||this.panelPauses})
      if(s.over&&!this.endShown)this.result()
      const key=`${s.glow}:${s.lives}:${s.wave}:${s.waveActive}:${this.paused}:${Math.floor(s.climate.elapsed)}:${Math.ceil(this.nextWaveIn??-1)}`
      if(key!==this.lastHUD){this.lastHUD=key;this.refresh()}
      if(now-this.lastSave>5000){this.lastSave=now;this.save()}
    }
    // Title music also starts on the first gesture. Hidden tabs never schedule audio.
    if(!document.hidden)sound.tick(dt,s&&!this.paused&&!this.panelPauses?Math.min(1,s.enemies.length/30):0,s?.sky)
    requestAnimationFrame(t=>this.frame(t))
  }
}
