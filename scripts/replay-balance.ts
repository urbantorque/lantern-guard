import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { BOTS } from './sim-bots'
import { BATTLE_PLANS, type BattlePlanId } from '../src/game/battle-plans'
import type { Challenge } from '../src/game/sim'

const stone = process.argv.includes('--stone-weir')
const path = new URL(stone ? '../docs/STONE-WEIR-BALANCE.jsonl' : '../docs/REPLAY-BALANCE.jsonl', import.meta.url)
const mixed: BotOpts = { ...BOTS[0], mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
const choices: BattlePlanId[][] = [[], ['piercing', 'embers'], ['powder', 'frost'], ['lookout', 'moths']]
writeFileSync(path, '')
function run(variant: number, difficulty: 'standard' | 'nightfall', plans: BattlePlanId[], guardian?: Challenge['guardian'], bot = mixed) {
  const result = runBot({ ...bot, name: stone ? bot.name : plans.join(' + ') || 'no plans' }, difficulty, 7, sim => {
    const choice = plans.find(id => BATTLE_PLANS[id].wave === sim.pendingPlan)
    if (choice) sim.chooseBattlePlan(choice)
  }, { compact: 1, plans: 1, guard: 1, variant, ...(guardian ? { guardian } : {}) })
  appendFileSync(path, JSON.stringify({ variant, difficulty, guardian: guardian ?? 'lantern', plans, ...result }) + '\n')
  console.log(`${difficulty} map ${variant}, ${guardian ?? 'lantern'}, ${result.name}: ${result.outcome} wave ${result.wave}, ${result.lives} light`)
}
if (stone) {
  for (const bot of [
    { ...mixed, name: 'no gardens', gardens: 0, maxTowers: 9 },
    { ...BOTS[12], name: 'beams', router: 'plan' as const, gardens: 1, maxTowers: 8 },
    { ...mixed, name: 'bursts', mix: { cracker: 2, bell: 1.4, beam: 1.6, wick: .5 }, paths: { wick: 1 as const, cracker: 1 as const, bell: 1 as const, beam: 1 as const } },
    { ...mixed, name: 'stop investing after 15', freezeAt: 15 },
  ]) for (const difficulty of ['standard', 'nightfall'] as const) run(3, difficulty, [], undefined, bot)
} else {
  for (const difficulty of ['standard', 'nightfall'] as const) for (const variant of [0, 1, 2, 3]) for (const plans of choices) run(variant, difficulty, plans)
  for (const guardian of ['ember', 'reed', 'tide'] as const) for (const variant of [0, 1, 2, 3]) run(variant, 'standard', ['powder', 'frost'], guardian)
}
