/**
 * Tide balance. Bot personalities play a stretch of daily tides and every
 * weekly rule; the table shows which days are too hard or too easy and
 * whether sorting with the locks still decides the result.
 *
 *   npm run tides              -> 28 daily tides from a fixed start date, plus the weekly rotation
 *   npm run tides -- 60        -> 60 days
 *   npm run tides -- 28 weekly -> weekly rotation only
 *
 * Every challenge is played on Standard, as the game offers them.
 */
import { dailyTide, weeklyNight, type ChallengeOffer } from '../src/game/tides'
import { runBot, type BotResult } from './bot'
import { BOTS } from './sim-bots'

const days = Number(process.argv[2] ?? 28)
const only = process.argv[3]
// a fixed start keeps the report reproducible
const START = new Date(2026, 8, 28)
const PLAYERS = ['balanced + routing', 'careful sorter, beams', 'sparks + bells + routing', 'heavy hitters + routing', 'slow reactions (1.5s)', 'balanced, no routing', 'charms only (no taps)']
const bots = BOTS.filter((b) => PLAYERS.includes(b.name))

const tally = new Map<string, { wins: number; runs: number; light: number }>()
const byMod = new Map<string, { wins: number; runs: number }>()
const add = <K>(m: Map<K, { wins: number; runs: number; light?: number }>, k: K, r: BotResult) => {
  const t = m.get(k) ?? { wins: 0, runs: 0, light: 0 }
  t.runs++
  if (r.outcome === 'WON') t.wins++
  if (t.light !== undefined) t.light += r.lives
  m.set(k, t)
}

function play(offer: ChallengeOffer) {
  const cells: string[] = []
  const routers: BotResult[] = []
  for (const b of bots) {
    const r = runBot(b, 'standard', 7, undefined, offer.challenge)
    add(tally, `${offer.kind}|${b.name}`, r)
    if (b.router === 'smart') routers.push(r)
    cells.push(r.outcome === 'WON' ? String(r.lives).padStart(2) : ` x${String(r.wave - (offer.challenge.tide?.from ?? 0)).padStart(2)}`.slice(-3))
  }
  const routed = routers.filter((r) => r.outcome === 'WON').length
  for (const k of [`twist:${offer.twist}`, `rule:${offer.rule}`, offer.challenge.tide ? `feature:${offer.challenge.tide.feature}` : '']) {
    if (!k) continue
    const t = byMod.get(k) ?? { wins: 0, runs: 0 }
    t.runs += routers.length
    t.wins += routed
    byMod.set(k, t)
  }
  const mods = `${offer.twist}/${offer.rule}${offer.keepers ? `(${offer.keepers.join(',')})` : ''}`
  console.log(`${offer.when.padEnd(16)} ${offer.name.padEnd(18)} ${mods.padEnd(34)} ${cells.join(' ')}`)
}

console.log(`light left per bot (x N = lost on tide wave N): ${bots.map((b, i) => `${i + 1} ${b.name}`).join(' | ')}`)
if (only !== 'weekly') {
  console.log('\n=== DAILY TIDES ===')
  for (let d = 0; d < days; d++) {
    const date = new Date(START)
    date.setDate(START.getDate() + d)
    play(dailyTide(date))
  }
}
if (only !== 'daily') {
  console.log('\n=== WEEKLY NIGHTS ===')
  const seen = new Set<string>()
  for (let w = 0; seen.size < 6 && w < 20; w++) {
    const date = new Date(START)
    date.setDate(START.getDate() + w * 7)
    const offer = weeklyNight(date)
    if (seen.has(offer.name)) continue
    seen.add(offer.name)
    play(offer)
  }
}
console.log('\n=== SUMMARY ===')
for (const [k, t] of tally) console.log(`${k.padEnd(40)} won ${t.wins}/${t.runs}  avg light ${(t.light / t.runs).toFixed(1)}`)
console.log('\nrouting bots by modifier:')
for (const [k, t] of [...byMod].sort()) console.log(`  ${k.padEnd(22)} ${t.wins}/${t.runs} (${Math.round((t.wins / t.runs) * 100)}%)`)
