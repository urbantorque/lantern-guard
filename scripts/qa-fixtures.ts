import { writeFileSync } from 'node:fs'
import { runBot } from './bot'
import { BOTS } from './sim-bots'
import type { SaveSnapshot } from '../src/game/sim'

const fixtures: Record<string, SaveSnapshot> = {}
for (const waterway of ['wickwater', 'reedbank'] as const) {
  let last: SaveSnapshot
  runBot(BOTS[4], 'standard', 7, sim => {
    if (sim.wave === 24 && sim.enemies.length > 25 && !fixtures[waterway]) fixtures[waterway] = sim.snapshot()
    if (sim.over === 'won') fixtures[`${waterway}-dawn`] = last
    else last = sim.snapshot()
  }, waterway === 'wickwater' ? {} : { waterway })
}
writeFileSync(new URL('../qa/fixtures.json', import.meta.url), JSON.stringify(fixtures))
console.log('Captured busy nights and the moments before dawn from real winning bot runs.')
