/**
 * Headless balance matrix. Several bot personalities play the full level on
 * each difficulty; the table shows whether routing matters, whether different
 * builds can win, and where the difficulty spikes are.
 *
 *   npm run sim                 -> all difficulties
 *   npm run sim -- standard     -> one difficulty
 *   npm run sim -- standard 3   -> three seeds each (seeds also nudge each bot's tempo)
 *
 * Columns: rich = light lost to escapees from rich runs (already doubled);
 * bank = most glow left unspent at a wave start from wave 15 on;
 * gloom = Old Gloom's health share when it split at the Lower Lock, and how long its halves lasted.
 * With several seeds: wins/seeds, then median light and range; the detail columns are the first seed's.
 */
import type { Difficulty } from '../src/game/defs'
import { runBot } from './bot'

import { BOTS } from './sim-bots'

const arg = process.argv[2] as Difficulty | 'all' | undefined
const seeds = Number(process.argv[3] ?? 1)
const only = process.argv[4]
const diffs: Difficulty[] = arg && arg !== 'all' ? [arg] : ['relaxed', 'standard', 'nightfall']

for (const d of diffs) {
  console.log(`\n=== ${d.toUpperCase()} ===`)
  for (const b of BOTS) {
    if (only && !b.name.startsWith(only)) continue
    const rows = []
    for (let s = 0; s < seeds; s++) rows.push(runBot(b, d, 7 + s * 13))
    const wins = rows.filter((r) => r.outcome === 'WON').length
    const r = rows[0]
    const lights = rows.map((x) => x.lives).sort((p, q) => p - q)
    const light = seeds > 1 ? `med ${String(lights[Math.floor(seeds / 2)]).padStart(2)} (${lights[0]}-${lights[seeds - 1]})`.padEnd(14) : `${String(r.lives).padStart(2)}/${r.maxLives}`
    const leaks = Object.entries(r.leaks)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')
    const spikes = Object.entries(r.waveLeaks)
      .map(([w, v]) => `w${w}:${v}`)
      .join(' ')
    console.log(
      `${(seeds > 1 ? `${wins}/${seeds}` : r.outcome).padEnd(6)} ${b.name.padEnd(30)} wave ${String(r.wave).padStart(2)} light ${light} flips ${String(r.flips).padStart(4)} ${String(r.minutes).padStart(5)}min  rich ${String(r.richLeak).padStart(2)} bank ${String(r.bank).padStart(4)}  gloom[${r.gloom}]  leaks[${leaks}]  by wave[${spikes}]`,
    )
    if (process.env.VERBOSE) console.log('        towers:', r.towers)
  }
}
