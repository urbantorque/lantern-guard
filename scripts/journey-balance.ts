import { writeFileSync } from 'node:fs'
import { DT, Sim, type SaveSnapshotV2 } from '../src/game/sim'
import { runBot } from './bot'
import { BOTS } from './sim-bots'
import { dailyTide, weeklyNight } from '../src/game/tides'

const results: unknown[] = []
const fixtures: Record<string, SaveSnapshotV2> = {}
for (const difficulty of ['standard', 'nightfall'] as const) for (const guardian of [undefined, 'ember'] as const) for (const index of [0, 4, 12]) {
  let dawn: SaveSnapshotV2 | undefined
  const base = runBot(BOTS[index], difficulty, 7, s => { if (s.over === 'won') dawn = s.snapshot() }, { expanding: 1, guard: 1, ...(guardian ? { guardian } : {}) })
  let harbour: ReturnType<typeof runBot> | undefined
  let frozen: { outcome: string | null; wave: number; light: number } | undefined
  let newPadsUsed = 0
  if (dawn) {
    const sim = Sim.restore(dawn)
    sim.continueHarbour()
    if (difficulty === 'standard' && index === 12 && !guardian) fixtures['harbour-plan'] = sim.snapshot()
    const idle = Sim.restore(sim.snapshot())
    while (!idle.over && idle.time < 3600) {
      if (!idle.waveActive) idle.startWave()
      idle.step(DT)
      idle.events.length = 0
    }
    frozen = { outcome: idle.over, wave: idle.wave, light: idle.lives }
    harbour = runBot({ ...BOTS[index], maxTowers: 22 }, difficulty, 7, s => {
      newPadsUsed = s.towers.filter(t => t.pad >= 18).length
      if (difficulty === 'standard' && index === 12 && !guardian) {
        if (s.wave === 33 && !fixtures['harbour-boss']) fixtures['harbour-boss'] = s.snapshot()
        if (s.over === 'won') fixtures['harbour-won'] = s.snapshot()
      }
      if (guardian && s.embers.length && !fixtures['ember-fire']) fixtures['ember-fire'] = s.snapshot()
    }, {}, sim.snapshot())
  }
  const row = { difficulty, guardian: guardian ?? 'lantern', strategy: BOTS[index].name, base, harbour, frozen, newPadsUsed }
  results.push(row)
  console.log(JSON.stringify({ difficulty, guardian: guardian ?? 'lantern', strategy: BOTS[index].name, base: base.outcome, harbour: harbour?.outcome, wave: harbour?.wave, light: harbour?.lives, frozen, newPadsUsed }))
}
for (const offer of [dailyTide(new Date(2026, 8, 27), true), weeklyNight(new Date(2026, 8, 27), true)]) {
  const result = runBot(BOTS[12], 'standard', 7, undefined, offer.challenge)
  results.push({ offer: offer.id, result }); console.log(offer.id, result.outcome, result.wave)
}
writeFileSync('docs/JOURNEY-BALANCE.json', JSON.stringify(results, null, 2) + '\n')
writeFileSync('qa/journey-fixtures.json', JSON.stringify(fixtures) + '\n')
