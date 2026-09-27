import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { TOWER_ORDER } from '../src/game/defs'
import { routeSegments, routeCoverage, sharedWater } from '../src/game/route-plan'
import { validSnapshot } from '../src/game/save-store'
import { DT, Sim, type SaveSnapshotV2 } from '../src/game/sim'
import { runBot } from './bot'
import { BOTS } from './sim-bots'

const fresh = () => new Sim('standard', { expanding: 1, guard: 1 })
const sim = fresh()
const old = new Sim('standard', { expanding: 1 })
for (let wave = 1; wave <= 25; wave++) assert.deepEqual(sim.waveDef(wave).groups, old.waveDef(wave).groups)
for (const id of TOWER_ORDER) assert.equal(sim.towerCost(id), old.towerCost(id))
assert(validSnapshot(sim.snapshot()))
assert(!validSnapshot({ ...sim.snapshot(), challenge: { guard: 1 } }))
assert(!validSnapshot({ ...sim.snapshot(), challenge: { expanding: 1, guard: 2 } }))
sim.wave = 1
const gate = sim.gates[1]
assert(sim.flipGate(gate))
assert.equal(gate.cd, 0)
assert(sim.flipGate(gate))
sim.startWave()
assert(sim.flipGate(gate))
assert(!sim.flipGate(gate))
assert.equal(sim.charmsAllowed, false)
console.log('PASS version validation, preserved waves/costs, persistent routes and live cooldown')

// An enemy can leave the short branch before being defeated: its reward and risk travel together.
const reward = fresh()
reward.glow = 10000
const tower = reward.build(16, 'wick')!
reward.upgrade(tower, 0)
const marked = reward.spawnEnemy('drip', reward.level.segs.get('h')!, 15, 1)
marked.rich = true
const bank = reward.glow
for (let i = 0; i < 180 && marked.alive; i++) reward.step(DT)
assert.equal(marked.alive, false)
assert.equal(reward.stats.leaked, 0)
assert.equal(reward.glow - bank, 6)
const escaped = fresh()
const water = escaped.level.segs.get('h')!
const leak = escaped.spawnEnemy('drip', water, water.line.length - 0.01, 1)
leak.rich = true
escaped.step(DT)
assert.equal(escaped.maxLives - escaped.lives, 2)
console.log('PASS downstream marked enemies pay double glow or cost double light')

const planning = fresh()
planning.wave = 7
assert(planning.guardPlanning)
const busy = planning.spawnEnemy('drip', planning.level.segs.get('h')!, 0, 7)
assert(!planning.canStartWave())
busy.alive = false
planning.enemies = []
assert(planning.canStartWave())
const bellSim = fresh()
bellSim.wave = 7
bellSim.glow = 10000
const bell = bellSim.build(12, 'bell')!
const cracker = bellSim.build(13, 'cracker')!
assert(sharedWater(bellSim, bell, cracker))
assert.equal(bell.stats.range, old.towerStats('bell', 0, 0).range + 20)
assert.deepEqual(routeSegments(bellSim, bellSim.gates[1], 1).map(s => s.id), ['e2', 'h'])
assert(routeCoverage(bellSim, bellSim.gates[1], 1).branchTowers.includes(bell))
console.log('PASS critical-wave planning, real shared coverage and path-to-lantern preview')

const sight = fresh()
sight.wave = 7
sight.glow = 1000
const owl = sight.build(12, 'owl')!
const wick = sight.build(13, 'wick')!
// Find real shared water inside the attacker's close sight and the Owl's full sight.
const stream = sight.level.segs.get('e2')!
const pt = { x: 0, y: 0, tx: 0, ty: 0 }
let sightAt = -1
for (let at = 0; at < stream.line.length; at++) {
  stream.line.at(at, pt)
  // Visibility includes the Veil's 13-unit body radius, matching an actual encounter.
  if (Math.hypot(pt.x - owl.x, pt.y - owl.y) < owl.stats.range + 11 && Math.hypot(pt.x - wick.x, pt.y - wick.y) < wick.stats.range * 0.42 + 11) { sightAt = at; break }
}
assert(sightAt >= 0)
const veil = sight.spawnEnemy('veil', stream, sightAt, 8)
sight.step(DT)
assert.equal(veil.seenT, 0.8, 'A later attacker must not shorten the Owl reveal')
assert.equal(owl.spotted, 1)
console.log('PASS Owl reveal is shared and survives another tower checking visibility')

for (const wave of [8, 15, 20, 25]) {
  const standard = fresh()
  const nightfall = new Sim('nightfall', { expanding: 1, guard: 1 })
  const a = standard.spawnEnemy('shell', standard.level.segs.get('n0')!, 0, wave)
  const b = nightfall.spawnEnemy('shell', nightfall.level.segs.get('n0')!, 0, wave)
  assert(b.hp > a.hp && b.shell > a.shell, `Nightfall must be tougher at wave ${wave}`)
}
console.log('PASS Nightfall stays tougher than Standard through the final wave')

// Snapshot continuity is checked in every section and during the boss split.
const fixtures: Record<string, SaveSnapshotV2> = { 'guard-start': fresh().snapshot() }
const stages = new Set<number>()
let previous: SaveSnapshotV2 | undefined
const result = runBot({ ...BOTS[12], router: 'plan' }, 'standard', 7, run => {
  const snapshot = () => run.snapshot()
  if (run.events.some(e => e.t === 'waveEnd') && [1, 5, 7, 9, 10, 23, 24].includes(run.wave)) fixtures[`guard-plan-${run.wave + 1}`] = snapshot()
  if ((!stages.has(run.canalStage) && run.enemies.length >= 4) || run.events.some(e => e.t === 'split')) {
    stages.add(run.canalStage)
    const snap = snapshot()
    assert(validSnapshot(snap))
    const restored = Sim.restore(JSON.parse(JSON.stringify(snap)))
    // JSON intentionally normalises negative zero in stationary projectile velocities.
    assert.equal(JSON.stringify(restored.snapshot()), JSON.stringify(snap))
    const control = Sim.restore(snap)
    for (let i = 0; i < 240; i++) { restored.step(DT); control.step(DT) }
    assert.equal(JSON.stringify(restored.snapshot()), JSON.stringify(control.snapshot()))
    if (run.events.some(e => e.t === 'split')) {
      assert.equal(run.enemies.filter(e => e.def.id === 'gloom').length, 2)
      fixtures['guard-split'] = snap
    }
  }
  if (run.over === 'won' && previous) fixtures['guard-dawn'] = previous
  previous = snapshot()
}, { expanding: 1, guard: 1 })
assert.equal(result.outcome, 'WON', JSON.stringify(result))
assert.equal(result.flips, 0)
assert.equal(stages.size, 3)
assert(fixtures['guard-split'] && fixtures['guard-plan-25'] && fixtures['guard-dawn'])
// The fixed-route comparison uses the same build, budget, seed and rules, with switching disabled.
const fixed = runBot({ ...BOTS[12], router: 'none' }, 'standard', 7, undefined, { expanding: 1, guard: 1, lockedGates: true })
assert.equal(fixed.outcome, 'WON', JSON.stringify(fixed))
assert.equal(fixed.flips, 0)
const nightPlan = runBot({ ...BOTS[12], router: 'plan', gardens: 1, maxTowers: 6 }, 'nightfall', 7, undefined, { expanding: 1, guard: 1 })
assert.equal(nightPlan.outcome, 'WON', JSON.stringify(nightPlan))
assert.equal(nightPlan.flips, 0)
console.log('PASS complete planning-only and fixed-route nights; all sections and boss-split saves resume exactly')
console.log(`PASS Nightfall planning build wins with ${nightPlan.lives}/${nightPlan.maxLives} light and no live switching`)
writeFileSync(new URL('../qa/guard-fixtures.json', import.meta.url), JSON.stringify(fixtures))
