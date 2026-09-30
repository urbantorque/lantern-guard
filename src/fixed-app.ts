import { Sim, DT, type Tower, type SaveSnapshotV2 } from './game/sim'
import { TOWERS, TOWER_ORDER, ENEMIES, DIFFICULTY, type TowerId, type Difficulty, type Priority, type EnemyId } from './game/defs'
import { ACTS, MAP_HELP, fixedLevel, stageOf, STAGES, upgradePrice, FIXED_UNLOCK, FIXED_TIPS, COMMISSIONS, bondName, BOND_HELP } from './game/fixed'
import { WATCH_NAMES } from './game/compact'
import { WEATHER, SKY_TOWER_HELP, clockText, lamplit } from './game/environment'
import { Renderer, type Selection } from './render/renderer'
import { fixedTowerIcon } from './render/fixed-towers'
import { fixedEnemyIcon as enemyIcon } from './render/fixed-world'
import { icon } from './ui/icons'
import { sound } from './core/audio'
import { watchAppState } from './core/platform'
import { upgradeDetail } from './game/fixed-copy'
import { setPalette } from './render/palette'
import { loadProgress } from './game/progress'
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

  constructor() {
    this.qa=import.meta.env.DEV && new URLSearchParams(location.search).has('qa')
    if(this.qa||new URLSearchParams(location.search).get('muted')==='1')this.profile.settings.muted=true
    this.map=this.profile.lastMap
    this.guardian=this.profile.guardian??'lantern'
    this.applySettings()
    document.addEventListener('click',e=>{
      const target=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
      if(target && !target.disabled) { sound.unlock(); this.action(target.dataset.action!) }
    })
    document.addEventListener('keydown',e=>this.key(e))
    watchAppState(()=>{this.paused=true;this.save();sound.suspend();this.refresh()})
    this.home()
    if(this.qa) {
      const bar=document.createElement('nav');bar.className='qa-bar';bar.innerHTML=[0,15,30,39].map(n=>button('fixture:'+n,'Test wave '+n)).join('')+button('fixture:day','Test day')+button('fixture:night','Test night');$('app').append(bar)
    }
    requestAnimationFrame(t=>this.frame(t))
  }

  private applySettings() {
    document.documentElement.classList.toggle('large-text',this.profile.settings.largeText)
    document.documentElement.classList.toggle('reduced-motion',this.profile.settings.reducedMotion)
    sound.settings={sfx:.45,music:.22,ambience:.3,muted:this.profile.settings.muted}; sound.applySettings()
    setPalette(this.profile.settings.clearPalette?'clear':'standard')
    if(this.renderer) { this.renderer.settings={calmFx:true,reduceMotion:this.profile.settings.reducedMotion,shake:false}; this.renderer.setBigText(this.profile.settings.largeText) }
  }
  private home() {
    document.body.classList.remove('playing')
    this.save(); this.paused=true; this.sim=null; this.renderer=null; this.observer?.disconnect();this.drawer=''
    const saved=loadWatch('campaign'), commission=loadWatch('commission')
    const best=Math.max(0,...Object.values(this.profile.records).map(r=>r.wave))
    $('app').innerHTML=`<main class="home"><div class="title-art" role="img" aria-label="A geometric canal district after dusk, with planted roofs and warm windows"></div><div class="home-content"><p class="eyebrow">The city sleeps. You keep the light.</p><h1>Nightward<span class="title-dot">.</span></h1><p class="home-intro">Build with care.<br>Be ready for the night.</p><div class="home-actions">
      ${saved&&!saved.snapshot.over?button('resume:campaign',`Continue watch <small>Wave ${saved.snapshot.wave || 1} · ${WATCH_NAMES[saved.snapshot.challenge.variant??0]}</small>`,'primary'):''}
      ${button('choose','Begin a watch',saved&&!saved.snapshot.over?'secondary':'primary')}
      <div class="home-links">${button('district','The district')}${button('commissions','Commissions')}${button('settings',icon('gear')+'<span class="sr-only">Settings</span>')}</div>
      ${commission&&!commission.snapshot.over?button('resume:commission','Continue commission','text-button'):''}</div><p class="home-note">${best?`Best watch · ${best}/40 waves`:'40 waves · Four waterways · Your own pace'}</p></div></main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div>`
  }
  private show(title:string,content:string,kind='') {
    if(!this.drawer) this.previousFocus=document.activeElement as HTMLElement
    this.drawer=kind||title; this.paused=true
    document.querySelector('main')?.setAttribute('inert','')
    $('modal-root').innerHTML=`<div class="scrim" data-action="close"></div><section class="drawer ${kind}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><h2 id="dialog-title">${title}</h2>${button('close',icon('close')+'<span class="sr-only">Close</span>','icon-button')}</header><div class="drawer-body">${content}</div></section>`
    $('modal-root').querySelector<HTMLButtonElement>('.drawer button')?.focus()
    this.refresh()
  }
  private close() {
    this.drawer='';$('modal-root').innerHTML=''; this.selection=null
    document.querySelector('main')?.removeAttribute('inert')
    if(this.previousFocus?.isConnected)this.previousFocus.focus()
    else document.querySelector<HTMLButtonElement>('.plot-hit, .home-actions button')?.focus()
    this.refresh()
  }
  private choose() {
    this.show('Choose your watch',`<p class="muted">Four fixed waterways. Every entrance has one clear route to the lantern.</p><div class="map-list">${WATCH_NAMES.map((name,i)=>button(`map:${i}`,`${this.preview(i)}<span><b>${name}</b><small>${MAP_HELP[i]}</small><em>${bestWave(this.profile,i,this.difficulty)}/40 waves held</em></span>`,this.map===i?'map-choice selected':'map-choice')).join('')}</div><fieldset><legend>Difficulty</legend><div class="segmented">${(['relaxed','standard','nightfall'] as Difficulty[]).map(d=>button('mode:'+d,DIFFICULTY[d].name,this.difficulty===d?'selected':'')).join('')}</div><p class="muted">${this.difficulty==='relaxed'?'50 light. Gentler enemies. Retry any wave.':this.difficulty==='standard'?'25 light. Thoughtful planning, with a retry when you need it.':'15 light. Stronger enemies. Retrying records this watch as practice.'} Pause whenever you need.</p></fieldset>${loadWatch('campaign')&&!loadWatch('campaign')!.snapshot.over?'<p class="notice">Beginning replaces your current fixed-path watch. Your records stay in the district.</p>':''}${button('new','Begin in '+WATCH_NAMES[this.map],'primary wide')}${legacyExists()?'<p class="small muted">Your previous edition’s watch is archived on this device. Its routes cannot carry into this edition. Your journal and achievements remain in the district.</p>':''}`,'choose')
  }
  private preview(map:number) {
    const level=fixedLevel(map)
    return `<svg class="map-preview" viewBox="0 0 720 840" aria-hidden="true">${level.segments.map(s=>`<polyline points="${s.pts.map(p=>p.x+','+p.y).join(' ')}"/>`).join('')}<circle cx="${level.home.x}" cy="${level.home.y}" r="27"/></svg>`
  }
  private newWatch(commissionId?:string,sameSeed?:number) {
    const c=COMMISSIONS.find(q=>q.id===commissionId)
    this.slot=c?'commission':'campaign'; this.map=c?.variant??this.map
    const challenge={fixed:1 as const,compact:1 as const,guard:1 as const,depth:1 as const,balance:1 as const,variant:this.map,...(c?{commission:c.id,blockedPad:c.blockedPad,id:`commission:${c.id}:fixed1`,skirmish:{from:c.from,to:c.to,glow:c.glow,seed:c.seed}}:{})}
    this.profile.lastMap=this.map;writeJSON('profile',this.profile)
    this.begin(new Sim(this.difficulty,challenge,sameSeed??Math.floor(Math.random()*4294967295)))
    this.writePlanning(this.sim!.snapshot()); this.save()
  }
  private begin(sim:Sim,blooms:number[]=[]) {
    document.body.classList.add('playing')
    this.sim=sim;this.map=sim.challenge.variant??0;this.difficulty=sim.difficulty;this.undo=[];this.selection=null;this.moving=null;this.paused=true;this.endShown=false;this.drawer='';this.recap='';this.lastHUD=''
    $('app').innerHTML=`<main class="game"><header class="hud"><div class="stat">${icon('heart')}<b id="light"></b><span>Light</span></div><div class="stat">${icon('sparkle')}<b id="glow"></b><span>Glow</span></div><div class="wave-stat" id="wave"></div>${button('menu',icon('gear')+'<span class="sr-only">Watch menu</span>','icon-button')}</header><section id="battlefield" class="battlefield" aria-label="Battlefield"><canvas id="canvas" aria-label="Fixed paths through the district"></canvas><div id="plots" aria-label="Tower plots"></div><button id="sky" class="sky-strip" data-action="sky"></button><div id="board-status" class="board-status"></div><div class="map-caption"><span>${WATCH_NAMES[this.map]}</span><span id="act"></span></div></section><footer class="playbar"><button data-action="forecast" class="forecast-button" id="forecast"></button><div class="play-actions">${button('undo','Undo','secondary',true)}${button('speed','1×','secondary')}<button id="go" data-action="go" class="primary"></button></div></footer></main><div id="modal-root"></div><div id="live" class="sr-only" aria-live="polite"></div><p id="save-warning" role="status"></p>`
    this.renderer=new Renderer($<HTMLCanvasElement>('canvas')); this.renderer.attach(sim);if(blooms.length)this.renderer.importBlooms(blooms)
    this.renderer.settlement=Math.max(this.profile.settlement,loadProgress().settlement??0)
    this.renderer.bunting=this.profile.commissions.includes('market')
    this.renderer.keepsakes=[...this.profile.commissions];this.renderer.crest=this.guardian
    this.applySettings()
    this.observer?.disconnect(); this.observer=new ResizeObserver(()=>this.resize());this.observer.observe($('battlefield'));this.resize();this.refresh()
  }
  private resize() {
    if(!this.renderer)return
    const r=$('battlefield').getBoundingClientRect();this.renderer.resize(r.width,r.height,Math.min(2,devicePixelRatio));this.plots()
  }
  private plots() {
    if(!this.sim||!this.renderer)return
    const s=this.sim
    $('plots').innerHTML=s.pads.map((p,i)=>{
      if(!s.padRevealed(i)||s.challenge.blockedPad===i)return ''
      const point=this.renderer!.toScreen(p.x,p.y)
      const label=p.tower?`${TOWERS[p.tower.id].name}, ${STAGES[stageOf(p.tower)]}, plot ${i+1}`:s.padAvailable(i)?`Build on plot ${i+1}`:`Unlock plot ${i+1} for ${s.plotCost(i)} glow`
      return `<button class="plot-hit" data-action="plot:${i}" style="left:${point.x}px;top:${point.y}px" aria-label="${label}"><span>${i+1}</span></button>`
    }).join('')
  }
  private refresh() {
    const s=this.sim;if(!s||!$('light'))return
    $('light').textContent=String(s.lives);$('glow').textContent=String(Math.floor(s.glow))
    const sky=s.sky
    $('battlefield').classList.toggle('is-day',!sky.night)
    $('sky').classList.toggle('is-night',sky.night)
    $('sky').innerHTML=`<span><i class="sky-disc" aria-hidden="true"></i>${sky.night?'Night':'Daylight'} <b>${clockText(sky.phaseLeft)}</b></span><span>${WEATHER[sky.weather].name} ${icon('caretRight')}</span>`
    $('sky').setAttribute('aria-label',`${sky.night?'Night, dawn':'Daylight, nightfall'} in ${clockText(sky.phaseLeft)}. ${WEATHER[sky.weather].name}. Open sky forecast`)
    $('wave').innerHTML=`<span>${s.isChallenge?'Commission':'Wave'}</span><b>${s.wave-s.waveOffset}<small> / ${s.finalWave-s.waveOffset}</small></b>`
    $('act').textContent=ACTS[Math.min(7,Math.floor(Math.max(0,s.planningWave-1)/5))]
    $('go').textContent=s.over?'View result':s.waveActive?(this.paused?'Resume':'Pause'):`Begin wave ${s.wave+1-s.waveOffset}`
    ;($('go') as HTMLButtonElement).disabled=!s.waveActive&&!s.over&&!s.towers.length
    const undo=document.querySelector<HTMLButtonElement>('[data-action="undo"]');if(undo)undo.disabled=!this.undo.length||s.waveActive||!!s.over
    const speed=document.querySelector('[data-action="speed"]');if(speed)speed.textContent=this.speed+'×'
    const groups=s.waveDef(Math.min(s.finalWave,s.wave+(s.waveActive?0:1))).groups
    const unique=[...new Set(groups.map(g=>g.type))]
    $('forecast').innerHTML=`<span class="eyebrow">${s.waveActive?'On the water':s.over?'Watch complete':'Next on the water'} ${icon('caretRight')}</span><b>${unique.slice(0,3).map(e=>ENEMIES[e].name).join(' · ')}${unique.length>3?' +'+(unique.length-3):''}</b>`
    $('board-status').textContent=this.moving!==null?'Choose an empty plot · 25 glow':s.waveActive&&this.paused?'Paused':!s.towers.length?'Tap an upper plot to build your first tower':this.recap&&!s.waveActive?this.recap:''
    $('save-warning').textContent=storageMessage
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
    const cards=TOWER_ORDER.filter(id=>s.keeperAllowed(id)).map(id=>`<button data-action="build:${i}:${id}" class="build-card" ${s.glow<s.towerCost(id)||s.waveActive?'disabled':''}><img src="${fixedTowerIcon(id)}" alt=""/><span><b>${TOWERS[id].name}</b><small>${role[id]} · ${id==='garden'?'Daylight income':id==='owl'?'Night shelter':lamplit(id)?'Lamplit':'Owl shelter helps at night'}</small></span><strong>${s.towerCost(id)} <small>glow</small></strong></button>`).join('')
    const next=TOWER_ORDER.filter(id=>FIXED_UNLOCK[id]>s.planningWave).sort((a,b)=>FIXED_UNLOCK[a]-FIXED_UNLOCK[b])[0]
    this.show(`Build on plot ${i+1}`,`<p class="muted">${s.waveActive?'Finish this wave before building.':'Choose a role for this part of the stream.'}</p><div class="build-list">${cards}</div>${next?`<p class="small muted">${TOWERS[next].name} arrives at wave ${FIXED_UNLOCK[next]}.</p>`:''}`,'build')
  }
  private towerSheet(t:Tower) {
    const s=this.sim!,stage=stageOf(t),active=s.waveActive
    this.selection={kind:'tower',tower:t}
    const price=upgradePrice(t), gate=stage===2?16:stage===3?31:0
    let upgrades=''
    if(stage<4) {
      if(stage===1) upgrades=`<p class="eyebrow">Choose one specialisation</p><div class="branch-list">${t.def.paths.map((p,i)=>button(`upgrade:${t.uid}:${i}`,`<b>${p.name}</b><small>${upgradeDetail(s,t,i as 0|1)}</small><strong>${price} glow</strong>`,'branch',active||s.glow<price!)).join('')}</div>`
      else upgrades=button(`upgrade:${t.uid}:${t.b?1:0}`,`${STAGES[stage+1]} · ${price} glow`,'primary wide',active||s.glow<price!||s.planningWave<gate)+`<p class="small muted">${upgradeDetail(s,t,t.b?1:0)}${s.planningWave<gate?` Available at wave ${gate}.`:''}</p>`
    }
    const bond=s.bonds.find(b=>b.a===t.uid||b.b===t.uid),partner=bond?s.towers.find(q=>q.uid===(bond.a===t.uid?bond.b:bond.a)):null
    const partners=s.towers.filter(q=>q!==t&&bondName(t.id,q.id)&&s.sharedCoverage(t,q)&&!s.bonds.some(b=>[b.a,b.b].includes(q.uid)))
    const income=t.id==='garden'?`<p class="notice">${Math.round(t.stats.income*1.4)} glow in a daylight wave, ${Math.round(t.stats.income*.55)} at night, before rain. A mixed wave pays the time-weighted average; ${s.finalWave-s.wave} remain. Invested: ${t.spent}. Earned: ${Math.floor(t.earned)}.</p>`:''
    this.show(TOWERS[t.id].name,`<div class="tower-heading"><img src="${fixedTowerIcon(t.id,t.a,t.b,t.refinement)}" alt="${STAGES[stage]} ${TOWERS[t.id].name}"/><div><p class="eyebrow">${STAGES[stage]} · ${stage+1} of 5</p><h3>${stage>=2?t.def.paths[t.b?1:0].name:role[t.id]}</h3><p class="muted">${Math.round(s.effRange(t))} current reach · ${Math.round(t.damageDealt??0)} damage dealt</p></div></div>${income}<p class="sky-tower-note">${SKY_TOWER_HELP[t.id]}${!lamplit(t.id)?` <b>${s.sheltered(t)?'Sheltered by an Owl.':'Outside Owl shelter.'}</b>`:''}</p>${upgrades}${active?'<p class="notice">Inspect freely. Upgrades and movement happen between waves.</p>':''}
      ${t.id!=='garden'?`<fieldset><legend>Target priority</legend><div class="segmented">${(['first','strong','last','close'] as Priority[]).map(p=>button(`priority:${t.uid}:${p}`,p==='close'?'Nearest':p[0].toUpperCase()+p.slice(1),p===t.priority?'selected':'',active)).join('')}</div></fieldset>`:''}
      ${s.wave>=5?`<div class="bond-section"><h3>Tower Bond</h3>${partner?`<p><b>${bondName(t.id,partner.id)}</b> with ${TOWERS[partner.id].name}.</p><p class="small muted">${BOND_HELP[bondName(t.id,partner.id)!]} Activated ${bond!.activations} times.</p>${button('unbond:'+t.uid,'Remove Bond','secondary',active)}`:partners.length?`<p class="small muted">One tower per Bond. ${s.wave>=20?2:1} Bond slots available for this watch.</p>${partners.map(q=>button(`bond:${t.uid}:${q.uid}`,`${bondName(t.id,q.id)} · ${TOWERS[q.id].name}`,'secondary wide',active||s.bonds.length>=(s.wave>=20?2:1))).join('')}`:'<p class="small muted">A Moonbell and Cracker, or an Owl and Wickling, can bond when their ranges share the stream.</p>'}</div>`:''}
      <div class="utility-actions">${button('move:'+t.uid,'Move · 25','secondary',active||s.glow<25)}${button('sell:'+t.uid,`Sell · ${s.sellValue(t)}`,'secondary',active||s.challenge.commission==='garden'&&t.id==='garden')}</div>`,'tower')
  }
  private forecast() {
    const s=this.sim!,n=Math.min(s.finalWave,s.wave+(s.waveActive?0:1)),w=s.waveDef(n)
    const counts=new Map<EnemyId,number>();w.groups.forEach(g=>counts.set(g.type,(counts.get(g.type)??0)+g.count))
    this.show(`Wave ${n-s.waveOffset} forecast`,`<p class="lead">${w.note}</p>${button('sky',`${s.sky.night?'Dawn':'Nightfall'} in ${clockText(s.sky.phaseLeft)} · ${WEATHER[s.sky.weather].name}`,'secondary wide')}<div class="enemy-list">${[...counts].map(([id,count])=>`<article><img src="${enemyIcon(id)}" alt=""/><div><h3>${count} ${ENEMIES[id].name}${count>1?'s':''}</h3><p>${FIXED_TIPS[id]}</p></div></article>`).join('')}</div><p class="notice">Entrances: ${[...new Set(w.groups.map(g=>g.src==='west'?'Side inlet':'North stream'))].join(' and ')}. Surviving this wave earns ${Math.round((125+n*15)*DIFFICULTY[s.difficulty].bonus)} glow, plus defeated enemies and Gardens.</p>${this.recap?`<p>${this.recap}</p>`:''}`,'forecast')
  }
  private skyForecast() {
    const s=this.sim!,sky=s.sky
    const exposed=s.towers.filter(t=>!lamplit(t.id)&&!s.sheltered(t))
    this.show('Plan for the sky',`<p class="eyebrow">Cycle ${sky.cycle} · Active game time</p><p class="lead">${sky.night?'Dawn':'Nightfall'} in ${clockText(sky.phaseLeft)}</p><div class="sky-cycle"><div class="${!sky.night?'current':''}"><b>Daylight</b><span>1m 40s</span><small>Gardens +40% yield<br>Ballistas +12% reach</small></div><div class="${sky.night?'current':''}"><b>Night</b><span>1m 20s</span><small>Enemies move 8% faster<br>Unlit towers lose 15% reach</small></div></div><p>Wicklings, Moonbells, Owls and Lighthouses keep their reach. Wicklings fire 12% faster and Lighthouses deal 12% more damage at night. An Owl shelters nearby towers from darkness and mist.</p><p class="notice">${exposed.length?`${exposed.length} unlit ${exposed.length===1?'tower is':'towers are'} outside Owl shelter. Check that their night reach still covers the stream.`:'Every current attack tower is lamplit or sheltered.'} Garden yield falls to 55% at night; spending on income leaves less glow for the next defence.</p><h3>${WEATHER[sky.weather].name}</h3><p>${WEATHER[sky.weather].effect}</p><p class="small muted">Next: ${WEATHER[sky.nextWeather].name} in ${clockText(sky.weatherLeft)}. ${WEATHER[sky.nextWeather].effect}</p><p class="small muted">Weather is seeded every 45 combat seconds. The same watch has the same forecast after a reload or retry. Planning, pausing and backgrounding freeze both clocks. At 2× speed, both clocks advance at 2×.</p><p class="small muted">Garden income averages the conditions fought through during a wave. Waiting in a menu cannot grow a harvest.</p>`,'sky-forecast')
  }
  private district() {
    const legacy=loadProgress(),settlement=Math.max(legacy.settlement??0,this.profile.settlement)
    const names=['A sleeping district','The first windows glow','The waterside opens','The harbour is restored','The whole district is awake']
    const journal={...legacy.journal};for(const [id,n] of Object.entries(this.profile.journal)) journal[id as EnemyId]=(journal[id as EnemyId]??0)+(n??0)
    this.show('The district',`<div class="district-scene stage-${settlement}" aria-label="${names[settlement]}"><div class="district-houses">${[0,1,2,3,4].map(i=>`<span class="house ${i<=settlement?'lit':''}"></span>`).join('')}</div></div><h3>${names[settlement]}</h3><p class="muted">${settlement<4?`Hold ${[5,10,30,40][settlement]} waves to restore the next part of the district.`:'Every district is lit. Try a different waterway or a commission.'} Restorations and keepsakes never increase combat power.</p><div class="keepsakes">${COMMISSIONS.map(c=>`<span class="keepsake ${this.profile.commissions.includes(c.id)?'earned':''}">${this.profile.commissions.includes(c.id)?icon('check'):icon('lock')}${c.reward}</span>`).join('')}</div><h3>Your watches</h3><div class="records">${WATCH_NAMES.map((name,i)=>`<p><b>${name}</b><span>${(['relaxed','standard','nightfall'] as Difficulty[]).map(d=>`${DIFFICULTY[d].name} ${bestWave(this.profile,i,d)}/40`).join(' · ')}</span></p>`).join('')}</div>${Object.entries(this.profile.records).filter(([k,r])=>k.endsWith(':practice')&&r.practice).length?'<p class="small muted">Assisted Nightfall watches are kept separately as practice.</p>':''}<h3>Field journal</h3><div class="enemy-list">${Object.entries(journal).filter(([,n])=>(n??0)>0).map(([id,n])=>`<article><img src="${enemyIcon(id as EnemyId)}" alt=""/><div><h3>${ENEMIES[id as EnemyId].name} · ${Math.floor(n??0)}</h3><p>${FIXED_TIPS[id as EnemyId]}</p></div></article>`).join('')||'<p class="muted">Meet the first Drips to begin your journal.</p>'}</div><p class="small muted">Previous edition: ${legacy.runs} watches and ${Object.values(legacy.feats).filter(Boolean).length} achievements retained.</p>`,'district')
  }
  private commissions() {
    this.show('District Commissions',`<p class="lead">A short watch with one thoughtful constraint. Return whenever you like; every commission stays available.</p>${COMMISSIONS.map(c=>`<article class="commission"><p class="eyebrow">Five waves · ${WATCH_NAMES[c.variant]}</p><h3>${c.name}</h3><p>${c.desc}</p><p class="small muted">Keepsake: ${c.reward}${this.profile.commissions.includes(c.id)?' · earned':''}</p>${button('commission:'+c.id,'Accept commission','secondary wide')}</article>`).join('')}<p class="small muted">Your campaign has its own save slot. Starting a commission replaces only a previous commission attempt.</p>`,'commissions')
  }
  private settings() {
    const s=this.profile.settings
    this.show('Make yourself comfortable',`<div class="setting-list">${([['largeText','Larger text'],['reducedMotion','Reduced motion'],['muted','Mute sound'],['clearPalette','Distinct colours']] as const).map(([key,name])=>`<button data-action="setting:${key}" role="switch" aria-checked="${s[key]}"><span>${name}</span><b>${s[key]?'On':'Off'}</b></button>`).join('')}</div><p class="muted">Motion is restrained throughout. Opening a panel pauses the watch. Returning from another app leaves it paused.</p><h3>Your keeper</h3><p class="small muted">Choose a district crest. This is a cosmetic identity.</p><div class="segmented">${['lantern','ember','reed','tide'].map(g=>button('guardian:'+g,g[0].toUpperCase()+g.slice(1),this.guardian===g?'selected':'')).join('')}</div><p class="small muted">Keyboard: Tab moves between controls and plots. Enter selects. P pauses or resumes. Escape closes a panel.</p>`,'settings')
  }
  private menu() {this.show('Your watch',`<p>${WATCH_NAMES[this.map]} · ${DIFFICULTY[this.difficulty].name}${this.sim?.challenge.practice?' · Practice':''}</p>${button('forecast','Wave forecast','secondary wide')}${button('sky','Day, night & weather','secondary wide')}${button('district','District & journal','secondary wide')}${button('settings','Settings','secondary wide')}${button('home','Save & return to district','secondary wide')}<p class="small muted">Waves never advance while you are away.</p>`,'menu')}
  private result() {
    const s=this.sim!;this.endShown=true
    const won=s.over==='won'
    this.show(won?'The lantern is still alight':'A little light for next time',`<p class="eyebrow">${WATCH_NAMES[this.map]} · ${DIFFICULTY[s.difficulty].name}${s.challenge.practice?' · Practice':''}</p><p class="result-number">${s.wave-(won?0:1)-s.waveOffset}<small> waves held</small></p><p>${won?'The district remembers your watch.':s.lastLeak?`${ENEMIES[s.lastLeak.enemy].name} reached the lantern${s.lastLeak.armoured?' with armour remaining':''}${s.lastLeak.hidden?' while still hidden':''}. ${FIXED_TIPS[s.lastLeak.enemy]}`:'Try building around a longer shared stretch of the stream.'}</p>${won?button('rematch','Rematch this seed','primary wide'):button('retry',s.difficulty==='nightfall'?'Retry as practice':'Retry this wave','primary wide',!loadPlanning(this.slot))}${won&&!s.isChallenge?button('nextmap','Try the next waterway','secondary wide'):''}${button('home','Return to the district','secondary wide')}`,'result')
  }
  private change(fn:()=>unknown) {
    const s=this.sim!;if(s.waveActive||s.over)return
    const before=s.snapshot();fn()
    if(JSON.stringify(before)!==JSON.stringify(s.snapshot())){this.undo.push(before);if(this.undo.length>20)this.undo.shift()}
    this.save();this.plots();this.refresh()
  }
  private action(action:string) {
    const [cmd,a,b]=action.split(':'),s=this.sim
    if(cmd==='fixture'&&import.meta.env.DEV&&['0','15','30','39','day','night'].includes(a)) {
      void fetch(`${import.meta.env.BASE_URL}artifacts/fixed-wave-${a==='day'||a==='night'?'39':a}.json`).then(r=>r.json()).then((snap:SaveSnapshotV2)=>{this.qa=true;if(a==='day'||a==='night')snap.climate={elapsed:a==='day'?0:100,waveSeconds:0,gardenExposure:0};this.begin(Sim.restore(snap))})
      return
    }
    if(cmd==='close'){this.close();return}
    if(cmd==='choose'){this.choose();return}
    if(cmd==='map'){this.map=Number(a);this.choose();return}
    if(cmd==='mode'){this.difficulty=a as Difficulty;this.choose();return}
    if(cmd==='new'){this.newWatch();return}
    if(cmd==='home'){this.home();return}
    if(cmd==='resume'){const run=loadWatch(a as Slot);if(run){this.slot=a as Slot;this.begin(Sim.restore(run.snapshot),run.blooms)}return}
    if(cmd==='district'){this.district();return}
    if(cmd==='commissions'){this.commissions();return}
    if(cmd==='commission'){this.difficulty='standard';this.newWatch(a);return}
    if(cmd==='settings'){this.settings();return}
    if(cmd==='setting'){const k=a as keyof typeof this.profile.settings;this.profile.settings[k]=!this.profile.settings[k];writeJSON('profile',this.profile);this.applySettings();this.settings();return}
    if(cmd==='guardian'){this.guardian=a;this.profile.guardian=a;writeJSON('profile',this.profile);if(this.renderer)this.renderer.crest=a;this.settings();return}
    if(!s)return
    const tower=()=>s.towers.find(t=>t.uid===Number(a))!
    if(cmd==='menu')this.menu()
    if(cmd==='sky')this.skyForecast()
    if(cmd==='forecast')this.forecast()
    if(cmd==='plot')this.selectPlot(Number(a))
    if(cmd==='unlock'){this.change(()=>s.unlockPlot(Number(a)));this.selectPlot(Number(a))}
    if(cmd==='build'){this.change(()=>s.build(Number(a),b as TowerId));const t=s.pads[Number(a)].tower;if(t){this.close();this.selection={kind:'tower',tower:t};this.recap=`${TOWERS[t.id].name} ready. ${s.waveDef(s.wave+1).note??''}`}}
    if(cmd==='upgrade'){const t=tower();this.change(()=>stageOf(t)===3?s.refine(t):s.upgrade(t,Number(b) as 0|1));this.towerSheet(t)}
    if(cmd==='priority'){const t=tower();this.change(()=>{t.priority=b as Priority});this.towerSheet(t)}
    if(cmd==='bond'){const t=tower();this.change(()=>s.bond(t,s.towers.find(q=>q.uid===Number(b))!));this.towerSheet(t)}
    if(cmd==='unbond'){const t=tower();this.change(()=>s.unbond(t));this.towerSheet(t)}
    if(cmd==='move'){this.moving=Number(a);this.close()}
    if(cmd==='sell'){this.change(()=>s.sell(tower()));this.close()}
    if(cmd==='speed'){this.speed=this.speed===1?2:1}
    if(cmd==='undo'&&!s.waveActive&&this.undo.length){const snap=this.undo.pop()!,remaining=this.undo;this.begin(Sim.restore(snap),this.renderer!.exportBlooms());this.undo=remaining;this.save()}
    if(cmd==='go') {
      if(s.over)this.result()
      else if(s.waveActive)this.paused=!this.paused
      else if(s.towers.length) {this.writePlanning(s.snapshot());this.undo=[];this.recap='';this.selection=null;if(s.startWave()){this.paused=false;$('live').textContent=`Wave ${s.wave-s.waveOffset} begins.`;this.save()}}
    }
    if(cmd==='retry'){const p=loadPlanning(this.slot);if(p){p.challenge.practice ||=s.difficulty==='nightfall';p.stats.retries=(s.stats.retries??0)+1;this.begin(Sim.restore(p));this.save()}}
    if(cmd==='rematch')this.newWatch(s.challenge.commission,s.seed)
    if(cmd==='nextmap'){this.map=(this.map+1)%4;this.newWatch()}
    this.refresh()
  }
  private key(e:KeyboardEvent) {
    if(e.key==='Escape'){if(this.drawer)this.close();else{this.moving=null;this.paused=true;this.refresh()}return}
    if(this.drawer&&e.key==='Tab') {
      const all=[...document.querySelectorAll<HTMLButtonElement>('.drawer button:not(:disabled)')],first=all[0],last=all[all.length-1]
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
    if(e.code==='KeyP'&&!this.drawer&&this.sim){e.preventDefault();this.action('go');return}
    if(e.code==='Space'&&!this.drawer&&this.sim&&!(document.activeElement instanceof HTMLButtonElement)){e.preventDefault();this.action('go')}
  }
  private writePlanning(snapshot:SaveSnapshotV2) {if(!this.qa)writeJSON(this.slot+'.planning',snapshot)}
  private save() {if(!this.qa&&this.sim&&this.renderer)saveWatch(this.sim,this.renderer.exportBlooms(),this.slot)}
  private frame(now:number) {
    const dt=Math.min(.1,(now-(this.lastFrame||now))/1000);this.lastFrame=now
    const s=this.sim,r=this.renderer
    if(s&&r) {
      if(!this.paused&&!this.drawer&&!s.over){this.accumulator+=dt*this.speed;while(this.accumulator>=DT){s.step(DT);this.accumulator-=DT}}
      else this.accumulator=0
      for(const e of s.events) {
        if(e.t==='waveEnd') {
          const damage=s.waveReports.find(q=>q.wave===e.n)?.damage??{}
          const top=Object.entries(damage).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]
          this.recap=`Wave ${e.n-s.waveOffset} held · +${e.bonus+e.income} glow${top?` · ${TOWERS[top[0] as TowerId].name} led damage`:''}`
          this.paused=true;if(!this.qa)recordWatch(this.profile,s);r.settlement=Math.max(r.settlement,this.profile.settlement);this.plots();$('live').textContent=this.recap
          this.save()
        }
        if(e.t==='defeat'||e.t==='victory'){if(!this.qa)recordWatch(this.profile,s);this.save()}
      }
      r.handleEvents(s)
      r.draw(s,dt,{selection:this.selection,preview:null,armed:null,hint:null,paused:this.paused||!!this.drawer})
      if(s.over&&!this.endShown)this.result()
      const key=`${s.glow}:${s.lives}:${s.wave}:${s.waveActive}:${this.paused}:${Math.floor(s.climate.elapsed)}`
      if(key!==this.lastHUD){this.lastHUD=key;this.refresh()}
      if(now-this.lastSave>5000){this.lastSave=now;this.save()}
      sound.tick(dt,this.paused?0:Math.min(1,s.enemies.length/30))
    }
    requestAnimationFrame(t=>this.frame(t))
  }
}
