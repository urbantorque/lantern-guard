import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { NIGHTFALL_LATE_BOSS_HEALTH } from '../src/game/balance'
const output = new URL('../docs/BOSS-BALANCE-TRIALS.jsonl', import.meta.url)
writeFileSync(output, '')
const bot: BotOpts = { name: 'piercing beams', mix: { beam: 8, cracker: .3, wick: .3 }, paths: { wick: 1, cracker: 0, beam: 0, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
for (const scale of [1, .9, .85, .8]) {
  const seen = new Set<number>()
  const result = runBot(bot, 'nightfall', 7, sim => {
    for (const e of sim.enemies) if (['warden', 'bloomheart'].includes(e.def.id) && !seen.has(e.uid)) {
      // Undo the shipped correction so each trial remains relative to the old health.
      seen.add(e.uid); e.hp *= scale / NIGHTFALL_LATE_BOSS_HEALTH; e.maxHp *= scale / NIGHTFALL_LATE_BOSS_HEALTH
    }
  }, { compact: 1, depth: 1, balance: 1, guard: 1, variant: 2 })
  appendFileSync(output, JSON.stringify({ wardenAndBloomheartHpScale: scale, ...result }) + '\n')
  console.log(`Warden and Bloomheart health ${scale}: ${result.outcome} wave ${result.wave}, light ${result.lives}`)
}
