import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT, RELOCATE_COST, type SaveSnapshot } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { HARBOUR_WAVES, HARBOUR_WAVES_V2, wardenEscorts, wardenStatus } from '../src/game/harbour'
import { TOWER_ORDER, canUpgrade } from '../src/game/defs'
import { upgradeSummary, PATH_ROLE } from '../src/ui/upgrade'
import fixtures from '../qa/continuity-fixtures.json'
import oldHarbour from './fixtures/harbour-original.json'

const fresh = () => new Sim('standard', { expanding: 1, guard: 1 })
const harbour = () => { const sim = Sim.restore(fixtures['canal-won'] as unknown as SaveSnapshot); assert(sim.continueHarbour()); return sim }
const resumeExactly = (sim: Sim, steps: number) => {
  const snap = JSON.parse(JSON.stringify(sim.snapshot()))
  assert(validSnapshot(snap))
  const resumed = Sim.restore(snap)
  for (let i = 0; i < steps; i++) { sim.step(DT); resumed.step(DT) }
  assert.deepEqual(resumed.snapshot(), sim.snapshot())
}

const s = harbour()
const tower = s.towers[0]
const oldPad = tower.pad
const saved = s.snapshot().towers.find(t => t.uid === tower.uid)!
const glow = s.glow, sell = s.sellValue(tower), built = s.stats.built
assert(s.relocate(tower, 18))
assert.equal(s.glow, glow - RELOCATE_COST)
assert.equal(s.pads[oldPad].tower, null)
assert.equal(s.pads[18].tower, tower)
assert.deepEqual(s.snapshot().towers.find(t => t.uid === tower.uid), { ...saved, pad: 18 })
assert.equal(s.sellValue(tower), sell)
assert.equal(s.stats.built, built)
assert.equal(tower.x, s.pads[18].x)
resumeExactly(s, 120)
console.log('PASS relocation preserves identity, investment, combat timers and save continuity')

for (const pad of [18, -1, 99, 1.5]) {
  const before = s.snapshot()
  assert(!s.relocate(tower, pad))
  assert.deepEqual(s.snapshot(), before)
}
s.glow = 24
assert(!s.relocate(tower, 19))
s.glow = 100
s.startWave()
assert(!s.relocate(tower, 19))
const opening = fresh()
const wick = opening.build(12, 'wick')!
assert(!opening.relocate(wick, 0)) // unrevealed pad
opening.over = 'lost'; assert(!opening.relocate(wick, 13))
const challenge = new Sim('standard', { guard: 1, id: 'test' })
const ct = challenge.build(0, 'wick')!
assert(!challenge.canRelocate(ct))
assert(!fresh().canRelocate(wick)) // a tower from another sim
console.log('PASS invalid, combat, locked-pad, unaffordable and challenge moves cannot spend glow')

const support = harbour()
support.towers = []; support.pads.forEach(p => { p.tower = null }); support.glow = 10000
const owl = support.build(18, 'owl')!
support.upgrade(owl, 1); support.upgrade(owl, 1)
const beam = support.build(12, 'beam')!
const dest = support.pads[20]
const preview = support.rangeAt(beam, dest.x, dest.y)
assert(preview > beam.stats.range)
assert(support.relocate(beam, 20))
assert.equal(support.effRange(beam), preview)
const garden = support.build(12, 'garden')!
garden.earned = 91; garden.mothCd = .37
const income = garden.stats.income
assert(support.relocate(garden, 19))
assert.equal(garden.earned, 91); assert.equal(garden.mothCd, .37)
assert.equal(garden.stats.income, income)
assert.equal(support.rangeAt(garden, dest.x, dest.y), garden.stats.range)
resumeExactly(support, 60)
console.log('PASS destination preview matches Owl support; moving Gardens preserves income and timers')

const bossSim = harbour()
bossSim.towers = []; bossSim.pads.forEach(p => { p.tower = null })
bossSim.wave = 33
const boss = bossSim.spawnEnemy('warden', bossSim.level.segs.get('harbour')!, 280, 33)
boss.hp = boss.maxHp * .69
boss.spawnCd = 99
bossSim.step(DT)
assert.equal(boss.phase, 1)
assert(wardenStatus(bossSim)?.includes('signalling'))
assert.equal(wardenEscorts(bossSim, boss).length, 0)
const warning = bossSim.snapshot()
resumeExactly(bossSim, 160)
assert.equal(boss.phase, 2)
assert.equal(bossSim.enemies.filter(e => e.escortOf === boss.uid).length, 4)
assert.equal(wardenEscorts(bossSim, boss).length, 4)
const escorted = bossSim.snapshot()
boss.shell = 0
let hp = boss.hp
bossSim.damage(boss, 100, true, null)
assert.equal(hp - boss.hp, 60)
const escorts = wardenEscorts(bossSim, boss)
escorts.forEach(e => { e.x += 1000 })
hp = boss.hp; bossSim.damage(boss, 100, true, null)
assert.equal(hp - boss.hp, 100)
escorts.forEach(e => { e.x -= 1000 })
resumeExactly(bossSim, 30)
boss.hp = boss.maxHp * .34
const speed = boss.speedBase
bossSim.step(DT)
assert.equal(boss.phase, 3)
assert.equal(boss.speedBase, speed * 1.3)
assert.equal(wardenEscorts(bossSim, boss).length, 0)
bossSim.step(DT)
assert.equal(boss.speedBase, speed * 1.3)
console.log('PASS Warden telegraph, four linked escorts, 40% guard, distance break, one-time surge and exact phase resumes')

const legacy = Sim.restore(oldHarbour as unknown as SaveSnapshot)
assert.equal(legacy.challenge.harbourEncounters, undefined)
assert.deepEqual(legacy.waveDef(28), HARBOUR_WAVES[2])
resumeExactly(legacy, 180)
assert.deepEqual(harbour().waveDef(28), HARBOUR_WAVES_V2[2])
const bad = { ...escorted, challenge: { ...escorted.challenge, harbourEncounters: 2 } }
assert(!validSnapshot(bad))
assert(!validSnapshot({ ...escorted, enemies: escorted.enemies.map(e => ({ ...e, signalT: Infinity })) }))
for (const i of [2, 5]) {
  const counts = (groups: typeof HARBOUR_WAVES[number]['groups']) => groups.reduce<Record<string, number>>((acc, g) => { acc[g.type] = (acc[g.type] ?? 0) + g.count; return acc }, {})
  assert.deepEqual(counts(HARBOUR_WAVES[i].groups), counts(HARBOUR_WAVES_V2[i].groups))
}
console.log('PASS legacy Harbour stays on its original encounters; new pacing retains enemy populations')

for (const id of TOWER_ORDER) for (let a = 0; a <= 3; a++) for (let b = 0; b <= 3; b++) {
  if (a > 1 && b > 1) continue
  for (const path of [0, 1] as const) if (canUpgrade(a, b, path)) {
    assert(PATH_ROLE[id][path])
    assert(upgradeSummary(id, a, b, path).length > 0, `${id} ${a}/${b} path ${path} needs a useful preview`)
  }
}
assert.match(upgradeSummary('beam', 1, 0, 0), /Pierces/)
assert.match(upgradeSummary('beam', 0, 2, 1), /2 beam targets/)
assert.match(upgradeSummary('bell', 0, 1, 1), /25%/)
console.log('PASS every legal upgrade has an effect preview, including support and special attacks')
writeFileSync('qa/refinement-fixtures.json', JSON.stringify({ 'warden-signal': warning, 'warden-escorts': escorted, 'refined-harbour': harbour().snapshot() }) + '\n')
