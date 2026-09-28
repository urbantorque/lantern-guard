import { writeFileSync, appendFileSync } from 'node:fs'
import { runBot, type BotOpts } from './bot'
import type { Challenge } from '../src/game/sim'

const legacy = process.argv.includes('--legacy')
const quick = process.argv.includes('--quick')
const output = new URL(`../docs/TOWER-BALANCE-${legacy ? 'BEFORE' : 'AFTER'}.jsonl`, import.meta.url)
const base: BotOpts = { name: 'mixed', mix: { beam: 1.6, cracker: 1.3 }, paths: { wick: 1, cracker: 0, beam: 1, bell: 1 }, router: 'plan', gardens: 1, maxTowers: 8 }
const bots: BotOpts[] = [
  base,
  { ...base, name: 'twin lamps', mix: { beam: 8, cracker: .3, wick: .3 }, paths: { ...base.paths, beam: 1 } },
  { ...base, name: 'piercing beams', mix: { beam: 8, cracker: .3, wick: .3 }, paths: { ...base.paths, beam: 0 } },
  { ...base, name: 'no lighthouse', ban: ['beam'], mix: { cracker: 2, wick: 1.5, storm: 3, ballista: 6 }, paths: { ...base.paths, cracker: 1, storm: 1, ballista: 0 } },
  { ...base, name: 'rockets', mix: { cracker: 5, beam: .4, ballista: 4 }, paths: { ...base.paths, cracker: 1, ballista: 0 } },
  { ...base, name: 'heavy sparks', ban: ['beam'], mix: { wick: 6, cracker: 1.2, ballista: 5 }, paths: { ...base.paths, wick: 1, ballista: 0 } },
  { ...base, name: 'lightning and bolts', mix: { storm: 4, ballista: 4, beam: .5 }, paths: { ...base.paths, storm: 1, ballista: 1 } },
  { ...base, name: 'two gardens', gardens: 2, maxTowers: 7 },
]
for (const bot of bots) if (bot.mix.storm || bot.mix.ballista) bot.reserveLate = true
const selected = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',')
writeFileSync(output, '')
for (const difficulty of (quick ? ['standard'] : ['standard', 'nightfall']) as ('standard' | 'nightfall')[]) {
  for (const variant of (quick ? [0, 3] : [0, 1, 2, 3])) for (const bot of bots) {
    if (selected && !selected.includes(bot.name)) continue
    const stages: object[] = [], seen = new Set<number>()
    let end: object = {}
    const challenge: Challenge = { compact: 1, depth: 1, guard: 1, variant, ...(!legacy ? { balance: 1 } : {}) }
    const result = runBot(bot, difficulty, 7, sim => {
      if (!sim.waveActive && [10, 20, 25, 30, 40].includes(sim.wave) && !seen.has(sim.wave)) {
        seen.add(sim.wave)
        stages.push({ wave: sim.wave, light: sim.lives, glow: sim.glow, towers: sim.towers.map(t => ({ id: t.id, a: t.a, b: t.b, rank: t.refinement, spent: t.spent, damage: Math.round(t.damageDealt ?? 0) })) })
      }
      end = { towers: sim.towers.map(t => ({ id: t.id, a: t.a, b: t.b, rank: t.refinement, spent: t.spent, damage: Math.round(t.damageDealt ?? 0) })) }
    }, challenge)
    appendFileSync(output, JSON.stringify({ difficulty, variant, stages, end, ...result }) + '\n')
    console.log(`${difficulty} map ${variant} ${bot.name}: ${result.outcome} ${result.wave}, light ${result.lives}`)
  }
}
