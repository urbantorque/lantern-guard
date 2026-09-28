import type { LevelDef } from './level'
import type { Group, WaveDef } from './waves'
import type { Sim } from './sim'

export const GARDENS_END = 39
export const GARDENS_PADS = [{ x: 165, y: -765 }, { x: 555, y: -765 }, { x: 290, y: -555 }, { x: 465, y: -520 }]
/** Stable existing segment and pad identities keep every earlier investment intact. */
export function gardensLevel(base: LevelDef): LevelDef {
  return { ...base, name: 'Wickwater, Harbour & Water Gardens',
    segments: [...base.segments,
      { id: 'garden-west', pts: [{ x: 70, y: -955 }, { x: 100, y: -845 }, { x: 265, y: -810 }, { x: 275, y: -690 }, { x: 360, y: -655 }], next: { seg: 'garden-merge' } },
      { id: 'garden-east', pts: [{ x: 650, y: -955 }, { x: 620, y: -845 }, { x: 455, y: -810 }, { x: 445, y: -690 }, { x: 360, y: -655 }], next: { seg: 'garden-merge' } },
      { id: 'garden-merge', pts: [{ x: 360, y: -655 }, { x: 350, y: -540 }, { x: 395, y: -485 }, { x: 360, y: -420 }], next: { seg: 'harbour' } },
    ],
    sources: base.sources.map(s => ({ ...s, seg: s.id === 'north' ? 'garden-west' : 'garden-east', name: s.id === 'north' ? 'West garden' : 'East garden' })),
    pads: [...base.pads, ...GARDENS_PADS],
  }
}
const g = (type: Group['type'], count: number, gap: number, at = 0, src: Group['src'] = 'north'): Group => ({ type, count, gap, at, src })
export const GARDENS_WAVES: WaveDef[] = [
  { groups: [g('wisp', 65, .07), g('shell', 26, .45, 3, 'west'), g('bloat', 24, .5, 11), g('wisp', 65, .07, 16, 'west')], note: 'Two streams, one bend. West garden crowds and east garden armour meet above the harbour. Put splash at the meeting point; your established towers catch survivors.' },
  { groups: [g('reedling', 24, 1.1), g('reedling', 24, 1.1, 7, 'west'), g('wisp', 95, .055, 12)], note: 'Reedlings grow one shell when they reach the meeting point. Catch them on the approaches, or prepare heavy hits at the bend.' },
  { groups: [g('reedling', 38, .42), g('wisp', 120, .04, 1, 'west'), g('skiff', 30, .5, 14), g('bloat', 35, .45, 15, 'west')], note: 'A crowded confluence. Moonbell holds the meeting point for Cracker bursts. Entrance towers thin each stream.' },
  { groups: [g('vshell', 35, .48), g('reedling', 42, .44, 3, 'west'), g('mender', 12, .9, 9), g('skiff', 36, .46, 16, 'west')], note: 'Veils in the reeds. Owl sight lets your bend towers hit both streams; check the harbour before starting.' },
  { groups: [g('toad', 3, 8), g('reedling', 54, .4, 2, 'west'), g('wisp', 150, .035, 8), g('skiff', 45, .4, 18, 'west')], note: 'The garden procession. Next comes Bloomheart: it signals two healing pulses. Clear nearby crowds before each pulse lands.' },
  { groups: [g('bloomheart', 1, 1), g('reedling', 60, .38, 5, 'west'), g('skiff', 45, .45, 12), g('vshell', 32, .55, 20, 'west')], note: 'Bloomheart signals at 70% and 35% health, then restores nearby ordinary Mopes after 3 seconds. Its ring marks the reach. It never heals itself.' },
]
export function gardensStatus(sim: Sim): string | null {
  const boss = sim.enemies.find(e => e.alive && e.def.id === 'bloomheart')
  return boss ? ((boss.signalT ?? 0) > 0 ? `Bloomheart · healing pulse in ${Math.ceil(boss.signalT!)}s · clear Mopes inside its ring` : 'Bloomheart · healing pulses at 70% and 35% health') : null
}
