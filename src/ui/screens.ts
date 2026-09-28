import { WATCH_NAMES } from '../game/compact'
import { GUARDIANS, guardianUnlocked, type GuardianId } from '../game/guardians'
import { KEEPER_HELP } from '../game/canal-growth'
import { leakAdvice } from '../game/feedback'
import { saveHealth } from '../game/save-store'
import type { App } from '../app'
import { sound } from '../core/audio'
import { TAU } from '../core/math'
import { DIFFICULTY, ENEMIES, TOWER_ORDER, TOWERS, type Difficulty, type EnemyId, type TowerId } from '../game/defs'
import { LEVEL } from '../game/level'
import { BLOOM_SETS, restorationPreview, RESTORATIONS, canRetry, loadCheckpoint, clearMetrics, FEATS, journalTotal, loadChallenges, loadMetrics, loadProgress, loadRun, type ChallengeResult, type Settings } from '../game/progress'
import { FINAL_WAVE } from '../game/sim'
import { dailyTide, dayKey, offerFor, TIDE_FROM, TIDE_GLOW, weeklyNight, type ChallengeOffer, type Rule, type Twist } from '../game/tides'
import { asBloomStyle, bloomIconURL, bloomSetURL, famIndex } from '../render/blooms'
import { drawEnemyIcon } from '../render/enemies'
import { glyphBadgeURL } from '../render/glyphs'
import { glowSprite, P } from '../render/palette'
import { drawTower } from '../render/towers'
import { enemyIcon, towerIcon } from './assets'
import { icon } from './icons'
import { copyText, downloadBlob, shareImage, shareText, type ShareOutcome } from './share'

const MODE_ICON: Record<Difficulty, Parameters<typeof icon>[0]> = { relaxed: 'flower', standard: 'sun', nightfall: 'moon' }

const COUNTER_TIP: Record<EnemyId, string> = {
  reedling: 'Catch Reedlings on the garden approaches, or crack their new shell with heavy hits after the merge.',
  bloomheart: 'Use crowd bursts inside its healing ring before the visible countdown ends.',
  skiff: 'Moonbell slows the burst of speed after a Skiff loses its armour.',
  warden: 'Keep heavy towers firing along a long route; slow its Skiff escorts.',
  drip: 'More Wicklings, or a Twin Wick upgrade, handle Drip crowds.',
  skitter: 'Moonbells slow Skitters, and the long loops give your keepers more time. Keep Skitters off the short runs.',
  shell: 'Crackers, Lighthouses and Hot Wax Wicklings crack armour. The Mill run is another option when your towers cover it.',
  veil: 'Put a Lamp Owl where it shares water with your damage towers. The Lantern bridge also reveals Veils, but west-entry enemies skip it.',
  bloat: 'Lighthouses melt Bloats, and each one bursts into three Drips, so keep something quick behind them.',
  wisp: 'Cracker bursts cheer up whole Wisp swarms at once.',
  mender: 'Set a keeper to Strong so it cheers up Menders before they heal the crowd.',
  vshell: 'Pair a Lamp Owl with Crackers or a Lighthouse to handle hidden armour. The bridge and mill also help.',
  toad: 'Gloomtoads jam locks. Set both locks to the long loops before one arrives, and put a Lighthouse on its path.',
  gloom: 'Old Gloom splits at the Lower Lock, so both lower channels need a Lighthouse or Candelabra.',
}

const TWIST_SHORT: Record<Twist, string> = { none: '', swift: 'Swift current', thick: 'Thick shells', tidal: 'Tidal locks', sluice: 'Sluice night' }
const RULE_SHORT: Record<Rule, string> = { none: '', noCharms: 'no charms', trio: 'three keepers', noGarden: 'no gardens', fixed: 'fixed locks', lean: 'no charms or gardens' }
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** "Swift current, no charms": a challenge's modifiers in a few words. */
function offerSummary(o: ChallengeOffer): string {
  const t = TWIST_SHORT[o.twist]
  const r = RULE_SHORT[o.rule]
  return t && r ? `${t}, ${r}` : t || cap(r)
}

function resultLine(r: ChallengeResult): string {
  return r.won ? `Kept with ${r.light} of ${r.maxLight} light` : `Held ${r.held} of ${r.waves} waves`
}

/** Plain text a player can paste anywhere: which challenge, how it went, what made it hard. */
function challengeShareText(o: ChallengeOffer, r: ChallengeResult): string {
  const head = o.kind === 'daily' ? `Lantern Guard daily tide: ${o.name}, ${o.when}` : `Lantern Guard weekly night: ${o.name} (${o.when})`
  const body = r.won ? `Dawn with ${r.light}/${r.maxLight} light and ${r.flips} lock flips` : `The lantern went out after ${r.held} of ${r.waves} waves`
  return [head, body, offerSummary(o)].join('\n')
}

const SHARE_WORD: Record<ShareOutcome, string> = { shared: 'Shared', copied: 'Copied', saved: 'Saved', cancelled: '', failed: 'Could not share' }

/** Flashes the outcome on the button that started it, then puts its label back. */
function flashOutcome(b: HTMLElement, outcome: ShareOutcome) {
  const word = SHARE_WORD[outcome]
  if (!word) return
  const label = b.innerHTML
  b.innerHTML = `${icon('check')} ${word}`
  // announced through the page's standing live region (a region added at the moment of change is not read)
  const live = document.getElementById('sr-live')
  if (live) live.textContent = word
  setTimeout(() => b.isConnected && (b.innerHTML = label), 2200)
}

/** Journal milestones: bud, bloom and full bloom, scaled to how often each Mope turns up. */
const TIER_NAMES = ['Bud', 'Bloom', 'Full bloom']
const tierGoals = (id: EnemyId): number[] => (ENEMIES[id].boss ? [1, 5, 25] : id === 'wisp' ? [50, 500, 5000] : [25, 250, 2500])
const JOURNAL_ORDER: EnemyId[] = ['drip', 'skitter', 'shell', 'wisp', 'bloat', 'veil', 'mender', 'vshell', 'toad', 'gloom', 'skiff', 'warden', 'reedling', 'bloomheart']

const median = (xs: number[]) => {
  if (!xs.length) return NaN
  const a = [...xs].sort((p, q) => p - q)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

/** Focus rings only matter to keyboard users; touch players should never see a pre-selected button. */
let keyboardMode = false
export const isKeyboardMode = () => keyboardMode
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyboardMode = true
  })
  window.addEventListener('pointerdown', () => (keyboardMode = false))
}

export class Screens {
  private app: App
  private el: HTMLElement
  private stack: (() => void)[] = []
  /** For each screen on the stack, the control that led away from it, so Back returns focus there. */
  private returnKeys: (string | null)[] = []
  private opener: HTMLElement | null = null
  private artRaf = 0
  private difficulty: Difficulty = 'standard'

  constructor(app: App) {
    this.app = app
    this.el = document.getElementById('overlay')!
    this.el.setAttribute('role', 'dialog')
    this.el.setAttribute('aria-modal', 'true')
  }

  isOpen() {
    return !this.el.hidden
  }

  close() {
    cancelAnimationFrame(this.artRaf)
    this.el.hidden = true
    this.el.innerHTML = ''
    this.stack = []
    this.returnKeys = []
    document.getElementById('stage')!.inert = false
    if (this.opener?.isConnected && keyboardMode) this.opener.focus({ preventScroll: true })
    this.opener = null
  }

  back() {
    // the title screen is the root: Escape there does nothing
    if (this.stack.length <= 1 && this.app.mode !== 'play') return
    this.stack.pop()
    this.returnKeys.pop()
    const prev = this.stack.pop()
    const back = this.returnKeys.pop() ?? null
    if (prev) {
      prev()
      if (back && keyboardMode) this.el.querySelector<HTMLElement>(back)?.focus({ preventScroll: true })
    } else if (this.app.mode === 'play') {
      this.close()
      this.app.setPaused(false)
    } else this.close()
  }

  private show(html: string, render: () => void, focus?: string) {
    if (this.el.hidden) this.opener = document.activeElement as HTMLElement | null
    else {
      // remember which control on the current screen led here
      const a = document.activeElement as HTMLElement | null
      const sel = a?.dataset?.act ? `[data-act="${a.dataset.act}"]` : a?.dataset?.mode ? `[data-mode="${a.dataset.mode}"]` : null
      if (this.returnKeys.length) this.returnKeys[this.returnKeys.length - 1] = sel
    }
    cancelAnimationFrame(this.artRaf)
    this.stack.push(render)
    this.returnKeys.push(null)
    this.el.hidden = false
    this.el.innerHTML = html
    this.el.scrollTop = 0
    document.getElementById('stage')!.inert = true
    const heading = this.el.querySelector('h1, h2')
    if (heading) {
      heading.id = 'dialog-title'
      this.el.setAttribute('aria-labelledby', 'dialog-title')
    }
    const target = (focus ? this.el.querySelector<HTMLElement>(focus) : null) ?? this.el.querySelector<HTMLElement>('button')
    if (keyboardMode) target?.focus({ preventScroll: true })
    else {
      const card = this.el.querySelector<HTMLElement>('.card')
      card?.setAttribute('tabindex', '-1')
      card?.focus({ preventScroll: true })
    }
  }

  private on(sel: string, fn: (el: HTMLElement) => void) {
    this.el.querySelectorAll<HTMLElement>(sel).forEach((b) =>
      b.addEventListener('click', () => {
        sound.unlock()
        sound.tap()
        fn(b)
      }),
    )
  }

  // ------------------------------------------------------------------ title

  title() {
    this.stack = []
    this.returnKeys = []
    const save = loadRun('campaign')
    const challengeSave = loadRun('challenge')
    const name = save?.challenge.id ? (offerFor(save.challenge.id)?.name ?? 'Challenge') : save ? DIFFICULTY[save.difficulty].name : ''
    const nextWave = save ? save.wave + (save.v === 2 && (save.over || save.enemies.length || save.spawners.length) ? 0 : 1) : 1
    this.show(
      `<div class="card title-card simple-title">
        <canvas class="key-art" aria-hidden="true"></canvas>
        <div class="logo"><canvas id="logo-cv" width="128" height="128" aria-hidden="true"></canvas><h1 translate="no" aria-label="Lantern Guard: Tower Defense">Lantern <em>Guard</em><span class="title-genre">Tower Defense</span></h1></div>
        <p class="tagline">Build your towers. Grow your defence.<br>Keep the lantern lit.</p>
        <div class="title-play stack">
          <button class="big-btn primary resume-btn" data-act="${save ? 'continue' : 'play'}"><span>${icon('play')} ${save ? 'Continue' : 'Play'}</span>${save ? `<small>${name} · ${save.challenge.compact ? WATCH_NAMES[save.challenge.variant ?? 0] : save.challenge.gardens ? 'Gardens' : save.challenge.harbour ? 'Harbour' : 'Canal'} · wave ${nextWave}${save.v === 2 && save.over ? (save.won ? ' complete' : ' · review') : ''}<br>${save.towers.length} towers · ${save.lives} light</small>` : ''}</button>
          ${challengeSave ? `<button class="title-quiet" data-act="continue-challenge">Resume challenge · wave ${Math.max(1, challengeSave.wave - (challengeSave.challenge.tide?.from ?? 0))}</button>` : ''}
          <button class="title-quiet" data-act="night">${save ? 'New compact watch' : `Difficulty: ${DIFFICULTY[this.difficulty].name}`}</button>
        </div>
        ${saveHealth === 'invalid' ? '<p class="save-note" role="status">Your saved night could not be read. Your journal is kept separately.</p>' : saveHealth === 'recovered' ? '<p class="save-note" role="status">Continue will use your previous autosave.</p>' : saveHealth === 'unavailable' ? '<p class="save-note" role="status">Saving is unavailable. Keep the game open to retain your night.</p>' : ''}
        <div class="title-links">
          <button data-act="how">${icon('question')} Guide</button>
          <button data-act="collection">${icon('book')} Collection</button>
          <button data-act="settings">${icon('gear')} Settings</button>
        </div>
      </div>`,
      () => this.title(),
    )
    drawLogo(this.el.querySelector('#logo-cv') as HTMLCanvasElement)
    this.runKeyArt(this.el.querySelector('.key-art') as HTMLCanvasElement)
    this.on('[data-act="play"]', () => this.app.newRun(this.difficulty))
    this.on('[data-act="continue"]', () => this.app.continueRun())
    this.on('[data-act="continue-challenge"]', () => this.app.continueRun('challenge'))
    this.on('[data-act="night"]', () => this.chooseNight(!!save))
    this.on('[data-act="how"]', () => this.journal('basics'))
    this.on('[data-act="collection"]', () => this.collection())
    this.on('[data-act="settings"]', () => this.settings())
  }

  private chooseNight(replace: boolean) {
    const p = loadProgress()
    this.show(`<div class="card"><h2>${replace ? 'Start a new night' : 'Difficulty'}</h2>
      <p>One compact board for 40 waves. Buy new plots, refine your towers and face new enemies. Each new watch rotates the layout; your current watch keeps every investment.</p>
      <div class="modes">${(Object.keys(DIFFICULTY) as Difficulty[]).map(d => {
        const m = DIFFICULTY[d]
        const won = (p.wins[d] ?? 0) > 0
        return `<button class="mode" data-mode="${d}" ${replace ? '' : `aria-pressed="${d === this.difficulty}"`}>
          <span class="m-ic">${icon(MODE_ICON[d])}</span>
          <span><b>${m.name}</b><span>${m.desc}</span></span>
          <span class="medal ${won ? 'won' : ''}" aria-label="${won ? 'Won before' : ''}">${icon(won ? 'trophy' : !replace && d === this.difficulty ? 'check' : 'play')}</span>
        </button>`
      }).join('')}</div>
      ${p.feats.crowned || p.feats.groundskeeper || p.feats['full-bloom'] ? `<p>Guardian for new watches: ${GUARDIANS[this.app.settings.guardian ?? 'lantern'].name}. Change in Collection.</p>` : ''}
      <div class="stack gap-top"><button class="big-btn" data-act="back">Back</button></div></div>`, () => this.chooseNight(replace))
    this.on('[data-mode]', b => {
      const d = b.dataset.mode as Difficulty
      this.difficulty = d
      if (replace) this.confirm('Start a new night?', 'Your saved run will be replaced. Your collection is kept.', 'Start new', () => this.app.newRun(d))
      else this.back()
    })
    this.on('[data-act="back"]', () => this.back())
  }

  private collection() {
    const p = loadProgress()
    const tides = p.runs >= 1 || Object.keys(loadChallenges()).length > 0
    this.show(`<div class="card"><h2>Collection</h2><p>Blooms, milestones and nights to return to.</p>
      <div class="stack">
        <button class="big-btn" data-act="journal">${icon('book')} Bloom journal <small>${Math.floor(journalTotal(p)).toLocaleString('en')} blooms</small></button>
        <button class="big-btn" data-act="feats">${icon('star')} Feats <small>${Object.values(p.feats).filter(Boolean).length}/${FEATS.length}</small></button>
        <button class="big-btn" data-act="guardians">${icon('sparkle')} Guardians <small>${Object.keys(GUARDIANS).filter(id => guardianUnlocked(id as GuardianId, p.feats)).length}/4 available · choose your next watch’s style</small></button>
        <section class="settlement-card"><h3>Your settlement · ${p.settlement ?? 0}/4 restored</h3><p>${restorationPreview(p)}</p>${RESTORATIONS.slice(0, p.settlement ?? 0).map(r => `<p>✓ ${r.reward}</p>`).join('')}${p.feats['early-bird'] ? '<p>✓ Village bunting earned.</p>' : ''}</section>
        ${p.harbourWins ? `<p>Lantern Harbour kept ${p.harbourWins} ${p.harbourWins === 1 ? 'time' : 'times'}.</p>` : ''}
        ${tides ? `<button class="big-btn" data-act="tides">${icon('calendar')} Daily tides &amp; weekly nights</button>` : ''}
        <button class="big-btn" data-act="back">Back</button>
      </div></div>`, () => this.collection())
    this.on('[data-act="journal"]', () => this.bloomJournal('mopes'))
    this.on('[data-act="feats"]', () => this.feats())
    this.on('[data-act="guardians"]', () => this.guardians())
    this.on('[data-act="tides"]', () => this.tides())
    this.on('[data-act="back"]', () => this.back())
  }

  // ------------------------------------------------------------------ tides

  private guardians() {
    const feats = loadProgress().feats
    const selected = this.app.settings.guardian ?? 'lantern'
    this.show(`<div class="card"><h2>Guardians</h2><p>Choose for new nights, or change at a completed chapter while keeping your defence.</p>
      <div class="stack">${(Object.keys(GUARDIANS) as GuardianId[]).map(id => { const g = GUARDIANS[id]; const earned = guardianUnlocked(id, feats); return `<button class="big-btn ${selected === id ? 'primary' : ''}" data-guardian="${id}" aria-pressed="${selected === id}" ${earned ? '' : 'disabled'}>${g.name}<small>${g.description}${earned ? '' : ' Unlock: ' + g.unlock + '.'}</small></button>` }).join('')}</div>
      <p>Unlocks are credited as soon as you earn them. Daily challenges use the Lantern Keeper.</p><button class="big-btn" data-act="back">Back</button></div>`, () => this.guardians())
    this.on('[data-guardian]', b => {
      const id = b.dataset.guardian as GuardianId
      if (!guardianUnlocked(id, feats)) return
      this.app.settings.guardian = id === 'lantern' ? undefined : id
      this.app.applySettings(); this.stack.pop(); this.returnKeys.pop(); this.guardians()
    })
    this.on('[data-act="back"]', () => this.back())
  }

  /** The daily tide and the weekly night: what they ask, how you did, and a way to share it. */
  tides() {
    const now = new Date()
    const daily = dailyTide(now, true)
    const weekly = weeklyNight(now, true)
    const results = loadChallenges()
    const save = loadRun('challenge')
    const block = (o: ChallengeOffer, sum: string, play: string) => {
      const r = results[o.id]
      const best = r ? `<p class="tide-best">${icon(r.won ? 'sun' : 'moon')}<span>Your best: ${resultLine(r).toLowerCase()}${r.tries > 1 ? `, over ${r.tries} tries` : ''}.</span></p>` : ''
      return `<section class="tide" aria-labelledby="tide-${o.kind}">
        <div class="tide-head">
          <span class="m-ic">${icon(o.kind === 'daily' ? 'calendar' : 'moon')}</span>
          <div><h3 id="tide-${o.kind}">${o.name}</h3><span>${o.kind === 'daily' ? 'Daily tide' : 'Weekly night'}, ${o.when}</span></div>
        </div>
        <p class="tide-sum">${sum}</p>
        <ul class="tide-rules">${o.rules.map((t) => `<li>${icon(t.startsWith('Tidal') ? 'waves' : t.startsWith('Only') || t.startsWith('No') || t.startsWith('Lean') || t.startsWith('Fixed') ? 'lock' : 'lightning')}<span>${t}</span></li>`).join('')}</ul>
        ${best}
        <div class="row-btns flush${r ? '' : ' one'}">
          <button class="big-btn primary" data-play="${o.id}">${icon('play')} ${play}</button>
          ${r ? `<button class="big-btn" data-share="${o.id}">${icon('share')} Share result</button>` : ''}
        </div>
      </section>`
    }
    // the last seven tides, oldest first: kept, lost, or not played
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i)
      const r = results[`daily:${dayKey(d)}:guard1`] ?? results[`daily:${dayKey(d)}`]
      const name = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      const state = r?.won ? 'kept' : r ? 'lost' : 'none'
      const label = `${name}: ${r?.won ? 'tide kept' : r ? 'played, lantern went out' : 'not played'}`
      return `<li class="day ${state}${i === 6 ? ' today' : ''}"><span class="sr-only">${label}</span><span aria-hidden="true">${d.toLocaleDateString('en', { weekday: 'narrow' })}</span>${state === 'kept' ? icon('sun') : state === 'lost' ? icon('moon') : `<b aria-hidden="true">${d.getDate()}</b>`}</li>`
    }).join('')
    this.show(
      `<div class="card">
        <h2>Tides</h2>
        <p>A new tide every day and a new rule every week. Everyone who plays gets the same ones.</p>
        ${block(daily, `Waves ${TIDE_FROM + 1} to ${FINAL_WAVE} of a remixed night on Standard. Start with ${TIDE_GLOW.toLocaleString('en')} glow and build before the first wave.`, "Play today's tide")}
        <ol class="week-strip" aria-label="The last seven daily tides">${days}</ol>
        ${block(weekly, 'The whole of Wickwater Canal on Standard, under one rule.', "Play this week's night")}
        <div class="stack gap-top"><button class="big-btn" data-act="done">Back</button></div>
      </div>`,
      () => this.tides(),
    )
    const offers = new Map([daily, weekly].map((o) => [o.id, o]))
    this.on('[data-play]', (b) => {
      const o = offers.get(b.dataset.play!)!
      if (save) this.confirm(o.kind === 'daily' ? "Start today's tide?" : "Start this week's night?", 'Your previous challenge will be replaced. Your canal defence stays saved.', 'Start', () => this.app.newChallenge(o.challenge))
      else this.app.newChallenge(o.challenge)
    })
    this.el.querySelectorAll<HTMLElement>('[data-share]').forEach((b) =>
      b.addEventListener('click', async () => {
        sound.tap()
        const o = offers.get(b.dataset.share!)!
        const r = loadChallenges()[o.id]
        if (r) flashOutcome(b, await shareText(challengeShareText(o, r)))
      }),
    )
    this.on('[data-act="done"]', () => this.back())
  }

  // ------------------------------------------------------------------ bloom journal

  /** Every Mope cheered up, over every night, with the bloom it leaves; and the bloom sets play has earned. */
  bloomJournal(tab: 'mopes' | 'sets') {
    const prog = loadProgress()
    const settings = this.app.settings
    const style = asBloomStyle(settings.bloomSet)
    const total = Math.floor(journalTotal(prog))
    let body = ''
    if (tab === 'mopes') {
      body = `<div class="jr-grid">${JOURNAL_ORDER.map((id) => {
        const e = ENEMIES[id]
        const n = Math.floor(prog.journal[id] ?? 0)
        const goals = tierGoals(id)
        const tier = goals.filter((g) => n >= g).length
        const pips = [0, 1, 2].map((k) => `<span class="pip ${k < tier ? 'on' : ''}"></span>`).join('')
        const next = tier < 3 ? `${(goals[tier] - n).toLocaleString('en')} more to ${TIER_NAMES[tier].toLowerCase()}` : 'In full bloom'
        const met = n > 0
        return `<div class="jr-card${met ? '' : ' unmet'}">
          <div class="jr-art">${met ? `<img class="jr-bloom" src="${bloomIconURL(famIndex(e.family), style)}" alt="" width="44" height="44">` : ''}<img class="jr-mope" src="${enemyIcon(id)}" alt="" width="44" height="44"></div>
          <b>${e.name}</b>
          <span class="jr-count">${met ? `${n.toLocaleString('en')} cheered` : 'Not met yet'}</span>
          <span class="jr-tier"><span class="pips" role="img" aria-label="${tier ? TIER_NAMES[tier - 1] : 'No milestone yet'}">${pips}</span><span>${met ? next : ''}</span></span>
        </div>`
      }).join('')}</div>`
    } else {
      const challenges = loadChallenges()
      body = `<div class="sets">${BLOOM_SETS.map((b) => {
        const earned = b.earned(prog, challenges)
        const on = settings.bloomSet === b.id
        const act = !earned ? `<span class="set-lock" role="img" aria-label="Locked">${icon('lock')}</span>` : on ? `<span class="set-on">${icon('check')} In use</span>` : `<button class="pill-btn" data-set="${b.id}" aria-label="Use ${b.name}">Use</button>`
        return `<div class="set-row${earned ? '' : ' locked'}${on ? ' on' : ''}">
          <img src="${bloomSetURL(asBloomStyle(b.id))}" alt="" width="144" height="56">
          <div class="set-txt"><b>${b.name}</b><span>${earned ? b.desc : `To earn: ${b.unlock}`}</span></div>
          ${act}
        </div>`
      }).join('')}</div>`
    }
    const tabBtn = (t: string, label: string) => `<button role="tab" aria-selected="${t === tab}" data-tab="${t}">${label}</button>`
    this.show(
      `<div class="card">
        <h2>Bloom journal</h2>
        <p>${total ? `Every Mope you cheer up leaves a bloom on the banks. ${total.toLocaleString('en')} so far.` : 'Every Mope you cheer up leaves a bloom on the banks. Play a night to start your journal.'}</p>
        <div class="tabs two" role="tablist">${tabBtn('mopes', 'Mopes')}${tabBtn('sets', 'Bloom sets')}</div>
        <div class="j-scroll" role="tabpanel">${body}</div>
        <div class="stack gap-top"><button class="big-btn primary" data-act="done">Back</button></div>
      </div>`,
      () => this.bloomJournal(tab),
      `[data-tab="${tab}"]`,
    )
    this.on('[data-tab]', (b) => {
      this.stack.pop()
      this.returnKeys.pop()
      this.bloomJournal(b.dataset.tab as 'mopes' | 'sets')
    })
    this.on('[data-set]', (b) => {
      settings.bloomSet = b.dataset.set!
      this.app.applySettings()
      this.stack.pop()
      this.returnKeys.pop()
      this.bloomJournal('sets')
      this.el.querySelector<HTMLElement>('.set-row.on .set-on')?.setAttribute('tabindex', '-1')
    })
    this.on('[data-act="done"]', () => this.back())
  }

    private confirm(title: string, body: string, ok: string, fn: () => void) {
    this.show(
      `<div class="card"><h2>${title}</h2><p>${body}</p><div class="row-btns"><button class="big-btn" data-act="no">Cancel</button><button class="big-btn primary" data-act="yes">${ok}</button></div></div>`,
      () => this.confirm(title, body, ok, fn),
    )
    this.on('[data-act="no"]', () => this.back())
    this.on('[data-act="yes"]', () => fn())
  }

  // ------------------------------------------------------------------ pause

  pause() {
    const sim = this.app.sim
    const mode = DIFFICULTY[sim.difficulty]
    const offer = this.app.offer()
    const shown = this.app.shownWave() + (!sim.waveActive && !sim.over ? 1 : 0)
    const where = sim.wave > sim.finalWave ? `free play wave ${sim.wave - sim.finalWave}` : sim.challenge.tide ? `tide wave ${shown} of ${FINAL_WAVE - sim.waveOffset}` : `wave ${shown} of ${sim.finalWave}`
    this.show(
      `<div class="card">
        <h2>Paused</h2>
        <p>${offer ? offer.name : `${sim.level.def.name}, ${mode.name}`}, ${where}. ${mode.pausedFlips ? 'Close this to plan: you can build, upgrade and set locks while paused.' : 'Nightfall: you can build while paused, but not flip locks.'}</p>
        <div class="stack">
          <button class="big-btn primary" data-act="resume">${icon('play')} Resume</button>
          <button class="big-btn" data-act="plan">${icon('eye')} Plan while paused</button>
          <div class="row-btns flush">
            <button class="big-btn" data-act="how">${icon('question')} Guide</button>
            <button class="big-btn" data-act="settings">${icon('gear')} Settings</button>
          </div>
          <div class="row-btns flush">
            <button class="big-btn" data-act="restart">${icon('restart')} Restart</button>
            <button class="big-btn" data-act="quit">${icon('house')} Title</button>
          </div>
        </div>
      </div>`,
      () => this.pause(),
    )
    this.on('[data-act="resume"]', () => {
      this.close()
      this.app.setPaused(false)
    })
    this.on('[data-act="plan"]', () => this.close())
    this.on('[data-act="how"]', () => this.journal('basics'))
    this.on('[data-act="settings"]', () => this.settings())
    this.on('[data-act="restart"]', () => this.confirm('Restart this night?', 'Your keepers and progress in this run will be lost.', 'Restart', () => this.app.restart()))
    this.on('[data-act="quit"]', () => this.app.quitToTitle())
  }

  // ------------------------------------------------------------------ settings

  settings() {
    const s = this.app.settings
    const slider = (key: keyof Settings, label: string) =>
      `<label class="setting" for="set-${key}"><span>${label}</span><input id="set-${key}" type="range" min="0" max="1" step="0.05" value="${s[key]}" data-key="${key}"></label>`
    const motion = s.reduceMotion === null ? 'device' : s.reduceMotion ? 'reduce' : 'full'
    const toggle = (key: keyof Settings, label: string, on: boolean, hint = '') =>
      `<button class="setting toggle-row" role="switch" aria-checked="${on}" data-key="${key}" id="set-${key}"><span><span class="set-lbl">${label}</span>${hint ? `<span class="set-hint">${hint}</span>` : ''}</span><span class="toggle" aria-hidden="true"></span></button>`
    const segRow = (group: string, label: string, hint: string, opts: [string, string][], cur: string) =>
      `<div class="setting"><span id="lbl-${group}"><span class="set-lbl">${label}</span>${hint ? `<span class="set-hint">${hint}</span>` : ''}</span><span class="seg" role="radiogroup" aria-labelledby="lbl-${group}">${opts.map(([v, l]) => `<button role="radio" aria-checked="${v === cur}" data-seg="${group}" data-val="${v}">${l}</button>`).join('')}</span></div>`
    const rmHint = s.reduceMotion === null ? `Following your device (${this.app.reduceMotion ? 'reduced' : 'full'})` : 'Set here'
    this.show(
      `<div class="card">
        <h2>Settings</h2>
        <h3>Sound</h3>
        ${slider('sfx', 'Sound effects')}
        ${slider('music', 'Music')}
        ${slider('ambience', 'Night ambience')}
        ${toggle('muted', 'Mute everything', s.muted)}
        <h3>Seeing</h3>
        ${segRow('palette', 'Colours', 'Keeps families distinct for colour-blind players', [['standard', 'Standard'], ['clear', 'Colour-safe']], s.palette)}
        ${toggle('bigText', 'Larger text', s.bigText, 'Menus, messages and map labels')}
        ${toggle('calmFx', 'Calm effects', s.calmFx, 'Fewer particles in busy waves')}
        ${segRow('motion', 'Motion', rmHint, [['device', 'Device'], ['reduce', 'Reduced'], ['full', 'Full']], motion)}
        ${toggle('shake', 'Screen shake', s.shake)}
        <h3>Playing</h3>
        ${segRow('hand', 'Dock side', 'Puts the wave button and charms under your thumb', [['right', 'Right hand'], ['left', 'Left hand']], s.hand)}
        ${toggle('lockAssist', 'Slow at the locks', s.lockAssist, 'Time eases to half speed as Mopes reach a lock you can flip')}
        ${toggle('autoStart', 'Auto-start waves', s.autoStart)}
        ${toggle('haptics', 'Vibration', s.haptics)}
        <div class="stack gap-top">
          <button class="big-btn" data-act="playtest">${icon('chart')} Playtest data</button>
          <button class="big-btn primary" data-act="done">Done</button>
        </div>
      </div>`,
      () => this.settings(),
    )
    this.el.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((inp) =>
      inp.addEventListener('input', () => {
        ;(s as unknown as Record<string, number>)[inp.dataset.key!] = Number(inp.value)
        this.app.applySettings()
      }),
    )
    this.el.querySelectorAll<HTMLButtonElement>('.toggle-row').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.key as keyof Settings
        const rec = s as unknown as Record<string, boolean | null>
        rec[k] = !rec[k]
        sound.unlock()
        this.app.applySettings()
        b.setAttribute('aria-checked', String(!!rec[k]))
        sound.tap()
      }),
    )
    this.el.querySelectorAll<HTMLButtonElement>('[data-seg]').forEach((b) =>
      b.addEventListener('click', () => {
        const group = b.dataset.seg!
        const v = b.dataset.val!
        if (group === 'motion') s.reduceMotion = v === 'device' ? null : v === 'reduce'
        else if (group === 'palette') s.palette = v as Settings['palette']
        else if (group === 'hand') s.hand = v as Settings['hand']
        this.app.applySettings()
        sound.tap()
        this.stack.pop()
        this.returnKeys.pop()
        const top = this.el.scrollTop
        this.settings()
        this.el.scrollTop = top
        this.el.querySelector<HTMLElement>(`[data-seg="${group}"][data-val="${v}"]`)?.focus({ preventScroll: true })
      }),
    )
    this.on('[data-act="playtest"]', () => this.playtest())
    this.on('[data-act="done"]', () => this.back())
  }

  // ------------------------------------------------------------------ playtest data

  /** Device-local action evidence for the current journey; human understanding needs observed play. */
  playtest() {
    const s = this.app.settings
    const all = loadMetrics().sessions
    // plain nights only: tides open with a bank and skip the teaching waves
    const nights = all.filter((x) => x.rules === 'guard' && !x.challenge && !x.event && x.result !== 'abandoned')
    const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : 'n/a')
    const firstBuild = median(nights.map((x) => x.firstBuildSec).filter((v) => v >= 0))
    const resumes = all.filter(x => x.rules === 'guard' && x.event === 'resume')
    const retried = nights.filter(x => (x.retries ?? 0) > 0)
    const paused = median(nights.filter((x) => x.pausedSec !== undefined).map((x) => x.pausedSec!))
    let pairs = 0
    let changed = 0
    for (let i = 1; i < nights.length; i++) {
      pairs++
      const a = [...nights[i - 1].towers].sort().join()
      const b = [...nights[i].towers].sort().join()
      if (a !== b) changed++
    }
    const tile = (v: string, label: string) => `<div><b>${v}</b><span>${label}</span></div>`
    const stats = nights.length
      ? `<div class="stats">
          ${tile(String(nights.length), `Attempts logged, ${nights.filter((x) => x.result === 'won').length} won`)}
          ${tile(Number.isNaN(firstBuild) ? 'n/a' : `${Math.round(firstBuild)} s`, 'Median time to first keeper (goal: under 10 s)')}
          ${tile(String(resumes.length), 'Saved nights deliberately resumed')}
          ${tile(pct(nights.filter(x => (x.routePlans ?? 0) > 0).length, nights.length), 'Attempts that used the route planner')}
          ${tile(String(retried.length), 'Attempts using a planning retry')}
          ${tile(String(nights.filter(x => x.result === 'lost' && x.wave >= 8 && x.wave <= 10).length), 'Losses during the first hidden-enemy and boss waves')}
          ${tile(Number.isNaN(paused) ? 'n/a' : `${Math.round(paused)} s`, 'Median time paused per sitting')}
          ${tile(pairs ? `${changed} of ${pairs}` : 'n/a', 'Next nights that tried a different build')}
        </div>`
      : `<div class="tip alt">${icon('chart')}<div>No nights logged yet. Play a night and the numbers appear here.</div></div>`
    this.show(
      `<div class="card">
        <h2>Playtest data</h2>
        <p>The last 50 results and resume events stay on this device. Summaries use current Lantern Guard rules. Older records remain in the export.</p><p>Observe players separately: ask where enemies are heading and what caused a loss. These counts cannot measure understanding or prove retention.</p>
        ${stats}
        <button class="setting toggle-row" role="switch" aria-checked="${s.flipHint}" data-key="flipHint" id="set-flipHint"><span><span class="set-lbl">First-flip hint</span><span class="set-hint">Turn off to test whether players find the locks on their own</span></span><span class="toggle" aria-hidden="true"></span></button>
        <div class="row-btns">
          <button class="big-btn" data-act="copy" ${all.length ? '' : 'disabled'}>${icon('copy')} Copy log</button>
          <button class="big-btn" data-act="save" ${all.length ? '' : 'disabled'}>${icon('download')} Save log</button>
        </div>
        <div class="stack gap-top">
          ${all.length ? `<button class="big-btn" data-act="clear">${icon('trash')} Clear log</button>` : ''}
          <button class="big-btn primary" data-act="done">Back</button>
        </div>
      </div>`,
      () => this.playtest(),
    )
    const payload = () => JSON.stringify({ app: 'lanternlocks', exported: new Date().toISOString(), sessions: loadMetrics().sessions }, null, 2)
    this.el.querySelector<HTMLButtonElement>('[data-key="flipHint"]')?.addEventListener('click', (e) => {
      s.flipHint = !s.flipHint
      this.app.applySettings()
      this.app.updateCoach()
      ;(e.currentTarget as HTMLElement).setAttribute('aria-checked', String(s.flipHint))
      sound.tap()
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="copy"]')?.addEventListener('click', async (e) => {
      sound.tap()
      flashOutcome(e.currentTarget as HTMLElement, await copyText(payload()))
    })
    this.el.querySelector<HTMLButtonElement>('[data-act="save"]')?.addEventListener('click', (e) => {
      sound.tap()
      downloadBlob(new Blob([payload()], { type: 'application/json' }), `lanternlocks-playtest-${dayKey(new Date())}.json`)
      flashOutcome(e.currentTarget as HTMLElement, 'saved')
    })
    this.on('[data-act="clear"]', () =>
      this.confirm('Clear the playtest log?', 'The numbers on this screen start again from zero.', 'Clear', () => {
        clearMetrics()
        this.stack.pop()
        this.returnKeys.pop()
        this.back()
      }),
    )
    this.on('[data-act="done"]', () => this.back())
  }

    // ------------------------------------------------------------------ journal

  journal(tab: 'basics' | 'keepers' | 'mopes') {
    let body = ''
    const guard = !!this.app.sim.challenge.guard
    const compactWatch = !!this.app.sim.challenge.compact
    if (tab === 'basics') {
      const row = (ic: Parameters<typeof icon>[0], title: string, text: string) =>
        `<div class="j-row"><div class="j-ic">${icon(ic)}</div><div><b>${title}</b><span>${text}</span></div></div>`
      body = `<div class="journal">
        ${row('tap', 'Build keepers', 'Tap a stone pad, then pick a keeper (on a phone, tap it twice). Keepers cheer up Mopes that drift past.')}
        ${row('waves', 'Grow the same defence', compactWatch ? 'Your board stays the same size for 40 waves. After waves 5, 10, 15 and 20, tap a dashed + plot and spend glow to clear it. Towers cost extra; upgrades may be the better investment.' : 'Start at Lantern bend. Before wave 6 the upper canal opens; before wave 11 the west inlet opens. Your towers and upgrades stay in place. New tower choices arrive a few at a time.')}
        ${row('swap', guard ? 'Plan your routes' : 'Steer with the locks', guard ? 'Between waves, tap a lock to compare both routes and the towers covering them. Your choice stays set. During combat, tap to switch quickly; hold a lock or pause to compare routes.' : 'Tap a lock, or its button at the bottom, to send Mopes down the other channel. Flowing water and the arrow show where they will go.')}
        ${row('flower', 'Long loops or short runs', compactWatch ? 'Both routes pay the same glow. Long loops give more firing time; shorter routes reveal hidden enemies or crack armour. Compare the towers covering each branch and choose for the incoming wave.' : guard ? 'Long loops give towers more firing time. Short routes mark Mopes with a gold ring: double glow when defeated, double light lost if they escape, wherever they finish. The bonus never stacks. The bridge reveals Veils; the mill cracks armour.' : 'Long loops give more firing time. Defeats on short runs pay double glow; any Mope that took one costs double light on escape. The bridge reveals Veils; the mill cracks shells.')}
        ${guard && !this.app.sim.isChallenge ? row('swap', 'Move between waves', 'Select a tower, open Manage, then Move. Choose an empty cleared pad to preview its reach and confirm for 25 glow. Upgrades and progress stay with it. Cancel is free.') : ''}
        ${row('sparkle', 'Combine your towers', 'Moonbell slows groups for Cracker bursts. Lamp Owl reveals hidden targets for nearby attackers. Select a tower to see shared coverage. Matching a Mope’s colour and symbol also deals 1.5× damage.')}
        ${!guard ? row('star', 'Charms', 'Charms make a lock always send one kind of Mope the same way, whatever the arrow says. Open them from the Charms button, or press and hold a lock.') : ''}
        ${row('heart', 'Keep the lantern lit', 'Mopes that reach the Great Lantern dim it. When the light runs out, the night is lost.')}
        ${guard ? row('eye', 'Read the fight', 'An eye beneath a hidden enemy means it is revealed. Segmented coral armour and an icy slow ring show active defences and effects. Select a tower to see its contribution.') : ''}
        ${guard ? row('restart', 'Revise your defence', 'On Relaxed and Standard, a lost ordinary night can return to its last planning break with the same resources. Challenges and Nightfall have no retries. Your main canal and challenge save separately.') : ''}
        ${guard && !compactWatch ? row('waves', 'Water Gardens', 'After Harbour, two garden streams meet above your established defence. Whole map shows the complete route; tap a district to inspect it. Guardians can change at chapter victories without rebuilding.') : ''}
        ${compactWatch ? row('star', 'Refine and replay', 'Tier-three towers can buy Mastery after wave 15 and Ascendant after wave 25. Clear three plots to unlock Tide Keeper, buy a tier-three upgrade for Ember Keeper, or cheer 1,200 Mopes for Reed Keeper. Choose earned guardians in Collection for your next watch.') : ''}
        ${guard && !compactWatch ? row('waves', 'Lantern Harbour', 'After wave 25, open eight more authored waves upstream while keeping your towers. Switch between Harbour and Canal views to inspect both parts. New Skiffs accelerate after losing armour.') : ''}
        ${row('pause', 'Pause to plan', `Pause any time to build and upgrade. On Nightfall, live route changes require time to run. Keys: 1–6 towers, Q/E quick switches, Space starts a wave, P pauses, F changes speed.${guard ? '' : ' C opens charms.'}`)}
      </div>`
    } else if (tab === 'keepers') {
      body = `<div class="journal">${TOWER_ORDER.map((id: TowerId) => {
        const d = TOWERS[id]
        return `<div class="j-row"><img src="${towerIcon(id)}" alt="" width="44" height="44"><div><b><img class="sw" src="${glyphBadgeURL(d.family)}" alt="${d.family} family" width="16" height="16">${d.name} <span class="j-cost">${d.cost}</span></b><span>${KEEPER_HELP[id]} ${this.app.sim.keeperWave(id) > 1 ? `Joins before wave ${this.app.sim.keeperWave(id)} in a new night.` : 'Available from the start.'} Paths: ${d.paths[0].name} or ${d.paths[1].name}.</span></div></div>`
      }).join('')}</div>`
    } else {
      const ids: EnemyId[] = JOURNAL_ORDER
      body = `<div class="journal">${ids
        .map((id) => {
          const e = ENEMIES[id]
          return `<div class="j-row"><img src="${enemyIcon(id)}" alt="" width="44" height="44"><div><b><img class="sw" src="${glyphBadgeURL(e.family)}" alt="${e.family} family" width="16" height="16">${e.name}</b><span>${e.tip}</span></div></div>`
        })
        .join('')}</div>`
    }
    const tabBtn = (t: string, label: string) => `<button role="tab" aria-selected="${t === tab}" data-tab="${t}">${label}</button>`
    this.show(
      `<div class="card">
        <h2>How to play</h2>
        <div class="tabs" role="tablist">${tabBtn('basics', 'Basics')}${tabBtn('keepers', 'Keepers')}${tabBtn('mopes', 'Mopes')}</div>
        <div class="j-scroll" role="tabpanel">${body}</div>
        <div class="stack gap-top"><button class="big-btn primary" data-act="done">Got it</button></div>
      </div>`,
      () => this.journal(tab),
      `[data-tab="${tab}"]`,
    )
    this.on('[data-tab]', (b) => {
      this.stack.pop()
      this.returnKeys.pop()
      this.journal(b.dataset.tab as 'basics' | 'keepers' | 'mopes')
    })
    this.on('[data-act="done"]', () => this.back())
  }

  feats() {
    const prog = loadProgress()
    this.show(
      `<div class="card">
        <h2>Feats</h2>
        <p>Different ways to win the same night. Each one asks for a new strategy.</p>
        <div class="feats">${FEATS.map((f) => `<div class="feat ${prog.feats[f.id] ? 'done' : ''}">${icon('star')}<div><b>${f.name}</b> <span>${f.desc}</span></div><span class="sr-only">${prog.feats[f.id] ? 'Earned' : 'Not earned yet'}</span></div>`).join('')}</div>
        <div class="stack"><button class="big-btn primary" data-act="done">Back</button></div>
      </div>`,
      () => this.feats(),
    )
    this.on('[data-act="done"]', () => this.back())
  }

  // ------------------------------------------------------------------ end of run

  end(won: boolean, fresh: string[], freeplay = false) {
    const app = this.app
    const sim = app.sim
    const st = sim.stats
    const offer = app.offer()
    const record = app.lastResult?.challenge ?? null
    const active = (st as unknown as { activeTime?: number }).activeTime ?? st.time
    const mins = Math.floor(active / 60)
    const secs = Math.round(active % 60)
    let tip = ''
    const leaks = Object.entries(st.leaksBy).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    if (leaks.length && !won) {
      const [worst, amount] = leaks[0] as [EnemyId, number]
      const routes = Object.entries(st.leakRoutes).sort((a, b) => b[1] - a[1])
      const route = routes.length ? describeRoute(routes[0][0]) : ''
      tip = `<div class="tip">${icon('lightning')}<div>Most light was lost to <b>${ENEMIES[worst].name}s</b> (${Math.min(amount, sim.maxLives)})${route ? ` coming along ${route}` : ''}. ${COUNTER_TIP[worst]}</div></div>`
    }
    if (!won && sim.lastLeak) tip = `<div class="tip">${icon('lightning')}<div>${leakAdvice(sim)}</div></div>`
    const unused = TOWER_ORDER.filter((id) => !st.towersUsed.includes(id) && sim.keeperAllowed(id))
    let next = ''
    if (unused.length) {
      const id = unused[0]
      next = `<div class="tip alt">${icon('sparkle')}<div>Try next: you never built a <b>${TOWERS[id].name}</b>. ${TOWERS[id].blurb}</div></div>`
    } else if (st.flips < 4 && !sim.challenge.guard) {
      next = `<div class="tip alt">${icon('swap')}<div>Try next: steer more. Short runs pay double glow, crack shells and reveal Veils. Sorting each group is worth a lot.</div></div>`
    } else if (sim.difficulty !== 'nightfall' && won && !offer) {
      next = `<div class="tip alt">${icon('moon')}<div>Try next: ${sim.difficulty === 'relaxed' ? 'Standard' : 'Nightfall'}. Tougher Mopes reward carefully upgraded tower combinations.</div></div>`
    }
    const featsHtml = fresh.length
      ? `<h3>New feats</h3><div class="feats">${fresh
          .map((id) => FEATS.find((f) => f.id === id)!)
          .map((f) => `<div class="feat done new">${icon('star')}<div><b>${f.name}</b> <span>${f.desc}</span></div></div>`)
          .join('')}</div>`
      : ''
    const progress = loadProgress()
    const challenges = loadChallenges()
    const goal = ['reed', 'lily', 'moss', 'moon', 'pearl'].map(id => BLOOM_SETS.find(b => b.id === id)!).find(b => !b.earned(progress, challenges))
    const goalText = goal?.id === 'moss' ? `${Math.max(0, 5000 - journalTotal(progress)).toLocaleString('en')} more Mopes to cheer across your nights.` : goal?.unlock
    const bloomGoal = goal ? `<section class="bloom-goal"><h3>Next bloom set: ${goal.name}</h3><p>${goalText}</p><button class="pill-btn" data-act="blooms">View your bloom collection</button></section>`
      : '<section class="bloom-goal"><h3>All bloom sets earned</h3><p>Try a daily tide or a different tower combination.</p><button class="pill-btn" data-act="collection">View collection</button></section>'
    // the wave the lantern went out on was not held
    const extra = Math.max(0, sim.wave - (sim.freeplayFrom || sim.finalWave) - (sim.over === 'lost' ? 1 : 0))
    const held = Math.max(0, sim.wave - sim.waveOffset - (sim.over === 'lost' ? 1 : 0))
    let heading: string
    let body: string
    if (offer) {
      const daily = offer.kind === 'daily'
      heading = won ? (daily ? 'The tide is kept' : `Dawn: ${offer.name} kept`) : 'The lantern went out'
      body = won
        ? `${offer.name}, ${offer.when}. You kept ${sim.lives} of ${sim.maxLives} light.`
        : `${offer.name}, ${offer.when}. You held ${held} of ${FINAL_WAVE - sim.waveOffset} ${daily ? 'tide waves' : 'waves'}.`
      if (record) body += record.improved ? (record.best.tries > 1 ? ' A new best.' : '') : ` Your best: ${resultLine(record.best).toLowerCase()}.`
    } else {
      heading = freeplay ? 'The long night ends' : won ? (sim.challenge.gardens ? 'Water Gardens is in bloom' : sim.challenge.harbour ? 'Lantern Harbour is safe' : 'Dawn: the lantern burns bright') : 'The lantern went out'
      body = freeplay
        ? `After winning ${DIFFICULTY[sim.difficulty].name}, you held ${extra} extra ${extra === 1 ? 'wave' : 'waves'} of free play.`
        : won
          ? `You kept the light through all ${sim.finalWave} waves on ${sim.level.def.name}, ${DIFFICULTY[sim.difficulty].name}. Your defence is saved.`
          : `You held until wave ${sim.wave} on ${sim.level.def.name}, ${DIFFICULTY[sim.difficulty].name}.`
    }
    const guardianChoice = sim.guardianBreak ? `<details class="guardian-break"><summary>Guardian: ${GUARDIANS[sim.challenge.guardian ?? 'lantern'].name} · change</summary><p>Keep every tower, upgrade and glow. Changes apply when you continue.</p><div class="stack">${(Object.keys(GUARDIANS) as GuardianId[]).map(id => {
      const g = GUARDIANS[id]
      const previous = GUARDIANS[sim.challenge.guardian ?? 'lantern'].tower
      const affected = id === (sim.challenge.guardian ?? 'lantern') ? 0 : sim.towers.filter(t => t.id === g.tower || t.id === previous).length
      return `<button class="big-btn" data-chapter-guardian="${id}" aria-pressed="${(sim.challenge.guardian ?? 'lantern') === id}" ${guardianUnlocked(id, progress.feats) && (id !== 'tide' || sim.challenge.compact) ? '' : 'disabled'}>${g.name}<small>${g.description}<br>${guardianUnlocked(id, progress.feats) ? affected + ' existing towers affected · free to change' : g.unlock}</small></button>`
    }).join('')}</div></details>` : ''
    const buttons = offer
      ? `${record ? `<button class="big-btn ${won ? 'primary' : ''}" data-act="share">${icon('share')} Share result</button>` : ''}
          <div class="row-btns flush">
            <button class="big-btn ${won ? '' : 'primary'}" data-act="again">${icon('restart')} Try again</button>
            <button class="big-btn" data-act="title">${icon('house')} Title</button>
          </div>`
      : `${won && !freeplay && sim.challenge.guard && sim.challenge.expanding && !sim.challenge.harbour ? `<button class="big-btn primary" data-act="harbour">Open Lantern Harbour<small>8 new waves · keep your towers and glow</small></button>` : ''}
          ${won && !freeplay && sim.challenge.harbour && !sim.challenge.gardens ? '<button class="big-btn primary" data-act="gardens">Open Water Gardens<small>6 new waves · two streams meet · keep your defence</small></button>' : ''}
          ${!won && canRetry(sim) && loadCheckpoint() ? `<button class="big-btn primary" data-act="retry">Revise from wave ${loadCheckpoint()!.snapshot.wave + 1}<small>Restore your last planning break</small></button>` : ''}
          ${won && !freeplay ? `<button class="big-btn" data-act="free">${icon('fastForward')} Keep going in free play</button>` : ''}
          <div class="row-btns flush">
            <button class="big-btn ${won && !freeplay ? '' : 'primary'}" data-act="again">${icon('restart')} Play again</button>
            <button class="big-btn" data-act="title">${icon('house')} Title</button>
          </div>`
    this.show(
      `<div class="card">
        <h2 class="${won ? 'won' : ''}">${heading}</h2>
        <p>${body}</p>
        <div class="stack">${buttons}</div>
        ${guardianChoice}
        <div class="stats">
          <div><b>${st.pops}</b><span>Mopes cheered up</span></div>
          <div><b>${sim.lives}/${sim.maxLives}</b><span>Light left</span></div>
          <div><b>${st.flips}</b><span>Lock flips</span></div>
          <div><b>${st.built}</b><span>Keepers built</span></div>
          <div><b>${st.glowEarned}</b><span>Glow earned</span></div>
          <div><b>${mins}:${String(secs).padStart(2, '0')}</b><span>Night length</span></div>
        </div>
        ${tip}${next}${bloomGoal}${featsHtml}
        <h3>Tonight's canal</h3>
        <figure class="postcard">
          <div class="pc-frame" role="img" aria-label="A picture of the canal as the night ended: the banks in bloom, your keepers and the Great Lantern."></div>
          <button class="big-btn" data-act="postcard" disabled>${icon('image')} Share picture</button>
        </figure>
      </div>`,
      () => this.end(won, fresh, freeplay),
    )
    this.on('[data-act="free"]', () => app.continueFreeplay())
    this.on('[data-act="harbour"]', () => app.continueHarbour())
    this.on('[data-act="gardens"]', () => app.continueGardens())
    this.on('[data-chapter-guardian]', b => {
      if (!app.chooseGuardian(b.dataset.chapterGuardian as GuardianId)) return
      this.el.querySelectorAll<HTMLButtonElement>('[data-chapter-guardian]').forEach(button => {
        const id = button.dataset.chapterGuardian as GuardianId, g = GUARDIANS[id]
        const current = GUARDIANS[sim.challenge.guardian ?? 'lantern'].tower
        const affected = id === (sim.challenge.guardian ?? 'lantern') ? 0 : sim.towers.filter(t => t.id === g.tower || t.id === current).length
        button.setAttribute('aria-pressed', String(id === b.dataset.chapterGuardian))
        button.querySelector('small')!.innerHTML = g.description + '<br>' + (guardianUnlocked(id, progress.feats) ? affected + ' existing towers affected · free to change' : g.unlock)
      })
      this.el.querySelector('.guardian-break summary')!.textContent = `Guardian: ${GUARDIANS[sim.challenge.guardian ?? 'lantern'].name} · change`
    })
    this.on('[data-act="retry"]', () => app.retryPlanning())
    this.on('[data-act="again"]', () => app.restart())
    this.on('[data-act="title"]', () => app.quitToTitle())
    this.on('[data-act="blooms"]', () => this.bloomJournal('sets'))
    this.on('[data-act="collection"]', () => this.collection())
    this.el.querySelector<HTMLElement>('[data-act="share"]')?.addEventListener('click', async (e) => {
      sound.tap()
      // share this attempt (the Tides screen shares the best one)
      if (!offer || !record) return
      const run: ChallengeResult = { ...record.best, won, light: sim.lives, held, flips: st.flips }
      flashOutcome(e.currentTarget as HTMLElement, await shareText(challengeShareText(offer, run)))
    })
    this.fillPostcard(won, offer)
  }

  /** Paints the night's postcard into the end card once the card is up (it takes a moment), then enables sharing it. */
  private fillPostcard(won: boolean, offer: ChallengeOffer | null) {
    const frame = this.el.querySelector<HTMLElement>('.pc-frame')
    const btn = this.el.querySelector<HTMLButtonElement>('[data-act="postcard"]')
    if (!frame || !btn) return
    const sim = this.app.sim
    const mode = DIFFICULTY[sim.difficulty].name
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const text = {
      won,
      title: offer ? (won ? `${offer.name}: kept` : `${offer.name}`) : won ? `Dawn on ${sim.level.def.name}` : `A long night on ${sim.level.def.name}`,
      line1: won ? `${sim.lives} of ${sim.maxLives} light kept, ${sim.stats.flips} lock flips` : `Held until ${sim.challenge.tide ? 'tide wave' : 'wave'} ${Math.max(1, this.app.shownWave())}, ${sim.stats.flips} lock flips`,
      line2: `${sim.stats.pops.toLocaleString('en')} Mopes cheered up on ${offer ? offerSummary(offer).toLowerCase() : mode}`,
      footer: offer ? cap(offer.when) : date,
    }
    const paint = () => {
      if (!frame.isConnected) return
      let cv: HTMLCanvasElement
      try {
        cv = this.app.renderer.postcard(sim, text)
      } catch {
        frame.closest('figure')?.remove()
        return
      }
      cv.className = 'pc-img'
      frame.appendChild(cv)
      btn.disabled = false
      btn.addEventListener('click', async () => {
        sound.tap()
        flashOutcome(btn, await shareImage(cv, `lantern-guard-${dayKey(new Date())}.png`, `A night on ${sim.level.def.name} in Lantern Guard: Tower Defense`))
      })
    }
    // the canvas text needs the game font; wait for it, then paint off the card's first frame
    const ready = document.fonts?.ready ?? Promise.resolve()
    ready.then(() => setTimeout(paint, 60))
  }

    // ------------------------------------------------------------------ title key art

  /** A small living scene on the title card: Mopes drift toward a lock that keeps choosing a channel. */
  private runKeyArt(cv: HTMLCanvasElement | null) {
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = 400
    const H = 150
    const size = () => {
      const w = cv.clientWidth || 360
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(((w * H) / W) * dpr)
    }
    size()
    const still = this.app.reduceMotion
    const t0 = performance.now()
    const frame = (now: number) => {
      const t = still ? 2.2 : (now - t0) / 1000
      if (cv.width !== Math.round((cv.clientWidth || 360) * dpr)) size()
      ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0)
      drawKeyArt(ctx, W, H, t)
      if (!still && this.el.contains(cv)) this.artRaf = requestAnimationFrame(frame)
    }
    this.artRaf = requestAnimationFrame(frame)
  }
}

function drawKeyArt(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#0c1f27')
  sky.addColorStop(1, '#0a171d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  // canal: a trunk that forks at the lock
  const lockX = 250
  const lockY = 80
  const lanes: [number, number][][] = [
    [
      [-20, 88],
      [120, 82],
      [lockX, lockY],
    ],
    [
      [lockX, lockY],
      [320, 40],
      [420, 30],
    ],
    [
      [lockX, lockY],
      [320, 118],
      [420, 132],
    ],
  ]
  const stroke = (pts: [number, number][], w: number, c: string) => {
    ctx.strokeStyle = c
    ctx.lineWidth = w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1])
    ctx.stroke()
  }
  for (const l of lanes) stroke(l, 44, '#2a3e46')
  for (const l of lanes) stroke(l, 32, '#135560')
  const open = Math.floor(t / 2.4) % 2
  ctx.setLineDash([10, 18])
  ctx.lineDashOffset = -t * 40
  stroke(lanes[0], 4, 'rgba(127,232,220,0.55)')
  stroke(lanes[1 + open], 4, 'rgba(127,232,220,0.55)')
  ctx.setLineDash([])
  // the Great Lantern glow at the right
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.05
  ctx.drawImage(glowSprite(P.amber, 64), 300, -40, 180, 180)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  // keepers on the banks
  ctx.save()
  ctx.translate(96, 58)
  ctx.scale(0.62, 0.62)
  drawTower(ctx, 0, 0, { id: 'wick', a: 2, b: 0, angle: 0.3, since: (t % 0.6) * 1, age: 9, upAge: 9, t, seed: 3 })
  ctx.restore()
  ctx.save()
  ctx.translate(318, 148)
  ctx.scale(0.55, 0.55)
  drawTower(ctx, 0, 0, { id: 'beam', a: 1, b: 0, angle: -2.4, since: 9, age: 9, upAge: 9, t, seed: 5 })
  ctx.restore()
  // Mopes drift toward the lock
  const types: EnemyId[] = ['drip', 'shell', 'veil', 'skitter']
  types.forEach((id, i) => {
    const k = ((t * 0.12 + i * 0.25) % 1) * 1.15 - 0.1
    const x = -20 + k * (lockX + 20)
    const y = 88 - k * 8 + Math.sin(t * 3 + i) * 2
    drawEnemyIcon(ctx, id, x, y, id === 'shell' ? 11 : 9.5)
  })
  // the lock dial with its arrow
  ctx.fillStyle = '#16262d'
  ctx.beginPath()
  ctx.arc(lockX, lockY - 20, 17, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = P.amber
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.save()
  ctx.translate(lockX, lockY - 20)
  ctx.rotate(open ? 0.55 : -0.55)
  ctx.fillStyle = P.amberHi
  ctx.beginPath()
  ctx.moveTo(11, 0)
  ctx.lineTo(1, -8)
  ctx.lineTo(1, -3)
  ctx.lineTo(-9, -3)
  ctx.lineTo(-9, 3)
  ctx.lineTo(1, 3)
  ctx.lineTo(1, 8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // fireflies
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 10; i++) {
    const x = (i * 47 + t * 8) % W
    const y = (i * 29 + Math.sin(t + i) * 10 + H) % H
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 2 + i)
    ctx.drawImage(glowSprite(P.amberHi, 32), x - 6, y - 6, 12, 12)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function describeRoute(code: string): string {
  if (code === 'direct') return ''
  const parts: string[] = []
  for (let i = 0; i < code.length; i += 2) {
    const g = LEVEL.gates.find((q) => q.id[0] === code[i])
    if (!g) continue
    parts.push(`the ${g.labels[Number(code[i + 1])]}`)
  }
  return parts.join(' then ')
}

function drawLogo(c: HTMLCanvasElement | null) {
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const s = c.width / 64
  ctx.scale(s, s)
  const g = ctx.createRadialGradient(32, 34, 2, 32, 34, 30)
  g.addColorStop(0, 'rgba(255,181,71,0.45)')
  g.addColorStop(1, 'rgba(255,181,71,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#3a2618'
  ctx.beginPath()
  ctx.roundRect(22, 9, 20, 5, 2)
  ctx.roundRect(22, 52, 20, 5, 2)
  ctx.fill()
  const lg = ctx.createRadialGradient(28, 28, 2, 32, 33, 20)
  lg.addColorStop(0, '#fff2cc')
  lg.addColorStop(0.5, '#ffb547')
  lg.addColorStop(1, '#a4561c')
  ctx.fillStyle = lg
  ctx.beginPath()
  ctx.ellipse(32, 33, 15, 19, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(90,40,10,0.5)'
  ctx.lineWidth = 1
  for (const w of [4, 9]) {
    ctx.beginPath()
    ctx.ellipse(32, 33, w, 19, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
}
