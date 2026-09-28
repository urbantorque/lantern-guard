import { compactNext, nextCompactVariant, PLOTS } from './game/compact'
import { FINAL_PERK, LATE_TOWERS, PREPARATIONS, nextMilestone } from './game/depth'
import { BATTLE_PLANS, type BattlePlanId } from './game/battle-plans'
import { gardensStatus } from './game/gardens'
import { GUARDIANS, guardianUnlocked, signatureFor, towerName, type GuardianId } from './game/guardians'
import { migrateSlots, selectSlot, saveHealth, type RunSlot } from './game/save-store'
import { watchAppState } from './core/platform'
import { sound } from './core/audio'
import { canUpgrade, CHARM_COST, CHARM_ORDER, DIFFICULTY, ENEMIES, TOWER_ORDER, TOWERS, type CharmTrait, type Difficulty, type EnemyId, type Priority, type TowerId } from './game/defs'
import { CANAL_STAGES, KEEPER_HELP, KEEPER_ROLE } from './game/canal-growth'
import { comboHint, routeCoverage } from './game/route-plan'
import { leakAdvice, waveHighlight } from './game/feedback'
import { wardenStatus } from './game/harbour'
import {
  BLOOM_SETS, creditMilestones, masteryGoal, guardianMasteryTier, FEATS,
  clearRun,
  canRetry, loadCheckpoint, saveCheckpoint,
  creditJournal,
  loadBlooms,
  loadChallenges,
  loadCoach,
  loadProgress,
  loadRun,
  loadSettings,
  recordChallenge,
  recordFreeplay,
  recordMetrics,
  recordResume,
  recordRun,
  saveCoach,
  saveProgress,
  saveRun,
  saveSettings,
  type ChallengeResult,
  type Coach,
  type SessionExtras,
  type Settings,
} from './game/progress'
import { DT, FINAL_WAVE, RELOCATE_COST, Sim, type Challenge, type GateState, type SimEvent, type Tower } from './game/sim'
import { offerFor, type ChallengeOffer } from './game/tides'
import { asBloomStyle } from './render/blooms'
import { resetEnemySprites } from './render/enemies'
import { clearGlyphCache, glyphBadgeURL } from './render/glyphs'
import { setPalette } from './render/palette'
import { incoming, Renderer, setHaptics, type Selection, type ViewState } from './render/renderer'
import { PAD_R, towerPortrait } from './render/towers'
import { clearIconCache, enemyIcon, towerIcon } from './ui/assets'
import { icon } from './ui/icons'
import { PATH_ROLE, refinementSummary, upgradeDescription, upgradeSummary } from './ui/upgrade'
import { isKeyboardMode, Screens } from './ui/screens'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

const PRIORITY_LABEL: Record<Priority, string> = { first: 'First', last: 'Last', strong: 'Strong', close: 'Nearest' }
const PRIORITY_NEXT: Record<Priority, Priority> = { first: 'strong', strong: 'close', close: 'last', last: 'first' }
const CHARM_LABEL: Record<CharmTrait, string> = { shell: 'Shells', veil: 'Hidden', swift: 'Fast', heavy: 'Heavy' }
const CHARM_ICON: Record<CharmTrait, EnemyId> = { shell: 'shell', veil: 'veil', swift: 'skitter', heavy: 'bloat' }
const LONG_PRESS = 0.45
/** Taps that land on a sheet within this long after it opened are ignored (the finger that opened it). */
const SHEET_GUARD_MS = 380

/** Compact numbers for the HUD so five-digit glow never pushes buttons off a phone screen. */
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const compact = (n: number) => (n >= 10000 ? compactFmt.format(n) : String(n))

/** Lock assist: how far ahead (seconds of travel) a Mope counts as reaching a lock, and how slow time gets. */
const ASSIST_LOOKAHEAD = 1.1
const ASSIST_SCALE = 0.5

/** Support keepers report what they did rather than Mopes cheered up. */
const stat = (t: Tower, key: 'slowed' | 'spotted' | 'earned') => (t as unknown as Record<string, number | undefined>)[key] ?? 0

interface Msg {
  title: string
  note: string
  ms: number
}

type MapTarget = { kind: 'pad'; index: number; x: number; y: number } | { kind: 'gate'; gate: GateState; x: number; y: number }

export class App {
  sim: Sim
  renderer: Renderer
  screens: Screens
  settings: Settings
  coach: Coach
  view: ViewState = { selection: null, preview: null, armed: null, hint: null, paused: false, cursor: null }
  speed = 1
  paused = false
  mode: 'title' | 'play' | 'over' = 'title'
  /** Which dock sheet is open: a keeper (via view.selection) or the lock charms. */
  sheetMode: 'none' | 'tower' | 'charms' | 'routes' | 'plot' = 'none'
  private acc = 0
  private last = performance.now()
  private hudCache: Record<string, string | number | boolean> = {}
  private bannerTimer = 0
  private bannerQueue: Msg[] = []
  private toastTimer = 0
  private autoTimer = 0
  private overTimer = -1
  private sheetKey = ''
  private sheetPointer = false
  private sheetOpenedAt = 0
  private sheetOpener: HTMLElement | null = null
  private gateBtns: HTMLButtonElement[] = []
  private trayBtns: HTMLButtonElement[] = []
  private pointerType = 'mouse'
  private downAt: { x: number; y: number; t: number } | null = null
  private notesShown = new Set<number>()
  private noteWave = -1
  private pendingTrait: Record<string, CharmTrait | undefined> = {}
  private pressTimer = 0
  private pressGate: GateState | null = null
  private longPressed = false
  private frameErrors = 0
  private sellArmed: { uid: number; at: number } | null = null
  private lowWarned = false
  private cursor = -1
  private lastPersist = 0
  private persistPending = false
  private reduceMq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  /** Lock assist: the current time scale, easing between 1 and ASSIST_SCALE. */
  timeScale = 1
  /** Playtest metrics for this sitting: real seconds paused and at 2x or 3x, and whether the run was resumed. */
  private sitting = { pausedSec: 0, fastSec: 0, resumed: false }
  private palette = ''
  private masteryProgress = loadProgress()
  private overviewFrom: 'canal' | 'harbour' | 'gardens' = 'canal'

  constructor() {
    migrateSlots()
    this.settings = loadSettings()
    this.coach = loadCoach()
    this.renderer = new Renderer($<HTMLCanvasElement>('cv'))
    this.sim = new Sim('standard', { compact: 1, variant: 0, guard: 1 })
    this.renderer.attach(this.sim)
    this.screens = new Screens(this)
    this.applySettings()
    this.reduceMq?.addEventListener?.('change', () => this.applySettings())
    const saveStatus = document.createElement('div')
    saveStatus.id = 'save-status'
    saveStatus.hidden = true
    saveStatus.setAttribute('role', 'status')
    document.body.appendChild(saveStatus)
    window.addEventListener('native-save-failed', () => {
      saveStatus.hidden = false
      saveStatus.textContent = 'The extra device backup is unavailable. Your browser save is still kept.'
    })
    this.buildHud()
    const zone = document.createElement('button')
    zone.id = 'btn-zone'
    zone.className = 'zone-switch'
    zone.hidden = true
    zone.onclick = () => {
      if (!this.view.moving) this.closeSheet()
      else this.view.moving.destination = null
      const zones: ('gardens' | 'harbour' | 'canal' | 'overview')[] = this.sim.challenge.gardens ? ['gardens', 'harbour', 'canal'] : ['harbour', 'canal']
      const next = (zones.indexOf(this.renderer.zone) + 1) % zones.length
      this.renderer.setZone(zones[next])
      this.cursor = -1
      this.refreshHud(true)
      this.refreshDock(true)
    }
    $('field').appendChild(zone)
    const overview = document.createElement('button')
    overview.id = 'btn-overview'; overview.className = 'zone-switch overview-switch'; overview.hidden = true
    overview.onclick = () => {
      if (this.view.moving) return
      this.closeSheet(); this.view.armed = null; this.view.selection = null; this.view.preview = null
      if (this.renderer.zone !== 'overview') this.overviewFrom = this.renderer.zone
      this.renderer.setZone(this.renderer.zone === 'overview' ? this.overviewFrom : 'overview')
      this.cursor = -1; this.refreshHud(true)
    }
    $('field').appendChild(overview)
    const goal = document.createElement('div'); goal.id = 'mastery-goal'; goal.hidden = true
    $('dock').prepend(goal)
    const plans = document.createElement('button'); plans.id = 'btn-battle-plan'; plans.hidden = true
    plans.onclick = () => { this.closeSheet(); this.screens.battlePlans() }
    $('dock').prepend(plans)
    const supplies = document.createElement('button'); supplies.id = 'btn-prepare'; supplies.hidden = true
    supplies.onclick = () => { this.closeSheet(); this.screens.preparations() }
    $('dock').prepend(supplies)
    $('move-cancel').onclick = () => this.cancelMove()
    $('move-confirm').onclick = () => this.confirmMove()
    const learn = document.createElement('div')
    learn.id = 'learn-bar'
    learn.hidden = true
    learn.innerHTML = '<span></span><button aria-label="Skip build demonstration">Skip</button>'
    learn.querySelector('button')!.onclick = () => {
      this.coach.tutorialDone = true
      saveCoach(this.coach)
      this.select(null)
      this.updateCoach()
    }
    $('dock').prepend(learn)
    this.buildDock()
    this.bindInput()
    this.resize()
    new ResizeObserver(() => this.resize()).observe($('field'))
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200))
    this.renderer.glowTarget = () => this.glowTargetWorld()
    this.renderer.onGlowArrive = () => this.bumpGlow()
    this.renderer.onLightChange = () => {
      const el = document.querySelector('.stat-light')!
      el.classList.remove('hurt')
      void (el as HTMLElement).offsetWidth
      el.classList.add('hurt')
    }
    watchAppState(() => {
      this.persist(true)
      sound.suspend()
      if (this.mode === 'play' && !this.sim.over) this.setPaused(true, true)
      this.acc = 0
      this.last = performance.now()
    })
    this.screens.title()
    requestAnimationFrame((t) => this.frame(t))
    ;(window as unknown as { __ll: App }).__ll = this
  }

  // ------------------------------------------------------------------ run lifecycle

  newRun(difficulty: Difficulty) {
    this.persist(true)
    selectSlot('campaign')
    this.leaveRun()
    clearRun()
    const progress = loadProgress()
    const watch = Number.isSafeInteger(progress.watchIndex) && progress.watchIndex! >= 0 ? progress.watchIndex! : 0
    progress.watchIndex = watch + 1
    saveProgress(progress)
    this.sim = new Sim(difficulty, { compact: 1, plans: 1, depth: 1, variant: nextCompactVariant(watch), guard: 1, ...(this.settings.guardian && guardianUnlocked(this.settings.guardian, progress.feats) ? { guardian: this.settings.guardian } : {}) }, 7 + watch * 997)
    this.startRun()
    this.persist(true)
  }

  chooseBattlePlan(id: BattlePlanId) {
    if (!this.sim.chooseBattlePlan(id)) return false
    this.closeSheet(); this.buildDock(); this.refreshDock(true)
    this.persist(true)
    this.toast(BATTLE_PLANS[id].name + ' selected. Applies to this game only.', 3500)
    return true
  }

  /** Starts a daily tide or weekly night (a fresh copy of its rules, so the offer is never mutated). */
  newChallenge(challenge: Challenge) {
    this.persist(true)
    selectSlot('challenge')
    this.leaveRun()
    clearRun()
    this.sim = new Sim('standard', JSON.parse(JSON.stringify(challenge)) as Challenge, 7)
    this.startRun()
    this.persist(true)
    const offer = this.offer()
    if (!offer) return
    const opening = this.sim.challenge.skirmish ? `${this.sim.glow.toLocaleString('en')} glow left. Improve the starting towers, then hold 10 waves.` : this.sim.challenge.tide ? `Build with ${this.sim.glow.toLocaleString('en')} glow, then start the tide.` : 'The whole night, under one rule.'
    this.banner(offer.name, [opening, ...offer.rules].join(' '), 5200)
  }

  /** The offer the running challenge came from (names and rules for banners, the end card and share text). */
  offer(): ChallengeOffer | null {
    return this.sim.challenge.id ? offerFor(this.sim.challenge.id) : null
  }

  /** Player-facing wave number: tides count their own waves (tide wave 1 is wave 15 of the night). */
  shownWave(n = this.sim.wave): number {
    return n - this.sim.waveOffset
  }

  /** A run in progress is being replaced: bank its journal and note it for the playtest log. */
  private leaveRun() {
    const snap = loadRun()
    if (!snap) return
    // from the title (after a reload) the live sim is a placeholder: the run being replaced is the saved one
    const sim = Sim.restore(snap)
    if (sim.over || sim.stats.time <= 0) return
    creditJournal(sim.stats.cheered)
    recordMetrics(sim, 'abandoned', this.extras())
  }

  continueRun(slot: RunSlot = 'campaign') {
    this.persist(true)
    selectSlot(slot)
    const snap = loadRun()
    if (!snap) return this.newRun('standard')
    const recovered = saveHealth === 'recovered'
    const blooms = loadBlooms()
    this.sim = Sim.restore(snap)
    this.startRun()
    this.sitting.resumed = true
    if (blooms.length) this.renderer.importBlooms(blooms)
    if (this.sim.over) {
      this.lastResult = { won: this.sim.over === 'won', fresh: [], freeplay: this.sim.freeplayFrom > 0, challenge: null }
      this.showEnd()
      return
    }
    recordResume(this.sim)
    const mid = this.sim.waveActive
    const word = this.sim.challenge.tide ? 'Tide wave' : 'Wave'
    this.banner(mid ? `${word} ${this.shownWave()}` : `${word} ${this.shownWave() + 1} is next`, mid ? 'Resumed where you left off. Paused so you can get your bearings.' : 'Resumed from your last save.', 2800)
    if (recovered) this.toast('Recovered the previous autosave. Your last few seconds may be missing.', 6500)
    if (mid) this.setPaused(true)
    if (this.sim.challenge.depth && this.sim.towers.length) this.screens.resumeBriefing()
  }

  private startRun() {
    this.renderer.attach(this.sim)
    this.renderer.setZone(this.sim.challenge.gardens ? 'gardens' : this.sim.challenge.harbour ? 'harbour' : 'canal')
    this.updateMilestones(false)
    this.mode = 'play'
    this.speed = 1
    this.paused = false
    this.overTimer = -1
    this.view = { selection: null, preview: null, armed: null, hint: null, paused: false, cursor: null }
    this.sheetMode = 'none'
    this.notesShown.clear()
    this.clearMessages()
    this.sheetKey = ''
    this.hudCache = {}
    this.lowWarned = false
    this.sellArmed = null
    this.pendingTrait = {}
    this.timeScale = 1
    this.sitting = { pausedSec: 0, fastSec: 0, resumed: false }
    this.screens.close()
    this.buildDock()
    this.refreshDock(true)
    if (!this.coach.tutorialDone && (this.sim.challenge.expanding || this.sim.challenge.compact) && !this.sim.wave && !this.sim.towers.length) {
      this.select({ kind: 'pad', index: this.sim.challenge.compact ? 0 : 12 })
      this.view.preview = 'wick'
    }
    this.updateCoach()
  }

  quitToTitle() {
    this.overTimer = -1
    this.persist(true)
    this.mode = 'title'
    this.paused = false
    this.view.paused = false
    const snap = loadRun('campaign') ?? loadRun('challenge')
    this.sim = snap ? Sim.restore(snap) : new Sim('standard', { compact: 1, variant: 0, guard: 1 })
    this.renderer.attach(this.sim)
    this.closeSheet()
    this.clearMessages()
    this.screens.title()
  }

  restart() {
    if (this.sim.isChallenge) this.newChallenge(this.sim.challenge)
    else this.newRun(this.sim.difficulty)
  }

  continueFreeplay() {
    this.sim.continueFreeplay()
    this.mode = 'play'
    this.overTimer = -1
    this.paused = false
    this.view.paused = false
    this.screens.close()
    this.refreshHud(true)
    this.banner('Free play', 'The Mopes keep coming, stronger each wave. How long can the lantern last?', 3200)
    this.persist(true)
  }

  continueHarbour() {
    if (!this.sim.continueHarbour()) return
    this.mode = 'play'
    this.overTimer = -1
    this.paused = false
    this.view.paused = false
    this.screens.close()
    this.renderer.setHarbourView(true)
    this.refreshHud(true)
    this.persist(true)
  }

  chooseGuardian(id: GuardianId): boolean {
    if (!GUARDIANS[id] || !guardianUnlocked(id, loadProgress().feats) || !this.sim.changeGuardian(id)) return false
    const ok = saveRun(this.sim.snapshot(), this.renderer.exportBlooms())
    if (!ok) this.toast('Guardian changed for this session. Saving is unavailable.', 4000)
    return true
  }

  continueGardens() {
    if (!this.sim.continueGardens()) return
    this.mode = 'play'; this.overTimer = -1; this.paused = false; this.view.paused = false
    this.screens.close(); this.renderer.setZone('gardens')
    this.refreshHud(true); this.persist(true)
  }

  retryPlanning() {
    if (!canRetry(this.sim) || this.sim.over !== 'lost') return
    const point = loadCheckpoint()
    if (!point || point.snapshot.challenge.harbour !== this.sim.challenge.harbour || point.snapshot.challenge.gardens !== this.sim.challenge.gardens) return
    const attempts = (this.sim.stats.retries ?? 0) + 1
    this.sim = Sim.restore(point.snapshot)
    this.sim.stats.retries = attempts
    this.startRun()
    this.renderer.importBlooms(point.blooms)
    this.setPaused(true)
    this.banner(`Revise wave ${this.sim.wave + 1}`, 'Same resources and enemies. Adjust your defence, then press Start.', 5000)
    this.persist(true)
  }

  setPaused(p: boolean, showMenu = false) {
    if (this.mode !== 'play') return
    if (p && this.sim.over) return
    this.paused = p
    this.view.paused = p
    this.refreshHud(true)
    if (p && showMenu) this.screens.pause()
  }

  // ------------------------------------------------------------------ frame

  private frame(now: number) {
    // schedule first: one bad frame must never stop the game for good
    requestAnimationFrame((t) => this.frame(t))
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    try {
      const sim = this.sim
      if (this.mode === 'play' && !this.paused && !sim.over) {
        this.timeScale = this.assistScale(dt)
        if (this.speed > 1) this.sitting.fastSec += dt
        this.acc += dt * this.speed * this.timeScale
        let steps = 0
        while (this.acc >= DT && steps < 12) {
          sim.step(DT)
          this.acc -= DT
          steps++
        }
        if (steps >= 12) this.acc = 0
      } else if (this.paused) {
        sim.tickCooldowns(dt)
        if (this.mode === 'play') this.sitting.pausedSec += dt
      }
      if (sim.events.length) this.onEvents(sim.events)
      this.renderer.handleEvents(sim)
      this.view.cursor = this.cursorTarget()
      this.renderer.draw(sim, this.paused ? dt * 0.35 : dt, this.view)
      if (this.mode !== 'title') this.refreshHud(false)
      this.refreshDock(false)
      this.tickTimers(dt)
      sound.tick(dt, Math.min(1, sim.enemies.length / 40))
    } catch (err) {
      if (this.frameErrors++ < 3) console.error('Lantern Guard frame error', err)
      this.sim.events.length = 0
    }
  }

  /**
   * Slow at the locks: time eases toward half speed while a Mope is about to reach a lock the player can flip,
   * and back once the crowd has passed. Eased, so the world never lurches.
   */
  private assistScale(dt: number): number {
    const sim = this.sim
    let want = 1
    if (this.settings.lockAssist && !this.screens.isOpen()) {
      outer: for (const g of sim.gates) {
        if (sim.gateLocked(g) || g.jammed) continue
        for (const e of sim.enemies) {
          const d = sim.distanceToGate(e, g.def.id)
          if (d !== null && d >= 0 && d < Math.max(30, e.speedNow * ASSIST_LOOKAHEAD)) {
            want = ASSIST_SCALE
            break outer
          }
        }
      }
    }
    const k = Math.min(1, dt * (want < this.timeScale ? 6 : 2.5))
    return this.timeScale + (want - this.timeScale) * k
  }

  private onEvents(events: SimEvent[]) {
    const firstRuns = loadProgress().runs < 2
    for (const ev of events) {
      let milestoneMessage = ''
      switch (ev.t) {
        case 'waveStart': {
          const def = this.sim.waveDef(ev.n)
          const boss = def.groups.some((g) => ENEMIES[g.type].boss)
          const tide = !!this.sim.challenge.tide
          const label = ev.n > this.sim.finalWave ? `Free play wave ${ev.n - this.sim.finalWave}` : tide ? `Tide wave ${this.shownWave(ev.n)}` : `Wave ${this.shownWave(ev.n)}`
          // a tide's remixed waves carry no handmade notes: its bosses get the canonical warnings
          const note = def.note ?? (tide && boss ? (ev.n === FINAL_WAVE ? 'Old Gloom is shrouded until it splits at the Lower Lock.' : 'Gloomtoads jam any lock they sit on. Set your locks before they arrive.') : '')
          if (note && (firstRuns || boss || ev.n === 11 || this.sim.challenge.harbour) && !this.notesShown.has(ev.n)) {
            this.notesShown.add(ev.n)
            this.noteWave = ev.n
            this.banner(label, note, 4600)
          } else this.banner(label, '', 1100)
          this.updateCoach()
          this.persist()
          break
        }
        case 'waveEnd':
          milestoneMessage = this.updateMilestones() ?? ''
          if (!this.sim.waveActive && !this.sim.lastLeak && ev.n >= 7 && !this.sim.over) this.toast(waveHighlight(this.sim, ev.n), 4200)
          if (!this.sim.waveActive && this.sim.lastLeak && !this.sim.over) {
            this.view.feedbackRoute = this.sim.lastLeak.route
            this.toast(leakAdvice(this.sim), 6500)
          }
          if (ev.n === 1) { this.coach.tutorialDone = true; saveCoach(this.coach) }
          this.persist(true)
          if ((this.sim.challenge.expanding || this.sim.challenge.compact) && !this.sim.waveActive && ev.n !== 5) {
            const joined = TOWER_ORDER.find(id => this.sim.keeperAllowed(id) && this.sim.keeperWave(id) === ev.n + 1)
            if (joined) this.toast(`${towerName(joined, this.sim.challenge.guardian)} is ready. ${this.keeperHelp(joined)}`, 4500)
          }
          if (ev.n === 3 && !this.coach.upgraded) this.toast('Tap a tower to see its upgrades.', 3500)
          if ((ev.n === 6 || ev.n === 7) && !this.coach.charmSeen && this.sim.charmsAllowed) {
            this.toast('Charms send one enemy type down a chosen route. Tap Charms to set one.', 5000)
            this.coach.charmSeen = true
            saveCoach(this.coach)
          }
          if (this.sim.challenge.compact && !this.sim.isChallenge && !this.sim.waveActive && [5, 10, 15, 20, 25, ...(this.sim.challenge.depth ? [30, 35] : [])].includes(ev.n)) {
            const reward = this.sim.challenge.depth && ev.n === 35 ? 'Level 7 upgrades are ready. Each tower gains a final perk.' : this.sim.challenge.depth && ev.n === 30 ? 'Level 6 upgrades are ready. Ten waves to go.' : ev.n === 25 ? `Level 5 upgrades are ready.${this.sim.challenge.depth ? ' Dusk Ballista joins your towers.' : ' Skiffs arrive next.'}` : ev.n === 15 ? `Level 4 upgrades and two building plots are ready.${this.sim.challenge.depth ? ' Storm Reed joins your towers.' : ''}` : 'Two building plots are ready. Tap a + to see the price.'
            this.toast(reward, 5500)
          }
          if (milestoneMessage) this.toast(milestoneMessage, 6000)
          this.updateCoach()
          break
        case 'expand': {
          this.closeSheet()
          this.view.selection = null
          this.view.preview = null
          this.view.armed = null
          this.renderer.attach(this.sim, true)
          this.buildDock()
          this.refreshDock(true)
          this.updateCoach()
          this.banner(ev.stage === 4 ? 'Water Gardens opens' : ev.stage === 3 ? 'Lantern Harbour opens' : ev.stage === 1 ? 'The upper canal opens' : 'The west inlet opens', ev.stage === 4 ? 'Two approaches meet above the harbour. Four new pads are ready. Use Whole map to follow the complete route.' : ev.stage === 3 ? 'Four new pads upstream. Your canal stays built. Use View canal to check the lower defence.' : ev.stage === 1
            ? 'Your towers stay put. New pads, a second lock and Lamp Owls are ready. Build before wave 6.'
            : 'Four new pads are ready. From wave 11, Mopes also enter from the west. Your towers and upgrades stay.', 6500)
          this.persist(true)
          break
        }
        case 'leak':
          if (!this.lowWarned && this.sim.lives > 0 && this.sim.lives <= this.sim.maxLives * 0.4) {
            this.lowWarned = true
            this.toast(this.sim.challenge.guard ? 'The lantern is dimming. Pause and check which water your attacking towers cover.' : 'The lantern is dimming. Pause and plan, and keep tough Mopes on the long loops.', 4200)
          }
          break
        case 'victory':
        case 'defeat': {
          const won = ev.t === 'victory'
          this.recordResult(won)
          this.overTimer = won ? 2.6 : 1.6
          this.clearMessages()
          if (won) {
            sound.victory()
            this.banner('Dawn breaks', '', 2600)
          } else sound.defeat()
          this.paused = false
          this.view.paused = false
          this.closeSheet()
          break
        }
        case 'unlock': {
          // 'unlock' arrives before 'waveStart': skip the toast when that wave's note will say the same thing
          const def = this.sim.waveDef(this.sim.wave)
          if (def.note && firstRuns && !this.notesShown.has(this.sim.wave)) break
          const g = this.sim.gates.find((q) => q.def.id === ev.gate)!
          const rich = g.def.lockedDir === 0 ? 1 : 0
          this.toast(`${g.def.name} is open. ${g.def.labels[rich]}: ${g.def.blurbs[rich]}`, 4200)
          break
        }
        case 'source':
          if (this.sim.challenge.compact) { this.banner('The side inlet opens', 'A second approach on the same board. Check your tower coverage.', 3600); break }
          this.banner('The West Sluice opens', 'Its Mopes join the middle channel and skip the Upper Lock.', 4200)
          break
        case 'jam': {
          if (!ev.on) break
          const g = this.sim.gates.find((q) => q.def.id === ev.gate)
          this.toast(`${g?.def.name ?? 'A lock'} is jammed by a boss!`, 2000)
          break
        }
        case 'split':
          this.toast('Old Gloom splits! One half down each channel.', 2600)
          break
        case 'spawn':
          // the wave note already introduces the boss; only announce it when it did not
          if (!ev.boss || this.noteWave === this.sim.wave) break
          if (ev.type === 'gloom') this.banner('Old Gloom rises', 'It splits in two at the Lower Lock.', 3600)
          else if (ev.type === 'bloomheart') this.banner('Bloomheart', 'Its ring counts down to a healing pulse. Clear nearby Mopes before it lands.', 4200)
          else if (ev.type === 'warden') this.banner('The Harbour Warden', (this.sim.challenge.harbourEncounters || this.sim.challenge.compact) ? 'Watch its signal and clear the linked escorts.' : 'It launches Skiffs and surges at half health.', 3600)
          else this.banner('Gloomtoad!', 'It jams any lock it sits on.', 2400)
          break
      }
    }
  }

  private tickTimers(dt: number) {
    const toastUp = this.toastTimer > 0
    if (this.bannerTimer > 0 && !toastUp) {
      this.bannerTimer -= dt
      if (this.bannerTimer <= 0) {
        const next = this.bannerQueue.shift()
        if (next) this.showBanner(next)
        else $('banner').classList.remove('show')
      }
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) {
        $('toast').classList.remove('show')
        // a banner that was waiting behind the toast comes back
        if (this.bannerTimer > 0) $('banner').classList.add('show')
        this.placeMessages()
      }
    }
    if (this.overTimer > 0) {
      this.overTimer -= dt
      if (this.overTimer <= 0) this.showEnd()
    }
    if (this.pressGate && this.pressTimer > 0) {
      this.pressTimer -= dt
      if (this.pressTimer <= 0) {
        this.longPressed = true
        const g = this.pressGate
        this.pressGate = null
        if (this.sim.challenge.guard) this.chooseGate(g, true)
        else this.openCharms(g)
      }
    }
    if (this.sellArmed && performance.now() - this.sellArmed.at > 2600) {
      this.sellArmed = null
      this.sheetKey = ''
    }
    if ((this.persistPending && performance.now() - this.lastPersist > 1500) || (this.mode === 'play' && !this.paused && performance.now() - this.lastPersist > 5000)) this.persist(true)
    if (this.mode === 'play' && this.settings.autoStart && !this.view.moving && !this.paused && !this.sim.lastLeak && this.sheetMode === 'none' && !this.sim.expansionPlanning && !this.sim.guardPlanning && this.sim.canStartWave() && !this.sim.waveActive && this.sim.wave > 0) {
      this.autoTimer += dt
      if (this.autoTimer > 1.4) {
        this.autoTimer = 0
        this.startWave()
      }
    } else this.autoTimer = 0
  }

  /** The result is recorded the moment the run ends; only the end card waits. */
  lastResult: { won: boolean; fresh: string[]; freeplay: boolean; challenge: { best: ChallengeResult; improved: boolean } | null } | null = null

  private recordResult(won: boolean) {
    this.updateMilestones(false)
    const sim = this.sim
    const freeplay = sim.freeplayFrom > 0
    let fresh: string[] = []
    let challenge: { best: ChallengeResult; improved: boolean } | null = null
    creditJournal(sim.stats.cheered)
    if (sim.isChallenge) challenge = recordChallenge(sim, sim.finalWave)
    else if (freeplay) recordFreeplay(sim)
    else if (won || !canRetry(sim)) fresh = recordRun(sim, this.renderer.bloomCount())
    recordMetrics(sim, won ? 'won' : freeplay ? 'freeplay-end' : 'lost', this.extras())
    if (!sim.isChallenge && sim.challenge.guard && !sim.freeplay && (won || canRetry(sim))) saveRun(sim.snapshot(), this.renderer.exportBlooms())
    else clearRun()
    this.lastResult = { won, fresh, freeplay, challenge }
  }

  /** What only the app knows about this sitting, for the playtest log. */
  extras(): SessionExtras {
    const s = this.settings
    const options = [s.palette === 'clear' && 'colour-safe', s.hand === 'left' && 'left-hand', s.bigText && 'larger-text', s.lockAssist && 'lock-assist', s.autoStart && 'auto-start'].filter(Boolean) as string[]
    return { flipHint: s.flipHint, pausedSec: this.sitting.pausedSec, fastSec: this.sitting.fastSec, resumed: this.sitting.resumed, options }
  }

  private showEnd() {
    this.overTimer = -1
    if (this.mode !== 'play' || !this.sim.over || !this.lastResult) return
    this.mode = 'over'
    this.closeSheet()
    this.clearMessages()
    this.screens.end(this.lastResult.won, this.lastResult.fresh, this.lastResult.freeplay)
  }

  /** Autosave: the snapshot holds the whole state, mid-wave included. Routine saves are throttled, with a trailing save. */
  persist(force = false) {
    if (this.mode !== 'play' || this.sim.over) return
    const now = performance.now()
    if (!force && now - this.lastPersist < 1500) {
      this.persistPending = true
      return
    }
    this.persistPending = false
    this.lastPersist = now
    this.updateMilestones()
    const ok = saveRun(this.sim.snapshot(), this.renderer.exportBlooms())
    const status = $('save-status')
    status.hidden = ok
    if (!ok) status.textContent = 'Saving unavailable. Keep this game open to retain your night.'
    creditJournal(this.sim.stats.cheered)
  }

  private updateMilestones(announce = true) {
    const earned = creditMilestones(this.sim)
    const p = this.masteryProgress = loadProgress()
    this.renderer.settlement = p.settlement ?? 0
    this.renderer.guardianMastery = this.sim.isChallenge ? 0 : guardianMasteryTier(p.guardianRecords?.[this.sim.challenge.guardian ?? 'lantern']?.waves ?? 0)
    this.renderer.bunting = !!p.feats['early-bird']
    if (!announce) return
    const rewards: Record<string, string> = { groundskeeper: 'Tide Keeper unlocked', crowned: 'Ember Keeper unlocked', 'full-bloom': 'Reed Keeper unlocked', 'early-bird': 'Village bunting unlocked' }
    const words = [...earned.restorations, ...earned.feats.map(id => `${FEATS.find(f => f.id === id)!.name}: ${rewards[id]}.`)]
    if (words.length) this.toast(words.join(' '), 6000)
    return words.join(' ')
  }

  // ------------------------------------------------------------------ actions

  startWave() {
    if (this.view.moving) return
    if (this.mode !== 'play' || this.sim.over) return
    if (this.sim.canStartWave()) saveCheckpoint(this.sim, this.renderer.exportBlooms())
    const early = this.sim.earlyBonus()
    if (this.sim.startWave()) {
      this.view.feedbackRoute = undefined
      this.clearMessages()
      if (this.sheetMode === 'routes') this.closeSheet()
      sound.tap()
      if (early > 0) this.toast(`Called early: +${early} glow`, 1400)
      if (!this.coach.started) {
        this.coach.started = true
        saveCoach(this.coach)
      }
      if (this.paused) this.setPaused(false)
      this.updateCoach()
    }
  }

  private beginMove(tower: Tower) {
    if (!this.sim.canRelocate(tower)) return
    if (this.sim.glow < RELOCATE_COST) { this.toast(`Moving costs ${RELOCATE_COST} glow.`); return }
    this.closeSheet()
    this.view.armed = null
    this.view.hint = null
    this.view.moving = { tower, destination: null, fromZone: this.renderer.zone }
    this.clearMessages()
    this.refreshDock(true)
    this.refreshHud(true)
    if (isKeyboardMode()) { this.cursor = -1; $('cv').focus() }
  }

  private previewMove(index: number) {
    const moving = this.view.moving
    if (!moving) return
    if (!this.sim.padAvailable(index) || this.sim.pads[index]?.tower) {
      moving.destination = null
      this.refreshDock(true)
      this.toast('Choose an empty stone pad. Your tower stays put until you confirm.')
      return
    }
    moving.destination = index
    sound.tap()
    this.refreshDock(true)
  }

  private cancelMove() {
    const tower = this.view.moving?.tower
    if (this.view.moving) this.renderer.setZone(this.view.moving.fromZone)
    this.view.moving = undefined
    if (tower) this.select({ kind: 'tower', tower })
    this.refreshDock(true)
    this.refreshHud(true)
  }

  private confirmMove() {
    const moving = this.view.moving
    if (!moving || moving.destination === null) return
    if (!this.sim.relocate(moving.tower, moving.destination)) { this.toast('That move is no longer available. Choose another empty pad.'); return }
    this.view.moving = undefined
    this.select({ kind: 'tower', tower: moving.tower })
    sound.tap()
    this.toast(`${towerName(moving.tower.id, this.sim.challenge.guardian)} moved. Upgrades and progress kept.`, 2200)
    this.persist(true)
    this.refreshDock(true)
    this.refreshHud(true)
  }

  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1
    sound.tap()
    this.refreshHud(true)
  }

  flip(g: GateState): boolean {
    const sim = this.sim
    const i = sim.gates.indexOf(g)
    const btn = this.gateBtns[i]
    const nudge = () => {
      btn?.classList.remove('shake')
      void btn?.offsetWidth
      btn?.classList.add('shake')
    }
    if (sim.over) return false
    if (sim.gateLocked(g)) {
      sound.deny()
      nudge()
      this.toast(sim.challenge.lockedGates ? 'Gates are fixed in this challenge.' : `${g.def.name} opens at wave ${g.def.unlockWave}.`)
      return false
    }
    if (g.jammed) {
      sound.deny()
      nudge()
      this.toast(`${g.def.name} is jammed. Wait for the boss to pass.`)
      return false
    }
    if (this.paused && !DIFFICULTY[sim.difficulty].pausedFlips && (!sim.challenge.guard || sim.waveActive)) {
      sound.deny()
      nudge()
      this.toast('Nightfall: no flipping while paused.')
      return false
    }
    if (g.cd > 0) {
      sound.deny()
      nudge()
      return false
    }
    if (!sim.flipGate(g)) return false
    btn?.classList.remove('flash')
    void btn?.offsetWidth
    btn?.classList.add('flash')
    if (!sim.waveActive && !sim.challenge.guard) this.toast(`${g.def.labels[g.state]}: ${g.def.blurbs[g.state]}`, 4000)
    if (!this.coach.flipped) {
      this.coach.flipped = true
      saveCoach(this.coach)
      if (this.settings.flipHint && sim.waveActive) this.toast(`Mopes now take the ${g.def.labels[g.state]}. ${g.def.blurbs[g.state]}`, 4200)
      this.updateCoach()
    }
    this.persist()
    return true
  }

  /** Why this keeper cannot be built tonight, or null if it can. */
  private keeperBarred(id: TowerId): string | null {
    const sim = this.sim
    if (sim.keeperAllowed(id)) return null
    if (LATE_TOWERS.includes(id) && !sim.challenge.depth) return `Start a new game to use ${TOWERS[id].name}.`
    if ((sim.challenge.expanding || sim.challenge.compact) && sim.planningWave < sim.keeperWave(id)) return `${towerName(id, this.sim.challenge.guardian)} is available from wave ${sim.keeperWave(id)}.`
    const k = sim.challenge.keepers
    if (k && !k.includes(id)) return `Tonight only ${k.map((q) => TOWERS[q].name).join(', ')} can be built.`
    return `No ${TOWERS[id].name}s tonight.`
  }

  build(padIndex: number, id: TowerId) {
    const sim = this.sim
    if (sim.plotCost(padIndex) !== null) { this.select({ kind: 'pad', index: padIndex }); return }
    const barred = this.keeperBarred(id)
    if (barred) {
      sound.deny()
      this.shakeTray(id)
      this.toast(barred)
      return
    }
    if (sim.glow < TOWERS[id].cost) {
      sound.deny()
      this.shakeTray(id)
      this.toast(`Need ${TOWERS[id].cost - sim.glow} more glow.`)
      return
    }
    const t = sim.build(padIndex, id)
    if (!t) return
    this.view.preview = null
    this.view.armed = null
    this.view.selection = null
    if (!this.coach.built) {
      this.coach.built = true
      saveCoach(this.coach)
      this.toast(`${towerName(t.id, this.sim.challenge.guardian)} built. Tap it any time to upgrade. Now start the wave.`, 3800)
    } else this.toast(`${towerName(t.id, this.sim.challenge.guardian)} built.`, 1000)
    this.persist()
    this.updateCoach()
    this.refreshDock(true)
  }

  upgrade(t: Tower, path: 0 | 1) {
    const cost = this.sim.upgradeCost(t, path)
    if (cost == null) return
    if (this.sim.glow < cost) {
      sound.deny()
      this.toast(`Need ${cost - this.sim.glow} more glow.`)
      document.querySelectorAll(`.up-btn[data-path="${path}"]`).forEach((el) => {
        el.classList.remove('shake')
        void (el as HTMLElement).offsetWidth
        el.classList.add('shake')
      })
      return
    }
    this.view.upgradeRange = undefined
    this.sim.upgrade(t, path)
    const tier = path === 0 ? t.a : t.b
    if (tier === 3) this.toast(`${t.def.paths[path].tiers[2].name}!`, 1600)
    this.updateMilestones()
    if (!this.coach.upgraded) {
      this.coach.upgraded = true
      saveCoach(this.coach)
    }
    this.sheetKey = ''
    this.persist()
  }

  /** Selling takes two taps: the first arms the button, the second sells. */
  sell(t: Tower) {
    const now = performance.now()
    if (!this.sellArmed || this.sellArmed.uid !== t.uid || now - this.sellArmed.at > 2600) {
      this.sellArmed = { uid: t.uid, at: now }
      sound.tap()
      this.patchTowerSheet($('sheet'), t, true)
      return
    }
    this.sellArmed = null
    this.sim.sell(t)
    this.closeSheet()
    this.persist()
  }

  setCharm(g: GateState, trait: CharmTrait, dir: 0 | 1) {
    const sim = this.sim
    if (sim.gateLocked(g)) return
    const cur = g.charm
    if (cur && cur.trait === trait && cur.dir === dir) {
      sim.setCharm(g, null)
      sound.sell()
    } else {
      if (!cur && sim.glow < CHARM_COST) {
        sound.deny()
        this.toast(`Charms cost ${CHARM_COST} glow.`)
        return
      }
      sim.setCharm(g, trait, dir)
    }
    this.sheetKey = ''
    this.persist()
  }

  select(sel: Selection) {
    this.view.moving = undefined
    this.view.selection = sel
    this.view.routeDir = undefined
    if (!sel || sel.kind !== 'pad') this.view.preview = null
    this.sheetMode = sel?.kind === 'tower' ? 'tower' : sel?.kind === 'pad' && this.sim.plotCost(sel.index) !== null ? 'plot' : 'none'
    if (this.sheetMode === 'plot') { this.view.armed = null; this.view.preview = null; this.clearMessages() }
    this.sheetKey = ''
    this.refreshSheet()
    this.updateCoach()
  }

  private chooseGate(g: GateState, inspect = false) {
    if (!this.sim.challenge.guard) { this.flip(g); return }
    if (this.mode !== 'play' || this.sim.over) return
    if (this.sim.waveActive && !this.paused && !inspect) { this.flip(g); return }
    if (!this.sim.waveActive) this.sim.stats.routePlans = (this.sim.stats.routePlans ?? 0) + 1
    sound.tap()
    this.clearMessages()
    this.view.hint = null
    this.coach.routesSeen = true
    saveCoach(this.coach)
    if (this.sim.challenge.harbour) this.renderer.setZone('canal')
    this.view.selection = { kind: 'gate', gate: g }
    this.view.armed = null
    this.view.preview = null
    this.view.routeDir = this.sim.gateEffectiveDir(g)
    this.sheetMode = 'routes'
    this.sheetKey = ''
    this.refreshSheet()
  }

  openCharms(focus?: GateState) {
    if (!this.sim.charmsAllowed || this.mode !== 'play') {
      sound.deny()
      this.toast(this.sim.charmsAllowed ? 'Start a night first.' : `Charms are off in ${DIFFICULTY[this.sim.difficulty].name}.`)
      return
    }
    sound.tap()
    this.view.selection = null
    this.view.armed = null
    this.view.preview = null
    this.sheetMode = 'charms'
    this.sheetKey = ''
    if (focus) this.pendingTrait[focus.def.id] = this.pendingTrait[focus.def.id]
    this.refreshSheet()
    if (focus) $('sheet').querySelector<HTMLElement>(`[data-gate-block="${focus.def.id}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  closeSheet() {
    this.view.moving = undefined
    this.view.selection = null
    this.view.preview = null
    this.view.upgradeRange = undefined
    this.view.routeDir = undefined
    this.sheetMode = 'none'
    this.sheetKey = ''
    this.sellArmed = null
    this.refreshSheet()
  }

  // ------------------------------------------------------------------ input

  private bindInput() {
    const cv = $('cv')
    cv.addEventListener('pointerdown', (e) => {
      sound.unlock()
      this.pointerType = e.pointerType
      if (e.button !== 0) return
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() }
      this.longPressed = false
      this.cursor = -1
      const r = cv.getBoundingClientRect()
      const w = this.renderer.toWorld(e.clientX - r.left, e.clientY - r.top)
      const hit = this.mode === 'play' ? this.renderer.pick(this.sim, w.x, w.y) : null
      if (!this.view.moving && hit?.kind === 'gate' && (this.sim.charmsAllowed || this.sim.challenge.guard)) {
        this.pressGate = hit.gate
        this.pressTimer = LONG_PRESS
      }
    })
    cv.addEventListener('pointermove', (e) => {
      if (this.downAt && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 16) this.pressGate = null
    })
    cv.addEventListener('pointerup', (e) => {
      this.pressGate = null
      if (!this.downAt || this.longPressed || e.button !== 0) {
        this.downAt = null
        this.longPressed = false
        return
      }
      const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y)
      this.downAt = null
      if (moved > 16) return
      const r = cv.getBoundingClientRect()
      this.tapWorld(e.clientX - r.left, e.clientY - r.top)
    })
    // stop the browser's follow-up click from landing on a sheet that opened under the finger
    cv.addEventListener('touchend', (e) => {
      if (e.cancelable) e.preventDefault()
    }, { passive: false })
    cv.addEventListener('pointercancel', () => {
      this.pressGate = null
      this.downAt = null
    })
    cv.addEventListener('pointerleave', () => (this.pressGate = null))
    cv.addEventListener('contextmenu', (e) => e.preventDefault())
    cv.addEventListener('keydown', (e) => this.onMapKey(e))
    cv.addEventListener('blur', () => (this.cursor = -1))
    $('btn-go').addEventListener('click', () => {
      sound.unlock()
      this.startWave()
    })
    $('btn-charms').addEventListener('click', () => {
      sound.unlock()
      if (this.sheetMode === 'charms') this.closeSheet()
      else {
        this.sheetOpener = $('btn-charms')
        this.openCharms()
      }
    })
    $('btn-speed').addEventListener('click', () => this.cycleSpeed())
    $('btn-pause').addEventListener('click', () => {
      sound.unlock()
      sound.tap()
      this.setPaused(!this.paused, true)
    })
    const sheet = $('sheet')
    sheet.addEventListener('pointerdown', () => (this.sheetPointer = true))
    // a second guard for the tap that opened the sheet
    sheet.addEventListener(
      'click',
      (e) => {
        if (performance.now() - this.sheetOpenedAt < SHEET_GUARD_MS) {
          e.stopPropagation()
          e.preventDefault()
        }
      },
      true,
    )
    window.addEventListener('pointerup', () => (this.sheetPointer = false))
    window.addEventListener('pointercancel', () => (this.sheetPointer = false))
    window.addEventListener('keydown', (e) => this.onKey(e))
    document.addEventListener('pointerdown', () => sound.unlock(), { once: true })
  }

  private onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const k = e.key.toLowerCase()
    if (this.screens.isOpen()) {
      if (k === 'escape') {
        e.preventDefault()
        this.screens.back()
      } else if (k === 'p' && this.mode === 'play' && this.paused) {
        this.screens.close()
        this.setPaused(false)
      }
      return
    }
    if (this.mode !== 'play') return
    const target = e.target as HTMLElement | null
    if (target?.id === 'cv' && e.defaultPrevented) return
    // let Enter/Space activate whatever button or control has focus
    const onControl = !!target?.closest?.('button, input, select, textarea, [role="switch"], [role="tab"]')
    if ((k === ' ' || k === 'enter') && (onControl || target?.id === 'cv')) return
    if (k >= '1' && k <= '8') this.trayTap(TOWER_ORDER[Number(k) - 1], 'mouse')
    else if (k === 'q' || k === 'e') {
      const g = this.sim.gates[k === 'q' ? 0 : 1]
      if (g) this.flip(g)
    } else if (k === ' ' || k === 'n') {
      e.preventDefault()
      this.startWave()
    } else if (k === 'c') {
      if (this.sheetMode === 'charms') this.closeSheet()
      else {
        this.sheetOpener = target
        this.openCharms()
      }
    } else if (k === 'p') this.setPaused(!this.paused, !this.paused)
    else if (k === 'f') this.cycleSpeed()
    else if (k === 'escape') {
      if (this.view.moving) { this.cancelMove(); return }
      this.view.armed = null
      this.closeSheet()
    }
  }

  // ------------------------------------------------------------------ keyboard map

  private mapTargets(): MapTarget[] {
    if (this.renderer.zone === 'overview') return []
    const sim = this.sim
    return [...sim.pads.map((p, i) => ({ kind: 'pad' as const, index: i, x: p.x, y: p.y })).filter(p => sim.padRevealed(p.index)), ...sim.gates.filter(g => sim.gateAvailable(g)).map((g) => ({ kind: 'gate' as const, gate: g, x: g.def.x, y: g.def.y - 26 }))].filter(p => {
      const screen = this.renderer.toScreen(p.x, p.y)
      return screen.x >= 0 && screen.x <= $('field').clientWidth && screen.y >= 0 && screen.y <= $('field').clientHeight
    })
  }

  private cursorTarget() {
    if (this.cursor < 0 || this.mode !== 'play' || document.activeElement?.id !== 'cv') return null
    const t = this.mapTargets()[this.cursor]
    if (!t) return null
    return { x: t.x, y: t.kind === 'pad' && this.sim.pads[t.index].tower ? t.y - 16 : t.y, r: t.kind === 'gate' ? 40 : PAD_R + 8 }
  }

  /** Arrow keys walk between pads and locks; Enter acts on the one under the cursor. */
  private onMapKey(e: KeyboardEvent) {
    if (this.mode !== 'play' || this.screens.isOpen()) return
    const targets = this.mapTargets()
    const dirs: Record<string, [number, number]> = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] }
    const k = e.key.toLowerCase()
    if (dirs[k]) {
      e.preventDefault()
      if (this.cursor < 0) {
        this.cursor = 1
        return
      }
      const [dx, dy] = dirs[k]
      const cur = targets[this.cursor]
      if (!cur) { this.cursor = 0; return }
      let best = -1
      let bestScore = Infinity
      targets.forEach((t, i) => {
        if (i === this.cursor) return
        const vx = t.x - cur.x
        const vy = t.y - cur.y
        const along = vx * dx + vy * dy
        if (along <= 4) return
        const across = Math.abs(vx * dy - vy * dx)
        const score = along + across * 2.2
        if (score < bestScore) {
          bestScore = score
          best = i
        }
      })
      if (best >= 0) this.cursor = best
      return
    }
    if ((k === 'enter' || k === ' ') && this.cursor >= 0) {
      e.preventDefault()
      const t = targets[this.cursor]
      if (!t) return
      if (this.view.moving) {
        if (t.kind === 'pad') this.previewMove(t.index)
        return
      }
      this.sheetOpener = $('cv')
      if (t.kind === 'gate') this.chooseGate(t.gate)
      else {
        const pad = this.sim.pads[t.index]
        if (pad.tower) this.select({ kind: 'tower', tower: pad.tower })
        else if (this.view.armed) this.build(t.index, this.view.armed)
        else {
          this.select({ kind: 'pad', index: t.index })
          if (this.sim.padAvailable(t.index)) this.toast('Pad selected. Press a tower number (1–8) to build here.', 2600)
        }
      }
      return
    }
    if (k === 'h' && this.cursor >= 0) {
      const t = targets[this.cursor]
      if (t.kind === 'gate') this.openCharms(t.gate)
    }
  }

  private tapWorld(cx: number, cy: number) {
    if (this.mode !== 'play') return
    const w = this.renderer.toWorld(cx, cy)
    if (this.renderer.zone === 'overview') {
      this.renderer.setZone(this.sim.challenge.gardens && w.y < -440 ? 'gardens' : w.y < 0 ? 'harbour' : 'canal')
      this.refreshHud(true); return
    }
    const sel = this.renderer.pick(this.sim, w.x, w.y)
    if (this.view.moving) {
      if (sel?.kind === 'pad') this.previewMove(sel.index)
      else if (sel?.kind === 'tower') this.previewMove(sel.tower.pad)
      return
    }
    if (!sel) {
      this.view.armed = null
      this.closeSheet()
      return
    }
    if (sel.kind === 'gate') {
      this.chooseGate(sel.gate)
      this.view.armed = null
      return
    }
    if (sel.kind === 'pad') {
      if (this.view.armed) {
        this.build(sel.index, this.view.armed)
        return
      }
      sound.tap()
      this.select(sel)
      if (this.sim.padAvailable(sel.index) && !this.coach.built) this.toast(this.pointerType === 'mouse' ? 'Now choose a keeper below.' : 'Now pick a keeper below, then tap it again to build.', 3600)
      return
    }
    sound.tap()
    this.view.armed = null
    this.sheetOpener = null
    this.select(sel)
  }

  private trayTap(id: TowerId, pointer: string) {
    if (this.view.moving) return
    sound.unlock()
    const sel = this.view.selection
    if (sel?.kind === 'pad') {
      if (this.view.preview === id || pointer === 'mouse') this.build(sel.index, id)
      else {
        this.view.preview = id
        sound.tap()
        this.info(id, 'Tap it again to build.')
      }
    } else {
      const barred = this.keeperBarred(id)
      if (barred) {
        sound.deny()
        this.shakeTray(id)
        this.toast(barred)
        return
      }
      if (this.sim.glow < TOWERS[id].cost) {
        sound.deny()
        this.shakeTray(id)
        this.info(id, `Need ${TOWERS[id].cost - this.sim.glow} more glow.`)
        return
      }
      this.view.armed = this.view.armed === id ? null : id
      if (this.sheetMode !== 'none') this.closeSheet()
      sound.tap()
      if (this.view.armed) this.info(id, 'Tap a glowing pad to build.')
      else this.hideToast()
    }
    this.refreshDock(true)
  }

  private shakeTray(id: TowerId) {
    const b = this.trayBtns[TOWER_ORDER.indexOf(id)]
    b.classList.remove('shake')
    void b.offsetWidth
    b.classList.add('shake')
  }

  // ------------------------------------------------------------------ HUD + dock

  private buildHud() {
    $('ic-light').innerHTML = icon('heart')
    $('ic-glow').innerHTML = icon('sparkle')
    $('btn-pause').innerHTML = icon('pause')
    $('btn-go').querySelector('.go-ic')!.innerHTML = icon('play')
    $('btn-charms').innerHTML = `${icon('sparkle')}<span>Charms</span>`
    $('paused-chip').innerHTML = `${icon('pause')} Paused: plan freely`
  }

  private buildDock() {
    const gates = $('gates')
    gates.innerHTML = ''
    this.gateBtns = this.sim.level.def.gates.map((g, i) => {
      const b = document.createElement('button')
      b.className = 'gate-btn'
      b.title = 'Tap to flip. Press and hold for charms.'
      b.innerHTML = `<span class="dir"></span><span class="g-txt"><span class="g-name">${g.name}</span><span class="g-state"></span></span><span class="g-next"></span><span class="g-charm"></span><span class="cd"></span><span class="swing"></span><span class="hold"></span>`
      let fromLongPress = false
      b.addEventListener('pointerdown', (e) => {
        sound.unlock()
        fromLongPress = false
        if (e.button !== 0) return
        this.longPressed = false
        if (this.sim.charmsAllowed || this.sim.challenge.guard) {
          this.pressGate = this.sim.gates[i]
          this.pressTimer = LONG_PRESS
          b.classList.add('holding')
        }
      })
      const cancel = () => {
        if (this.longPressed) fromLongPress = true
        this.pressGate = null
        b.classList.remove('holding')
      }
      b.addEventListener('pointerup', cancel)
      b.addEventListener('pointerleave', cancel)
      b.addEventListener('pointercancel', cancel)
      b.addEventListener('click', () => {
        if (fromLongPress) {
          fromLongPress = false
          this.longPressed = false
          return
        }
        this.chooseGate(this.sim.gates[i])
      })
      gates.appendChild(b)
      return b
    })
    const tray = $('tray')
    tray.innerHTML = ''
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.trayBtns = TOWER_ORDER.map((id) => {
      const def = TOWERS[id]
      const b = document.createElement('button')
      b.className = 'tw-btn'
      b.appendChild(towerPortrait(id, 60, dpr, 0, 0, this.sim.challenge.guardian))
      const signature = signatureFor(id, this.sim.challenge.guardian)
      const plan = this.sim.battlePlans.map(p => BATTLE_PLANS[p]).find(p => p.tower === id)
      const name = signature?.signature ?? (id === 'beam' ? 'Light<wbr>house' : id === 'bell' ? 'Moon<wbr>bell' : id === 'wick' ? 'Wick<wbr>ling' : def.name)
      b.insertAdjacentHTML('beforeend', `<span class="tw-name">${name}</span><span class="tw-role">${plan?.name ?? signature?.role ?? KEEPER_ROLE[id]}</span><span class="cost">${def.cost}</span><img class="fam" src="${glyphBadgeURL(def.family)}" alt="" width="16" height="16">`)
      b.title = this.keeperHelp(id)
      b.addEventListener('pointerdown', (e) => (this.pointerType = e.pointerType))
      b.addEventListener('pointerenter', e => {
        if (e.pointerType === 'mouse' && this.view.selection?.kind === 'pad') this.view.preview = id
      })
      b.addEventListener('focus', () => {
        if (isKeyboardMode() && this.view.selection?.kind === 'pad') this.view.preview = id
      })
      b.addEventListener('click', () => this.trayTap(id, this.pointerType))
      tray.appendChild(b)
      return b
    })
  }

  private refreshHud(force: boolean) {
    const sim = this.sim
    const zone = $('btn-zone')
    if (zone) {
      zone.hidden = !sim.challenge.harbour || this.mode !== 'play'
      const near = sim.enemies.filter(e => e.y > 470).length
      const label = this.renderer.zone === 'gardens' ? 'View harbour ↓' : this.renderer.zone === 'harbour' ? `View canal${near ? ` · ${near} near lantern` : ' ↓'}` : this.sim.challenge.gardens ? 'View gardens ↑' : 'View harbour ↑'
      if (zone.textContent !== label) zone.textContent = label
    }
    const overview = $('btn-overview')
    if (overview) {
      overview.hidden = !sim.challenge.harbour || this.mode !== 'play' || !!this.view.moving
      const label = this.renderer.zone === 'overview' ? 'Close map' : 'Whole map'
      if (overview.textContent !== label) overview.textContent = label
    }
    const set = (key: string, v: string | number | boolean, fn: () => void) => {
      if (!force && this.hudCache[key] === v) return
      this.hudCache[key] = v
      fn()
    }
    set('lives', `${sim.lives}|${sim.maxLives}`, () => {
      $('lives').textContent = String(sim.lives)
      document.querySelector('.stat-light')!.classList.toggle('low', sim.lives <= sim.maxLives * 0.4)
    })
    set('glow', sim.glow, () => ($('glow').textContent = compact(sim.glow)))
    set('wave', `${sim.wave}|${sim.freeplayFrom}|${sim.waveOffset}|${sim.finalWave}`, () => {
      const free = sim.wave > sim.finalWave
      const tide = !!sim.challenge.tide
      $('wave').textContent = String(free ? sim.wave - sim.finalWave : this.shownWave())
      ;(document.querySelector('.stat-wave .lbl') as HTMLElement).textContent = free ? 'Free' : tide ? 'Tide' : 'Wave'
      ;(document.querySelector('.stat-wave .of') as HTMLElement).textContent = free ? ' free' : `/${sim.finalWave - sim.waveOffset}`
    })
    set('speed', this.speed, () => {
      const b = $('btn-speed')
      b.textContent = `${this.speed}x`
      b.setAttribute('aria-label', `Game speed: ${this.speed}x`)
      b.classList.toggle('fast', this.speed > 1)
    })
    set('paused', `${this.paused}|${!!sim.over}|${this.screens.isOpen()}|${this.sheetMode}`, () => {
      const b = $<HTMLButtonElement>('btn-pause')
      b.innerHTML = icon(this.paused ? 'play' : 'pause')
      b.setAttribute('aria-label', this.paused ? 'Resume' : 'Pause')
      b.disabled = !!sim.over
      $('paused-chip').hidden = sim.challenge.harbour === 1 || !!this.view.moving || !(this.paused && this.mode === 'play' && !this.screens.isOpen() && this.sheetMode === 'none')
    })
    const go = $<HTMLButtonElement>('btn-go')
    const can = sim.canStartWave() && this.mode === 'play' && !this.view.moving
    const early = sim.waveActive ? sim.earlyBonus() : 0
    const goKey = `${can}|${sim.wave}|${early}|${sim.waveActive}|${!this.coach.started}|${this.coach.built}|${sim.waveOffset}`
    set('go', goKey, () => {
      const n = sim.wave + 1
      const tide = !!sim.challenge.tide
      const label = n > sim.finalWave ? `Free play ${n - sim.finalWave}` : tide && n === sim.waveOffset + 1 ? 'Start the tide' : `Start wave ${this.shownWave(n)}`
      go.disabled = !can
      go.classList.toggle('early', can && sim.waveActive)
      go.classList.toggle('pulse', can && !sim.waveActive && ((this.coach.built && !this.coach.started) || (tide && sim.wave === sim.waveOffset && sim.towers.length > 0)))
      const txt = go.querySelector('.go-txt')!
      txt.innerHTML = !can ? `Wave ${this.shownWave()}` : sim.waveActive ? `Next <b>+${early}</b>` : label
      go.setAttribute('aria-label', !can ? `Wave ${this.shownWave()} in progress` : sim.waveActive ? `Call the next wave early for ${early} bonus glow` : label)
    })
    const charms = $<HTMLButtonElement>('btn-charms')
    set('charms', `${sim.charmsAllowed}|${this.sheetMode === 'charms'}|${sim.gates.some((g) => g.charm)}`, () => {
      charms.hidden = !sim.charmsAllowed
      charms.classList.toggle('on', this.sheetMode === 'charms')
      charms.classList.toggle('set', sim.gates.some((g) => g.charm))
      charms.setAttribute('aria-expanded', String(this.sheetMode === 'charms'))
    })
    const showNext = this.mode === 'play' && !sim.over && sim.spawners.length === 0 && (sim.wave < sim.finalWave || sim.freeplay)
    set('preview', `${sim.wave}|${showNext}`, () => this.renderPreview(showNext))
  }

  private waveSource(west: boolean) {
    if (this.sim.challenge.compact) return west ? ' from the side inlet' : ''
    return this.sim.challenge.gardens ? (west ? ' from the East garden' : ' from the West garden') : west ? ' from the West Sluice' : ''
  }

  /** The next wave as tappable chips: kind, count, boss marker and which entrance they use. */
  private renderPreview(show: boolean) {
    const el = $('next-preview')
    if (!show) {
      el.innerHTML = ''
      el.removeAttribute('aria-label')
      return
    }
    const sim = this.sim
    const groups = new Map<string, { id: EnemyId; count: number; west: boolean }>()
    for (const g of sim.waveDef(sim.wave + 1).groups) {
      const west = g.src === 'west' && sim.wave + 1 >= 11
      const key = g.type + (west ? 'w' : '')
      const cur = groups.get(key)
      if (cur) cur.count += g.count
      else groups.set(key, { id: g.type, count: g.count, west })
    }
    const list = [...groups.values()]
    el.innerHTML =
      `<span class="np-lbl">Next</span>` +
      list
        .map((g) => {
          const boss = !!ENEMIES[g.id].boss
          const name = ENEMIES[g.id].name
          return `<button class="chip ${boss ? 'boss' : ''}" data-id="${g.id}" aria-label="${g.count} ${name}${g.count > 1 ? 's' : ''}${this.waveSource(g.west)}${boss ? ', boss' : ''}"><img src="${enemyIcon(g.id)}" alt="" width="24" height="24">${g.count > 1 ? '×' + g.count : ''}${sim.challenge.gardens ? `<span class="w">${g.west ? 'E' : 'W'}</span>` : g.west ? `<span class="w">${sim.challenge.compact ? 'S' : 'W'}</span>` : ''}</button>`
        })
        .join('')
    el.setAttribute('aria-label', `Next wave: ${list.map((g) => `${g.count} ${ENEMIES[g.id].name}`).join(', ')}`)
    el.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) =>
      b.addEventListener('click', () => {
        const d = ENEMIES[b.dataset.id as EnemyId]
        sound.tap()
        this.toast(`${d.name}: ${d.id === 'warden' && (this.sim.challenge.harbourEncounters || this.sim.challenge.compact) ? 'Signals four Skiffs at 70% health. Linked escorts reduce damage by 40%. Clear them with bursts; it surges at 35%.' : d.tip}`, 4600)
      }),
    )
    this.fitPreview(el, list)
  }

  /** Busy waves bring more kinds than two rows of chips can hold: the rest fold into a +N chip that lists them. */
  private fitPreview(el: HTMLElement, list: { id: EnemyId; count: number; west: boolean }[]) {
    const chips = [...el.querySelectorAll<HTMLButtonElement>('.chip')]
    if (el.scrollHeight <= el.clientHeight + 1 || chips.length < 3) return
    const more = document.createElement('button')
    more.className = 'chip more'
    el.appendChild(more)
    let hidden = 0
    while (el.scrollHeight > el.clientHeight + 1 && hidden < chips.length - 1) {
      chips[chips.length - 1 - hidden].remove()
      hidden++
      more.textContent = `+${hidden}`
      more.setAttribute('aria-label', `${hidden} more kinds of Mope`)
    }
    const rest = list.slice(list.length - hidden)
    more.addEventListener('click', () => {
      sound.tap()
      this.toast(`Also coming: ${rest.map((g) => `${g.count} ${ENEMIES[g.id].name}${g.count > 1 ? 's' : ''}${this.waveSource(g.west)}`).join(', ')}.`, 4200)
    })
  }

  private refreshDock(force: boolean) {
    const sim = this.sim
    const moving = this.view.moving
    $('dock').classList.toggle('moving-tower', !!moving)
    $('move-bar').hidden = !moving
    if (moving) {
      const ready = moving.destination !== null
      $('move-help').textContent = ready
        ? `${towerName(moving.tower.id, this.sim.challenge.guardian)}: bright water shows its new reach. Confirm for ${RELOCATE_COST} glow.`
        : `Move ${towerName(moving.tower.id, this.sim.challenge.guardian)}: tap an empty pad to preview. Upgrades stay with it.`
      $<HTMLButtonElement>('move-confirm').disabled = !ready || sim.glow < RELOCATE_COST
    }
    sim.gates.forEach((g, i) => {
      const b = this.gateBtns[i]
      if (!b) return
      b.hidden = !sim.gateAvailable(g)
      if (b.hidden) return
      const locked = sim.gateLocked(g)
      const dir = sim.gateEffectiveDir(g)
      const next = incoming(sim, g, 3)
      const key = `${locked}|${dir}|${g.jammed}|${next.map((e) => e.def.id).join(',')}|${this.mode}|${g.charm?.trait}|${g.charm?.dir}|${!!sim.over}|${!!sim.challenge.tidal}|${sim.waveActive}|${this.paused}`
      if (force || b.dataset.key !== key) {
        b.dataset.key = key
        b.classList.toggle('locked', locked)
        b.classList.toggle('jammed', g.jammed)
        b.querySelector('.dir')!.innerHTML = locked ? icon('lock') : icon(dir === 0 ? 'bendLeft' : 'bendRight')
        const rich = sim.level.segs.get(g.def.outs[dir])!.bonus > 1
        b.querySelector('.g-state')!.textContent = locked ? (sim.challenge.lockedGates ? 'Fixed' : `Wave ${g.def.unlockWave}`) : g.jammed ? 'Jammed!' : `${g.def.labels[dir]}${rich ? ' ×2' : ''}`
        b.classList.toggle('rich', !locked && rich)
        const action = sim.challenge.guard ? (sim.waveActive && !this.paused ? 'Tap to switch. Hold to compare routes.' : 'Tap to compare routes.') : 'Tap to flip, press and hold for charms.'
        b.title = locked ? `Opens at wave ${g.def.unlockWave}` : `${g.def.labels[dir]}: ${g.def.blurbs[dir]} ${action}`
        b.querySelector('.g-next')!.innerHTML = next.map((e) => `<img src="${enemyIcon(e.def.id)}" alt="" width="24" height="24">`).join('')
        b.querySelector('.g-charm')!.innerHTML = g.charm ? `<img src="${enemyIcon(CHARM_ICON[g.charm.trait])}" alt="" width="24" height="24">` : ''
        const charmNote = g.charm ? ` Charm: ${CHARM_LABEL[g.charm.trait]} always take the ${g.def.labels[g.charm.dir]}.` : ''
        const nextNote = next.length ? ` Next: ${next.map((e) => e.def.name).join(', ')}.` : ''
        const tidalNote = sim.challenge.tidal && !locked ? ` Tidal lock: its short run swings shut ${sim.challenge.tidal} seconds after you open it.` : ''
        b.setAttribute('aria-label', `${g.def.name}: ${locked ? (sim.challenge.lockedGates ? 'fixed tonight' : `opens at wave ${g.def.unlockWave}`) : g.jammed ? 'jammed' : 'sending Mopes along the ' + g.def.labels[dir] + (sim.challenge.compact ? ', ' + g.def.blurbs[dir].replace(/\.$/, '') : rich ? ', double glow and double light lost on escape' : ', long route with more time to attack')}.${charmNote}${tidalNote}${nextNote} ${action}`)
      }
      const cd = b.querySelector('.cd') as HTMLElement
      const w = g.cd > 0 ? `${(g.cd / 0.9) * 100}%` : '0%'
      if (cd.style.width !== w) cd.style.width = w
      // a tidal lock's short run drains away along the bottom of its button
      const swing = b.querySelector('.swing') as HTMLElement
      const tidal = sim.challenge.tidal
      const sw = tidal && g.swingT > 0 && !sim.over ? `${Math.min(100, (g.swingT / tidal) * 100).toFixed(1)}%` : '0%'
      if (swing.style.width !== sw) swing.style.width = sw
    })
    TOWER_ORDER.forEach((id, i) => {
      const b = this.trayBtns[i]
      const def = TOWERS[id]
      const poor = sim.glow < def.cost
      const disabled = !sim.keeperAllowed(id)
      b.hidden = (LATE_TOWERS.includes(id) && !sim.challenge.depth) || !!(sim.challenge.expanding || sim.challenge.compact) && sim.planningWave < sim.keeperWave(id)
      b.setAttribute('aria-disabled', String(disabled))
      const key = `${poor}|${this.view.armed === id}|${this.view.preview === id}|${disabled}`
      if (!force && b.dataset.key === key) return
      b.dataset.key = key
      b.classList.toggle('poor', poor)
      b.classList.toggle('armed', this.view.armed === id)
      b.classList.toggle('preview', this.view.preview === id)
      b.classList.toggle('disabled', disabled)
      b.setAttribute('aria-pressed', String(this.view.armed === id || this.view.preview === id))
      b.setAttribute('aria-label', `${towerName(id, sim.challenge.guardian)}, ${def.cost} glow${disabled ? ', not allowed tonight' : poor ? ', not enough glow yet' : ''}. ${this.keeperHelp(id)}`)
    })
    $('tray').style.setProperty('--keeper-count', String(this.trayBtns.filter(b => !b.hidden).length))
    $('tray').classList.toggle('late-roster', this.trayBtns.filter(b => !b.hidden).length > 6)
    $('gates').classList.toggle('one-lock', sim.gates.filter(g => sim.gateAvailable(g)).length === 1)
    const progress = $('canal-progress')
    progress.hidden = !(sim.challenge.expanding || sim.challenge.compact)
    if (sim.challenge.compact) {
      const available = sim.pads.filter((_, i) => sim.plotCost(i) !== null).length
      const milestone = sim.challenge.skirmish ? `${sim.finalWave - sim.wave + Number(sim.waveActive)} waves left · keep as much light as you can` : sim.challenge.depth ? nextMilestone(sim.wave) : compactNext(sim.wave)
      const encounter = !sim.waveActive && !sim.over ? sim.waveDef(sim.wave + 1).encounter : undefined
      const next = (encounter ? `${encounter} · ` : !sim.waveActive && available ? `${available} plots available · ` : '') + milestone
      const power = sim.waveActive && sim.preparation ? `${PREPARATIONS[sim.preparation.id].name} · ${sim.preparation.id === 'oil' ? 'towers fire 15% faster' : sim.preparation.charges + (sim.preparation.id === 'net' ? ' catches left' : ' light protected')}` : null
      const text = gardensStatus(sim) ?? wardenStatus(sim) ?? power ?? (sim.waveActive ? milestone : sim.planningWave <= 2 ? 'Tap a stone circle to build. Highlighted water is in range.' : sim.planningWave === 5 ? 'Armour next · the mill cracks shells; Crackers also help.' : sim.planningWave === 8 ? 'Hidden enemies next · use Owl sight or the Lantern bridge.' : next)
      progress.classList.toggle('planning-tip', !sim.waveActive)
      if (progress.textContent !== text) progress.textContent = text
    }
    if (sim.challenge.expanding) {
      const stage = CANAL_STAGES[sim.canalStage]
      const advice: Record<number, string> = {
        1: 'Build on a stone pad. Highlighted water shows where your tower can reach.',
        2: 'Routes stay set. Tap the Lower Lock to compare your tower coverage.',
        3: 'Moonbell slows groups. Pair it with an attacking tower on the same bend.',
        5: 'Armour next: Cracker bursts and heavy upgrades crack shells.',
        6: 'Upper canal open. Select a tower → Manage → Move to reposition it for 25 glow.',
        8: 'Hidden enemies next: pair a Lamp Owl with your damage towers.',
        10: 'Boss next: Gloomtoad jams the lock beside it. Set your route first.',
        11: 'West inlet open. Hidden enemies from here skip the Lantern bridge.',
        16: 'Hidden armour next: combine Lamp Owl sight with heavy attacks.',
        24: 'Old Gloom arrives at wave 25. Prepare strong towers on both lower branches.',
        25: 'Old Gloom splits at the Lower Lock. Cover BOTH branches before starting.',
      }
      const tip = sim.challenge.guard && !sim.waveActive ? advice[sim.wave + 1] : undefined
      const text = this.renderer.zone === 'overview' ? 'Whole defence · tap a district to inspect it.' : gardensStatus(sim) ?? wardenStatus(sim) ?? (sim.challenge.harbour ? (!sim.waveActive && !sim.over ? sim.waveDef(sim.wave + 1).note ?? 'Harbour kept · your towers stay' : sim.challenge.gardens ? 'Water Gardens · both streams meet above the harbour' : 'Lantern Harbour · your original canal remains defended') : tip ?? `${stage.name} · ${stage.next}`)
      progress.classList.toggle('planning-tip', !!tip || !!sim.challenge.harbour && !sim.waveActive)
      if (progress.textContent !== text) progress.textContent = text
    }
    const goal = $('mastery-goal')
    const planButton = $('btn-battle-plan')
    planButton.hidden = !sim.pendingPlan || this.sheetMode !== 'none' || !!this.view.moving || this.mode !== 'play'
    const planLabel = 'Wave ' + sim.pendingPlan + ' cleared · Choose a battle plan'
    if (planButton.textContent !== planLabel) planButton.textContent = planLabel
    const supplies = $('btn-prepare')
    supplies.hidden = (!sim.preparationOffer && !sim.preparation) || !!sim.pendingPlan || this.sheetMode !== 'none' || !!this.view.moving || this.mode !== 'play' || sim.waveActive || !!sim.over
    const supplyLabel = sim.preparation ? `${PREPARATIONS[sim.preparation.id].name} · ready for wave ${sim.preparation.wave}` : 'Prepare for a wave · optional'
    if (supplies.textContent !== supplyLabel) supplies.textContent = supplyLabel
    const goalText = !sim.waveActive && !sim.over && !sim.pendingPlan && !this.view.moving && this.sheetMode === 'none' ? masteryGoal(sim, this.masteryProgress) : null
    goal.hidden = !goalText
    if (goalText && goal.textContent !== goalText) goal.textContent = goalText
    this.refreshSheet()
  }

  // ------------------------------------------------------------------ sheets

  private refreshSheet() {
    const sel = this.view.selection
    const sheet = $('sheet')
    const tray = $('tray')
    const sim = this.sim
    if (sel?.kind === 'tower' && !sim.towers.includes(sel.tower)) {
      this.view.selection = null
      this.sheetMode = 'none'
    }
    $('dock').classList.toggle('route-planning', this.sheetMode === 'routes')
    let key = 'none'
    if (this.sheetMode === 'tower' && this.view.selection?.kind === 'tower') {
      const t = this.view.selection.tower
      key = `t|${t.uid}|${t.a}|${t.b}|${t.priority}|${t.refinement}|${sim.planningWave}`
    } else if (this.sheetMode === 'plot' && sel?.kind === 'pad') {
      key = `p|${sel.index}|${sim.waveActive}|${sim.glow >= (sim.plotCost(sel.index) ?? Infinity)}`
    } else if (this.sheetMode === 'charms') {
      key = `c|${sim.gates.map((g) => `${g.charm?.trait}${g.charm?.dir}${sim.gateLocked(g)}${this.pendingTrait[g.def.id] ?? ''}`).join('|')}|${sim.glow >= CHARM_COST}`
    } else if (this.sheetMode === 'routes' && sel?.kind === 'gate') {
      key = `r|${sel.gate.def.id}|${sim.gates.map(g => `${g.state}:${sim.gateLocked(g)}:${g.jammed}`).join('|')}|${sim.towers.map(t => `${t.uid}:${t.a}:${t.b}`).join(',')}|${sim.waveActive}|${this.paused}`
    }
    if (key !== this.sheetKey && !(this.sheetPointer && key !== 'none' && this.sheetKey !== 'none' && this.sheetKey !== '')) {
      const wasOpen = this.sheetKey !== 'none' && this.sheetKey !== ''
      this.sheetKey = key
      if (key === 'none') {
        const hadFocus = sheet.contains(document.activeElement)
        sheet.hidden = true
        $('planbar').inert = false
        $('planbar').style.visibility = ''
        tray.hidden = false
        sheet.classList.remove('top')
        if (wasOpen && hadFocus) {
          const back = this.sheetOpener?.isConnected ? this.sheetOpener : (tray.querySelector('button') as HTMLElement | null)
          back?.focus({ preventScroll: true })
        }
        this.sheetOpener = null
        this.placeMessages()
        return
      }
      const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.focuskey
      if (!wasOpen) this.sheetOpenedAt = performance.now()
      sheet.hidden = false
      sheet.classList.toggle('tower-sheet', this.sheetMode === 'tower' || this.sheetMode === 'plot')
      sheet.classList.toggle('route-sheet', this.sheetMode === 'routes')
      sheet.classList.remove('manage-open')
      $('planbar').inert = this.sheetMode === 'tower' && getComputedStyle(sheet).position !== 'static'
      tray.hidden = true
      if (this.sheetMode === 'tower' && this.view.selection?.kind === 'tower') this.renderTowerSheet(sheet, this.view.selection.tower)
      else if (this.sheetMode === 'plot' && sel?.kind === 'pad') this.renderPlotSheet(sheet, sel.index)
      else if (this.sheetMode === 'routes' && sel?.kind === 'gate') this.renderRouteSheet(sheet, sel.gate)
      else this.renderCharmSheet(sheet)
      if (focusKey) sheet.querySelector<HTMLElement>(`[data-focuskey="${focusKey}"]`)?.focus({ preventScroll: true })
      else if (!wasOpen && isKeyboardMode()) sheet.querySelector<HTMLElement>('.sh-close')?.focus({ preventScroll: true })
      this.placeSheet()
    }
    if (this.sheetMode === 'tower' && this.view.selection?.kind === 'tower') this.patchTowerSheet(sheet, this.view.selection.tower)
  }

  private renderPlotSheet(el: HTMLElement, index: number) {
    const sim = this.sim, cost = sim.plotCost(index) ?? PLOTS[index].cost
    el.setAttribute('role', 'region'); el.setAttribute('aria-labelledby', 'sheet-title')
    el.innerHTML = `<div class="sh-head"><div class="sh-title"><h2 id="sheet-title" class="sh-h">Buy a building plot</h2><span>Keep this space until the game ends.</span></div><button class="sh-close" aria-label="Close plot">${icon('close')}</button></div><p class="plot-note">This buys an empty space. Building a tower costs extra.</p><button class="big-btn primary" data-clear-plot ${sim.waveActive || sim.glow < cost ? 'disabled' : ''}>${sim.waveActive ? 'Buy between waves' : 'Buy plot · ' + cost + ' glow'}</button>`
    el.querySelector('.sh-close')!.addEventListener('click', () => this.closeSheet())
    el.querySelector('[data-clear-plot]')!.addEventListener('click', () => {
      if (!sim.unlockPlot(index)) return
      sound.tap(); const reward = this.updateMilestones(); this.persist(true)
      this.select({ kind: 'pad', index }); this.view.preview = 'wick'; this.refreshDock(true)
      this.toast(reward ? `${reward} Plot cleared.` : 'Plot cleared. Choose a tower to build here.', reward ? 6000 : 2300)
    })
  }

  private renderRouteSheet(el: HTMLElement, g: GateState) {
    const sim = this.sim
    const locked = sim.gateLocked(g)
    const pausedLock = this.paused && sim.waveActive && !DIFFICULTY[sim.difficulty].pausedFlips
    const blocked = locked || g.jammed || pausedLock
    const dir = sim.gateEffectiveDir(g)
    this.view.routeDir = dir
    const reason = locked ? (sim.challenge.lockedGates ? 'Routes are fixed in this challenge.' : `Opens before wave ${g.def.unlockWave}.`)
      : g.jammed ? 'Jammed until the boss passes.' : pausedLock ? 'Resume to change a route on Nightfall.'
      : sim.waveActive ? 'Choose a route for the next enemies. Towers already built stay put.'
      : 'Choose a route, then start the wave. Your choice stays set.'
    el.setAttribute('role', 'region')
    el.setAttribute('aria-labelledby', 'sheet-title')
    el.innerHTML = `<div class="sh-head"><div class="sh-title"><h2 class="sh-h" id="sheet-title">${g.def.name}</h2><span>${reason}</span></div><button class="sh-close" data-focuskey="close" aria-label="Close routes">${icon('close')}</button></div>
      <div class="route-options">${([0, 1] as const).map(d => {
        const plan = routeCoverage(sim, g, d)
        const rich = plan.segments[0]?.bonus > 1
        const names = plan.branchTowers.map(t => t.def.name).filter((name, i, all) => all.indexOf(name) === i)
        return `<button class="route-choice ${d === dir ? 'on' : ''}" data-route="${d}" data-focuskey="route${d}" aria-pressed="${d === dir}" ${blocked ? 'disabled' : ''}>
          <span class="route-choice-title">${icon(d === 0 ? 'bendLeft' : 'bendRight')}<b>${g.def.labels[d]}</b><span class="route-status">${d === dir ? 'Set' : 'Use'}</span></span>
          <span>${sim.challenge.compact ? g.def.blurbs[d] : rich ? 'Short · ×2 glow & light lost' : 'Long · more firing time'}</span>
          <span class="route-cover">${plan.attackers.length} damage ${plan.attackers.length === 1 ? 'tower' : 'towers'}${plan.support.length ? ` · ${plan.support.length} support` : ''} on this branch</span>
          <small>${names.join(', ') || 'Build along this water to cover it.'}</small>
        </button>`
      }).join('')}</div><p class="route-note">${sim.challenge.compact ? 'Both routes pay the same. Choose where your towers can hit the next enemies.' : 'Gold path: to the lantern. Short-route ×2 marks last until defeat or escape and never stack.'} ${g.def.id === 'upper' ? 'Bridge reveals hidden enemies.' : 'Mill cracks armour.'}</p>`
    el.querySelector('.sh-close')!.addEventListener('click', () => this.closeSheet())
    el.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => {
      const d = Number(button.dataset.route) as 0 | 1
      const preview = () => { this.view.routeDir = d }
      button.addEventListener('pointerenter', preview)
      button.addEventListener('focus', preview)
      button.addEventListener('pointerleave', () => { this.view.routeDir = sim.gateEffectiveDir(g) })
      button.addEventListener('blur', () => { this.view.routeDir = sim.gateEffectiveDir(g) })
      button.addEventListener('click', () => {
        if (g.state !== d && !this.flip(g)) return
        this.view.routeDir = d
        this.sheetKey = ''
        this.refreshSheet()
      })
    })
  }

  /** A keeper low on the map gets its sheet at the top, so the sheet never hides what you selected. */
  private placeSheet() {
    const sheet = $('sheet')
    sheet.classList.remove('top')
    // side-panel layouts (desktop, phone landscape) keep the sheet in the panel
    const floating = getComputedStyle(sheet).position !== 'static'
    const coverPlan = sheet.classList.contains('tower-sheet') && floating && !sheet.hidden
    $('planbar').inert = coverPlan
    $('planbar').style.visibility = coverPlan ? 'hidden' : ''
    if (sheet.classList.contains('tower-sheet')) { this.placeMessages(); return }
    let top = false
    const sel = this.view.selection
    if (floating && sel?.kind === 'tower') {
      const p = this.renderer.toScreen(sel.tower.x, sel.tower.y)
      top = p.y > this.renderer.h * 0.45
    }
    sheet.classList.toggle('top', top)
    // a sheet docked at the top leaves the keeper tray free to use
    if (floating) $('tray').hidden = !top
    this.placeMessages()
  }

  /** Banners and toasts sit in whatever part of the map the sheet leaves free. */
  private placeMessages() {
    const msgs = $('msgs')
    const sheet = $('sheet')
    const field = $('field').getBoundingClientRect()
    msgs.style.top = 'auto'
    msgs.style.bottom = '10px'
    if (sheet.hidden) return
    const r = sheet.getBoundingClientRect()
    if (!(r.left < field.right && r.right > field.left && r.top < field.bottom)) return
    if (sheet.classList.contains('top')) {
      // below the top sheet, which keeps clear of the low keeper it is showing
      msgs.style.top = `${Math.max(10, r.bottom - field.top + 8)}px`
      msgs.style.bottom = 'auto'
      return
    }
    const bottom = Math.max(10, field.bottom - r.top + 8)
    if (bottom > field.height * 0.7) {
      msgs.style.top = '10px'
      msgs.style.bottom = 'auto'
    } else msgs.style.bottom = `${bottom}px`
  }

  private renderTowerSheet(el: HTMLElement, t: Tower) {
    const def = t.def
    const lockNote = '<p class="sh-note">Upgrade one path to level 3 and the other to level 1. Sell a tower to get 75% of its cost back.</p>'
    const paths = def.paths
      .map((p, i) => {
        const path = i as 0 | 1
        const tier = path === 0 ? t.a : t.b
        const pips = [0, 1, 2].map((k) => `<span class="pip ${k < tier ? 'on' : ''}"></span>`).join('')
        let btn: string
        if (tier >= 3) btn = `<div class="up-btn maxed"><b>${p.tiers[2].name}</b><span class="desc">${upgradeDescription(t.id, t.a - (path === 0 ? 1 : 0), t.b - (path === 1 ? 1 : 0), path, (id, a, b) => this.sim.towerStats(id, a, b, t.refinement))}</span><span class="price">Level 3 complete</span></div>`
        else if (!canUpgrade(t.a, t.b, path)) btn = `<div class="up-btn locked"><b>${p.tiers[tier].name}</b><span class="desc">Locked: your other path is above level 1.</span><span class="price">${icon('lock')}</span></div>`
        else {
          const up = p.tiers[tier]
          const description = upgradeDescription(t.id, t.a, t.b, path, (id, a, b) => this.sim.towerStats(id, a, b, t.refinement))
          btn = `<button class="up-btn" data-path="${path}" data-focuskey="up${path}" aria-label="Upgrade to ${up.name}, ${up.cost} glow. ${description}"><b>${up.name}</b><span class="desc">${description}</span><span class="price">${up.cost}<small>${upgradeSummary(t.id, t.a, t.b, path, (id, a, b) => this.sim.towerStats(id, a, b, t.refinement), this.sim.challenge.guardian)}</small></span></button>`
        }
        return `<div class="path"><div class="path-head"><span>${p.name}</span><span class="pips" role="img" aria-label="Level ${tier} of 3">${pips}</span></div><div class="path-role">${PATH_ROLE[t.id][path]}</div>${btn}</div>`
      })
      .join('')
    const refinement = this.sim.challenge.compact && Math.max(t.a, t.b) === 3 ? this.sim.refinements[t.refinement ?? 0] : undefined
    const refinementRow = refinement ? `<button class="refine-btn" data-refine data-focuskey="refine"><b>${refinement.name} · ${refinement.cost} glow</b><span>${refinementSummary(t.id, t.stats, this.sim.towerStats(t.id, t.a, t.b, (t.refinement ?? 0) + 1), this.sim.challenge.guardian)}${t.refinement === 3 ? ' ' + FINAL_PERK[t.id] : ''}${this.sim.planningWave < refinement.wave ? ' Available after wave ' + (refinement.wave - 1 - this.sim.waveOffset) + '.' : ''}</span></button>` : this.sim.challenge.compact && t.refinement ? `<p class="combo-note">Level ${3 + t.refinement} · complete</p>` : ''
    const plan = this.sim.battlePlans.map(id => BATTLE_PLANS[id]).find(p => p.tower === t.id)
    const planNote = plan ? `<p class="battle-plan-note"><b>${plan.name}</b> · ${plan.benefit} ${plan.tradeoff}</p>` : ''
    const canTarget = def.kind !== 'pulse' && def.kind !== 'garden'
    el.setAttribute('role', 'region')
    el.innerHTML = `
      <div class="sh-head">
        <img class="sh-portrait" src="${towerIcon(t.id, t.a, t.b, 128, this.sim.challenge.guardian)}" alt="" width="52" height="52">
        <div class="sh-title"><h2 class="sh-h" id="sheet-title">${towerName(t.id, this.sim.challenge.guardian)} <img class="sh-fam" src="${glyphBadgeURL(def.family)}" alt="${def.family} family" width="18" height="18"></h2><span class="sh-sub"></span></div>
        <button class="sh-manage pill-btn" data-act="manage" aria-expanded="false">Manage</button>
        <button class="sh-close" data-focuskey="close" aria-label="Close">${icon('close')}</button>
      </div>
      <div class="sh-row">
        ${canTarget ? `<button class="pill-btn" data-act="prio" data-focuskey="prio" aria-label="Targeting: ${PRIORITY_LABEL[t.priority]}. Tap to change.">${icon('crosshair')} ${PRIORITY_LABEL[t.priority]}</button>` : ''}
        ${this.sim.challenge.guard && !this.sim.isChallenge ? `<button class="pill-btn" data-act="move" data-focuskey="move">Move · ${RELOCATE_COST}</button>` : ''}
        <button class="pill-btn sell" data-act="sell" data-focuskey="sell"></button>
      </div>
      <div class="paths">${paths}</div>${refinementRow}${planNote}<p class="combo-note">${comboHint(this.sim, t)}</p>${lockNote}`
    el.setAttribute('aria-labelledby', 'sheet-title')
    el.querySelector('.sh-close')!.addEventListener('click', () => this.closeSheet())
    el.querySelector('[data-act="manage"]')!.addEventListener('click', () => {
      const open = el.classList.toggle('manage-open')
      const button = el.querySelector('[data-act="manage"]')!
      button.textContent = open ? 'Upgrades' : 'Manage'
      button.setAttribute('aria-expanded', String(open))
      this.view.upgradeRange = undefined
    })
    el.querySelector('[data-act="move"]')?.addEventListener('click', () => this.beginMove(t))
    el.querySelector('[data-act="sell"]')!.addEventListener('click', () => this.sell(t))
    el.querySelector('[data-act="prio"]')?.addEventListener('click', () => {
      t.priority = PRIORITY_NEXT[t.priority]
      sound.tap()
      this.persist()
    })
    el.querySelector('[data-refine]')?.addEventListener('click', () => {
      const rank = this.sim.refinements[t.refinement ?? 0]
      if (!this.sim.refine(t)) return
      this.toast(`${towerName(t.id, this.sim.challenge.guardian)} · ${rank.name} complete.`, 1800)
      sound.tap(); this.sheetKey = ''; this.persist(true); this.refreshDock(true)
    })
    el.querySelectorAll<HTMLButtonElement>('button.up-btn').forEach(b => {
      const path = Number(b.dataset.path) as 0 | 1
      const preview = () => {
        const stats = this.sim.towerStats(t.id, t.a + (path === 0 ? 1 : 0), t.b + (path === 1 ? 1 : 0), t.refinement)
        this.view.upgradeRange = stats.range * t.rangeMul
      }
      b.addEventListener('pointerenter', preview)
      b.addEventListener('focus', preview)
      b.addEventListener('pointerleave', () => { this.view.upgradeRange = undefined })
      b.addEventListener('blur', () => { this.view.upgradeRange = undefined })
      b.addEventListener('click', () => this.upgrade(t, path))
    })
    this.patchTowerSheet(el, t, true)
  }

  /** Live values change in place; the sheet is never rebuilt under a finger. */
  private patchTowerSheet(el: HTMLElement, t: Tower, force = false) {
    const sim = this.sim
    let what = `${t.pops} defeated`
    if (sim.challenge.guard) what = `${Math.floor(t.damageDealt ?? 0).toLocaleString('en')} damage · ${t.pops} defeated`
    if (t.def.kind === 'pulse') what = `${stat(t, 'slowed')} slowed`
    else if (t.def.kind === 'garden') what = `${stat(t, 'earned')} glow earned · ${t.stats.income} a wave`
    else if (t.id === 'owl') what = `${t.pops} defeated · ${stat(t, 'spotted')} Veils spotted`
    const sub = `${sim.challenge.guardian === 'ember' && t.id === 'cracker' ? 'Leaves fire · weaker explosions' : sim.challenge.guardian === 'reed' && t.id === 'wick' ? 'Bouncing shots · weaker hits' : sim.challenge.guardian === 'tide' && t.id === 'bell' ? 'Stronger slow · slower attacks' : t.def.role} · ${what}`
    const subEl = el.querySelector('.sh-sub')
    if (subEl && (force || subEl.textContent !== sub)) subEl.textContent = sub
    const refine = el.querySelector<HTMLButtonElement>('[data-refine]')
    if (refine) { const cost = sim.refinementCost(t); refine.disabled = cost === null || sim.glow < cost || !!sim.over }
    const move = el.querySelector<HTMLButtonElement>('[data-act="move"]')
    if (move) {
      move.disabled = !sim.canRelocate(t) || sim.glow < RELOCATE_COST
      move.textContent = sim.waveActive ? 'Move between waves' : `Move · ${RELOCATE_COST} glow`
    }
    const sell = el.querySelector('[data-act="sell"]') as HTMLElement | null
    const armed = this.sellArmed?.uid === t.uid
    const v = `${sim.sellValue(t)}|${armed}`
    if (sell && (force || sell.dataset.v !== v)) {
      sell.innerHTML = armed ? `${icon('trash')} Tap again to sell +${sim.sellValue(t)}` : `${icon('trash')} Sell +${sim.sellValue(t)}`
      sell.classList.toggle('armed', armed)
      sell.dataset.v = v
    }
    el.querySelectorAll<HTMLButtonElement>('button.up-btn').forEach((b) => {
      const cost = sim.upgradeCost(t, Number(b.dataset.path) as 0 | 1)
      b.classList.toggle('poor', cost != null && sim.glow < cost)
    })
  }

  private renderCharmSheet(el: HTMLElement) {
    const sim = this.sim
    const blocks = sim.gates.filter(g => sim.gateAvailable(g))
      .map((g) => {
        const id = g.def.id
        if (sim.gateLocked(g)) return `<div class="charm-block" data-gate-block="${id}"><div class="cb-head"><h3 class="cb-h">${g.def.name}</h3><span>Opens at wave ${g.def.unlockWave}</span></div></div>`
        const trait = this.pendingTrait[id] ?? g.charm?.trait
        const chips = CHARM_ORDER.map(
          (tr) => `<button class="chip-btn ${tr === trait ? 'on' : ''}" data-gate="${id}" data-trait="${tr}" data-focuskey="${id}-${tr}" aria-pressed="${tr === trait}"><img src="${enemyIcon(CHARM_ICON[tr])}" alt="" width="24" height="24">${CHARM_LABEL[tr]}</button>`,
        ).join('')
        const routes = ([0, 1] as const)
          .map((d) => {
            const on = !!trait && g.charm?.trait === trait && g.charm.dir === d
            const rich = sim.level.segs.get(g.def.outs[d])!.bonus > 1
            return `<button class="route-btn ${on ? 'on' : ''}" data-gate="${id}" data-dir="${d}" data-focuskey="${id}-d${d}" aria-pressed="${on}" ${trait ? '' : 'disabled'}>${icon(d === 0 ? 'bendLeft' : 'bendRight')}<span>${g.def.labels[d]}${rich ? ' ×2' : ''}</span></button>`
          })
          .join('')
        const status = g.charm ? `${CHARM_LABEL[g.charm.trait]} always take the ${g.def.labels[g.charm.dir]}` : trait ? 'Now pick where they go' : 'Pick a kind of Mope'
        return `<div class="charm-block" data-gate-block="${id}">
          <div class="cb-head"><h3 class="cb-h">${g.def.name}</h3><span>${status}</span></div>
          <div class="chips" role="group" aria-label="Which Mopes at the ${g.def.name}">${chips}</div>
          <div class="routes" role="group" aria-label="Where they go">${routes}</div>
        </div>`
      })
      .join('')
    const hasAny = sim.gates.some((g) => g.charm)
    el.setAttribute('role', 'region')
    el.innerHTML = `
      <div class="sh-head">
        <div class="sh-portrait sh-glyph">${icon('sparkle')}</div>
        <div class="sh-title"><h2 class="sh-h" id="sheet-title">Lock charms</h2><span>A charm makes a lock always send one kind of Mope the same way. ${CHARM_COST} glow each; swapping is free${hasAny ? '; tap a lit route to remove (75% back)' : ''}.</span></div>
        <button class="sh-close" data-focuskey="close" aria-label="Close">${icon('close')}</button>
      </div>
      ${blocks}`
    el.setAttribute('aria-labelledby', 'sheet-title')
    el.querySelector('.sh-close')!.addEventListener('click', () => this.closeSheet())
    el.querySelectorAll<HTMLButtonElement>('.chip-btn').forEach((b) =>
      b.addEventListener('click', () => {
        const g = sim.gates.find((q) => q.def.id === b.dataset.gate)!
        const tr = b.dataset.trait as CharmTrait
        this.pendingTrait[g.def.id] = tr
        sound.tap()
        // an existing charm switches kind for free, keeping its route
        if (g.charm && g.charm.trait !== tr) this.setCharm(g, tr, g.charm.dir)
        this.sheetKey = ''
      }),
    )
    el.querySelectorAll<HTMLButtonElement>('.route-btn').forEach((b) =>
      b.addEventListener('click', () => {
        const g = sim.gates.find((q) => q.def.id === b.dataset.gate)!
        const tr = this.pendingTrait[g.def.id] ?? g.charm?.trait
        if (!tr) return
        this.setCharm(g, tr, Number(b.dataset.dir) as 0 | 1)
      }),
    )
  }

  // ------------------------------------------------------------------ feedback helpers

  banner(title: string, note = '', ms = 2400) {
    const msg = { title, note, ms }
    if (this.bannerTimer > 0 && note && this.bannerQueue.length < 3 && $('banner').dataset.note) {
      this.bannerQueue.push(msg)
      return
    }
    this.showBanner(msg)
  }

  private showBanner(m: Msg) {
    const el = $('banner')
    el.dataset.note = m.note
    el.innerHTML = `<span class="b-title">${m.title}</span>${m.note ? `<span class="b-note">${m.note}</span>` : ''}`
    el.classList.toggle('slim', !m.note)
    // only one message on screen at a time: a banner waits while a toast is showing
    el.classList.toggle('show', this.toastTimer <= 0)
    this.bannerTimer = m.ms / 1000
    this.placeMessages()
  }

  toast(text: string, ms = 2200) {
    const el = $('toast')
    if (el.textContent === text && this.toastTimer > 0) {
      this.toastTimer = Math.max(this.toastTimer, ms / 1000)
      return
    }
    el.textContent = text
    el.classList.add('show')
    $('banner').classList.remove('show')
    this.toastTimer = Math.max(ms, 1200 + text.length * 40) / 1000
    this.placeMessages()
  }

  private hideToast() {
    this.toastTimer = 0.01
  }

  private clearMessages() {
    this.bannerQueue = []
    this.bannerTimer = 0
    this.toastTimer = 0
    $('banner').classList.remove('show')
    $('toast').classList.remove('show')
  }

  private keeperHelp(id: TowerId) {
    const signature = signatureFor(id, this.sim.challenge.guardian)
    const plan = this.sim.battlePlans.map(p => BATTLE_PLANS[p]).find(p => p.tower === id)
    if (plan) return `${signature ? signature.description + ' ' : ''}${plan.benefit} ${plan.tradeoff}`
    return signature?.description ?? KEEPER_HELP[id]
  }

  private info(id: TowerId, extra = '') {
    const d = TOWERS[id]
    this.toast(`${towerName(id, this.sim.challenge.guardian)} (${d.cost} glow): ${this.keeperHelp(id)}${extra ? ' ' + extra : ''}`, 3200)
  }

  private bumpGlow() {
    const el = document.querySelector('.stat-glow')!
    el.classList.remove('bump')
    void (el as HTMLElement).offsetWidth
    el.classList.add('bump')
  }

  private glowTargetWorld() {
    const r = document.querySelector('.stat-glow')!.getBoundingClientRect()
    const f = $('cv').getBoundingClientRect()
    return this.renderer.toWorld(r.left + r.width / 2 - f.left, r.top + r.height / 2 - f.top)
  }

  /** Contextual first-session guidance: at most one pointer on screen. */
  updateCoach() {
    const sim = this.sim
    this.view.hint = null
    this.gateBtns.forEach((b) => b.classList.remove('coach'))
    this.trayBtns.forEach((b) => b.classList.remove('coach'))
    if (this.mode !== 'play') return
    const learn = $('learn-bar')
    learn.hidden = !!this.coach.tutorialDone || sim.isChallenge || sim.wave > 1 || !!sim.stats.retries || sim.wave > 0 && !sim.towers.length
    if (!learn.hidden) learn.querySelector('span')!.textContent = !sim.towers.length
      ? 'Preview: the bright water is in range. Choose Wickling to build here, or tap another pad.'
      : !sim.wave ? 'Your tower is ready. Start wave 1 and watch it cover the highlighted water.' : 'Watch enemies cross your tower’s range. You can pause and inspect any tower.'
    if (!this.coach.built && !this.coach.tutorialDone && !sim.isChallenge && sim.wave === 0 && !sim.towers.length) {
      if (this.view.selection?.kind === 'pad') this.trayBtns[0].classList.add('coach')
      else {
        const p = sim.pads[sim.challenge.compact ? 0 : sim.challenge.expanding && sim.canalStage === 0 ? 12 : 1]
        this.view.hint = { x: p.x, y: p.y, label: 'Tap a pad' }
      }
      return
    }
    if (!this.coach.flipped && sim.planningWave >= 2 && this.settings.flipHint && (!sim.challenge.guard || (sim.wave <= 2 && !this.coach.routesSeen && !sim.waveActive))) {
      const i = sim.challenge.expanding && sim.canalStage === 0 ? 1 : 0
      const g = sim.gates[i]
      if (!sim.gateLocked(g)) {
        this.view.hint = { x: g.def.x, y: g.def.y - 30, label: sim.challenge.guard ? 'Compare routes' : 'Tap to switch routes' }
        this.gateBtns[i].classList.add('coach')
      }
    }
  }

  // ------------------------------------------------------------------ settings

  get reduceMotion(): boolean {
    return this.settings.reduceMotion ?? !!this.reduceMq?.matches
  }

  applySettings() {
    const s = this.settings
    sound.settings = { sfx: s.sfx, music: s.music, ambience: s.ambience, muted: s.muted }
    sound.applySettings()
    const rm = this.reduceMotion
    this.renderer.settings = { calmFx: s.calmFx, reduceMotion: rm, shake: s.shake && !rm }
    setHaptics(s.haptics)
    const root = document.documentElement
    root.classList.toggle('reduce-motion', rm)
    root.classList.toggle('left-hand', s.hand === 'left')
    root.classList.toggle('big-text', s.bigText)
    this.renderer.setBigText(s.bigText)
    // a bloom set that is no longer earned (cleared progress) falls back to wildflowers
    const set = BLOOM_SETS.find((b) => b.id === s.bloomSet)
    if (!set || !set.earned(loadProgress(), loadChallenges())) s.bloomSet = 'wild'
    this.renderer.setBloomStyle(asBloomStyle(s.bloomSet))
    if (this.palette !== s.palette) {
      const first = this.palette === ''
      this.palette = s.palette
      if (setPalette(s.palette) || first) {
        // every baked picture carries the old colours: icons, badges, Mope frames, tray portraits, the banks
        clearIconCache()
        clearGlyphCache()
        resetEnemySprites()
        this.renderer.refreshArt()
        if (this.trayBtns.length) {
          this.buildDock()
          this.refreshDock(true)
          this.hudCache = {}
        }
      }
    }
    saveSettings(s)
  }

  private resize() {
    const f = $('field').getBoundingClientRect()
    this.renderer.resize(Math.max(1, f.width), Math.max(1, f.height), Math.min(2.5, window.devicePixelRatio || 1))
    // Refit the next-wave chips after rotation or larger-text layout changes.
    delete this.hudCache.preview
    if (!$('sheet').hidden) this.placeSheet()
  }
}
