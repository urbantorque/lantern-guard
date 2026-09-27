import { appendFileSync, writeFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { BOTS } from './sim-bots'

const path = new URL('../docs/GUARD-BALANCE.jsonl', import.meta.url)
const bots: BotOpts[] = [BOTS[0], BOTS[1], BOTS[4], BOTS[10], BOTS[12],
  { ...BOTS[0], name: 'balanced, planning only', router: 'plan' },
  { ...BOTS[12], name: 'beams, planning only', router: 'plan' },
  { ...BOTS[3], name: 'sparks and bells, planning only', router: 'plan', gardens: 1, maxTowers: 10 },
  { ...BOTS[12], name: 'focused beams and two gardens', gardens: 2, maxTowers: 10 },
  { ...BOTS[12], name: 'focused beams, planning only', router: 'plan', gardens: 2, maxTowers: 10 },
  { name: 'crowd control, planning only', mix: { cracker: 3, bell: 1.4, beam: 2, wick: 0.5 }, paths: { cracker: 1, bell: 1, beam: 0 }, router: 'plan', gardens: 1, maxTowers: 10 },
]
writeFileSync(path, '')
for (const difficulty of ['standard', 'nightfall'] as const) {
  for (const seed of [7, 31]) {
    for (const bot of bots) {
      const result = runBot(bot, difficulty, seed, undefined, { expanding: 1, guard: 1 })
      appendFileSync(path, JSON.stringify({ difficulty, seed, ...result }) + '\n')
      console.log(`${difficulty} ${seed} ${result.name}: ${result.outcome} wave ${result.wave}, ${result.lives} light, ${result.flips} flips; leaks ${JSON.stringify(result.waveLeaks)}`)
    }
  }
}
