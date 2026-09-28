import { compactLevel, PLOTS, STARTER_PLOTS, REFINEMENTS } from './compact'
import { LATE_REFINEMENTS, LATE_TOWERS, PREPARATIONS } from './depth'
import { BATTLE_PLANS, type BattlePlanId } from './battle-plans'
import { gardensLevel, GARDENS_PADS } from './gardens'
import { WATERWAYS } from './waterways'
import { DIFFICULTY, TOWERS, ENEMIES, CHARMS } from './defs'
import { LEVEL } from './level'
import { CANAL_STAGES, growingCanal, stageForWave } from './canal-growth'
import { harbourLevel, HARBOUR_PADS } from './harbour'
import type { SaveSnapshot } from './sim'

export const RUN_KEY = 'lanternlocks.run.v3'
export const BACKUP_KEY = 'lanternlocks.run-backup.v3'
export type RunSlot = 'campaign' | 'challenge'
export const slotKeys = (slot: RunSlot) => slot === 'campaign' ? [RUN_KEY, BACKUP_KEY] : ['lanternlocks.challenge-run.v1', 'lanternlocks.challenge-backup.v1']
export function activeSlot(): RunSlot {
  try { return localStorage.getItem('lanternlocks.active-slot') === 'challenge' ? 'challenge' : 'campaign' } catch { return 'campaign' }
}
export function selectSlot(slot: RunSlot) {
  try { localStorage.setItem('lanternlocks.active-slot', slot); storageChanged() } catch { setSaveHealth('unavailable') }
}

/** Migrate a challenge saved by the old single-slot build without overwriting either healthy slot. */
export function migrateSlots(storage: Storage = localStorage) {
  try {
    const primary = storage.getItem(RUN_KEY), recovery = storage.getItem(BACKUP_KEY)
    let old = decodeRun(primary) ?? decodeRun(recovery)
    let legacy = false
    if (!old && !primary && !recovery) {
      const snapshot: unknown = JSON.parse(storage.getItem('lanternlocks.save.v1') ?? 'null')
      const blooms = JSON.parse(storage.getItem('lanternlocks.blooms.v1') ?? '{"d":[]}').d
      if (validSnapshot(snapshot) && Array.isArray(blooms) && blooms.every(Number.isFinite)) {
        old = { snapshot, blooms, savedAt: 0 }
        legacy = true
      }
    }
    if (!old?.snapshot.challenge.id) return
    const [key, backup] = slotKeys('challenge')
    if (!decodeRun(storage.getItem(key)) && !decodeRun(storage.getItem(backup))) {
      const credit = storage.getItem('lanternlocks.journal-credit.v1')
      if (credit) storage.setItem('lanternlocks.challenge-credit.v1', credit)
      storage.setItem(key, encodeRun(old.snapshot, old.blooms))
    }
    storage.removeItem(RUN_KEY)
    storage.removeItem(BACKUP_KEY)
    storage.removeItem('lanternlocks.journal-credit.v1')
    if (legacy) {
      storage.removeItem('lanternlocks.save.v1')
      storage.removeItem('lanternlocks.blooms.v1')
    }
    storage.setItem('lanternlocks.active-slot', 'challenge')
    storageChanged()
  } catch { setSaveHealth('unavailable') }
}
export type SaveHealth = 'ready' | 'recovered' | 'unavailable' | 'invalid'
export let saveHealth: SaveHealth = 'ready'
export const setSaveHealth = (health: SaveHealth) => { saveHealth = health }
let changed = () => {}
export const onStorageChanged = (fn: () => void) => { changed = fn }
export const storageChanged = () => changed()

const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const number = (x: unknown, min = -1e12, max = 1e12): x is number => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max
const integer = (x: unknown, min = 0, max = 1e6): x is number => number(x, min, max) && Number.isInteger(x)
const allFinite = (x: unknown, depth = 0): boolean => depth < 12 && (typeof x === 'number' ? Number.isFinite(x) : Array.isArray(x) ? x.length <= 20000 && x.every(v => allFinite(v, depth + 1)) : object(x) ? Object.values(x).every(v => allFinite(v, depth + 1)) : true)

/** Reject malformed state before it can reach the simulation. Original v1/v2 saves remain supported. */
export function validSnapshot(s: unknown): s is SaveSnapshot {
  if (!object(s) || (s.v !== 1 && s.v !== 2) || typeof s.difficulty !== 'string' || !Object.hasOwn(DIFFICULTY, s.difficulty)) return false
  if (!object(s.challenge) || s.challenge.chapter !== undefined || s.challenge.campaign !== undefined || !integer(s.wave, 0, 10000) || !number(s.glow, 0) || !number(s.lives) || !number(s.seed) || typeof s.won !== 'boolean' || !object(s.stats) || !allFinite(s)) return false
  for (const key of ['lockedGates', 'noGarden', 'noCharms']) if (s.challenge[key] !== undefined && typeof s.challenge[key] !== 'boolean') return false
  if (s.challenge.id !== undefined && typeof s.challenge.id !== 'string') return false
  if (s.challenge.keepers !== undefined && (!Array.isArray(s.challenge.keepers) || !s.challenge.keepers.every(v => typeof v === 'string' && Object.hasOwn(TOWERS, v)))) return false
  if (s.challenge.compact !== undefined && (s.challenge.compact !== 1 || s.v !== 2 || s.challenge.guard !== 1 || !integer(s.challenge.variant, 0, s.challenge.plans === 1 || s.challenge.depth === 1 ? 3 : 2) || ['expanding', 'waterway', 'harbour', 'gardens', 'harbourEncounters', 'tide', ...(s.challenge.skirmish ? [] : ['id'])].some(k => (s.challenge as Record<string, unknown>)[k] !== undefined))) return false
  if (s.challenge.depth !== undefined && (s.challenge.depth !== 1 || s.challenge.compact !== 1 || s.challenge.guard !== 1 || s.v !== 2)) return false
  if (s.challenge.balance !== undefined && (s.challenge.balance !== 1 || s.challenge.depth !== 1)) return false
  if (s.challenge.skirmish !== undefined) {
    const q = s.challenge.skirmish
    if (!object(q) || !s.challenge.depth || typeof s.challenge.id !== 'string' || !s.challenge.id.endsWith(s.challenge.balance ? ':compact2' : ':compact1') || ![10, 20].includes(q.from as number) || q.to !== Number(q.from) + 10 || q.glow !== (q.from === 10 ? 4200 : 8500) || !integer(q.seed, 0, 4294967295) || s.seed !== q.seed || s.wave < Number(q.from) || s.wave > Number(q.to) || s.freeplay || s.challenge.tide || s.challenge.plans || s.challenge.guardian) return false
  }
  if (s.challenge.depth) {
    if (!integer(s.preparationRound, 0, 35) || s.preparationRound % 5 !== 0 || s.preparationRound > s.wave) return false
    if (s.preparation !== null) {
      const p = s.preparation
      if (!object(p) || !Object.hasOwn(PREPARATIONS, String(p.id)) || p.round !== s.preparationRound || !integer(p.round, 5, 35) || !integer(p.wave, p.round + 1, p.round + 5) || !integer(p.charges, 0, p.id === 'net' ? 8 : p.id === 'ward' ? 4 : 0) || ![s.wave, s.wave + 1].includes(p.wave)) return false
    }
  } else if (s.preparation !== undefined || s.preparationRound !== undefined) return false
  if (s.challenge.plans !== undefined && (s.challenge.plans !== 1 || s.challenge.compact !== 1)) return false
  if (s.challenge.plans) {
    if (!Array.isArray(s.battlePlans) || s.battlePlans.length > 2 || !s.battlePlans.every(id => typeof id === 'string' && Object.hasOwn(BATTLE_PLANS, id))) return false
    const rounds = s.battlePlans.map(id => BATTLE_PLANS[id as BattlePlanId].wave)
    if (new Set(rounds).size !== rounds.length || rounds.some(wave => wave > (s.wave as number) - (s.over === 'lost' ? 1 : 0)) || rounds.some((wave, i) => wave !== [10, 20][i])) return false
  } else if (s.battlePlans !== undefined) return false
  if (s.challenge.variant !== undefined && !s.challenge.compact) return false
  if (s.challenge.compact) {
    if (!Array.isArray(s.plots) || s.plots.length > PLOTS.length || new Set(s.plots).size !== s.plots.length || !s.plots.every(p => integer(p, 0, PLOTS.length - 1) && PLOTS[p].wave <= (s.wave as number) + 1) || !STARTER_PLOTS.every(p => (s.plots as number[]).includes(p))) return false
  } else if (s.plots !== undefined) return false
  if (s.challenge.waterway !== undefined && !Object.hasOwn(WATERWAYS, String(s.challenge.waterway))) return false
  if (s.challenge.expanding !== undefined && (s.challenge.expanding !== 1 || s.v !== 2 || s.challenge.waterway !== undefined || s.challenge.id !== undefined || s.challenge.tide !== undefined || !integer(s.canalStage, 0, 2))) return false
  if (s.challenge.guard !== undefined && (s.challenge.guard !== 1 || (s.challenge.expanding !== 1 && s.challenge.compact !== 1 && typeof s.challenge.id !== 'string') || s.challenge.waterway !== undefined)) return false
  if (s.challenge.harbour !== undefined && (s.challenge.harbour !== 1 || s.challenge.guard !== 1 || s.challenge.expanding !== 1 || s.wave < 25 || s.canalStage !== 2)) return false
  if (s.challenge.harbourEncounters !== undefined && (s.challenge.harbourEncounters !== 1 || s.challenge.harbour !== 1)) return false
  if (s.challenge.guardian !== undefined && (!['ember', 'reed', 'tide'].includes(String(s.challenge.guardian)) || (s.challenge.guardian === 'tide' && !s.challenge.compact) || s.challenge.guard !== 1 || s.challenge.id !== undefined)) return false
  if (s.challenge.gardens !== undefined && (s.challenge.gardens !== 1 || s.challenge.harbour !== 1 || s.wave < 33)) return false
  const maxPads = s.challenge.compact ? PLOTS.length : LEVEL.pads.length + (s.challenge.harbour ? HARBOUR_PADS.length : 0) + (s.challenge.gardens ? GARDENS_PADS.length : 0)
  if (!Array.isArray(s.towers) || s.towers.length > maxPads || !Array.isArray(s.gates) || s.gates.length !== 2) return false
  const pads = new Set<number>()
  for (const t of s.towers) {
    if (!object(t) || typeof t.id !== 'string' || !Object.hasOwn(TOWERS, t.id) || !integer(t.pad, 0, maxPads - 1) || pads.has(t.pad) || !integer(t.a, 0, 3) || !integer(t.b, 0, 3) || (t.a > 1 && t.b > 1) || !number(t.spent, 0) || !number(t.pops, 0) || !['first', 'last', 'strong', 'close'].includes(String(t.priority))) return false
    const ranks = s.challenge.depth ? [...REFINEMENTS, ...LATE_REFINEMENTS] : REFINEMENTS
    if (LATE_TOWERS.includes(t.id as import('./defs').TowerId) && (!s.challenge.depth || (t.id === 'storm' ? 16 : 26) > s.wave + 1)) return false
    if (s.challenge.compact && (!(s.plots as number[]).includes(t.pad) || !integer(t.refinement, 0, ranks.length) || (t.refinement > 0 && (Math.max(t.a, t.b) < 3 || ranks[t.refinement - 1].wave > s.wave + 1)))) return false
    if (!s.challenge.compact && t.refinement !== undefined) return false
    pads.add(t.pad)
  }
  for (const g of s.gates) {
    if (!object(g) || !integer(g.state, 0, 1)) return false
    if (g.charm !== null && (!object(g.charm) || !Object.hasOwn(CHARMS, String(g.charm.trait)) || !integer(g.charm.dir, 0, 1))) return false
  }
  for (const [key, value] of Object.entries(s.stats)) {
    if (['popsBy', 'leaksBy', 'leakRoutes', 'cheered'].includes(key)) {
      if (!object(value) || !Object.values(value).every(v => number(v, 0))) return false
    } else if (key === 'towersUsed') {
      if (!Array.isArray(value) || !value.every(v => typeof v === 'string' && Object.hasOwn(TOWERS, v))) return false
    } else if (!number(value)) return false
  }
  for (const t of s.towers) {
    if (t.damageDealt !== undefined && !number(t.damageDealt, 0)) return false
    for (const key of ['uid', 'cd', 'diveCd', 'mothCd', 'tolls', 'angle', 'bornT', 'fireT', 'upT', 'slowed', 'spotted', 'earned']) if (t[key] !== undefined && !number(t[key])) return false
    if (t.beams !== undefined && (!Array.isArray(t.beams) || t.beams.length !== 2 || !t.beams.every((v: unknown) => integer(v)))) return false
  }
  for (const g of s.gates) {
    for (const key of ['cd', 'flipT', 'flips', 'swingT']) if (g[key] !== undefined && !number(g[key])) return false
    if (g.jammed !== undefined && typeof g.jammed !== 'boolean') return false
    if (g.routeT !== undefined && (!Array.isArray(g.routeT) || g.routeT.length !== 2 || !g.routeT.every((v: unknown) => number(v)))) return false
  }
  for (const key of ['swift', 'thick', 'tidal']) if (s.challenge[key] !== undefined && !number(s.challenge[key], 0.01, 100)) return false
  if (s.challenge.tide !== undefined) {
    const t = s.challenge.tide
    if (!object(t) || !integer(t.from, 0, 24) || !number(t.glow, 0) || !integer(t.seed, 0, 4294967295) || !number(t.west, 0, 1) || !Object.hasOwn(ENEMIES, String(t.feature))) return false
  }
  if (s.v === 1) return true
  if (!number(s.time, 0) || !integer(s.rngDraws, 0, 10000000) || !integer(s.uid, 1) || !number(s.glowFrac, 0) || ![null, 'won', 'lost'].includes(s.over as null) || typeof s.freeplay !== 'boolean' || !integer(s.freeplayFrom)) return false
  for (const key of ['enemies', 'projs', 'spawners', 'wavesPending', 'waveAlive', 'openSources']) if (!Array.isArray(s[key])) return false
  if (s.challenge.expanding) {
    const active = (s.enemies as unknown[]).length > 0 || (s.spawners as unknown[]).length > 0
    if (s.canalStage !== stageForWave(s.wave + (!active && !s.over ? 1 : 0))) return false
    const available = CANAL_STAGES[s.canalStage as number].pads as readonly number[]
    const harbour = !!s.challenge.harbour
    if (s.towers.some(t => !available.includes((t as { pad: number }).pad) && !(harbour && (t as { pad: number }).pad >= LEVEL.pads.length))) return false
  }
  const base = s.challenge.compact ? compactLevel(s.challenge.variant as number) : s.challenge.expanding ? growingCanal(s.canalStage as number) : LEVEL
  const harbour = s.challenge.harbour ? harbourLevel(base) : base
  const segments = new Set((s.challenge.gardens ? gardensLevel(harbour) : harbour).segments.map(seg => seg.id))
  if (s.waveReports !== undefined && (!s.challenge.guard || !Array.isArray(s.waveReports) || s.waveReports.length > 100 || !s.waveReports.every(r => object(r) && integer(r.wave, 1, 10000) && integer(r.slowSplashHits) && object(r.damage) && Object.entries(r.damage).every(([id, value]) => Object.hasOwn(TOWERS, id) && number(value, 0))))) return false
  if (s.embers !== undefined && (!Array.isArray(s.embers) || s.embers.length > 48 || !s.embers.every(p => object(p) && number(p.x) && number(p.y) && number(p.radius, 0, 1000) && number(p.life, 0, 3) && number(p.dps, 0) && integer(p.tower, 1)))) return false
  if (s.lastLeak !== undefined && s.lastLeak !== null && (!object(s.lastLeak) || !Object.hasOwn(ENEMIES, String(s.lastLeak.enemy)) || typeof s.lastLeak.route !== 'string' || typeof s.lastLeak.hidden !== 'boolean' || typeof s.lastLeak.armoured !== 'boolean' || !integer(s.lastLeak.wave, 1) || !number(s.lastLeak.light, 0))) return false
  if (!(s.openSources as unknown[]).every(id => ['north', 'west'].includes(String(id)))) return false
  if (!(s.enemies as unknown[]).every(e => object(e) && Object.hasOwn(ENEMIES, String(e.type)) && segments.has(String(e.seg)) && number(e.s, 0) && number(e.hp) && number(e.maxHp, 0) && integer(e.uid, 1) && integer(e.wave, 1, 10000))) return false
  if (!(s.projs as unknown[]).every(p => object(p) && integer(p.tower, 1) && Array.isArray(p.hit) && number(p.x) && number(p.y))) return false
  if (!(s.spawners as unknown[]).every(p => object(p) && integer(p.wave, 1, 10000) && integer(p.group, 0, 100) && number(p.t) && integer(p.spawned))) return false
  if (!(s.waveAlive as unknown[]).every(v => Array.isArray(v) && integer(v[0], 1, 10000) && integer(v[1]))) return false
  for (const e of s.enemies as Record<string, unknown>[]) {
    if (e.escortOf !== undefined && (!integer(e.escortOf, 1) || e.type !== 'skiff' || s.challenge.harbourEncounters !== 1 && s.challenge.compact !== 1)) return false
    if (e.signalT !== undefined && !((e.type === 'warden' && (s.challenge.harbourEncounters === 1 || s.challenge.compact === 1) && number(e.signalT, 0, 2.4)) || (e.type === 'bloomheart' && (s.challenge.gardens === 1 || s.challenge.compact === 1) && number(e.signalT, 0, 3)))) return false
    if (['reedling', 'bloomheart'].includes(String(e.type)) && s.challenge.gardens !== 1 && s.challenge.compact !== 1) return false
    for (const key of ['shell', 'maxShell', 'seenT', 'phase', 'spawnCd', 'speedBase', 'slowT', 'slowF', 'stunT', 'burnT', 'burnDps', 'brittleT', 'visScale', 'reward', 'age']) if (!number(e[key])) return false
    for (const key of ['revealedPerm', 'split']) if (typeof e[key] !== 'boolean') return false
    for (const key of ['rich', 'shrouded', 'owlSeen']) if (e[key] !== undefined && typeof e[key] !== 'boolean') return false
    if (typeof e.route !== 'string' || typeof e.lastGate !== 'string') return false
  }
  for (const p of s.projs as Record<string, unknown>[]) {
    if (p.bounced !== undefined && (typeof p.bounced !== 'boolean' || p.kind !== 'spark' || s.challenge.guardian !== 'reed')) return false
    for (const key of ['vx', 'vy', 'speed', 'target', 'dmg', 'pierce', 'splash', 'burn', 'burnDur', 'cluster', 'life', 'sx', 'sy', 'ex', 'ey', 't', 'dur']) if (!number(p[key])) return false
    for (const key of ['heavy', 'detect', 'brittleBonus']) if (typeof p[key] !== 'boolean') return false
    if (!['spark', 'feather', 'firework', 'rocket', 'moth', 'mini', ...(s.challenge.depth ? ['bolt'] : [])].includes(String(p.kind)) || !(p.hit as unknown[]).every((v: unknown) => integer(v))) return false
  }
  return (s.wavesPending as unknown[]).every(v => integer(v, 1, 10000))
}

// A checksum catches valid JSON whose content was truncated or altered in storage.
function checksum(text: string): string {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}
export interface RunEnvelope { snapshot: SaveSnapshot; blooms: number[]; savedAt: number }
export function encodeRun(snapshot: SaveSnapshot, blooms: number[]): string {
  const payload = JSON.stringify({ snapshot, blooms, savedAt: Date.now() })
  return JSON.stringify({ version: 1, checksum: checksum(payload), payload })
}
export function decodeRun(raw: string | null): RunEnvelope | null {
  if (!raw || raw.length > 4000000) return null
  try {
    const value = JSON.parse(raw)
    if (value.version !== 1 || typeof value.payload !== 'string' || value.checksum !== checksum(value.payload)) return null
    const run = JSON.parse(value.payload)
    return validSnapshot(run.snapshot) && Array.isArray(run.blooms) && run.blooms.length < 100000 && run.blooms.every((n: unknown) => number(n)) && number(run.savedAt, 0, 1e16) ? run : null
  } catch { return null }
}

export function storeRun(snapshot: SaveSnapshot, blooms: number[], storage?: Storage): boolean {
  if (!validSnapshot(snapshot)) { saveHealth = 'invalid'; return false }
  try {
    storage ??= localStorage
    const [key, backup] = slotKeys(snapshot.challenge.id ? 'challenge' : 'campaign')
    const previous = storage.getItem(key)
    // Never rotate a corrupt main save over a healthy recovery copy.
    if (decodeRun(previous)) {
      try { storage.setItem(backup, previous!) } catch { /* still attempt the primary write */ }
    }
    storage.setItem(key, encodeRun(snapshot, blooms))
    saveHealth = 'ready'
    storageChanged()
    return true
  } catch { saveHealth = 'unavailable'; return false }
}

export function readRun(storage?: Storage, slot: RunSlot = 'campaign'): RunEnvelope | null {
  try {
    storage ??= localStorage
    const [key, recoveryKey] = slotKeys(slot)
    const primary = storage.getItem(key)
    const backup = storage.getItem(recoveryKey)
    const run = decodeRun(primary)
    if (run) return run
    const recovered = decodeRun(backup)
    if (recovered) { saveHealth = 'recovered'; return recovered }
    if (primary || backup) saveHealth = 'invalid'
    return null
  } catch { saveHealth = 'unavailable'; return null }
}
