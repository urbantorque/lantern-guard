import { appendFileSync, writeFileSync } from 'node:fs'
import { runBot } from './bot'
import { BOTS } from './sim-bots'

const path = new URL('../docs/GROWING-CANAL-BALANCE.jsonl', import.meta.url)
writeFileSync(path, '')
for (const difficulty of ['relaxed', 'standard', 'nightfall'] as const) {
  for (const seed of [7, 31]) {
    for (const index of [0, 1, 4, 5, 10, 12]) {
      const result = runBot(BOTS[index], difficulty, seed, undefined, { expanding: 1 })
      appendFileSync(path, JSON.stringify({ difficulty, seed, ...result }) + '\n')
      console.log(`${difficulty} seed ${seed}: ${result.name}: ${result.outcome} wave ${result.wave}, ${result.lives}/${result.maxLives} light; first five waves lost ${Object.entries(result.waveLeaks).filter(([w]) => Number(w) <= 5).reduce((n, [, v]) => n + v, 0)}`)
    }
  }
}
