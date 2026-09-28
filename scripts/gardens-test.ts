import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { Sim, DT, type SaveSnapshot, type Proj } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { creditMilestones, loadProgress, saveProgress, recordRun } from '../src/game/progress'
import { guardianUnlocked } from '../src/game/guardians'
import { GARDENS_WAVES, gardensStatus } from '../src/game/gardens'
import { waveHighlight } from '../src/game/feedback'
import fixtures from '../qa/journey-fixtures.json'

class MemoryStorage implements Storage {
  data = new Map<string, string>()
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { this.data.set(k, v) }
  removeItem(k: string) { this.data.delete(k) }
  clear() { this.data.clear() }
}
const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
const harbour = () => Sim.restore(fixtures['harbour-won'] as unknown as SaveSnapshot)
const gardens = () => { const s = harbour(); assert(s.continueGardens()); return s }
const exact = (s: Sim, ticks: number) => {
  const snap = JSON.parse(JSON.stringify(s.snapshot()))
  assert(validSnapshot(snap))
  const r = Sim.restore(snap)
  for (let i = 0; i < ticks; i++) { s.step(DT); r.step(DT) }
  assert.deepEqual(r.snapshot(), s.snapshot())
}

const s = harbour(), before = s.snapshot()
const refs = [...s.towers]
assert(s.changeGuardian('reed'))
assert.equal(before.challenge.guardian, undefined, 'guardian choice must not mutate a source snapshot')
assert(s.continueGardens())
assert.equal(s.finalWave, 39); assert.equal(s.pads.length, 26)
assert.equal(s.glow, before.glow); assert.equal(s.lives, before.lives)
assert.deepEqual(s.snapshot().towers, before.towers)
assert(s.towers.every((t, i) => t === refs[i]))
assert.equal(s.level.def.sources[0].seg, 'garden-west')
assert.equal(s.level.def.sources[1].seg, 'garden-east')
assert.equal(s.level.segs.get('garden-merge')!.next && s.level.segs.get('harbour')!.id, 'harbour')
for (const pad of [22, 23, 24, 25]) assert(s.padAvailable(pad))
assert(!s.continueGardens()); assert(!s.changeGuardian('ember'))
assert(s.startWave()); assert(!s.canStartWave()); exact(s, 150)
assert.equal(GARDENS_WAVES.length, 6)
assert(!GARDENS_WAVES[0].groups.some(g => ['reedling', 'bloomheart'].includes(g.type)))
assert(GARDENS_WAVES[1].groups.some(g => g.type === 'reedling'))
assert(GARDENS_WAVES[5].groups.some(g => g.type === 'bloomheart'))
console.log('PASS seamless chapter expansion, stable towers/resources, guardian boundary rules and exact Gardens resume')

const encounter = gardens()
encounter.towers = []; encounter.pads.forEach(p => { p.tower = null })
encounter.wave = 35
const path = encounter.level.segs.get('garden-west')!
const reed = encounter.spawnEnemy('reedling', path, path.line.length - .1, 35)
encounter.step(DT)
assert.equal(reed.seg.id, 'garden-merge'); assert.equal(reed.phase, 1); assert(reed.shell > 0)
encounter.damage(reed, reed.shell, true, null)
assert.equal(reed.shell, 0); exact(encounter, 80); assert.equal(reed.shell, 0)
console.log('PASS Reedling shell grows once at the merge and never regenerates after being broken')

const bossSim = gardens()
bossSim.towers = []; bossSim.pads.forEach(p => { p.tower = null }); bossSim.wave = 39
const merge = bossSim.level.segs.get('garden-merge')!
const boss = bossSim.spawnEnemy('bloomheart', merge, 20, 39)
const ally = bossSim.spawnEnemy('skiff', merge, 50, 39)
ally.hp = ally.maxHp * .25
boss.hp = boss.maxHp * .69
bossSim.step(DT)
assert.equal(boss.phase, 1); assert.equal(boss.signalT, 3)
assert.match(gardensStatus(bossSim)!, /3s/)
const warning = bossSim.snapshot(), bossHp = boss.hp
exact(bossSim, 182)
assert.equal(boss.phase, 2); assert.equal(boss.hp, bossHp)
assert.equal(ally.hp, ally.maxHp * .75)
boss.hp = boss.maxHp * .34
bossSim.step(DT); assert.equal(boss.phase, 3)
exact(bossSim, 185); assert.equal(boss.phase, 4)
exact(bossSim, 180); assert.equal(boss.phase, 4)
console.log('PASS two readable boss pulses, exact countdown resumes, capped ally healing and no self healing')

const combat = gardens()
combat.challenge.guardian = 'reed'; combat.wave = 34
combat.towers = []; combat.pads.forEach(p => { p.tower = null }); combat.glow = 10000
const wick = combat.build(22, 'wick')!; wick.cd = 999
const seg = combat.level.segs.get('n0')!
const enemies = [10, 35, 60].map(d => combat.spawnEnemy('bloat', seg, d, 34))
enemies.forEach(e => { e.hp = e.maxHp = 100; e.speedBase = 0 })
const projectile: Proj = { kind: 'spark', x: enemies[0].x, y: enemies[0].y, vx: 0, vy: 0, speed: 0, target: null, dmg: 6.5, pierce: 3, heavy: false, detect: false, splash: 0, burn: 0, burnDur: 0, cluster: 0, hit: [], life: 5, sx: 0, sy: 0, ex: 0, ey: 0, t: 0, dur: 0, tower: wick, alive: true, brittleBonus: false, bounced: false }
combat.projs.push(projectile)
combat.waveReports = [{ wave: 34, slowSplashHits: 0, damage: {} }]
combat.step(DT)
assert.equal(enemies[0].hp, 93.5); assert.equal(enemies[1].hp, 93.5); assert.equal(enemies[2].hp, 100)
assert.equal(projectile.bounced, true); assert.equal(projectile.hit.length, 2)
exact(combat, 1)
projectile.x = enemies[2].x; projectile.y = enemies[2].y
combat.step(DT)
assert.equal(enemies[2].hp, 93.5); assert.equal(enemies[0].hp, 93.5)
assert.match(waveHighlight(combat, 34), /20 damage/)
const cracker = combat.build(23, 'cracker')!; cracker.cd = 999
enemies.forEach(e => { e.slowT = 2; e.slowF = .5 })
combat.projs = [{ ...projectile, kind: 'firework', bounced: undefined, alive: true, tower: cracker, dmg: 5, splash: 90, sx: enemies[1].x, sy: enemies[1].y, ex: enemies[1].x, ey: enemies[1].y, t: 0, dur: DT, cluster: 0, hit: [] }]
combat.step(DT)
assert.equal(combat.waveReports[0].slowSplashHits, 3)
assert.match(waveHighlight(combat, 34), /3 explosions hit enemies slowed by Moonbells/)
exact(combat, 30)
console.log('PASS Reed bounce hits only one second target, cannot repeat after resume, and wave reports count actual damage/slow-splash hits')

const pSim = gardens()
pSim.stats.maxTier = 3; pSim.stats.pops = 1200; pSim.stats.earlyCalls = 10
const earned = creditMilestones(pSim)
assert.equal(earned.feats.length, 3); assert.equal(loadProgress().settlement, 3)
assert(guardianUnlocked('reed', loadProgress().feats)); assert(guardianUnlocked('ember', loadProgress().feats))
assert.deepEqual(creditMilestones(pSim), { feats: [], restorations: [] })
pSim.stats.maxTier = 0; pSim.stats.pops = 0; pSim.wave = 1
creditMilestones(pSim); assert(guardianUnlocked('reed', loadProgress().feats)); assert.equal(loadProgress().settlement, 3)
const q = new Sim('standard', { guard: 1, id: 'test' }); q.stats.maxTier = 3
storage.clear(); assert.equal(creditMilestones(q).feats.length, 0)
const old = loadProgress(); old.harbourWins = 1; saveProgress(old); assert.equal(loadProgress().settlement, 3)
const won = gardens(); won.wave = 39; won.over = 'won'; won.won = true
creditMilestones(won); recordRun(won, 0)
assert.equal(loadProgress().gardensWins, 1); assert.equal(loadProgress().harbourWins, 1); assert.equal(loadProgress().settlement, 4)
console.log('PASS immediate profile unlocks, retry idempotency, challenge exclusion, returning-player migration and distinct chapter credit')

const shots = gardens()
shots.challenge.guardian = 'reed'; shots.glow = 10000
shots.towers = []; shots.pads.forEach(p => { p.tower = null })
const tw = shots.build(22, 'wick')!; tw.cd = 0
const target = shots.spawnEnemy('bloat', shots.level.segs.get('garden-west')!, 220, 34)
target.speedBase = 0
shots.step(DT)
assert(shots.projs.length > 0)
assert.equal(shots.projs[0].dmg, tw.stats.damage * .75)
assert.equal(shots.projs[0].bounced, false)
exact(shots, 60)
console.log('PASS live Reed shots use the tested 25% tradeoff and resume identically in flight')

const busy = gardens(); busy.wave = 35; busy.startWave()
for (let i = 0; i < 14 * 60; i++) { busy.step(DT); busy.events.length = 0 }
assert(validSnapshot(busy.snapshot()))
const snap = gardens().snapshot()
assert(!validSnapshot({ ...snap, challenge: { ...snap.challenge, gardens: 2 } }))
assert(!validSnapshot({ ...snap, wave: 25 }))
assert(!validSnapshot({ ...snap, waveReports: [{ wave: 34, slowSplashHits: -1, damage: {} }] }))
assert(!validSnapshot({ ...snap, towers: [...snap.towers, { ...snap.towers[0], pad: 26 }] }))
assert(!validSnapshot({ ...warning, enemies: warning.enemies.map(e => ({ ...e, signalT: 4 })) }))
writeFileSync('qa/gardens-fixtures.json', JSON.stringify({ 'gardens-plan': gardens().snapshot(), 'gardens-pulse': warning, 'gardens-busy': busy.snapshot(), 'gardens-won': won.snapshot() }) + '\n')
console.log('PASS new save fields are validated; muted browser fixtures generated')
