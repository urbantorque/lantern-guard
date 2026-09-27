import { computeStats, type TowerId } from '../game/defs'

/** One job per path, visible before committing past the crosspath limit. */
export const PATH_ROLE: Record<TowerId, [string, string]> = {
  wick: ['Crowd fan', 'Piercing reach'],
  cracker: ['Bigger crowds', 'Chase runners'],
  bell: ['Hold groups', 'Boost nearby fire'],
  beam: ['Piercing damage', 'Reach & two targets'],
  owl: ['Hunt heavy targets', 'Boost nearby towers'],
  garden: ['Reliable income', 'Earn along the route'],
}

/** A factual preview calculated from the same tower definitions as the simulation. */
export function upgradeSummary(id: TowerId, a: number, b: number, path: 0 | 1, statsFor: typeof computeStats = computeStats): string {
  const before = statsFor(id, a, b)
  const after = statsFor(id, a + (path === 0 ? 1 : 0), b + (path === 1 ? 1 : 0))
  const changes: string[] = []
  if (after.beamLine && !before.beamLine) changes.push('Pierces a whole line')
  if (after.beams !== before.beams) changes.push(`${after.beams} beam targets`)
  if (after.stunEvery !== before.stunEvery) changes.push(`Stuns groups every ${after.stunEvery} tolls`)
  if (after.brittle && !before.brittle) changes.push('Hits +1; beams +25%')
  if (after.revealPerm && !before.revealPerm) changes.push('Reveals hidden for good')
  else if (after.detect && !before.detect) changes.push('Sees hidden targets')
  if (after.heavy && !before.heavy) changes.push('Full damage to armour')
  if (after.homing && !before.homing) changes.push('Tracks moving targets')
  if (after.dive !== before.dive) changes.push(`${after.dive}-damage dive`)
  if (after.cluster !== before.cluster) changes.push(`${after.cluster} extra bursts`)
  if (after.auraRate !== before.auraRate) changes.push(`Nearby towers +${Math.round(after.auraRate * 100)}% speed`)
  if (after.auraRange !== before.auraRange) changes.push(`Nearby towers +${Math.round(after.auraRange * 100)}% reach`)
  if (after.gardenSlow !== before.gardenSlow) changes.push(`Nearby enemies ${Math.round(after.gardenSlow * 100)}% slower`)
  if (after.lure !== before.lure) changes.push(`Nearby defeats +${Math.round(after.lure * 100)}% glow`)
  if (after.mothEvery && !before.mothEvery) changes.push('Moths defend nearby water')
  if (after.income !== before.income) changes.push(`${before.income} → ${after.income} glow / wave`)
  if (after.lifePerWave !== before.lifePerWave) changes.push(`+${after.lifePerWave} light / wave`)
  if (after.count !== before.count) changes.push(`${before.count} → ${after.count} shots`)
  if (after.burn !== before.burn) changes.push(`Burns for ${after.burn}/sec`)
  if (after.damage !== before.damage) changes.push(`${id === 'beam' ? 'DPS' : 'Damage'} ${before.damage} → ${after.damage}`)
  if (after.range !== before.range) changes.push(`Range ${before.range} → ${after.range}`)
  if (after.slow !== before.slow) changes.push(`Slow ${Math.round(before.slow * 100)}% → ${Math.round(after.slow * 100)}%`)
  if (after.interval !== before.interval) changes.push(`${Math.round((before.interval / after.interval - 1) * 100)}% faster`)
  if (after.splash !== before.splash) changes.push(`Splash ${before.splash} → ${after.splash}`)
  if (after.pierce !== before.pierce) changes.push(`Pierces ${after.pierce} targets`)
  return changes.slice(0, 2).join(' · ')
}
