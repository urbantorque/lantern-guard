import { automaticTarget } from './auto-target'
import { fixedLevel, fixedWave, fixedStats, FIXED_UNLOCK, stageOf, upgradePrice, bondName, type Bond } from './fixed'
import { heroStats, heroTower, heroHitSlow, type HeroId } from './heroes'
import { contactTime } from './projectile-collision'
import { skyAt, skyReach, skyRate, skyDamage, skySpeed, gardenYield, type ClimateState } from './environment'
import { depthWave, expeditionWave, expeditionBonus, EXPEDITION_UNLOCK, hasSunReserve, landmark, nearLandmark, specialiseCrown, SUN_CAPACITY, SUN_PULSE_COST, SUN_PULSE_SECONDS, type ExpeditionId } from './watch-depth'
import { compactLevel, compactWave, COMPACT_END, STARTER_PLOTS, PLOTS, REFINEMENTS, refineStats } from './compact'
import { LATE_REFINEMENTS, LATE_TOWERS, PREPARATIONS, lateRefine, encounterWave, preparationCost, netDamage, type Preparation, type PreparationId } from './depth'
import { balanceTower, BEAM_SECONDARY_DAMAGE, GARDEN_REFINEMENT_COSTS, NIGHTFALL_LATE_BOSS_HEALTH } from './balance'
import { gardensLevel, GARDENS_END, GARDENS_WAVES } from './gardens'
import type { GuardianId } from './guardians'
import { BATTLE_PLANS, PLAN_ROUNDS, applyBattlePlans, type BattlePlanId } from './battle-plans'
import { waterwayLevel, REEDBANK_WAVES, type WaterwayId } from './waterways'
import { CANAL_STAGES, growingCanal, KEEPER_WAVE, stageForWave } from './canal-growth'
import { dist2, Rng } from '../core/math'
import {
  canUpgrade,
  CHARM_COST,
  CHARMS,
  FAMILY_BONUS,
  GATE_COOLDOWN,
  RICH_LEAK,
  SHELL_CHIP,
  SHROUD_FLOOR,
  SHROUD_TAKEN,
  SPOT_FRACTION,
  computeStats,
  DIFFICULTY,
  ENEMIES,
  TOWERS,
  type CharmTrait,
  type Difficulty,
  type EnemyDef,
  type EnemyId,
  type Priority,
  type TowerDef,
  type TowerId,
  type TowerStats,
} from './defs'
import { buildLevel, type BuiltLevel, type GateDef, type Segment } from './level'
import { tideWave, type TideSpec } from './tides'
import { freeplayWave, WAVES, type Group, type WaveDef } from './waves'
import { harbourLevel, HARBOUR_END, HARBOUR_WAVES, HARBOUR_WAVES_V2, wardenEscorts, WARDEN_GUARD_TAKEN } from './harbour'

export const DT = 1 / 60
export const FINAL_WAVE = WAVES.length
export const RELOCATE_COST = 25

export interface Enemy {
  escortOf?: number
  signalT?: number
  uid: number
  def: EnemyDef
  hp: number
  maxHp: number
  shell: number
  maxShell: number
  seg: Segment
  s: number
  x: number
  y: number
  tx: number
  ty: number
  speedBase: number
  speedNow: number
  slowT: number
  slowF: number
  stunT: number
  burnT: number
  burnDps: number
  brittleT: number
  revealedPerm: boolean
  seenT: number
  spawnCd: number
  wave: number
  alive: boolean
  remaining: number
  hitT: number
  age: number
  phase: number
  lastGate: string
  route: string
  /** >0 while continuous damage (beam, burn) is landing: drawn as a warm rim, not a white flash. */
  heatT: number
  /** Visual size multiplier (Old Gloom's halves draw smaller). */
  visScale: number
  /** Glow for cheering this Mope up, before lure and rich-run bonuses (Old Gloom's halves carry half each). */
  reward: number
  /** Sim time of the last white hit flash; flashes are throttled per Mope. */
  lastFlash: number
  /** Has travelled a short rich run (a channel with bonus > 1): escaping costs double light. */
  rich: boolean
  /** Old Gloom before its split: only a sliver of damage lands. Drawn as a shroud; cleared on split. */
  shrouded: boolean
  /** A Lamp Owl has already spotted this hidden Mope (it counts once, toward that owl's `spotted`). */
  owlSeen: boolean
}

export interface Tower {
  refinement?: number
  damageDealt?: number
  uid: number
  id: TowerId
  def: TowerDef
  pad: number
  x: number
  y: number
  a: number
  b: number
  stats: TowerStats
  cd: number
  priority: Priority
  spent: number
  pops: number
  angle: number
  tolls: number
  diveCd: number
  mothCd: number
  beamTargets: (Enemy | null)[]
  rangeMul: number
  rateMul: number
  bornT: number
  fireT: number
  upT: number
  /** Moonbell: toll hits landed (each Mope caught by each toll counts once). */
  slowed: number
  /** Lamp Owl: hidden Mopes this owl was first to spot (once per Mope). */
  spotted: number
  /** Glow Garden: glow produced, wave income plus its share of lure bonuses. Fractional: floor it for display. */
  earned: number
  harvest?: number
  healing?: number
  sunlight?: number
  sunPulse?: number
  sunCooldown?: number
}

export type ProjKind = 'spark' | 'feather' | 'firework' | 'rocket' | 'moth' | 'mini' | 'bolt'

export interface Proj {
  bounced?: boolean
  kind: ProjKind
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  target: Enemy | null
  dmg: number
  pierce: number
  heavy: boolean
  detect: boolean
  splash: number
  burn: number
  burnDur: number
  cluster: number
  hit: number[]
  life: number
  sx: number
  sy: number
  ex: number
  ey: number
  t: number
  dur: number
  tower: Tower
  alive: boolean
  brittleBonus: boolean
}

export interface GateState {
  def: GateDef
  state: 0 | 1
  charm: { trait: CharmTrait; dir: 0 | 1 } | null
  jammed: boolean
  cd: number
  flipT: number
  routeT: [number, number]
  flips: number
  /** Tidal locks: seconds until a lock opened onto its short run swings back to the long loop (0 = not counting). */
  swingT: number
}

export type SimEvent =
  | { t: 'arc'; x: number; y: number; tx: number; ty: number }
  | { t: 'prepare'; id: PreparationId; x: number; y: number }
  | { t: 'pop'; x: number; y: number; tx: number; ty: number; size: number; enemy: EnemyId; family: string; reward: number; lured: boolean; boss: boolean }
  | { t: 'combo'; x: number; y: number; count: number }
  | { t: 'bounce'; x: number; y: number; tx: number; ty: number }
  | { t: 'crack'; x: number; y: number }
  | { t: 'clink'; x: number; y: number }
  | { t: 'hit'; x: number; y: number; kind: ProjKind | 'beam' | 'toll' | 'burn'; hue: string }
  | { t: 'shoot'; x: number; y: number; tower: TowerId; angle: number }
  | { t: 'boom'; x: number; y: number; r: number; big: boolean }
  | { t: 'toll'; x: number; y: number; r: number; stun: boolean; tier: number }
  /** weight is the light lost, already doubled for a Mope that travelled a rich run (rich). */
  | { t: 'leak'; x: number; y: number; weight: number; rich: boolean }
  /** auto: a tidal lock swung back on its own. */
  | { t: 'gate'; gate: string; dir: 0 | 1; auto?: boolean }
  | { t: 'route'; gate: string; dir: 0 | 1 }
  | { t: 'waveStart'; n: number }
  | { t: 'waveEnd'; n: number; bonus: number; income: number }
  | { t: 'expand'; stage: number }
  | { t: 'income'; x: number; y: number; amount: number }
  | { t: 'victory' }
  | { t: 'defeat' }
  | { t: 'spawn'; x: number; y: number; type: EnemyId; boss: boolean }
  | { t: 'unlock'; gate: string }
  | { t: 'source'; source: string }
  | { t: 'dive'; x: number; y: number; tx: number; ty: number }
  | { t: 'phase'; x: number; y: number }
  | { t: 'jam'; gate: string; on: boolean }
  | { t: 'build'; x: number; y: number; tower: TowerId }
  | { t: 'upgrade'; x: number; y: number; tier: number }
  | { t: 'sell'; x: number; y: number; amount: number }
  | { t: 'charm'; gate: string }
  | { t: 'life'; amount: number }
  | { t: 'feature'; kind: 'reveal' | 'crack'; x: number; y: number }
  | { t: 'split'; x: number; y: number }

/** Rules a night is played under. Plain nights use {}; tides and weekly nights set several. */
export interface Challenge {
  fixed?: 1
  watchDepth?: 1
  expedition?: ExpeditionId
  /** Absent on pre-hero watches, whose exact balance is preserved. */
  hero?: HeroId
  commission?: string
  blockedPad?: number
  practice?: boolean
  /** Bounded beam piercing, neutral boss colours and revised late tower roles. */
  balance?: 1
  skirmish?: { from: number; to: number; glow: number; seed: number }
  /** Extra towers, preparations and later upgrades. Old saves retain their rules. */
  depth?: 1
  /** Fixed mobile board and paid plots. Versioned independently from legacy campaigns. */
  compact?: 1
  /** Run-specific tower choices, introduced with Stone Weir. */
  plans?: 1
  variant?: number
  /** Authored Harbour encounters, fixed when this chapter opens. */
  harbourEncounters?: 1
  /** Optional second chapter, entered from a completed growing canal. */
  harbour?: 1
  gardens?: 1
  guardian?: 'ember' | 'reed' | 'tide'
  /** Lantern Guard rules. Opt-in for new growing nights; older saves keep their balance. */
  guard?: 1
  /** Versioned growing canal; absent on legacy saves and challenge nights. */
  expanding?: 1
  waterway?: WaterwayId
  lockedGates?: boolean
  noGarden?: boolean
  noCharms?: boolean
  /** Only these keepers can be built. */
  keepers?: TowerId[]
  /** Speed multiplier for ordinary Mopes (bosses keep their pace). */
  swift?: number
  /** Shell toughness multiplier. */
  thick?: number
  /** Tidal locks: a lock opened onto its short run swings back to the long loop after this many seconds. */
  tidal?: number
  /** A tide: the night opens after wave `from` with a bank of glow and plays seeded waves to the end. */
  tide?: TideSpec
  /** Record key of a daily tide or weekly night ('daily:2026-09-27'); absent on plain nights. */
  id?: string
}

export interface RunStats {
  plotsUnlocked?: number
  retries?: number
  routePlans?: number
  pops: number
  leaked: number
  flips: number
  glowEarned: number
  built: number
  upgrades: number
  charms: number
  time: number
  popsBy: Partial<Record<TowerId, number>>
  towersUsed: TowerId[]
  leaksBy: Partial<Record<EnemyId, number>>
  leakRoutes: Record<string, number>
  firstBuildAt: number
  firstFlipWave: number
  earlyCalls: number
  maxTier: number
  /** Sim time spent with a wave on the water (spawners or Mopes present); stats.time also counts build time. */
  activeTime: number
  /** Mopes cheered up, by kind (each half of Old Gloom counts a half). */
  cheered: Partial<Record<EnemyId, number>>
}

/** A keeper as saved. The timers are only present in v2 saves. */
export interface SavedTower {
  refinement?: number
  damageDealt?: number
  id: TowerId
  pad: number
  a: number
  b: number
  priority: Priority
  spent: number
  pops: number
  uid?: number
  cd?: number
  diveCd?: number
  mothCd?: number
  tolls?: number
  angle?: number
  /** Beam target uids (0 for none). */
  beams?: number[]
  bornT?: number
  fireT?: number
  upT?: number
  slowed?: number
  spotted?: number
  earned?: number
  harvest?: number
  healing?: number
  sunlight?: number
  sunPulse?: number
  sunCooldown?: number
}

/** A lock as saved. Everything past the charm is only present in v2 saves. */
export interface SavedGate {
  state: 0 | 1
  charm: { trait: CharmTrait; dir: 0 | 1 } | null
  jammed?: boolean
  cd?: number
  flipT?: number
  routeT?: [number, number]
  flips?: number
  swingT?: number
}

/** A Mope on the water, as saved in v2. */
export interface SavedEnemy {
  escortOf?: number
  signalT?: number
  uid: number
  type: EnemyId
  seg: string
  s: number
  hp: number
  maxHp: number
  shell: number
  maxShell: number
  wave: number
  route: string
  lastGate: string
  revealedPerm: boolean
  seenT: number
  phase: number
  spawnCd: number
  speedBase: number
  slowT: number
  slowF: number
  stunT: number
  burnT: number
  burnDps: number
  brittleT: number
  visScale: number
  reward: number
  age: number
  /** Old Gloom has already torn in two (its def copy no longer has splitAtGate). */
  split: boolean
  /** Absent in older v2 saves: derived from the route and channel on restore. */
  rich?: boolean
  shrouded?: boolean
  owlSeen?: boolean
}

/** A wave group still releasing Mopes: `group` indexes that wave's WaveDef.groups. */
export interface SavedSpawner {
  wave: number
  group: number
  t: number
  spawned: number
}

/** A shot in flight. target: Mope uid, 0 for none, -1 for one already gone. tower: keeper uid. */
export type SavedProj = Omit<Proj, 'target' | 'tower' | 'alive'> & { target: number; tower: number }

interface SnapshotBase {
  difficulty: Difficulty
  challenge: Challenge
  wave: number
  glow: number
  lives: number
  seed: number
  towers: SavedTower[]
  gates: SavedGate[]
  stats: RunStats
  won: boolean
}

/** Between-waves save (older builds). */
export interface SaveSnapshotV1 extends SnapshotBase {
  v: 1
}

/** Full save, valid at any moment including mid-wave. Restores to an identical simulation. */
export interface SaveSnapshotV2 extends SnapshotBase {
  climate?: ClimateState
  bonds?: Bond[]
  preparation?: Preparation | null
  preparationRound?: number
  battlePlans?: BattlePlanId[]
  plots?: number[]
  waveReports?: WaveReport[]
  lastLeak?: LeakReport | null
  embers?: EmberPatch[]
  v: 2
  canalStage?: number
  over: 'won' | 'lost' | null
  freeplay: boolean
  freeplayFrom: number
  time: number
  glowFrac: number
  uid: number
  rngDraws: number
  openSources: string[]
  wavesPending: number[]
  waveAlive: [number, number][]
  spawners: SavedSpawner[]
  enemies: SavedEnemy[]
  projs: SavedProj[]
}

export type SaveSnapshot = SaveSnapshotV1 | SaveSnapshotV2
export interface WaveReport { wave: number; slowSplashHits: number; damage: Partial<Record<TowerId, number>> }
export interface EmberPatch { x: number; y: number; radius: number; life: number; dps: number; tower: number }
export interface LeakReport { enemy: EnemyId; route: string; hidden: boolean; armoured: boolean; wave: number; light: number }

interface Spawner {
  group: Group
  /** Index of the group within its wave's WaveDef (for saves). */
  index: number
  wave: number
  t: number
  spawned: number
}

const CELL = 56

export class Sim {
  climate:ClimateState = {elapsed:0,waveSeconds:0,gardenExposure:0}
  get sky() {return skyAt(this.climate.elapsed,this.seed)}
  level: BuiltLevel
  difficulty: Difficulty
  challenge: Challenge
  rng: Rng
  seed: number
  glow: number
  glowFrac = 0
  lives: number
  maxLives: number
  wave = 0
  canalStage = 0
  plots = new Set<number>(STARTER_PLOTS)
  battlePlans: BattlePlanId[] = []
  preparation: Preparation | null = null
  preparationRound = 0
  time = 0
  enemies: Enemy[] = []
  towers: Tower[] = []
  projs: Proj[] = []
  waveReports: WaveReport[] = []
  embers: EmberPatch[] = []
  lastLeak: LeakReport | null = null
  gates: GateState[]
  pads: { x: number; y: number; tower: Tower | null }[]
  events: SimEvent[] = []
  spawners: Spawner[] = []
  waveAlive = new Map<number, number>()
  wavesPending = new Set<number>()
  openSources = new Set<string>(['north'])
  over: 'won' | 'lost' | null = null
  won = false
  freeplay = false
  /** 0 until the player continues into free play after a win; then the wave reached at that moment (free-play waves = wave - freeplayFrom). */
  freeplayFrom = 0
  stats: RunStats = { pops: 0, leaked: 0, flips: 0, glowEarned: 0, built: 0, upgrades: 0, charms: 0, time: 0, popsBy: {}, towersUsed: [], leaksBy: {}, leakRoutes: {}, firstBuildAt: -1, firstFlipWave: -1, earlyCalls: 0, maxTier: 0, activeTime: 0, cheered: {} }
  bonds: Bond[] = []
  private uid = 1
  /** Seeded draws so far, so a restored run can fast-forward the generator. */
  private rngDraws = 0
  private grid = new Map<number, Enemy[]>()
  private hpMul: number
  private speedMul: number

  constructor(difficulty: Difficulty = 'standard', challenge: Challenge = {}, seed = 7) {
    seed = challenge.skirmish?.seed ?? seed
    this.difficulty = difficulty
    this.challenge = challenge
    this.seed = seed
    this.rng = new Rng(seed)
    const d = DIFFICULTY[difficulty]
    this.glow = d.glow + (challenge.compact ? 80 : 0)
    this.lives = d.lives
    this.maxLives = d.lives
    this.hpMul = d.hp
    this.speedMul = d.speed
    this.level = buildLevel(challenge.fixed ? fixedLevel(challenge.variant) : challenge.compact ? compactLevel(challenge.variant) : challenge.expanding ? growingCanal(0, !!challenge.guard) : challenge.guard ? growingCanal(2, true) : waterwayLevel(challenge.waterway))
    this.gates = this.level.def.gates.map((g) => ({ def: g, state: g.lockedDir, charm: null, jammed: false, cd: 0, flipT: -9, routeT: [-9, -9], flips: 0, swingT: 0 }))
    this.pads = this.level.def.pads.map((p) => ({ x: p.x, y: p.y, tower: null }))
    // a tide opens mid-night: the locks and the sluice are already open, and there is a bank to build with
    const tide = challenge.tide
    if (tide) {
      this.wave = tide.from
      this.glow = tide.glow
      for (const src of this.level.def.sources) if (src.openWave <= tide.from) this.openSources.add(src.id)
    }
    const short = challenge.skirmish
    if (short && !challenge.fixed) {
      this.wave = short.from; this.glow = short.glow
      this.plots = new Set(PLOTS.flatMap((p, i) => p.wave <= this.planningWave ? [i] : []))
      for (const src of this.level.def.sources) if (src.openWave <= this.planningWave) this.openSources.add(src.id)
      const defence: [number, TowerId, number, number][] = short.from === 10
        ? [[0, 'wick', 2, 1], [3, 'cracker', 1, 0], [6, 'bell', 1, 0]]
        : [[0, 'wick', 3, 1], [3, 'cracker', 2, 1], [6, 'bell', 2, 1], [10, 'owl', 1, 2]]
      if (challenge.variant === 3) for (const tower of defence) {
        // The Stone Weir inlet skips the upper loop. Its starting support guards the lower bank.
        tower[0] = tower[1] === 'cracker' ? 6 : tower[1] === 'bell' ? 10 : tower[1] === 'owl' ? 7 : 0
      }
      for (const [pad, id, a, b] of defence) {
        const t = this.build(pad, id)!
        for (let i = 0; i < a; i++) this.upgrade(t, 0)
        for (let i = 0; i < b; i++) this.upgrade(t, 1)
      }
      this.events = []
    }
    if (short && challenge.fixed) {
      if(challenge.expedition)this.level.def.sources=this.level.def.sources.map(s=>({...s,openWave:s.id==='west'?6:s.openWave}))
      this.climate.elapsed = short.from * 30
      this.wave = short.from; this.glow = short.glow
      this.plots = new Set(PLOTS.flatMap((p,i) => p.wave <= this.planningWave ? [i] : []))
      for (const source of this.level.def.sources) if(source.openWave <= this.planningWave) this.openSources.add(source.id)
      if (challenge.commission === 'garden') { this.glow += TOWERS.garden.cost; this.build(0,'garden') }
    }
    this.recomputeRoutes()
    this.buildGateDistances()
  }

  // ------------------------------------------------------------------ queries

  /** Path distance from each segment's start to each gate it flows into (following plain segment links only). */
  private segGateDist = new Map<string, Map<string, number>>()

  private buildGateDistances() {
    this.segGateDist.clear()
    for (const seg of this.level.segs.values()) {
      const m = new Map<string, number>()
      let acc = 0
      let cur: Segment | undefined = seg
      for (let guard = 0; cur && guard < 12; guard++) {
        acc += cur.line.length
        const nx: import('./level').NextRef = cur.next
        if ('gate' in nx) {
          m.set(nx.gate, acc)
          break
        }
        if ('home' in nx) break
        cur = this.level.segs.get(nx.seg)
      }
      this.segGateDist.set(seg.id, m)
    }
  }

  /** How far a Mope must still travel to reach a gate, or null if that gate is not ahead of it. */
  distanceToGate(e: Enemy, gateId: string): number | null {
    const d = this.segGateDist.get(e.seg.id)?.get(gateId)
    return d === undefined ? null : d - e.s
  }

  /** Lets gate cooldowns run on real time while the simulation is paused. */
  tickCooldowns(dt: number) {
    for (const g of this.gates) if (g.cd > 0) g.cd = Math.max(0, g.cd - dt)
  }

  gateLocked(g: GateState): boolean {
    return !this.gateAvailable(g) || !!this.challenge.lockedGates || this.planningWave < g.def.unlockWave
  }

  gateEffectiveDir(g: GateState): 0 | 1 {
    return this.planningWave < g.def.unlockWave ? g.def.lockedDir : g.state
  }

  get planningWave(): number {
    return this.wave + ((this.challenge.expanding || this.challenge.guard) && !this.waveActive && !this.over ? 1 : 0)
  }

  padAvailable(index: number): boolean {
    if (this.challenge.fixed && this.challenge.blockedPad === index) return false
    if (this.challenge.compact) return this.plots.has(index)
    if (this.challenge.harbour) return index >= 0 && index < this.pads.length
    return !this.challenge.expanding || (CANAL_STAGES[this.canalStage].pads as readonly number[]).includes(index)
  }

  padRevealed(index: number): boolean {
    return this.challenge.compact ? !!PLOTS[index] && this.planningWave >= (this.challenge.expedition?1+Math.floor((PLOTS[index].wave-1)/2.5):PLOTS[index].wave) : this.padAvailable(index)
  }

  plotCost(index: number): number | null {
    return this.challenge.fixed && this.challenge.blockedPad === index ? null : this.challenge.compact && this.padRevealed(index) && !this.plots.has(index) ? PLOTS[index].cost : null
  }

  unlockPlot(index: number): boolean {
    const cost = this.plotCost(index)
    if (cost === null || this.over || this.waveActive && !this.challenge.fixed || this.glow < cost) return false
    this.glow -= cost
    this.plots.add(index)
    this.stats.plotsUnlocked = (this.stats.plotsUnlocked ?? 0) + 1
    return true
  }

  get pendingPlan(): number | null {
    if (!this.challenge.plans || this.waveActive || this.over) return null
    return PLAN_ROUNDS.find(wave => this.wave >= wave && !this.battlePlans.some(id => BATTLE_PLANS[id].wave === wave)) ?? null
  }

  chooseBattlePlan(id: BattlePlanId): boolean {
    if (!Object.hasOwn(BATTLE_PLANS, id) || BATTLE_PLANS[id].wave !== this.pendingPlan) return false
    this.battlePlans.push(id)
    for (const tower of this.towers) tower.stats = this.towerStats(tower.id, tower.a, tower.b, tower.refinement)
    this.recomputeAuras()
    return true
  }

  get preparationOffer(): number | null {
    if (this.challenge.fixed) return null
    if (!this.challenge.depth || this.isChallenge || this.waveActive || this.over || this.freeplay || this.wave < 5 || this.wave >= 40) return null
    const round = Math.floor(this.wave / 5) * 5
    return round > this.preparationRound ? round : null
  }

  prepare(id: PreparationId): boolean {
    const round = this.preparationOffer
    if (!round || !Object.hasOwn(PREPARATIONS, id) || this.glow < preparationCost(round) || this.preparation) return false
    this.glow -= preparationCost(round)
    this.preparationRound = round
    this.preparation = { id, round, wave: this.wave + 1, charges: id === 'net' ? 8 : id === 'ward' ? 4 : 0 }
    return true
  }

  activePreparation(id: PreparationId, wave = this.wave): boolean {
    return this.preparation?.id === id && this.preparation.wave === wave
  }

  gateAvailable(g: GateState): boolean {
    return g.def.outs.every(id => this.level.segs.has(id))
  }

  /** Only called on an empty canal, or before restoring its saved occupants. */
  private revealCanal(stage: number) {
    this.canalStage = stage
    const base = growingCanal(stage, !!this.challenge.guard)
    const harbour = this.challenge.harbour ? harbourLevel(base) : base
    this.level = buildLevel(this.challenge.gardens ? gardensLevel(harbour) : harbour)
    while (this.pads.length < this.level.def.pads.length) this.pads.push({ ...this.level.def.pads[this.pads.length], tower: null })
    this.gates.forEach((g, i) => { g.def = this.level.def.gates[i] })
    this.recomputeRoutes()
    this.buildGateDistances()
  }

  /** Waves skipped before a tide opens (0 on a full night). Player-facing wave numbers subtract it. */
  get waveOffset(): number {
    return this.challenge.skirmish?.from ?? this.challenge.tide?.from ?? 0
  }

  /** Daily tides and weekly nights end at dawn: no free play, and their results go to the challenge log. */
  get isChallenge(): boolean {
    return !!this.challenge.id
  }

  /** Whether this keeper may be built under the night's rules. */
  keeperWave(id: TowerId): number { if(this.challenge.expedition)return EXPEDITION_UNLOCK[id]; if (this.challenge.fixed) return FIXED_UNLOCK[id]; return this.challenge.compact && id === 'garden' ? 6 : KEEPER_WAVE[id] }

  keeperAllowed(id: TowerId): boolean {
    if (this.challenge.fixed) return this.planningWave >= this.keeperWave(id) && !(id === 'garden' && this.challenge.noGarden)
    if (LATE_TOWERS.includes(id) && !this.challenge.depth) return false
    if ((this.challenge.expanding || this.challenge.compact) && this.planningWave < this.keeperWave(id)) return false
    if (id === 'garden' && this.challenge.noGarden) return false
    const k = this.challenge.keepers
    return !k || k.includes(id)
  }

  get waveActive(): boolean {
    return this.spawners.length > 0 || this.enemies.length > 0
  }

  /** Even with auto-start enabled, a newly revealed section gets a manual planning break. */
  get expansionPlanning(): boolean {
    if (this.challenge.compact) return !this.waveActive && [5, 10, 15, 20, 25, 29, 30, 34, 35, 39].includes(this.wave)
    return !!this.challenge.expanding && !this.waveActive && CANAL_STAGES.some(s => s.wave === this.wave + 1 && s.wave > 1)
  }

  canStartWave(): boolean {
    if (this.challenge.fixed && this.waveActive) return false
    if (this.over) return false
    if (this.preparation && this.waveActive) return false
    if (this.challenge.skirmish && this.waveActive) return false
    if (this.challenge.compact && this.waveActive && ([6, 11, 16, 21, 25].includes(this.wave + 1) || this.wave >= 25)) return false
    if (this.wave >= this.finalWave && !this.freeplay) return false
    if (this.challenge.harbour && this.waveActive && !this.freeplay) return false
    if (this.challenge.guard && [8, 10, 16, 25].includes(this.wave + 1) && this.waveActive) return false
    // Expansions happen in a planning break, never under moving Mopes.
    if (this.challenge.expanding && stageForWave(this.wave + 1) > this.canalStage && this.waveActive) return false
    return this.spawners.length === 0
  }

  waveDef(n: number): WaveDef {
    if (this.challenge.expedition) return expeditionWave(this.challenge.expedition,n)
    if (this.challenge.fixed) {
      const wave=fixedWave(n,this.challenge.variant ?? 0,this.seed)
      return this.challenge.watchDepth?depthWave(wave,n,this.seed):wave
    }
    if (this.challenge.compact) {
      const wave = compactWave(n, this.challenge.variant ?? 0, this.seed)
      if (this.challenge.skirmish && n === this.waveOffset + 1) wave.note = 'Enemies use both entrances. Upgrade the starting defence and cover the lower bank.'
      return this.challenge.depth ? encounterWave(wave, n, this.seed) : wave
    }
    if (this.challenge.gardens && n > HARBOUR_END && n <= GARDENS_END) return GARDENS_WAVES[n - HARBOUR_END - 1]
    if (this.challenge.harbour && n > FINAL_WAVE && n <= HARBOUR_END) return (this.challenge.harbourEncounters ? HARBOUR_WAVES_V2 : HARBOUR_WAVES)[n - FINAL_WAVE - 1]
    const tide = this.challenge.tide
    if (tide && n > tide.from && n <= FINAL_WAVE) return tideWave(tide, n)
    if ((this.challenge.expanding || this.challenge.guard) && n <= FINAL_WAVE) {
      const notes: Record<number, string> = {
        2: 'The Lower Lock is open. Its short Mill run pays double glow, but escapees cost double light.',
        3: 'Skitters are fast. Moonbells slow groups; the East loop gives your towers more time.',
        4: 'Glow Gardens earn extra glow each wave. Keep attacking towers on the water too.',
        6: 'Mopes now enter upstream. Your original towers still guard the Great Lantern. Crackers handle this Wisp swarm.',
        7: 'Lighthouses are ready. Their heavy beam is good for Bloats and armour.',
      }
      if (this.challenge.guard) Object.assign(notes, {
        2: 'Tap the Lower Lock to compare routes. Choose the water your towers cover best.',
        5: 'Shellbacks arrive. Cracker bursts and heavy upgrades crack armour; the Mill is another option.',
        8: 'Hidden Veils arrive. Put a Lamp Owl beside your damage towers, or use the Lantern bridge.',
        10: 'Gloomtoad jams its nearby lock. Plan a route through your strongest towers before it arrives.',
        13: 'Mixed crowds. Moonbell slows groups while nearby Crackers keep bursting.',
        16: 'Veiled Shells need sight and heavy hits together. Pair an Owl with heavy towers.',
        25: 'Old Gloom splits at the Lower Lock. Both lower branches need strong towers; its shroud falls at the split.',
      })
      return { ...WAVES[n - 1], note: notes[n] ?? WAVES[n - 1].note }
    }
    return n <= FINAL_WAVE ? (this.challenge.waterway === 'reedbank' ? REEDBANK_WAVES : WAVES)[n - 1] : freeplayWave(n - FINAL_WAVE, this.seed)
  }

  towerCost(id: TowerId): number {
    return TOWERS[id].cost
  }

  /** Support coverage improves in new nights without rewriting legacy towers or saves. */
  towerStats(id: TowerId, a: number, b: number, refinement = 0) {
    if (this.challenge.fixed) {
      const stats=heroStats(fixedStats(id,a,b,refinement),id,this.challenge.hero)
      if(this.challenge.watchDepth){
        if(id==='owl'&&b>=2)stats.damage*=.75
        if(refinement)specialiseCrown(stats,id,b)
      }
      return stats
    }
    const stats = computeStats(id, a, b)
    if (this.challenge.guard && (id === 'bell' || id === 'owl')) stats.range += 20
    if (this.challenge.compact) {
      // A garden competes with a damage tower for a scarce plot; its return is deliberately slower.
      if (id === 'garden') { stats.income = Math.round(stats.income * .8); stats.lure *= .5 }
      if (id === 'beam') stats.damage *= .85
      if (this.challenge.balance) balanceTower(stats, id, b)
      if (id === 'bell' && this.challenge.guardian === 'tide') { stats.slow = Math.min(.75, stats.slow + .15); stats.interval *= 1.25 }
      refineStats(stats, this.challenge.depth ? Math.min(2, refinement) : refinement)
      if (this.challenge.depth) lateRefine(stats, id, refinement)
      if (this.challenge.plans) applyBattlePlans(stats, id, this.battlePlans)
    }
    return stats
  }

  refinementCost(t: Tower): number | null {
    if (this.challenge.fixed) return stageOf(t) === 3 && this.planningWave >= (this.challenge.expedition?10:31) ? upgradePrice(t) : null
    const next = this.refinementOffer(t)
    return this.challenge.compact && next && Math.max(t.a, t.b) === 3 && this.planningWave >= next.wave ? next.cost : null
  }

  refinementOffer(t: Tower) {
    const rank = t.refinement ?? 0, next = this.refinements[rank]
    return next && { ...next, cost: this.challenge.balance && t.id === 'garden' ? GARDEN_REFINEMENT_COSTS[rank] : next.cost }
  }

  get refinements() { return this.challenge.depth ? [...REFINEMENTS, ...LATE_REFINEMENTS] : [...REFINEMENTS] }

  refine(t: Tower): boolean {
    const cost = this.refinementCost(t)
    if (cost === null || this.glow < cost || this.over || !this.towers.includes(t)) return false
    this.glow -= cost; t.spent += cost; t.refinement = (t.refinement ?? 0) + 1
    t.stats = this.towerStats(t.id, t.a, t.b, t.refinement)
    t.upT = this.time; this.stats.upgrades++
    this.recomputeAuras()
    this.events.push({ t: 'upgrade', x: t.x, y: t.y, tier: 3 })
    return true
  }

  get guardPlanning(): boolean {
    return !!this.challenge.guard && !this.waveActive && (!!this.pendingPlan || !!this.challenge.harbour || [8, 10, 16, 25].includes(this.wave + 1))
  }

  get finalWave() { return this.challenge.skirmish?.to ?? (this.challenge.compact ? COMPACT_END : this.challenge.gardens ? GARDENS_END : this.challenge.harbour ? HARBOUR_END : FINAL_WAVE) }

  continueHarbour(): boolean {
    if (!this.challenge.guard || !this.challenge.expanding || this.challenge.harbour || this.isChallenge || this.over !== 'won' || this.freeplay || this.wave !== FINAL_WAVE) return false
    this.challenge = { ...this.challenge, harbour: 1, harbourEncounters: 1 }
    this.over = null
    this.won = false
    this.revealCanal(2)
    this.events.push({ t: 'expand', stage: 3 })
    return true
  }

  get guardianBreak(): boolean {
    return !!this.challenge.guard && !!(this.challenge.expanding || this.challenge.compact) && !this.isChallenge && this.over === 'won' && !this.freeplay && !this.waveActive
  }

  /** Unlock eligibility is checked by the profile layer before calling this rule action. */
  changeGuardian(id: GuardianId): boolean {
    if (!this.guardianBreak || !['lantern', 'ember', 'reed', 'tide'].includes(id) || (id === 'tide' && !this.challenge.compact)) return false
    this.challenge = { ...this.challenge }
    if (id === 'lantern') delete this.challenge.guardian
    else this.challenge.guardian = id
    // Finished-wave projectiles and ground fire must not leak the previous guardian into a chapter.
    this.projs = []; this.embers = []
    for (const t of this.towers) t.stats = this.towerStats(t.id, t.a, t.b, t.refinement)
    this.recomputeAuras()
    return true
  }

  continueGardens(): boolean {
    if (!this.challenge.guard || !this.challenge.harbour || this.challenge.gardens || this.isChallenge || this.over !== 'won' || this.freeplay || this.wave !== HARBOUR_END) return false
    this.challenge = { ...this.challenge, gardens: 1 }
    this.over = null; this.won = false
    this.revealCanal(2)
    this.openSources.add('west')
    this.events.push({ t: 'expand', stage: 4 })
    return true
  }

  sellValue(t: Tower): number {
    return Math.floor(t.spent * 0.75)
  }

  upgradeCost(t: Tower, path: 0 | 1): number | null {
    if (this.challenge.fixed) {
      const stage = stageOf(t)
      if (stage >= 3 || stage === 2 && this.planningWave < (this.challenge.expedition?7:16) || stage === 0 && path === 1) return null
      if (stage === 2 && path !== (t.b ? 1 : 0)) return null
      return upgradePrice(t)
    }
    if (!canUpgrade(t.a, t.b, path)) return null
    const tier = path === 0 ? t.a : t.b
    return t.def.paths[path].tiers[tier].cost
  }

  canRelocate(t: Tower): boolean {
    return !!this.challenge.guard && (!this.isChallenge || !!this.challenge.fixed) && !this.over && (!this.waveActive || !!this.challenge.fixed) && this.towers.includes(t)
  }

  /** Preview destination support without moving or resetting the tower. */
  rangeAt(t: Tower, x: number, y: number): number {
    if (t.id === 'garden') return t.stats.range
    let bonus = 0
    for (const other of this.towers) {
      if (other !== t && other.id === 'owl' && dist2(x, y, other.x, other.y) <= other.stats.range ** 2) bonus = Math.max(bonus, other.stats.auraRange)
    }
    const warded=this.towers.some(o=>o.id==='owl'&&dist2(o.x,o.y,x,y)<=o.stats.range**2)
    return t.stats.range * (1 + bonus) * (this.challenge.fixed?skyReach(t.id,this.sky,warded):1)
  }

  /** Moving never rebuilds: timers, income, upgrades, credit and sell value stay attached. */
  relocate(t: Tower, padIndex: number): boolean {
    const pad = this.pads[padIndex]
    if (!this.canRelocate(t) || !pad || pad.tower || !this.padAvailable(padIndex) || this.glow < RELOCATE_COST) return false
    this.glow -= RELOCATE_COST
    this.pads[t.pad].tower = null
    pad.tower = t
    t.pad = padIndex
    t.x = pad.x
    t.y = pad.y
    this.recomputeAuras()
    this.syncBonds()
    return true
  }

  effRange(t: Tower): number {
    return t.stats.range * t.rangeMul * (this.challenge.fixed?skyReach(t.id,this.sky,this.sheltered(t)):1)
  }

  /** Owl shelter never stacks and uses its base sight, so it cannot recurse through auras. */
  sheltered(t:Tower):boolean {
    return this.sunlit(t)||this.towers.some(o=>o.id==='owl'&&dist2(o.x,o.y,t.x,t.y)<=o.stats.range**2)
  }

  canSee(e: Enemy, detect: boolean): boolean {
    return !e.def.hidden || e.revealedPerm || e.seenT > 0 || detect || this.sunlit(e) || !!this.challenge.watchDepth&&landmark(this).id==='moonwell'&&this.sky.night&&this.climate.elapsed%12<4&&nearLandmark(this,e)
  }

  get charmsAllowed(): boolean {
    if (this.challenge.guard) return false
    if (this.challenge.expanding && this.planningWave < 8) return false
    return !this.challenge.lockedGates && !this.challenge.noCharms && DIFFICULTY[this.difficulty].charms
  }

  // ------------------------------------------------------------------ actions

  build(padIndex: number, id: TowerId): Tower | null {
    const pad = this.pads[padIndex]
    if (!pad || !this.padAvailable(padIndex) || pad.tower || this.over) return null
    if (!this.keeperAllowed(id)) return null
    const cost = TOWERS[id].cost
    if (this.glow < cost) return null
    this.glow -= cost
    const t: Tower = {
      uid: this.uid++,
      id,
      def: this.challenge.fixed?heroTower(id,this.challenge.hero):TOWERS[id],
      pad: padIndex,
      x: pad.x,
      y: pad.y,
      a: 0,
      b: 0,
      stats: this.towerStats(id, 0, 0),
      cd: 0.15,
      priority: id === 'ballista' ? 'strong' : 'first',
      spent: cost,
      pops: 0,
      angle: -Math.PI / 2,
      tolls: 0,
      diveCd: 3,
      mothCd: 0.5,
      beamTargets: [null, null],
      rangeMul: 1,
      rateMul: 1,
      bornT: this.time,
      fireT: -9,
      upT: -9,
      slowed: 0,
      spotted: 0,
      earned: 0,
      ...(this.challenge.fixed?{harvest:0,healing:0}:{}),
    }
    pad.tower = t
    this.towers.push(t)
    this.stats.built++
    if (this.stats.firstBuildAt < 0) this.stats.firstBuildAt = this.stats.time
    if (!this.stats.towersUsed.includes(id)) this.stats.towersUsed.push(id)
    this.recomputeAuras()
    this.events.push({ t: 'build', x: t.x, y: t.y, tower: id })
    this.syncBonds()
    return t
  }

  upgrade(t: Tower, path: 0 | 1): boolean {
    const cost = this.upgradeCost(t, path)
    if (cost == null || this.glow < cost || this.over || !this.towers.includes(t)) return false
    this.glow -= cost
    t.spent += cost
    if (this.challenge.fixed && stageOf(t) === 1) { t.a = path === 0 ? 2 : 0; t.b = path === 1 ? 2 : 0 }
    else if (path === 0) t.a++
    else t.b++
    t.stats = this.towerStats(t.id, t.a, t.b, t.refinement)
    t.upT = this.time
    this.stats.upgrades++
    this.stats.maxTier = Math.max(this.stats.maxTier, t.a, t.b)
    this.recomputeAuras()
    this.events.push({ t: 'upgrade', x: t.x, y: t.y, tier: Math.max(t.a, t.b) })
    this.syncBonds()
    return true
  }

  /** Buy the shared foundation and chosen stream together, with no extra fee. */
  specialiseCost(t:Tower):number|null {
    if(!this.challenge.fixed||stageOf(t)>1)return null
    return Math.round(TOWERS[t.id].cost*1.3)+(stageOf(t)===0?upgradePrice(t)!:0)
  }

  specialise(t:Tower,path:0|1):boolean {
    const cost=this.specialiseCost(t)
    if(cost===null||this.glow<cost||this.over||!this.towers.includes(t))return false
    if(stageOf(t)===0){this.upgrade(t,0);this.events.pop()} // One visible celebration for the bundled purchase.
    return this.upgrade(t,path)
  }

  sell(t: Tower) {
    if (!this.towers.includes(t) || this.over || this.challenge.fixed && this.challenge.commission === 'garden' && t.id === 'garden') return
    this.bonds = this.bonds.filter(b => b.a !== t.uid && b.b !== t.uid)
    const v = this.sellValue(t)
    this.glow += v
    this.pads[t.pad].tower = null
    this.towers = this.towers.filter((x) => x !== t)
    this.recomputeAuras()
    this.events.push({ t: 'sell', x: t.x, y: t.y, amount: v })
    this.syncBonds()
  }

  canFlip(g: GateState): boolean {
    return !this.challenge.fixed && !this.gateLocked(g) && !g.jammed && !this.over && g.cd <= 0
  }

  flipGate(g: GateState): boolean {
    if (!this.canFlip(g)) return false
    g.state = g.state === 0 ? 1 : 0
    g.flipT = this.time
    g.cd = this.challenge.guard && !this.waveActive ? 0 : GATE_COOLDOWN
    // a tidal lock opened onto its short run starts counting down to swing back; closing it stops the count
    g.swingT = this.challenge.tidal && g.state !== g.def.lockedDir ? this.challenge.tidal : 0
    g.flips++
    this.stats.flips++
    if (this.stats.firstFlipWave < 0) this.stats.firstFlipWave = this.wave
    this.recomputeRoutes()
    this.events.push({ t: 'gate', gate: g.def.id, dir: g.state })
    return true
  }

  setCharm(g: GateState, trait: CharmTrait | null, dir: 0 | 1 = 0): boolean {
    if (!this.charmsAllowed) return false
    // a locked gate ignores charms, so never sell one (removing an old one is still allowed)
    if (trait !== null && this.gateLocked(g)) return false
    if (trait === null) {
      if (g.charm) this.glow += Math.floor(CHARM_COST * 0.75)
      g.charm = null
      return true
    }
    const replacing = g.charm !== null
    if (!replacing && this.glow < CHARM_COST) return false
    if (!replacing) {
      this.glow -= CHARM_COST
      this.stats.charms++
    }
    g.charm = { trait, dir }
    this.events.push({ t: 'charm', gate: g.def.id })
    return true
  }

  /** Glow granted for calling the next wave while Mopes are still on the water. */
  earlyBonus(): number {
    if (this.challenge.fixed) return 0
    if (this.enemies.length === 0 || this.wave === 0) return 0
    return Math.round(12 + this.wave * 2.5)
  }

  startWave(): boolean {
    if (!this.canStartWave()) return false
    if(this.challenge.fixed){this.climate.waveSeconds=0;this.climate.gardenExposure=0;for(const t of this.towers){t.harvest=0;t.healing=0}}
    this.lastLeak = null
    const early = this.earlyBonus()
    if (early > 0) {
      this.glow += early
      this.stats.glowEarned += early
      this.stats.earlyCalls++
      this.events.push({ t: 'income', x: this.level.def.home.x, y: this.level.def.home.y - 60, amount: early })
    }
    this.wave++
    if (this.challenge.guard) this.waveReports.push({ wave: this.wave, slowSplashHits: 0, damage: {} })
    if (this.wave > this.finalWave) this.freeplay = true
    const def = this.waveDef(this.wave)
    for (const src of this.level.def.sources) {
      if (src.openWave === this.wave && !this.openSources.has(src.id)) {
        this.openSources.add(src.id)
        this.events.push({ t: 'source', source: src.id })
      }
    }
    for (const g of this.gates) if (g.def.unlockWave === this.wave) this.events.push({ t: 'unlock', gate: g.def.id })
    def.groups.forEach((grp, index) => this.spawners.push({ group: grp, index, wave: this.wave, t: -grp.at, spawned: 0 }))
    this.wavesPending.add(this.wave)
    this.waveAlive.set(this.wave, 0)
    this.recomputeRoutes()
    this.events.push({ t: 'waveStart', n: this.wave })
    return true
  }

  // ------------------------------------------------------------------ simulation

  step(dt = DT) {
    if (this.over) return
    this.time += dt
    this.stats.time += dt
    if (this.waveActive) {
      this.stats.activeTime += dt
      if(this.challenge.fixed){
        const exposure=gardenYield(this.sky)*dt
        this.climate.gardenExposure+=exposure
        // Live purchases earn only for the time each tier actually worked.
        for(const t of this.towers)if(t.id==='garden'){
          const terrace=this.challenge.watchDepth&&landmark(this).id==='sunterrace'&&!this.sky.night&&nearLandmark(this,t)?1.12:1
          t.harvest=(t.harvest??0)+t.stats.income*exposure*terrace
          t.healing=(t.healing??0)+t.stats.lifePerWave*dt
        }
        this.climate.waveSeconds+=dt
        this.climate.elapsed+=dt
      }
    }
    for (const g of this.gates) if (g.cd > 0) g.cd -= dt
    this.updateTidalLocks(dt)
    this.runSpawners(dt)
    this.buildGrid()
    this.updateVisibility(dt)
    this.updateGates()
    this.updateEnemies(dt)
    this.buildGrid()
    this.updateTowers(dt)
    this.updateProjs(dt)
    if (this.embers.length) this.updateEmbers(dt)
    this.enemies = this.enemies.filter((e) => e.alive)
    this.projs = this.projs.filter((p) => p.alive)
    this.checkWaves()
    if (this.over) this.settle()
  }

  /** The run just ended: leave a neutral final frame (no jammed locks, no beam hum). */
  private settle() {
    this.beamIntensity = 0
    for (const g of this.gates) {
      if (!g.jammed) continue
      g.jammed = false
      this.events.push({ t: 'jam', gate: g.def.id, on: false })
    }
  }

  /** Tidal locks swing back to their long loop once their count runs out (a jammed lock waits for the boss to pass). */
  private updateTidalLocks(dt: number) {
    for (const g of this.gates) {
      if (g.swingT <= 0) continue
      g.swingT = Math.max(0, g.swingT - dt)
      if (g.swingT > 0) continue
      if (g.jammed) {
        g.swingT = 1e-6
        continue
      }
      if (g.state === g.def.lockedDir) continue
      g.state = g.def.lockedDir
      g.flipT = this.time
      this.recomputeRoutes()
      this.events.push({ t: 'gate', gate: g.def.id, dir: g.state, auto: true })
    }
  }

  private runSpawners(dt: number) {
    for (const sp of this.spawners) {
      sp.t += dt
      const grp = sp.group
      while (sp.spawned < grp.count && sp.t >= sp.spawned * grp.gap) {
        const src = grp.src && this.openSources.has(grp.src) ? grp.src : 'north'
        const segId = this.level.def.sources.find((s) => s.id === src)!.seg
        this.spawnEnemy(grp.type, this.level.segs.get(segId)!, 0, sp.wave)
        sp.spawned++
      }
    }
    this.spawners = this.spawners.filter((sp) => sp.spawned < sp.group.count)
  }

  /** silent: no boss 'spawn' event (Old Gloom's twin, restored saves). */
  spawnEnemy(type: EnemyId, seg: Segment, s: number, wave: number, silent = false): Enemy {
    const def = this.challenge.fixed && (type === 'toad' || type === 'gloom' || this.challenge.watchDepth && type === 'warden') ? { ...ENEMIES[type], jams: false, spawn: undefined } : ENEMIES[type]
    // harder modes ease in: full toughness only arrives by wave 15
    const ramp = this.hpMul >= 1 ? 1 + (this.hpMul - 1) * Math.min(1, Math.max(0, wave - (this.challenge.compact ? 8 : 4)) / (this.challenge.compact ? 12 : 11)) : this.hpMul
    // the night deepens: Mopes grow a little tougher each wave after the eleventh, bosses more gently after the tenth
    const d = DIFFICULTY[this.difficulty]
    const lw = Math.min(wave, FINAL_WAVE)
    const deep = Math.max(0, lw - 11)
    // Keep Nightfall's ordinary late enemies tougher than Standard after their opening ramp.
    const lateRate = this.challenge.guard && this.difficulty === 'nightfall' ? 0.25 : d.late
    const late = def.boss ? 1 + Math.max(0, lw - 10) * d.bossLate : 1 + deep * lateRate + deep * deep * d.late2
    const bossHealth = this.challenge.balance && this.difficulty === 'nightfall' && (type === 'warden' || type === 'bloomheart') ? NIGHTFALL_LATE_BOSS_HEALTH : 1
    let hp = def.hp * ramp * late * bossHealth * (this.challenge.compact && def.id === 'bloomheart' ? .7 : 1) * (this.freeplay ? 1 + (this.wave - (this.challenge.compact ? COMPACT_END : FINAL_WAVE)) * 0.06 : 1)
    let shell = (def.shell ?? 0) * ramp * late * (this.challenge.thick ?? 1)
    if (this.challenge.fixed) {
      const mode = this.difficulty === 'relaxed' ? .78 : this.difficulty === 'nightfall' ? 1 + .22*Math.min(1,Math.max(0,wave-10)/25) : 1
      const growth = def.boss ? 1 + Math.max(0,wave-10)*.045 : 1 + Math.max(0,wave-6)*.1
      hp = def.hp * mode * growth
      shell = (def.shell ?? 0)* mode * growth
      if (type === 'warden') hp *= .7
      if (type === 'bloomheart') hp *= .65
      // Twelve-wave expeditions have a smaller economy than a 40-wave watch.
      // Escalate ordinary pressure gradually; scale the final boss to that budget.
      if(this.challenge.expedition){
        if(def.boss){hp*=type==='toad'?2:type==='gloom'?.52:type==='warden'?.48:1;shell*=.7}
        else{hp*=1+Math.max(0,wave-5)*.08;shell*=1+Math.max(0,wave-5)*.04}
      }
    }
    const e: Enemy = {
      uid: this.uid++,
      def,
      hp,
      maxHp: hp,
      shell,
      maxShell: shell,
      seg,
      s,
      x: 0,
      y: 0,
      tx: 0,
      ty: 1,
      // a swift current hurries ordinary Mopes; bosses keep their pace
      speedBase: def.speed * this.speedMul * (def.boss ? 1 : (this.challenge.swift ?? 1)),
      speedNow: def.speed,
      slowT: 0,
      slowF: 0,
      stunT: 0,
      burnT: 0,
      burnDps: 0,
      brittleT: 0,
      revealedPerm: false,
      seenT: 0,
      spawnCd: def.spawn ? def.spawn.every : 0,
      wave,
      alive: true,
      remaining: 0,
      hitT: 0,
      age: 0,
      phase: 0,
      lastGate: '',
      route: '',
      heatT: 0,
      visScale: 1,
      reward: def.reward * (this.challenge.fixed ? .25 : 1),
      lastFlash: -9,
      rich: seg.bonus > 1,
      shrouded: !!def.splitAtGate,
      owlSeen: false,
    }
    const p = seg.line.at(s, { x: 0, y: 0, tx: 0, ty: 0 })
    e.x = p.x
    e.y = p.y
    e.tx = p.tx
    e.ty = p.ty
    e.remaining = seg.toHome - s
    this.enemies.push(e)
    this.waveAlive.set(wave, (this.waveAlive.get(wave) ?? 0) + 1)
    if (def.boss && !silent) this.events.push({ t: 'spawn', x: e.x, y: e.y, type, boss: true })
    return e
  }

  /** Seeded draw, counted for saves. */
  private rand(a: number, b: number) {
    this.rngDraws++
    return this.rng.range(a, b)
  }

  private buildGrid() {
    this.grid.clear()
    for (const e of this.enemies) {
      if (!e.alive) continue
      const k = this.cellKey(e.x, e.y)
      let arr = this.grid.get(k)
      if (!arr) {
        arr = []
        this.grid.set(k, arr)
      }
      arr.push(e)
    }
  }

  private cellKey(x: number, y: number) {
    return (Math.floor((x + 200) / CELL) << 8) | Math.floor((y + 200) / CELL)
  }

  /** Enemies whose centre lies within r (+ their radius) of (x, y). */
  private near(x: number, y: number, r: number, out: Enemy[]): Enemy[] {
    out.length = 0
    const reach = r + 56
    const x0 = Math.floor((x - reach + 200) / CELL)
    const x1 = Math.floor((x + reach + 200) / CELL)
    const y0 = Math.floor((y - reach + 200) / CELL)
    const y1 = Math.floor((y + reach + 200) / CELL)
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.grid.get((cx << 8) | cy)
        if (!arr) continue
        for (const e of arr) {
          if (!e.alive) continue
          const rr = r + e.def.radius
          if (dist2(x, y, e.x, e.y) <= rr * rr) out.push(e)
        }
      }
    }
    return out
  }

  /** Every keeper spots Veils up close; the Lamp Owl spots them across its whole sight. */
  private updateVisibility(dt: number) {
    for (const e of this.enemies) if (e.seenT > 0) e.seenT -= dt
    if(this.challenge.watchDepth){
      const well=landmark(this).id==='moonwell'&&this.sky.night&&this.climate.elapsed%12<4
      for(const e of this.enemies)if(e.def.hidden&&(this.sunlit(e)||well&&nearLandmark(this,e)))e.seenT=Math.max(e.seenT,.12)
    }
    for (const t of this.towers) {
      if (t.id === 'garden') continue
      const owl = t.id === 'owl'
      const r = owl ? this.effRange(t) : this.effRange(t) * SPOT_FRACTION
      for (const e of this.near(t.x, t.y, r, tmpA)) {
        if (!e.def.hidden) continue
        e.seenT = this.challenge.guard ? Math.max(e.seenT, owl ? 0.8 : 0.12) : 0.12
        // each hidden Mope counts once, for the first owl to spot it while it is still veiled
        if (owl && !e.owlSeen && !e.revealedPerm) {
          e.owlSeen = true
          t.spotted++
        }
      }
    }
  }

  private updateGates() {
    for (const g of this.gates) {
      let jam = false
      for (const e of this.enemies) {
        if (e.def.jams && dist2(e.x, e.y, g.def.x, g.def.y) < (e.def.radius + 46) ** 2) {
          jam = true
          break
        }
      }
      if (jam !== g.jammed) {
        g.jammed = jam
        this.events.push({ t: 'jam', gate: g.def.id, on: jam })
      }
    }
  }

  private chooseDir(g: GateState, e: Enemy): 0 | 1 {
    if (this.wave < g.def.unlockWave) return g.def.lockedDir
    if (g.charm && CHARMS[g.charm.trait].test(e)) return g.charm.dir
    return g.state
  }

  private updateWarden(e: Enemy, dt: number) {
    if (e.phase === 0 && e.hp <= e.maxHp * .7) {
      e.phase = 1
      e.signalT = 2.4
      this.events.push({ t: 'phase', x: e.x, y: e.y })
    } else if (e.phase === 1) {
      e.signalT = Math.max(0, (e.signalT ?? 0) - dt)
      if (e.signalT === 0) {
        e.phase = 2
        for (let i = 0; i < 4; i++) {
          const escort = this.spawnEnemy('skiff', e.seg, Math.max(0, e.s + 22 + i * 22), e.wave)
          this.inherit(escort, e)
          escort.escortOf = e.uid
          // Escorts travel in formation until their armour breaks and they accelerate away.
          escort.speedBase = e.speedBase * 1.1
        }
        this.events.push({ t: 'phase', x: e.x, y: e.y })
      }
    } else if (e.phase === 2 && e.hp <= e.maxHp * .35) {
      e.phase = 3
      e.speedBase *= 1.3
      this.events.push({ t: 'phase', x: e.x, y: e.y })
    }
  }

  private updateEnemies(dt: number) {
    const pos = { x: 0, y: 0, tx: 0, ty: 0 }
    const gardens = this.towers.filter((t) => t.id === 'garden' && t.stats.gardenSlow > 0)
    for (const e of this.enemies) {
      if (!e.alive) continue
      e.age += dt
      if (e.hitT > 0) e.hitT -= dt
      if (e.heatT > 0) e.heatT -= dt
      if (e.brittleT > 0) e.brittleT -= dt
      // damage over time
      if (e.burnT > 0) {
        e.burnT -= dt
        this.damage(e, e.burnDps * dt, true, null, true)
        if (!e.alive) continue
        if (e.burnT <= 0) e.burnDps = 0
      }
      // healing aura
      if (e.def.heal) {
        for (const o of this.near(e.x, e.y, e.def.heal.radius, tmpA)) {
          if (o !== e && !o.def.boss && o.hp < o.maxHp) o.hp = Math.min(o.maxHp, o.hp + e.def.heal.rate * dt)
        }
      }
      if (this.challenge.fixed && e.def.id === 'toad' && e.phase === 0 && e.hp <= e.maxHp*.5) {
        e.phase=1
        for(let i=0;i<6;i++) this.inherit(this.spawnEnemy('drip',e.seg,Math.max(0,e.s-20-i*18),e.wave),e)
        this.events.push({t:'phase',x:e.x,y:e.y})
      }
      // boss minions and phases
      if (e.def.spawn) {
        e.spawnCd -= dt
        if (e.spawnCd <= 0) {
          e.spawnCd = e.def.spawn.every
          this.inherit(this.spawnEnemy(e.def.spawn.type, e.seg, Math.max(0, e.s - e.def.radius), e.wave), e)
        }
      }
      if (e.def.id === 'gloom' && !this.challenge.fixed) {
        const f = e.hp / e.maxHp
        // each half of a split Old Gloom calls up half the brood
        const half = !e.def.splitAtGate
        if (e.phase === 0 && f < 0.66) {
          e.phase = 1
          this.events.push({ t: 'phase', x: e.x, y: e.y })
          for (let i = 0; i < (half ? 3 : 6); i++) this.inherit(this.spawnEnemy('veil', e.seg, Math.max(0, e.s - 20 - i * 14), e.wave), e)
        } else if (e.phase === 1 && f < 0.33) {
          e.phase = 2
          e.speedBase *= 1.35
          this.events.push({ t: 'phase', x: e.x, y: e.y })
          for (let i = 0; i < (half ? 2 : 3); i++) this.inherit(this.spawnEnemy('bloat', e.seg, Math.max(0, e.s - 30 - i * 26), e.wave), e)
        }
      }
      if (e.def.id === 'bloomheart') {
        if ((e.phase === 0 && e.hp <= e.maxHp * .7) || (e.phase === 2 && e.hp <= e.maxHp * .35)) {
          e.phase++; e.signalT = 3
          this.events.push({ t: 'phase', x: e.x, y: e.y })
        } else if (e.phase === 1 || e.phase === 3) {
          e.signalT = Math.max(0, (e.signalT ?? 0) - dt)
          if (!e.signalT) {
            for (const other of this.enemies) if (other.alive && !other.def.boss && dist2(e.x, e.y, other.x, other.y) <= 160 ** 2) other.hp = Math.min(other.maxHp, other.hp + other.maxHp * .5)
            e.phase++
            this.events.push({ t: 'phase', x: e.x, y: e.y })
          }
        }
      }
      // speed
      let slow = 0
      if (e.slowT > 0) {
        e.slowT -= dt
        slow = e.slowF
      } else e.slowF = 0
      for (const gd of gardens) {
        if (dist2(e.x, e.y, gd.x, gd.y) < gd.stats.range * gd.stats.range) slow = Math.max(slow, gd.stats.gardenSlow)
      }
      if (e.def.boss) slow *= 0.5
      if (e.def.id === 'warden' && (this.challenge.harbourEncounters || this.challenge.compact)) this.updateWarden(e, dt)
      if (e.def.id === 'warden' && !this.challenge.compact && !this.challenge.harbourEncounters && e.phase === 0 && e.hp < e.maxHp * .5) {
        e.phase = 1
        e.speedBase *= 1.3
        this.events.push({ t: 'phase', x: e.x, y: e.y })
        for (let i = 0; i < 4; i++) this.inherit(this.spawnEnemy('skiff', e.seg, Math.max(0, e.s - 24 * (i + 1)), e.wave), e)
      }
      let speed = e.speedBase * (1 - slow) * (this.challenge.fixed?skySpeed(this.sky):1)
      if(this.challenge.watchDepth&&landmark(this).id==='tidebell'&&nearLandmark(this,e))speed*=this.sky.night?.92:.96
      if (e.def.id === 'skiff' && e.shell <= 0) speed *= 1.6
      if (e.stunT > 0) {
        e.stunT -= dt
        speed = 0
      }
      e.speedNow = speed
      const prevS = e.s
      const prevSeg = e.seg
      e.s += speed * dt
      // channel landmarks act on Mopes as they pass
      const ft = prevSeg.feature
      if (ft && prevS < ft.at && e.s >= ft.at) this.applyFeature(e, ft.kind)
      // walk the graph
      let guard = 0
      while (e.s >= e.seg.line.length && guard++ < 8) {
        const over = e.s - e.seg.line.length
        const nx = e.seg.next
        if ('home' in nx) {
          this.leak(e)
          break
        }
        if ('seg' in nx) {
          e.seg = this.level.segs.get(nx.seg)!
          e.s = over
          if (this.challenge.fixed && nx.seg === 'm1' && e.def.id === 'gloom' && e.shrouded) this.splitFixedGloom(e)
          if (nx.seg === 'h' && !e.def.boss && this.activePreparation('net', e.wave) && this.preparation!.charges > 0) {
            this.preparation!.charges--
            e.slowF = Math.max(e.slowF, .5); e.slowT = Math.max(e.slowT, 3)
            this.events.push({ t: 'prepare', id: 'net', x: e.x, y: e.y })
            this.damage(e, netDamage(this.preparation!.round), true, null)
            if (!e.alive) break
          }
          if (e.def.id === 'reedling' && e.phase === 0 && (nx.seg === 'garden-merge' || (this.challenge.compact && nx.seg === 'm1'))) {
            e.phase = 1; e.shell = e.maxShell = 16 * this.hpMul
          }
          if (e.seg.bonus > 1) e.rich = true
        } else {
          const g = this.gates.find((q) => q.def.id === nx.gate)!
          const dir = this.chooseDir(g, e)
          const wasRich = e.rich
          g.routeT[dir] = this.time
          e.lastGate = g.def.id
          e.route += g.def.id[0] + dir
          e.seg = this.level.segs.get(g.def.outs[dir])!
          e.s = over
          if (e.seg.bonus > 1) e.rich = true
          if (e.def.splitAtGate === g.def.id) this.splitAtGate(e, g, dir, over, wasRich)
        }
      }
      if (!e.alive) continue
      e.seg.line.at(e.s, pos)
      e.x = pos.x
      e.y = pos.y
      e.tx = pos.tx
      e.ty = pos.ty
      e.remaining = e.seg.toHome - e.s
    }
  }

  private splitFixedGloom(e: Enemy) {
    e.hp /= 2; e.maxHp /= 2; e.reward /= 2; e.visScale = .8; e.shrouded = false
    const twin = this.spawnEnemy('gloom',e.seg,0,e.wave,true)
    Object.assign(twin,{hp:e.hp,maxHp:e.maxHp,reward:e.reward,visScale:.8,shrouded:false,stunT:1.5,route:e.route})
    e.def = halfGloom(e.def); twin.def = e.def
    this.events.push({t:'split',x:e.x,y:e.y})
  }

  private applyFeature(e: Enemy, kind: 'reveal' | 'crack') {
    if (kind === 'reveal' && e.def.hidden && !e.revealedPerm) {
      e.revealedPerm = true
      this.events.push({ t: 'feature', kind, x: e.x, y: e.y })
    } else if (kind === 'crack' && e.shell > 0) {
      e.shell = 0
      e.hitT = 0.12
      this.events.push({ t: 'crack', x: e.x, y: e.y })
      this.events.push({ t: 'feature', kind, x: e.x, y: e.y })
    }
  }

  /** Old Gloom tears in two at its gate: one half down each channel. Its shroud falls away. */
  private splitAtGate(e: Enemy, g: GateState, dir: 0 | 1, over: number, wasRich: boolean) {
    e.hp /= 2
    e.maxHp /= 2
    // the reward is shared, so both halves together still pay the full amount
    e.reward /= 2
    e.visScale = 0.8
    e.shrouded = false
    const other = (dir === 0 ? 1 : 0) as 0 | 1
    const twin = this.spawnEnemy(e.def.id, this.level.segs.get(g.def.outs[other])!, over, e.wave, true)
    twin.hp = e.hp
    twin.maxHp = e.maxHp
    twin.reward = e.reward
    twin.visScale = e.visScale
    twin.phase = e.phase
    twin.speedBase = e.speedBase
    twin.lastGate = g.def.id
    twin.route = e.route.slice(0, -1) + other
    twin.rich ||= wasRich
    twin.shrouded = false
    // the halves take turns calling minions, so together they keep the whole's rhythm
    twin.spawnCd = e.spawnCd + (e.def.spawn?.every ?? 0)
    e.def = halfGloom(e.def)
    twin.def = e.def
    g.routeT[other] = this.time
    this.events.push({ t: 'split', x: g.def.x, y: g.def.y })
  }

  /** Mopes born from another (splits, spits, phases) carry its route history, rich-run risk included. */
  private inherit(child: Enemy, parent: Enemy) {
    child.lastGate = parent.lastGate
    child.route = parent.route
    child.rich ||= parent.rich
  }

  private leak(e: Enemy) {
    e.alive = false
    this.decWave(e.wave)
    // greed has a price: escapees from a short rich run cost double light
    let w = e.def.weight * (e.rich ? RICH_LEAK : 1)
    if (this.activePreparation('ward', e.wave) && this.preparation!.charges > 0) {
      const saved = Math.min(w, this.preparation!.charges)
      this.preparation!.charges -= saved; w -= saved
      this.events.push({ t: 'prepare', id: 'ward', x: e.x, y: e.y })
      if (!w) return
    }
    if (this.challenge.guard) this.lastLeak = { enemy: e.def.id, route: e.route, hidden: !!e.def.hidden && !e.revealedPerm && e.seenT <= 0, armoured: e.shell > 0, wave: e.wave, light: w }
    this.lives = Math.max(0, this.lives - w)
    this.stats.leaked += w
    this.stats.leaksBy[e.def.id] = (this.stats.leaksBy[e.def.id] ?? 0) + w
    const rk = e.route || 'direct'
    this.stats.leakRoutes[rk] = (this.stats.leakRoutes[rk] ?? 0) + w
    this.events.push({ t: 'leak', x: e.x, y: e.y, weight: w, rich: e.rich })
    if (this.lives <= 0 && !this.over) {
      this.over = 'lost'
      this.events.push({ t: 'defeat' })
    }
  }

  private decWave(w: number) {
    this.waveAlive.set(w, (this.waveAlive.get(w) ?? 1) - 1)
  }

  /** Apply damage; returns true if any damage landed. */
  damage(e: Enemy, amount: number, heavy: boolean, src: Tower | null, continuous = false): boolean {
    if (!e.alive || amount <= 0) return false
    if(this.challenge.fixed&&src)amount*=skyDamage(src.id,this.sky)
    if(this.challenge.watchDepth&&src?.id==='storm'&&landmark(this).id==='stormgarden'&&nearLandmark(this,src))amount*=this.sky.weather==='rain'?1.12:1.05
    if(this.challenge.fixed&&src&&!continuous){const slow=heroHitSlow(this.challenge.hero,src.id);if(slow){e.slowF=Math.max(e.slowF,slow.amount);e.slowT=Math.max(e.slowT,slow.duration)}}
    const before = Math.max(0, e.hp) + Math.max(0, e.shell)
    if (this.challenge.fixed && src && (!continuous||this.challenge.watchDepth&&src.id==='beam')) heavy = this.applyBond(e,src,heavy)
    if (e.brittleT > 0) amount += continuous ? amount * 0.25 : 1
    if (!this.challenge.fixed && src && src.def.family === e.def.family && !(this.challenge.balance && e.def.boss)) amount *= FAMILY_BONUS
    if (e.def.id === 'warden' && wardenEscorts(this, e).length) amount *= WARDEN_GUARD_TAKEN
    if (e.shell > 0) {
      if (!heavy) {
        // light hits only chip shells: a soft counter, never an immunity
        amount *= SHELL_CHIP
        if (!continuous) this.events.push({ t: 'clink', x: e.x, y: e.y })
      }
      const absorbed = Math.min(e.shell, amount)
      if (src && this.challenge.guard) src.damageDealt = (src.damageDealt ?? 0) + absorbed
      e.shell -= absorbed
      amount -= absorbed
      if (e.shell <= 0.0001) {
        e.shell = 0
        this.events.push({ t: 'crack', x: e.x, y: e.y })
      }
    }
    // beams and burns warm the rim; discrete hits flash white, at most every 0.2 s
    if (continuous) e.heatT = 0.15
    else if (this.time - e.lastFlash >= 0.2) {
      e.hitT = 0.07
      e.lastFlash = this.time
    }
    if (amount <= 0) { this.reportDamage(e, src, before); return true }
    // Old Gloom's shroud: only a sliver lands before the split, and never enough to stop it
    if (e.shrouded) amount = Math.min(amount * (this.challenge.guard ? 0.45 : SHROUD_TAKEN), Math.max(0, e.hp - e.maxHp * SHROUD_FLOOR))
    if (src && this.challenge.guard) src.damageDealt = (src.damageDealt ?? 0) + Math.min(e.hp, amount)
    e.hp -= amount
    this.reportDamage(e, src, before)
    if (e.hp <= 0.0001) this.kill(e, src)
    return true
  }

  private reportDamage(e: Enemy, src: Tower | null, before: number) {
    if (!src) return
    const report = this.waveReports.find(r => r.wave === e.wave)
    if (report) report.damage[src.id] = (report.damage[src.id] ?? 0) + Math.max(0, before - Math.max(0, e.hp) - Math.max(0, e.shell))
  }

  private kill(e: Enemy, src: Tower | null) {
    e.alive = false
    this.decWave(e.wave)
    let lure = 0
    let lurer: Tower | null = null
    for (const t of this.towers) {
      if (t.id === 'garden' && t.stats.lure > lure && dist2(e.x, e.y, t.x, t.y) < t.stats.range * t.stats.range) {
        lure = t.stats.lure
        lurer = t
      }
    }
    const routeBonus = this.challenge.guard ? (e.rich ? 2 : 1) : e.seg.bonus
    const reward = e.reward * (1 + lure) * routeBonus
    if (lurer) lurer.earned += e.reward * lure * routeBonus
    this.glowFrac += reward
    const whole = Math.floor(this.glowFrac)
    this.glowFrac -= whole
    this.glow += whole
    this.stats.glowEarned += whole
    this.stats.pops++
    // a half of Old Gloom counts a half, so a whole Old Gloom counts once
    const share = ENEMIES[e.def.id].splitAtGate && !e.def.splitAtGate ? 0.5 : 1
    this.stats.cheered[e.def.id] = (this.stats.cheered[e.def.id] ?? 0) + share
    if (src) {
      src.pops++
      this.stats.popsBy[src.id] = (this.stats.popsBy[src.id] ?? 0) + 1
    }
    this.events.push({ t: 'pop', x: e.x, y: e.y, tx: e.tx, ty: e.ty, size: e.def.radius, enemy: e.def.id, family: e.def.family, reward: whole, lured: lure > 0 || routeBonus > 1, boss: !!e.def.boss })
    if (e.def.split) {
      for (let i = 0; i < e.def.split.count; i++) {
        const c = this.spawnEnemy(e.def.split.type, e.seg, Math.max(0, e.s - 6 - i * 12), e.wave)
        this.inherit(c, e)
        c.hitT = 0.1
      }
    }
  }

  // ------------------------------------------------------------------ towers

  private recomputeAuras() {
    for (const t of this.towers) {
      t.rangeMul = 1
      t.rateMul = 1
    }
    for (const o of this.towers) {
      if (o.id !== 'owl' || (o.stats.auraRange <= 0 && o.stats.auraRate <= 0)) continue
      const r = o.stats.range
      for (const t of this.towers) {
        if (t === o || t.id === 'garden') continue
        if (dist2(o.x, o.y, t.x, t.y) <= r * r) {
          t.rangeMul = Math.max(t.rangeMul, 1 + o.stats.auraRange)
          t.rateMul = Math.max(t.rateMul, 1 + o.stats.auraRate)
        }
      }
    }
  }

  recomputeRoutes() {
    const memo = new Map<string, number>()
    const segs = this.level.segs
    const toHome = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!
      const s = segs.get(id)!
      let rest = 0
      const nx = s.next
      if ('seg' in nx) rest = toHome(nx.seg)
      else if ('gate' in nx) {
        const g = this.gates.find((q) => q.def.id === nx.gate)!
        rest = toHome(g.def.outs[this.gateEffectiveDir(g)])
      }
      const v = s.line.length + rest
      memo.set(id, v)
      return v
    }
    for (const s of segs.values()) s.toHome = toHome(s.id)
  }

  private pickTarget(t: Tower, range: number, exclude: Enemy | null = null, excluded:readonly (Enemy|null)[]=[]): Enemy | null {
    const cands = this.near(t.x, t.y, range, tmpB)
    if(this.challenge.fixed)return automaticTarget(t,cands.filter(e=>e!==exclude&&!excluded.includes(e)&&this.canSee(e,t.stats.detect)))
    let best: Enemy | null = null
    let bestScore = Infinity
    const detect = t.stats.detect
    for (const e of cands) {
      if (e === exclude || !this.canSee(e, detect)) continue
      let score: number
      switch (t.priority) {
        case 'first':
          score = e.remaining
          break
        case 'last':
          score = -e.remaining
          break
        case 'strong':
          score = -(e.hp + e.shell) * 10000 + e.remaining
          break
        case 'close':
          score = dist2(t.x, t.y, e.x, e.y)
          break
      }
      if (score < bestScore) {
        bestScore = score
        best = e
      }
    }
    return best
  }

  private updateTowers(dt: number) {
    if(this.challenge.watchDepth&&this.waveActive)this.updateDepth(dt)
    let beamIntensity = 0
    for (const t of this.towers) {
      const s = t.stats
      const range = this.effRange(t)
      const rate = t.rateMul * (this.challenge.fixed?skyRate(t.id,this.sky):1) * (this.sunlit(t)?1.12:1) * (this.activePreparation('oil') && this.waveActive ? 1.15 : 1)
      switch (t.def.kind) {
        case 'arc': {
          t.cd -= dt * rate
          if (t.cd > 0) break
          let target = this.pickTarget(t, range)
          if (!target) break
          t.cd = s.interval; t.fireT = this.time
          t.angle = Math.atan2(target.y - t.y, target.x - t.x)
          const hit = new Set<number>()
          let x = t.x, y = t.y - 25
          for (let i = 0; target && i < s.count; i++) {
            hit.add(target.uid)
            this.events.push({ t: 'arc', x, y, tx: target.x, ty: target.y })
            this.damage(target, s.damage, s.heavy, t)
            x = target.x; y = target.y
            target = this.enemies.filter(e => e.alive && !hit.has(e.uid) && this.canSee(e, s.detect) && dist2(x, y, e.x, e.y) <= s.splash ** 2)
              .sort((a, b) => dist2(x, y, a.x, a.y) - dist2(x, y, b.x, b.y) || a.uid - b.uid)[0] ?? null
          }
          this.events.push({ t: 'shoot', x: t.x, y: t.y, tower: t.id, angle: t.angle })
          break
        }
        case 'bolt': {
          t.cd -= dt * rate
          if (t.cd > 0) break
          const target = this.pickTarget(t, range)
          if (!target) break
          t.cd = s.interval; t.fireT = this.time
          t.angle = Math.atan2(target.y - t.y, target.x - t.x)
          this.projs.push(this.makeProj(t, 'bolt', t.angle, target, range))
          this.events.push({ t: 'shoot', x: t.x, y: t.y, tower: t.id, angle: t.angle })
          break
        }
        case 'spark':
        case 'owl': {
          t.cd -= dt * rate
          if (s.dive > 0) {
            t.diveCd -= dt * rate
            if (t.diveCd <= 0) {
              const prev = t.priority
              t.priority = 'strong'
              const target = this.pickTarget(t, range)
              t.priority = prev
              if (target) {
                t.diveCd = 3
                this.events.push({ t: 'dive', x: t.x, y: t.y, tx: target.x, ty: target.y })
                this.damage(target, s.dive, true, t)
              } else t.diveCd = 0.3
            }
          }
          if (t.cd > 0) break
          const target = this.pickTarget(t, range)
          if (!target) break
          t.cd = s.interval
          const d = Math.sqrt(dist2(t.x, t.y, target.x, target.y))
          const lead = d / s.projSpeed
          const px = target.x + target.tx * target.speedNow * lead
          const py = target.y + target.ty * target.speedNow * lead
          const base = Math.atan2(py - t.y, px - t.x)
          t.angle = base
          t.fireT = this.time
          for (let i = 0; i < s.count; i++) {
            const ang = s.count > 1 ? base - s.spread / 2 + (s.spread * i) / (s.count - 1) : base
            this.projs.push(this.makeProj(t, t.id === 'owl' ? 'feather' : 'spark', ang, t.id === 'owl' ? target : null, range))
          }
          this.events.push({ t: 'shoot', x: t.x, y: t.y, tower: t.id, angle: base })
          break
        }
        case 'lob': {
          t.cd -= dt * rate
          if (t.cd > 0) break
          const target = this.pickTarget(t, range)
          if (!target) break
          t.cd = s.interval
          t.fireT = this.time
          if (s.homing) {
            const used: Enemy[] = [target]
            for (let i = 0; i < s.count; i++) {
              let tg = target
              if (i > 0) {
                const alt = this.pickTarget(t, range, used[used.length - 1])
                if (alt && !used.includes(alt)) {
                  tg = alt
                  used.push(alt)
                }
              }
              const ang = Math.atan2(tg.y - t.y, tg.x - t.x) + (i - (s.count - 1) / 2) * 0.5
              this.projs.push(this.makeProj(t, 'rocket', ang, tg, range))
            }
            t.angle = Math.atan2(target.y - t.y, target.x - t.x)
          } else {
            const dur = s.projSpeed
            const px = target.x + target.tx * target.speedNow * dur
            const py = target.y + target.ty * target.speedNow * dur
            const p = this.makeProj(t, 'firework', Math.atan2(py - t.y, px - t.x), null, range)
            p.sx = t.x
            p.sy = t.y - 18
            p.ex = px
            p.ey = py
            p.dur = dur
            p.t = 0
            this.projs.push(p)
            t.angle = Math.atan2(py - t.y, px - t.x)
          }
          this.events.push({ t: 'shoot', x: t.x, y: t.y, tower: t.id, angle: t.angle })
          break
        }
        case 'pulse': {
          t.cd -= dt * rate
          if (t.cd > 0) break
          const hits = this.near(t.x, t.y, range, tmpB)
          if (hits.length === 0) break
          t.cd = s.interval
          t.tolls++
          t.slowed += hits.length
          t.fireT = this.time
          const stun = s.stunEvery > 0 && t.tolls % s.stunEvery === 0
          for (const e of [...hits]) {
            e.slowF = Math.max(e.slowF, s.slow)
            e.slowT = Math.max(e.slowT, s.slowDur)
            if (s.brittle) e.brittleT = Math.max(e.brittleT, s.slowDur)
            if (s.revealPerm && e.def.hidden) e.revealedPerm = true
            if (stun && !e.def.boss) e.stunT = Math.max(e.stunT, s.stunDur)
            if (s.damage > 0) this.damage(e, s.damage, false, t)
          }
          this.events.push({ t: 'toll', x: t.x, y: t.y, r: range, stun, tier: Math.max(t.a, t.b) })
          break
        }
        case 'beam': {
          let firing = false
          for (let i = 0; i < s.beams; i++) {
            let tg = t.beamTargets[i]
            if(this.challenge.watchDepth&&tg&&t.beamTargets.slice(0,i).includes(tg))tg=null
            if (tg && (!tg.alive || dist2(t.x, t.y, tg.x, tg.y) > (range + tg.def.radius) ** 2 || !this.canSee(tg, s.detect) || !!this.challenge.balance && i > 0 && tg === t.beamTargets[0])) tg = null
            if (!tg) tg = this.pickTarget(t, range, i === 1 ? t.beamTargets[0] : null,this.challenge.watchDepth?t.beamTargets.slice(0,i):[])
            t.beamTargets[i] = tg
            if (!tg) continue
            firing = true
            if (i === 0) t.angle = Math.atan2(tg.y - t.y, tg.x - t.x)
            const dmg = s.damage * rate * dt
            if (s.beamLine) {
              const ang = Math.atan2(tg.y - t.y, tg.x - t.x)
              const ex = t.x + Math.cos(ang) * range
              const ey = t.y + Math.sin(ang) * range
              const candidates = this.near((t.x + ex) / 2, (t.y + ey) / 2, range / 2 + 10, tmpC)
              const hits = this.challenge.balance ? [tg, ...candidates.filter(e => e !== tg && this.canSee(e, s.detect) && segDist2(e.x, e.y, t.x, t.y, ex, ey) < (e.def.radius + 12) ** 2)
                .sort((a, b) => dist2(t.x, t.y, a.x, a.y) - dist2(t.x, t.y, b.x, b.y) || a.uid - b.uid).slice(0, s.pierce - 1)] : candidates
              for (const e of hits) {
                if (!this.canSee(e, s.detect)) continue
                if (segDist2(e.x, e.y, t.x, t.y, ex, ey) < (e.def.radius + 12) ** 2) {
                  const fraction = this.challenge.balance && e !== tg ? BEAM_SECONDARY_DAMAGE : 1
                  this.damage(e, dmg * fraction, true, t, true)
                  if (s.burn > 0 && e.alive) {
                    e.burnT = s.burnDur
                    e.burnDps = Math.max(e.burnDps, s.burn * fraction)
                  }
                }
              }
            } else {
              this.damage(tg, dmg, true, t, true)
              if (s.burn > 0 && tg.alive) {
                tg.burnT = s.burnDur
                tg.burnDps = Math.max(tg.burnDps, s.burn)
              }
            }
          }
          if (firing) {
            t.fireT = this.time
            beamIntensity += 0.4
          }
          break
        }
        case 'garden': {
          if (s.mothEvery > 0) {
            t.mothCd -= dt * rate
            if (t.mothCd <= 0) {
              const target = this.pickTarget(t, range)
              if (target) {
                t.mothCd = s.mothEvery
                this.projs.push(this.makeProj(t, 'moth', Math.atan2(target.y - t.y, target.x - t.x) + this.rand(-1, 1), target, range))
              } else t.mothCd = 0.2
            }
          }
          break
        }
      }
    }
    this.beamIntensity = beamIntensity
  }

  beamIntensity = 0

  private makeProj(t: Tower, kind: ProjKind, ang: number, target: Enemy | null, range: number): Proj {
    const s = t.stats
    const speed = kind === 'rocket' ? 560 : kind === 'moth' ? 300 : kind === 'feather' ? s.projSpeed : kind === 'firework' ? 0 : s.projSpeed
    const ox = t.x + Math.cos(ang) * 16
    // Fixed-world sprites use a shared elevation at render time. Physics stays
    // on the canal plane, including the muzzle and the predicted aim point.
    const oy = t.y - (this.challenge.fixed ? 0 : 14) + Math.sin(ang) * 16
    return {
      kind,
      x: ox,
      y: oy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      speed,
      target,
      ...(kind === 'spark' && this.challenge.guardian === 'reed' ? { bounced: false } : {}),
      dmg: s.damage * (kind === 'spark' && this.challenge.guardian === 'reed' ? .75 : 1),
      pierce: s.pierce,
      heavy: s.heavy,
      detect: s.detect || kind === 'feather' || kind === 'moth',
      splash: s.splash,
      burn: s.burn,
      burnDur: s.burnDur,
      cluster: s.cluster,
      hit: [],
      life: kind === 'moth' ? 3 : kind === 'rocket' ? 2 : (range * 1.3) / Math.max(1, speed),
      sx: 0,
      sy: 0,
      ex: 0,
      ey: 0,
      t: 0,
      dur: 0,
      tower: t,
      alive: true,
      brittleBonus: false,
    }
  }

  private updateProjs(dt: number) {
    const spawned: Proj[] = []
    for (const p of this.projs) {
      if (!p.alive) continue
      if (p.kind === 'firework' || p.kind === 'mini') {
        p.t += dt
        const k = Math.min(1, p.t / p.dur)
        p.x = p.sx + (p.ex - p.sx) * k
        p.y = p.sy + (p.ey - p.sy) * k - Math.sin(k * Math.PI) * (p.kind === 'mini' ? 30 : 70)
        if (k >= 1) {
          p.alive = false
          this.explode(p, p.ex, p.ey, spawned)
        }
        continue
      }
      p.life -= dt
      if (p.life <= 0) {
        p.alive = false
        continue
      }
      // homing
      if (this.challenge.fixed && p.kind === 'bolt' && p.hit.length) p.target = null
      if (p.target) {
        if (!p.target.alive) {
          const alt = this.near(p.x, p.y, 140, tmpC).find((e) => this.canSee(e, p.detect) && !p.hit.includes(e.uid))
          p.target = alt ?? null
        }
        if (p.target) {
          const desired = Math.atan2(p.target.y - p.y, p.target.x - p.x)
          const cur = Math.atan2(p.vy, p.vx)
          let diff = desired - cur
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          const turn = (p.kind === 'moth' ? 7 : 10) * dt
          const na = cur + Math.max(-turn, Math.min(turn, diff))
          p.vx = Math.cos(na) * p.speed
          p.vy = Math.sin(na) * p.speed
        }
      }
      const startX=p.x,startY=p.y
      p.x += p.vx * dt
      p.y += p.vy * dt
      // Sweep fast fixed-world shots through the full frame and resolve the
      // first enemy first, rather than tunnelling or relying on grid order.
      const contacts=this.challenge.fixed
        ? this.near((startX+p.x)/2,(startY+p.y)/2,Math.hypot(p.x-startX,p.y-startY)/2+6,tmpC)
          .map(e=>({e,t:contactTime(startX,startY,p.x,p.y,e.x,e.y,e.def.radius+6)}))
          .filter((v):v is {e:Enemy;t:number}=>v.t!==null).sort((a,b)=>a.t-b.t||a.e.uid-b.e.uid).map(v=>v.e)
        : this.near(p.x,p.y,6,tmpC)
      for (const e of contacts) {
        if (p.hit.includes(e.uid) || !this.canSee(e, p.detect)) continue
        if (p.kind === 'rocket') {
          p.alive = false
          this.explode(p, p.x, p.y, spawned)
          break
        }
        p.hit.push(e.uid)
        const landed = this.damage(e, p.dmg, p.heavy, p.tower)
        if (landed && p.kind === 'bolt' && p.burn > 0 && e.alive) {
          e.burnT = Math.max(e.burnT, p.burnDur); e.burnDps = Math.max(e.burnDps, p.burn)
        }
        if (landed) this.events.push({ t: 'hit', x: e.x, y: e.y, kind: p.kind, hue: p.tower.def.hue })
        if (landed && p.bounced === false) {
          p.bounced = true
          const other = this.enemies.filter(o => o.alive && !p.hit.includes(o.uid) && this.canSee(o, p.detect) && dist2(e.x, e.y, o.x, o.y) <= 110 ** 2)
            .sort((a, b) => dist2(e.x, e.y, a.x, a.y) - dist2(e.x, e.y, b.x, b.y) || a.uid - b.uid)[0]
          if (other) {
            p.hit.push(other.uid)
            this.damage(other, p.dmg, p.heavy, p.tower)
            this.events.push({ t: 'bounce', x: e.x, y: e.y, tx: other.x, ty: other.y })
          }
        }
        p.pierce--
        if (p.pierce <= 0 || !landed) {
          p.alive = false
          break
        }
      }
    }
    for (const p of spawned) this.projs.push(p)
  }

  private explode(p: Proj, x: number, y: number, spawned: Proj[]) {
    const r = p.kind === 'mini' ? 36 : p.splash
    const ember = this.challenge.guardian === 'ember' && p.tower.id === 'cracker'
    if (ember && p.kind !== 'mini') {
      this.embers.push({ x, y, radius: r * .85, life: 2.4, dps: p.tower.stats.damage * .4, tower: p.tower.uid })
      if (this.embers.length > 48) this.embers.shift()
    }
    this.events.push({ t: 'boom', x, y, r, big: p.cluster > 0 })
    let combo = 0
    for (const e of [...this.near(x, y, r, tmpC)]) {
      if (!this.canSee(e, p.detect)) continue
      const slowed = e.slowT > 0
      const landed = this.damage(e, p.dmg * (ember ? .6 : 1), true, p.tower)
      if (landed && slowed && this.challenge.guard) {
        const report = this.waveReports.find(r => r.wave === e.wave)
        if (report) report.slowSplashHits++
        combo++
      }
      if (p.burn > 0 && e.alive) {
        e.burnT = p.burnDur
        e.burnDps = Math.max(e.burnDps, p.burn)
      }
    }
    if (combo >= 2 && p.kind !== 'mini') this.events.push({ t: 'combo', x, y, count: combo })
    if (p.cluster > 0 && p.kind !== 'mini') {
      for (let i = 0; i < p.cluster; i++) {
        const a = (i / p.cluster) * Math.PI * 2 + this.rand(-0.3, 0.3)
        const d = this.rand(40, 70)
        const m = this.makeProj(p.tower, 'mini', a, null, 0)
        m.sx = x
        m.sy = y
        m.ex = x + Math.cos(a) * d
        m.ey = y + Math.sin(a) * d
        m.dur = 0.32
        m.t = 0
        m.cluster = 0
        m.burn = p.burn
        m.dmg = Math.max(1, p.dmg - 1)
        spawned.push(m)
      }
    }
  }

  private updateEmbers(dt: number) {
    // Overlapping ground fire never stacks; use the strongest covering patch.
    for (const e of this.enemies) {
      if (!e.alive || !this.canSee(e, false)) continue
      let patch: EmberPatch | undefined
      for (const p of this.embers) if (dist2(e.x, e.y, p.x, p.y) <= p.radius * p.radius && (!patch || p.dps > patch.dps)) patch = p
      if (!patch) continue
      this.damage(e, patch.dps * dt, true, this.towers.find(t => t.uid === patch.tower) ?? null, true)
    }
    for (const p of this.embers) p.life -= dt
    this.embers = this.embers.filter(p => p.life > 0)
  }

  // ------------------------------------------------------------------ waves

  private checkWaves() {
    // nothing more is paid out once the lantern has gone out
    if (this.over === 'lost') return
    let cleared = false
    for (const w of [...this.wavesPending]) {
      const spawning = this.spawners.some((sp) => sp.wave === w)
      if (spawning || (this.waveAlive.get(w) ?? 0) > 0) continue
      this.wavesPending.delete(w)
      if (this.preparation?.wave === w) this.preparation = null
      cleared = true
      const d = DIFFICULTY[this.difficulty]
      const bonus = Math.round((this.challenge.expedition ? expeditionBonus(w) : this.challenge.fixed ? 125 + w * 15 : this.challenge.compact ? 90 + w * 8 : 45 + w * 5) * d.bonus)
      let income = 0
      let life = 0
      for (const t of this.towers) {
        if (t.id !== 'garden') continue
        const earned=this.challenge.fixed?Math.round((t.harvest??0)/Math.max(DT,this.climate.waveSeconds)):t.stats.income
        income += earned
        t.earned += earned
        life += this.challenge.fixed?Math.floor((t.healing??0)/Math.max(DT,this.climate.waveSeconds)+1e-7):t.stats.lifePerWave
        if (earned > 0) this.events.push({ t: 'income', x: t.x, y: t.y, amount: earned })
      }
      this.glow += bonus + income
      this.stats.glowEarned += bonus + income
      if (life > 0) {
        const before = this.lives
        this.lives = Math.min(this.maxLives, this.lives + life)
        if (this.lives > before) this.events.push({ t: 'life', amount: this.lives - before })
      }
      this.events.push({ t: 'waveEnd', n: w, bonus, income })
      this.waveReports = this.waveReports.filter(r => r.wave === w || this.wavesPending.has(r.wave))
    }
    if (cleared && this.challenge.expanding && !this.waveActive) {
      const next = stageForWave(this.wave + 1)
      if (next > this.canalStage) {
        if (next === 2) this.openSources.add('west')
        this.revealCanal(next)
        this.events.push({ t: 'expand', stage: next })
      }
    }
    // the night is won once the final wave and every early-called straggler before it are cleared
    if (cleared && !this.won && this.wave >= this.finalWave && this.lives > 0) {
      for (const w of this.wavesPending) if (w <= this.finalWave) return
      this.won = true
      this.over = 'won'
      this.events.push({ t: 'victory' })
    }
  }

  /** After a win the player may continue into free play. */
  continueFreeplay() {
    if (this.challenge.fixed) return
    if (this.over !== 'won' || this.isChallenge) return
    this.over = null
    this.freeplay = true
    if (!this.freeplayFrom) this.freeplayFrom = this.wave
  }

  sunlit(t:{x:number;y:number}):boolean {
    return !!this.challenge.watchDepth&&this.towers.some(o=>hasSunReserve(o)&&(o.sunPulse??0)>0&&dist2(t.x,t.y,o.x,o.y)<=(o.stats.range*1.4)**2)
  }
  private updateDepth(dt:number){
    for(const t of this.towers){
      if(!hasSunReserve(t))continue
      t.sunPulse=Math.max(0,(t.sunPulse??0)-dt)
      t.sunCooldown=Math.max(0,(t.sunCooldown??0)-dt)
      if(!this.sky.night)t.sunlight=Math.min(SUN_CAPACITY,(t.sunlight??0)+dt*.5)
      else if((t.sunlight??0)>=SUN_PULSE_COST&&(t.sunCooldown??0)<=0){
        t.sunlight=(t.sunlight??0)-SUN_PULSE_COST;t.sunPulse=SUN_PULSE_SECONDS;t.sunCooldown=6
        this.events.push({t:'phase',x:t.x,y:t.y})
      }
    }
    if(Math.floor(this.time*2)!==Math.floor((this.time-dt)*2))this.syncBonds()
  }
  get bondSlots(){return this.challenge.expedition?(this.wave>=7?2:this.wave>=3?1:0):(this.wave>=20?2:this.wave>=5?1:0)}
  syncBonds(){
    if(!this.challenge.watchDepth)return
    const eligible=(a:Tower,b:Tower)=>!!bondName(a.id,b.id,true)&&this.sharedCoverage(a,b)
    this.bonds=this.bonds.filter(q=>{const a=this.towers.find(t=>t.uid===q.a),b=this.towers.find(t=>t.uid===q.b);return a&&b&&eligible(a,b)}).slice(0,this.bondSlots)
    const paired=new Set(this.bonds.flatMap(q=>[q.a,q.b]))
    const pairs=this.towers.flatMap((a,i)=>this.towers.slice(i+1).filter(b=>!paired.has(a.uid)&&!paired.has(b.uid)&&eligible(a,b)).map(b=>({a,b,d:dist2(a.x,a.y,b.x,b.y)}))).sort((a,b)=>a.d-b.d||a.a.uid-b.a.uid||a.b.uid-b.b.uid)
    for(const {a,b}of pairs){
      if(this.bonds.length>=this.bondSlots)break
      if(paired.has(a.uid)||paired.has(b.uid))continue
      this.bonds.push({a:a.uid,b:b.uid,readyAt:this.time+4,activations:0});paired.add(a.uid);paired.add(b.uid)
    }
  }
  /** Pairs must share a section of the fixed route. */
  sharedCoverage(a: Tower,b: Tower): boolean {
    for(const seg of this.level.segs.values()) {
      if(seg.id === 'inlet' && this.planningWave < (this.challenge.expedition?6:11)) continue
      for(let at=0;at<=seg.line.length;at+=12) {
        const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0})
        if(dist2(a.x,a.y,p.x,p.y)<=this.effRange(a)**2 && dist2(b.x,b.y,p.x,p.y)<=this.effRange(b)**2) return true
      }
    }
    return false
  }
  bond(a: Tower,b: Tower): boolean {
    if(this.challenge.watchDepth)return false
    const slots=this.wave>=20?2:this.wave>=5?1:0
    if(!this.challenge.fixed || this.over || this.bonds.length>=slots || a===b || !this.towers.includes(a) || !this.towers.includes(b) || !bondName(a.id,b.id) || !this.sharedCoverage(a,b) || this.bonds.some(q=>[q.a,q.b].includes(a.uid)||[q.a,q.b].includes(b.uid))) return false
    // Re-linking in combat cannot reset an armour-breaking cooldown.
    this.bonds.push({a:a.uid,b:b.uid,readyAt:this.waveActive?this.time+4:0,activations:0}); return true
  }
  unbond(t: Tower): boolean {
    if(this.challenge.watchDepth)return false
    if(this.waveActive && !this.challenge.fixed || this.over) return false
    const old=this.bonds.length
    this.bonds=this.bonds.filter(b=>b.a!==t.uid&&b.b!==t.uid)
    return old!==this.bonds.length
  }
  private applyBond(e: Enemy,src: Tower,heavy: boolean): boolean {
    const bond=this.bonds.find(b=>b.a===src.uid||b.b===src.uid)
    if(!bond || bond.readyAt>this.time || !(this.challenge.watchDepth?['wick','cracker','storm','ballista','beam']:['wick','cracker']).includes(src.id)) return heavy
    const other=this.towers.find(t=>t.uid===(bond.a===src.uid?bond.b:bond.a))
    if(!other || dist2(e.x,e.y,src.x,src.y)>this.effRange(src)**2 || dist2(e.x,e.y,other.x,other.y)>this.effRange(other)**2) return heavy
    if(['wick','cracker','beam'].includes(src.id)&&!e.shell)return heavy
    if(src.id==='cracker' && (this.time-other.fireT>2 || e.slowT<=0)) return heavy
    if(src.id==='beam'&&e.slowT<=0)return heavy
    if(src.id==='wick' && !this.canSee(e,false)) return heavy
    bond.readyAt=this.time+(src.id==='wick'?2:src.id==='storm'?3:4); bond.activations++
    if(src.id==='cracker'||src.id==='beam') { const removed=Math.min(src.id==='beam'?8:6,e.shell); e.shell-=removed; src.damageDealt=(src.damageDealt??0)+removed }
    if(src.id==='storm'){e.slowF=Math.max(e.slowF,.25);e.slowT=Math.max(e.slowT,2)}
    if(src.id==='ballista'){e.burnDps=Math.max(e.burnDps,6);e.burnT=Math.max(e.burnT,2)}
    this.events.push({t:'arc',x:other.x,y:other.y,tx:src.x,ty:src.y})
    return src.id==='storm'?heavy:true
  }

  // ------------------------------------------------------------------ save / load

  /** A full save, valid at any moment (mid-wave included). Restoring it continues the run identically. */
  snapshot(): SaveSnapshotV2 {
    const alive = (e: Enemy | null) => (e && e.alive ? e.uid : 0)
    return {
      v: 2,
      ...(this.challenge.fixed ? { bonds: this.bonds.map(b => ({...b})),climate:{...this.climate} } : {}),
      ...(this.challenge.guard ? { waveReports: this.waveReports.map(r => ({ ...r, damage: { ...r.damage } })), embers: this.embers.map(p => ({ ...p })), lastLeak: this.lastLeak && { ...this.lastLeak } } : {}),
      ...(this.challenge.expanding ? { canalStage: this.canalStage } : {}),
      ...(this.challenge.compact ? { plots: [...this.plots] } : {}),
      ...(this.challenge.plans ? { battlePlans: [...this.battlePlans] } : {}),
      ...(this.challenge.depth ? { preparation: this.preparation && { ...this.preparation }, preparationRound: this.preparationRound } : {}),
      difficulty: this.difficulty,
      challenge: { ...this.challenge },
      wave: this.wave,
      glow: this.glow,
      lives: this.lives,
      seed: this.seed,
      towers: this.towers.map((t) => ({
        ...(this.challenge.compact ? { refinement: t.refinement ?? 0 } : {}),
        ...(this.challenge.guard ? { damageDealt: t.damageDealt ?? 0 } : {}),
        id: t.id,
        pad: t.pad,
        a: t.a,
        b: t.b,
        priority: t.priority,
        spent: t.spent,
        pops: t.pops,
        uid: t.uid,
        cd: t.cd,
        diveCd: t.diveCd,
        mothCd: t.mothCd,
        tolls: t.tolls,
        angle: t.angle,
        beams: t.beamTargets.map(alive),
        bornT: t.bornT,
        fireT: t.fireT,
        upT: t.upT,
        slowed: t.slowed,
        spotted: t.spotted,
        earned: t.earned,
        ...(this.challenge.fixed?{harvest:t.harvest??0,healing:t.healing??0}:{}),
        ...(this.challenge.watchDepth?{sunlight:t.sunlight??0,sunPulse:t.sunPulse??0,sunCooldown:t.sunCooldown??0}:{}),
      })),
      gates: this.gates.map((g) => ({ state: g.state, charm: g.charm && { ...g.charm }, jammed: g.jammed, cd: g.cd, flipT: g.flipT, routeT: [g.routeT[0], g.routeT[1]], flips: g.flips, swingT: g.swingT })),
      stats: JSON.parse(JSON.stringify(this.stats)),
      won: this.won,
      over: this.over,
      freeplay: this.freeplay,
      freeplayFrom: this.freeplayFrom,
      time: this.time,
      glowFrac: this.glowFrac,
      uid: this.uid,
      rngDraws: this.rngDraws,
      openSources: [...this.openSources],
      wavesPending: [...this.wavesPending],
      waveAlive: [...this.waveAlive].filter(([w]) => this.wavesPending.has(w)),
      spawners: this.spawners.map((sp) => ({ wave: sp.wave, group: sp.index, t: sp.t, spawned: sp.spawned })),
      enemies: this.enemies
        .filter((e) => e.alive)
        .map((e) => ({
          uid: e.uid,
          type: e.def.id,
          seg: e.seg.id,
          s: e.s,
          hp: e.hp,
          maxHp: e.maxHp,
          shell: e.shell,
          maxShell: e.maxShell,
          wave: e.wave,
          route: e.route,
          lastGate: e.lastGate,
          revealedPerm: e.revealedPerm,
          seenT: e.seenT,
          phase: e.phase,
          ...(e.escortOf !== undefined ? { escortOf: e.escortOf } : {}),
          ...(e.signalT !== undefined ? { signalT: e.signalT } : {}),
          spawnCd: e.spawnCd,
          speedBase: e.speedBase,
          slowT: e.slowT,
          slowF: e.slowF,
          stunT: e.stunT,
          burnT: e.burnT,
          burnDps: e.burnDps,
          brittleT: e.brittleT,
          visScale: e.visScale,
          reward: e.reward,
          age: e.age,
          split: !!ENEMIES[e.def.id].splitAtGate && !e.def.splitAtGate,
          rich: e.rich,
          shrouded: e.shrouded,
          owlSeen: e.owlSeen,
        })),
      projs: this.projs
        .filter((p) => p.alive)
        .map(({ target, tower, alive: _alive, ...rest }) => ({ ...rest, hit: [...rest.hit], target: target ? (target.alive ? target.uid : -1) : 0, tower: tower.uid })),
    }
  }

  /** Accepts v1 (between waves, older builds) and v2 (full, any moment) saves. */
  static restore(snap: SaveSnapshot): Sim {
    const sim = new Sim(snap.difficulty, snap.challenge, snap.seed)
    // The challenge's starter defence is only for new attempts.
    if (snap.challenge.skirmish) { sim.towers = []; sim.projs = []; for (const pad of sim.pads) pad.tower = null; sim.uid = 1 }
    const full = snap.v === 2 ? snap : null
    sim.wave = snap.wave
    if(snap.challenge.fixed&&full)sim.climate={...(full.climate??{elapsed:full.stats.activeTime,waveSeconds:0,gardenExposure:0})}
    if (snap.challenge.fixed && full) sim.bonds = (full.bonds ?? []).map(b => ({...b}))
    if (snap.challenge.depth && full) {
      sim.preparation = full.preparation ? { ...full.preparation } : null
      sim.preparationRound = full.preparationRound ?? 0
    }
    if (snap.challenge.plans && full?.battlePlans) sim.battlePlans = [...full.battlePlans]
    if (snap.challenge.compact && full?.plots) sim.plots = new Set(full.plots)
    if (snap.challenge.expanding && full) sim.revealCanal(full.canalStage ?? stageForWave(snap.wave))
    sim.glow = snap.glow
    sim.lives = snap.lives
    sim.won = snap.won
    sim.stats = { ...sim.stats, ...JSON.parse(JSON.stringify(snap.stats)) }
    sim.stats.cheered ??= {}
    if (full) {
      sim.waveReports = full.waveReports?.map(r => ({ ...r, damage: { ...r.damage } })) ?? []
      sim.embers = full.embers?.map(p => ({ ...p })) ?? []
      sim.lastLeak = full.lastLeak ? { ...full.lastLeak } : null
      sim.over = full.over
      sim.freeplay = full.freeplay
      sim.freeplayFrom = full.freeplayFrom
      sim.time = full.time
      sim.glowFrac = full.glowFrac
      sim.openSources = new Set(full.openSources)
      sim.wavesPending = new Set(full.wavesPending)
      for (let i = 0; i < full.rngDraws; i++) sim.rng.next()
      sim.rngDraws = full.rngDraws
    } else {
      sim.freeplay = snap.wave >= FINAL_WAVE
      sim.freeplayFrom = snap.won && snap.wave >= FINAL_WAVE ? FINAL_WAVE : 0
      for (const src of sim.level.def.sources) if (src.openWave <= snap.wave) sim.openSources.add(src.id)
    }
    snap.gates.forEach((g, i) => {
      const q = sim.gates[i]
      if (!q) return
      q.state = g.state
      q.charm = g.charm
      q.jammed = g.jammed ?? false
      q.cd = g.cd ?? 0
      q.flipT = g.flipT ?? -9
      q.routeT = g.routeT ? [g.routeT[0], g.routeT[1]] : [-9, -9]
      q.flips = g.flips ?? 0
      q.swingT = g.swingT ?? 0
    })
    for (const t of snap.towers) {
      const pad = sim.pads[t.pad]
      if (!pad || pad.tower || !TOWERS[t.id]) continue
      const tw: Tower = {
        ...(snap.challenge.compact ? { refinement: t.refinement ?? 0 } : {}),
        ...(snap.challenge.guard ? { damageDealt: t.damageDealt ?? 0 } : {}),
        uid: t.uid ?? sim.uid++,
        id: t.id,
        def: snap.challenge.fixed?heroTower(t.id,snap.challenge.hero):TOWERS[t.id],
        pad: t.pad,
        x: pad.x,
        y: pad.y,
        a: t.a,
        b: t.b,
        stats: sim.towerStats(t.id, t.a, t.b, t.refinement),
        cd: t.cd ?? 0.2,
        priority: t.priority,
        spent: t.spent,
        pops: t.pops,
        angle: t.angle ?? -Math.PI / 2,
        tolls: t.tolls ?? 0,
        diveCd: t.diveCd ?? 3,
        mothCd: t.mothCd ?? 0.5,
        beamTargets: [null, null],
        rangeMul: 1,
        rateMul: 1,
        bornT: t.bornT ?? -9,
        fireT: t.fireT ?? -9,
        upT: t.upT ?? -9,
        slowed: t.slowed ?? 0,
        spotted: t.spotted ?? 0,
        earned: t.earned ?? 0,
        ...(snap.challenge.fixed?{
          harvest:t.harvest??sim.towerStats(t.id,t.a,t.b,t.refinement).income*sim.climate.gardenExposure,
          healing:t.healing??sim.towerStats(t.id,t.a,t.b,t.refinement).lifePerWave*sim.climate.waveSeconds,
        }:{}),
        ...(snap.challenge.watchDepth?{sunlight:t.sunlight??0,sunPulse:t.sunPulse??0,sunCooldown:t.sunCooldown??0}:{}),
      }
      pad.tower = tw
      sim.towers.push(tw)
    }
    sim.recomputeAuras()
    sim.recomputeRoutes()
    if (full) sim.restoreLive(full)
    sim.events.length = 0
    return sim
  }

  /** Whether a route code (gate initial + branch, e.g. 'u1l0') passed through a rich channel. */
  private routeRich(route: string): boolean {
    for (let i = 0; i + 1 < route.length; i += 2) {
      const g = this.gates.find((q) => q.def.id[0] === route[i])
      const seg = g && this.level.segs.get(g.def.outs[route[i + 1] === '1' ? 1 : 0])
      if (seg && seg.bonus > 1) return true
    }
    return false
  }

  /** Mopes, shots and spawners of a v2 save. Runs after towers, gates and routes are in place. */
  private restoreLive(snap: SaveSnapshotV2) {
    const lost: number[] = []
    let splitDef: EnemyDef | null = null
    for (const se of snap.enemies) {
      const seg = this.level.segs.get(se.seg)
      if (!seg || !ENEMIES[se.type]) {
        lost.push(se.wave)
        continue
      }
      const e = this.spawnEnemy(se.type, seg, se.s, se.wave, true)
      if (se.split) e.def = splitDef ??= halfGloom(this.challenge.fixed ? e.def : ENEMIES[se.type])
      e.uid = se.uid
      e.hp = se.hp
      e.maxHp = se.maxHp
      e.shell = se.shell
      e.maxShell = se.maxShell
      e.route = se.route
      e.lastGate = se.lastGate
      e.revealedPerm = se.revealedPerm
      e.seenT = se.seenT
      e.phase = se.phase
      if (se.escortOf !== undefined) e.escortOf = se.escortOf
      if (se.signalT !== undefined) e.signalT = se.signalT
      e.spawnCd = se.spawnCd
      e.speedBase = se.speedBase
      e.slowT = se.slowT
      e.slowF = se.slowF
      e.stunT = se.stunT
      e.burnT = se.burnT
      e.burnDps = se.burnDps
      e.brittleT = se.brittleT
      e.visScale = se.visScale
      e.reward = se.reward
      e.age = se.age
      // older v2 saves lack these: read the rich run off the route, the shroud off the split
      e.rich = se.rich ?? (seg.bonus > 1 || this.routeRich(se.route))
      e.shrouded = se.shrouded ?? !!e.def.splitAtGate
      e.owlSeen = se.owlSeen ?? false
    }
    // spawnEnemy counted every Mope again: take the saved tallies instead
    this.waveAlive = new Map(snap.waveAlive)
    for (const w of lost) this.waveAlive.set(w, (this.waveAlive.get(w) ?? 1) - 1)
    const byUid = new Map(this.enemies.map((e) => [e.uid, e]))
    const towers = new Map(this.towers.map((t) => [t.uid, t]))
    for (const st of snap.towers) {
      const t = st.uid !== undefined ? towers.get(st.uid) : undefined
      if (t && st.beams) t.beamTargets = st.beams.map(id=>byUid.get(id)??null)
    }
    for (const sp of snap.projs) {
      const tower = towers.get(sp.tower)
      // shots from a keeper sold mid-flight are dropped
      if (!tower) continue
      const target = sp.target === 0 ? null : (byUid.get(sp.target) ?? GONE)
      this.projs.push({ ...sp, hit: [...sp.hit], target, tower, alive: true })
    }
    for (const sp of snap.spawners) {
      const group = this.waveDef(sp.wave).groups[sp.group]
      if (group) this.spawners.push({ group, index: sp.group, wave: sp.wave, t: sp.t, spawned: sp.spawned })
    }
    let top = snap.uid
    for (const e of this.enemies) top = Math.max(top, e.uid + 1)
    for (const t of this.towers) top = Math.max(top, t.uid + 1)
    this.uid = top
  }
}

/** A half of Old Gloom: it no longer splits, and the halves share its brood (each calls minions half as often). */
function halfGloom(def: EnemyDef): EnemyDef {
  return { ...def, splitAtGate: undefined, spawn: def.spawn && { ...def.spawn, every: def.spawn.every * 2 } }
}

/** Stand-in target for a restored shot whose Mope was already gone: it re-homes on its next step, as it would have. */
const GONE = { alive: false } as unknown as Enemy

const tmpA: Enemy[] = []
const tmpB: Enemy[] = []
const tmpC: Enemy[] = []

function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax
  const aby = by - ay
  const l2 = abx * abx + aby * aby || 1
  let t = ((px - ax) * abx + (py - ay) * aby) / l2
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const x = ax + abx * t
  const y = ay + aby * t
  return (px - x) ** 2 + (py - y) ** 2
}

export { CHARM_COST }
