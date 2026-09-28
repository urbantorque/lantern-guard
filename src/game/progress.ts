import type { WaterwayId } from './waterways'
import { activeSlot, decodeRun, encodeRun, slotKeys, type RunSlot, readRun, storeRun, validSnapshot, setSaveHealth, storageChanged } from './save-store'
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

export function loadRun(slot: RunSlot = activeSlot()): SaveSnapshot | null {
  const run = readRun(undefined, slot)
  if (run) return run.snapshot
  if (slot === 'challenge') return null
  try {
    // A damaged new save must never silently restore an unrelated legacy night.
    if (slotKeys(slot).some(key => localStorage.getItem(key))) return null
    const raw = localStorage.getItem(KEY_SAVE)
    if (!raw) return null
    const snap: unknown = JSON.parse(raw)
    if (validSnapshot(snap)) return snap
    setSaveHealth('invalid')
  } catch { setSaveHealth('unavailable') }
  return null
}

export function clearRun(slot: RunSlot = activeSlot()) {
  try {
    const extra = slot === 'campaign' ? [KEY_SAVE, KEY_BLOOMS, KEY_CREDIT, CHECKPOINT_KEY] : ['lanternlocks.challenge-credit.v1']
    for (const key of [...slotKeys(slot), ...extra]) localStorage.removeItem(key)
    setSaveHealth('ready')
    storageChanged()
  } catch { setSaveHealth('unavailable') }
}

/** Kept for migration of the original separate bloom save. New saves are atomic. */
export function saveBlooms(data: number[]) { write(KEY_BLOOMS, { d: data }) }
export function loadBlooms(slot: RunSlot = activeSlot()): number[] {
  const run = readRun(undefined, slot)
  if (run) return run.blooms
  if (slot === 'challenge') return []
  const data = read<{ d: number[] }>(KEY_BLOOMS, { d: [] }).d
  return Array.isArray(data) && data.every(Number.isFinite) ? data : []
}

const CHECKPOINT_KEY = 'lanternlocks.planning-checkpoint.v1'
export function canRetry(sim: Sim): boolean {
  return !!sim.challenge.guard && !sim.isChallenge && sim.difficulty !== 'nightfall' && !sim.freeplay
}
export function saveCheckpoint(sim: Sim, blooms: number[]) {
  if (!canRetry(sim) || sim.waveActive || sim.over) return
  try { localStorage.setItem(CHECKPOINT_KEY, encodeRun(sim.snapshot(), blooms)); storageChanged() } catch { setSaveHealth('unavailable') }
}
export function loadCheckpoint() {
  try { return decodeRun(localStorage.getItem(CHECKPOINT_KEY)) } catch { return null }
}

// ------------------------------------------------------------------ settings

export interface Settings {
  guardian?: 'ember' | 'reed' | 'tide'
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
  if (!['ember', 'reed', 'tide'].includes(String(s.guardian))) delete s.guardian
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
  tutorialDone?: boolean
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
  watchIndex?: number
  compactWins?: number
  settlement?: number
  gardensWins?: number
  harbourWins?: number
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
  // Existing accomplishments also restore the settlement for returning players.
  const best = Math.max(0, ...Object.values(p.best).map(n => n ?? 0))
  p.settlement = Math.max(p.settlement ?? 0, p.gardensWins ? 4 : p.harbourWins ? 3 : best >= 12 || p.feats.reedkeeper ? 2 : best >= 6 ? 1 : 0)
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
  compact?: 1
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
  { id: 'groundskeeper', name: 'Groundskeeper', desc: 'Buy 3 building plots in one game.', test: r => (r.stats.plotsUnlocked ?? 0) >= 3 },
  { id: 'reedkeeper', name: 'Canal Keeper', desc: 'Complete the game with light remaining.', test: r => r.won && (r.compact === 1 || r.expanding === 1 || r.waterway === 'reedbank') },
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
  { id: 'crowned', name: 'Crowned', desc: 'Buy a level 3 tower upgrade.', test: (r) => r.stats.maxTier >= 3 },
]

export const RESTORATIONS = [
  { wave: 5, name: 'Windows aglow', reward: 'The canal homes light up.', next: 'Hold wave 5 to light the canal homes.' },
  { wave: 11, name: 'Neighbours return', reward: 'The west footbridge is repaired and villagers return.', next: 'Hold wave 11 to restore the west footbridge.' },
  { wave: 33, name: 'Lantern flotilla', reward: 'The harbour docks reopen with lantern boats.', next: 'Defeat the Harbour Warden to reopen the docks.' },
  { wave: 39, name: 'Gardens in bloom', reward: 'Water lilies return to the garden pools.', next: 'Defeat Bloomheart to restore the water lilies.' },
]
export const restorationPreview = (p: Progress) => RESTORATIONS[p.settlement ?? 0]?.next ?? 'Your settlement is fully restored.'

/** Monotonic unlocks: retries, resumes and chapter changes cannot revoke or double-award them. */
export function creditMilestones(sim: Sim): { feats: string[]; restorations: string[] } {
  const earned = { feats: [] as string[], restorations: [] as string[] }
  if (!sim.challenge.guard || sim.isChallenge) return earned
  const p = loadProgress()
  const tests: Record<string, boolean> = { groundskeeper: !!sim.challenge.compact && (sim.stats.plotsUnlocked ?? 0) >= 3, crowned: sim.stats.maxTier >= 3, 'full-bloom': sim.stats.pops >= 1200, 'early-bird': sim.stats.earlyCalls >= 10 }
  for (const [id, passed] of Object.entries(tests)) if (passed && !p.feats[id]) { p.feats[id] = true; earned.feats.push(id) }
  const held = Math.min(sim.wave - (sim.over === 'lost' || sim.waveActive ? 1 : 0), ...[...sim.wavesPending].map(w => w - 1))
  for (let i = p.settlement ?? 0; i < RESTORATIONS.length; i++) {
    const r = RESTORATIONS[i]
    const target = sim.challenge.compact ? [5, 10, 30, 40][i] : r.wave
    if (held < target || (!sim.challenge.compact && ((i >= 2 && !sim.challenge.harbour) || (i >= 3 && !sim.challenge.gardens)))) break
    p.settlement = i + 1; earned.restorations.push(r.reward)
  }
  if (earned.feats.length || earned.restorations.length) saveProgress(p)
  return earned
}

/** Only one optional goal is surfaced; early onboarding stays focused on the board. */
export function masteryGoal(sim: Sim, p: Progress): string | null {
  if (!sim.challenge.guard || sim.isChallenge || sim.wave < 6) return null
  if (sim.challenge.compact && !p.feats.groundskeeper) return `Unlock Tide Keeper · Buy plots: ${Math.min(3, sim.stats.plotsUnlocked ?? 0)}/3`
  if (!p.feats.crowned) return 'Unlock Ember Keeper · Buy a level 3 upgrade'
  if (!p.feats['full-bloom']) return `Unlock Reed Keeper · Defeat enemies: ${Math.min(1200, sim.stats.pops)}/1,200`
  if (!p.feats['early-bird'] && !sim.challenge.harbour && !sim.challenge.compact) return `Optional · Early Bird: ${Math.min(10, sim.stats.earlyCalls)}/10 early calls → village bunting`
  return null
}

/** Free play after a win only extends a finished run: record the best free-play wave, nothing else. */
export function recordFreeplay(sim: Sim) {
  const p = loadProgress()
  p.bestFreeplay[sim.difficulty] = Math.max(p.bestFreeplay[sim.difficulty] ?? 0, sim.wave - (sim.freeplayFrom || 25))
  saveProgress(p)
}

/**
 * Adds the Mopes cheered since the last credit to the bloom journal. The credited tally is kept beside the
 * run save (and cleared with it), so a resumed run never counts a Mope twice.
 */
export function creditJournal(cheered: Partial<Record<EnemyId, number>>) {
  const key = activeSlot() === 'campaign' ? KEY_CREDIT : 'lanternlocks.challenge-credit.v1'
  const credited = read<{ c: Partial<Record<EnemyId, number>> }>(key, { c: {} }).c
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
  // A retry can rewind counts. Keep a high-water mark for each kind across attempts.
  write(key, { c: Object.fromEntries(Object.keys({ ...credited, ...cheered }).map(id => [id, Math.max(credited[id as EnemyId] ?? 0, cheered[id as EnemyId] ?? 0)])) })
}

/** Records a finished plain night once; returns feats newly earned. Challenges keep their own log (recordChallenge). */
export function recordRun(sim: Sim, blooms: number): string[] {
  const p = loadProgress()
  if (sim.challenge.harbour) {
    if (sim.won && sim.challenge.gardens) p.gardensWins = (p.gardensWins ?? 0) + 1
    else if (sim.won) p.harbourWins = (p.harbourWins ?? 0) + 1
    saveProgress(p)
    return []
  }
  if (sim.challenge.compact && sim.won) p.compactWins = (p.compactWins ?? 0) + 1
  const summary: RunSummary = {
    compact: sim.challenge.compact,
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
  { id: 'reed', name: 'Reed lanterns', desc: 'Slender reeds tipped with warm lantern seeds.', unlock: 'Complete the main game.', earned: p => !!p.feats.reedkeeper },
  { id: 'moon', name: 'Moonpetals', desc: "Pale silver petals that keep a hint of each Mope's colour.", unlock: 'Win a night on Nightfall.', earned: (p) => (p.wins.nightfall ?? 0) > 0 },
]

// ------------------------------------------------------------------ playtest metrics

export interface Session {
  rules?: 'guard' | 'legacy'
  routePlans?: number
  retries?: number
  lastLeak?: string
  harbour?: boolean
  gardens?: boolean
  guardian?: 'lantern' | 'ember' | 'reed' | 'tide'
  event?: 'resume'
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
    rules: sim.challenge.guard ? 'guard' : 'legacy',
    routePlans: sim.stats.routePlans ?? 0,
    retries: sim.stats.retries ?? 0,
    lastLeak: sim.lastLeak?.enemy,
    harbour: !!sim.challenge.harbour,
    gardens: !!sim.challenge.gardens,
    guardian: sim.challenge.guardian ?? 'lantern',
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

export function recordResume(sim: Sim) {
  const m = loadMetrics()
  m.sessions.push({ at: new Date().toISOString(), difficulty: sim.difficulty, challenge: sim.challenge.id, result: 'resumed', event: 'resume', resumed: true, rules: sim.challenge.guard ? 'guard' : 'legacy', wave: sim.wave, firstBuildSec: -1, firstFlipWave: -1, flips: sim.stats.flips, leaked: sim.stats.leaked, minutes: 0, towers: [...sim.stats.towersUsed] })
  m.sessions = m.sessions.slice(-50)
  write(KEY_METRICS, m)
}
