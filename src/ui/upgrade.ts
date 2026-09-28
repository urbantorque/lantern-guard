import { TOWERS, computeStats, type TowerId, type TowerStats } from '../game/defs'
import type { GuardianId } from '../game/guardians'

/** Guardian impact modifiers are applied at hit time in the simulation. Show the same hit damage. */
const hitDamage = (id: TowerId, damage: number, guardian?: GuardianId) => damage * (id === 'wick' && guardian === 'reed' ? .75 : id === 'cracker' && guardian === 'ember' ? .6 : 1)

/** One job per path, visible before committing past the crosspath limit. */
export const PATH_ROLE: Record<TowerId, [string, string]> = {
  wick: ['More shots', 'Range & armour damage'],
  cracker: ['Larger explosions', 'Tracking rockets'],
  bell: ['Stronger slows & stuns', 'Range & extra damage'],
  beam: ['Damage & piercing', 'Range & two targets'],
  owl: ['More attack damage', 'Help nearby towers'],
  garden: ['More glow each wave', 'Attacks & bonus glow'],
  storm: ['More lightning jumps', 'Damage & armour breaking'],
  ballista: ['Stronger bolts', 'Faster firing & sight'],
}

export function upgradeDescription(id: TowerId, a: number, b: number, path: 0 | 1, statsFor: typeof computeStats): string {
  const tier = path === 0 ? a : b
  const after = statsFor(id, a + (path === 0 ? 1 : 0), b + (path === 1 ? 1 : 0))
  if (id === 'garden' && path === 0) return `Earns ${after.income} glow after each wave.${after.lifePerWave ? ' Restores 1 light too.' : ''}`
  if (id === 'garden' && path === 1 && tier !== 1) return `${tier === 2 ? 'Slows nearby enemies. ' : ''}Defeated enemies in range drop ${Math.round(after.lure * 100)}% more glow.`
  if (id === 'bell' && path === 0 && tier === 0) return `Slows enemies by ${Math.round(after.slow * 100)}%.`
  if (id === 'wick' && path === 1 && (tier === 0 || tier === 2)) return `More range. Each spark can hit ${after.pierce} enemies.${after.detect ? ' Can hit hidden enemies.' : ''}`
  return TOWERS[id].paths[path].tiers[tier].desc
}

export function refinementSummary(id: TowerId, before: TowerStats, after: TowerStats, guardian?: GuardianId) {
  const fmt = (n: number) => Number(n.toFixed(2))
  const range = `Range ${fmt(before.range)} → ${fmt(after.range)}`
  if (id === 'garden') return `Glow per wave ${before.income} → ${after.income}. ${range}.`
  const damage = `${id === 'beam' ? 'Damage/sec' : 'Damage'} ${fmt(hitDamage(id, before.damage, guardian))} → ${fmt(hitDamage(id, after.damage, guardian))}`
  if (id === 'beam') return `${damage}. ${range}.`
  if (id === 'bell') return `${range}. Slow lasts ${fmt(before.slowDur)} → ${fmt(after.slowDur)} seconds. Attacks faster.`
  return `${damage}. ${range}. Attacks faster.`
}

/** A factual preview calculated from the same tower definitions as the simulation. */
export function upgradeSummary(id: TowerId, a: number, b: number, path: 0 | 1, statsFor: typeof computeStats = computeStats, guardian?: GuardianId): string {
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
  if (after.count !== before.count) changes.push(`${before.count} → ${after.count} ${id === 'storm' ? 'targets' : 'shots'}`)
  if (after.burn !== before.burn) changes.push(`Burns for ${after.burn}/sec`)
  const fmt = (n: number) => Number(n.toFixed(2))
  if (after.damage !== before.damage) changes.push(`${id === 'beam' ? 'Damage/sec' : 'Damage'} ${fmt(hitDamage(id, before.damage, guardian))} → ${fmt(hitDamage(id, after.damage, guardian))}`)
  if (after.range !== before.range) changes.push(`Range ${fmt(before.range)} → ${fmt(after.range)}`)
  if (after.slow !== before.slow) changes.push(`Slow ${Math.round(before.slow * 100)}% → ${Math.round(after.slow * 100)}%`)
  if (after.interval !== before.interval) changes.push(`${Math.round((before.interval / after.interval - 1) * 100)}% faster`)
  if (after.splash !== before.splash) changes.push(`${id === 'storm' ? 'Jump range' : 'Splash'} ${before.splash} → ${after.splash}`)
  if (after.pierce !== before.pierce) changes.push(`Pierces ${after.pierce} targets`)
  return changes.slice(0, 2).join(' · ')
}
