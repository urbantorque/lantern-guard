import type { LevelDef } from './level'
import type { TowerId, TowerStats } from './defs'
import { WAVES, freeplayWave, type WaveDef } from './waves'
import { HARBOUR_WAVES_V2 } from './harbour'
import { GARDENS_WAVES } from './gardens'

/** A separate rules version: published growing-canal saves keep their exact geometry and economy. */
export const COMPACT_END = 40
export const WATCH_NAMES = ['Millpond', 'Reed Crossing', 'Lantern Reach', 'Stone Weir'] as const
export const WATCH_HELP = [
  'Two loops meet in the middle. Build near the bends to cover both routes.',
  'The side stream joins near the top. Your first towers can cover both entrances.',
  'The bridge and mill change sides. Check your tower range before choosing a route.',
  'The side stream skips the upper loop. Guard the lower bank.',
] as const
export function nextCompactVariant(watch = 0) {
  return [0, 3, 1, 2][Number.isSafeInteger(watch) && watch >= 0 ? watch % 4 : 0]
}
export const STARTER_PLOTS = [0, 3, 6, 10] as const
export const PLOTS = [
  { wave: 1, cost: 0 }, { wave: 6, cost: 140 }, { wave: 11, cost: 220 },
  { wave: 1, cost: 0 }, { wave: 11, cost: 220 }, { wave: 16, cost: 320 },
  { wave: 1, cost: 0 }, { wave: 6, cost: 140 }, { wave: 16, cost: 320 },
  { wave: 21, cost: 440 }, { wave: 1, cost: 0 }, { wave: 21, cost: 440 },
] as const

export function compactLevel(variant = 0): LevelDef {
  const level: LevelDef = {
    name: WATCH_NAMES[variant] ?? WATCH_NAMES[0], bounds: { x: 0, y: 0, w: 720, h: 840 },
    segments: [
      { id: 'n0', pts: [{ x: 360, y: 20 }, { x: 360, y: 132 }], next: { gate: 'upper' } },
      { id: 'w1', pts: [{ x: 360, y: 132 }, { x: 245, y: 130 }, { x: 110, y: 190 }, { x: 110, y: 315 }, { x: 230, y: 390 }, { x: 360, y: 400 }], next: { seg: 'm1' } },
      { id: 'e1', pts: [{ x: 360, y: 132 }, { x: 482, y: 190 }, { x: 515, y: 280 }, { x: 448, y: 352 }, { x: 360, y: 400 }], next: { seg: 'm1' }, feature: { kind: 'reveal', at: 180, name: 'Lantern bridge' } },
      { id: 'm1', pts: [{ x: 360, y: 400 }, { x: 360, y: 470 }], next: { gate: 'lower' } },
      { id: 'w2', pts: [{ x: 360, y: 470 }, { x: 235, y: 510 }, { x: 210, y: 615 }, { x: 300, y: 675 }, { x: 360, y: 686 }], next: { seg: 'h' }, feature: { kind: 'crack', at: 180, name: 'Old mill' } },
      { id: 'e2', pts: [{ x: 360, y: 470 }, { x: 515, y: 490 }, { x: 600, y: 600 }, { x: 530, y: 705 }, { x: 430, y: 720 }, { x: 360, y: 686 }], next: { seg: 'h' } },
      { id: 'h', pts: [{ x: 360, y: 686 }, { x: 360, y: 760 }], next: { home: true } },
      { id: 'inlet', pts: [{ x: 20, y: 400 }, { x: 160, y: 400 }, { x: 360, y: 400 }], next: { seg: 'm1' } },
    ],
    gates: [
      { id: 'upper', name: 'Upper Lock', x: 360, y: 132, outs: ['w1', 'e1'], unlockWave: 2, lockedDir: 0, labels: ['Long loop', 'Lantern bridge'], blurbs: ['More firing time along the outer bank.', 'Shorter route. Reveals hidden Mopes for your towers.'] },
      { id: 'lower', name: 'Lower Lock', x: 360, y: 470, outs: ['w2', 'e2'], unlockWave: 5, lockedDir: 1, labels: ['Old mill', 'Long loop'], blurbs: ['Shorter route. Cracks armour before Mopes reach the lantern.', 'More firing time along the outer bank.'] },
    ],
    sources: [{ id: 'north', seg: 'n0', openWave: 1, name: 'North stream' }, { id: 'west', seg: 'inlet', openWave: 11, name: 'Side inlet' }],
    pads: [{ x: 267, y: 73 }, { x: 459, y: 74 }, { x: 236, y: 252 }, { x: 405, y: 260 }, { x: 75, y: 485 }, { x: 610, y: 290 }, { x: 270, y: 565 }, { x: 432, y: 554 }, { x: 491, y: 642 }, { x: 135, y: 662 }, { x: 275, y: 761 }, { x: 456, y: 780 }],
    home: { x: 360, y: 790 },
  }
  // Authored coverage changes, not a random difficulty roll. All fit the same fixed camera.
  if (variant === 1) {
    level.segments.find(s => s.id === 'w1')!.pts.splice(1, 4, { x: 150, y: 145 }, { x: 75, y: 270 }, { x: 180, y: 360 })
    level.segments.find(s => s.id === 'e2')!.pts.splice(1, 4, { x: 590, y: 478 }, { x: 646, y: 595 }, { x: 525, y: 749 })
    level.pads[0] = { x: 282, y: 215 }; level.pads[11] = { x: 456, y: 813 }
    level.pads[2] = { x: 175, y: 255 }; level.pads[8] = { x: 530, y: 615 }
    // The inlet joins the upper loop, giving entrance towers a different role.
    level.segments.find(s => s.id === 'inlet')!.next = { seg: 'w1' }
    level.segments.find(s => s.id === 'inlet')!.pts = [{ x: 20, y: 58 }, { x: 170, y: 60 }, { x: 280, y: 110 }, { x: 360, y: 132 }]
  } else if (variant === 2) {
    level.segments.find(s => s.id === 'w2')!.pts.splice(1, 2, { x: 235, y: 540 }, { x: 255, y: 620 })
    level.segments.find(s => s.id === 'w1')!.pts.splice(1, 4, { x: 180, y: 145 }, { x: 68, y: 240 }, { x: 125, y: 355 }, { x: 260, y: 410 })
    level.pads[3] = { x: 400, y: 315 }
    level.pads[2] = { x: 184, y: 274 }; level.pads[6] = { x: 172, y: 570 }
    // Mirror the entire authored reach so the useful banks and utility branches change sides.
    for (const s of level.segments) for (const p of s.pts) p.x = 720 - p.x
    for (const p of level.pads) p.x = 720 - p.x
    // Direction 0 remains visually left, including dock arrows and keyboard route previews.
    for (const gate of level.gates) {
      gate.outs.reverse(); gate.labels.reverse(); gate.blurbs.reverse()
      gate.lockedDir = gate.lockedDir === 0 ? 1 : 0
    }
  }
  if (variant === 3) {
    const points: Record<string, [number, number][]> = {
      n0: [[520, 20], [520, 175]],
      w1: [[520, 175], [320, 90], [85, 80], [65, 330], [230, 355], [325, 365]],
      e1: [[520, 175], [640, 270], [585, 360], [325, 365]],
      m1: [[325, 365], [270, 400], [210, 475]],
      w2: [[210, 475], [80, 600], [175, 720], [355, 700]],
      e2: [[210, 475], [370, 485], [620, 475], [660, 635], [570, 710], [355, 700]],
      h: [[355, 700], [355, 760]],
      inlet: [[20, 400], [100, 420], [210, 475]],
    }
    for (const segment of level.segments) segment.pts = points[segment.id].map(([x, y]) => ({ x, y }))
    level.segments.find(s => s.id === 'inlet')!.next = { gate: 'lower' }
    Object.assign(level.gates[0], { x: 520, y: 175 })
    Object.assign(level.gates[1], { x: 210, y: 475 })
    level.pads = [[390, 35], [610, 160], [170, 220], [405, 270], [55, 495], [650, 390], [165, 605], [365, 570], [555, 595], [55, 735], [275, 785], [435, 785]].map(([x, y]) => ({ x, y }))
    level.home = { x: 355, y: 790 }
  }
  // Starting plots cover the default long loops as well as their meeting points.
  ;[level.pads[0], level.pads[2]] = [level.pads[2], level.pads[0]]
  ;[level.pads[6], level.pads[7]] = [level.pads[7], level.pads[6]]
  return level
}

const NOTES: Record<number, string> = {
  1: 'Tap a stone circle to build. Stop enemies reaching the lantern.',
  2: 'Tap the Upper Lock to change the route. The long loop gives towers more time to attack.',
  3: 'Moonbells are ready. Build one beside an attacking tower to slow enemies.',
  4: 'Tap a tower to upgrade its damage or range.',
  5: 'Shellbacks arrive. The Lower Lock is ready: the mill cracks armour, but its route is shorter.',
  6: 'Tap a + to buy more building space. Owls and Glow Gardens are now available.',
  7: 'Lighthouses are ready. Heavy beams help against large, armoured Mopes.',
  8: 'Hidden enemies arrive. Build an Owl near your towers or use the bridge route.',
  10: 'Gloomtoad can jam a nearby lock. Plan your coverage before it arrives.',
  11: 'Enemies now enter from the side too. Two more building plots are available.',
  13: 'Use a Moonbell to slow groups where a Cracker can hit them.',
  16: 'Level 4 upgrades are ready. Use an Owl beside an armour-breaking tower against Veiled Shells.',
  21: 'The last two building plots are available. Keep upgrading your towers.',
  25: 'Old Gloom splits at the Lower Lock. Cover both branches. Your watch continues after this battle.',
  26: 'Level 5 upgrades are ready. Skiffs speed up when their armour breaks. Use Moonbells to slow them.',
  30: 'The Warden calls four escorts. Defeat them to remove its shield.',
  31: 'Reedlings grow a shell at the central meeting point. Catch them early, or prepare heavy hits downstream.',
  35: 'Five waves left. Prepare for large groups of armoured enemies.',
  40: 'Bloomheart heals enemies inside its ring. Defeat them before the timer ends.',
}

/** Stable authored groups, with later entrance schedules varied by layout. Restore uses the same indices. */
export function compactWave(n: number, variant: number, seed: number): WaveDef {
  if (n > COMPACT_END) return freeplayWave(n - COMPACT_END + 16, seed)
  let base: WaveDef
  if (n <= 25) base = WAVES[n - 1]
  else if (n <= 30) base = HARBOUR_WAVES_V2[[0, 2, 4, 6, 7][n - 26]]
  else base = GARDENS_WAVES[[1, 0, 2, 3, 4, 2, 3, 4, 2, 5][n - 31]]
  const groups = base.groups.map((g, i) => ({ ...g,
    // Garden waves were designed for 26 plots and a much longer route.
    count: n > 30 && g.count > 1 ? Math.ceil(g.count * (n < 36 ? .48 : .6)) : g.count,
    src: n > 11 && variant === 1 && i % 2 === 1 ? (g.src === 'west' ? 'north' : 'west') as 'north' | 'west' : g.src,
    at: g.at + (n > 11 && variant === 2 && i > 0 ? i * 1.2 : 0),
  }))
  return { groups, note: NOTES[n] }
}

export const REFINEMENTS = [
  { wave: 16, cost: 700, name: 'Level 4' },
  { wave: 26, cost: 1250, name: 'Level 5' },
] as const
export function refinementHelp(id: TowerId) {
  return id === 'beam' ? '+20% beam damage and +8% reach per rank.' : id === 'garden' ? '+20% wave income and +8% reach per rank.'
    : id === 'bell' ? '15% less time between tolls, +8% reach and +10% slow duration per rank.'
      : id === 'owl' ? '+20% damage, 15% less time between shots and +8% sight range per rank.'
        : '+20% damage, 15% less time between attacks and +8% reach per rank.'
}
export function refineStats(stats: TowerStats, rank: number) {
  stats.damage *= 1 + rank * .2
  stats.interval *= .85 ** rank
  stats.range *= 1 + rank * .08
  stats.slowDur *= 1 + rank * .1
  stats.income = Math.round(stats.income * (1 + rank * .2))
}

export function compactNext(wave: number): string {
  const next = [
    [5, 'After wave 5 · 2 new plots'], [10, 'After wave 10 · side inlet + 2 plots'],
    [15, 'After wave 15 · level 4 + 2 plots'], [20, 'After wave 20 · final 2 plots'],
    [25, 'After wave 25 · level 5 + Skiffs'], [30, 'Wave 30 · the Warden'],
    [35, 'Wave 35 · armoured crowds'], [40, 'Wave 40 · Bloomheart'],
  ] as const
  return next.find(([at]) => wave < at)?.[1] ?? 'Defeat Bloomheart to win'
}
