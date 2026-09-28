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
    role: 'Quick sparks',
    blurb: 'Cheap and quick. Best on amber Drips. Sparks only chip shells.',
    cost: 110,
    kind: 'spark',
    hue: '#ffb547',
    family: 'amber',
    base: { range: 150, interval: 0.62, damage: 1, pierce: 1, projSpeed: 820 },
    paths: [
      {
        name: 'Fan',
        tiers: [
          { name: 'Twin Wick', cost: 95, desc: 'Two sparks per flick.', apply: (s) => { s.count = 2; s.spread = 0.2 } },
          { name: 'Tri-Candle', cost: 210, desc: 'Three sparks, flicks faster.', apply: (s) => { s.count = 3; s.spread = 0.3; s.interval *= 0.8 } },
          { name: 'Candelabra', cost: 620, desc: 'A blazing fan of five hot sparks.', apply: (s) => { s.count = 5; s.spread = 0.55; s.interval *= 0.7; s.damage += 1 } },
        ],
      },
      {
        name: 'Long',
        tiers: [
          { name: 'Long Wick', cost: 85, desc: 'More range. Sparks pass through 2.', apply: (s) => { s.range += 35; s.pierce += 1 } },
          { name: 'Hot Wax', cost: 230, desc: 'Molten sparks melt shells. +1 damage.', apply: (s) => { s.damage += 1; s.heavy = true } },
          { name: 'Beacon Wick', cost: 680, desc: 'Huge range, pierces 7, sees Veils.', apply: (s) => { s.range += 70; s.pierce += 5; s.damage += 2; s.detect = true; s.projSpeed = 1250 } },
        ],
      },
    ],
  },
  cracker: {
    id: 'cracker',
    name: 'Cracker',
    role: 'Firework splash',
    blurb: 'Bursts crack shells and pop crowds. Best on coral Mopes.',
    cost: 200,
    kind: 'lob',
    hue: '#ff7a59',
    family: 'coral',
    base: { range: 165, interval: 1.35, damage: 1, splash: 52, heavy: true, projSpeed: 0.55 },
    paths: [
      {
        name: 'Boom',
        tiers: [
          { name: 'Big Bang', cost: 140, desc: 'Much wider bursts.', apply: (s) => { s.splash += 22 } },
          { name: 'Double Pop', cost: 300, desc: '+1 damage and fires faster.', apply: (s) => { s.damage += 1; s.interval *= 0.8 } },
          { name: 'Grand Finale', cost: 780, desc: 'Each burst scatters five more.', apply: (s) => { s.cluster = 5; s.damage += 1 } },
        ],
      },
      {
        name: 'Rocket',
        tiers: [
          { name: 'Sparkler Tail', cost: 120, desc: 'Bursts set Mopes smouldering.', apply: (s) => { s.burn = 1; s.burnDur = 2.2 } },
          { name: 'Rocketry', cost: 320, desc: 'Fast homing rockets, more range.', apply: (s) => { s.range += 55; s.homing = true; s.interval *= 0.85 } },
          { name: 'Skyrocket Battery', cost: 760, desc: 'Three rockets per volley.', apply: (s) => { s.count = 3; s.burn = 2; s.splash += 8 } },
        ],
      },
    ],
  },
  bell: {
    id: 'bell',
    name: 'Moonbell',
    role: 'Slowing toll',
    blurb: 'Tolls slow every Mope nearby, even hidden ones. Best on icy Skitters.',
    cost: 150,
    kind: 'pulse',
    hue: '#9fd8ff',
    family: 'ice',
    base: { range: 115, interval: 1.7, damage: 0, slow: 0.35, slowDur: 1.5 },
    paths: [
      {
        name: 'Toll',
        tiers: [
          { name: 'Deep Toll', cost: 110, desc: 'Slows much harder.', apply: (s) => { s.slow = 0.5 } },
          { name: 'Ringing Hit', cost: 240, desc: 'Each toll deals 1 damage.', apply: (s) => { s.damage = 1 } },
          { name: 'Stillbell', cost: 650, desc: 'Every third toll stuns groups. Bosses resist stuns.', apply: (s) => { s.stunEvery = 3; s.stunDur = 1.1; s.damage = 2 } },
        ],
      },
      {
        name: 'Chime',
        tiers: [
          { name: 'Wide Chime', cost: 100, desc: 'Larger toll radius.', apply: (s) => { s.range += 35 } },
          { name: 'Resonance', cost: 260, desc: 'Tolled enemies take +1 per hit; beams and burns deal +25%.', apply: (s) => { s.brittle = true } },
          { name: 'Bellwether', cost: 700, desc: 'Tolls strip Veils for good.', apply: (s) => { s.revealPerm = true; s.slowDur += 0.8; s.range += 15 } },
        ],
      },
    ],
  },
  beam: {
    id: 'beam',
    name: 'Lighthouse',
    role: 'Focused beam',
    blurb: 'A steady beam that melts shells. Best on lilac Bloats and bosses.',
    cost: 340,
    kind: 'beam',
    hue: '#cdb8ff',
    family: 'lilac',
    base: { range: 205, damage: 7, heavy: true },
    paths: [
      {
        name: 'Focus',
        tiers: [
          { name: 'Lens Polish', cost: 190, desc: 'Beam burns much hotter.', apply: (s) => { s.damage += 5 } },
          { name: 'Piercing Ray', cost: 420, desc: 'Beam hits every Mope along its line.', apply: (s) => { s.beamLine = true; s.damage += 2 } },
          { name: 'Sunbeam', cost: 1150, desc: 'A searing ray that leaves Mopes burning.', apply: (s) => { s.damage += 16; s.burn = 4; s.burnDur = 2 } },
        ],
      },
      {
        name: 'Sweep',
        tiers: [
          { name: 'Tall Tower', cost: 170, desc: 'Much longer reach.', apply: (s) => { s.range += 45 } },
          { name: 'Night Lens', cost: 360, desc: 'Beam can see Veils.', apply: (s) => { s.detect = true; s.damage += 2 } },
          { name: 'Twin Lamps', cost: 980, desc: 'Two beams, two targets.', apply: (s) => { s.beams = 2; s.damage += 6 } },
        ],
      },
    ],
  },
  owl: {
    id: 'owl',
    name: 'Lamp Owl',
    role: 'Sees Veils',
    blurb: 'Spots lime Veils across its whole sight so every keeper can hit them.',
    cost: 170,
    kind: 'owl',
    hue: '#c9f07a',
    family: 'lime',
    base: { range: 150, interval: 0.85, damage: 1, detect: true, homing: true, projSpeed: 620 },
    paths: [
      {
        name: 'Hunter',
        tiers: [
          { name: 'Sharp Talons', cost: 130, desc: 'Throws feathers much faster.', apply: (s) => { s.interval *= 0.65 } },
          { name: 'Ironbeak', cost: 280, desc: '+1 damage. Feathers crack shells.', apply: (s) => { s.damage += 1; s.heavy = true } },
          { name: 'Great Horned', cost: 760, desc: 'Dives on the strongest Mope for 30.', apply: (s) => { s.dive = 30 } },
        ],
      },
      {
        name: 'Watch',
        tiers: [
          { name: 'Keen Eyes', cost: 140, desc: 'Sees much further.', apply: (s) => { s.range += 50 } },
          { name: 'Night Watch', cost: 300, desc: 'Keepers in sight get +15% range.', apply: (s) => { s.auraRange = 0.15 } },
          { name: 'Parliament', cost: 720, desc: 'Nearby attacking towers act 30% faster.', apply: (s) => { s.auraRate = 0.3; s.auraRange = 0.15 } },
        ],
      },
    ],
  },
  garden: {
    id: 'garden',
    name: 'Glow Garden',
    role: 'Earns glow',
    blurb: 'Grows glow each wave. Upgrade it to reward Mopes routed past it.',
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
          { name: 'Sweet Nectar', cost: 150, desc: 'Mopes cheered nearby drop +50% glow.', apply: (s) => { s.lure = 0.5 } },
          { name: 'Moth Guard', cost: 330, desc: 'Moths hunt nearby Mopes, even Veils.', apply: (s) => { s.mothEvery = 0.9; s.damage = 1; s.detect = true } },
          { name: 'Moonflower', cost: 800, desc: 'Slows Mopes nearby. Cheered Mopes give double glow.', apply: (s) => { s.lure = 1; s.gardenSlow = 0.3; s.mothEvery = 0.5; s.damage = 2 } },
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
  reedling: { id: 'reedling', family: 'amber', name: 'Reedling', hp: 22, speed: 58, reward: 13, weight: 3, radius: 17, tip: 'Grows one shell at the Water Gardens meeting point. Catch it early with Wicklings, or use heavy hits after the merge.' },
  bloomheart: { id: 'bloomheart', family: 'lilac', name: 'Bloomheart', hp: 3300, shell: 100, speed: 27, reward: 900, weight: 999, radius: 46, boss: true, tip: 'At 70% and 35% health, signals a healing pulse for 3 seconds. Clear nearby ordinary Mopes before it lands. Never heals itself.' },
  skiff: { id: 'skiff', family: 'coral', name: 'Skiff', hp: 7, shell: 8, speed: 50, reward: 12, weight: 2, radius: 17, tip: 'Accelerates after its armour breaks. Pair heavy hits with Moonbell slows.' },
  warden: { id: 'warden', family: 'lilac', name: 'Harbour Warden', hp: 1700, shell: 80, speed: 24, reward: 700, weight: 999, radius: 45, boss: true, spawn: { type: 'skiff', every: 5 }, tip: 'Launches Skiffs and accelerates as its health falls. Keep heavy towers firing along a long route.' },
  drip: { id: 'drip', family: 'amber', name: 'Drip', hp: 2, speed: 58, reward: 3, weight: 1, radius: 12, tip: 'A small, grumpy Mope. Easy to cheer up.' },
  skitter: { id: 'skitter', family: 'ice', name: 'Skitter', hp: 3, speed: 118, reward: 4, weight: 1, radius: 11, tip: 'Fast. Keep it on the long loops.' },
  shell: { id: 'shell', family: 'coral', name: 'Shellback', hp: 2, speed: 44, reward: 8, weight: 2, radius: 16, shell: 8, tip: 'Sparks only chip its shell. The Mill wheel, fireworks, beams and hot wax crack it.' },
  veil: { id: 'veil', family: 'lime', name: 'Veil', hp: 4, speed: 72, reward: 5, weight: 1, radius: 13, hidden: true, tip: 'Hidden. Keepers only spot it up close. The Lantern bridge and Lamp Owls reveal it.' },
  bloat: { id: 'bloat', family: 'lilac', name: 'Bloat', hp: 14, speed: 38, reward: 7, weight: 4, radius: 21, split: { type: 'drip', count: 3 }, tip: 'Bursts into three Drips.' },
  wisp: { id: 'wisp', family: 'coral', name: 'Wisp', hp: 1, speed: 96, reward: 1, weight: 1, radius: 8, tip: 'Tiny and many. Splash handles swarms.' },
  mender: { id: 'mender', family: 'pink', name: 'Mender', hp: 9, speed: 48, reward: 9, weight: 2, radius: 15, heal: { radius: 95, rate: 1.6 }, tip: 'Heals nearby Mopes. Cheer it up first.' },
  vshell: { id: 'vshell', family: 'lime', name: 'Veiled Shell', hp: 3, speed: 50, reward: 12, weight: 2, radius: 16, shell: 8, hidden: true, tip: 'Hidden and shelled. The Lantern bridge and Mill wheel undo both.' },
  toad: { id: 'toad', family: 'lilac', name: 'Gloomtoad', hp: 200, speed: 25, reward: 156, weight: 8, radius: 34, spawn: { type: 'drip', every: 2.4 }, boss: true, jams: true, tip: 'Spits Drips and jams any gate it sits on.' },
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
  relaxed: { name: 'Relaxed', lives: 50, glow: 420, hp: 0.8, speed: 0.95, bonus: 1.15, late: 0.07, late2: 0, bossLate: 0.04, desc: 'Plenty of light and softer Mopes. Play at your own pace.', charms: true, pausedFlips: true },
  standard: { name: 'Standard', lives: 25, glow: 320, hp: 1, speed: 1, bonus: 1, late: 0.35, late2: 0, bossLate: 0.06, desc: 'The intended challenge. Pause any time to plan.', charms: true, pausedFlips: true },
  nightfall: { name: 'Nightfall', lives: 15, glow: 320, hp: 1.4, speed: 1, bonus: 0.95, late: 0.1, late2: 0, bossLate: 0.05, desc: 'Mopes grow much tougher. No charms, no flipping while paused.', charms: false, pausedFlips: false },
}
