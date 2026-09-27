import { writeFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { BOTS } from './sim-bots'

const options: BotOpts[] = [
  { ...BOTS[12], name: 'focused beams, one garden', gardens: 1, paths: { ...BOTS[12].paths, garden: 0 }, maxTowers: 10 },
  { ...BOTS[12], name: 'focused beams, two gardens', gardens: 2, paths: { ...BOTS[12].paths, garden: 0 }, maxTowers: 10 },
  { ...BOTS[12], name: 'Candelabras and beams', paths: { beam: 1, wick: 0 }, maxTowers: 10 },
  { ...BOTS[12], name: 'eight upgraded towers', maxTowers: 8 },
]
const results = []
for (const seed of [7, 31]) {
  for (const option of options) {
    const result = runBot(option, 'nightfall', seed, undefined, { expanding: 1 })
    results.push({ difficulty: 'nightfall', seed, ...result })
    console.log(`${seed}: ${result.name}: ${result.outcome} wave ${result.wave}, ${result.lives}/${result.maxLives}`)
  }
}
writeFileSync(new URL('../docs/GROWING-CANAL-NIGHTFALL.json', import.meta.url), JSON.stringify(results, null, 2))
