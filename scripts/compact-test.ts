import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT, type SaveSnapshotV2 } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { compactLevel, PLOTS, STARTER_PLOTS } from '../src/game/compact'
import { creditMilestones, loadProgress, recordRun } from '../src/game/progress'
import { guardianUnlocked } from '../src/game/guardians'
import { runBot } from './bot'
import { BOTS } from './sim-bots'

class MemoryStorage implements Storage {
  data = new Map<string, string>()
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { this.data.set(k, v) }
  removeItem(k: string) { this.data.delete(k) }
  clear() { this.data.clear() }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
const fresh = (variant = 0) => new Sim('standard', { compact: 1, guard: 1, variant }, 7)
const exact = (sim: Sim, ticks: number) => {
  const snapshot = JSON.parse(JSON.stringify(sim.snapshot()))
  assert(validSnapshot(snapshot))
  const restored = Sim.restore(snapshot)
  for (let i = 0; i < ticks; i++) { sim.step(DT); restored.step(DT) }
  assert.deepEqual(restored.snapshot(), sim.snapshot())
}
const fixtures: Record<string, SaveSnapshotV2> = { 'compact-start': fresh().snapshot() }

for (const variant of [0, 1, 2]) {
  const s = fresh(variant)
  assert.equal(s.pads.length, 12)
  for (const gate of s.level.def.gates) {
    const left = s.level.def.segments.find(segment => segment.id === gate.outs[0])!
    const right = s.level.def.segments.find(segment => segment.id === gate.outs[1])!
    assert(left.pts[1].x < gate.x && right.pts[1].x > gate.x, 'arrows match the bank on mirrored maps')
  }
  for (const pad of s.pads) for (const segment of s.level.segs.values()) assert(segment.line.distanceTo(pad.x, pad.y) > 44, `layout ${variant}: plot overlaps ${segment.id}`)
  assert.equal(s.finalWave, 40)
  assert.deepEqual([...s.plots], [...STARTER_PLOTS])
  assert(!s.padRevealed(1)); assert(!s.unlockPlot(1)); assert(!s.build(1, 'wick'))
  const geometry = JSON.stringify(s.level.def)
  s.wave = 5; s.glow = 139
  const poor = s.snapshot(); assert(!s.unlockPlot(1)); assert.deepEqual(s.snapshot(), poor)
  s.glow = 1000
  assert(s.padRevealed(1)); assert.equal(s.plotCost(1), 140)
  assert(s.unlockPlot(1)); assert.equal(s.glow, 860); assert(!s.unlockPlot(1))
  const tower = s.build(1, 'cracker')!
  assert(tower)
  assert(s.startWave()); assert(!s.unlockPlot(7))
  exact(s, 300)
  assert.equal(JSON.stringify(s.level.def), geometry)
  assert.equal(s.challenge.variant, variant)
  for (let wave = 1; wave <= 40; wave++) for (const group of s.waveDef(wave).groups) {
    const src = s.level.def.sources.find(source => source.id === (group.src ?? 'north'))!
    assert(src && src.openWave <= wave)
  }
  assert(s.level.segs.get('w1')!.line.length > s.level.segs.get('e1')!.line.length)
  assert(s.level.segs.get('e2')!.line.length > s.level.segs.get('w2')!.line.length)
}
assert.notDeepEqual(compactLevel(0).segments, compactLevel(1).segments)
assert.notDeepEqual(compactLevel(0).pads, compactLevel(2).pads)
console.log('PASS fixed board, distinct layouts, paid plot guards and exact live restore on all three layouts')

const payout = (segment: string, escape: boolean) => {
  const sim = fresh(); sim.wave = 5
  const seg = sim.level.segs.get(segment)!
  const enemy = sim.spawnEnemy('shell', seg, 1, 5)
  assert(!enemy.rich)
  if (escape) {
    enemy.seg = sim.level.segs.get('h')!; enemy.s = enemy.seg.line.length - .001
    sim.step(DT)
    return sim.maxLives - sim.lives
  }
  const before = sim.glow
  sim.damage(enemy, 100000, true, null)
  return sim.glow - before
}
assert.equal(payout('w1', false), payout('e1', false))
assert.equal(payout('w2', true), payout('e2', true))
for (const seg of compactLevel().segments) assert(!seg.bonus || seg.bonus === 1)
console.log('PASS equal route rewards and leak costs, with utility landmarks preserved')

const upgrades = fresh(); upgrades.wave = 14; upgrades.glow = 10000
const tower = upgrades.build(0, 'wick')!
for (let i = 0; i < 3; i++) assert(upgrades.upgrade(tower, 1))
assert.equal(upgrades.refinementCost(tower), null)
upgrades.wave = 15
const original = { damage: tower.stats.damage, range: tower.stats.range, interval: tower.stats.interval, spent: tower.spent }
assert.equal(upgrades.refinementCost(tower), 700)
const bank = upgrades.glow; upgrades.glow = 699; const poorRank = upgrades.snapshot(); assert(!upgrades.refine(tower)); assert.deepEqual(upgrades.snapshot(), poorRank); upgrades.glow = bank
assert(upgrades.refine(tower))
assert(tower.stats.damage > original.damage && tower.stats.range > original.range && tower.stats.interval < original.interval)
assert.equal(tower.spent, original.spent + 700); assert(!upgrades.refine(tower))
assert(upgrades.upgrade(tower, 0)); assert.equal(tower.refinement, 1)
upgrades.wave = 25; assert.equal(upgrades.refinementCost(tower), 1250); assert(upgrades.refine(tower)); assert(!upgrades.refine(tower))
assert.equal(upgrades.sellValue(tower), Math.floor(tower.spent * .75))
assert(upgrades.relocate(tower, 3)); assert.equal(tower.refinement, 2)
assert(upgrades.startWave()); exact(upgrades, 500)
console.log('PASS timed refinements, cross-path preservation, relocation, refund and exact projectile resume')

const plots = fresh(); plots.wave = 10; plots.glow = 10000
for (const index of [1, 7, 2]) assert(plots.unlockPlot(index))
creditMilestones(plots); const profile = loadProgress()
assert(guardianUnlocked('tide', profile.feats))
const tide = new Sim('standard', { compact: 1, guard: 1, variant: 0, guardian: 'tide' })
tide.wave = 10
const ordinary = plots.towerStats('bell', 0, 0), altered = tide.towerStats('bell', 0, 0)
assert.equal(altered.slow, ordinary.slow + .15); assert.equal(altered.interval, ordinary.interval * 1.25)
const bell = tide.build(0, 'bell')!; assert(bell); assert(tide.startWave()); exact(tide, 100)
creditMilestones(plots); assert.deepEqual(loadProgress(), profile)
console.log('PASS earned Tide Keeper sidegrade, immediate unlock and idempotent progress')

const corrupt = (mutate: (s: SaveSnapshotV2) => void) => { const s = plots.snapshot(); mutate(s); assert(!validSnapshot(s)) }
corrupt(s => { s.challenge.variant = 3 })
corrupt(s => { s.challenge.expanding = 1 })
corrupt(s => { s.plots!.push(11) })
corrupt(s => { s.plots!.push(0) })
corrupt(s => { s.plots = [1, 2] })
const badRank = upgrades.snapshot(); badRank.towers[0].refinement = 3; assert(!validSnapshot(badRank))
const legacy = new Sim('standard', { expanding: 1, guard: 1 }); assert(validSnapshot(legacy.snapshot())); assert(!legacy.changeGuardian('tide'))
assert.equal(PLOTS.length, 12)
console.log('PASS malformed new save rejection and legacy rule isolation')

const result = runBot({ ...BOTS[12], router: 'plan', gardens: 1, maxTowers: 8 }, 'standard', 7, sim => {
  if ([5, 15, 25, 39].includes(sim.wave) && !sim.waveActive && !sim.over) fixtures[`compact-plan-${sim.wave + 1}`] ??= sim.snapshot()
  if (sim.wave === 40 && sim.enemies.some(e => e.def.id === 'bloomheart' && (e.signalT ?? 0) > 0)) fixtures['compact-pulse'] ??= sim.snapshot()
  if (sim.wave === 39 && sim.enemies.length >= 40) fixtures['compact-busy'] ??= sim.snapshot()
  if (sim.over === 'won') fixtures['compact-won'] = sim.snapshot()
}, { compact: 1, variant: 0, guard: 1 })
assert.equal(result.outcome, 'WON')
recordRun(Sim.restore(fixtures['compact-won']), 0)
assert(loadProgress().feats.reedkeeper, 'compact victory earns the canal reward')
for (const key of ['compact-plan-6', 'compact-plan-16', 'compact-plan-26', 'compact-plan-40', 'compact-pulse', 'compact-won']) assert(fixtures[key], key)
// Explicitly funded QA snapshots for exercising purchase controls, not balance evidence.
fixtures['compact-plan-6'].glow = 900
fixtures['compact-plan-16'].glow = 1600
for (const [name, snapshot] of Object.entries(fixtures)) assert(validSnapshot(snapshot), name)
writeFileSync(new URL('../qa/compact-fixtures.json', import.meta.url), JSON.stringify(fixtures))
const boss = Sim.restore(fixtures['compact-pulse']); exact(boss, 220)
const late = Sim.restore(fixtures['compact-plan-40'])
const footprint = JSON.stringify(late.level.def); assert(late.startWave()); exact(late, 300)
assert.equal(JSON.stringify(late.level.def), footprint)
assert(!late.continueHarbour()); assert(!late.continueGardens())
console.log('PASS uninterrupted 40-wave watch, late boss exact resume and production-shaped QA fixtures')
