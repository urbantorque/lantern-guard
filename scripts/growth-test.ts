import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { CANAL_STAGES, KEEPER_WAVE } from '../src/game/canal-growth'
import { TOWER_ORDER } from '../src/game/defs'
import { validSnapshot } from '../src/game/save-store'
import { DT, Sim, type SaveSnapshotV2 } from '../src/game/sim'
import { runBot } from './bot'
import { BOTS } from './sim-bots'

const fresh = new Sim('standard', { expanding: 1 })
assert.deepEqual(TOWER_ORDER.filter(id => fresh.keeperAllowed(id)), ['wick', 'cracker'])
assert.equal(fresh.pads.filter((_, i) => fresh.padAvailable(i)).length, 6)
assert.equal(fresh.gates.filter(g => fresh.gateAvailable(g)).length, 1)
assert.equal(fresh.charmsAllowed, false)
assert.equal(fresh.build(3, 'wick'), null)
assert.equal(fresh.build(12, 'beam'), null)
assert(fresh.build(12, 'wick'))
assert(validSnapshot(fresh.snapshot()))
console.log('PASS opening limits pads, gates and towers in the simulation')

const fixtures: Record<string, SaveSnapshotV2> = { 'growth-start': new Sim('standard', { expanding: 1 }).snapshot() }
const rounds: SaveSnapshotV2[] = []
let previous: SaveSnapshotV2 | undefined
let expansions = 0
let boundaryChecks = 0
const result = runBot(BOTS[12], 'standard', 7, sim => {
  if ((sim.wave === 5 || sim.wave === 10) && sim.spawners.length === 0 && sim.enemies.length > 0) {
    assert.equal(sim.canStartWave(), false)
    boundaryChecks++
    fixtures[`growth-before-${sim.wave + 1}`] = sim.snapshot()
  }
  if (sim.events.some(e => e.t === 'expand')) {
    assert.equal(sim.enemies.length, 0)
    assert.equal(sim.spawners.length, 0)
    assert.equal(sim.canalStage, ++expansions)
    assert(sim.expansionPlanning)
    assert.equal(sim.openSources.has('west'), sim.canalStage === 2)
    for (const t of previous!.towers) {
      const kept = sim.towers.find(q => q.uid === t.uid)!
      assert(kept && kept.pad === t.pad && kept.a >= t.a && kept.b >= t.b)
    }
    assert.deepEqual(sim.level.def.home, { x: 360, y: 890 })
    assert.equal(sim.pads.filter((_, i) => sim.padAvailable(i)).length, CANAL_STAGES[sim.canalStage].pads.length)
    fixtures[`growth-after-${sim.wave + 1}`] = sim.snapshot()
    rounds.push(sim.snapshot())
  }
  if (!fixtures[`growth-stage-${sim.canalStage}`] && sim.enemies.length > 6) {
    fixtures[`growth-stage-${sim.canalStage}`] = sim.snapshot()
    rounds.push(sim.snapshot())
  }
  if (sim.wave === 24 && sim.enemies.length > 25 && !fixtures['growth-late']) fixtures['growth-late'] = sim.snapshot()
  if (sim.over === 'won' && previous) fixtures['growth-dawn'] = previous
  previous = sim.snapshot()
}, { expanding: 1 })
assert.equal(expansions, 2, JSON.stringify(result))
assert(boundaryChecks > 0)
assert.equal(result.outcome, 'WON', JSON.stringify(result))
console.log(`PASS both expansions retain towers and the lantern, block overlapping waves; full run ${result.lives}/${result.maxLives} light`)

for (const snap of rounds) {
  assert(validSnapshot(snap), `invalid stage ${snap.canalStage}, wave ${snap.wave}`)
  const a = Sim.restore(snap)
  const b = Sim.restore(JSON.parse(JSON.stringify(snap)))
  assert.deepEqual(a.snapshot(), snap)
  for (let i = 0; i < 600; i++) { a.step(DT); b.step(DT) }
  assert.deepEqual(a.snapshot(), b.snapshot())
  assert(validSnapshot(a.snapshot()))
}
for (const key of ['growth-before-6', 'growth-before-11']) {
  const a = Sim.restore(fixtures[key])
  const b = Sim.restore(JSON.parse(JSON.stringify(a.snapshot())))
  const initial = a.canalStage
  for (let i = 0; i < 1800 && a.waveActive; i++) { a.step(DT); b.step(DT) }
  assert.equal(a.canalStage, initial + 1)
  assert.deepEqual(a.snapshot(), b.snapshot())
  assert(validSnapshot(a.snapshot()))
  assert(a.expansionPlanning)
  assert(a.startWave())
  assert.equal(a.expansionPlanning, false)
}
console.log('PASS mid-wave and planning saves round-trip, including both expansion boundaries')

for (const [id, wave] of Object.entries(KEEPER_WAVE)) {
  const s = Sim.restore(fixtures[wave >= 6 ? 'growth-after-6' : 'growth-start'])
  s.wave = wave - 1
  assert.equal(s.keeperAllowed(id as keyof typeof KEEPER_WAVE), !['storm', 'ballista'].includes(id), 'Late specialists stay out of legacy campaigns')
}
for (const modify of [
  (s: SaveSnapshotV2) => { s.canalStage = 2 },
  (s: SaveSnapshotV2) => { s.challenge.waterway = 'reedbank' },
  (s: SaveSnapshotV2) => { s.towers[0].pad = 0 },
]) {
  const snap = fresh.snapshot()
  modify(snap)
  assert.equal(validSnapshot(snap), false)
}
console.log('PASS tower introductions and malformed progression saves')
writeFileSync(new URL('../qa/growth-fixtures.json', import.meta.url), JSON.stringify(fixtures))
console.log('Saved real-play fixtures for phone and expansion-transition checks.')
