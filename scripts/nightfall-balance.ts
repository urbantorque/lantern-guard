import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
const output = new URL('../docs/NIGHTFALL-BALANCE.jsonl', import.meta.url)
const economy = process.argv.includes('--economy')
if (!economy) writeFileSync(output, '')
const supported: BotOpts = { name: 'supported mixed', mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 0, bell: 1, owl: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
const bots: BotOpts[] = [supported,
  { ...supported, name: 'supported focus', mix: { beam: 6, cracker: .5 } },
  { ...supported, name: 'supported sparks', mix: { wick: 6, cracker: 1, ballista: 5 }, ban: ['beam'], reserveLate: true, paths: { ...supported.paths, ballista: 0 } },
  { ...supported, name: 'supported fans', mix: { wick: 5, beam: 2, cracker: 1 }, paths: { ...supported.paths, wick: 0 } },
]
for (const variant of economy ? [] : [0, 2]) for (const bot of bots) {
  const result = runBot(bot, 'nightfall', 7, sim => {
    if (sim.pendingPlan === 10) sim.chooseBattlePlan('powder')
    if (sim.pendingPlan === 20) sim.chooseBattlePlan('frost')
  }, { compact: 1, depth: 1, balance: 1, guard: 1, plans: 1, variant })
  appendFileSync(output, JSON.stringify({ variant, ...result }) + '\n')
  console.log(`Nightfall ${variant} ${bot.name}: ${result.outcome} ${result.wave}, light ${result.lives}`)
}
for (const variant of economy ? [] : [0, 2]) for (const [name, maxTowers, gardens] of [['six towers', 6, 1], ['seven towers, no garden', 7, 0], ['eight towers', 8, 1]] as const) {
  const bot: BotOpts = { ...bots[1], name, maxTowers, gardens, router: 'smart' }
  const result = runBot(bot, 'nightfall', 7, sim => {
    if (!sim.waveActive && [9, 24, 29, 39].includes(sim.wave) && sim.preparationOffer) sim.prepare('oil')
    if (!sim.waveActive) for (const t of sim.towers.filter(t => t.id === 'beam')) sim.refine(t)
  }, { compact: 1, depth: 1, balance: 1, guard: 1, variant })
  appendFileSync(output, JSON.stringify({ variant, approach: 'live routing, beam refinements and boss-wave oil', ...result }) + '\n')
  console.log(`Nightfall ${variant} ${name}: ${result.outcome} ${result.wave}, light ${result.lives}`)
}
if (economy) for (const guardian of ['lantern', 'tide', 'reed'] as const) {
  const bot: BotOpts = { ...bots[1], name: `harvest economy, ${guardian}`, paths: { ...bots[1].paths, garden: 0 }, router: 'smart' }
  const result = runBot(bot, 'nightfall', 7, sim => {
    if (!sim.waveActive && [9, 24, 29, 39].includes(sim.wave) && sim.preparationOffer) sim.prepare('oil')
    if (!sim.waveActive) for (const t of sim.towers.filter(t => t.id === 'beam')) sim.refine(t)
  }, { compact: 1, depth: 1, balance: 1, guard: 1, variant: 2, ...(guardian !== 'lantern' ? { guardian } : {}) })
  appendFileSync(output, JSON.stringify({ variant: 2, approach: 'harvest economy, live routing and boss-wave oil', ...result }) + '\n')
  console.log(`${bot.name}: ${result.outcome} ${result.wave}, light ${result.lives}`)
}
