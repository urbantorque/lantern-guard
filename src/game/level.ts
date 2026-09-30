import type { Vec } from '../core/math'
import { Polyline } from '../core/path'

export const WORLD_W = 720
export const WORLD_H = 940

export type NextRef = { seg: string } | { gate: string } | { home: true }

export interface SegmentDef {
  id: string
  pts: Vec[]
  /** Neighbouring route points preserve the tangent across fixed canal joins. */
  curve?: { before?:Vec; after?:Vec }
  next: NextRef
  /** Glow multiplier for Mopes cheered up on this channel (rich channels; Mopes that took one leak double light). */
  bonus?: number
  /** A landmark partway along the channel that acts on passing Mopes. */
  feature?: { kind: 'reveal' | 'crack'; at: number; name: string }
}

export interface GateDef {
  id: string
  name: string
  x: number
  y: number
  outs: [string, string]
  unlockWave: number
  /** Player-facing names for each branch. */
  labels: [string, string]
  /** One-line explanation of what each branch offers. */
  blurbs: [string, string]
  /** The branch a locked gate is stuck on. */
  lockedDir: 0 | 1
}

export interface SourceDef {
  id: string
  seg: string
  openWave: number
  name: string
}

export interface LevelDef {
  name: string
  /** Camera bounds for a revealed section of a growing canal. */
  bounds?: { x: number; y: number; w: number; h: number }
  segments: SegmentDef[]
  gates: GateDef[]
  sources: SourceDef[]
  pads: Vec[]
  home: Vec
}

/**
 * Wickwater Canal. At each lock one channel is a long, safe loop (more time
 * under your keepers) and the other a short run that pays double glow, costs
 * double light if a Mope escapes after taking it, and has a trick: the Lantern
 * bridge reveals Veils, the Mill wheel cracks shells.
 * Sorting each group of Mopes to the right channel is the heart of the level. From wave 11 the West Sluice opens and feeds the
 * middle channel directly, skipping the Upper Lock.
 */
export const LEVEL: LevelDef = {
  name: 'Wickwater Canal',
  segments: [
    { id: 'n0', pts: [{ x: 360, y: -40 }, { x: 366, y: 40 }, { x: 360, y: 120 }], next: { gate: 'upper' } },
    {
      id: 'w1',
      pts: [{ x: 360, y: 120 }, { x: 272, y: 140 }, { x: 170, y: 160 }, { x: 88, y: 222 }, { x: 70, y: 302 }, { x: 118, y: 372 }, { x: 200, y: 394 }, { x: 262, y: 430 }, { x: 360, y: 470 }],
      next: { seg: 'm1' },
    },
    {
      id: 'e1',
      pts: [{ x: 360, y: 120 }, { x: 470, y: 170 }, { x: 524, y: 272 }, { x: 474, y: 382 }, { x: 360, y: 470 }],
      next: { seg: 'm1' },
      bonus: 2,
      feature: { kind: 'reveal', at: 230, name: 'Lantern bridge' },
    },
    { id: 'm1', pts: [{ x: 360, y: 470 }, { x: 357, y: 510 }, { x: 360, y: 548 }], next: { gate: 'lower' } },
    {
      id: 'w2',
      pts: [{ x: 360, y: 548 }, { x: 262, y: 576 }, { x: 200, y: 642 }, { x: 214, y: 722 }, { x: 280, y: 774 }, { x: 360, y: 792 }],
      next: { seg: 'h' },
      bonus: 2,
      feature: { kind: 'crack', at: 200, name: 'Mill wheel' },
    },
    {
      id: 'e2',
      pts: [{ x: 360, y: 548 }, { x: 470, y: 566 }, { x: 600, y: 600 }, { x: 660, y: 682 }, { x: 640, y: 770 }, { x: 560, y: 820 }, { x: 460, y: 814 }, { x: 360, y: 792 }],
      next: { seg: 'h' },
    },
    { id: 'h', pts: [{ x: 360, y: 792 }, { x: 362, y: 836 }, { x: 360, y: 878 }], next: { home: true } },
    {
      id: 'inlet',
      pts: [{ x: -40, y: 508 }, { x: 70, y: 502 }, { x: 190, y: 490 }, { x: 290, y: 480 }, { x: 360, y: 470 }],
      next: { seg: 'm1' },
    },
  ],
  gates: [
    { id: 'upper', name: 'Upper Lock', x: 360, y: 120, outs: ['w1', 'e1'], labels: ['West loop', 'Lantern run'], blurbs: ['Long and safe: more time under your keepers.', 'Short and rich: double glow, but escapees cost double light. Its bridge reveals Veils.'], unlockWave: 2, lockedDir: 0 },
    { id: 'lower', name: 'Lower Lock', x: 360, y: 548, outs: ['w2', 'e2'], labels: ['Mill run', 'East loop'], blurbs: ['Short and rich: double glow, but escapees cost double light. Its wheel cracks shells.', 'Long and safe: more time under your keepers.'], unlockWave: 4, lockedDir: 1 },
  ],
  sources: [
    { id: 'north', seg: 'n0', openWave: 1, name: 'North Spring' },
    { id: 'west', seg: 'inlet', openWave: 11, name: 'West Sluice' },
  ],
  pads: [
    // 0-1 either side of the spring, covering the trunk and both lock mouths
    { x: 252, y: 62 },
    { x: 470, y: 62 },
    // 2-5 inside the upper loop: each reaches both branches
    { x: 168, y: 288 },
    { x: 300, y: 224 },
    { x: 404, y: 290 },
    { x: 300, y: 352 },
    // 6 far west (west loop + sluice), 7 far east (east run)
    { x: 36, y: 424 },
    { x: 604, y: 300 },
    // 8 middle right, 9 middle left (sluice + short west run)
    { x: 540, y: 478 },
    { x: 172, y: 560 },
    // 10-13 inside the lower split
    { x: 290, y: 688 },
    { x: 424, y: 640 },
    { x: 566, y: 704 },
    { x: 440, y: 744 },
    // 14 outer west, 15 outer east
    { x: 128, y: 690 },
    { x: 686, y: 560 },
    // 16-17 by the Great Lantern
    { x: 250, y: 852 },
    { x: 470, y: 852 },
  ],
  home: { x: 360, y: 890 },
}

export interface Segment {
  id: string
  line: Polyline
  next: NextRef
  toHome: number
  bonus: number
  feature: SegmentDef['feature'] | null
}

export interface BuiltLevel {
  def: LevelDef
  segs: Map<string, Segment>
}

export function buildLevel(def: LevelDef): BuiltLevel {
  const segs = new Map<string, Segment>()
  for (const s of def.segments) segs.set(s.id, { id: s.id, line: new Polyline(s.pts,s.curve?32:14,s.curve), next: s.next, toHome: 0, bonus: s.bonus ?? 1, feature: s.feature ?? null })
  return { def, segs }
}
