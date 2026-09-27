import { runBot } from './bot'
import { BOTS } from './sim-bots'
const d = (process.argv[2] ?? 'standard') as 'relaxed' | 'standard' | 'nightfall'
for (const b of BOTS) {
  const r = runBot(b, d)
  const mids = Object.entries(r.margin).filter(([w]) => +w >= 11 && +w <= 24).map(([, m]) => m)
  const avg = mids.length ? Math.round(mids.reduce((a, c) => a + c, 0) / mids.length) : -1
  const min = mids.length ? Math.min(...mids) : -1
  console.log(`${r.outcome.padEnd(6)} ${b.name.padEnd(28)} w${String(r.wave).padStart(2)} light ${String(r.lives).padStart(2)} mid-margin avg ${avg} min ${min} final ${r.margin[25] ?? '-'} leaks ${JSON.stringify(r.waveLeaks)}`)
}
