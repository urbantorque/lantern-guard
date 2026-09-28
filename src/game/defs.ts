/**
 * Balance data. Everything the simulation needs to know about towers, upgrades
 * and enemies lives here so tuning never touches behaviour code.
 */

export type TowerId = 'wick' | 'cracker' | 'bell' | 'beam' | 'owl' | 'garden'
export type Priority = 'first' | 'last' | 'strong' | 'close'
export type EnemyId = 'drip' | 'skitter' | 'shell' | 'veil' | 'bloat' | 'wisp' | 'mender' | 'vshell' | 'toad' | 'gloom' | 'skiff' | 'warden' | 'reedling' | 'bloomheart'
export type CharmTrait = 'shell' | 'veil' | 'swift' | 'heavy'
export type Family = 'amber' | 'coral' | 'ice' | 'lime' | 'lilac' | 'gold' | 'pink'

export interface TowerStats {
  range: number
  interval: number
  damage: number
  pierce: number
  projSpeed: number
  count: number
  spread: number
  heavy: boolean
  detect: boolean
  splash: number
  burn: number
  burnDur: number
  slow: number
  slowDur: number
  stunEvery: number
  stunDur: number
  brittle: boolean
  revealPerm: boolean
  cluster: number
  homing: boolean
  beams: number
  beamLine: boolean
  dive: number
  auraRange: number
  auraRate: number
  income: number
  lure: number
  lifePerWave: number
  mothEvery: number
  gardenSlow: number
}

export interface Upgrade {
  name: string
  cost: number
  desc: string
  apply: (s: TowerStats) => void
}

export interface TowerDef {
  id: TowerId
  name: string
  role: string
  blurb: string
  cost: number
  kind: 'spark' | 'lob' | 'pulse' | 'beam' | 'owl' | 'garden'
  base: Partial<TowerStats>
  paths: [PathDef, PathDef]
  hue: string
  /** Mopes wearing this family's colour take x1.5 damage from this keeper. */
  family: Family
}

export interface PathDef {
  name: string
  tiers: [Upgrade, Upgrade, Upgrade]
}

const DEFAULT_STATS: TowerStats = {
  range: 150,
  interval: 1,
  damage: 1,
  pierce: 1,
  projSpeed: 800,
  count: 1,
  spread: 0,
  heavy: false,
  detect: false,
  splash: 0,
  burn: 0,
  burnDur: 0,
  slow: 0,
  slowDur: 0,
  stunEvery: 0,
  stunDur: 0,
  brittle: false,
  revealPerm: false,
  cluster: 0,
  homing: false,
  beams: 1,
  beamLine: false,
  dive: 0,
  auraRange: 0,
  auraRate: 0,
  income: 0,
  lure: 0,
  lifePerWave: 0,
  mothEvery: 0,
  gardenSlow: 0,
}

export const TOWERS: Record<TowerId, TowerDef> = {
  wick: {
    id: 'wick',
    name: 'Wickling',
    role: 'Fast shots',
    blurb: 'Fast, low-cost shots. Weak against armour.',
    cost: 110,
    kind: 'spark',
    hue: '#ffb547',
    family: 'amber',
    base: { range: 150, interval: 0.62, damage: 1, pierce: 1, projSpeed: 820 },
    paths: [
      {
        name: 'Fan',
        tiers: [
          { name: 'Twin Wick', cost: 95, desc: 'Fires 2 sparks at once.', apply: (s) => { s.count = 2; s.spread = 0.2 } },
          { name: 'Tri-Candle', cost: 210, desc: 'Fires 3 sparks at once, with less time between shots.', apply: (s) => { s.count = 3; s.spread = 0.3; s.interval *= 0.8 } },
          { name: 'Candelabra', cost: 620, desc: 'Fires 5 stronger sparks at once.', apply: (s) => { s.count = 5; s.spread = 0.55; s.interval *= 0.7; s.damage += 1 } },
        ],
      },
      {
        name: 'Long',
        tiers: [
          { name: 'Long Wick', cost: 85, desc: 'More range. Each spark can hit 2 enemies.', apply: (s) => { s.range += 35; s.pierce += 1 } },
          { name: 'Hot Wax', cost: 230, desc: 'Stronger sparks that break armour.', apply: (s) => { s.damage += 1; s.heavy = true } },
          { name: 'Beacon Wick', cost: 680, desc: 'More range. Sparks hit up to 7 enemies and can hit hidden enemies.', apply: (s) => { s.range += 70; s.pierce += 5; s.damage += 2; s.detect = true; s.projSpeed = 1250 } },
        ],
      },
    ],
  },
  cracker: {
    id: 'cracker',
    name: 'Cracker',
    role: 'Area damage',
    blurb: 'Hits groups of enemies and breaks armour.',
    cost: 200,
    kind: 'lob',
    hue: '#ff7a59',
    family: 'coral',
    base: { range: 165, interval: 1.35, damage: 1, splash: 52, heavy: true, projSpeed: 0.55 },
    paths: [
      {
        name: 'Boom',
        tiers: [
          { name: 'Big Bang', cost: 140, desc: 'Explosions hit a wider area.', apply: (s) => { s.splash += 22 } },
          { name: 'Double Pop', cost: 300, desc: 'More damage per hit. Fires faster.', apply: (s) => { s.damage += 1; s.interval *= 0.8 } },
          { name: 'Grand Finale', cost: 780, desc: 'Each explosion creates 5 smaller explosions.', apply: (s) => { s.cluster = 5; s.damage += 1 } },
        ],
      },
      {
        name: 'Rocket',
        tiers: [
          { name: 'Sparkler Tail', cost: 120, desc: 'Hits burn enemies for 1 damage a second.', apply: (s) => { s.burn = 1; s.burnDur = 2.2 } },
          { name: 'Rocketry', cost: 320, desc: 'Rockets follow enemies. More range and faster firing.', apply: (s) => { s.range += 55; s.homing = true; s.interval *= 0.85 } },
          { name: 'Skyrocket Battery', cost: 760, desc: 'Fires 3 rockets at once.', apply: (s) => { s.count = 3; s.burn = 2; s.splash += 8 } },
        ],
      },
    ],
  },
  bell: {
    id: 'bell',
    name: 'Moonbell',
    role: 'Slows groups',
    blurb: 'Slows nearby enemies, including hidden ones. Does not deal damage until upgraded.',
    cost: 150,
    kind: 'pulse',
    hue: '#9fd8ff',
    family: 'ice',
    base: { range: 115, interval: 1.7, damage: 0, slow: 0.35, slowDur: 1.5 },
    paths: [
      {
        name: 'Toll',
        tiers: [
          { name: 'Deep Toll', cost: 110, desc: 'Slows enemies by 50%.', apply: (s) => { s.slow = 0.5 } },
          { name: 'Ringing Hit', cost: 240, desc: 'Each attack also deals 1 damage.', apply: (s) => { s.damage = 1 } },
          { name: 'Stillbell', cost: 650, desc: 'Every third attack stuns nearby enemies. Bosses resist this.', apply: (s) => { s.stunEvery = 3; s.stunDur = 1.1; s.damage = 2 } },
        ],
      },
      {
        name: 'Chime',
        tiers: [
          { name: 'Wide Chime', cost: 100, desc: 'Slows enemies in a wider area.', apply: (s) => { s.range += 35 } },
          { name: 'Resonance', cost: 260, desc: 'Slowed enemies take more damage from other towers.', apply: (s) => { s.brittle = true } },
          { name: 'Bellwether', cost: 700, desc: 'Permanently reveals hidden enemies it hits.', apply: (s) => { s.revealPerm = true; s.slowDur += 0.8; s.range += 15 } },
        ],
      },
    ],
  },
  beam: {
    id: 'beam',
    name: 'Lighthouse',
    role: 'Focused beam',
    blurb: 'Deals steady damage to armoured enemies and bosses.',
    cost: 340,
    kind: 'beam',
    hue: '#cdb8ff',
    family: 'lilac',
    base: { range: 205, damage: 7, heavy: true },
    paths: [
      {
        name: 'Focus',
        tiers: [
          { name: 'Lens Polish', cost: 190, desc: 'Adds 5 damage a second to the beam.', apply: (s) => { s.damage += 5 } },
          { name: 'Piercing Ray', cost: 420, desc: 'The beam hits every enemy in its path.', apply: (s) => { s.beamLine = true; s.damage += 2 } },
          { name: 'Sunbeam', cost: 1150, desc: 'More beam damage. Hits also burn enemies.', apply: (s) => { s.damage += 16; s.burn = 4; s.burnDur = 2 } },
        ],
      },
      {
        name: 'Sweep',
        tiers: [
          { name: 'Tall Tower', cost: 170, desc: 'Increases attack range.', apply: (s) => { s.range += 45 } },
          { name: 'Night Lens', cost: 360, desc: 'The beam can hit hidden enemies.', apply: (s) => { s.detect = true; s.damage += 2 } },
          { name: 'Twin Lamps', cost: 980, desc: 'Attacks 2 enemies at once.', apply: (s) => { s.beams = 2; s.damage += 6 } },
        ],
      },
    ],
  },
  owl: {
    id: 'owl',
    name: 'Lamp Owl',
    role: 'Reveals hidden',
    blurb: 'Reveals hidden enemies in range so other towers can hit them.',
    cost: 170,
    kind: 'owl',
    hue: '#c9f07a',
    family: 'lime',
    base: { range: 150, interval: 0.85, damage: 1, detect: true, homing: true, projSpeed: 620 },
    paths: [
      {
        name: 'Hunter',
        tiers: [
          { name: 'Sharp Talons', cost: 130, desc: 'Fires more often.', apply: (s) => { s.interval *= 0.65 } },
          { name: 'Ironbeak', cost: 280, desc: 'Each hit deals 1 extra damage and breaks armour.', apply: (s) => { s.damage += 1; s.heavy = true } },
          { name: 'Great Horned', cost: 760, desc: 'Dives at the strongest enemy for 30 damage.', apply: (s) => { s.dive = 30 } },
        ],
      },
      {
        name: 'Watch',
        tiers: [
          { name: 'Keen Eyes', cost: 140, desc: 'Sees and shoots farther.', apply: (s) => { s.range += 50 } },
          { name: 'Night Watch', cost: 300, desc: 'Nearby towers gain 15% more range.', apply: (s) => { s.auraRange = 0.15 } },
          { name: 'Parliament', cost: 720, desc: 'Nearby towers attack 30% faster.', apply: (s) => { s.auraRate = 0.3; s.auraRange = 0.15 } },
        ],
      },
    ],
  },
  garden: {
    id: 'garden',
    name: 'Glow Garden',
    role: 'Earns glow',
    blurb: 'Earns glow when a wave ends. Does not attack until upgraded.',
    cost: 230,
    kind: 'garden',
    hue: '#ffd36e',
    family: 'gold',
    base: { range: 130, damage: 0, income: 45 },
    paths: [
      {
        name: 'Harvest',
        tiers: [
          { name: 'Moth Beds', cost: 190, desc: '80 glow each wave.', apply: (s) => { s.income = 80 } },
          { name: 'Night Bloom', cost: 420, desc: '115 glow each wave.', apply: (s) => { s.income = 115 } },
          { name: 'Moon Orchard', cost: 950, desc: '180 glow a wave and +1 light.', apply: (s) => { s.income = 180; s.lifePerWave = 1 } },
        ],
      },
      {
        name: 'Lure',
        tiers: [
          { name: 'Sweet Nectar', cost: 150, desc: 'Defeated enemies nearby drop extra glow.', apply: (s) => { s.lure = 0.5 } },
          { name: 'Moth Guard', cost: 330, desc: 'Sends moths to attack nearby enemies, including hidden ones.', apply: (s) => { s.mothEvery = 0.9; s.damage = 1; s.detect = true } },
          { name: 'Moonflower', cost: 800, desc: 'Slows nearby enemies and increases the glow they drop.', apply: (s) => { s.lure = 1; s.gardenSlow = 0.3; s.mothEvery = 0.5; s.damage = 2 } },
        ],
      },
    ],
  },
}

export const TOWER_ORDER: TowerId[] = ['wick', 'cracker', 'bell', 'owl', 'beam', 'garden']

export function computeStats(id: TowerId, a: number, b: number): TowerStats {
  const def = TOWERS[id]
  const s: TowerStats = { ...DEFAULT_STATS, ...def.base }
  for (let i = 0; i < a; i++) def.paths[0].tiers[i].apply(s)
  for (let i = 0; i < b; i++) def.paths[1].tiers[i].apply(s)
  return s
}

/** Crosspath rule: one path may go to tier 3, the other stops at tier 1. */
export function canUpgrade(a: number, b: number, path: 0 | 1): boolean {
  const next = (path === 0 ? a : b) + 1
  const other = path === 0 ? b : a
  if (next > 3) return false
  if (next >= 2 && other >= 2) return false
  return true
}

export interface EnemyDef {
  id: EnemyId
  name: string
  hp: number
  speed: number
  reward: number
  weight: number
  radius: number
  shell?: number
  hidden?: boolean
  split?: { type: EnemyId; count: number }
  heal?: { radius: number; rate: number }
  spawn?: { type: EnemyId; every: number }
  boss?: boolean
  jams?: boolean
  splitAtGate?: string
  family: Family
  tip: string
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  reedling: { id: 'reedling', family: 'amber', name: 'Reedling', hp: 22, speed: 58, reward: 13, weight: 3, radius: 17, tip: 'Gains armour where the streams meet. Attack it early or use armour-breaking towers.' },
  bloomheart: { id: 'bloomheart', family: 'lilac', name: 'Bloomheart', hp: 3300, shell: 100, speed: 27, reward: 900, weight: 999, radius: 46, boss: true, tip: 'Heals nearby enemies after a 3-second warning. Defeat them before the timer ends. It cannot heal itself.' },
  skiff: { id: 'skiff', family: 'coral', name: 'Skiff', hp: 7, shell: 8, speed: 50, reward: 12, weight: 2, radius: 17, tip: 'Speeds up when its armour breaks. Moonbells can slow it down.' },
  warden: { id: 'warden', family: 'lilac', name: 'Harbour Warden', hp: 1700, shell: 80, speed: 24, reward: 700, weight: 999, radius: 45, boss: true, spawn: { type: 'skiff', every: 5 }, tip: 'Launches Skiffs and accelerates as its health falls. Keep heavy towers firing along a long route.' },
  drip: { id: 'drip', family: 'amber', name: 'Drip', hp: 2, speed: 58, reward: 3, weight: 1, radius: 12, tip: 'A slow enemy with little health.' },
  skitter: { id: 'skitter', family: 'ice', name: 'Skitter', hp: 3, speed: 118, reward: 4, weight: 1, radius: 11, tip: 'Moves fast. Use slows or longer routes.' },
  shell: { id: 'shell', family: 'coral', name: 'Shellback', hp: 2, speed: 44, reward: 8, weight: 2, radius: 16, shell: 8, tip: 'Armoured. Use Crackers, Lighthouses or the mill route.' },
  veil: { id: 'veil', family: 'lime', name: 'Veil', hp: 4, speed: 72, reward: 5, weight: 1, radius: 13, hidden: true, tip: 'Hidden until it gets close to a tower. Owls and the bridge reveal it sooner.' },
  bloat: { id: 'bloat', family: 'lilac', name: 'Bloat', hp: 14, speed: 38, reward: 7, weight: 4, radius: 21, split: { type: 'drip', count: 3 }, tip: 'Bursts into three Drips.' },
  wisp: { id: 'wisp', family: 'coral', name: 'Wisp', hp: 1, speed: 96, reward: 1, weight: 1, radius: 8, tip: 'Arrives in large groups. Explosions work well.' },
  mender: { id: 'mender', family: 'pink', name: 'Mender', hp: 9, speed: 48, reward: 9, weight: 2, radius: 15, heal: { radius: 95, rate: 1.6 }, tip: 'Heals nearby enemies. Defeat it first.' },
  vshell: { id: 'vshell', family: 'lime', name: 'Veiled Shell', hp: 3, speed: 50, reward: 12, weight: 2, radius: 16, shell: 8, hidden: true, tip: 'Hidden and armoured. Use an Owl beside a Cracker or Lighthouse.' },
  toad: { id: 'toad', family: 'lilac', name: 'Gloomtoad', hp: 200, speed: 25, reward: 156, weight: 8, radius: 34, spawn: { type: 'drip', every: 2.4 }, boss: true, jams: true, tip: 'Spawns Drips and blocks nearby gates from switching.' },
  gloom: { id: 'gloom', family: 'lilac', name: 'Old Gloom', hp: 1000, speed: 19, reward: 520, weight: 999, radius: 52, spawn: { type: 'veil', every: 3.2 }, boss: true, jams: true, splitAtGate: 'lower', tip: 'Shrouded until it splits in two at the Lower Lock. If either half reaches the lantern, the light goes out.' },
}

export const CHARMS: Record<CharmTrait, { name: string; desc: string; test: (e: { def: EnemyDef; shell: number; revealedPerm: boolean; speedBase: number }) => boolean }> = {
  shell: { name: 'Shell charm', desc: 'Mopes with shells', test: (e) => e.shell > 0 },
  veil: { name: 'Veil charm', desc: 'Hidden Mopes', test: (e) => !!e.def.hidden && !e.revealedPerm },
  swift: { name: 'Swift charm', desc: 'Fast Mopes', test: (e) => e.speedBase >= 90 },
  heavy: { name: 'Heavy charm', desc: 'Bloats and bosses', test: (e) => e.def.hp >= 14 },
}
export const CHARM_COST = 120
export const GATE_COOLDOWN = 0.9
export const FAMILY_BONUS = 1.5
export const SHELL_CHIP = 0.25
export const SPOT_FRACTION = 0.42
/** Mopes that have travelled a short rich run cost this many times their weight in light if they escape. */
export const RICH_LEAK = 2
/** Old Gloom's shroud: the share of damage that lands before it splits at the Lower Lock. */
export const SHROUD_TAKEN = 0.15
/** A shrouded Old Gloom never drops below this share of its toughness, so the split always happens. */
export const SHROUD_FLOOR = 0.25
export const CHARM_ORDER: CharmTrait[] = ['shell', 'veil', 'swift', 'heavy']

export type Difficulty = 'relaxed' | 'standard' | 'nightfall'
/** late (+ late2 x waves squared): extra toughness per wave after the 11th; bossLate: the same for bosses, after the 10th. */
export const DIFFICULTY: Record<Difficulty, { name: string; lives: number; glow: number; hp: number; speed: number; bonus: number; late: number; late2: number; bossLate: number; desc: string; charms: boolean; pausedFlips: boolean }> = {
  relaxed: { name: 'Relaxed', lives: 50, glow: 420, hp: 0.8, speed: 0.95, bonus: 1.15, late: 0.07, late2: 0, bossLate: 0.04, desc: '50 light. Weaker enemies. Retry a wave if you lose.', charms: true, pausedFlips: true },
  standard: { name: 'Standard', lives: 25, glow: 320, hp: 1, speed: 1, bonus: 1, late: 0.35, late2: 0, bossLate: 0.06, desc: '25 light. Pause to plan. Retry a wave if you lose.', charms: true, pausedFlips: true },
  nightfall: { name: 'Nightfall', lives: 15, glow: 320, hp: 1.4, speed: 1, bonus: 0.95, late: 0.1, late2: 0, bossLate: 0.05, desc: '15 light. Tougher enemies. No retries or charms. Gates switch only while the game is running.', charms: false, pausedFlips: false },
}
