/**
 * Tides: seeded challenges on Wickwater Canal.
 *
 * The daily tide opens after wave TIDE_FROM with a bank of glow and plays a
 * remix of the rest of the night. Each remixed wave spends the same glow
 * budget as the wave it replaces (so the economy and threat curve hold), keeps
 * the canonical boss schedule, and draws its crowds from the same patterns the
 * handmade late waves use: sortable clumps, charm-friendly interleaves,
 * streams and swarms. A featured Mope, a twist and a rule give each day its
 * character. The weekly night is the whole canonical night under one rule.
 *
 * Everything here is pure and deterministic: a tide's waves come from its
 * spec alone, so saves (which carry the spec in the challenge) restore exactly.
 */
import { ENEMIES, TOWERS, type EnemyId, type TowerId } from './defs'
import type { Challenge } from './sim'
import { WAVES, type Group, type Source, type WaveDef } from './waves'
import { WATCH_NAMES } from './compact'

/** The daily tide takes over after this wave: waves 15 to 25. */
export const TIDE_FROM = 14
/** Glow to build with before the first tide wave: a little more than a good player has invested by wave 14, since it all arrives at once. */
export const TIDE_GLOW = 4700

export type Twist = 'none' | 'swift' | 'thick' | 'tidal' | 'sluice'
export type Rule = 'none' | 'noCharms' | 'trio' | 'noGarden' | 'fixed' | 'lean'

export interface TideSpec {
  seed: number
  /** Waves 1..from are skipped; the tide plays from+1 to the final wave. */
  from: number
  /** Glow to spend before the first tide wave. */
  glow: number
  /** Share of each crowd that comes through the West Sluice. */
  west: number
  /** This Mope turns up far more often than usual. */
  feature: EnemyId
}

/** A challenge as offered on the Tides screen. */
export interface ChallengeOffer {
  kind: 'daily' | 'weekly'
  /** Record key: 'daily:2026-09-27' or 'weekly:2026-W39'. */
  id: string
  name: string
  /** Short date label, e.g. 'Sat 27 Sep' or 'week of 21 Sep' (capitalise it at the start of a sentence). */
  when: string
  twist: Twist
  rule: Rule
  keepers?: TowerId[]
  challenge: Challenge
  /** One line per modifier, for the card and the first wave's note. */
  rules: string[]
}

// ------------------------------------------------------------------ seeded helpers

/** FNV-1a: a stable 32-bit seed from a key. */
export function hashKey(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: small, fast, good enough for level generation. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickWeighted<T extends string>(r: () => number, w: Partial<Record<T, number>>): T {
  const entries = Object.entries(w) as [T, number][]
  let total = 0
  for (const [, v] of entries) total += v
  let x = r() * total
  for (const [k, v] of entries) {
    x -= v
    if (x <= 0) return k
  }
  return entries[entries.length - 1][0]
}

const pad2 = (n: number) => String(n).padStart(2, '0')
/** The player's local calendar day, e.g. '2026-09-27'. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** ISO week (Monday start) of a local date: its year and number. */
export function isoWeek(d: Date): { year: number; week: number; monday: Date } {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (day.getDay() + 6) % 7
  const monday = new Date(day)
  monday.setDate(day.getDate() - dow)
  const thursday = new Date(monday)
  thursday.setDate(monday.getDate() + 3)
  const jan4 = new Date(thursday.getFullYear(), 0, 4)
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const week = 1 + Math.round((thursday.getTime() - week1Monday.getTime()) / (7 * 864e5) - 3 / 7)
  return { year: thursday.getFullYear(), week, monday }
}

// British English, like the rest of the game's copy: 'Sun 27 Sep', '21 Sep'
const DAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
export const shortDate = (d: Date) => DAY_FMT.format(d).replace(',', '')

// ------------------------------------------------------------------ wave remix

const POOL: EnemyId[] = ['drip', 'skitter', 'shell', 'veil', 'bloat', 'wisp', 'mender', 'vshell']
/** Mopes a tide can feature (Drips are too plain to carry a day). */
export const FEATURES: EnemyId[] = ['skitter', 'shell', 'veil', 'bloat', 'wisp', 'mender', 'vshell']

/** Glow a Mope pays out, children included. */
export function mopeValue(id: EnemyId): number {
  const e = ENEMIES[id]
  return e.reward + (e.split ? e.split.count * mopeValue(e.split.type) : 0)
}

/**
 * What a Mope costs from a remixed wave's budget. Mostly its glow, but Mopes that are harder than their pay
 * (Menders heal each other in crowds, Veiled Shells need sight and heavy hits at once) cost more, so a remix
 * that leans on them brings fewer.
 */
const COST_MUL: Partial<Record<EnemyId, number>> = { mender: 1.5, vshell: 1.25, veil: 1.1 }
const mopeCost = (id: EnemyId) => mopeValue(id) * (COST_MUL[id] ?? 1)
/** Most of one kind a single crowd can hold. */
const CAP: Partial<Record<EnemyId, number>> = { mender: 5, bloat: 9, vshell: 9 }

/** Glow the canonical wave pays for its ordinary (non-boss) Mopes. */
export function waveBudget(n: number): number {
  const w = WAVES[Math.min(WAVES.length, Math.max(1, n)) - 1]
  let v = 0
  for (const g of w.groups) if (!ENEMIES[g.type].boss) v += g.count * mopeValue(g.type)
  return v
}

/** Seconds between Mopes in a single-kind stream. */
function streamGap(r: () => number, id: EnemyId): number {
  if (id === 'bloat') return 1.1 + r() * 0.4
  if (id === 'vshell' || id === 'mender') return 0.9 + r() * 0.6
  if (id === 'shell') return 0.5 + r() * 0.4
  return 0.35 + r() * 0.2
}

/** Distinct kinds, drawn with the feature weighted up and plain Drips down. */
function drawKinds(r: () => number, feature: EnemyId, n: number, exclude: EnemyId[] = []): EnemyId[] {
  const out: EnemyId[] = []
  for (let guard = 0; out.length < n && guard < 40; guard++) {
    const w: Partial<Record<EnemyId, number>> = {}
    for (const id of POOL) {
      if (out.includes(id) || exclude.includes(id)) continue
      w[id] = id === feature ? (id === 'mender' ? 1.8 : id === 'vshell' ? 2.2 : 2.6) : id === 'drip' ? 0.5 : id === 'wisp' ? 0.4 : 1
    }
    if (!Object.keys(w).length) break
    out.push(pickWeighted(r, w))
  }
  return out
}

/** One remixed wave of a tide. Deterministic in (spec, n). */
export function tideWave(t: TideSpec, n: number): WaveDef {
  const r = rng(hashKey(`${t.seed}:${n}`))
  const src = (): Source => (r() < t.west ? 'west' : 'north')
  const groups: Group[] = []
  // the canonical bosses, with seeded entrances; Old Gloom always comes down the North Spring to meet both locks
  const base = WAVES[n - 1]
  for (const g of base.groups) if (ENEMIES[g.type].boss) groups.push({ ...g, src: g.type === 'gloom' ? 'north' : src() })
  // the first tide wave eases in: everything was built in one go, and nothing has been tested yet
  const budget = waveBudget(n) * (n === t.from + 1 ? 0.8 : 1)
  // three or four crowds, staggered like the handmade late waves
  const k = 3 + (r() < 0.55 ? 1 : 0)
  const starts = [0, 3.5 + r() * 2.5, 8.5 + r() * 3, 13.5 + r() * 3].slice(0, k)
  const shares = starts.map(() => 0.6 + r())
  const total = shares.reduce((a, b) => a + b, 0)
  let swarmUsed = false
  starts.forEach((at, i) => {
    let share = (budget * shares[i]) / total
    const from = src()
    const kind = pickWeighted(r, { clumps: from === 'north' ? 3 : 1.5, mix: 3, stream: 2, swarm: swarmUsed ? 0 : 0.9 })
    if (kind === 'swarm') {
      swarmUsed = true
      const count = Math.max(24, Math.min(70, Math.round(share)))
      groups.push({ type: 'wisp', count, gap: 0.07 + r() * 0.05, at, src: from })
      share -= count
      // whatever the swarm could not hold rides along as a short stream behind it
      if (share > 12) {
        const [id] = drawKinds(r, t.feature, 1, ['wisp'])
        const c = Math.max(2, Math.min(CAP[id] ?? 30, Math.round(share / mopeCost(id))))
        groups.push({ type: id, count: c, gap: streamGap(r, id), at: at + 3, src: from })
      }
      return
    }
    if (kind === 'stream') {
      const [id] = drawKinds(r, t.feature, 1, ['wisp'])
      const count = Math.max(3, Math.min(CAP[id] ?? 30, Math.round(share / mopeCost(id))))
      groups.push({ type: id, count, gap: streamGap(r, id), at, src: from })
      return
    }
    if (kind === 'mix') {
      const kinds = drawKinds(r, t.feature, 2 + Math.floor(r() * 2.2), ['wisp'])
      // an interleave repeats one of its kinds sometimes (skitter, shell, skitter, veil)
      if (kinds.length === 3 && r() < 0.35) kinds.push(kinds[0])
      const round = kinds.reduce((a, id) => a + mopeCost(id), 0)
      const rounds = Math.max(2, Math.min(12, ...kinds.map((id) => CAP[id] ?? 12), Math.round(share / round)))
      const gap = 0.28 + r() * 0.22
      kinds.forEach((type, j) => groups.push({ type, count: rounds, gap: gap * kinds.length, at: at + gap * j, src: from }))
      return
    }
    // clumps: tight runs of one kind after another, sortable one flip per clump
    const kinds = drawKinds(r, t.feature, 2 + (r() < 0.5 ? 1 : 0), ['wisp'])
    const parts = 3 + Math.floor(r() * 3)
    const seq = Array.from({ length: parts }, (_, j) => kinds[j % kinds.length])
    const per = seq.reduce((a, id) => a + mopeCost(id), 0)
    const each = Math.max(3, Math.min(8, Math.round(share / per)))
    const gap = 0.3 + r() * 0.1
    const pause = 1.1 + r() * 0.3
    let tt = at
    for (const type of seq) {
      const count = type === 'bloat' || type === 'mender' ? Math.max(2, Math.min(4, Math.round(each * 0.6))) : each
      groups.push({ type, count, gap, at: tt, src: from })
      tt += (count - 1) * gap + pause
    }
  })
  return { groups }
}

// ------------------------------------------------------------------ offers

const FEATURE_NAME: Partial<Record<EnemyId, string>> = {
  skitter: 'Skitter Tide',
  shell: 'Shellback Tide',
  veil: 'Veil Tide',
  bloat: 'Bloat Tide',
  wisp: 'Wisp Tide',
  mender: 'Mender Tide',
  vshell: 'Veiled Shell Tide',
}

export const TWIST_TEXT: Record<Twist, string> = {
  none: '',
  swift: 'Swift current: ordinary Mopes move 10% faster.',
  thick: 'Thick shells: shells are a third tougher.',
  tidal: 'Tidal locks: a lock opened onto its short run swings back after 5 seconds.',
  sluice: 'Sluice night: most Mopes come through the West Sluice.',
}

/** Trios the bots can win with: each cracks shells and has a Lamp Owl or a Lighthouse to answer Veils. */
export const TRIOS: TowerId[][] = [
  ['wick', 'cracker', 'owl'],
  ['cracker', 'bell', 'owl'],
  ['wick', 'beam', 'bell'],
  ['cracker', 'beam', 'owl'],
  ['beam', 'bell', 'owl'],
]

const keeperList = (ids: TowerId[]) => {
  const names = ids.map((id) => TOWERS[id].name)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
}

function ruleText(rule: Rule, keepers?: TowerId[]): string {
  switch (rule) {
    case 'noCharms':
      return 'No charms: sort every crowd by hand.'
    case 'trio':
      return `Only three keepers: ${keeperList(keepers ?? [])}.`
    case 'noGarden':
      return 'No Glow Gardens.'
    case 'fixed':
      return 'Fixed locks: both locks stay on the long loops all night, and charms are off.'
    case 'lean':
      return 'Lean night: no charms and no Glow Gardens.'
    default:
      return ''
  }
}

/** Challenge flags for a twist and a rule. */
function modifiers(twist: Twist, rule: Rule, keepers?: TowerId[]): Challenge {
  const c: Challenge = {}
  if (twist === 'swift') c.swift = 1.1
  if (twist === 'thick') c.thick = 4 / 3
  if (twist === 'tidal') c.tidal = 5
  if (rule === 'noCharms' || rule === 'lean') c.noCharms = true
  if (rule === 'noGarden' || rule === 'lean') c.noGarden = true
  if (rule === 'fixed') c.lockedGates = true
  if (rule === 'trio' && keepers) c.keepers = [...keepers]
  return c
}

/** Today's tide (local calendar day). Everyone playing on the same day gets the same one. */
export function dailyTide(date: Date, guard = false): ChallengeOffer {
  const key = dayKey(date)
  const seed = hashKey(`tide:${key}`)
  const r = rng(seed)
  const feature = FEATURES[Math.floor(r() * FEATURES.length)]
  let twist = pickWeighted<Twist>(r, { none: 1, swift: 2, thick: feature === 'shell' || feature === 'vshell' ? 2.5 : 1.2, tidal: 2, sluice: 2 })
  const rule = pickWeighted<Rule>(r, guard ? { none: 3, trio: 1.5, noGarden: 1.5 } : { none: 3, noCharms: 1.5, trio: 1.5, noGarden: 1.5 })
  // every tide has at least one twist or rule
  if (twist === 'none' && rule === 'none') twist = 'swift'
  const keepers = rule === 'trio' ? TRIOS[Math.floor(r() * TRIOS.length)] : undefined
  const west = twist === 'sluice' ? 0.72 : 0.3 + r() * 0.2
  const tide: TideSpec = { seed, from: TIDE_FROM, glow: TIDE_GLOW, west: Math.round(west * 100) / 100, feature }
  const rules = [TWIST_TEXT[twist], ruleText(rule, keepers)].filter(Boolean)
  const id = `daily:${key}${guard ? ':guard1' : ''}`
  return {
    kind: 'daily',
    id,
    name: FEATURE_NAME[feature] ?? 'Tide',
    when: shortDate(date),
    twist,
    rule,
    keepers,
    challenge: { ...modifiers(twist, rule, keepers), ...(guard ? { guard: 1 } : {}), tide, id },
    rules,
  }
}

/**
 * The weekly rules turn over every Monday, in a fixed rotation so no two weeks in a row match. (No trio here:
 * three keepers against the whole night is what the Trio feat is for.)
 */
const WEEKLY: { twist: Twist; rule: Rule; name: string }[] = [
  { twist: 'none', rule: 'fixed', name: 'Fixed locks' },
  { twist: 'tidal', rule: 'none', name: 'Tidal locks' },
  { twist: 'swift', rule: 'none', name: 'Swift current' },
  { twist: 'none', rule: 'lean', name: 'Lean night' },
  { twist: 'thick', rule: 'none', name: 'Thick shells' },
]

/** This week's night: the whole of Wickwater Canal on Standard, under one rule. */
export function weeklyNight(date: Date, guard = false): ChallengeOffer {
  const { year, week, monday } = isoWeek(date)
  const key = `${year}-W${pad2(week)}`
  const w = WEEKLY[(year * 53 + week) % WEEKLY.length]
  const r = rng(hashKey(`week:${key}`))
  const keepers = w.rule === 'trio' ? TRIOS[Math.floor(r() * TRIOS.length)] : undefined
  const rules = [TWIST_TEXT[w.twist], ruleText(w.rule, keepers)].filter(Boolean)
  if (guard && w.rule === 'lean') rules.splice(0, rules.length, 'No Glow Gardens. Invest in damage and support.')
  const id = `weekly:${key}${guard ? ':guard1' : ''}`
  return {
    kind: 'weekly',
    id,
    name: w.name,
    when: `week of ${DATE_FMT.format(monday)}`,
    twist: w.twist,
    rule: w.rule,
    keepers,
    challenge: { ...modifiers(w.twist, w.rule, keepers), ...(guard ? { guard: 1 } : {}), id },
    rules,
  }
}

/** The offer a saved or running challenge came from, rebuilt from its record key (for titles and share text). */
export function offerFor(id: string): ChallengeOffer | null {
  const [kind, key, version] = id.split(':')
  if (kind === 'daily') {
    const [y, m, d] = key.split('-').map(Number)
    if (!y || !m || !d) return null
    return version === 'compact1' || version === 'compact2' ? compactChallenge(new Date(y, m - 1, d), 'daily', version === 'compact2') : dailyTide(new Date(y, m - 1, d), version === 'guard1')
  }
  if (kind === 'weekly') {
    const m = /^(\d{4})-W(\d{2})$/.exec(key)
    if (!m) return null
    // the Thursday of that ISO week sits inside it
    const jan4 = new Date(Number(m[1]), 0, 4)
    const mon = new Date(jan4)
    mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (Number(m[2]) - 1) * 7 + 3)
    return version === 'compact1' || version === 'compact2' ? compactChallenge(mon, 'weekly', version === 'compact2') : weeklyNight(mon, version === 'guard1')
  }
  return null
}

/** Ten waves on the same compact boards, with a fixed defence and budget to improve. */
export function compactChallenge(date: Date, kind: 'daily' | 'weekly', balance = false): ChallengeOffer {
  const week = isoWeek(date)
  const key = kind === 'daily' ? dayKey(date) : `${week.year}-W${pad2(week.week)}`
  const id = `${kind}:${key}:compact${balance ? 2 : 1}`, seed = hashKey(id), variant = seed % 4
  const from = kind === 'daily' ? 10 : 20, glow = kind === 'daily' ? 4200 : 8500
  return {
    kind, id, name: kind === 'daily' ? 'Finish this defence' : 'Hold against the Warden',
    when: kind === 'daily' ? shortDate(date) : `week of ${DATE_FMT.format(week.monday)}`,
    twist: 'none', rule: 'none',
    challenge: { compact: 1, depth: 1, guard: 1, variant, ...(balance ? { balance: 1 } : {}), skirmish: { from, to: from + 10, glow, seed }, id },
    rules: [`${WATCH_NAMES[variant]} · 10 waves on Standard.`, `${glow.toLocaleString('en')} glow total, including the starting towers.`, 'Upgrade, sell or add towers before starting. Keep as much light as you can.'],
  }
}
