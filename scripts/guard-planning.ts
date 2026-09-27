import { writeFileSync } from 'node:fs'
import { runBot } from './bot'
import { BOTS } from './sim-bots'

// Focused follow-up: is active sorting actually required on Nightfall?
const results = []
for (const gardens of [0, 1]) {
  for (const maxTowers of [6, 8, 10, 12]) {
    const bot = { ...BOTS[12], name: `Planning beams: ${maxTowers} towers, ${gardens} garden`, router: 'plan' as const, maxTowers, gardens }
    const result = runBot(bot, 'nightfall', 7, undefined, { expanding: 1, guard: 1 })
    results.push({ seed: 7, difficulty: 'nightfall', options: bot, ...result })
    console.log(`${result.name}: ${result.outcome} wave ${result.wave}, ${result.lives} light, ${result.flips} flips`)
  }
}
writeFileSync(new URL('../docs/GUARD-PLANNING.json', import.meta.url), JSON.stringify(results, null, 2))
