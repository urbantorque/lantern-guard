import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT, type SaveSnapshotV2 } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { TOWER_ORDER, type TowerId } from '../src/game/defs'
import { compactWave } from '../src/game/compact'
import { compactChallenge, offerFor } from '../src/game/tides'
import { preparationCost, type PreparationId } from '../src/game/depth'
import { creditMilestones, loadProgress, guardianMasteryTier } from '../src/game/progress'

const fresh = (variant = 0, seed = 7) => new Sim('standard', { compact: 1, plans: 1, depth: 1, guard: 1, variant }, seed)
const exact = (s: Sim) => {
  const snapshot = JSON.parse(JSON.stringify(s.snapshot()))
  assert(validSnapshot(snapshot), 'valid save')
  const restored = Sim.restore(snapshot)
  assert.deepEqual(restored.snapshot(), snapshot, 'immediate restore')
  for (let i = 0; i < 600; i++) { s.step(DT); restored.step(DT) }
  assert.deepEqual(restored.snapshot(), s.snapshot(), 'ten-second exact resume')
}
const fixtures: Record<string, SaveSnapshotV2> = {}
for (const id of ['storm', 'ballista'] as TowerId[]) {
  const s = fresh(), wave = s.keeperWave(id)
  s.glow = 100000; s.wave = wave - 2
  assert(!s.build(0, id))
  s.wave++; const tower = s.build(0, id)!
  assert(tower)
  const legacy = new Sim('standard', { compact: 1, guard: 1, variant: 0 }); legacy.wave = 35; legacy.glow = 100000
  assert(!legacy.build(0, id))
  for (let i = 0; i < 3; i++) assert(s.upgrade(tower, 0))
  assert(s.upgrade(tower, 1)); assert(!s.upgrade(tower, 1))
  s.startWave(); for (let i = 0; i < 240; i++) s.step(DT)
  exact(s)
}
console.log('PASS specialist unlocks, crosspath limits, legacy exclusion and live restores')

for (const id of TOWER_ORDER) {
  const s = fresh(); s.wave = 35; s.glow = 100000
  const t = s.build(0, id)!
  for (let i = 0; i < 3; i++) assert(s.upgrade(t, 0))
  s.wave = 25; assert(s.refine(t)); assert(s.refine(t)); assert(!s.refine(t))
  s.wave = 30; assert(s.refine(t)); assert(!s.refine(t))
  s.wave = 35; assert(s.refine(t)); assert(!s.refine(t))
  assert.equal(t.refinement, 4); assert.equal(s.sellValue(t), Math.floor(t.spent * .75))
  const stats = { ...t.stats }; assert(s.relocate(t, 3)); assert.deepEqual(t.stats, stats)
  exact(s)
}
console.log('PASS levels 6/7 unlock on time, cost glow, cap correctly and survive moves/resume')

for (const id of ['oil', 'net', 'ward'] as PreparationId[]) {
  const s = fresh(); s.wave = 4; s.glow = 2000; assert(!s.prepare(id))
  s.wave = 5; const before = s.glow; assert(s.prepare(id))
  assert.equal(s.glow, before - preparationCost(5)); assert(!s.prepare(id))
  assert.equal(s.preparationOffer, null); assert(s.startWave()); assert(!s.prepare(id)); assert(!s.canStartWave())
  exact(s)
  const bad = s.snapshot(); bad.preparation!.charges = 99; assert(!validSnapshot(bad))
}
const ward = fresh(); ward.wave = 5; ward.glow = 1000; ward.prepare('ward'); ward.wave = 6
for (let i = 0; i < 5; i++) {
  const seg = ward.level.segs.get('h')!; ward.spawnEnemy('drip', seg, seg.line.length - .001, 6); ward.step(DT)
}
assert.equal(ward.stats.leaked, 1); assert.equal(ward.preparation!.charges, 0)
const net = fresh(); net.wave = 5; net.glow = 1000; net.prepare('net'); net.wave = 6
const channel = net.level.segs.get('w2')!
const victim = net.spawnEnemy('bloat', channel, channel.line.length - .001, 6)
victim.hp = victim.maxHp = 100
net.step(DT)
assert(victim.hp < 100); assert(victim.slowT > 2.9); assert.equal(net.preparation!.charges, 7)
const boss = net.spawnEnemy('toad', channel, channel.line.length - .001, 6)
net.step(DT); assert.equal(net.preparation!.charges, 7); assert.equal(boss.slowT, 0)
net.wavesPending.add(6); net.enemies = []; net.waveAlive.set(6, 0); net.step(DT)
assert.equal(net.preparation, null); assert.equal(net.preparationOffer, null)
net.wave = 10; assert.equal(net.preparationOffer, 10)
console.log('PASS preparations spend once per interval, block overlaps, expire, absorb light and snare only ordinary enemies')

const arc = fresh(); arc.wave = 15; arc.glow = 1000; const storm = arc.build(3, 'storm')!
storm.cd = 0
const seg = arc.level.segs.get('e1')!
for (let i = 0; i < 4; i++) { const e = arc.spawnEnemy('shell', seg, 145 + i * 18, 16); e.speedBase = 0 }
const hidden = arc.spawnEnemy('veil', seg, 150, 16); hidden.speedBase = 0
arc.step(DT)
const links = arc.events.filter(e => e.t === 'arc')
assert.equal(links.length, 3); assert.equal(new Set(links.map(e => e.t === 'arc' ? e.tx + ':' + e.ty : '')).size, 3)
assert.equal(hidden.hp, hidden.maxHp)
console.log('PASS lightning hits three different visible enemies and respects hidden targets')

for (let variant = 0; variant < 4; variant++) for (const seed of [7, 1004, 2001]) {
  const s = fresh(variant, seed)
  for (let wave = 1; wave <= 40; wave++) {
    const base = compactWave(wave, variant, seed), next = s.waveDef(wave)
    assert.deepEqual(next.groups.map(g => [g.type, g.count, g.src]), base.groups.map(g => [g.type, g.count, g.src]))
    if (wave <= 11 || [20, 25, 30, 40].includes(wave)) assert.deepEqual(next.groups, base.groups)
  }
}
assert.notDeepEqual(fresh(0, 7).waveDef(12), fresh(0, 1004).waveDef(12))
console.log('PASS replay arrival variations keep enemy counts, budgets, introductions and bosses')

for (const kind of ['daily', 'weekly'] as const) {
  const offer = compactChallenge(new Date(2026, 8, 28), kind)
  assert.deepEqual(offerFor(offer.id), offer)
  const s = new Sim('standard', offer.challenge)
  assert.equal(s.finalWave - s.waveOffset, 10)
  assert.equal(s.glow + s.towers.reduce((n, t) => n + t.spent, 0), offer.challenge.skirmish!.glow)
  assert(s.towers.length >= 3); assert.equal(s.preparationOffer, null)
  fixtures[`depth-${kind}`] = s.snapshot()
  exact(s); s.startWave(); for (let i = 0; i < 120; i++) s.step(DT); exact(s)
  s.wave = s.finalWave; s.enemies = []; s.spawners = []; s.wavesPending.clear(); s.wavesPending.add(s.wave); s.waveAlive.set(s.wave, 0); s.step(DT)
  assert.equal(s.over, 'won'); s.continueFreeplay(); assert(!s.freeplay)
}
console.log('PASS ten-wave challenges keep fixed budgets, exact restores and an enforced ending')

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } })
const run = fresh(); run.wave = 20
creditMilestones(run); creditMilestones(run); assert.equal(loadProgress().guardianRecords!.lantern.waves, 20)
run.wave = 15; creditMilestones(run); assert.equal(loadProgress().guardianRecords!.lantern.waves, 20)
run.wave = 25; creditMilestones(run); assert.equal(loadProgress().guardianRecords!.lantern.waves, 25)
const nextRun = fresh(3, 1004); nextRun.wave = 35; creditMilestones(nextRun)
assert.equal(loadProgress().guardianRecords!.lantern.waves, 60); assert.equal(guardianMasteryTier(60), 2)
nextRun.wave = 40; nextRun.won = true; nextRun.over = 'won'; creditMilestones(nextRun); creditMilestones(nextRun)
assert.equal(loadProgress().guardianRecords!.lantern.wins, 1)
assert.equal(loadProgress().guardianRecords!.lantern.maps['3:standard'].wins, 1)
assert(nextRun.changeGuardian('ember')); creditMilestones(nextRun)
assert.equal(loadProgress().guardianRecords!.ember, undefined, 'Changing guardian after a win cannot earn its mastery')
console.log('PASS guardian progress crosses runs, records maps and never double-credits retries or resumes')

const firing: number[] = []
for (const boosted of [false, true]) {
  const s = fresh(); s.wave = 5; s.glow = 10000
  const wick = s.build(3, 'wick')!
  if (boosted) assert(s.prepare('oil'))
  s.wave = 6
  const target = s.spawnEnemy('bloat', s.level.segs.get('e1')!, 145, 6)
  target.hp = target.maxHp = 100000; target.speedBase = 0
  let shots = 0
  for (let i = 0; i < 600; i++) { s.events = []; s.step(DT); shots += s.events.filter(e => e.t === 'shoot' && e.tower === wick.id).length }
  firing.push(shots)
}
assert(firing[1] > firing[0], 'Oil increases actual firing frequency')
const siege = fresh(); siege.wave = 25; siege.glow = 100000
const bow = siege.build(3, 'ballista')!; for (let i = 0; i < 3; i++) siege.upgrade(bow, 0)
const armour = siege.spawnEnemy('shell', siege.level.segs.get('e1')!, 145, 26)
armour.hp = armour.maxHp = 10000; armour.shell = armour.maxShell = 20; armour.speedBase = 0
for (let i = 0; i < 60; i++) siege.step(DT)
assert(armour.shell === 0); assert(armour.hp < 10000); assert(armour.burnT > 0)
console.log('PASS oil raises firing frequency; heavy bolts break armour and apply their burn upgrade')

for (const wave of [5, 15, 25, 30, 35]) {
  const s = fresh(3); s.wave = wave; s.glow = 100000
  s.build(0, 'wick'); const t = s.build(3, 'cracker')!
  if (wave >= 15) { s.build(6, 'storm'); for (let i = 0; i < 3; i++) s.upgrade(t, 0); while ((t.refinement ?? 0) < (wave >= 30 ? 2 : 1)) s.refine(t) }
  if (wave >= 25) s.build(10, 'ballista')
  if (wave >= 35) s.refine(t)
  if (wave >= 10) s.chooseBattlePlan('powder')
  if (wave >= 20) s.chooseBattlePlan('frost')
  s.glow = 4200
  fixtures[`depth-plan-${wave}`] = s.snapshot()
}
for (const [key, snapshot] of Object.entries(fixtures)) assert(validSnapshot(snapshot), key)
writeFileSync(new URL('../qa/depth-fixtures.json', import.meta.url), JSON.stringify(fixtures))
console.log('PASS phone test fixtures validate')
