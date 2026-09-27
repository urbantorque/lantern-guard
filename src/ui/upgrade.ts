import { computeStats, type TowerId } from '../game/defs'

/** A factual preview calculated from the same tower definitions as the simulation. */
export function upgradeSummary(id: TowerId, a: number, b: number, path: 0 | 1, statsFor: typeof computeStats = computeStats): string {
  const before = statsFor(id, a, b)
  const after = statsFor(id, a + (path === 0 ? 1 : 0), b + (path === 1 ? 1 : 0))
  if (after.range !== before.range) return `Range ${before.range} → ${after.range}`
  if (after.income !== before.income) return `${before.income} → ${after.income} glow / wave`
  if (after.count !== before.count) return `${before.count} → ${after.count} shots`
  if (after.damage !== before.damage) return `Damage ${before.damage} → ${after.damage}`
  if (after.slow !== before.slow) return `Slow ${Math.round(before.slow * 100)}% → ${Math.round(after.slow * 100)}%`
  if (after.interval !== before.interval) return `${Math.round((before.interval / after.interval - 1) * 100)}% faster`
  if (after.splash !== before.splash) return `Splash ${before.splash} → ${after.splash}`
  return ''
}
