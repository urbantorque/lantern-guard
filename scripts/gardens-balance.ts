import { writeFileSync } from 'node:fs'
import { Sim, DT, type SaveSnapshotV2 } from '../src/game/sim'
import { runBot } from './bot'
import { BOTS } from './sim-bots'

const rows: unknown[] = []
for (const difficulty of ['standard', 'nightfall'] as const) for (const guardian of [undefined, 'ember', 'reed'] as const) for (const index of [0, 4, 12]) {
  let dawn: SaveSnapshotV2 | undefined, harbourWon: SaveSnapshotV2 | undefined
  const base = runBot(BOTS[index], difficulty, 7, s => { if (s.won) dawn = s.snapshot() }, { guard: 1, expanding: 1, ...(guardian ? { guardian } : {}) })
  let harbour: ReturnType<typeof runBot> | undefined, gardens: ReturnType<typeof runBot> | undefined
  let frozen: { wave: number; outcome: string | null; light: number } | undefined, newPads = 0
  if (dawn) {
    const s = Sim.restore(dawn); s.continueHarbour()
    harbour = runBot({ ...BOTS[index], maxTowers: 22 }, difficulty, 7, s => { if (s.won) harbourWon = s.snapshot() }, {}, s.snapshot())
  }
  if (harbourWon) {
    const s = Sim.restore(harbourWon); s.continueGardens()
    const idle = Sim.restore(s.snapshot())
    while (!idle.over && idle.time < 3600) { if (!idle.waveActive) idle.startWave(); idle.step(DT); idle.events.length = 0 }
    frozen = { outcome: idle.over, wave: idle.wave, light: idle.lives }
    gardens = runBot({ ...BOTS[index], maxTowers: 26 }, difficulty, 7, s => { newPads = s.towers.filter(t => t.pad >= 22).length }, {}, s.snapshot())
  }
  rows.push({ difficulty, guardian: guardian ?? 'lantern', strategy: BOTS[index].name, base, harbour, gardens, frozen, newPads })
  console.log(JSON.stringify({ difficulty, guardian: guardian ?? 'lantern', strategy: BOTS[index].name, base: base.outcome, harbour: harbour?.outcome, gardens: gardens?.outcome, light: gardens?.lives, frozen, newPads }))
}
writeFileSync('docs/GARDENS-BALANCE.json', JSON.stringify(rows, null, 2) + '\n')
