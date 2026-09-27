import { LEVEL, type LevelDef } from './level'
import { WAVES, type WaveDef } from './waves'

export type WaterwayId = 'wickwater' | 'reedbank'

/** Offset junctions make the central bank valuable, while the inlet needs its own cover. */
export const REEDBANK: LevelDef = {
  name: 'Reedbank Reach',
  segments: [
    { id: 'n0', pts: [{ x: 280, y: -40 }, { x: 282, y: 35 }, { x: 280, y: 110 }], next: { gate: 'upper' } },
    { id: 'w1', pts: [{ x: 280, y: 110 }, { x: 145, y: 130 }, { x: 45, y: 200 }, { x: 42, y: 325 }, { x: 98, y: 400 }, { x: 220, y: 420 }, { x: 340, y: 425 }, { x: 440, y: 450 }], next: { seg: 'm1' } },
    { id: 'e1', pts: [{ x: 280, y: 110 }, { x: 455, y: 150 }, { x: 558, y: 225 }, { x: 576, y: 312 }, { x: 522, y: 391 }, { x: 440, y: 450 }], next: { seg: 'm1' }, bonus: 2, feature: { kind: 'reveal', at: 250, name: 'Lantern bridge' } },
    { id: 'm1', pts: [{ x: 440, y: 450 }, { x: 450, y: 488 }, { x: 440, y: 530 }], next: { gate: 'lower' } },
    { id: 'w2', pts: [{ x: 440, y: 530 }, { x: 315, y: 567 }, { x: 222, y: 632 }, { x: 206, y: 704 }, { x: 230, y: 765 }, { x: 280, y: 800 }], next: { seg: 'h' }, bonus: 2, feature: { kind: 'crack', at: 215, name: 'Mill wheel' } },
    { id: 'e2', pts: [{ x: 440, y: 530 }, { x: 578, y: 554 }, { x: 656, y: 635 }, { x: 662, y: 730 }, { x: 604, y: 800 }, { x: 503, y: 836 }, { x: 386, y: 832 }, { x: 280, y: 800 }], next: { seg: 'h' } },
    { id: 'h', pts: [{ x: 280, y: 800 }, { x: 279, y: 841 }, { x: 280, y: 878 }], next: { home: true } },
    { id: 'inlet', pts: [{ x: -40, y: 518 }, { x: 90, y: 516 }, { x: 210, y: 509 }, { x: 336, y: 484 }, { x: 440, y: 450 }], next: { seg: 'm1' } },
  ],
  gates: LEVEL.gates.map(g => ({ ...g, x: g.id === 'upper' ? 280 : 440, y: g.id === 'upper' ? 110 : 530 })),
  sources: LEVEL.sources.map(s => ({ ...s })),
  pads: [
    { x: 177, y: 58 }, { x: 382, y: 53 },
    { x: 133, y: 274 }, { x: 262, y: 220 }, { x: 442, y: 265 }, { x: 291, y: 338 },
    { x: 39, y: 440 }, { x: 650, y: 306 },
    { x: 584, y: 452 }, { x: 151, y: 578 },
    { x: 299, y: 699 }, { x: 413, y: 640 }, { x: 568, y: 710 }, { x: 390, y: 733 },
    { x: 117, y: 723 }, { x: 687, y: 514 },
    { x: 171, y: 855 }, { x: 384, y: 908 },
  ],
  home: { x: 280, y: 890 },
}

export const WATERWAYS: Record<WaterwayId, { level: LevelDef; description: string }> = {
  wickwater: { level: LEVEL, description: 'The original canal. Learn the locks and keep your first lantern lit.' },
  reedbank: { level: REEDBANK, description: 'Offset locks and a long inlet. Build around the central bank, then cover both entrances.' },
}
export const waterwayLevel = (id?: WaterwayId) => WATERWAYS[id ?? 'wickwater'].level

/** Same enemy/reward budgets and introductions; entrance pressure is authored for this bank. */
export const REEDBANK_WAVES: WaveDef[] = WAVES.map(w => ({ ...w, groups: w.groups.map(g => ({ ...g })) }))
const inletGroups: Record<number, number[]> = {
  11: [0, 2], 12: [0, 2], 13: [5, 6, 7], 14: [0, 2, 4, 9],
  15: [1, 2], 16: [1, 2, 6], 17: [1, 2, 3], 18: [1, 3, 6],
  19: [6, 7, 8], 20: [1, 5, 6, 7], 21: [3, 4, 5], 22: [1, 2, 3, 4],
  23: [1, 3, 4, 5], 24: [4, 5, 6, 7], 25: [1, 3],
}
for (const [wave, indices] of Object.entries(inletGroups)) {
  REEDBANK_WAVES[Number(wave) - 1].groups.forEach((g, i) => {
    g.src = indices.includes(i) ? 'west' : 'north'
  })
}
REEDBANK_WAVES[0].note = 'Reedbank Reach. The same locks and keepers, on a new stretch of water.'
REEDBANK_WAVES[10].note = 'The West Sluice opens. Keepers near the central bank can cover both streams.'
REEDBANK_WAVES[11].note = 'Menders arrive through the inlet. Target Strong to reach the healers behind the crowd.'
