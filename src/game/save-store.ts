import { WATERWAYS } from './waterways'
import { DIFFICULTY, TOWERS, ENEMIES, CHARMS } from './defs'
import { LEVEL } from './level'
import { CANAL_STAGES, growingCanal, stageForWave } from './canal-growth'
import type { SaveSnapshot } from './sim'

export const RUN_KEY = 'lanternlocks.run.v3'
export const BACKUP_KEY = 'lanternlocks.run-backup.v3'
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
  if (s.challenge.waterway !== undefined && !Object.hasOwn(WATERWAYS, String(s.challenge.waterway))) return false
  if (s.challenge.expanding !== undefined && (s.challenge.expanding !== 1 || s.v !== 2 || s.challenge.waterway !== undefined || s.challenge.id !== undefined || s.challenge.tide !== undefined || !integer(s.canalStage, 0, 2))) return false
  if (s.challenge.guard !== undefined && (s.challenge.guard !== 1 || s.challenge.expanding !== 1)) return false
  if (!Array.isArray(s.towers) || s.towers.length > LEVEL.pads.length || !Array.isArray(s.gates) || s.gates.length !== 2) return false
  const pads = new Set<number>()
  for (const t of s.towers) {
    if (!object(t) || typeof t.id !== 'string' || !Object.hasOwn(TOWERS, t.id) || !integer(t.pad, 0, LEVEL.pads.length - 1) || pads.has(t.pad) || !integer(t.a, 0, 3) || !integer(t.b, 0, 3) || (t.a > 1 && t.b > 1) || !number(t.spent, 0) || !number(t.pops, 0) || !['first', 'last', 'strong', 'close'].includes(String(t.priority))) return false
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
    if (s.towers.some(t => !available.includes((t as { pad: number }).pad))) return false
  }
  const segments = new Set((s.challenge.expanding ? growingCanal(s.canalStage as number) : LEVEL).segments.map(seg => seg.id))
  if (!(s.openSources as unknown[]).every(id => ['north', 'west'].includes(String(id)))) return false
  if (!(s.enemies as unknown[]).every(e => object(e) && Object.hasOwn(ENEMIES, String(e.type)) && segments.has(String(e.seg)) && number(e.s, 0) && number(e.hp) && number(e.maxHp, 0) && integer(e.uid, 1) && integer(e.wave, 1, 10000))) return false
  if (!(s.projs as unknown[]).every(p => object(p) && integer(p.tower, 1) && Array.isArray(p.hit) && number(p.x) && number(p.y))) return false
  if (!(s.spawners as unknown[]).every(p => object(p) && integer(p.wave, 1, 10000) && integer(p.group, 0, 100) && number(p.t) && integer(p.spawned))) return false
  if (!(s.waveAlive as unknown[]).every(v => Array.isArray(v) && integer(v[0], 1, 10000) && integer(v[1]))) return false
  for (const e of s.enemies as Record<string, unknown>[]) {
    for (const key of ['shell', 'maxShell', 'seenT', 'phase', 'spawnCd', 'speedBase', 'slowT', 'slowF', 'stunT', 'burnT', 'burnDps', 'brittleT', 'visScale', 'reward', 'age']) if (!number(e[key])) return false
    for (const key of ['revealedPerm', 'split']) if (typeof e[key] !== 'boolean') return false
    for (const key of ['rich', 'shrouded', 'owlSeen']) if (e[key] !== undefined && typeof e[key] !== 'boolean') return false
    if (typeof e.route !== 'string' || typeof e.lastGate !== 'string') return false
  }
  for (const p of s.projs as Record<string, unknown>[]) {
    for (const key of ['vx', 'vy', 'speed', 'target', 'dmg', 'pierce', 'splash', 'burn', 'burnDur', 'cluster', 'life', 'sx', 'sy', 'ex', 'ey', 't', 'dur']) if (!number(p[key])) return false
    for (const key of ['heavy', 'detect', 'brittleBonus']) if (typeof p[key] !== 'boolean') return false
    if (!['spark', 'feather', 'firework', 'rocket', 'moth', 'mini'].includes(String(p.kind)) || !(p.hit as unknown[]).every((v: unknown) => integer(v))) return false
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
    const previous = storage.getItem(RUN_KEY)
    // Never rotate a corrupt main save over a healthy recovery copy.
    if (decodeRun(previous)) {
      try { storage.setItem(BACKUP_KEY, previous!) } catch { /* still attempt the primary write */ }
    }
    storage.setItem(RUN_KEY, encodeRun(snapshot, blooms))
    saveHealth = 'ready'
    storageChanged()
    return true
  } catch { saveHealth = 'unavailable'; return false }
}

export function readRun(storage?: Storage): RunEnvelope | null {
  try {
    storage ??= localStorage
    const primary = storage.getItem(RUN_KEY)
    const backup = storage.getItem(BACKUP_KEY)
    const run = decodeRun(primary)
    if (run) return run
    const recovered = decodeRun(backup)
    if (recovered) { saveHealth = 'recovered'; return recovered }
    if (primary || backup) saveHealth = 'invalid'
    return null
  } catch { saveHealth = 'unavailable'; return null }
}
