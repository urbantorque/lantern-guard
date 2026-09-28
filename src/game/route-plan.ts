import { TOWERS } from './defs'
import type { Segment } from './level'
import type { GateState, Sim, Tower } from './sim'

const attacks = (tower: Tower) => tower.stats.damage > 0 && (tower.id !== 'garden' || tower.stats.mothEvery > 0)

/** Geometry only: coverage is not a prediction of damage or whether an enemy will die. */
export function coveredLength(segment: Segment, x: number, y: number, range: number): number {
  const p = { x: 0, y: 0, tx: 0, ty: 0 }
  let length = 0
  for (let s = 0; s < segment.line.length; s += 10) {
    const step = Math.min(10, segment.line.length - s)
    segment.line.at(s + step / 2, p)
    if ((p.x - x) ** 2 + (p.y - y) ** 2 <= range ** 2) length += step
  }
  return length
}

/** Follow the chosen branch all the way to the lantern, using downstream lock settings. */
export function routeSegments(sim: Sim, gate: GateState, dir: 0 | 1): Segment[] {
  const result: Segment[] = []
  let id = gate.def.outs[dir]
  const visited = new Set<string>()
  while (!visited.has(id)) {
    visited.add(id)
    const seg = sim.level.segs.get(id)
    if (!seg) break
    result.push(seg)
    if ('home' in seg.next) break
    if ('seg' in seg.next) id = seg.next.seg
    else {
      const next = sim.gates.find(g => g.def.id === (seg.next as { gate: string }).gate)
      if (!next) break
      id = next.def.outs[sim.gateEffectiveDir(next)]
    }
  }
  return result
}

export function routeCoverage(sim: Sim, gate: GateState, dir: 0 | 1) {
  const segments = routeSegments(sim, gate, dir)
  const branch = segments[0]
  const towers = sim.towers.filter(t => segments.some(s => coveredLength(s, t.x, t.y, sim.effRange(t)) > 0))
  const branchTowers = branch ? towers.filter(t => coveredLength(branch, t.x, t.y, sim.effRange(t)) > 0) : []
  const attackers = branchTowers.filter(t => attacks(t) && t.id !== 'bell' && t.id !== 'owl')
  const support = branchTowers.filter(t => t.id === 'bell' || t.id === 'owl')
  return { segments, towers, branchTowers, attackers, support }
}

/** Two towers interact only when they cover a shared piece of water. */
export function sharedWater(sim: Sim, a: Tower, b: Tower): boolean {
  const p = { x: 0, y: 0, tx: 0, ty: 0 }
  for (const s of sim.level.segs.values()) {
    for (let at = 0; at < s.line.length; at += 12) {
      s.line.at(at, p)
      if ((p.x - a.x) ** 2 + (p.y - a.y) ** 2 <= sim.effRange(a) ** 2 &&
          (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= sim.effRange(b) ** 2) return true
    }
  }
  return false
}

export function towerPartners(sim: Sim, tower: Tower): Tower[] {
  return sim.towers.filter(other => other !== tower &&
    ((tower.id === 'bell' || tower.id === 'owl') ? attacks(other) : other.id === 'bell' || other.id === 'owl') &&
    sharedWater(sim, tower, other))
}

export function comboHint(sim: Sim, tower: Tower): string {
  const partners = towerPartners(sim, tower)
  if (tower.id === 'garden') return `Earns ${tower.stats.income} glow each wave. Keep attacking towers nearby.`
  if (tower.id === 'bell') return partners.length
    ? `Slows enemies in range of ${TOWERS[partners[0].id].name}.`
    : 'Build an attacking tower nearby to hit slowed enemies.'
  if (tower.id === 'owl') return partners.length
    ? `Reveals hidden enemies for ${TOWERS[partners[0].id].name}.`
    : 'Build an attacking tower nearby to hit enemies the Owl reveals.'
  const owl = partners.find(t => t.id === 'owl')
  const bell = partners.find(t => t.id === 'bell')
  if (bell?.stats.brittle) return 'The nearby Moonbell makes enemies take extra damage.'
  if (owl && !tower.stats.detect) return 'Lamp Owl covers the same water and reveals hidden targets for this tower.'
  if (bell) return `Moonbell covers the same water: more time for ${tower.id === 'cracker' ? 'crowd bursts' : 'attacks'}.`
  return tower.id === 'cracker' ? 'Pair with Moonbell on the same bend for more bursts against slowed groups.'
    : 'Pair with Moonbell for more firing time, or Lamp Owl to reveal hidden targets.'
}
