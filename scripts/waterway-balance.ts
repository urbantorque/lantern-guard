import { runBot } from './bot'
import { BOTS } from './sim-bots'
import type { Difficulty } from '../src/game/defs'

for (const difficulty of ['relaxed', 'standard', 'nightfall'] as Difficulty[]) {
  for (const i of [0, 1, 3, 4, 5, 8, 10, 12]) {
    for (const seed of [7, 31]) {
      const r = runBot(BOTS[i], difficulty, seed, undefined, { waterway: 'reedbank' })
      console.log(JSON.stringify({ difficulty, seed, bot: r.name, result: r.outcome, wave: r.wave, light: r.lives, flips: r.flips, towers: r.towers, minutes: r.minutes }))
    }
  }
}
