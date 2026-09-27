import assert from 'node:assert/strict'
import { DT, Sim } from '../src/game/sim'
import { BACKUP_KEY, RUN_KEY, decodeRun, encodeRun, readRun, saveHealth, storeRun, validSnapshot } from '../src/game/save-store'
import { clearRun, loadBlooms, loadProgress, loadRun, recordRun, saveRun, BLOOM_SETS } from '../src/game/progress'
import { dailyTide } from '../src/game/tides'
import { WATERWAYS, REEDBANK_WAVES } from '../src/game/waterways'
import { WAVES } from '../src/game/waves'

class MemoryStorage implements Storage {
  data = new Map<string, string>()
  failWrites = false
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { if (this.failWrites) throw new Error('QuotaExceededError'); this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
  clear() { this.data.clear() }
}
const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
let checks = 0
const check = (name: string, fn: () => void) => { fn(); checks++; console.log(`PASS  ${name}`) }

const sim = new Sim()
sim.build(3, 'wick')
sim.startWave()
for (let i = 0; i < 300; i++) sim.step(DT)
const first = sim.snapshot()
for (let i = 0; i < 60; i++) sim.step(DT)
const second = sim.snapshot()

check('busy save validates and keeps board flowers atomically', () => {
  assert(first.v === 2 && first.enemies.length > 0)
  assert(validSnapshot(first))
  assert(saveRun(first, [1, 2, 3]))
  assert.deepEqual(loadRun(), first)
  assert.deepEqual(loadBlooms(), [1, 2, 3])
})
check('corrupt primary recovers previous complete checkpoint', () => {
  assert(saveRun(second, [4, 5, 6]))
  storage.setItem(RUN_KEY, '{truncated')
  const run = readRun(storage)!
  assert.equal(saveHealth, 'recovered')
  assert.deepEqual(run.snapshot, first)
  assert.deepEqual(run.blooms, [1, 2, 3])
  assert(saveRun(second, [4, 5, 6]))
  assert.deepEqual(decodeRun(storage.getItem(BACKUP_KEY))!.snapshot, first)
})
check('quota failure preserves a playable primary and backup', () => {
  storage.failWrites = true
  assert.equal(storeRun(first, [], storage), false)
  assert.equal(saveHealth, 'unavailable')
  assert.deepEqual(readRun(storage)!.snapshot, second)
  storage.failWrites = false
})
check('altered JSON, invalid IDs and broken timers are rejected', () => {
  assert.equal(decodeRun(encodeRun(first, []).replace('checksum', 'broken')), null)
  for (const mutate of [
    (s: any) => { s.towers[0].pad = 999 },
    (s: any) => { s.towers[0].a = 3; s.towers[0].b = 3 },
    (s: any) => { s.enemies[0].speedBase = 'fast' },
    (s: any) => { delete s.enemies[0].burnT },
    (s: any) => { s.stats.towersUsed = {} },
    (s: any) => { s.gates[0].state = 2 },
    (s: any) => { s.challenge.waterway = 'missing-map' },
    (s: any) => { s.challenge.keepers = {} },
    (s: any) => { s.challenge.noCharms = 'false' },
    (s: any) => { s.challenge.campaign = true },
    (s: any) => { s.towers[0].id = 'constructor' },
  ]) {
    const broken = structuredClone(first)
    mutate(broken)
    assert.equal(validSnapshot(broken), false)
  }
})
check('old v1 and v2 saves migrate; new-run clearing cannot revive them', () => {
  clearRun()
  storage.setItem('lanternlocks.save.v1', JSON.stringify({ ...first, v: 1 }))
  assert.equal(loadRun()!.v, 1)
  storage.setItem('lanternlocks.save.v1', JSON.stringify(first))
  assert.deepEqual(loadRun(), first)
  assert(saveRun(second))
  clearRun()
  assert.equal(loadRun(), null)
  assert.equal(storage.getItem(BACKUP_KEY), null)
})
check('daily tides keep valid 32-bit seeds and resume', () => {
  const tide = new Sim('standard', dailyTide(new Date('2026-09-27T00:00:00Z')).challenge)
  tide.startWave()
  for (let i = 0; i < 180; i++) tide.step(DT)
  assert(validSnapshot(tide.snapshot()))
  const restored = Sim.restore(tide.snapshot())
  for (let i = 0; i < 180; i++) { tide.step(DT); restored.step(DT) }
  assert.deepEqual(restored.snapshot(), tide.snapshot())
})
check('both waterways have connected routes, two distinct branches and clear pads', () => {
  for (const [id, w] of Object.entries(WATERWAYS)) {
    const s = new Sim('standard', id === 'reedbank' ? { waterway: 'reedbank' } : {})
    for (const seg of s.level.segs.values()) {
      if ('seg' in seg.next) assert(s.level.segs.has(seg.next.seg))
      if ('gate' in seg.next) { const gate = seg.next.gate; assert(s.gates.some(g => g.def.id === gate)) }
    }
    for (const g of s.gates) {
      const branches = g.def.outs.map(id => s.level.segs.get(id)!)
      const rich = branches.find(b => b.bonus === 2)!
      const long = branches.find(b => b.bonus === 1)!
      assert(rich.line.length < long.line.length, w.level.name)
    }
    for (const pad of id === 'reedbank' ? s.pads : []) {
      for (const seg of s.level.segs.values()) assert(seg.line.distanceTo(pad.x, pad.y) > 44, `${id} pad touches ${seg.id}`)
    }
  }
})
check('Reedbank preserves 25 wave budgets, boss schedule and first introductions', () => {
  assert.equal(REEDBANK_WAVES.length, 25)
  for (let i = 0; i < 25; i++) {
    assert.deepEqual(REEDBANK_WAVES[i].groups.map(({ src, ...g }) => g), WAVES[i].groups.map(({ src, ...g }) => g))
    if (i < 10) assert(REEDBANK_WAVES[i].groups.every(g => g.src !== 'west'))
  }
  assert.notDeepEqual(REEDBANK_WAVES[11], WAVES[11])
})
check('Reedbank save resumes exactly with its own geometry and waves', () => {
  const a = new Sim('standard', { waterway: 'reedbank' })
  a.build(3, 'wick')
  a.startWave()
  for (let i = 0; i < 480; i++) a.step(DT)
  assert(validSnapshot(a.snapshot()))
  const b = Sim.restore(a.snapshot())
  for (let i = 0; i < 600; i++) { a.step(DT); b.step(DT) }
  assert.deepEqual(a.snapshot(), b.snapshot())
  assert.equal(b.level.def.name, 'Reedbank Reach')
  assert.equal(b.isChallenge, false)
})
check('map wins, existing medals and cosmetic reward are kept separately', () => {
  storage.setItem('lanternlocks.progress.v1', JSON.stringify({ wins: { standard: 2 }, best: { standard: 25 } }))
  const s = new Sim('standard', { waterway: 'reedbank' })
  s.won = true; s.wave = 25
  assert(recordRun(s, 10).includes('reedkeeper'))
  const p = loadProgress()
  assert.equal(p.waterways.reedbank!.wins.standard, 1)
  assert.equal(p.waterways.wickwater!.wins.standard, 2)
  assert(BLOOM_SETS.find(b => b.id === 'reed')!.earned(p, {}))
})
check('blocked storage access does not crash the title or lose the live run', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError') } })
  assert.equal(readRun(), null)
  assert.equal(storeRun(first, []), false)
  assert.equal(saveHealth, 'unavailable')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
})
console.log(`${checks} release checks passed.`)
