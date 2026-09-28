/**
 * An adaptive "competent player" bot for balance testing. It reads upcoming
 * waves, builds counters where Mopes will flow, spends all its glow, and can
 * route Mopes with the locks. Strategy knobs make it play very differently.
 */
import { CHARM_COST, TOWERS, type CharmTrait, type EnemyId, type TowerId } from '../src/game/defs'
import { DT, FINAL_WAVE, Sim, type Challenge, type Enemy, type GateState, type Tower, type SaveSnapshot } from '../src/game/sim'
import { coveredLength, routeCoverage } from '../src/game/route-plan'

export interface BotOpts {
  name: string
  /** Relative preference for each keeper type when several would do. */
  mix: Partial<Record<TowerId, number>>
  /** Keeper types this bot refuses to build. */
  ban?: TowerId[]
  /** Preferred upgrade path per keeper type. */
  paths?: Partial<Record<TowerId, 0 | 1>>
  /** smart: sorts each Mope; none: never flips; random: flips at random; park: both locks on the rich runs for good. */
  router: 'smart' | 'none' | 'random' | 'park' | 'plan'
  /** park only: sort like 'smart' until this wave, then park (a player who stops routing late). */
  parkFrom?: number
  /** Build this many gardens early. */
  gardens?: number
  /** Buy charms when affordable (smart bots only). */
  charms?: boolean
  /** Human-like reaction: how often (seconds) the router looks at the locks. */
  reaction?: number
  /** Calls waves early when idle. */
  early?: boolean
  freezeAt?: number
  maxTowers?: number
  /** Keep build capacity for explicitly requested specialists that unlock later. */
  reserveLate?: boolean
  /** Send weak Mopes down rich channels for extra glow. */
  greed?: boolean
}

export interface BotResult {
  name: string
  outcome: 'WON' | 'lost' | 'stuck'
  wave: number
  lives: number
  maxLives: number
  leaks: Partial<Record<EnemyId, number>>
  flips: number
  towers: string
  minutes: number
  waveLeaks: Record<number, number>
  spent: number
  /** Per wave: closest any Mope got to the lantern, as % of the trunk-to-home distance left. */
  margin: Record<number, number>
  /** Light lost to Mopes that had taken a rich run (already doubled). */
  richLeak: number
  /** Most glow left unspent at the start of any wave from 15 on. */
  bank: number
  /** Total glow earned over the run. */
  earned: number
  /** Old Gloom: whether it split at the Lower Lock, its health then, and how long its halves lasted. */
  gloom: string
}

const POS = { x: 0, y: 0, tx: 0, ty: 0 }
/** Coverage only changes when a keeper's range does: cache it per keeper, channel and range. */
const COVER = new Map<string, number>()

/** Path length (world units) of a segment inside a circle. */
function coverage(sim: Sim, segId: string, x: number, y: number, r: number): number {
  const key = `${sim.level.def.name}:${sim.challenge.expanding ? sim.canalStage : "full"}:${segId}:${x}:${y}:${r}`
  const hit = COVER.get(key)
  if (hit !== undefined) return hit
  const line = sim.level.segs.get(segId)!.line
  let c = 0
  for (let s = 0; s < line.length; s += 12) {
    line.at(s, POS)
    if ((POS.x - x) ** 2 + (POS.y - y) ** 2 < r * r) c += 12
  }
  COVER.set(key, c)
  return c
}

/** Segments Mopes can currently use, weighted by how much traffic they carry. */
function segWeights(sim: Sim, wave: number): Map<string, number> {
  const w = new Map<string, number>()
  const add = (id: string, v: number) => { if (sim.level.segs.has(id)) w.set(id, (w.get(id) ?? 0) + v) }
  const west = wave >= 11
  add('n0', 1)
  if (sim.challenge.gardens) { add('garden-west', .9); add('garden-east', .9); add('garden-merge', 1.8); add('harbour', 1.4) }
  const up = sim.gates[0]
  const lo = sim.gates[1]
  const upLocked = sim.wave < up.def.unlockWave && wave < up.def.unlockWave
  if (upLocked) add(up.def.outs[up.def.lockedDir], 1)
  else {
    add(up.def.outs[up.state], 0.65)
    add(up.def.outs[up.state ? 0 : 1], 0.35)
  }
  add('m1', west ? 1.4 : 1)
  if (west) add('inlet', 0.5)
  const loLocked = wave < lo.def.unlockWave
  if (loLocked) add(lo.def.outs[lo.def.lockedDir], west ? 1.4 : 1)
  else {
    add(lo.def.outs[lo.state], 0.9)
    add(lo.def.outs[lo.state ? 0 : 1], 0.5)
  }
  add('h', west ? 1.4 : 1)
  // Old Gloom is coming: it splits at the Lower Lock, so both lower channels must hold
  const gloomSoon = [0, 1].some((k) => sim.waveDef(Math.max(1, wave + k)).groups.some((g) => g.type === 'gloom'))
  if (gloomSoon) {
    add('w2', 1.2)
    add('e2', 0.8)
  }
  // like a player watching the board: blend in where the threat has actually been lately
  const seen = PRESENCE.get(sim)
  if (seen && seen.size) {
    let top = 0
    const dens = new Map<string, number>()
    for (const [id, v] of seen) {
      const d = v / sim.level.segs.get(id)!.line.length
      dens.set(id, d)
      top = Math.max(top, d)
    }
    if (top > 0) for (const id of sim.level.segs.keys()) w.set(id, (w.get(id) ?? 0) * 0.5 + ((dens.get(id) ?? 0) / top) * 0.7)
  }
  return w
}

/** Per run: recent threat (health x seconds) on each channel, fading wave by wave. */
const PRESENCE = new WeakMap<Sim, Map<string, number>>()

function trackPresence(sim: Sim, dt: number) {
  let m = PRESENCE.get(sim)
  if (!m) PRESENCE.set(sim, (m = new Map()))
  for (const e of sim.enemies) m.set(e.seg.id, (m.get(e.seg.id) ?? 0) + (e.hp + e.shell) * e.def.weight * dt)
}

function fadePresence(sim: Sim) {
  const m = PRESENCE.get(sim)
  if (m) for (const [id, v] of m) m.set(id, v * 0.6)
}

function padScore(sim: Sim, pad: number, range: number, wave: number): number {
  const p = sim.pads[pad]
  let s = 0
  for (const [id, wt] of segWeights(sim, wave)) s += coverage(sim, id, p.x, p.y, range) * wt
  return s
}

function effDps(t: Tower, e: Enemy): number {
  const st = t.stats
  let dps = 0
  if (t.def.kind === 'beam') dps = st.damage * st.beams * (st.beamLine ? 1.6 : 1)
  else if (t.def.kind === 'pulse') dps = (st.damage + st.slow * 3) / st.interval
  else if (t.def.kind === 'garden') dps = st.mothEvery ? st.damage / st.mothEvery : 0
  else dps = (st.damage * st.count * Math.min(st.pierce, 3) * (st.splash ? 2.2 : 1) * (st.cluster ? 2 : 1)) / st.interval
  dps *= t.rateMul
  if (t.def.family === e.def.family) dps *= 1.5
  if (e.shell > 0 && !st.heavy) dps *= 0.25
  if (e.def.hidden && !st.detect && t.id !== 'owl' && !e.revealedPerm) dps *= 0.45
  return dps
}

/** Expected damage keepers can land on this Mope along these channels, shared out by how crowded they are. */
function pathDamage(sim: Sim, segIds: string[], e: Enemy): number {
  let score = 0
  let crowd = 0
  for (const segId of segIds) {
    for (const t of sim.towers) {
      const cov = coverage(sim, segId, t.x, t.y, sim.effRange(t))
      if (cov > 0) score += effDps(t, e) * (cov / Math.max(20, e.speedBase))
    }
    for (const o of sim.enemies) if (o.seg.id === segId) crowd += o.hp + o.shell
  }
  return score / (1 + crowd / 300)
}

/** The short, double-glow branch of a lock. */
const richDir = (sim: Sim, g: GateState): 0 | 1 => ((sim.challenge.compact ? !!sim.level.segs.get(g.def.outs[0])!.feature : sim.level.segs.get(g.def.outs[0])!.bonus > 1) ? 0 : 1)

/** Greed with judgment: a rich run only for a Mope its keepers will surely cheer up (escapees there cost double). */
function surelyDies(sim: Sim, g: GateState, rich: 0 | 1, e: Enemy): boolean {
  if (e.def.boss || e.def.split) return false
  const runId = g.def.outs[rich]
  const run = sim.level.segs.get(runId)!
  const segs = [runId]
  if ('seg' in run.next) segs.push(run.next.seg)
  // like a player watching the run: if anything there is getting deep, it is not safe
  let crowd = 0
  for (const o of sim.enemies) {
    if (o === e) continue
    if (o.seg.id === runId) {
      if (o.s > run.line.length * 0.5) return false
      crowd++
    } else if (segs.includes(o.seg.id)) crowd++
    else if ('gate' in o.seg.next && o.seg.next.gate === g.def.id && o.seg.line.length - o.s < o.speedNow * 2) crowd++
  }
  // the Mill wheel cracks shells partway down, so only part of the shell must be chipped through
  const need = e.hp + e.shell * (run.feature?.kind === 'crack' ? 0.3 : 1)
  return pathDamage(sim, segs, e) / (1 + crowd * 0.5) >= need * 2
}

/** Where a careful player sends this Mope at this lock. */
function wantDir(sim: Sim, g: GateState, e: Enemy, greed: boolean): 0 | 1 {
  const rich = richDir(sim, g)
  const safe: 0 | 1 = rich ? 0 : 1
  // landmarks: Veils to the Lantern bridge, shells to the Mill wheel
  const ft = sim.level.segs.get(g.def.outs[rich])!.feature
  if (ft?.kind === 'reveal' && e.def.hidden && !e.revealedPerm) return rich
  if (ft?.kind === 'crack' && e.shell > 0) return rich
  if (!sim.challenge.compact && greed && surelyDies(sim, g, rich, e)) return rich
  return safe
}

/** How far ahead (seconds) the router looks: a flip holds for at least the lock's cooldown. */
const WINDOW = 1.1

/** A planning-only player: compare built coverage once between waves, never sort live enemies. */
function planRoutes(sim: Sim) {
  for (const gate of sim.gates) {
    if (sim.gateLocked(gate)) continue
    const score = (dir: 0 | 1) => {
      const plan = routeCoverage(sim, gate, dir)
      const branch = plan.segments[0]
      return plan.branchTowers.reduce((sum, t) => {
        const s = t.stats
        const power = t.id === 'beam' ? s.damage * s.beams * (s.beamLine ? 1.6 : 1)
          : (s.damage * s.count * Math.min(s.pierce, 3) * (s.splash ? 2.2 : 1) + s.slow * 8) / s.interval
        return sum + coveredLength(branch, t.x, t.y, sim.effRange(t)) * power
      }, 0)
    }
    const left = score(0), right = score(1)
    if (Math.max(left, right) === 0) continue
    const dir = left > right ? 0 : 1
    if (gate.state !== dir) sim.flipGate(gate)
  }
}

function route(sim: Sim, mode: BotOpts['router'], rng: () => number, greed = true, parkFrom = 0) {
  if (mode === 'park' && sim.wave < parkFrom) mode = 'smart'
  for (const g of sim.gates) {
    if (!sim.canFlip(g)) continue
    if (mode === 'random') {
      if (rng() < 0.02) sim.flipGate(g)
      continue
    }
    if (mode === 'park') {
      if (g.state !== richDir(sim, g)) sim.flipGate(g)
      continue
    }
    // a boss is close: set the lock to the long loop before it jams
    const safe: 0 | 1 = richDir(sim, g) ? 0 : 1
    const boss = sim.enemies.some((e) => {
      if (!e.def.jams) return false
      const d = sim.distanceToGate(e, g.def.id)
      return d !== null && d < 220
    })
    if (boss) {
      if (g.state !== safe) sim.flipGate(g)
      continue
    }
    // vote over the Mopes that will cross before the lock can flip again, weighted by the light at stake
    const votes = [0, 0]
    let next: Enemy | null = null
    let best = Infinity
    for (const e of sim.enemies) {
      const nx = e.seg.next
      if (!('gate' in nx) || nx.gate !== g.def.id) continue
      const d = e.seg.line.length - e.s
      if (d < best && d < 130) {
        best = d
        next = e
      }
      if (d < Math.max(24, e.speedNow * WINDOW)) votes[wantDir(sim, g, e, greed)] += e.def.weight
    }
    if (!votes[0] && !votes[1] && next) votes[wantDir(sim, g, next, greed)] += 1
    if (votes[0] === votes[1]) continue
    const want: 0 | 1 = votes[1] > votes[0] ? 1 : 0
    if (want !== g.state) sim.flipGate(g)
  }
}

/** What the next two waves demand. */
function needs(sim: Sim) {
  const n: Record<string, number> = { shell: 0, veil: 0, swarm: 0, fast: 0, big: 0, count: 0 }
  for (let w = sim.wave + 1; w <= Math.min(sim.wave + 2, FINAL_WAVE + 50); w++) {
    const def = sim.waveDef(w)
    for (const g of def.groups) {
      const t = g.type
      n.count += g.count
      if (t === 'shell' || t === 'vshell' || (sim.challenge.compact && (t === 'skiff' || t === 'reedling'))) n.shell += g.count
      if (t === 'veil' || t === 'vshell') n.veil += g.count
      if (t === 'wisp') n.swarm += g.count
      if (t === 'skitter') n.fast += g.count
      if (t === 'bloat' || t === 'toad' || t === 'gloom' || t === 'mender' || (sim.challenge.compact && (t === 'warden' || t === 'bloomheart'))) n.big += g.count * (t === 'toad' ? 20 : t === 'gloom' ? 60 : 1)
    }
  }
  return n
}

function chooseType(sim: Sim, o: BotOpts): TowerId {
  // everyone opens with cheap sparks so wave 1 is covered
  if (sim.towers.filter((t) => t.id !== 'garden').length < 2 && !(o.ban ?? []).includes('wick') && sim.keeperAllowed('wick')) return 'wick'
  const have = (id: TowerId) => sim.towers.filter((t) => t.id === id).length
  const n = needs(sim)
  if (sim.challenge.compact && n.veil > 0 && !sim.towers.some(t => t.id === 'owl') && !(o.ban ?? []).includes('owl') && sim.keeperAllowed('owl')) return 'owl'
  const want: [TowerId, number][] = []
  const ok = (id: TowerId) => !(o.ban ?? []).includes(id) && sim.keeperAllowed(id)
  const heavy = sim.towers.filter((t) => t.stats.heavy).length
  if (n.shell > 0 && heavy < 1 + sim.wave / 7) want.push(['cracker', 3], ['beam', 2])
  if (n.veil > 0 && have('owl') < 1 + Math.floor(sim.wave / 10)) want.push(['owl', 4])
  if (n.swarm > 0 && have('cracker') < 2) want.push(['cracker', 3])
  if (n.fast > 0 && have('bell') < 1 + Math.floor(sim.wave / 12)) want.push(['bell', 2])
  if (n.big > 8 && have('beam') < 1 + Math.floor(sim.wave / 8)) want.push(['beam', 3])
  want.push(['wick', 1], ['cracker', 1], ['beam', 0.8], ['bell', 0.5], ['owl', 0.5])
  if (o.mix.storm && !have('storm')) want.push(['storm', 4])
  if (o.mix.ballista && !have('ballista')) want.push(['ballista', 4])
  let best: TowerId = (['wick', 'cracker', 'beam', 'bell', 'owl'] as TowerId[]).find(ok) ?? 'wick'
  let bs = -1
  for (const [id, w] of want) {
    if (!ok(id)) continue
    if (sim.challenge.compact && ((id === 'owl' && have('owl') >= 2) || (id === 'bell' && have('bell') >= 2))) continue
    const s = w * (o.mix[id] ?? 1)
    if (s > bs) {
      bs = s
      best = id
    }
  }
  return best
}

function bestPad(sim: Sim, id: TowerId, wave: number): number {
  let best = -1
  let bs = -1
  const r = TOWERS[id].base.range ?? 150
  for (let i = 0; i < sim.pads.length; i++) {
    if (sim.pads[i].tower || !sim.padAvailable(i)) continue
    let s = id === 'garden' ? 1000 - padScore(sim, i, 150, wave) : padScore(sim, i, r, wave)
    if (id === 'owl' || id === 'bell') s *= 1 // coverage matters equally
    if (s > bs) {
      bs = s
      best = i
    }
  }
  return best
}

function spend(sim: Sim, o: BotOpts) {
  if (o.freezeAt !== undefined && sim.wave >= o.freezeAt) return
  for (let guard = 0; guard < 20; guard++) {
    if (sim.challenge.compact && !sim.waveActive && !sim.pads.some((p, i) => !p.tower && sim.padAvailable(i))) {
      const want = chooseType(sim, o)
      const candidates = sim.pads.map((_, i) => ({ i, cost: sim.plotCost(i), score: padScore(sim, i, TOWERS[want].base.range ?? 150, sim.wave + 1) }))
        .filter(p => p.cost !== null && sim.glow >= p.cost + TOWERS[want].cost)
        .sort((a, b) => b.score - a.score)
      if (candidates.length && sim.towers.length < (o.maxTowers ?? 14) + (o.gardens ?? 0)) { sim.unlockPlot(candidates[0].i); continue }
    }
    const gardens = sim.towers.filter((t) => t.id === 'garden').length
    // early gardens
    if (gardens < (o.gardens ?? 0) && sim.wave >= 2 && !(o.ban ?? []).includes('garden') && sim.keeperAllowed('garden')) {
      if (sim.glow < TOWERS.garden.cost) return
      const pad = bestPad(sim, 'garden', sim.wave + 1)
      if (pad >= 0) { sim.build(pad, 'garden'); continue }
      if (!sim.challenge.compact) continue
    }
    const nonEco = sim.towers.filter((t) => t.id !== 'garden').length
    const reserved = o.reserveLate ? (['storm', 'ballista'] as const).filter(id => o.mix[id] && !sim.keeperAllowed(id)).length : 0
    const target = Math.min((o.maxTowers ?? 14) - reserved, 2 + Math.floor(sim.wave * 0.55))
    const wantType = chooseType(sim, o)
    const n = needs(sim)
    const urgent = (n.shell > 0 && !sim.towers.some((t) => t.stats.heavy)) || (n.veil > 0 && !sim.towers.some((t) => t.id === 'owl' || t.stats.detect))
    if ((nonEco < target || urgent) && sim.pads.some((p, i) => !p.tower && (!sim.challenge.compact || sim.padAvailable(i)))) {
      if (sim.glow < TOWERS[wantType].cost) return
      const pad = bestPad(sim, wantType, sim.wave + 1)
      if (pad < 0) return
      sim.build(pad, wantType)
      continue
    }
    // charms: route shells toward the branch with the most heavy damage
    if (o.charms && sim.charmsAllowed && sim.glow >= CHARM_COST + 150) {
      const g = sim.gates.find((q) => !q.charm && !sim.gateLocked(q))
      if (g) {
        const d = ([0, 1] as const).find((k) => sim.level.segs.get(g.def.outs[k])!.feature)
        if (d !== undefined) {
          const kind = sim.level.segs.get(g.def.outs[d])!.feature!.kind
          const trait: CharmTrait = kind === 'reveal' ? 'veil' : 'shell'
          sim.setCharm(g, trait, d)
          continue
        }
      }
    }
    // upgrade the cheapest useful upgrade, preferring the bot's path
    let pick: { t: Tower; path: 0 | 1; cost: number } | null = null
    for (const t of sim.towers) {
      const pref = o.paths?.[t.id]
      for (const path of [0, 1] as const) {
        const c = sim.upgradeCost(t, path)
        if (c == null) continue
        if (pref !== undefined && path !== pref && (path === 0 ? t.a : t.b) >= 1) continue
        const w = t.id === 'garden' ? 0.8 : 1
        const score = c / w
        if (!pick || score < pick.cost) pick = { t, path: pref !== undefined && sim.upgradeCost(t, pref) != null ? pref : path, cost: c }
      }
    }
    if (pick && sim.glow >= (sim.upgradeCost(pick.t, pick.path) ?? 1e9)) {
      sim.upgrade(pick.t, pick.path)
      continue
    }
    if (sim.challenge.compact) {
      const refinable = sim.towers.filter(t => sim.refinementCost(t) !== null).sort((a, b) => (a.id === 'garden' ? 1 : 0) - (b.id === 'garden' ? 1 : 0))
      if (refinable.some(t => sim.refine(t))) continue
    }
    if (!pick && (!reserved || nonEco < target) && sim.pads.some((p, i) => !p.tower && (!sim.challenge.compact || sim.padAvailable(i)))) {
      if (sim.glow < TOWERS[wantType].cost) return
      const pad = bestPad(sim, wantType, sim.wave + 1)
      if (pad >= 0) sim.build(pad, wantType)
      continue
    }
    return
  }
}

/** hook: called every step before events are cleared (diagnostics). */
export function runBot(o: BotOpts, difficulty: Sim['difficulty'], seed = 7, hook?: (sim: Sim) => void, challenge: Challenge = {}, initial?: SaveSnapshot): BotResult {
  const sim = initial ? Sim.restore(initial) : new Sim(difficulty, challenge, seed)
  let rs = seed * 7919
  const rng = () => ((rs = (rs * 16807) % 2147483647) / 2147483647)
  // other seeds also nudge the bot's tempo, so a seed ensemble shows how robust a result is (seed 7: none)
  const jit = [1, 0.9, 1.1, 0.95, 1.05][Math.abs(Math.round((seed - 7) / 13)) % 5]
  const reactionSteps = Math.max(1, Math.round(((o.reaction ?? 0.25) * jit) / DT))
  const spendSteps = Math.round(30 * jit)
  const waveLeaks: Record<number, number> = {}
  const margin: Record<number, number> = {}
  let lastLives = sim.lives
  let steps = 0
  let spent = 0
  let richLeak = 0
  let bank = 0
  let gloomSeen = false
  let splitAt = -1
  let splitHp = 0
  let gloomGone = -1
  while (!sim.over && sim.stats.time < 60 * 60) {
    if (!sim.waveActive) {
      if (o.router === 'plan') planRoutes(sim)
      const g0 = sim.glow
      // between waves a player spends until nothing more is worth buying (a tide opens with a large bank)
      for (let i = 0; i < 12; i++) {
        const before = sim.glow
        spend(sim, o)
        if (sim.glow === before) break
      }
      spent += Math.max(0, g0 - sim.glow)
      if (o.router === 'plan') planRoutes(sim)
      if (sim.wave >= sim.finalWave) break
      if (sim.wave + 1 >= 15) bank = Math.max(bank, sim.glow)
      fadePresence(sim)
      sim.startWave()
    } else if (o.early && sim.canStartWave() && sim.enemies.length < 6 && sim.wave < sim.finalWave) {
      sim.startWave()
    }
    sim.step(DT)
    steps++
    if (steps % 10 === 0) trackPresence(sim, DT * 10)
    if (steps % reactionSteps === 0 && o.router !== 'none' && o.router !== 'plan') route(sim, o.router, rng, o.greed ?? true, o.parkFrom)
    if (steps % spendSteps === 0) {
      const g0 = sim.glow
      spend(sim, o)
      spent += Math.max(0, g0 - sim.glow)
    }
    hook?.(sim)
    for (const ev of sim.events) {
      if (ev.t === 'leak' && ev.rich) richLeak += ev.weight
      if (ev.t === 'split') {
        splitAt = sim.time
        const half = sim.enemies.find((e) => e.def.id === 'gloom')
        splitHp = half ? half.hp / half.maxHp : 0
      }
    }
    const gloom = sim.enemies.some((e) => e.def.id === 'gloom' && e.alive)
    if (gloom) gloomSeen = true
    else if (gloomSeen && gloomGone < 0) gloomGone = sim.time
    sim.events.length = 0
    for (const e of sim.enemies) {
      const m = Math.round(Math.max(0, e.remaining) / 12)
      if (margin[e.wave] === undefined || m < margin[e.wave]) margin[e.wave] = m
    }
    if (sim.lives < lastLives) {
      waveLeaks[sim.wave] = (waveLeaks[sim.wave] ?? 0) + (lastLives - sim.lives)
      lastLives = sim.lives
    }
  }
  const counts: Record<string, number> = {}
  for (const t of sim.towers) counts[t.id + (t.a || t.b ? `${t.a}${t.b}` : '')] = (counts[t.id + (t.a || t.b ? `${t.a}${t.b}` : '')] ?? 0) + 1
  return {
    name: o.name,
    outcome: sim.over === 'won' ? 'WON' : sim.over === 'lost' ? 'lost' : 'stuck',
    wave: sim.wave,
    lives: sim.lives,
    maxLives: sim.maxLives,
    leaks: sim.stats.leaksBy,
    flips: sim.stats.flips,
    towers: sim.towers.map((t) => `${t.id}${t.a}${t.b}`).join(' '),
    minutes: Math.round((sim.stats.time / 60) * 10) / 10,
    waveLeaks,
    spent,
    margin,
    richLeak,
    bank,
    earned: sim.stats.glowEarned,
    gloom: !gloomSeen
      ? '-'
      : splitAt < 0
        ? gloomGone >= 0 && !sim.stats.leaksBy.gloom ? 'cheered BEFORE split' : 'no split'
        : `split@${Math.round(splitHp * 100)}%` + (gloomGone >= 0 && !sim.stats.leaksBy.gloom ? ` halves ${Math.round(gloomGone - splitAt)}s` : sim.stats.leaksBy.gloom ? ' leaked' : ''),
  }
}
