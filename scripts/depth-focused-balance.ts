import { appendFileSync, writeFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { BOTS } from './sim-bots'
import { compactChallenge } from '../src/game/tides'
const path = new URL('../docs/DEPTH-FOCUSED-BALANCE.jsonl', import.meta.url)
writeFileSync(path, '')
const base: BotOpts = { ...BOTS[0], mix: { beam: 1.6, cracker: 1.3, storm: 4, ballista: 4 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1, storm: 1, ballista: 0 }, router: 'plan', gardens: 1, maxTowers: 8 }
for (const variant of [0, 1, 2, 3]) for (const difficulty of ['standard', 'nightfall'] as const) {
  const result = runBot(base, difficulty, 7, sim => {
    if (sim.pendingPlan === 10) sim.chooseBattlePlan('powder')
    if (sim.pendingPlan === 20) sim.chooseBattlePlan('frost')
    if (sim.preparationOffer && sim.glow > 400) sim.prepare('oil')
  }, { compact: 1, depth: 1, plans: 1, guard: 1, variant })
  appendFileSync(path, JSON.stringify({ difficulty, variant, strategy: 'armour lightning, eight towers', ...result }) + '\n')
  console.log(`${difficulty} map ${variant}: ${result.outcome} ${result.wave}, ${result.lives} light`)
}
for (const kind of ['daily', 'weekly'] as const) for (const strategy of ['mixed', 'beams'] as const) {
  const offer = compactChallenge(new Date(2026, 8, kind === 'daily' ? 2 : 1), kind)
  const bot = strategy === 'beams' ? { ...BOTS[12], router: 'plan' as const, gardens: 1, maxTowers: 8 } : { ...base, mix: { beam: 1.6, cracker: 1.3 } }
  const result = runBot(bot, 'standard', 7, undefined, offer.challenge)
  appendFileSync(path, JSON.stringify({ challenge: offer.id, variant: offer.challenge.variant, strategy, ...result }) + '\n')
  console.log(`${kind} Stone Weir ${strategy}: ${result.outcome} ${result.wave}, ${result.lives} light`)
}
