import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import { compactChallenge } from '../src/game/tides'
import type { Challenge } from '../src/game/sim'
const output = new URL('../docs/TOWER-BALANCE-FOLLOWUP.jsonl', import.meta.url)
writeFileSync(output, '')
const mixed: BotOpts = { name: 'mixed', mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
const profiles: BotOpts[] = [mixed,
  { ...mixed, name: 'piercing beams', mix: { beam: 8, cracker: .3, wick: .3 }, paths: { ...mixed.paths, beam: 0 } },
  { ...mixed, name: 'heavy sparks', mix: { wick: 6, cracker: 1.2, ballista: 5 }, ban: ['beam'], paths: { ...mixed.paths, ballista: 0 }, reserveLate: true },
  { ...mixed, name: 'no lighthouse', mix: { cracker: 2, wick: 1.5, storm: 3, ballista: 6 }, ban: ['beam'], paths: { ...mixed.paths, cracker: 1, storm: 1, ballista: 0 }, reserveLate: true },
]
function record(kind: string, bot: BotOpts, challenge: Challenge, seed: number) {
  const result = runBot(bot, 'standard', seed, undefined, challenge)
  appendFileSync(output, JSON.stringify({ kind, challenge, seed, ...result }) + '\n')
  console.log(`${kind} map ${challenge.variant} ${bot.name}: ${result.outcome} ${result.wave}, light ${result.lives}`)
}
for (const variant of [0, 1, 2, 3]) for (const bot of profiles) record('second seed', bot, { compact: 1, depth: 1, balance: 1, guard: 1, variant }, 1004)
for (const kind of ['daily', 'weekly'] as const) {
  const seen = new Set<number>()
  for (let day = 1; day <= 100 && seen.size < 4; day += kind === 'daily' ? 1 : 7) {
    const offer = compactChallenge(new Date(2026, 8, day), kind, true)
    if (seen.has(offer.challenge.variant!)) continue
    seen.add(offer.challenge.variant!)
    for (const bot of profiles.slice(0, 2)) record(kind, bot, offer.challenge, offer.challenge.skirmish!.seed)
  }
}
for (const guardian of ['ember', 'reed', 'tide'] as const) record(guardian, mixed, { compact: 1, depth: 1, balance: 1, guard: 1, variant: 0, guardian }, 7)
