import type { TowerId } from './defs'
import { LEVEL, type LevelDef } from './level'

/** New nights grow upstream. Stable pad indices keep every existing keeper in place. */
export const CANAL_STAGES = [
  { wave: 1, name: 'Lantern bend', next: 'Upper canal opens before wave 6', pads: [10, 11, 12, 13, 16, 17] },
  { wave: 6, name: 'Upper canal', next: 'West inlet opens before wave 11', pads: [0, 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 16, 17] },
  { wave: 11, name: 'Whole canal', next: 'Both entrances are open', pads: LEVEL.pads.map((_, i) => i) },
] as const

export const KEEPER_WAVE: Record<TowerId, number> = { wick: 1, cracker: 1, bell: 3, garden: 4, owl: 6, beam: 7 }
export const KEEPER_ROLE: Record<TowerId, string> = {
  wick: 'Fast shots', cracker: 'Crowd bursts', bell: 'Slows groups',
  owl: 'Sees hidden', beam: 'Heavy beam', garden: 'Earns glow',
}
export const KEEPER_HELP: Record<TowerId, string> = {
  wick: 'Quick, low-cost shots. Good for ordinary Mopes.',
  cracker: 'Explosive bursts hit groups and crack armour.',
  bell: 'Slows nearby groups so your other towers get more shots.',
  owl: 'Reveals hidden Mopes so nearby towers can hit them.',
  beam: 'A steady, heavy beam for big, armoured Mopes.',
  garden: 'Earns extra glow each wave. Starts without an attack.',
}

export const stageForWave = (wave: number) => wave >= 11 ? 2 : wave >= 6 ? 1 : 0

export function growingCanal(stage: number): LevelDef {
  const first = stage === 0
  return {
    ...LEVEL,
    segments: first ? [
      { id: 'n0', pts: [{ x: 360, y: 410 }, { x: 357, y: 475 }, { x: 360, y: 548 }], next: { gate: 'lower' } },
      ...LEVEL.segments.filter(s => ['w2', 'e2', 'h'].includes(s.id)),
    ] : LEVEL.segments.filter(s => stage >= 2 || s.id !== 'inlet'),
    // Keep both gate indices stable for saves. An unrevealed gate has no outlets on the current board.
    gates: LEVEL.gates.map(g => ({ ...g, unlockWave: g.id === 'upper' ? 6 : 2 })),
    sources: LEVEL.sources.filter(s => stage >= 2 || s.id === 'north'),
    bounds: first ? { x: 80, y: 392, w: 640, h: 564 } : { x: 0, y: -36, w: 720, h: 976 },
  }
}
