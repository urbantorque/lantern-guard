import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT, type SaveSnapshotV2 } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { BATTLE_PLANS, planIds } from '../src/game/battle-plans'
import { nextCompactVariant } from '../src/game/compact'
import { upgradeDescription, upgradeSummary } from '../src/ui/upgrade'
import { signatureFor, towerName } from '../src/game/guardians'

const fresh = (variant = 3) => new Sim('standard', { compact: 1, plans: 1, variant, guard: 1 })
const fixtures: Record<string, SaveSnapshotV2> = {}
const exact = (sim: Sim) => {
  const snapshot = JSON.parse(JSON.stringify(sim.snapshot()))
  assert(validSnapshot(snapshot))
  const restored = Sim.restore(snapshot)
  for (let i = 0; i < 360; i++) { sim.step(DT); restored.step(DT) }
  assert.deepEqual(restored.snapshot(), sim.snapshot())
}

const map = fresh()
assert.equal(map.pads.length, 12)
assert.equal(map.finalWave, 40)
for (const [index, pad] of map.pads.entries()) for (const segment of map.level.segs.values()) {
  assert(segment.line.distanceTo(pad.x, pad.y) > 44, `Stone Weir plot ${index} overlaps ${segment.id}`)
}
for (const gate of map.level.def.gates) {
  assert(map.level.segs.get(gate.outs[0])!.line.pts[1].x < gate.x)
  assert(map.level.segs.get(gate.outs[1])!.line.pts[1].x > gate.x)
}
assert.deepEqual(map.level.segs.get('inlet')!.next, { gate: 'lower' })
assert(map.level.segs.get('w1')!.line.length > map.level.segs.get('e1')!.line.length)
assert(map.level.segs.get('e2')!.line.length > map.level.segs.get('w2')!.line.length)
assert.deepEqual([0, 1, 2, 3, 4].map(nextCompactVariant), [0, 3, 1, 2, 0])
fixtures['replay-start'] = map.snapshot()
console.log('PASS Stone Weir plot clearance, distinct entrances, route directions and map rotation')

for (const id of planIds) {
  const s = fresh(); const plan = BATTLE_PLANS[id]
  s.wave = plan.wave - 1; s.glow = 100000
  const before = s.snapshot(); assert(!s.chooseBattlePlan(id)); assert.deepEqual(s.snapshot(), before)
  s.wave = plan.wave
  if (plan.wave === 20) assert(s.chooseBattlePlan('piercing'))
  const tower = s.build(0, plan.tower)!
  const ordinary = { ...tower.stats }
  assert(s.chooseBattlePlan(id)); assert(!s.chooseBattlePlan(id))
  assert.equal(s.pendingPlan, null)
  const changed = tower.stats
  if (id === 'piercing') { assert(changed.pierce > ordinary.pierce); assert(changed.damage < ordinary.damage) }
  if (id === 'powder') { assert(changed.splash > ordinary.splash); assert(changed.damage < ordinary.damage) }
  if (id === 'lookout') { assert(changed.range > ordinary.range); assert(changed.interval > ordinary.interval) }
  if (id === 'embers') { assert(changed.burn > ordinary.burn); assert(changed.damage < ordinary.damage) }
  if (id === 'frost') { assert(changed.slow > ordinary.slow); assert(changed.interval > ordinary.interval) }
  if (id === 'moths') { assert(changed.mothEvery > 0); assert(changed.income < ordinary.income) }
  const future = s.build(3, plan.tower)!
  assert.deepEqual(future.stats, tower.stats)
  for (let i = 0; i < 3; i++) assert(s.upgrade(tower, 0))
  assert.deepEqual(tower.stats, s.towerStats(plan.tower, 3, 0))
  if (s.refinementCost(tower)) { assert(s.refine(tower)); assert.deepEqual(tower.stats, s.towerStats(plan.tower, 3, 0, 1)) }
  assert(s.relocate(future, 6))
  assert.equal(s.sellValue(tower), Math.floor(tower.spent * .75))
  assert(s.startWave()); const active = s.snapshot(); assert(!s.chooseBattlePlan(id)); assert.deepEqual(s.snapshot(), active)
  exact(s)
}
console.log('PASS all six benefit/tradeoff pairs, unlock timing, existing/new towers, upgrades and exact mid-wave resume')

const pending = fresh(); pending.wave = 20
assert.equal(pending.pendingPlan, 10)
assert(!pending.chooseBattlePlan('frost'))
assert(pending.chooseBattlePlan('lookout')); assert.equal(pending.pendingPlan, 20)
assert(pending.chooseBattlePlan('moths'))
assert.equal(pending.pendingPlan, null)
const valid = pending.snapshot(); assert(validSnapshot(valid))
for (const mutate of [
  (s: any) => s.battlePlans = ['lookout', 'powder'],
  (s: any) => s.battlePlans = ['unknown'],
  (s: any) => s.battlePlans = ['moths'],
  (s: any) => s.battlePlans = ['lookout', 'lookout'],
  (s: any) => s.wave = 9,
  (s: any) => delete s.challenge.plans,
  (s: any) => s.challenge.plans = 2,
  (s: any) => delete s.challenge.compact,
]) { const bad = structuredClone(valid); mutate(bad); assert(!validSnapshot(bad)) }
const old = new Sim('standard', { compact: 1, variant: 0, guard: 1 }); old.wave = 20
assert(!old.chooseBattlePlan('piercing')); assert.equal(old.pendingPlan, null)
assert(!('battlePlans' in old.snapshot())); assert(validSnapshot(old.snapshot()))
console.log('PASS invalid choices rejected, missed choices remain available, old compact rules unchanged')

const copy = fresh(); copy.wave = 20
assert(upgradeDescription('garden', 0, 0, 0, (id, a, b) => copy.towerStats(id, a, b)).includes('64 glow'))
copy.chooseBattlePlan('lookout'); copy.chooseBattlePlan('moths')
assert(upgradeDescription('garden', 0, 0, 0, (id, a, b) => copy.towerStats(id, a, b)).includes('48 glow'))
assert(upgradeDescription('garden', 0, 0, 1, (id, a, b) => copy.towerStats(id, a, b)).includes('25%'))
assert.equal(towerName('wick', 'reed'), 'Reed Wick'); assert.equal(towerName('bell', 'tide'), 'Tide Bell')
assert(!signatureFor('garden', 'ember'))
const ember = fresh(); ember.wave = 10; ember.challenge.guardian = 'ember'; ember.chooseBattlePlan('powder')
assert.match(upgradeSummary('cracker', 1, 0, 0, (id, a, b) => ember.towerStats(id, a, b), 'ember'), /Damage 0.48 → 0.96/)
console.log('PASS upgrade copy uses real income/rewards and guardian tower names match their replacements')

for (const wave of [10, 20]) {
  const s = fresh(); s.wave = wave; s.glow = 12000
  if (wave >= 11) s.openSources.add('west')
  s.challenge.guardian = 'ember'
  if (wave === 20) s.chooseBattlePlan('powder')
  s.unlockPlot(1); s.unlockPlot(7)
  for (const [pad, id] of [[0, 'wick'], [3, 'cracker'], [6, 'beam'], [10, 'bell'], [1, 'owl'], [7, 'garden']] as const) {
    const t = s.build(pad, id)!
    s.upgrade(t, 0); s.upgrade(t, 0)
  }
  s.glow = 900
  fixtures[`replay-plan-${wave}`] = s.snapshot()
}
for (const [name, snapshot] of Object.entries(fixtures)) assert(validSnapshot(snapshot), name)
writeFileSync(new URL('../qa/replay-fixtures.json', import.meta.url), JSON.stringify(fixtures))
console.log('PASS production-shaped QA snapshots')
