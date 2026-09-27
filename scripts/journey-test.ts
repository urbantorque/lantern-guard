import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT } from '../src/game/sim'
import { activeSlot, selectSlot, migrateSlots, RUN_KEY, BACKUP_KEY, encodeRun, readRun, slotKeys, validSnapshot } from '../src/game/save-store'
import { saveRun, loadRun, clearRun, saveCheckpoint, loadCheckpoint, canRetry, creditJournal, loadProgress, recordRun } from '../src/game/progress'
import { dailyTide, weeklyNight, offerFor } from '../src/game/tides'
import { leakAdvice } from '../src/game/feedback'
import fixtures from '../qa/guard-fixtures.json'
import type { SaveSnapshot } from '../src/game/sim'
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
const store = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store })
const fresh = () => new Sim('standard', { expanding: 1, guard: 1 })
const campaign = fresh()
campaign.build(12, 'wick')
saveRun(campaign.snapshot(), [1, 2, 3])
selectSlot('campaign'); creditJournal({ drip: 10 })
const tide = new Sim('standard', dailyTide(new Date(2026, 8, 27), true).challenge)
selectSlot('challenge'); saveRun(tide.snapshot(), [4, 5, 6]); creditJournal({ drip: 3 })
assert.equal(loadRun('campaign')!.towers.length, 1)
assert.equal(loadRun('challenge')!.wave, 14)
clearRun('challenge')
assert(loadRun('campaign'))
selectSlot('campaign'); creditJournal({ drip: 5, veil: 2 }); creditJournal({ drip: 10, veil: 2 })
assert.deepEqual(loadProgress().journal, { drip: 13, veil: 2 })
creditJournal({ drip: 12, veil: 2 })
assert.equal(loadProgress().journal.drip, 15)
console.log('PASS separate saves and independent journal credit; replayed counts cannot be farmed')

saveCheckpoint(campaign, [1, 2, 3])
const before = loadCheckpoint()!
campaign.startWave()
campaign.glow += 50
campaign.lives = 0
assert.equal(loadCheckpoint()!.snapshot.glow, before.snapshot.glow)
assert.equal(loadCheckpoint()!.snapshot.lives, 25)
assert.equal(canRetry(tide), false)
assert.equal(canRetry(new Sim('nightfall', { expanding: 1, guard: 1 })), false)
clearRun('campaign'); assert.equal(loadCheckpoint(), null)
console.log('PASS planning checkpoints restore exact resources and stay unavailable in scored challenges/Nightfall')

store.clear()
const legacy = new Sim('standard', dailyTide(new Date(2026, 8, 26)).challenge)
store.setItem(RUN_KEY, encodeRun(legacy.snapshot(), [7]))
store.setItem(BACKUP_KEY, 'bad')
store.setItem('lanternlocks.journal-credit.v1', JSON.stringify({ c: { drip: 9 } }))
migrateSlots(store)
assert.equal(activeSlot(), 'challenge')
assert.equal(readRun(store, 'campaign'), null)
assert.equal(readRun(store, 'challenge')!.snapshot.challenge.guard, undefined)
assert.equal(JSON.parse(store.getItem('lanternlocks.challenge-credit.v1')!).c.drip, 9)
assert(store.getItem(slotKeys('challenge')[0]))
console.log('PASS old single-slot challenge migrates with blooms and credit, retaining original rules')
store.clear()
store.setItem('lanternlocks.save.v1', JSON.stringify(legacy.snapshot()))
store.setItem('lanternlocks.blooms.v1', JSON.stringify({ d: [1, 4] }))
migrateSlots(store)
assert.deepEqual(readRun(store, 'challenge')!.blooms, [1, 4])
assert.equal(loadRun('campaign'), null)
store.clear()
store.setItem(RUN_KEY, encodeRun(legacy.snapshot(), [7]))
const originalSet = store.setItem.bind(store)
store.setItem = (key, value) => { if (key === slotKeys('challenge')[0]) throw new Error('storage full'); originalSet(key, value) }
migrateSlots(store)
assert(store.getItem(RUN_KEY))
store.setItem = originalSet
migrateSlots(store)
assert(readRun(store, 'challenge'))
console.log('PASS original separate saves migrate; failed writes retain the recoverable source')

for (const offer of [dailyTide(new Date(2026, 8, 27), true), weeklyNight(new Date(2026, 8, 27), true)]) {
  assert.deepEqual(offerFor(offer.id), offer)
  const sim = new Sim('standard', offer.challenge)
  assert(validSnapshot(sim.snapshot()))
  assert.equal(sim.charmsAllowed, false)
  assert.equal(sim.towerStats('owl', 0, 0).range, fresh().towerStats('owl', 0, 0).range)
  sim.startWave()
  for (let i = 0; i < 240; i++) sim.step(DT)
  const restored = Sim.restore(JSON.parse(JSON.stringify(sim.snapshot())))
  for (let i = 0; i < 180; i++) { sim.step(DT); restored.step(DT) }
  assert.equal(JSON.stringify(restored.snapshot()), JSON.stringify(sim.snapshot()))
}
console.log('PASS versioned current challenges use consistent rewards/support and resume exactly')

const dawn = Sim.restore(fixtures['guard-dawn'] as unknown as SaveSnapshot)
while (!dawn.over) dawn.step(DT)
assert(dawn.won)
const wonCanal = dawn.snapshot()
const oldTowers = dawn.towers.map(t => [t.uid, t.pad, t.x, t.y, t.a, t.b])
const bank = dawn.glow, light = dawn.lives
assert(dawn.continueHarbour())
assert.equal(dawn.glow, bank); assert.equal(dawn.lives, light)
assert.deepEqual(dawn.towers.map(t => [t.uid, t.pad, t.x, t.y, t.a, t.b]), oldTowers)
assert.equal(dawn.pads.length, 22)
assert.equal(dawn.level.def.sources[0].seg, 'harbour')
assert.equal(dawn.finalWave, 33)
assert(validSnapshot(dawn.snapshot()))
assert(!validSnapshot({ ...dawn.snapshot(), challenge: { ...dawn.challenge, harbour: 2 } }))
assert(!dawn.continueHarbour())
dawn.startWave()
assert(!dawn.canStartWave())
for (let i = 0; i < 500; i++) dawn.step(DT)
const harbourRestore = Sim.restore(JSON.parse(JSON.stringify(dawn.snapshot())))
for (let i = 0; i < 360; i++) { dawn.step(DT); harbourRestore.step(DT) }
assert.equal(JSON.stringify(dawn.snapshot()), JSON.stringify(harbourRestore.snapshot()))
console.log('PASS Harbour preserves the defence, adds connected pads and resumes during its new waves')
const complete = Sim.restore(wonCanal)
complete.continueHarbour()
const journey = runBot({ ...BOTS[12], maxTowers: 22 }, 'standard', 7, undefined, {}, complete.snapshot())
assert.equal(journey.outcome, 'WON'); assert.equal(journey.wave, 33)
console.log('PASS a continuous defence completes all eight authored Harbour waves')

const s = fresh()
s.wave = 25
const skiff = s.spawnEnemy('skiff', s.level.segs.get('h')!, 0, 26)
s.step(DT); const slowSpeed = skiff.speedNow
skiff.shell = 0; s.step(DT)
assert.equal(skiff.speedNow, slowSpeed * 1.6)
const boss = s.spawnEnemy('warden', s.level.segs.get('n0')!, 0, 33)
boss.hp = boss.maxHp * .4
s.step(DT)
assert.equal(boss.phase, 1)
const speed = boss.speedBase
s.step(DT); assert.equal(boss.speedBase, speed)
console.log('PASS Skiffs accelerate after armour breaks; Warden surge happens once')

const ember = new Sim('standard', { expanding: 1, guard: 1, guardian: 'ember' })
const cracker = ember.build(12, 'cracker')!
const victim = ember.spawnEnemy('bloat', ember.level.segs.get('e2')!, 180, 1)
victim.speedBase = 0
const patch = { x: victim.x, y: victim.y, radius: 150, life: 2, dps: 1, tower: cracker.uid }
ember.embers = [{ ...patch }, { ...patch }]
const hp = victim.hp
ember.step(DT)
assert(Math.abs(hp - victim.hp - DT) < 1e-7)
assert((cracker.damageDealt ?? 0) > 0)
assert(validSnapshot(ember.snapshot()))
const flameRestore = Sim.restore(JSON.parse(JSON.stringify(ember.snapshot())))
for (let i = 0; i < 90; i++) { ember.step(DT); flameRestore.step(DT) }
assert.equal(JSON.stringify(ember.snapshot()), JSON.stringify(flameRestore.snapshot()))
const escaped = fresh()
const h = escaped.level.segs.get('h')!
const veil = escaped.spawnEnemy('veil', h, h.line.length - .01, 8)
veil.route = 'l1'
escaped.step(DT)
assert(leakAdvice(escaped).includes('still hidden'))
assert(leakAdvice(escaped).includes('East loop'))
console.log('PASS Ember fire does not stack and survives saves; leak feedback reports observed facts')
function oneBurst(guardian?: 'ember') {
  const sim = new Sim('standard', { expanding: 1, guard: 1, guardian })
  const tower = sim.build(12, 'cracker')!
  let enemy: ReturnType<Sim['spawnEnemy']> | undefined
  for (const seg of sim.level.segs.values()) {
    for (let s = 0; s < seg.line.length; s += 20) {
      const e = sim.spawnEnemy('bloat', seg, s, 1)
      if (Math.hypot(e.x - tower.x, e.y - tower.y) < tower.stats.range * .7) { enemy = e; break }
      sim.enemies.pop()
    }
    if (enemy) break
  }
  assert(enemy)
  enemy.hp = enemy.maxHp = 10000; enemy.speedBase = 0
  for (let i = 0; i < 300 && enemy.hp === 10000; i++) sim.step(DT)
  const impact = 10000 - enemy.hp
  assert(impact > 0)
  tower.cd = 999
  for (let i = 0; i < 150; i++) sim.step(DT)
  return { impact, total: 10000 - enemy.hp }
}
const originalBurst = oneBurst(), emberBurst = oneBurst('ember')
assert(emberBurst.impact < originalBurst.impact)
assert(emberBurst.total > originalBurst.total)
console.log('PASS Ember trades immediate damage for greater damage against enemies held in its fire')

store.clear()
const win = fresh(); win.won = true
recordRun(win, 50)
const wins = loadProgress().wins.standard
win.challenge.harbour = 1
recordRun(win, 200)
assert.equal(loadProgress().wins.standard, wins)
assert.equal(loadProgress().harbourWins, 1)
console.log('PASS Harbour completion records separately without duplicating the first-night reward')

const failed = fresh()
let checkpoint = failed.snapshot()
while (!failed.over && failed.time < 300) {
  if (!failed.waveActive) { checkpoint = failed.snapshot(); failed.startWave() }
  failed.step(DT)
  failed.events.length = 0
}
assert.equal(failed.over, 'lost')
writeFileSync('qa/continuity-fixtures.json', JSON.stringify({ 'canal-won': wonCanal, 'retry-loss': failed.snapshot(), 'retry-checkpoint': checkpoint, 'new-journey': fresh().snapshot(), 'current-tide': tide.snapshot() }) + '\n')
