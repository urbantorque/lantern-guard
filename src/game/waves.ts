import type { EnemyId } from './defs'

export type Source = 'north' | 'west'

export interface Group {
  type: EnemyId
  count: number
  gap: number
  at: number
  src?: Source
}

export interface WaveDef {
  groups: Group[]
  /** Short coaching line shown as the wave starts (first-session guidance). */
  note?: string
}

const g = (type: EnemyId, count: number, gap: number, at = 0, src?: Source): Group => ({ type, count, gap, at, src })

/** An interleaved stream: one Mope of each kind in turn, `gap` apart, `rounds` times over. Charms sort these best. */
const mix = (kinds: EnemyId[], rounds: number, gap: number, at = 0, src?: Source): Group[] => kinds.map((type, i) => g(type, rounds, gap * kinds.length, at + gap * i, src))

/** Tight clumps of one kind after another, `pause` apart: sortable by hand, one flip per clump. */
const clumps = (at: number, src: Source | undefined, gap: number, pause: number, ...parts: [EnemyId, number][]): Group[] => {
  let t = at
  return parts.map(([type, count]) => {
    const grp = g(type, count, gap, t, src)
    t += (count - 1) * gap + pause
    return grp
  })
}

export const WAVES: WaveDef[] = [
  /* 1 */ { groups: [g('drip', 10, 1.1)], note: 'Drips drift toward the Great Lantern. Pop them before they arrive.' },
  /* 2 */ { groups: [g('drip', 14, 0.85), g('drip', 6, 0.5, 13)], note: 'The Upper Lock is open. The Lantern run pays double glow, but escapees cost double light.' },
  /* 3 */ { groups: [g('drip', 12, 0.8), g('skitter', 8, 0.7, 7)], note: 'Skitters are fast. Keep them on the long loops, where keepers get more time.' },
  /* 4 */ { groups: [g('drip', 18, 0.6), g('skitter', 8, 0.7, 9)], note: 'The Lower Lock opens. Its Mill run pays double glow and cracks shells.' },
  /* 5 */ { groups: [g('drip', 14, 0.6), g('shell', 4, 1.8, 6), g('skitter', 6, 0.6, 14)], note: 'Shellbacks! Sparks only chip them. Send them down the Mill run, or build Crackers.' },
  /* 6 */ { groups: [g('wisp', 34, 0.16), g('drip', 14, 0.5, 8), g('shell', 4, 1.2, 12)], note: 'A Wisp swarm. Cracker bursts cheer up whole crowds.' },
  /* 7 */ { groups: [g('bloat', 5, 2.2), g('skitter', 12, 0.5, 6), g('shell', 5, 1.2, 12)], note: 'Bloats burst into three Drips.' },
  /* 8 */ { groups: [g('drip', 18, 0.45), g('veil', 8, 1.0, 5), g('skitter', 10, 0.4, 13)], note: 'Veils hide. The Lantern run bridge reveals them, and a Lamp Owl spots them.' },
  /* 9 */ { groups: [g('shell', 10, 0.9), g('skitter', 16, 0.35, 4), g('veil', 8, 0.8, 9), g('bloat', 4, 1.6, 14)] },
  /* 10 */ { groups: [g('drip', 16, 0.5), g('toad', 1, 1, 6), g('skitter', 12, 0.5, 14)], note: 'A Gloomtoad jams any lock it sits on. Set your locks to the long loops before it arrives.' },
  /* 11 */ { groups: [g('drip', 22, 0.45, 0, 'west'), g('skitter', 14, 0.45, 4), g('shell', 8, 0.9, 10, 'west')], note: 'The West Sluice opens. Its Mopes skip the Upper Lock and its Lantern bridge.' },
  /* 12 */ { groups: [g('mender', 4, 2.4), g('drip', 26, 0.35, 1), g('bloat', 5, 1.4, 10, 'west')], note: 'Menders heal the Mopes around them. Cheer them up first.' },
  // from here on the crowds are mixed and come from both entrances: sort them live, or pay for it
  /* 13 */ {
    groups: [...clumps(0, 'north', 0.4, 1.4, ['shell', 4], ['skitter', 5], ['veil', 4], ['shell', 4], ['skitter', 5]), g('wisp', 36, 0.12, 5, 'west'), ...mix(['bloat', 'shell'], 4, 1.1, 10, 'west')],
    note: 'Mixed crowds now. Shells to the Mill, Veils to the Lantern, the rest the long way.',
  },
  /* 14 */ { groups: [...mix(['skitter', 'shell', 'skitter', 'veil'], 5, 0.4), g('mender', 5, 1.4, 5, 'west'), ...clumps(10, 'north', 0.4, 1.2, ['veil', 5], ['bloat', 3], ['veil', 5], ['bloat', 3]), g('shell', 10, 0.5, 14, 'west')] },
  /* 15 */ { groups: [g('bloat', 8, 1.1), ...mix(['shell', 'skitter'], 10, 0.35, 4, 'west'), ...mix(['veil', 'skitter', 'mender'], 5, 0.5, 10), ...clumps(15, 'north', 0.35, 1.2, ['shell', 5], ['skitter', 6], ['shell', 5])] },
  /* 16 */ { groups: [g('vshell', 6, 1.5), ...mix(['veil', 'skitter'], 10, 0.35, 4, 'west'), ...mix(['vshell', 'drip', 'drip'], 6, 0.35, 10), g('bloat', 5, 1.2, 14, 'west')], note: 'Veiled Shells need sight and heavy hits at once.' },
  /* 17 */ { groups: [g('wisp', 60, 0.09), ...mix(['bloat', 'skitter', 'skitter'], 6, 0.45, 5, 'west'), ...clumps(11, 'north', 0.35, 1.2, ['mender', 3], ['shell', 5], ['veil', 5], ['skitter', 6], ['shell', 5])] },
  /* 18 */ { groups: [...mix(['shell', 'skitter', 'veil'], 7, 0.4), g('toad', 1, 1, 6, 'west'), ...mix(['vshell', 'skitter'], 6, 0.5, 12), g('bloat', 6, 1, 16, 'west')] },
  /* 19 */ { groups: [...clumps(0, 'north', 0.3, 1.1, ['skitter', 6], ['veil', 5], ['shell', 5], ['skitter', 6], ['veil', 5], ['shell', 5]), ...mix(['bloat', 'mender'], 5, 0.8, 6, 'west'), ...mix(['veil', 'vshell', 'skitter'], 6, 0.4, 13, 'west')] },
  /* 20 */ { groups: [g('toad', 1, 1, 0), g('toad', 1, 1, 9, 'west'), ...mix(['vshell', 'skitter', 'veil'], 6, 0.45, 4), ...mix(['shell', 'skitter', 'bloat'], 6, 0.5, 13, 'west')], note: 'Two Gloomtoads. Plan both locks.' },
  /* 21 */ { groups: [...mix(['vshell', 'bloat', 'skitter'], 8, 0.45), ...mix(['mender', 'shell', 'veil'], 7, 0.45, 5, 'west'), g('wisp', 50, 0.08, 12)] },
  /* 22 */ { groups: [g('wisp', 70, 0.07), ...mix(['shell', 'skitter', 'veil', 'skitter'], 8, 0.25, 4, 'west'), ...clumps(10, 'north', 0.35, 1.1, ['mender', 3], ['vshell', 5], ['bloat', 4], ['vshell', 5], ['skitter', 8], ['veil', 8])] },
  /* 23 */ { groups: [g('toad', 1, 1, 0), g('toad', 1, 1, 7, 'west'), g('toad', 1, 1, 14), ...mix(['veil', 'skitter', 'shell'], 8, 0.35, 3, 'west'), ...mix(['vshell', 'bloat', 'skitter'], 6, 0.5, 10)] },
  /* 24 */ { groups: [...mix(['bloat', 'skitter', 'shell', 'veil'], 6, 0.3), ...mix(['vshell', 'skitter', 'mender', 'skitter'], 4, 0.35, 3, 'west'), ...clumps(11, 'north', 0.3, 1.1, ['skitter', 6], ['veil', 4], ['bloat', 3], ['shell', 4], ['skitter', 6]), g('wisp', 30, 0.1, 17)] },
  /* 25 */ { groups: [g('gloom', 1, 1, 0), g('shell', 12, 0.8, 2, 'west'), g('bloat', 8, 1.4, 8), g('vshell', 8, 1.2, 14, 'west')], note: 'Old Gloom is shrouded until it splits at the Lower Lock. Everything you have built is for this.' },
]

/** Free play: procedurally escalating waves after the level is won. */
export function freeplayWave(n: number, seed: number): WaveDef {
  const pool: EnemyId[] = ['drip', 'skitter', 'shell', 'veil', 'bloat', 'wisp', 'mender', 'vshell']
  let s = (seed * 9301 + n * 49297) % 233280
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const groups: Group[] = []
  const k = 4 + Math.min(4, Math.floor(n / 4))
  for (let i = 0; i < k; i++) {
    const type = pool[Math.floor(rnd() * pool.length)]
    const base = type === 'wisp' ? 50 : type === 'bloat' || type === 'vshell' || type === 'mender' ? 12 : 22
    groups.push(g(type, Math.round(base * (1 + n * 0.12)), Math.max(0.06, 0.5 - n * 0.015), i * 4, rnd() < 0.5 ? 'west' : 'north'))
  }
  if (n % 3 === 0) groups.push(g('toad', 1 + Math.floor(n / 6), 5, 2))
  return { groups }
}
