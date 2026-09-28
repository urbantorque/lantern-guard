import type { TowerId, TowerStats } from './defs'

/** Combat revision for new games. Saved runs keep the rules they started with. */
export const BEAM_TARGETS = 3
export const BEAM_SECONDARY_DAMAGE = .5
export const GARDEN_REFINEMENT_COSTS = [180, 220, 140, 120] as const
// These two Nightfall fights previously depended on Lighthouse's hidden boss bonus.
export const NIGHTFALL_LATE_BOSS_HEALTH = .85

export function balanceTower(stats: TowerStats, id: TowerId, b: number) {
  if (id === 'beam') {
    // Each lamp needs its own target. Restore its crowd role after removing duplicate locks.
    if (b === 3) stats.damage *= 1.3
    if (stats.beamLine) stats.pierce = BEAM_TARGETS
  }
  if (id === 'cracker' && b === 3) stats.damage += 2
  if (id === 'storm') { stats.damage += 1; stats.range += 10 }
  if (id === 'ballista') { stats.damage += 10; stats.interval *= .9 }
}

/** Actual incremental income, excluding uncertain kill bonuses and the value of healing. */
export function incomePayback(cost: number, before: number, after: number, wavesLeft: number): string {
  if (after <= before) return ''
  const waves = Math.ceil(cost / (after - before))
  return `Pays back in ${waves} waves; ${wavesLeft} left${waves > wavesLeft ? ' in this game' : ''}.`
}
