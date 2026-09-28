import { drawSettlement } from './settlement'
import { platformHaptic } from '../core/platform'
import { spring, TAU, vrand } from '../core/math'
import { sound } from '../core/audio'
import type { CharmTrait, EnemyId, TowerId } from '../game/defs'
import { WORLD_H, WORLD_W, type Segment } from '../game/level'
import type { Enemy, GateState, Proj, Sim, SimEvent, Tower } from '../game/sim'
import { routeCoverage, towerPartners } from '../game/route-plan'
import { CANAL_STAGES } from '../game/canal-growth'
import { wardenEscorts } from '../game/harbour'
import { BANK_W, BG_PAD_X, BG_PAD_Y, bridgeGeo, CANAL_W, layoutDecor, millGeo, renderBackground, type BridgeGeo, type Decor, type MillGeo } from './bg'
import { BLOOM_FAMS, bloomColor, clearBloomColors, famIndex, paintBloom, type BloomStyle } from './blooms'
import { drawEnemy, drawEnemyIcon, ENEMY_VIS, setEnemySpriteScale } from './enemies'
import { Fx } from './fx'
import { FAMILY_COLOR, glowSprite, P, withAlpha } from './palette'
import { drawPad, drawTower, PAD_R } from './towers'

export type Selection =
  | { kind: 'pad'; index: number }
  | { kind: 'tower'; tower: Tower }
  | { kind: 'gate'; gate: GateState }
  | null

export type MapZone = 'canal' | 'harbour' | 'gardens' | 'overview'

export interface ViewState {
  moving?: { tower: Tower; destination: number | null; fromZone: MapZone }
  feedbackRoute?: string
  routeDir?: 0 | 1
  upgradeRange?: number
  selection: Selection
  /** Tower type being previewed on the selected pad (or armed from the tray). */
  preview: TowerId | null
  armed: TowerId | null
  hint: { x: number; y: number; label?: string } | null
  paused: boolean
  /** Keyboard focus on the map: a pad or lock the player is pointing at with the arrow keys. */
  cursor?: { x: number; y: number; r: number } | null
}

/** The words on a night postcard. */
export interface PostcardText {
  won: boolean
  title: string
  line1: string
  line2: string
  /** Bottom-left small print, e.g. the date. */
  footer: string
}

export interface RenderSettings {
  calmFx: boolean
  reduceMotion: boolean
  shake: boolean
}

const FONT = '"Fredoka Variable", Fredoka, ui-rounded, system-ui, sans-serif'
/** Smallest on-screen size for any canvas text, in CSS px (raised by the Larger text setting). */
const MIN_TEXT_PX = 13
const MIN_TEXT_PX_BIG = 16

const CHARM_ICON: Record<CharmTrait, EnemyId> = { shell: 'shell', veil: 'veil', swift: 'skitter', heavy: 'bloat' }

/** How far ahead of a gate the incoming queue looks, in world units. */
const QUEUE_HORIZON = 340

interface GateGeo {
  angles: [number, number]
  mouths: [{ x: number; y: number; tx: number; ty: number }, { x: number; y: number; tx: number; ty: number }]
  arrow: number
  arrowVel: number
  barrier: [number, number]
}

// ---------------------------------------------------------------- blooms

/** Blooms per ~60-unit stretch of bank before new ones grow an existing bloom into a bush. */
const BLOOM_CELL = 60
const BLOOM_CAP = 5
const BLOOM_MAX = 1400
const BUSH_MAX = 12
/** Save format version for exportBlooms. */
const BLOOM_V = 1

interface Bloom {
  x: number
  y: number
  /** index into BLOOM_FAMS */
  fam: number
  size: number
  rot: number
  /** 0-2 flower shapes, 3 bush */
  kind: number
}

/** Rotation derived from position, so saved blooms repaint identically. */
const bloomRot = (x: number, y: number) => (((x * 73 + y * 151) % 628) + 628) % 628 / 100
const cellKey = (x: number, y: number) => Math.floor(x / BLOOM_CELL) * 1000 + Math.floor(y / BLOOM_CELL)

const FIREWORK_COLS = [P.coral, P.amberHi, P.ice, P.lime, P.lilac, P.gold, P.pink]

export class Renderer {
  zone: MapZone = 'canal'
  settlement = 0
  bunting = false
  private comboUntil = 0
  setHarbourView(on: boolean) { this.setZone(on ? 'harbour' : 'canal') }
  setZone(zone: MapZone) {
    this.zone = zone
    if (this.w && this.h) this.resize(this.w, this.h, this.dpr)
  }
  cv: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr = 1
  w = 1
  h = 1
  scale = 1
  ox = 0
  oy = 0
  fx = new Fx()
  time = 0
  settings: RenderSettings = { calmFx: false, reduceMotion: false, shake: true }
  /** The bloom set the banks flower in. */
  private bloomStyle: BloomStyle = 'wild'
  private minText = MIN_TEXT_PX
  glowTarget: () => { x: number; y: number } = () => ({ x: WORLD_W / 2, y: -40 })
  onGlowArrive: () => void = () => {}
  onLightChange: () => void = () => {}
  private bg: HTMLCanvasElement | null = null
  private bloomCv: HTMLCanvasElement | null = null
  private bloomCtx: CanvasRenderingContext2D | null = null
  private blooms: Bloom[] = []
  private bloomGrid = new Map<number, Bloom[]>()
  /** Mopes cheered into blooms this run (merged bushes included). */
  private bloomTotal = 0
  private bgKey = ''
  private decor: Decor[]
  private gateGeo = new Map<string, GateGeo>()
  private routeKey = ''
  private routePlan: ReturnType<typeof routeCoverage> | null = null
  private partnerKey = ''
  private partners: Tower[] = []
  private newPads: number[] = []
  private revealUntil = 0
  private flowAlpha = new Map<string, number>()
  private lanternPulse = 0
  private leakFlash = 0
  private leakStack = 0
  private fireflyBudget = 0
  private bornAt = new WeakMap<Tower, number>()
  private upAt = new WeakMap<Tower, { upT: number; at: number }>()
  private richTextBudget = 4
  private levelBuilt: Sim['level'] | null = null
  private mill: MillGeo | null = null
  private bridge: BridgeGeo | null = null
  private badgeSpots = new Map<string, { x: number; y: number }>()
  /** Seconds since victory (-1 = none). */
  private victoryT = -1
  private fireworkT = 0

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv
    this.ctx = cv.getContext('2d', { alpha: false })!
    this.decor = []
  }

  attach(sim: Sim, preserveBlooms = false) {
    if (!sim.challenge.harbour) this.zone = 'canal'
    this.routeKey = ''
    this.partnerKey = ''
    this.newPads = preserveBlooms && sim.challenge.gardens ? [22, 23, 24, 25] : preserveBlooms && sim.challenge.harbour ? [18, 19, 20, 21] : preserveBlooms && sim.challenge.expanding && sim.canalStage > 0
      ? CANAL_STAGES[sim.canalStage].pads.filter(p => !(CANAL_STAGES[sim.canalStage - 1].pads as readonly number[]).includes(p)) : []
    this.revealUntil = this.time + 5
    if (this.levelBuilt !== sim.level) {
      this.levelBuilt = sim.level
      this.decor = layoutDecor(sim.level)
      this.bgKey = ''
      this.mill = null
      this.bridge = null
      this.badgeSpots.clear()
      for (const seg of sim.level.segs.values()) {
        if (seg.feature?.kind === 'crack') this.mill = millGeo(seg)
        if (seg.feature?.kind === 'reveal') this.bridge = bridgeGeo(seg)
      }
    }
    if (!preserveBlooms) this.clearBlooms()
    this.fx.list.length = 0
    this.victoryT = -1
    this.leakStack = 0
    this.gateGeo.clear()
    for (const g of sim.gates) {
      if (!sim.gateAvailable(g)) continue
      const pos = { x: 0, y: 0, tx: 0, ty: 0 }
      const mouths = g.def.outs.map((id) => {
        const l = sim.level.segs.get(id)!.line
        l.at(46, pos)
        return { ...pos }
      }) as GateGeo['mouths']
      const angles = mouths.map((m) => Math.atan2(m.y - g.def.y, m.x - g.def.x)) as [number, number]
      const dir = sim.gateEffectiveDir(g)
      this.gateGeo.set(g.def.id, { angles, mouths, arrow: angles[dir], arrowVel: 0, barrier: [dir === 0 ? 0 : 1, dir === 1 ? 0 : 1] })
    }
    if (this.w && this.h) this.resize(this.w, this.h, this.dpr)
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w
    this.h = h
    this.dpr = dpr
    this.cv.width = Math.round(w * dpr)
    this.cv.height = Math.round(h * dpr)
    this.cv.style.width = w + 'px'
    this.cv.style.height = h + 'px'
    // keepers on the top pads reach ~80 units above them: keep that headroom on screen
    const top = this.levelBuilt?.segs.has('garden-merge') ? -1020 : -475
    const bounds = this.zone === 'overview' ? { x: -20, y: top, w: 760, h: WORLD_H + 30 - top }
      : this.zone === 'gardens' ? { x: 0, y: -1020, w: 720, h: 750 }
      : this.zone === 'harbour' ? { x: 0, y: -475, w: 720, h: 830 } : this.levelBuilt?.def.bounds ?? { x: 0, y: -36, w: WORLD_W, h: WORLD_H + 36 }
    const mapTop = this.zone === 'gardens' || this.zone === 'overview' ? 52 : 0
    this.scale = Math.min(w / bounds.w, Math.max(1, h - mapTop) / bounds.h)
    this.ox = (w - bounds.w * this.scale) / 2 - bounds.x * this.scale
    this.oy = mapTop + (h - mapTop - bounds.h * this.scale) / 2 - bounds.y * this.scale
    this.fx.textScale = Math.max(1, Math.min(1.9, 0.62 / this.scale))
    this.fx.minText = this.minText / this.scale
    setEnemySpriteScale(this.scale * dpr)
    this.bgKey = ''
  }

  toWorld(cx: number, cy: number) {
    return { x: (cx - this.ox) / this.scale, y: (cy - this.oy) / this.scale }
  }

  toScreen(wx: number, wy: number) {
    return { x: wx * this.scale + this.ox, y: wy * this.scale + this.oy }
  }

  /** World font size for a label: its design size, floored so it never renders under 13 CSS px. */
  fontPx(worldSize: number) {
    return Math.max(worldSize, this.minText / this.scale)
  }

  /** Larger text: raises the floor for every label and floater drawn on the map. */
  setBigText(on: boolean) {
    this.minText = on ? MIN_TEXT_PX_BIG : MIN_TEXT_PX
    this.fx.minText = this.minText / this.scale
    this.fx.textScale = Math.max(on ? 1.2 : 1, Math.min(1.9, 0.62 / this.scale))
  }

  /** Switches the bloom set and repaints the banks in it. */
  setBloomStyle(style: BloomStyle) {
    if (style === this.bloomStyle) return
    this.bloomStyle = style
    this.repaintBlooms()
  }

  /** The palette changed: rebuild the background and bloom layers in the new colours. */
  refreshArt() {
    clearBloomColors()
    this.bgKey = ''
  }

  private repaintBlooms() {
    if (!this.bloomCtx) return
    this.bloomCtx.clearRect(0, 0, WORLD_W, WORLD_H)
    for (const b of this.blooms) paintBloom(this.bloomCtx, b, this.bloomStyle, true)
  }

  private ensureLayers() {
    const s = this.scale * this.dpr
    const key = s.toFixed(4)
    if (this.bgKey === key && this.bg && this.bloomCv) return
    this.bgKey = key
    this.bg = renderBackground(this.levelBuilt!, this.decor, s)
    this.bloomCv = document.createElement('canvas')
    this.bloomCv.width = Math.ceil(WORLD_W * s)
    this.bloomCv.height = Math.ceil(WORLD_H * s)
    this.bloomCtx = this.bloomCv.getContext('2d')!
    this.bloomCtx.scale(s, s)
    for (const b of this.blooms) paintBloom(this.bloomCtx, b, this.bloomStyle, true)
  }

  /** Glow counter position, pulled onto the canvas: off-canvas targets land on the top edge at their x. */
  private fireflyTarget() {
    const t = this.glowTarget()
    const left = -this.ox / this.scale + 10
    const right = (this.w - this.ox) / this.scale - 10
    const top = -this.oy / this.scale + 6
    const bottom = (this.h - this.oy) / this.scale - 6
    const x = Math.min(right, Math.max(left, t.x))
    return { x, y: t.y > bottom ? bottom : Math.max(top, t.y) }
  }

  private firefly(x: number, y: number, vx: number, vy: number) {
    const tgt = this.fireflyTarget()
    this.fx.add({ kind: 'firefly', x, y, vx, vy, life: 2.4, tx: tgt.x, ty: tgt.y, onArrive: () => this.onGlowArrive() })
  }

  // ------------------------------------------------------------------ events -> feedback

  handleEvents(sim: Sim) {
    const fx = this.fx
    const calm = this.settings.calmFx
    fx.density = calm ? 0.5 : 1
    let pops = 0
    for (const ev of sim.events) {
      switch (ev.t) {
        case 'pop': {
          pops++
          const col = FAMILY_COLOR[ev.family] ?? P.amber
          const big = ev.boss ? 3 : ev.size >= 18 ? 1.6 : 1
          const crowd = sim.enemies.length > 60
          const ring = !calm || pops < 4
          const x = ev.x
          const y = ev.y
          fx.flash(x, y, 22 * big, col, 0.2)
          sound.pop(big)
          this.addBloom(ev)
          // fireflies fly to the glow counter; budgeted so swarms stay readable
          this.fireflyBudget = Math.min(this.fireflyBudget + 1, 12)
          const fly = this.fireflyBudget >= (crowd ? 3 : 1)
          if (fly) this.fireflyBudget = 0
          const petals = ev.boss ? 14 : big > 1 ? 6 : crowd ? 4 : 5
          const burst = () => {
            fx.petals(x, y, col, petals, 4.2 * Math.min(2, big), 95 * Math.min(2.4, big))
            fx.burst(x, y, col, (calm ? 2 : 4) * big, 120 * big, 2.6, 0.4)
            if (ring) fx.ring(x, y, 18 * big, withAlpha(col, 0.8), 0.35, 2)
            if (fly) this.firefly(x, y, vrand(-90, 90), vrand(-160, -60))
            if (ev.boss) {
              this.addShake(1)
              fx.ring(x, y, 160, P.pale, 1, 6)
              fx.burst(x, y, P.pale, 60, 420, 5, 1.2)
              fx.burst(x, y, P.amber, 40, 300, 4, 1.4)
            }
          }
          // the cheered-up beat: a happy Mope for a moment, then it bursts into petals
          if (ev.boss || !crowd || pops <= 6) fx.cheer(x, y, ev.enemy, ev.boss ? 0.45 : 0.18, burst)
          else burst()
          if (ev.lured && this.richTextBudget >= 1) {
            this.richTextBudget--
            fx.text(x, y - 16, '+' + ev.reward, P.gold, 16, 0.8)
          }
          break
        }
        case 'crack':
          fx.shards(ev.x, ev.y, P.coral, calm ? 3 : 7)
          fx.flash(ev.x, ev.y, 30, P.coral, 0.2)
          sound.crack()
          break
        case 'clink':
          if (Math.random() < 0.5) fx.burst(ev.x, ev.y - 6, '#ffffff', 2, 90, 2, 0.2)
          sound.clink()
          break
        case 'hit':
          if (ev.kind === 'feather' || ev.kind === 'moth') {
            // a small soft puff where the feather or moth lands
            const c = ev.kind === 'feather' ? P.lime : P.gold
            fx.flash(ev.x, ev.y, 18, c, 0.2)
            fx.burst(ev.x, ev.y, c, calm ? 1 : 3, 90, 2.2, 0.3)
          } else if (!calm && Math.random() < 0.6) fx.burst(ev.x, ev.y, ev.hue, 2, 110, 2.5, 0.25)
          break
        case 'shoot':
          if (ev.tower === 'wick') sound.spark()
          else if (ev.tower === 'owl') sound.swoosh()
          else if (ev.tower === 'cracker') {
            sound.launch()
            fx.burst(ev.x + Math.cos(ev.angle) * 18, ev.y - 22 + Math.sin(ev.angle) * 18, P.amberHi, 4, 120, 2.5, 0.3)
          }
          break
        case 'boom': {
          const cols = [P.coral, P.amberHi, P.pink, P.ice]
          fx.flash(ev.x, ev.y, ev.r * 1.3, P.coral, 0.25)
          fx.ring(ev.x, ev.y, ev.r, withAlpha(P.amberHi, 0.9), 0.35, 3)
          for (const c of cols) fx.burst(ev.x, ev.y, c, calm ? 2 : 5, ev.r * 3.4, 3, 0.55)
          sound.boom(ev.big)
          break
        }
        case 'toll':
          // the toll's true area is centred on the keeper's pad; a small ring rings out at the bell mouth
          fx.ring(ev.x, ev.y, ev.r, withAlpha(P.ice, 0.85), 0.7, 4)
          if (ev.stun) fx.ring(ev.x, ev.y, ev.r * 0.8, '#ffffff', 0.5, 6)
          fx.ring(ev.x, ev.y - 36, 24, withAlpha(P.ice, 0.9), 0.35, 3)
          sound.bell(ev.tier, false)
          break
        case 'leak': {
          const h = this.levelBuilt!.def.home
          fx.ring(h.x, h.y, 120, withAlpha(P.danger, 0.9), 0.8, 5)
          // stack floaters so several leaks in a row stay readable
          fx.text(h.x, h.y - 80 - this.leakStack * this.fontPx(24) * 1.1, '-' + ev.weight + ' light', P.danger, 24, 1.3)
          this.leakStack = Math.min(this.leakStack + 1, 4)
          fx.inkSplat(h.x, h.y - 20, 10, 7, P.inkHi)
          this.leakFlash = 1
          this.addShake(0.35)
          sound.leak()
          haptic(40)
          this.onLightChange()
          break
        }
        case 'gate': {
          const g = sim.gates.find((q) => q.def.id === ev.gate)!
          fx.ring(g.def.x, g.def.y, 56, withAlpha(P.flow, 0.9), 0.45, 4)
          const geo = this.gateGeo.get(ev.gate)!
          const m = geo.mouths[ev.dir]
          fx.burst(m.x, m.y, P.flow, ev.auto ? 6 : 10, 160, 3, 0.45)
          sound.gate()
          // only the player's own flips buzz
          if (!ev.auto) haptic(12)
          break
        }
        case 'waveStart':
          sound.waveStart()
          break
        case 'waveEnd':
          sound.waveClear()
          fx.text(this.levelBuilt!.def.home.x, this.levelBuilt!.def.home.y - 120, `+${ev.bonus + ev.income} glow`, P.amberHi, 26, 1.8)
          fx.ring(this.levelBuilt!.def.home.x, this.levelBuilt!.def.home.y, 200, withAlpha(P.amberHi, 0.7), 1.2, 4)
          haptic(20)
          break
        case 'income':
          fx.text(ev.x, ev.y - 40, '+' + ev.amount, P.gold, 22, 1.4)
          fx.burst(ev.x, ev.y - 20, P.gold, 14, 160, 3, 0.8)
          sound.harvest()
          for (let i = 0; i < 4; i++) this.firefly(ev.x, ev.y - 20, vrand(-120, 120), vrand(-200, -80))
          break
        case 'spawn':
          if (ev.boss) {
            sound.bossRoar()
            this.addShake(0.6)
            fx.ring(ev.x, Math.max(20, ev.y), 140, withAlpha(P.pale, 0.7), 1.2, 6)
          }
          break
        case 'split':
          // Old Gloom splits in two at the lock: a flash and a ring, no roar
          fx.flash(ev.x, ev.y, 110, P.lilac, 0.5)
          fx.ring(ev.x, ev.y, 130, withAlpha(P.lilac, 0.9), 0.8, 6)
          fx.ring(ev.x, ev.y, 70, withAlpha(P.cream, 0.9), 0.5, 3)
          fx.burst(ev.x, ev.y, P.lilac, 28, 300, 4, 0.9)
          this.addShake(0.4)
          break
        case 'victory': {
          const h = this.levelBuilt!.def.home
          this.victoryT = 0
          this.fireworkT = 0.25
          fx.flash(h.x, h.y - 66, 300, P.amberHi, 1.4)
          fx.ring(h.x, h.y - 40, 300, withAlpha(P.amberHi, 0.9), 1.4, 8)
          fx.ring(h.x, h.y - 40, 180, withAlpha(P.cream, 0.8), 1, 4)
          fx.pillar(h.x, h.y - 20, P.amberHi, 560, 2.4)
          fx.burst(h.x, h.y - 66, P.amberHi, 40, 380, 4.5, 1.4)
          haptic(60)
          break
        }
        case 'unlock': {
          const g = sim.gates.find((q) => q.def.id === ev.gate)!
          fx.ring(g.def.x, g.def.y, 90, P.amberHi, 1, 5)
          fx.burst(g.def.x, g.def.y, P.amberHi, 24, 220, 3.5, 0.9)
          break
        }
        case 'source': {
          const seg = sim.level.segs.get('inlet')!
          const p = seg.line.at(60, { x: 0, y: 0, tx: 0, ty: 0 })
          fx.ring(p.x, p.y, 110, P.flow, 1.2, 6)
          fx.burst(p.x, p.y, P.flow, 30, 240, 4, 1)
          this.addShake(0.4)
          break
        }
        case 'dive':
          fx.add({ kind: 'ring', x: ev.tx, y: ev.ty, size: 40, life: 0.4, color: P.lime, lw: 5 })
          fx.flash(ev.tx, ev.ty, 50, P.lime, 0.3)
          for (let i = 0; i < 8; i++) {
            const k = i / 8
            fx.add({ kind: 'spark', x: ev.x + (ev.tx - ev.x) * k, y: ev.y - 34 + (ev.ty - ev.y + 34) * k, life: 0.3 + k * 0.2, size: 4, color: P.lime })
          }
          sound.swoosh()
          sound.crack()
          break
        case 'combo':
          fx.ring(ev.x, ev.y, 48, P.ice, .45, 3)
          if (this.time >= this.comboUntil) { fx.text(ev.x, ev.y - 42, 'Slow + splash', P.ice, 20, 1.1); this.comboUntil = this.time + 4 }
          break
        case 'bounce':
          for (let i = 0; i < 6; i++) { const k = i / 5; fx.add({ kind: 'spark', x: ev.x + (ev.tx - ev.x) * k, y: ev.y + (ev.ty - ev.y) * k, life: .23, size: 4, color: P.lime }) }
          break
        case 'phase':
          fx.flash(ev.x, ev.y, 120, P.pale, 0.6)
          fx.ring(ev.x, ev.y, 150, P.pale, 1, 6)
          this.addShake(0.7)
          sound.bossRoar()
          break
        case 'jam':
          if (ev.on) sound.deny()
          break
        case 'build':
          fx.ring(ev.x, ev.y, 46, P.amberHi, 0.5, 4)
          fx.burst(ev.x, ev.y, P.amberHi, 16, 180, 3, 0.6)
          fx.burst(ev.x, ev.y + 6, P.stoneHi, 6, 120, 3, 0.4)
          sound.build()
          haptic(15)
          break
        case 'upgrade': {
          // celebrate in the keeper's own hue; the tier-3 purchase gets a light pillar and a ring of dots
          const tw = sim.towers.find((q) => q.x === ev.x && q.y === ev.y)
          const hue = tw?.def.hue ?? P.amberHi
          const top = ev.tier >= 3
          fx.ring(ev.x, ev.y - 20, top ? 84 : 60, hue, 0.7, top ? 6 : 4)
          fx.flash(ev.x, ev.y - 24, top ? 90 : 48, hue, top ? 0.6 : 0.35)
          fx.burst(ev.x, ev.y - 20, hue, top ? 44 : 22, top ? 340 : 240, top ? 4.2 : 3.5, top ? 1.2 : 0.9)
          fx.burst(ev.x, ev.y - 20, P.cream, top ? 14 : 6, top ? 260 : 180, 2.6, 0.7)
          if (top) {
            fx.pillar(ev.x, ev.y + 4, hue, 340, 1.4)
            fx.orbit(ev.x, ev.y, 48, hue, 12, 1.6)
            fx.ring(ev.x, ev.y, 130, withAlpha(hue, 0.8), 1, 5)
            this.addShake(0.25)
          }
          sound.upgrade(ev.tier)
          haptic(top ? 45 : 20)
          break
        }
        case 'sell':
          fx.text(ev.x, ev.y - 30, '+' + ev.amount, P.amberHi, 22, 1.2)
          fx.burst(ev.x, ev.y, P.stoneHi, 14, 160, 3, 0.5)
          sound.sell()
          break
        case 'charm': {
          const g = sim.gates.find((q) => q.def.id === ev.gate)!
          fx.burst(g.def.x, g.def.y, P.gold, 20, 180, 3, 0.8)
          sound.harvest()
          break
        }
        case 'feature':
          if (ev.kind === 'reveal') {
            fx.ring(ev.x, ev.y, 34, P.lime, 0.5, 4)
            fx.burst(ev.x, ev.y, P.lime, 10, 140, 3, 0.5)
            sound.bell(9, true)
          } else {
            fx.ring(ev.x, ev.y, 40, P.coral, 0.45, 5)
            fx.burst(ev.x, ev.y, '#bfefff', 12, 180, 3, 0.5)
          }
          break
        case 'life':
          fx.text(this.levelBuilt!.def.home.x, this.levelBuilt!.def.home.y - 150, `+${ev.amount} light`, P.pale, 22, 1.5)
          this.onLightChange()
          break
      }
    }
    sim.events.length = 0
  }

  addShake(k: number) {
    if (!this.settings.shake || this.settings.reduceMotion) return
    this.fx.shake = Math.max(this.fx.shake, k)
  }

  // ------------------------------------------------------------------ blooms

  private addBloom(ev: Extract<SimEvent, { t: 'pop' }>) {
    this.bloomTotal++
    const fam = famIndex(ev.family)
    const size = ev.boss ? 11 : vrand(3.2, 5.2) * (ev.size > 17 ? 1.35 : 1)
    const first = Math.random() < 0.5 ? -1 : 1
    for (const side of [first, -first]) {
      // on the grass just past the stone lip, never on the water
      const off = CANAL_W / 2 + vrand(13, 24) + (ev.boss ? 8 : 0)
      const j = vrand(-8, 8)
      const x = ev.x - ev.ty * off * side + ev.tx * j
      const y = ev.y + ev.tx * off * side + ev.ty * j
      if (this.bloomBlocked(x, y)) continue
      this.placeBloom(x, y, fam, size)
      return
    }
  }

  /** True where a bloom would sit on water, a stone bank, a pad or a landmark. */
  private bloomBlocked(x: number, y: number) {
    if (x < 6 || y < (this.levelBuilt?.segs.has('garden-merge') ? -950 : this.levelBuilt?.segs.has('harbour') ? -450 : 6) || x > WORLD_W - 6 || y > WORLD_H - 6) return true
    const lvl = this.levelBuilt
    if (!lvl) return true
    for (const seg of lvl.segs.values()) if (seg.line.distanceTo(x, y) < BANK_W / 2 - 1) return true
    for (const p of this.levelBuilt!.def.pads) if (Math.abs(p.x - x) < PAD_R && Math.abs(p.y - y) < PAD_R * 0.7) return true
    const h = this.levelBuilt!.def.home
    if (Math.abs(h.x - x) < 96 && Math.abs(h.y - y) < 64) return true
    const m = this.mill
    if (m && Math.abs(m.hx - x) < 34 && y > m.hy - 44 && y < m.hy + 24) return true
    return false
  }

  /** Adds a bloom, or past the stretch's cap grows the nearest one into a small bush. */
  private placeBloom(x: number, y: number, fam: number, size: number) {
    x = Math.round(x)
    y = Math.round(y)
    const key = cellKey(x, y)
    let cell = this.bloomGrid.get(key)
    if (!cell) this.bloomGrid.set(key, (cell = []))
    if (cell.length >= BLOOM_CAP || this.blooms.length >= BLOOM_MAX) {
      let best: Bloom | null = null
      let bd = Infinity
      for (const b of cell) {
        if (b.size >= BUSH_MAX) continue
        const d = (b.x - x) ** 2 + (b.y - y) ** 2
        if (d < bd) {
          bd = d
          best = b
        }
      }
      if (!best) return
      best.size = Math.min(BUSH_MAX, Math.max(best.size, 5.5) + 0.8)
      best.kind = 3
      if (this.bloomCtx) paintBloom(this.bloomCtx, best, this.bloomStyle, false)
      return
    }
    const b: Bloom = { x, y, fam, size, rot: bloomRot(x, y), kind: Math.floor(vrand(0, 3)) }
    cell.push(b)
    this.blooms.push(b)
    if (this.bloomCtx) paintBloom(this.bloomCtx, b, this.bloomStyle, true)
  }

  private clearBlooms() {
    this.blooms = []
    this.bloomGrid.clear()
    this.bloomTotal = 0
    if (this.bloomCtx) this.bloomCtx.clearRect(0, 0, WORLD_W, WORLD_H)
  }

  bloomCount() {
    return this.bloomTotal
  }

  /** Compact save of the bank blooms: [version, total, then x, y, family*4+kind, size*10 per bloom], all ints. */
  exportBlooms(): number[] {
    const out = [BLOOM_V, this.bloomTotal]
    for (const b of this.blooms) out.push(b.x, b.y, b.fam * 4 + b.kind, Math.round(b.size * 10))
    return out
  }

  /** Restores blooms saved by exportBlooms; call after attach(). */
  importBlooms(data: number[]) {
    this.clearBlooms()
    if (!Array.isArray(data) || data[0] !== BLOOM_V) return
    for (let i = 2; i + 3 < data.length; i += 4) {
      const x = Math.round(data[i])
      const y = Math.round(data[i + 1])
      const code = data[i + 2] | 0
      const size = data[i + 3] / 10
      if (!Number.isFinite(x) || !Number.isFinite(y) || !(size > 0)) continue
      const b: Bloom = { x, y, fam: (code >> 2) % BLOOM_FAMS.length, kind: code & 3, size: Math.min(BUSH_MAX, size), rot: bloomRot(x, y) }
      const key = cellKey(x, y)
      let cell = this.bloomGrid.get(key)
      if (!cell) this.bloomGrid.set(key, (cell = []))
      cell.push(b)
      this.blooms.push(b)
    }
    this.bloomTotal = Math.max(data[1] | 0, this.blooms.length)
    this.repaintBlooms()
  }

  // ------------------------------------------------------------------ victory

  private stepVictory(dt: number) {
    if (this.victoryT < 0 || this.victoryT > 2.8) return
    const prev = this.victoryT
    this.victoryT += dt
    const fx = this.fx
    // fireworks across the canal
    this.fireworkT -= dt
    while (this.fireworkT <= 0 && this.victoryT < 2.5) {
      this.fireworkT += this.settings.calmFx ? 0.34 : 0.17
      const x = vrand(70, WORLD_W - 70)
      const y = vrand(110, WORLD_H - 200)
      const c1 = FIREWORK_COLS[Math.floor(vrand(0, FIREWORK_COLS.length))]
      const c2 = FIREWORK_COLS[Math.floor(vrand(0, FIREWORK_COLS.length))]
      fx.flash(x, y, 70, c1, 0.4)
      fx.ring(x, y, 80, withAlpha(c1, 0.9), 0.6, 3)
      fx.burst(x, y, c1, 18, 280, 3.4, 1)
      fx.burst(x, y, c2, 10, 180, 2.6, 1.1)
      sound.pop(1.2)
    }
    // a bloom wave sweeps down every channel toward the lantern
    const lvl = this.levelBuilt
    if (!lvl) return
    const f0 = Math.min(1, prev / 2.2)
    const f1 = Math.min(1, this.victoryT / 2.2)
    if (f1 <= f0) return
    const pos = { x: 0, y: 0, tx: 0, ty: 0 }
    const step = 26
    for (const seg of lvl.segs.values()) {
      const L = seg.line.length
      for (let s = Math.ceil((f0 * L) / step) * step; s < f1 * L; s += step) {
        seg.line.at(s, pos)
        for (const side of [-1, 1]) {
          const off = CANAL_W / 2 + vrand(13, 26)
          const x = pos.x - pos.ty * off * side
          const y = pos.y + pos.tx * off * side
          if (this.bloomBlocked(x, y)) continue
          const fam = Math.floor(vrand(0, BLOOM_FAMS.length))
          this.placeBloom(x, y, fam, vrand(3.4, 5.4))
          if (!this.settings.calmFx || Math.random() < 0.4) fx.add({ kind: 'mote', x, y, size: 6, life: 0.9, color: bloomColor(fam) })
        }
      }
    }
  }

  // ------------------------------------------------------------------ frame

  draw(sim: Sim, dt: number, view: ViewState) {
    this.time += dt
    this.richTextBudget = Math.min(4, this.richTextBudget + dt * 5)
    this.leakStack = Math.max(0, this.leakStack - dt * 1.2)
    this.fx.update(dt)
    this.ensureLayers()
    this.stepVictory(dt)
    const ctx = this.ctx
    const t = this.time
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = P.night0
    ctx.fillRect(0, 0, this.w, this.h)
    let sx = 0
    let sy = 0
    if (this.fx.shake > 0) {
      const k = this.fx.shake * this.fx.shake * 7
      sx = Math.sin(t * 61) * k
      sy = Math.cos(t * 47) * k
    }
    ctx.translate(this.ox + sx, this.oy + sy)
    ctx.scale(this.scale, this.scale)
    ctx.drawImage(this.bg!, -BG_PAD_X, -BG_PAD_Y, WORLD_W + BG_PAD_X * 2, WORLD_H + BG_PAD_Y * 2)
    if (sim.challenge.harbour) this.drawHarbour(ctx, sim)
    if (sim.challenge.gardens) this.drawGardens(ctx, sim)
    if (sim.challenge.guard) drawSettlement(ctx, this.settlement, this.bunting, !!sim.challenge.harbour, !!sim.challenge.gardens)

    this.drawFlow(ctx, sim, dt)
    ctx.drawImage(this.bloomCv!, 0, 0, WORLD_W, WORLD_H)
    if (sim.challenge.harbour) for (const b of this.blooms) if (b.y < 0) paintBloom(ctx, b, this.bloomStyle, true)
    this.drawSluice(ctx, sim)
    this.drawRanges(ctx, sim, view)
    this.drawRoutePlan(ctx, sim, view)
    if (view.feedbackRoute && !sim.waveActive && !view.selection) {
      ctx.save()
      ctx.strokeStyle = P.coral
      ctx.lineWidth = 4
      ctx.setLineDash([12, 9])
      for (let i = 0; i + 1 < view.feedbackRoute.length; i += 2) {
        const gate = sim.gates.find(g => g.def.id[0] === view.feedbackRoute![i])
        const seg = gate && sim.level.segs.get(gate.def.outs[view.feedbackRoute[i + 1] === '1' ? 1 : 0])
        if (seg) { ctx.beginPath(); seg.line.pts.forEach((p, j) => j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke() }
      }
      ctx.restore()
    }
    for (const p of sim.embers) {
      ctx.save()
      ctx.globalAlpha = Math.min(.45, p.life * .3)
      ctx.fillStyle = P.coral
      ctx.strokeStyle = P.amberHi
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius, p.radius * .65, 0, 0, TAU); ctx.fill(); ctx.stroke()
      ctx.restore()
    }

    // pads
    for (let i = 0; i < sim.pads.length; i++) {
      if (!sim.padAvailable(i)) continue
      const p = sim.pads[i]
      if (p.tower) {
        drawPad(ctx, p.x, p.y, 'occupied', t, p.tower.def.hue, Math.max(p.tower.a, p.tower.b))
        continue
      }
      const sel = view.moving?.destination === i || view.selection?.kind === 'pad' && view.selection.index === i
      const armed = view.armed !== null || !!view.moving
      drawPad(ctx, p.x, p.y, sel ? 'selected' : armed ? 'buildable' : 'empty', t)
      if (t < this.revealUntil && this.newPads.includes(i)) {
        ctx.strokeStyle = withAlpha(P.amberHi, this.settings.reduceMotion ? 0.8 : 0.6 + Math.sin(t * 4) * 0.3)
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, PAD_R + 7, PAD_R * 0.56 + 5, 0, 0, TAU)
        ctx.stroke()
      }
    }
    // gate bodies under the Mopes
    for (const g of sim.gates) if (sim.gateAvailable(g)) this.drawGateBase(ctx, sim, g, dt)
    this.drawLandmarks(ctx, sim, 'under')

    if (sim.challenge.harbourEncounters) {
      for (const boss of sim.enemies) {
        if (!boss.alive || boss.def.id !== 'warden') continue
        const escorts = wardenEscorts(sim, boss)
        if (boss.phase !== 1 && !escorts.length) continue
        ctx.save()
        ctx.strokeStyle = P.ice
        ctx.fillStyle = withAlpha(P.ice, .12)
        ctx.lineWidth = 3
        if (boss.phase === 1) ctx.setLineDash([8, 6])
        ctx.beginPath()
        ctx.ellipse(boss.x, boss.y, boss.def.radius + 12, boss.def.radius + 4, 0, 0, TAU)
        ctx.fill(); ctx.stroke()
        ctx.setLineDash([])
        for (const escort of escorts) {
          ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(escort.x, escort.y); ctx.stroke()
          ctx.beginPath(); ctx.arc(escort.x, escort.y, escort.def.radius + 5, 0, TAU); ctx.stroke()
        }
        ctx.restore()
      }
    }
    for (const boss of sim.enemies) if (boss.alive && boss.def.id === 'bloomheart' && (boss.signalT ?? 0) > 0) {
      ctx.save(); ctx.strokeStyle = P.pink; ctx.fillStyle = withAlpha(P.pink, .08); ctx.lineWidth = 4
      ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.arc(boss.x, boss.y, 160, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
      ctx.font = `700 ${this.fontPx(22)}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = P.cream
      ctx.strokeStyle = '#10242a'; ctx.lineWidth = 6
      const warning = `Heal in ${Math.ceil(boss.signalT!)}`
      ctx.strokeText(warning, boss.x, boss.y - 164); ctx.fillText(warning, boss.x, boss.y - 82); ctx.restore()
    }
    // depth-sorted towers and Mopes
    const list: ({ y: number; t: Tower } | { y: number; e: Enemy })[] = []
    for (const tw of sim.towers) list.push({ y: tw.y, t: tw })
    for (const e of sim.enemies) list.push({ y: e.y, e })
    list.sort((a, b) => a.y - b.y)
    const selTower = view.selection?.kind === 'tower' ? view.selection.tower : null
    for (const item of list) {
      if ('t' in item) {
        const tw = item.t
        if (tw === selTower) {
          ctx.strokeStyle = P.amber
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.ellipse(tw.x, tw.y, PAD_R - 3, PAD_R * 0.56 - 2, 0, 0, TAU)
          ctx.stroke()
        }
        // build and upgrade flourishes run on render time, so they play even while paused
        let born = this.bornAt.get(tw)
        if (born === undefined) {
          born = sim.time - tw.bornT < 0.5 ? t : -99
          this.bornAt.set(tw, born)
        }
        const up = this.upAt.get(tw)
        if (!up || up.upT !== tw.upT) this.upAt.set(tw, { upT: tw.upT, at: sim.time - tw.upT < 0.5 ? t : -99 })
        drawTower(ctx, tw.x, tw.y, {
          id: tw.id,
          a: tw.a,
          b: tw.b,
          angle: tw.angle,
          since: sim.time - tw.fireT,
          age: t - born,
          upAge: t - this.upAt.get(tw)!.at,
          t,
          seed: tw.uid,
        })
      } else {
        if (sim.challenge.guard && item.e.rich) {
          ctx.strokeStyle = withAlpha(P.amberHi, 0.8)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(item.e.x, item.e.y + 6, item.e.def.radius + 4, item.e.def.radius * 0.52 + 3, 0, 0, TAU)
          ctx.stroke()
        }
        drawEnemy(ctx, item.e, t, { hiddenAlpha: 0.26, showBars: true })
        if (sim.challenge.guard) this.drawStatus(ctx, item.e)
        if (item.e.def.id === 'gloom' && item.e.def.splitAtGate) this.drawShroud(ctx, item.e, t)
      }
    }
    if (view.moving?.destination != null) {
      const p = sim.pads[view.moving.destination]
      const tw = view.moving.tower
      ctx.globalAlpha = .65
      drawTower(ctx, p.x, p.y, { id: tw.id, a: tw.a, b: tw.b, angle: tw.angle, since: 9, age: 9, upAge: 9, t, seed: tw.uid })
      ctx.globalAlpha = 1
    }
    // build preview ghost
    if (view.selection?.kind === 'pad' && view.preview) {
      const p = sim.pads[view.selection.index]
      ctx.globalAlpha = 0.55 + Math.sin(t * 5) * 0.1
      drawTower(ctx, p.x, p.y, { id: view.preview, a: 0, b: 0, angle: -1.2, since: 9, age: 9, upAge: 9, t, seed: 1 })
      ctx.globalAlpha = 1
    }

    this.drawLandmarks(ctx, sim, 'over')
    this.drawProjectiles(ctx, sim)
    this.drawBeams(ctx, sim)
    for (const g of sim.gates) if (sim.gateAvailable(g)) this.drawGateTop(ctx, sim, g)
    this.drawHome(ctx, sim, dt)

    this.fx.drawBase(ctx)
    ctx.globalCompositeOperation = 'lighter'
    this.fx.drawGlow(ctx)
    this.drawAmbientMotes(ctx)
    ctx.globalCompositeOperation = 'source-over'

    if (view.hint) this.drawHint(ctx, view.hint.x, view.hint.y, view.hint.label)
    if (view.cursor) {
      const c = view.cursor
      ctx.strokeStyle = P.amberHi
      ctx.lineWidth = 4
      ctx.setLineDash([10, 7])
      ctx.lineDashOffset = -t * 20
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (view.paused) {
      // a clear paused state: the map dims and cools, with a soft vignette
      const shadeTop = sim.challenge.gardens ? -1100 : sim.challenge.harbour ? -600 : -BG_PAD_Y
      const shadeHeight = WORLD_H + BG_PAD_Y - shadeTop
      ctx.fillStyle = 'rgba(6,14,24,0.34)'
      ctx.fillRect(-BG_PAD_X, shadeTop, WORLD_W + BG_PAD_X * 2, shadeHeight)
      const vg = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.3, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.75)
      vg.addColorStop(0, 'rgba(8,20,30,0)')
      vg.addColorStop(1, 'rgba(8,20,30,0.45)')
      ctx.fillStyle = vg
      ctx.fillRect(-BG_PAD_X, shadeTop, WORLD_W + BG_PAD_X * 2, shadeHeight)
    }
    if (this.zone === 'overview') {
      ctx.save()
      ctx.fillStyle = P.cream; ctx.strokeStyle = '#10242a'; ctx.lineWidth = 6 / this.scale
      ctx.font = `600 ${14 / this.scale}px ${FONT}`; ctx.textAlign = 'center'
      const labels: [string, number, number][] = [...(sim.challenge.gardens ? [['Gardens', -715, sim.enemies.filter(e => e.y < -440).length] as [string, number, number]] : []), ['Harbour', -230, sim.enemies.filter(e => e.y >= -440 && e.y < 0).length], ['Canal', 435, sim.enemies.filter(e => e.y >= 0).length]]
      for (const [name, y, count] of labels) { const label = name + (count ? ' · ' + count : ''); ctx.strokeText(label, 360, y); ctx.fillText(label, 360, y) }
      ctx.restore()
    }
    // the sim only updates beamIntensity while stepping, so silence the hum when it is not
    sound.beam(view.paused || sim.over ? 0 : sim.beamIntensity)
  }

  private drawStatus(ctx: CanvasRenderingContext2D, e: Enemy) {
    const r = e.def.radius * ENEMY_VIS * e.visScale + 4
    ctx.save()
    ctx.lineWidth = 2
    if (e.shell > 0) {
      ctx.strokeStyle = P.coral
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(e.x, e.y, r, i * TAU / 3, i * TAU / 3 + 1.4); ctx.stroke() }
    }
    if (e.def.hidden && (e.revealedPerm || e.seenT > 0)) {
      const x = e.x, y = e.y + r + 5
      ctx.strokeStyle = P.lime
      ctx.fillStyle = P.lime
      ctx.beginPath(); ctx.ellipse(x, y, 7, 4, 0, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill()
    }
    if (e.slowT > 0) {
      ctx.strokeStyle = P.ice
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * .5, r, 5, 0, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(e.x - 3, e.y + r * .5 - 4); ctx.lineTo(e.x - 3, e.y + r * .5 + 4); ctx.moveTo(e.x + 3, e.y + r * .5 - 4); ctx.lineTo(e.x + 3, e.y + r * .5 + 4); ctx.stroke()
    }
    ctx.restore()
  }

  private drawGardens(ctx: CanvasRenderingContext2D, sim: Sim) {
    ctx.save(); ctx.fillStyle = '#18322e'; ctx.fillRect(-120, -1100, 960, 670)
    for (const [x, y] of [[82, -660], [625, -665]]) {
      ctx.fillStyle = '#244c48'; ctx.beginPath(); ctx.ellipse(x, y, 68, 95, -.2, 0, TAU); ctx.fill()
      ctx.strokeStyle = '#608979'; ctx.lineWidth = 7; ctx.stroke()
    }
    for (const id of ['garden-west', 'garden-east', 'garden-merge']) {
      const seg = sim.level.segs.get(id)!
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (const [width, color] of [[90, '#38544b'], [70, '#648278'], [56, '#28545b']] as const) {
        ctx.lineWidth = width; ctx.strokeStyle = color; ctx.beginPath()
        seg.line.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke()
      }
    }
    ctx.font = `600 ${this.fontPx(18)}px ${FONT}`; ctx.fillStyle = '#d7e9ce'; ctx.textAlign = 'center'
    if (this.zone !== 'overview') { ctx.fillText('West garden', 115, -983); ctx.fillText('East garden', 605, -983) }
    ctx.restore()
  }

  private drawHarbour(ctx: CanvasRenderingContext2D, sim: Sim) {
    const seg = sim.level.segs.get('harbour')!
    ctx.save()
    const bank = ctx.createLinearGradient(0, -100, 0, 15)
    bank.addColorStop(0, '#10242a'); bank.addColorStop(1, '#10242a00')
    ctx.fillStyle = bank
    ctx.fillRect(-120, -600, 960, 615)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    for (const [width, color] of [[90, '#253e42'], [70, '#476468'], [56, '#28545b']] as const) {
      ctx.lineWidth = width; ctx.strokeStyle = color
      ctx.beginPath(); seg.line.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke()
    }
    for (const [x, y] of [[75, -375], [610, -310], [85, -110], [620, -30]]) {
      ctx.fillStyle = '#534b3c'; ctx.fillRect(x - 22, y, 44, 38)
      ctx.strokeStyle = '#2b342d'; ctx.lineWidth = 2
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x - 22, y + j * 10); ctx.lineTo(x + 22, y + j * 10); ctx.stroke() }
      ctx.fillStyle = P.amberHi; ctx.fillRect(x - 3, y - 13, 6, 13)
      ctx.drawImage(glowSprite(P.amber, 64), x - 22, y - 32, 44, 44)
    }
    ctx.restore()
  }

  /** Old Gloom is shrouded until it splits: a slow ring of smoke that shrugs off damage. */
  private drawShroud(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
    const r = e.def.radius * ENEMY_VIS * (e.visScale || 1) * 1.35
    ctx.save()
    ctx.translate(e.x, e.y)
    for (let i = 0; i < 3; i++) {
      ctx.rotate(t * (0.4 + i * 0.15))
      ctx.strokeStyle = withAlpha(i === 1 ? P.lilac : '#2a1f3d', 0.55 - i * 0.12)
      ctx.lineWidth = 7 - i * 2
      ctx.setLineDash([22 + i * 6, 14])
      ctx.beginPath()
      ctx.arc(0, 0, r + i * 7, 0, TAU)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  // ------------------------------------------------------------------ layers

  private activeSegments(sim: Sim): Set<string> {
    const active = new Set<string>()
    for (const src of this.levelBuilt!.def.sources) {
      if (!sim.openSources.has(src.id)) continue
      let id: string | null = src.seg
      let guard = 0
      while (id && guard++ < 20) {
        active.add(id)
        const seg: import('../game/level').Segment = sim.level.segs.get(id)!
        const nx: import('../game/level').NextRef = seg.next
        if ('home' in nx) id = null
        else if ('seg' in nx) id = nx.seg
        else {
          const g = sim.gates.find((q) => q.def.id === nx.gate)!
          id = g.def.outs[sim.gateEffectiveDir(g)]
          // charms route a family down the other branch too (only once the lock is working)
          if (g.charm && !sim.gateLocked(g) && g.charm.dir !== sim.gateEffectiveDir(g)) active.add(g.def.outs[g.charm.dir] + '*')
        }
      }
    }
    return active
  }

  private drawFlow(ctx: CanvasRenderingContext2D, sim: Sim, dt: number) {
    const active = this.activeSegments(sim)
    const t = this.settings.reduceMotion ? 0 : this.time
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const [id, seg] of sim.level.segs) {
      const on = active.has(id) ? 1 : active.has(id + '*') ? 0.45 : 0
      const cur = this.flowAlpha.get(id) ?? on
      const next = cur + (on - cur) * Math.min(1, dt * 5)
      this.flowAlpha.set(id, next)
      const pts = seg.line.pts
      // still water sheen on closed channels
      ctx.strokeStyle = withAlpha('#071f28', 0.78 * (1 - next))
      ctx.lineWidth = CANAL_W - 10
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      if (next < 0.02) continue
      // moving current
      ctx.setLineDash([16, 30])
      ctx.lineDashOffset = -t * 70
      ctx.strokeStyle = withAlpha(P.flow, 0.55 * next)
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.setLineDash([6, 40])
      ctx.lineDashOffset = -t * 70 - 20
      ctx.strokeStyle = withAlpha('#d8fff8', 0.4 * next)
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
      // Sparse directional marks remain readable with motion reduced or sound off.
      const point = { x: 0, y: 0, tx: 0, ty: 0 }
      ctx.strokeStyle = withAlpha('#d8fff8', 0.66 * next)
      ctx.lineWidth = 3
      for (let d = 125; d < seg.line.length - 35; d += 155) {
        seg.line.at(d, point)
        ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(Math.atan2(point.ty, point.tx))
        ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(2, 0); ctx.lineTo(-7, 8); ctx.stroke(); ctx.restore()
      }
    }
  }

  /** Lantern bridge (deck drawn over the Mopes passing under it), Mill wheel, and x2 badges on rich runs. */
  private drawLandmarks(ctx: CanvasRenderingContext2D, sim: Sim, layer: 'under' | 'over') {
    if (layer === 'under') {
      for (const seg of sim.level.segs.values()) {
        if (seg.bonus <= 1) continue
        const p = this.badgeSpot(sim, seg)
        this.drawBadge(ctx, p.x, p.y, 'x' + seg.bonus)
      }
      if (this.mill) this.drawMill(ctx, this.mill)
      if (this.bridge) this.drawBridgePool(ctx, this.bridge)
    } else if (this.bridge) this.drawBridge(ctx, this.bridge)
  }

  /** Where a rich run's badge sits: on whichever bank near its start is clearer of pads and other channels, so Mopes never cover it. */
  private badgeSpot(sim: Sim, seg: Segment) {
    let spot = this.badgeSpots.get(seg.id)
    if (spot) return spot
    const p = { x: 0, y: 0, tx: 0, ty: 0 }
    let best = -Infinity
    for (let s = 70; s <= 150; s += 20) {
      seg.line.at(s, p)
      for (const side of [-1, 1]) {
        const off = CANAL_W / 2 + 14
        const x = p.x - p.ty * off * side
        const y = p.y + p.tx * off * side
        let clear = Infinity
        for (const pad of sim.pads) clear = Math.min(clear, Math.hypot(pad.x - x, pad.y - y) - PAD_R - 30)
        // keep clear of the lock dials and their incoming chips
        for (const g of sim.gates) clear = Math.min(clear, Math.hypot(g.def.x - x, g.def.y + 62 - y) - 80, Math.hypot(g.def.x - x, g.def.y - 30 - y) - 60)
        for (const o of sim.level.segs.values()) if (o !== seg) clear = Math.min(clear, o.line.distanceTo(x, y) - CANAL_W / 2 - 10)
        if (clear > best) {
          best = clear
          spot = { x, y }
        }
      }
    }
    this.badgeSpots.set(seg.id, spot!)
    return spot!
  }

  /** Rich-run badge: gold text on a dark pill, never under 13 CSS px. */
  private drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
    const fs = this.fontPx(17 * Math.min(1.4, this.fx.textScale))
    const w = fs * 2.3
    const h = fs * 1.5
    ctx.fillStyle = 'rgba(10,22,28,0.88)'
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2)
    ctx.fill()
    ctx.strokeStyle = P.gold
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = P.gold
    ctx.font = `700 ${fs}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y + fs * 0.06)
  }

  /** Waterwheel: spokes end at the rim, paddle boards turn slowly, its lower third churns in the water. */
  private drawMill(ctx: CanvasRenderingContext2D, m: MillGeo) {
    const t = this.time
    const still = this.settings.reduceMotion
    const rot = still ? 0 : t * 0.9
    const r = m.r
    const side = m.hx < m.x ? -1 : 1
    // axle from the hub into the hut wall
    const wallX = m.hx - side * 22
    ctx.strokeStyle = '#2a1d14'
    ctx.lineWidth = 6
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.moveTo(m.x, m.y)
    ctx.lineTo(wallX, m.y)
    ctx.stroke()
    ctx.fillStyle = '#1e1510'
    ctx.fillRect(wallX - (side < 0 ? 0 : 5), m.y - 6, 5, 12)
    ctx.save()
    ctx.translate(m.x, m.y)
    ctx.rotate(rot)
    // spokes stop at the rim
    ctx.strokeStyle = '#6e4a30'
    ctx.lineWidth = 3.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5)
      ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2))
    }
    ctx.stroke()
    // inner ring and rim
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, r - 7, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = '#8a6040'
    ctx.lineWidth = 4.5
    ctx.beginPath()
    ctx.arc(0, 0, r - 1, 0, TAU)
    ctx.stroke()
    // paddle boards on the rim
    for (let i = 0; i < 12; i++) {
      ctx.save()
      ctx.rotate((i / 12) * TAU)
      ctx.fillStyle = '#5e3f28'
      ctx.fillRect(r - 4, -3, 10, 6)
      ctx.fillStyle = '#a47a52'
      ctx.fillRect(r + 4, -3, 2, 6)
      ctx.restore()
    }
    ctx.fillStyle = P.coral
    ctx.beginPath()
    ctx.arc(0, 0, 6.5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#3b2a1e'
    ctx.beginPath()
    ctx.arc(0, 0, 2.4, 0, TAU)
    ctx.fill()
    ctx.restore()
    // the lower third sits in the water
    const chord = Math.sqrt(Math.max(0, (r + 6) ** 2 - (m.water - m.y) ** 2))
    ctx.fillStyle = withAlpha(P.water1, 0.78)
    ctx.beginPath()
    ctx.roundRect(m.x - chord - 2, m.water, chord * 2 + 4, m.y + r + 8 - m.water, [0, 0, 8, 8])
    ctx.fill()
    // foam along the waterline and splash crowns where the paddles cut in and out
    ctx.fillStyle = 'rgba(240,252,255,0.85)'
    ctx.beginPath()
    let i = 0
    for (let x = m.x - chord; x <= m.x + chord; x += 4.2, i++) {
      const rr = 2.1 + ((i * 7) % 3) * 0.55
      const wy = m.water + (still ? 0 : Math.sin(t * 6 + i * 1.7) * 0.8)
      ctx.moveTo(x + rr, wy)
      ctx.arc(x, wy, rr, 0, TAU)
    }
    ctx.fill()
    ctx.strokeStyle = 'rgba(240,252,255,0.7)'
    ctx.lineWidth = 2
    for (const e of [-1, 1]) {
      const k = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 7 + e)
      ctx.beginPath()
      ctx.arc(m.x + e * chord, m.water + 1, 5 + k * 3, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
    }
    // spray droplets thrown up where paddles leave the water
    if (!still && Math.random() < (this.settings.calmFx ? 0.12 : 0.3)) {
      const e = Math.random() < 0.7 ? -1 : 1
      this.fx.add({ kind: 'spark', x: m.x + e * chord + vrand(-3, 3), y: m.water - 2, vx: e * vrand(10, 50), vy: vrand(-110, -60), grav: 320, life: 0.45, size: 1.8, color: '#dff6ff' })
    }
  }

  /** Lime light pool on the water under the Lantern bridge: it reveals Veils. */
  private drawBridgePool(ctx: CanvasRenderingContext2D, b: BridgeGeo) {
    const pulse = this.settings.reduceMotion ? 0 : Math.sin(this.time * 1.7) * 0.06
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.ang)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.46 + pulse
    ctx.drawImage(glowSprite(P.lime, 64), -CANAL_W * 0.75, -64, CANAL_W * 1.5, 128)
    ctx.globalAlpha = 0.3 + pulse
    for (const e of [-1, 1]) ctx.drawImage(glowSprite(P.lime, 32), -12, e * (b.w / 2 + 12) - 12, 24, 24)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
  }

  /** A gently arched plank bridge with railings and two hanging lime lanterns. */
  private drawBridge(ctx: CanvasRenderingContext2D, b: BridgeGeo) {
    const t = this.time
    const half = b.half
    const hw = b.w / 2
    const bow = 3
    const edge = (x: number) => hw + bow * (1 - (x / half) ** 2)
    const deck = () => {
      ctx.beginPath()
      ctx.moveTo(-half, -hw)
      ctx.quadraticCurveTo(0, -hw - bow * 2, half, -hw)
      ctx.lineTo(half, hw)
      ctx.quadraticCurveTo(0, hw + bow * 2, -half, hw)
      ctx.closePath()
    }
    // shadow on the water, cast down-screen
    ctx.save()
    ctx.translate(b.x + 2, b.y + 10)
    ctx.rotate(b.ang)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    deck()
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.ang)
    // deck: darker at the ends, lighter at the crest
    const g = ctx.createLinearGradient(-half, 0, half, 0)
    g.addColorStop(0, '#553a26')
    g.addColorStop(0.5, '#9c724d')
    g.addColorStop(1, '#553a26')
    ctx.fillStyle = g
    deck()
    ctx.fill()
    ctx.strokeStyle = 'rgba(58,38,24,0.75)'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    for (let x = -half + 6; x < half - 3; x += 6) {
      const e = edge(x)
      ctx.moveTo(x, -e)
      ctx.lineTo(x, e)
    }
    ctx.stroke()
    // railings along both edges
    for (const s of [-1, 1]) {
      ctx.strokeStyle = '#3a281b'
      ctx.lineWidth = 3.4
      ctx.beginPath()
      ctx.moveTo(-half + 2, s * hw)
      ctx.quadraticCurveTo(0, s * (hw + bow * 2), half - 2, s * hw)
      ctx.stroke()
      ctx.strokeStyle = '#c29467'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.fillStyle = '#2e2016'
      for (const x of [-half + 3, -half / 2, 0, half / 2, half - 3]) {
        ctx.beginPath()
        ctx.roundRect(x - 2.2, s * edge(x) - 2.2, 4.4, 4.4, 1)
        ctx.fill()
      }
    }
    ctx.restore()
    // two lanterns hang from the middle posts, over the water
    const c = Math.cos(b.ang)
    const sn = Math.sin(b.ang)
    for (const s of [-1, 1]) {
      const ly = s * (hw + bow)
      const px = b.x - sn * ly
      const py = b.y + c * ly
      const sway = this.settings.reduceMotion ? 0 : Math.sin(t * 2.2 + s) * 1.2
      const lx = px + sway
      const lyy = py + 9
      ctx.strokeStyle = '#1e1510'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(lx, lyy - 5)
      ctx.stroke()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.6 + (this.settings.reduceMotion ? 0 : Math.sin(t * 3 + s) * 0.1)
      ctx.drawImage(glowSprite(P.lime, 64), lx - 24, lyy - 24, 48, 48)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#2d363d'
      ctx.beginPath()
      ctx.roundRect(lx - 5, lyy - 6, 10, 12, 3)
      ctx.fill()
      ctx.fillStyle = P.lime
      ctx.beginPath()
      ctx.roundRect(lx - 3, lyy - 4, 6, 8, 2)
      ctx.fill()
    }
  }

  /** label: the "opens at wave N" hint (left off keepsake pictures). */
  private drawSluice(ctx: CanvasRenderingContext2D, sim: Sim, label = true) {
    const src = this.levelBuilt!.def.sources.find((s) => s.id === 'west')
    if (!src) return
    const open = sim.openSources.has('west')
    const seg = sim.level.segs.get(src.seg)!
    const p = seg.line.at(58, { x: 0, y: 0, tx: 0, ty: 0 })
    const ang = Math.atan2(p.ty, p.tx)
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(ang)
    // posts
    ctx.fillStyle = P.stoneLo
    ctx.fillRect(-8, -CANAL_W / 2 - 14, 16, 14)
    ctx.fillRect(-8, CANAL_W / 2, 16, 14)
    ctx.fillStyle = P.stoneHi
    ctx.fillRect(-6, -CANAL_W / 2 - 12, 12, 4)
    ctx.fillRect(-6, CANAL_W / 2 + 2, 12, 4)
    if (!open) {
      ctx.fillStyle = '#6b4a32'
      ctx.fillRect(-5, -CANAL_W / 2, 10, CANAL_W)
      ctx.strokeStyle = '#3e2a1c'
      ctx.lineWidth = 1.5
      for (let i = 1; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(-5, -CANAL_W / 2 + (i * CANAL_W) / 4)
        ctx.lineTo(5, -CANAL_W / 2 + (i * CANAL_W) / 4)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = '#6b4a32'
      ctx.fillRect(-5, -CANAL_W / 2 - 26, 10, 12)
    }
    ctx.restore()
    if (!open && label) {
      const q = seg.line.at(110, { x: 0, y: 0, tx: 0, ty: 0 })
      const label = `Sluice opens wave ${src.openWave}`
      const fs = this.fontPx(15 * this.fx.textScale)
      ctx.font = `600 ${fs}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // keep the whole label on screen on narrow phones
      const w = ctx.measureText(label).width
      const left = -this.ox / this.scale + 8 / this.scale
      const right = (this.w - this.ox) / this.scale - 8 / this.scale
      const x = Math.min(right - w / 2, Math.max(left + w / 2, q.x + 10))
      const y = q.y - 44
      ctx.lineWidth = Math.max(4, fs * 0.25)
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(8,19,25,0.85)'
      ctx.strokeText(label, x, y)
      ctx.fillStyle = withAlpha(P.cream, 0.9)
      ctx.fillText(label, x, y)
    }
  }

  private drawRanges(ctx: CanvasRenderingContext2D, sim: Sim, view: ViewState) {
    const sel = view.selection
    const ring = (x: number, y: number, r: number, color: string, dashed = true) => {
      ctx.fillStyle = withAlpha(color, 0.07)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = withAlpha(color, 0.75)
      ctx.lineWidth = 2.5
      if (dashed) ctx.setLineDash([10, 8])
      ctx.lineDashOffset = -this.time * 12
      ctx.stroke()
      ctx.setLineDash([])
      // Paint the actual reachable water, so a range circle has a concrete meaning.
      ctx.strokeStyle = withAlpha(color, 0.65)
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const segment of sim.level.segs.values()) {
        let inside = false
        for (const p of segment.line.pts) {
          if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r * r) {
            if (inside) ctx.lineTo(p.x, p.y)
            else ctx.moveTo(p.x, p.y)
            inside = true
          } else inside = false
        }
      }
      ctx.stroke()
    }
    if (view.moving?.destination != null) {
      const p = sim.pads[view.moving.destination]
      ring(p.x, p.y, sim.rangeAt(view.moving.tower, p.x, p.y), P.cream)
    }
    if (sel?.kind === 'tower' && sel.tower) {
      const tw = sel.tower
      ring(tw.x, tw.y, sim.effRange(tw), tw.def.hue)
      const key = `${sim.seed}:${sim.canalStage}:${tw.uid}|${sim.towers.map(t => `${t.uid}:${t.pad}:${t.id}:${t.a}:${t.b}:${sim.effRange(t)}`).join(',')}`
      if (key !== this.partnerKey) { this.partnerKey = key; this.partners = towerPartners(sim, tw) }
      ctx.strokeStyle = withAlpha(P.lime, 0.8)
      ctx.lineWidth = 2.5
      ctx.setLineDash([5, 5])
      for (const partner of this.partners) {
        ctx.beginPath()
        ctx.moveTo(tw.x, tw.y)
        ctx.lineTo(partner.x, partner.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(partner.x, partner.y, PAD_R, PAD_R * 0.56, 0, 0, TAU)
        ctx.stroke()
      }
      ctx.setLineDash([])
      if (view.upgradeRange && view.upgradeRange > sim.effRange(tw)) ring(tw.x, tw.y, view.upgradeRange, P.cream, true)
      if (tw.id !== 'owl' && tw.id !== 'garden' && tw.id !== 'bell') {
        ctx.strokeStyle = withAlpha(P.lime, 0.35)
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 6])
        ctx.beginPath()
        ctx.arc(tw.x, tw.y, sim.effRange(tw) * 0.42, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
    if (sel?.kind === 'pad' && view.preview) {
      const p = sim.pads[sel.index]
      if (p) ring(p.x, p.y, sim.towerStats(view.preview, 0, 0).range, P.amber)
    }
  }

  private drawRoutePlan(ctx: CanvasRenderingContext2D, sim: Sim, view: ViewState) {
    if (view.selection?.kind !== 'gate' || !sim.challenge.guard) return
    const g = view.selection.gate
    const dir = view.routeDir ?? sim.gateEffectiveDir(g)
    const key = `${sim.seed}:${sim.canalStage}:${g.def.id}:${dir}|${sim.gates.map(g => sim.gateEffectiveDir(g)).join(',')}|${sim.towers.map(t => `${t.uid}:${t.pad}:${t.id}:${t.a}:${t.b}:${sim.effRange(t)}`).join(',')}`
    if (key !== this.routeKey) { this.routeKey = key; this.routePlan = routeCoverage(sim, g, dir) }
    const plan = this.routePlan!
    ctx.save()
    ctx.lineCap = 'round'
    const drawPath = (segment: Segment) => {
      ctx.beginPath()
      segment.line.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
      ctx.stroke()
    }
    const other = sim.level.segs.get(g.def.outs[dir ? 0 : 1])
    ctx.setLineDash([7, 10])
    ctx.strokeStyle = withAlpha(P.cream, 0.45)
    ctx.lineWidth = 3
    if (other) drawPath(other)
    ctx.setLineDash([])
    ctx.strokeStyle = withAlpha(P.amberHi, 0.95)
    ctx.lineWidth = 5
    plan.segments.forEach(drawPath)
    for (const tower of plan.towers) {
      ctx.beginPath()
      ctx.ellipse(tower.x, tower.y, PAD_R + 3, PAD_R * 0.56 + 2, 0, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawGateBase(ctx: CanvasRenderingContext2D, sim: Sim, g: GateState, dt: number) {
    const geo = this.gateGeo.get(g.def.id)!
    const dir = sim.gateEffectiveDir(g)
    const t = this.time
    // an iron lock door slides across the closed branch mouth; the open one slides out
    for (const k of [0, 1] as const) {
      const target = k === dir ? 0 : 1
      geo.barrier[k] += (target - geo.barrier[k]) * Math.min(1, dt * 12)
      const v = geo.barrier[k]
      if (v < 0.02) continue
      const m = geo.mouths[k]
      // local x spans the channel; local +y points back upstream toward the lock
      const ang = Math.atan2(m.ty, m.tx) + Math.PI / 2
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(ang)
      const half = (CANAL_W / 2 + 6) * v
      const th = 8
      // white foam piled against the upstream face
      if (v > 0.3) {
        ctx.fillStyle = withAlpha('#eefcff', 0.8 * Math.min(1, (v - 0.3) * 2))
        ctx.beginPath()
        let i = 0
        for (let x = -half + 5; x <= half - 5; x += 5, i++) {
          const r = 2.6 + ((i * 5) % 3) * 0.7
          const y = th + 2.5 + (this.settings.reduceMotion ? 0 : Math.sin(t * 4 + i * 1.9) * 0.9) + (i % 2) * 1.5
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, TAU)
        }
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.roundRect(-half, -th - 4, half * 2, th * 2, 3)
      ctx.fill()
      // slate door
      ctx.fillStyle = '#2d3a40'
      ctx.beginPath()
      ctx.roundRect(-half, -th, half * 2, th * 2, 3)
      ctx.fill()
      ctx.fillStyle = '#4a5c63'
      ctx.fillRect(-half + 2, -th, half * 2 - 4, 2.2)
      // diagonal amber and ink hazard band
      if (half > 8) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(-half + 6, -3.5, half * 2 - 12, 7)
        ctx.clip()
        ctx.fillStyle = P.amber
        ctx.fillRect(-half, -3.5, half * 2, 7)
        ctx.fillStyle = P.ink
        ctx.beginPath()
        for (let x = -half - 8; x < half + 8; x += 9) {
          ctx.moveTo(x, 3.5)
          ctx.lineTo(x + 4.5, 3.5)
          ctx.lineTo(x + 9.5, -3.5)
          ctx.lineTo(x + 5, -3.5)
          ctx.closePath()
        }
        ctx.fill()
        ctx.restore()
      }
      // rivets
      ctx.fillStyle = '#9fb2b8'
      ctx.beginPath()
      const n = Math.max(2, Math.round(half / 7))
      for (let i = 0; i <= n; i++) {
        const x = -half + 3.5 + ((half * 2 - 7) * i) / n
        for (const y of [-5.8, 5.8]) {
          ctx.moveTo(x + 1.2, y)
          ctx.arc(x, y, 1.2, 0, TAU)
        }
      }
      ctx.fill()
      ctx.restore()
    }
    // chevrons down the open branch
    const l = sim.level.segs.get(g.def.outs[dir])!.line
    const pos = { x: 0, y: 0, tx: 0, ty: 0 }
    for (let i = 0; i < 3; i++) {
      l.at(30 + i * 22, pos)
      const phase = (this.time * 1.6 - i * 0.25) % 1
      const a = Math.atan2(pos.ty, pos.tx)
      ctx.save()
      ctx.translate(pos.x, pos.y)
      ctx.rotate(a)
      ctx.strokeStyle = withAlpha(P.flow, 0.35 + 0.55 * Math.max(0, Math.sin(phase * Math.PI)))
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(-6, -11)
      ctx.lineTo(4, 0)
      ctx.lineTo(-6, 11)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawGateTop(ctx: CanvasRenderingContext2D, sim: Sim, g: GateState) {
    const geo = this.gateGeo.get(g.def.id)!
    const dir = sim.gateEffectiveDir(g)
    const locked = sim.gateLocked(g)
    // once the run is over the dials rest in a neutral state: no "can't flip" pink, no jam goo
    const over = !!sim.over
    const jammed = g.jammed && !over
    const x = g.def.x
    const y = g.def.y
    const t = this.time
    // arrow springs toward the open branch
    let target = geo.angles[dir]
    let diff = target - geo.arrow
    while (diff > Math.PI) diff -= TAU
    while (diff < -Math.PI) diff += TAU
    target = geo.arrow + diff
    ;[geo.arrow, geo.arrowVel] = spring(geo.arrow, geo.arrowVel, target, 1 / 60, 220, 16)
    // post
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(x + 3, y + 8, 26, 11, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#3b2a1e'
    ctx.beginPath()
    ctx.roundRect(x - 8, y - 30, 16, 36, 4)
    ctx.fill()
    // lamp head
    const canFlip = sim.canFlip(g)
    const glowCol = locked ? '#8aa0a6' : jammed ? P.pink : P.amber
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = locked ? 0.25 : 0.6 + Math.sin(t * 3) * 0.08
    ctx.drawImage(glowSprite(glowCol, 64), x - 46, y - 76, 92, 92)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    // round dial with the arrow
    const R = 28
    ctx.fillStyle = '#16262d'
    ctx.beginPath()
    ctx.arc(x, y - 30, R + 4, 0, TAU)
    ctx.fill()
    ctx.fillStyle = locked ? '#2c3a40' : '#23363e'
    ctx.beginPath()
    ctx.arc(x, y - 30, R, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = locked ? '#51646b' : jammed ? P.pink : P.amber
    ctx.lineWidth = 3
    ctx.stroke()
    // cooldown sweep
    if (g.cd > 0 && !locked && !over) {
      ctx.strokeStyle = withAlpha(P.cream, 0.9)
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(x, y - 30, R + 4, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - g.cd / 0.9))
      ctx.stroke()
    }
    // a tidal lock: flowing marks under the dial say it swings back on its own; a draining ring shows how soon
    const tidal = sim.challenge.tidal
    if (tidal && !locked && !over) {
      ctx.strokeStyle = withAlpha(P.flow, 0.75)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      for (const k of [0, 1]) {
        ctx.beginPath()
        for (let i = 0; i <= 12; i++) {
          const px = x - 12 + i * 2
          const py = y - 30 + R - 8 + k * 5 + Math.sin(i * 0.9 + t * 3) * 1.6
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
      if (g.swingT > 0) {
        const f = Math.min(1, g.swingT / tidal)
        const urgent = g.swingT < 1.5 && !this.settings.reduceMotion
        ctx.strokeStyle = withAlpha(P.flow, urgent ? 0.6 + Math.sin(t * 14) * 0.35 : 0.95)
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.arc(x, y - 30, R + 10, -Math.PI / 2, -Math.PI / 2 + TAU * f)
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
    }
    ctx.save()
    ctx.translate(x, y - 30)
    ctx.rotate(geo.arrow)
    ctx.fillStyle = locked ? '#6b7d83' : over || canFlip || g.cd > 0 ? P.amberHi : P.pink
    ctx.beginPath()
    ctx.moveTo(17, 0)
    ctx.lineTo(1, -12)
    ctx.lineTo(1, -5)
    ctx.lineTo(-14, -5)
    ctx.lineTo(-14, 5)
    ctx.lineTo(1, 5)
    ctx.lineTo(1, 12)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    if (locked) {
      ctx.fillStyle = '#c7d3d6'
      ctx.beginPath()
      ctx.roundRect(x + 12, y - 16, 16, 13, 3)
      ctx.fill()
      ctx.strokeStyle = '#c7d3d6'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x + 20, y - 17, 5, Math.PI, 0)
      ctx.stroke()
    }
    if (jammed) {
      ctx.fillStyle = P.ink
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(x - 14 + i * 7 + Math.sin(t * 4 + i) * 2, y - 8 + (i % 2) * 5, 5 + (i % 3), 0, TAU)
        ctx.fill()
      }
    }
    // charm badge (dimmed until the lock opens)
    if (g.charm) {
      const bx = x - 38
      const by = y - 56
      ctx.globalAlpha = locked ? 0.5 : 1
      ctx.fillStyle = withAlpha(P.cream, 0.92)
      ctx.beginPath()
      ctx.arc(bx, by, 17, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = P.gold
      ctx.lineWidth = 2.5
      ctx.stroke()
      drawEnemyIcon(ctx, CHARM_ICON[g.charm.trait], bx, by + 1, 10)
      const a = geo.angles[g.charm.dir]
      ctx.fillStyle = P.gold
      ctx.beginPath()
      ctx.moveTo(bx + Math.cos(a) * 25, by + Math.sin(a) * 25)
      ctx.lineTo(bx + Math.cos(a + 0.5) * 16, by + Math.sin(a + 0.5) * 16)
      ctx.lineTo(bx + Math.cos(a - 0.5) * 16, by + Math.sin(a - 0.5) * 16)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // next arrivals: a light chip between the two branches, clear of the pads
    const next = incoming(sim, g, 3)
    if (next.length) {
      const R = 11
      const gap = 25
      const w = next.length * gap + 8
      const hh = R * 2 + 8
      const cy = y + 62
      const bx = x - w / 2
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.roundRect(bx + 1, cy - hh / 2 + 3, w, hh, hh / 2)
      ctx.fill()
      ctx.fillStyle = withAlpha(P.cream, 0.92)
      ctx.beginPath()
      ctx.roundRect(bx, cy - hh / 2, w, hh, hh / 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x - 6, cy - hh / 2 + 0.5)
      ctx.lineTo(x, cy - hh / 2 - 6)
      ctx.lineTo(x + 6, cy - hh / 2 + 0.5)
      ctx.fill()
      next.forEach((e, i) => drawEnemyIcon(ctx, e.def.id, bx + 4 + gap / 2 + i * gap, cy + 1, R))
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, sim: Sim) {
    ctx.globalCompositeOperation = 'lighter'
    for (const p of sim.projs) this.drawProj(ctx, p)
    ctx.globalCompositeOperation = 'source-over'
    const t = this.time
    for (const p of sim.projs) {
      if (p.kind === 'rocket') {
        const a = Math.atan2(p.vy, p.vx)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(a)
        ctx.fillStyle = P.cream
        ctx.beginPath()
        ctx.roundRect(-8, -3, 14, 6, 2)
        ctx.fill()
        ctx.fillStyle = P.coral
        ctx.beginPath()
        ctx.moveTo(6, -3)
        ctx.lineTo(11, 0)
        ctx.lineTo(6, 3)
        ctx.fill()
        ctx.restore()
      } else if (p.kind === 'feather') {
        // a 14x5 vane with a quill, wobbling and rolling as it flies
        const seed = p.sx * 0.37 + p.sy * 0.11
        const a = Math.atan2(p.vy, p.vx) + Math.sin(t * 14 + seed) * 0.16
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(a)
        ctx.scale(1, 0.6 + 0.4 * Math.abs(Math.cos(t * 11 + seed)))
        ctx.fillStyle = '#f2fbdc'
        ctx.beginPath()
        ctx.moveTo(7.5, 0)
        ctx.bezierCurveTo(4, -3.4, -3, -3.2, -6.5, -1.4)
        ctx.lineTo(-4.8, 0)
        ctx.lineTo(-6.5, 1.4)
        ctx.bezierCurveTo(-3, 3.2, 4, 3.4, 7.5, 0)
        ctx.fill()
        ctx.strokeStyle = '#5f7f24'
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(-8.5, 0)
        ctx.lineTo(7, 0)
        ctx.stroke()
        ctx.restore()
      } else if (p.kind === 'moth') {
        // twice the old size, wings flapping around a small body
        const seed = p.sx * 0.37 + p.sy * 0.11
        const flap = Math.abs(Math.sin(t * 22 + seed))
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2)
        ctx.fillStyle = '#fff1c8'
        for (const s of [-1, 1]) {
          const wx = s * (2 + flap * 3.2)
          ctx.beginPath()
          ctx.ellipse(wx, -1.5, 2 + flap * 4, 5.5, s * 0.35, 0, TAU)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(wx * 0.8, 3.5, 1.4 + flap * 2.6, 3.4, -s * 0.4, 0, TAU)
          ctx.fill()
        }
        ctx.fillStyle = '#8a6a2a'
        ctx.beginPath()
        ctx.ellipse(0, 0.5, 1.5, 4.2, 0, 0, TAU)
        ctx.fill()
        ctx.restore()
      }
    }
  }

  private drawProj(ctx: CanvasRenderingContext2D, p: Proj) {
    switch (p.kind) {
      case 'spark': {
        const sp = Math.hypot(p.vx, p.vy) || 1
        const tx = p.x - (p.vx / sp) * 16
        const ty = p.y - (p.vy / sp) * 16
        const hot = p.heavy
        ctx.strokeStyle = hot ? withAlpha(P.coral, 0.9) : withAlpha(P.amber, 0.9)
        ctx.lineWidth = p.dmg >= 3 ? 5 : 3.2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        ctx.drawImage(glowSprite(hot ? P.coral : P.amber, 32), p.x - 10, p.y - 10, 20, 20)
        break
      }
      case 'feather': {
        // short lime trail
        const sp = Math.hypot(p.vx, p.vy) || 1
        const ux = p.vx / sp
        const uy = p.vy / sp
        ctx.lineCap = 'round'
        ctx.strokeStyle = withAlpha(P.lime, 0.18)
        ctx.lineWidth = 7
        ctx.beginPath()
        ctx.moveTo(p.x - ux * 26, p.y - uy * 26)
        ctx.lineTo(p.x - ux * 4, p.y - uy * 4)
        ctx.stroke()
        ctx.strokeStyle = withAlpha(P.lime, 0.45)
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.moveTo(p.x - ux * 16, p.y - uy * 16)
        ctx.lineTo(p.x - ux * 3, p.y - uy * 3)
        ctx.stroke()
        ctx.drawImage(glowSprite(P.lime, 32), p.x - 13, p.y - 13, 26, 26)
        break
      }
      case 'firework':
      case 'mini': {
        const s = p.kind === 'mini' ? 12 : 20
        ctx.drawImage(glowSprite(P.coral, 32), p.x - s, p.y - s, s * 2, s * 2)
        ctx.fillStyle = '#ffe0c4'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.kind === 'mini' ? 2.5 : 4, 0, TAU)
        ctx.fill()
        if (Math.random() < 0.6) this.fx.add({ kind: 'spark', x: p.x, y: p.y, vx: vrand(-20, 20), vy: vrand(10, 40), life: 0.3, size: 2, color: P.amberHi })
        break
      }
      case 'rocket':
        ctx.drawImage(glowSprite(P.coral, 32), p.x - 14, p.y - 14, 28, 28)
        if (Math.random() < 0.8) this.fx.add({ kind: 'spark', x: p.x - p.vx * 0.02, y: p.y - p.vy * 0.02, vx: vrand(-30, 30), vy: vrand(-30, 30), life: 0.35, size: 2.4, color: P.amberHi })
        break
      case 'moth': {
        // gold dotted trail behind it
        const sp = Math.hypot(p.vx, p.vy) || 1
        const ux = p.vx / sp
        const uy = p.vy / sp
        const spr = glowSprite(P.gold, 32)
        for (let i = 1; i <= 4; i++) {
          const d = i * 7
          const s = 5.5 - i
          ctx.globalAlpha = 0.75 - i * 0.14
          ctx.drawImage(spr, p.x - ux * d - s, p.y - uy * d - s, s * 2, s * 2)
        }
        ctx.globalAlpha = 1
        ctx.drawImage(spr, p.x - 16, p.y - 16, 32, 32)
        break
      }
    }
  }

  private drawBeams(ctx: CanvasRenderingContext2D, sim: Sim) {
    ctx.globalCompositeOperation = 'lighter'
    for (const tw of sim.towers) {
      if (tw.def.kind !== 'beam') continue
      const h = 48 + (tw.b >= 1 ? 10 : 0)
      tw.beamTargets.forEach((tg, i) => {
        if (!tg || !tg.alive) return
        const lx = tw.x + (tw.stats.beams === 2 ? (i ? 7 : -7) : 0)
        const ly = tw.y - h - 10
        let ex = tg.x
        let ey = tg.y
        if (tw.stats.beamLine) {
          const a = Math.atan2(tg.y - ly, tg.x - lx)
          const r = sim.effRange(tw) * 1.05
          ex = tw.x + Math.cos(a) * r
          ey = tw.y + Math.sin(a) * r
        }
        const wob = 1 + Math.sin(this.time * 40 + i) * 0.15
        const base = tw.a >= 3 ? 11 : tw.a >= 1 ? 8 : 6
        for (const [wd, col, al] of [
          [base * 2.6 * wob, P.pale, 0.16],
          [base * 1.2 * wob, P.amberHi, 0.45],
          [base * 0.45, '#ffffff', 0.9],
        ] as const) {
          ctx.strokeStyle = withAlpha(col, al)
          ctx.lineWidth = wd
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(ex, ey)
          ctx.stroke()
        }
        ctx.drawImage(glowSprite(P.pale, 64), tg.x - 26, tg.y - 26, 52, 52)
        if (Math.random() < 0.3) this.fx.add({ kind: 'spark', x: tg.x, y: tg.y, vx: vrand(-80, 80), vy: vrand(-120, 0), life: 0.3, size: 2.5, color: P.pale })
      })
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawHome(ctx: CanvasRenderingContext2D, sim: Sim, dt: number) {
    const { x, y } = this.levelBuilt!.def.home
    const f = sim.lives / sim.maxLives
    const t = this.time
    this.lanternPulse += dt
    if (this.leakFlash > 0) this.leakFlash = Math.max(0, this.leakFlash - dt * 1.5)
    // victory flare: a big swell that eases back over a few seconds
    const flare = this.victoryT >= 0 ? Math.max(0, 1 - this.victoryT / 3) * (1 + Math.sin(this.victoryT * 9) * 0.15) : 0
    const fl = 0.85 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13.3) * 0.04 - this.leakFlash * 0.4
    const k = 0.35 + f * 0.65
    const gk = k * (1 + flare * 1.4)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, 0.55 * k * fl + flare * 0.4)
    ctx.drawImage(glowSprite(P.amber, 64), x - 150 * gk, y - 66 - 150 * gk, 300 * gk, 300 * gk)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    // post and frame
    ctx.fillStyle = '#2a1e16'
    ctx.fillRect(x - 4, y - 30, 8, 34)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(x + 3, y + 4, 30, 9, 0, 0, TAU)
    ctx.fill()
    // paper lantern
    const ly = y - 66
    const g = ctx.createRadialGradient(x - 8, ly - 10, 4, x, ly, 46)
    g.addColorStop(0, '#fff2cc')
    g.addColorStop(0.45, withAlpha(P.amber, 0.95 * k + 0.05))
    g.addColorStop(1, '#8a4a1a')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, ly, 28, 35, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(90,40,10,0.55)'
    ctx.lineWidth = 1.5
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.ellipse(x, ly, Math.abs(i) * 7 + 2, 35, 0, 0, TAU)
      ctx.stroke()
    }
    ctx.fillStyle = '#3a2618'
    ctx.beginPath()
    ctx.roundRect(x - 15, ly - 40, 30, 7, 3)
    ctx.roundRect(x - 15, ly + 33, 30, 7, 3)
    ctx.fill()
    // flame inside, sized by remaining light
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.9
    const fk = k * (1 + flare * 0.6)
    ctx.drawImage(glowSprite('#fff1b8', 64), x - 26 * fk, ly - 26 * fk, 52 * fk, 52 * fk)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (this.leakFlash > 0) {
      ctx.fillStyle = withAlpha(P.danger, this.leakFlash * 0.35)
      ctx.beginPath()
      ctx.ellipse(x, ly, 30, 37, 0, 0, TAU)
      ctx.fill()
    }
  }

  private drawAmbientMotes(ctx: CanvasRenderingContext2D) {
    if (this.settings.reduceMotion) return
    const t = this.time
    for (let i = 0; i < 18; i++) {
      const px = ((i * 137.5 + t * (6 + (i % 5))) % (WORLD_W + 80)) - 40
      const py = (i * 97.3 + Math.sin(t * 0.4 + i) * 40 + WORLD_H) % WORLD_H
      const a = 0.25 + 0.25 * Math.sin(t * 1.3 + i * 2)
      ctx.globalAlpha = a
      ctx.drawImage(glowSprite(P.amberHi, 32), px - 7, py - 7, 14, 14)
    }
    ctx.globalAlpha = 1
  }

  private drawHint(ctx: CanvasRenderingContext2D, x: number, y: number, label?: string) {
    const fs = this.fontPx(20 * this.fx.textScale)
    if (y < 150) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, -1)
      ctx.translate(-x, -y)
      this.drawHintArrow(ctx, x, y)
      ctx.restore()
      if (label) this.hintLabel(ctx, label, x, y + 94 + fs * 0.7, fs)
      return
    }
    this.drawHintArrow(ctx, x, y)
    if (label) this.hintLabel(ctx, label, x, y - 86 - fs * 0.35, fs)
  }

  private hintLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, fs: number) {
    ctx.font = `600 ${fs}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // keep the label on screen
    const w = ctx.measureText(label).width
    const left = -this.ox / this.scale + 8 / this.scale
    const right = (this.w - this.ox) / this.scale - 8 / this.scale
    x = Math.min(right - w / 2, Math.max(left + w / 2, x))
    ctx.lineWidth = Math.max(5, fs * 0.3)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(8,19,25,0.9)'
    ctx.strokeText(label, x, y)
    ctx.fillStyle = P.cream
    ctx.fillText(label, x, y)
  }

  private drawHintArrow(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const b = this.settings.reduceMotion ? 0 : Math.abs(Math.sin(this.time * 4)) * 12
    ctx.strokeStyle = withAlpha(P.amberHi, 0.9)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, 30 + (this.time * 30) % 20, 0, TAU)
    ctx.globalAlpha = 1 - ((this.time * 30) % 20) / 20
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = P.amberHi
    ctx.beginPath()
    ctx.moveTo(x, y - 40 - b)
    ctx.lineTo(x - 14, y - 62 - b)
    ctx.lineTo(x - 5, y - 62 - b)
    ctx.lineTo(x - 5, y - 80 - b)
    ctx.lineTo(x + 5, y - 80 - b)
    ctx.lineTo(x + 5, y - 62 - b)
    ctx.lineTo(x + 14, y - 62 - b)
    ctx.closePath()
    ctx.fill()
  }

  /** Hit-test in world units. Gates take priority because they are the core verb. */
  /**
   * A picture of the canal as the night ended, for sharing: the banks in bloom, the keepers where they stood,
   * the locks and the Great Lantern, with a caption band. 1080 x 1350 (4:5, what photo feeds show whole).
   */
  postcard(sim: Sim, text: PostcardText): HTMLCanvasElement {
    const W = 1080
    const H = 1350
    const BAND = 236
    const cv = document.createElement('canvas')
    cv.width = W
    cv.height = H
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = P.night0
    ctx.fillRect(0, 0, W, H)
    // the whole canal fits above the caption; the painted countryside fills the sides
    const top = sim.challenge.gardens ? -1030 : sim.challenge.harbour ? -480 : 0
    const k = (H - BAND - 24) / (WORLD_H - top)
    const ox = (W - WORLD_W * k) / 2
    const oy = 18 - top * k
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(k, k)
    const bg = renderBackground(this.levelBuilt!, this.decor, k)
    ctx.drawImage(bg, -BG_PAD_X, -BG_PAD_Y, WORLD_W + BG_PAD_X * 2, WORLD_H + BG_PAD_Y * 2)
    if (sim.challenge.harbour) this.drawHarbour(ctx, sim)
    if (sim.challenge.gardens) this.drawGardens(ctx, sim)
    if (sim.challenge.guard) drawSettlement(ctx, this.settlement, this.bunting, !!sim.challenge.harbour, !!sim.challenge.gardens)
    for (const b of this.blooms) paintBloom(ctx, b, this.bloomStyle, true)
    this.drawSluice(ctx, sim, false)
    for (const [i, p] of sim.pads.entries()) {
      if (!sim.padAvailable(i)) continue
      if (p.tower) drawPad(ctx, p.x, p.y, 'occupied', this.time, p.tower.def.hue, Math.max(p.tower.a, p.tower.b))
      else drawPad(ctx, p.x, p.y, 'empty', this.time)
    }
    for (const g of sim.gates) if (sim.gateAvailable(g)) this.drawGateBase(ctx, sim, g, 0)
    this.drawLandmarks(ctx, sim, 'under')
    for (const tw of [...sim.towers].sort((a, b) => a.y - b.y)) {
      drawTower(ctx, tw.x, tw.y, { id: tw.id, a: tw.a, b: tw.b, angle: tw.angle, since: 9, age: 9, upAge: 9, t: this.time, seed: tw.uid })
    }
    this.drawLandmarks(ctx, sim, 'over')
    for (const g of sim.gates) if (sim.gateAvailable(g)) this.drawGateTop(ctx, sim, g)
    this.drawHome(ctx, sim, 0)
    ctx.restore()
    // caption band: the canal fades into night under the words
    const fade = ctx.createLinearGradient(0, H - BAND - 90, 0, H - BAND + 30)
    fade.addColorStop(0, withAlpha(P.night0, 0))
    fade.addColorStop(1, P.night0)
    ctx.fillStyle = fade
    ctx.fillRect(0, H - BAND - 90, W, 120)
    ctx.fillStyle = P.night0
    ctx.fillRect(0, H - BAND + 30, W, BAND)
    const x = 72
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillStyle = text.won ? P.amberHi : P.cream
    ctx.font = `600 60px ${FONT}`
    ctx.fillText(text.title, x, H - BAND + 64, W - x * 2)
    ctx.fillStyle = '#b7c9c9'
    ctx.font = `500 34px ${FONT}`
    ctx.fillText(text.line1, x, H - BAND + 118, W - x * 2)
    ctx.fillText(text.line2, x, H - BAND + 162, W - x * 2)
    // wordmark, bottom right: the lantern mark and the name
    ctx.textAlign = 'right'
    ctx.font = `650 34px ${FONT}`
    const mark = 'locks'
    const markW = ctx.measureText(mark).width
    ctx.fillStyle = P.amber
    ctx.fillText(mark, W - x, H - 40)
    ctx.fillStyle = P.cream
    ctx.fillText('Lantern', W - x - markW, H - 40)
    ctx.textAlign = 'left'
    ctx.fillStyle = withAlpha(P.cream, 0.6)
    ctx.font = `500 26px ${FONT}`
    ctx.fillText(text.footer, x, H - 40, W / 2)
    return cv
  }

  pick(sim: Sim, wx: number, wy: number): Selection {
    for (const g of sim.gates) {
      if (!sim.gateAvailable(g)) continue
      if (Math.hypot(wx - g.def.x, wy - (g.def.y - 26)) < 52) return { kind: 'gate', gate: g }
    }
    let best: Selection = null
    let bd = 58
    for (let i = 0; i < sim.pads.length; i++) {
      if (!sim.padAvailable(i)) continue
      const p = sim.pads[i]
      const d = Math.hypot(wx - p.x, wy - (p.y - (p.tower ? 18 : 0)))
      if (d < bd) {
        bd = d
        best = p.tower ? { kind: 'tower', tower: p.tower } : { kind: 'pad', index: i }
      }
    }
    return best
  }
}

/** The next Mopes about to reach a gate along their current route, nearest first. */
export function incoming(sim: Sim, g: GateState, n: number): Enemy[] {
  const out: { e: Enemy; d: number }[] = []
  for (const e of sim.enemies) {
    const d = sim.distanceToGate(e, g.def.id)
    if (d !== null && d >= -4 && d < QUEUE_HORIZON) out.push({ e, d })
  }
  out.sort((a, b) => a.d - b.d)
  return out.slice(0, n).map((o) => o.e)
}

function haptic(ms: number) {
  if (hapticsEnabled) platformHaptic(ms)
}

export let hapticsEnabled = true
export function setHaptics(on: boolean) {
  hapticsEnabled = on
}

export { ENEMY_VIS }
