import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { BOTS } from './sim-bots'

const smoke = process.argv.includes('--smoke')
const path = new URL('../docs/COMPACT-BALANCE.jsonl', import.meta.url)
const mixed: BotOpts = { ...BOTS[0], mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
const bots: BotOpts[] = [
  { ...BOTS[0], name: 'mixed / planning', mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 },
  { ...BOTS[12], name: 'beams / planning', router: 'plan', gardens: 1, maxTowers: 8 },
  { ...BOTS[0], name: 'bursts / planning', mix: { cracker: 2, bell: 1.4, beam: 1.6, wick: .5 }, paths: { wick: 1, cracker: 1, bell: 1, beam: 1 }, router: 'plan', gardens: 1, maxTowers: 8 },
  { ...mixed, name: 'mixed / stop investing after 15', freezeAt: 15 },
  { ...mixed, name: 'mixed / live routing', router: 'smart' },
  { ...mixed, name: 'mixed / long routes', router: 'none', gardens: 1, maxTowers: 8 },
  { ...mixed, name: 'mixed / utility routes', router: 'park', gardens: 1, maxTowers: 8 },
  { ...mixed, name: 'mixed / no garden', router: 'plan', gardens: 0, maxTowers: 9 },
  { ...mixed, name: 'mixed / two gardens', router: 'plan', gardens: 2, maxTowers: 7 },
]
writeFileSync(path, '')
for (const difficulty of (smoke ? ['standard'] : ['standard', 'nightfall']) as ('standard' | 'nightfall')[]) {
  for (const variant of [0, 1, 2]) for (const bot of smoke ? bots.slice(0, 3) : bots) {
    let plots = 0, ranks = 0
    const result = runBot(bot, difficulty, 7, sim => { plots = sim.plots.size; ranks = sim.towers.reduce((n, t) => n + (t.refinement ?? 0), 0) }, { compact: 1, variant, guard: 1 })
    appendFileSync(path, JSON.stringify({ difficulty, variant, plots, ranks, ...result }) + '\n')
    console.log(`${difficulty} layout ${variant} ${result.name}: ${result.outcome} wave ${result.wave}, ${result.lives} light; plots ${plots}, ranks ${ranks}; leaks ${JSON.stringify(result.waveLeaks)}`)
  }
}
