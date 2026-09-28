import type { TowerId, TowerStats } from './defs'

/** Optional, run-only choices. Their version lives on Challenge so old saves keep their rules. */
export const BATTLE_PLANS = {
  piercing: { wave: 10, name: 'Piercing sparks', tower: 'wick', benefit: 'Wickling shots pass through 2 more enemies.', tradeoff: 'Each hit deals 15% less damage.' },
  powder: { wave: 10, name: 'Wide bursts', tower: 'cracker', benefit: 'Cracker explosions are 35% wider.', tradeoff: 'Each hit deals 20% less damage.' },
  lookout: { wave: 10, name: 'Lookout owls', tower: 'owl', benefit: 'Lamp Owls see and shoot 25% farther.', tradeoff: 'They take 20% longer between shots.' },
  embers: { wave: 20, name: 'Burning beams', tower: 'beam', benefit: 'Lighthouse hits add a burn: 2 damage a second for 2 seconds.', tradeoff: 'The beam deals 15% less damage.' },
  frost: { wave: 20, name: 'Deep chill', tower: 'bell', benefit: 'Adds 10% to Moonbell slows: a 35% slow becomes 45%, up to 80%.', tradeoff: 'They take 20% longer between attacks.' },
  moths: { wave: 20, name: 'Moth gardens', tower: 'garden', benefit: 'All Glow Gardens send moths to attack enemies, including hidden ones.', tradeoff: 'Gardens earn 25% less glow each wave.' },
} as const satisfies Record<string, { wave: number; name: string; tower: TowerId; benefit: string; tradeoff: string }>
export type BattlePlanId = keyof typeof BATTLE_PLANS
export const PLAN_ROUNDS = [10, 20] as const
export const planIds = Object.keys(BATTLE_PLANS) as BattlePlanId[]

export function applyBattlePlans(stats: TowerStats, id: TowerId, plans: readonly BattlePlanId[]) {
  for (const plan of plans) {
    if (BATTLE_PLANS[plan].tower !== id) continue
    switch (plan) {
      case 'piercing': stats.pierce += 2; stats.damage *= .85; break
      case 'powder': stats.splash *= 1.35; stats.damage *= .8; break
      case 'lookout': stats.range *= 1.25; stats.interval *= 1.2; break
      case 'embers': stats.burn += 2; stats.burnDur = Math.max(2, stats.burnDur); stats.damage *= .85; break
      case 'frost': stats.slow = Math.min(.8, stats.slow + .1); stats.interval *= 1.2; break
      case 'moths':
        stats.mothEvery = stats.mothEvery ? Math.min(stats.mothEvery, 1.2) : 1.2
        stats.damage = Math.max(1, stats.damage); stats.detect = true
        stats.income = Math.round(stats.income * .75)
        break
    }
  }
}
