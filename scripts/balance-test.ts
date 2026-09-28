import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT, type SaveSnapshotV2 } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { compactChallenge, offerFor } from '../src/game/tides'
import { incomePayback, NIGHTFALL_LATE_BOSS_HEALTH } from '../src/game/balance'
import { upgradeDescription } from '../src/ui/upgrade'
import { TOWER_ORDER, type TowerId } from '../src/game/defs'

const fresh = (balance = true) => {
  const s = new Sim('standard', { compact: 1, depth: 1, guard: 1, variant: 0, ...(balance ? { balance: 1 } : {}) })
  s.wave = 35; s.glow = 100000; return s
}
const build = (s: Sim, id: TowerId, a: number, b: number) => {
  const t = s.build(3, id)!
  for (let i = 0; i < a; i++) assert(s.upgrade(t, 0))
  for (let i = 0; i < b; i++) assert(s.upgrade(t, 1))
  return t
}
const target = (s: Sim, id: 'bloat' | 'warden' | 'shell' | 'veil' = 'bloat', at = 145) => {
  const e = s.spawnEnemy(id, s.level.segs.get('e1')!, at, 36)
  e.hp = e.maxHp = 100000; e.shell = e.maxShell = 0; e.speedBase = 0; e.spawnCd = 1e6
  return e
}
const exact = (s: Sim) => {
  const data = JSON.parse(JSON.stringify(s.snapshot()))
  assert(validSnapshot(data)); const resumed = Sim.restore(data)
  assert.deepEqual(resumed.snapshot(), data)
  for (let i = 0; i < 300; i++) { s.step(DT); resumed.step(DT) }
  assert.deepEqual(resumed.snapshot(), s.snapshot())
}

for (const revised of [false, true]) {
  const s = fresh(revised), t = build(s, 'beam', 2, 1)
  const crowd = Array.from({ length: 12 }, () => target(s))
  s.step(DT)
  const damage = crowd.map(e => 100000 - e.hp).filter(v => v > 0).sort((a, b) => b - a)
  assert.equal(damage.length, revised ? 3 : 12)
  if (revised) assert(Math.abs(damage[0] / damage[1] - 2) < .00001)
  assert(upgradeDescription('beam', 1, 1, 0, (id, a, b) => s.towerStats(id, a, b)).includes(revised ? 'half damage' : 'every enemy'))
  assert(t.stats.beamLine); exact(s)
}
console.log('PASS beam piercing caps targets, halves extra hits and preserves old saves')

for (const revised of [false, true]) {
  const s = fresh(revised), t = build(s, 'beam', 1, 3)
  const old = target(s), boss = target(s, 'warden')
  t.beamTargets = [old, boss]; old.alive = false
  s.step(DT)
  assert.equal(t.beamTargets[0], boss)
  assert.equal(t.beamTargets[1], revised ? null : boss)
  exact(s)
}
console.log('PASS Twin Lamps cannot converge on one enemy after a target dies')

for (const revised of [false, true]) {
  const s = fresh(revised), t = build(s, 'beam', 0, 0)
  const boss = target(s, 'warden'), ordinary = target(s)
  s.damage(boss, 10, true, t); s.damage(ordinary, 10, true, t)
  assert.equal(100000 - boss.hp, revised ? 10 : 15)
  assert.equal(100000 - ordinary.hp, 15)
}
console.log('PASS bosses have no colour weakness; ordinary enemy colour bonuses remain')

for (const difficulty of ['relaxed', 'standard', 'nightfall'] as const) {
  for (const id of ['toad', 'gloom', 'warden', 'bloomheart', 'shell'] as const) {
    const old = new Sim(difficulty, { compact: 1, depth: 1, guard: 1, variant: 0 })
    const revised = new Sim(difficulty, { ...old.challenge, balance: 1 })
    old.wave = revised.wave = 40
    const before = old.spawnEnemy(id, old.level.segs.get('e1')!, 0, 40)
    const after = revised.spawnEnemy(id, revised.level.segs.get('e1')!, 0, 40)
    const factor = difficulty === 'nightfall' && ['warden', 'bloomheart'].includes(id) ? NIGHTFALL_LATE_BOSS_HEALTH : 1
    assert(Math.abs(after.maxHp - before.maxHp * factor) < .000001)
    assert.equal(after.speedBase, before.speedBase)
    assert.equal(after.shell, before.shell)
    assert.deepEqual(after.def, before.def)
    exact(revised)
  }
}
console.log('PASS only Nightfall Warden and Bloomheart health changes; speed, armour and encounter definitions stay intact')

for (const id of TOWER_ORDER) {
  for (const path of [0, 1] as const) {
    const s = fresh(), t = build(s, id, path === 0 ? 3 : 1, path === 1 ? 3 : 1)
    for (let rank = 0; rank < 4; rank++) {
      const offer = s.refinementOffer(t)!, cost = s.refinementCost(t)!, before = s.glow
      assert.equal(offer.cost, cost); assert(s.refine(t)); assert.equal(before - s.glow, cost)
    }
    assert.equal(s.sellValue(t), Math.floor(t.spent * .75))
    exact(s)
  }
}
assert.equal(incomePayback(180, 144, 173, 25), 'Pays back in 7 waves; 25 left.')
assert(incomePayback(950, 92, 144, 10).includes('19 waves; 10 left'))
console.log('PASS every tower path and refinement resumes exactly; income payback uses incremental gain')

for (const kind of ['daily', 'weekly'] as const) for (const revision of [false, true]) {
  const offer = compactChallenge(new Date(2026, 8, 28), kind, revision)
  assert.deepEqual(offerFor(offer.id), offer)
  const s = new Sim('standard', offer.challenge); assert(validSnapshot(s.snapshot())); exact(s)
  const bad = s.snapshot(); bad.challenge.balance = 2 as 1; assert(!validSnapshot(bad))
}
console.log('PASS revised challenges use separate IDs and legacy offers still reconstruct')

// Fixed-health targets on real map geometry isolate firing behaviour from income and routing.
const rows: object[] = []
for (const revised of [false, true]) for (const id of TOWER_ORDER.filter(id => !['garden', 'bell', 'owl'].includes(id))) for (const path of [0, 1] as const) for (const group of ['boss', 'crowd', 'armour', 'hidden'] as const) {
  const s = fresh(revised), t = build(s, id, path === 0 ? 3 : 1, path === 1 ? 3 : 1)
  const enemies = Array.from({ length: group === 'boss' ? 1 : 12 }, (_, i) => target(s, group === 'boss' ? 'warden' : group === 'armour' ? 'shell' : group === 'hidden' ? 'veil' : 'bloat', 110 + i * 7))
  if (group === 'armour') for (const e of enemies) e.shell = e.maxShell = 100000
  for (let i = 0; i < 1200; i++) { s.step(DT); s.events = [] }
  const damage = enemies.reduce((sum, e) => sum + 100000 - e.hp + e.maxShell - e.shell, 0)
  rows.push({ revised, id, path, group, cost: t.spent, damage: Math.round(damage), damagePer100Glow: Number((damage / t.spent * 100).toFixed(2)) })
}
writeFileSync(new URL('../docs/TOWER-LAB.json', import.meta.url), JSON.stringify(rows, null, 2))
console.log('PASS 80 controlled tower/target comparisons recorded')

const fixtures: Record<string, SaveSnapshotV2> = {}
for (const wave of [10, 25, 35]) {
  const s = fresh(); s.wave = wave; s.glow = 100000
  build(s, 'beam', 1, 3)
  s.build(0, 'wick')
  const garden = s.build(6, 'garden')!
  for (let i = 0; i < 3; i++) s.upgrade(garden, 0)
  if (wave >= 25) s.build(10, 'ballista')
  s.glow = 5000; fixtures[`balance-${wave}`] = s.snapshot()
}
for (const s of Object.values(fixtures)) assert(validSnapshot(s))
writeFileSync(new URL('../qa/balance-fixtures.json', import.meta.url), JSON.stringify(fixtures))
console.log('PASS balance phone fixtures validate')
