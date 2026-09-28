import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { validSnapshot } from '../src/game/save-store'
import type { SaveSnapshotV2, Sim } from '../src/game/sim'

// Actual moments from deterministic games, with ordinary health, glow and tower costs.
// These saves are loaded through the development-only QA page for browser screenshots.
const fixtures: Record<string, SaveSnapshotV2> = {}
const scores = new Map<string, number>()
const bot: BotOpts = { name: 'gallery', mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
const capture = (key: string, sim: Sim, score = 1) => {
  if (score <= (scores.get(key) ?? -Infinity)) return
  scores.set(key, score)
  fixtures[key] = JSON.parse(JSON.stringify(sim.snapshot()))
}
for (const variant of [0, 1, 3]) {
  const strategy = variant === 3 ? { ...bot, mix: { storm: 4, ballista: 4, beam: .5 }, reserveLate: true, paths: { ...bot.paths, storm: 1 as const, ballista: 1 as const } } : bot
  const result = runBot(strategy, 'standard', 7, sim => {
    if (sim.pendingPlan === 10) sim.chooseBattlePlan('powder')
    if (sim.pendingPlan === 20) sim.chooseBattlePlan('frost')
    const active = sim.enemies.filter(e => e.alive && e.y > 180)
    const action = active.length * 4 + sim.projs.length
    if (variant === 0 && sim.wave === 6 && sim.waveActive) capture('gallery-opening', sim, action)
    if (variant === 1 && sim.wave === 18 && sim.waveActive) capture('gallery-crossing', sim, action)
    if (variant === 3 && sim.wave === 31 && sim.waveActive) capture('gallery-specialists', sim, action)
    if (variant === 0 && sim.wave === 25 && !sim.waveActive) capture('gallery-upgrades', sim)
    if (variant === 1 && sim.wave === 15 && !sim.waveActive) capture('gallery-routes', sim)
    const boss = sim.enemies.find(e => e.alive && e.def.id === 'bloomheart')
    if (variant === 0 && sim.wave === 40 && boss && boss.y > 220 && boss.y < 620) capture('gallery-boss', sim, 100 - Math.abs(boss.y - 400) / 10 + action)
  }, { compact: 1, depth: 1, balance: 1, plans: 1, guard: 1, variant })
  console.log(`Map ${variant}: ${result.outcome} at wave ${result.wave}`)
}
assert.equal(Object.keys(fixtures).length, 6, 'Every gallery scene was reached in a real run')
for (const [key, snapshot] of Object.entries(fixtures)) {
  assert(validSnapshot(snapshot), key)
  console.log(`${key}: wave ${snapshot.wave}, ${snapshot.towers.length} towers, ${snapshot.enemies.length} enemies`)
}
writeFileSync(new URL('../qa/gallery-fixtures.json', import.meta.url), JSON.stringify(fixtures))
