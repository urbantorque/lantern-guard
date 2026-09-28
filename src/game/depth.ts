import type { TowerId, TowerStats } from './defs'
import { ENEMIES } from './defs'
import type { WaveDef } from './waves'

export const LATE_TOWERS: TowerId[] = ['storm', 'ballista']
export const LATE_REFINEMENTS = [
  { wave: 31, cost: 1800, name: 'Level 6' },
  { wave: 36, cost: 2600, name: 'Level 7' },
] as const

/** Preserve levels 4/5; later levels have smaller gains and a distinct final perk. */
export function lateRefine(stats: TowerStats, id: TowerId, rank: number) {
  const extra = Math.max(0, rank - 2)
  if (!extra) return
  stats.damage *= 1 + extra * .12
  stats.interval *= .94 ** extra
  stats.range *= 1 + extra * .03
  stats.slowDur *= 1 + extra * .08
  stats.income = Math.round(stats.income * (1 + extra * .12))
  if (rank < 4) return
  if (id === 'wick') stats.pierce += 2
  if (id === 'cracker') stats.splash += 16
  if (id === 'bell') stats.slow = Math.min(.8, stats.slow + .08)
  if (id === 'beam') { stats.burn += 2; stats.burnDur = Math.max(2, stats.burnDur) }
  if (id === 'owl') stats.auraRange += .08
  if (id === 'garden') stats.lifePerWave += 1
  if (id === 'storm') stats.count += 1
  if (id === 'ballista') stats.damage *= 1.15
}

export const FINAL_PERK: Record<TowerId, string> = {
  wick: 'Sparks pass through 2 more enemies.', cracker: 'Explosions reach a wider area.',
  bell: 'Slows enemies more.', beam: 'Beams burn enemies for extra damage.',
  owl: 'Nearby towers gain 8% more range.', garden: 'Restores 1 extra light after each wave.',
  storm: 'Lightning jumps to 1 more enemy.', ballista: 'Bolts deal 15% more damage.',
}

export type PreparationId = 'oil' | 'net' | 'ward'
export interface Preparation { id: PreparationId; round: number; wave: number; charges: number }
export const PREPARATIONS: Record<PreparationId, { name: string; description: string }> = {
  oil: { name: 'Quickwick oil', description: 'All attacking towers fire 15% faster for the next wave.' },
  net: { name: 'Bramble net', description: 'Catches the first 8 ordinary enemies near the lantern. Deals damage and slows them for 3 seconds.' },
  ward: { name: 'Lantern ward', description: 'Prevents the next 4 light lost during the next wave.' },
}
export const preparationCost = (round: number) => 60 + round * 6
export const netDamage = (round: number) => 8 + round * .8

/** Change arrival patterns only: enemy counts, counters and glow budgets stay authored. */
export function encounterWave(base: WaveDef, n: number, seed: number): WaveDef {
  if (n <= 11 || n > 40 || base.groups.some(g => ENEMIES[g.type].boss)) return base
  const pattern = ((Math.imul(seed, 31) + Math.imul(n, 17)) >>> 0) % 3
  const groups = base.groups.map((g, i) => {
    if (pattern === 0) return { ...g, at: g.at + (i % 2 ? 2 : 0), gap: g.gap * .9 }
    if (pattern === 1) return { ...g, at: g.at + i * 1.4, gap: g.gap * 1.1 }
    return { ...g, at: g.at + (g.src === 'west' ? 3 : 0) }
  })
  return { ...base, groups, encounter: ['Close groups', 'Steady arrivals', 'Staggered entrances'][pattern] }
}

export function nextMilestone(wave: number): string {
  const milestones: [number, string][] = [
    [5, 'Clear wave 5 · buy more building space'],
    [10, 'Clear wave 10 · choose a battle plan'],
    [15, 'Clear wave 15 · Storm Reed + Level 4'],
    [20, 'Clear wave 20 · second battle plan'],
    [25, 'Clear wave 25 · Dusk Ballista + Level 5'],
    [30, 'Clear wave 30 · Level 6 upgrades'],
    [35, 'Clear wave 35 · Level 7 upgrades'],
    [40, 'Wave 40 · defeat Bloomheart'],
  ]
  return milestones.find(([at]) => wave < at)?.[1] ?? 'The settlement is safe'
}
