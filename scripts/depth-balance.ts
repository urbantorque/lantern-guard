import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { BOTS } from './sim-bots'
import { compactChallenge } from '../src/game/tides'
import type { PreparationId } from '../src/game/depth'

const path = new URL('../docs/DEPTH-BALANCE.jsonl', import.meta.url)
writeFileSync(path, '')
const mixed: BotOpts = { ...BOTS[0], mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1, storm: 0, ballista: 0 }, router: 'plan', gardens: 1, maxTowers: 10 }
const fixtures: Record<string, unknown> = {}
function record(meta: object, result: ReturnType<typeof runBot>) {
  appendFileSync(path, JSON.stringify({ ...meta, ...result }) + '\n')
  console.log(`${JSON.stringify(meta)} ${result.outcome} wave ${result.wave}, ${result.lives} light`)
}
for (const difficulty of ['standard', 'nightfall'] as const) for (const variant of [0, 1, 2, 3]) for (const seed of [7, 1004]) for (const specialists of [false, true]) {
  const bot = { ...mixed, name: specialists ? 'specialists and preparations' : 'original six', mix: { ...mixed.mix, ...(specialists ? { storm: 4, ballista: 4 } : {}) } }
  let prep = 0
  const result = runBot(bot, difficulty, seed, sim => {
    if (sim.pendingPlan === 10) sim.chooseBattlePlan('powder')
    if (sim.pendingPlan === 20) sim.chooseBattlePlan('frost')
    if (specialists && sim.preparationOffer && sim.prepare((['oil', 'net', 'ward'] as PreparationId[])[prep % 3])) prep++
    if (specialists && difficulty === 'standard' && variant === 0 && seed === 7 && sim.wave === 32 && sim.enemies.length >= 8 && !fixtures['depth-busy']) fixtures['depth-busy'] = sim.snapshot()
  }, { compact: 1, plans: 1, depth: 1, guard: 1, variant })
  record({ difficulty, variant, seed, specialists, preparations: prep }, result)
}
for (const kind of ['daily', 'weekly'] as const) {
  const tested = new Set<number>()
  for (let day = 1; day <= 90 && tested.size < 4; day += kind === 'daily' ? 1 : 7) {
    const offer = compactChallenge(new Date(2026, 8, day), kind), variant = offer.challenge.variant!
    if (tested.has(variant)) continue
    tested.add(variant)
    record({ challenge: offer.id, variant }, runBot(mixed, 'standard', 7, undefined, offer.challenge))
  }
}
record({ control: 'stop investing after wave 15' }, runBot({ ...mixed, freezeAt: 15 }, 'standard', 7, undefined, { compact: 1, depth: 1, guard: 1, variant: 0 }))
writeFileSync(new URL('../qa/depth-busy.json', import.meta.url), JSON.stringify(fixtures))
