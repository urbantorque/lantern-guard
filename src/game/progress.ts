import type { WaterwayId } from './waterways'
import { BACKUP_KEY, RUN_KEY, readRun, storeRun, validSnapshot, setSaveHealth, storageChanged } from './save-store'
import type { Difficulty, EnemyId, TowerId } from './defs'
import type { RunStats, SaveSnapshot, Sim } from './sim'

const KEY_SAVE = 'lanternlocks.save.v1'
const KEY_PROGRESS = 'lanternlocks.progress.v1'
const KEY_SETTINGS = 'lanternlocks.settings.v1'
const KEY_COACH = 'lanternlocks.coach.v1'
const KEY_METRICS = 'lanternlocks.metrics.v1'
const KEY_BLOOMS = 'lanternlocks.blooms.v1'
const KEY_CREDIT = 'lanternlocks.journal-credit.v1'
const KEY_CHALLENGES = 'lanternlocks.challenges.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
    storageChanged()
  } catch {
    /* private mode or full: the game still plays, it just won't remember */
  }
}

// ------------------------------------------------------------------ run save

export function saveRun(snap: SaveSnapshot, blooms: number[] = []) {
  return storeRun(snap, blooms)
}

export function loadRun(): SaveSnapshot | null {
  const run = readRun()
  if (run) return run.snapshot
  try {
    // A damaged new save must never silently restore an unrelated legacy night.
    if (localStorage.getItem(RUN_KEY) || localStorage.getItem(BACKUP_KEY)) return null
    const raw = localStorage.getItem(KEY_SAVE)
    if (!raw) return null
    const snap: unknown = JSON.parse(raw)
    if (validSnapshot(snap)) return snap
    setSaveHealth('invalid')
  } catch { setSaveHealth('unavailable') }
  return null
}

export function clearRun() {
  try {
    for (const key of [RUN_KEY, BACKUP_KEY, KEY_SAVE, KEY_BLOOMS, KEY_CREDIT]) localStorage.removeItem(key)
    setSaveHealth('ready')
    storageChanged()
  } catch { setSaveHealth('unavailable') }
}

/** Kept for migration of the original separate bloom save. New saves are atomic. */
export function saveBlooms(data: number[]) { write(KEY_BLOOMS, { d: data }) }
export function loadBlooms(): number[] {
  const run = readRun()
  if (run) return run.blooms
  const data = read<{ d: number[] }>(KEY_BLOOMS, { d: [] }).d
  return Array.isArray(data) && data.every(Number.isFinite) ? data : []
}

// ------------------------------------------------------------------ settings

export interface Settings {
  sfx: number
  music: number
  ambience: number
  muted: boolean
  calmFx: boolean
  /** null follows the system Reduce Motion setting. */
  reduceMotion: boolean | null
  shake: boolean
  haptics: boolean
  autoStart: boolean
  /** 'clear' swaps the family colours for a set that stays distinct with colour-vision differences. */
  palette: 'standard' | 'clear'
  /** 'left' mirrors the dock so the wave button and charms sit under the left thumb. */
  hand: 'right' | 'left'
  /** Larger text in menus, sheets, messages and on the map. */
  bigText: boolean
  /** Time eases to half speed while Mopes reach a lock the player can flip. */
  lockAssist: boolean
  /** The bloom set the banks flower in (see BLOOM_SETS). */
  bloomSet: string
  /** Playtests: the first-flip hint can be turned off to measure unprompted flips. */
  flipHint: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  sfx: 0.8,
  music: 0.45,
  ambience: 0.6,
  muted: false,
  calmFx: false,
  reduceMotion: null,
  shake: true,
  haptics: true,
  autoStart: false,
  palette: 'standard',
  hand: 'right',
  bigText: false,
  lockAssist: false,
  bloomSet: 'wild',
  flipHint: true,
}

export function loadSettings(): Settings {
  const s = read<Settings & { v?: number }>(KEY_SETTINGS, { ...DEFAULT_SETTINGS, v: 2 })
  // v1 stored the device's Reduce Motion as a fixed choice; go back to following the device once
  if (s.v !== 2) {
    s.reduceMotion = null
    s.v = 2
  }
  return s
}
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, { ...s, v: 2 })

// ------------------------------------------------------------------ coaching

export interface Coach {
  routesSeen?: boolean
  built: boolean
  started: boolean
  flipped: boolean
  upgraded: boolean
  charmSeen: boolean
}
export const loadCoach = () => read<Coach>(KEY_COACH, { built: false, started: false, flipped: false, upgraded: false, charmSeen: false })
export const saveCoach = (c: Coach) => write(KEY_COACH, c)

// ------------------------------------------------------------------ progress + feats

export interface Progress {
  waterways: Partial<Record<WaterwayId, { wins: Partial<Record<Difficulty, number>>; best: Partial<Record<Difficulty, number>> }>>
  wins: Partial<Record<Difficulty, number>>
  best: Partial<Record<Difficulty, number>>
  feats: Record<string, boolean>
  runs: number
  bloomsTotal: number
  bestFreeplay: Partial<Record<Difficulty, number>>
  /** Bloom journal: Mopes cheered up over every night, by kind. */
  journal: Partial<Record<EnemyId, number>>
}

export function loadProgress(): Progress {
  const p = read<Progress>(KEY_PROGRESS, { waterways: {}, wins: {}, best: {}, feats: {}, runs: 0, bloomsTotal: 0, bestFreeplay: {}, journal: {} })
  p.waterways ??= {}
  p.waterways.wickwater ??= { wins: { ...p.wins }, best: { ...p.best } }
  return p
}
export const saveProgress = (p: Progress) => write(KEY_PROGRESS, p)

export interface Feat {
  id: string
  name: string
  desc: string
  test: (r: RunSummary) => boolean
}

export interface RunSummary {
  expanding?: 1
  waterway?: WaterwayId
  won: boolean
  difficulty: Difficulty
  stats: RunStats
  lives: number
  maxLives: number
  wave: number
  towerTypes: TowerId[]
}

export const FEATS: Feat[] = [
  { id: 'reedkeeper', name: 'Canal Keeper', desc: 'Keep the lantern lit through all 25 waves of the growing canal.', test: r => r.won && (r.expanding === 1 || r.waterway === 'reedbank') },
  { id: 'first-light', name: 'First Light', desc: 'Win on any mode.', test: (r) => r.won },
  { id: 'lamplighter', name: 'Lamplighter', desc: 'Win on Standard.', test: (r) => r.won && r.difficulty !== 'relaxed' },
  { id: 'long-night', name: 'Long Night', desc: 'Win on Nightfall.', test: (r) => r.won && r.difficulty === 'nightfall' },
  { id: 'unflickering', name: 'Unflickering', desc: 'Win without losing any light.', test: (r) => r.won && r.stats.leaked === 0 },
  { id: 'lockkeeper', name: 'Lockkeeper', desc: 'Win with 40 or more gate flips.', test: (r) => r.won && r.stats.flips >= 40 },
  { id: 'hands-off', name: 'Hands Off', desc: 'Win with 3 or fewer gate flips.', test: (r) => r.won && r.stats.flips <= 3 },
  { id: 'trio', name: 'Trio', desc: 'Win using only three kinds of keeper.', test: (r) => r.won && r.towerTypes.length <= 3 },
  { id: 'no-gardens', name: 'Lean Lanterns', desc: 'Win without building a Glow Garden.', test: (r) => r.won && !r.towerTypes.includes('garden') },
  { id: 'early-bird', name: 'Early Bird', desc: 'Call 10 waves early in one run.', test: (r) => r.stats.earlyCalls >= 10 },
  { id: 'full-bloom', name: 'Full Bloom', desc: 'Cheer up 1,200 Mopes in one run.', test: (r) => r.stats.pops >= 1200 },
  { id: 'crowned', name: 'Crowned', desc: 'Buy any tier-three upgrade.', test: (r) => r.stats.maxTier >= 3 },
]

/** Free play after a win only extends a finished run: record the best free-play wave, nothing else. */
export function recordFreeplay(sim: Sim) {
  const p = loadProgress()
  p.bestFreeplay[sim.difficulty] = Math.max(p.bestFreeplay[sim.difficulty] ?? 0, sim.wave - 25)
  saveProgress(p)
}

/**
 * Adds the Mopes cheered since the last credit to the bloom journal. The credited tally is kept beside the
 * run save (and cleared with it), so a resumed run never counts a Mope twice.
 */
export function creditJournal(cheered: Partial<Record<EnemyId, number>>) {
  const credited = read<{ c: Partial<Record<EnemyId, number>> }>(KEY_CREDIT, { c: {} }).c
  const p = loadProgress()
  let changed = false
  for (const [id, n] of Object.entries(cheered) as [EnemyId, number][]) {
    const d = n - (credited[id] ?? 0)
    if (d <= 0) continue
    p.journal[id] = (p.journal[id] ?? 0) + d
    changed = true
  }
  if (!changed) return
  saveProgress(p)
  write(KEY_CREDIT, { c: { ...cheered } })
}

/** Records a finished plain night once; returns feats newly earned. Challenges keep their own log (recordChallenge). */
export function recordRun(sim: Sim, blooms: number): string[] {
  const p = loadProgress()
  const summary: RunSummary = {
    expanding: sim.challenge.expanding,
    waterway: sim.challenge.waterway,
    won: sim.won,
    difficulty: sim.difficulty,
    stats: sim.stats,
    lives: sim.lives,
    maxLives: sim.maxLives,
    wave: sim.wave,
    towerTypes: sim.stats.towersUsed,
  }
  const waterway = sim.challenge.waterway ?? 'wickwater'
  const map = p.waterways[waterway] ??= { wins: {}, best: {} }
  map.best[sim.difficulty] = Math.max(map.best[sim.difficulty] ?? 0, sim.wave)
  if (sim.won) map.wins[sim.difficulty] = (map.wins[sim.difficulty] ?? 0) + 1
  p.runs++
  p.bloomsTotal += blooms
  p.best[sim.difficulty] = Math.max(p.best[sim.difficulty] ?? 0, sim.wave)
  if (sim.won) p.wins[sim.difficulty] = (p.wins[sim.difficulty] ?? 0) + 1
  const fresh: string[] = []
  for (const f of FEATS) {
    if (!p.feats[f.id] && f.test(summary)) {
      p.feats[f.id] = true
      fresh.push(f.id)
    }
  }
  saveProgress(p)
  return fresh
}

// ------------------------------------------------------------------ daily tides and weekly nights

export interface ChallengeResult {
  won: boolean
  /** Light left at the end (0 when the lantern went out). */
  light: number
  maxLight: number
  /** Waves held (tide waves on a daily tide). */
  held: number
  waves: number
  flips: number
  /** Finished attempts, wins and losses. */
  tries: number
  at: string
}

export const loadChallenges = () => read<Record<string, ChallengeResult>>(KEY_CHALLENGES, {})

/** The better of two results: a kept lantern first, then more light, then more waves held. */
const better = (a: ChallengeResult, b: ChallengeResult) => (a.won !== b.won ? a.won : a.light !== b.light ? a.light > b.light : a.held > b.held)

/** Records a finished challenge; returns its best result so far and whether this attempt set it. */
export function recordChallenge(sim: Sim, final: number): { best: ChallengeResult; improved: boolean } {
  const id = sim.challenge.id!
  const all = loadChallenges()
  const prev = all[id]
  const off = sim.waveOffset
  // the wave the lantern went out on was not held
  const held = Math.max(0, sim.wave - off - (sim.over === 'lost' ? 1 : 0))
  const now: ChallengeResult = { won: sim.won, light: sim.lives, maxLight: sim.maxLives, held, waves: final - off, flips: sim.stats.flips, tries: (prev?.tries ?? 0) + 1, at: new Date().toISOString() }
  const improved = !prev || better(now, prev)
  const best = improved ? now : { ...prev, tries: now.tries }
  all[id] = best
  // keep the log small: the 60 most recent challenges
  const keys = Object.keys(all).sort((a, b) => (all[a].at < all[b].at ? -1 : 1))
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete all[k]
  write(KEY_CHALLENGES, all)
  return { best, improved }
}

// ------------------------------------------------------------------ bloom sets

export interface BloomSet {
  id: string
  name: string
  desc: string
  /** How it is earned, shown while locked. */
  unlock: string
  earned: (p: Progress, challenges: Record<string, ChallengeResult>) => boolean
}

export const journalTotal = (p: Progress) => Object.values(p.journal ?? {}).reduce((a, b) => a + (b ?? 0), 0)
export const tidesKept = (c: Record<string, ChallengeResult>) => Object.entries(c).filter(([k, r]) => k.startsWith('daily:') && r.won).length

/** What cheered Mopes turn into on the banks. Earned by play, never bought. */
export const BLOOM_SETS: BloomSet[] = [
  { id: 'wild', name: 'Wildflowers', desc: 'Each bloom wears the colour of the Mope it came from.', unlock: '', earned: () => true },
  { id: 'lily', name: 'Lantern lilies', desc: "Pointed lilies in lantern gold, each with a heart in its Mope's colour.", unlock: 'Win a night on Standard.', earned: (p) => (p.wins.standard ?? 0) + (p.wins.nightfall ?? 0) > 0 },
  { id: 'pearl', name: 'Tide pearls', desc: 'Clusters of sea-glass beads in blues and greens.', unlock: 'Keep the lantern lit through 3 daily tides.', earned: (_p, c) => tidesKept(c) >= 3 },
  { id: 'moss', name: 'Starmoss', desc: 'Soft moss dotted with tiny star flowers.', unlock: 'Cheer up 5,000 Mopes in all.', earned: (p) => journalTotal(p) >= 5000 },
  { id: 'reed', name: 'Reed lanterns', desc: 'Slender reeds tipped with warm lantern seeds.', unlock: 'Win all 25 waves of the growing canal.', earned: p => !!p.feats.reedkeeper },
  { id: 'moon', name: 'Moonpetals', desc: "Pale silver petals that keep a hint of each Mope's colour.", unlock: 'Win a night on Nightfall.', earned: (p) => (p.wins.nightfall ?? 0) > 0 },
]

// ------------------------------------------------------------------ playtest metrics

export interface Session {
  at: string
  difficulty: Difficulty
  /** Challenge record key, when the run was a daily tide or weekly night. */
  challenge?: string
  /** won, lost, freeplay-end, or abandoned (restarted or replaced before the end). */
  result: string
  wave: number
  firstBuildSec: number
  firstFlipWave: number
  /** Whether the first-flip hint was on (off for unprompted-flip playtests). Older sessions: undefined. */
  flipHint?: boolean
  flips: number
  leaked: number
  lightLeft?: number
  maxLight?: number
  minutes: number
  /** Minutes with a wave on the water. */
  activeMinutes?: number
  /** Real seconds this sitting spent paused, and at 2x or 3x (a resumed run counts only its last sitting). */
  pausedSec?: number
  fastSec?: number
  resumed?: boolean
  towers: TowerId[]
  /** Accessibility and assist options in use. */
  options?: string[]
}

export interface Metrics {
  sessions: Session[]
}

/** Per-sitting facts only the app knows. */
export interface SessionExtras {
  flipHint: boolean
  pausedSec: number
  fastSec: number
  resumed: boolean
  options: string[]
}

export function recordMetrics(sim: Sim, result: string, extra?: SessionExtras) {
  const m = read<Metrics>(KEY_METRICS, { sessions: [] })
  m.sessions.push({
    at: new Date().toISOString(),
    difficulty: sim.difficulty,
    challenge: sim.challenge.id,
    result,
    wave: sim.wave,
    firstBuildSec: Math.round(sim.stats.firstBuildAt),
    firstFlipWave: sim.stats.firstFlipWave,
    flipHint: extra?.flipHint,
    flips: sim.stats.flips,
    leaked: sim.stats.leaked,
    lightLeft: sim.lives,
    maxLight: sim.maxLives,
    minutes: Math.round((sim.stats.time / 60) * 10) / 10,
    activeMinutes: Math.round((sim.stats.activeTime / 60) * 10) / 10,
    pausedSec: extra && Math.round(extra.pausedSec),
    fastSec: extra && Math.round(extra.fastSec),
    resumed: extra?.resumed,
    towers: sim.stats.towersUsed,
    options: extra?.options,
  })
  m.sessions = m.sessions.slice(-50)
  write(KEY_METRICS, m)
  return m
}

export function clearMetrics() {
  try {
    localStorage.removeItem(KEY_METRICS)
  } catch {
    /* ignore */
  }
}

export const loadMetrics = () => read<Metrics>(KEY_METRICS, { sessions: [] })
