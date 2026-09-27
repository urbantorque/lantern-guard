import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { runBot } from './bot'
import { BOTS } from './sim-bots'
import type { Difficulty } from '../src/game/defs'

// Recorded from the restored original BEFORE changing simulation or level plumbing.
// Hashes sample complete snapshots, not just win/loss, across three modes and five builds.
const reference = new URL('./fixtures/wickwater-original.json', import.meta.url)
const results: Record<string, string> = {}
for (const difficulty of ['relaxed', 'standard', 'nightfall'] as Difficulty[]) {
  for (const i of [0, 1, 3, 5, 12]) {
    const hash = createHash('sha256')
    let tick = 0
    const result = runBot(BOTS[i], difficulty, 7, sim => {
      if (++tick % 600 === 0 || sim.over) hash.update(JSON.stringify(sim.snapshot()))
    })
    hash.update(JSON.stringify(result))
    results[`${difficulty}:${BOTS[i].name}`] = hash.digest('hex')
  }
}
if (process.argv.includes('--record-original')) {
  writeFileSync(reference, JSON.stringify(results, null, 2) + '\n')
  console.log('Recorded 15 original Wickwater runs.')
} else {
  assert.deepEqual(results, JSON.parse(readFileSync(reference, 'utf8')), 'Wickwater simulation diverged from the restored original')
  console.log('PASS  15 Wickwater runs match original snapshots and outcomes exactly.')
}
