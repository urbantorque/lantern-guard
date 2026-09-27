/**
 * Simulation self-test: saves, wave bookkeeping and the QA fixes that live in
 * the deterministic sim. Prints PASS/FAIL per check and exits non-zero on any
 * failure.
 *
 *   npx tsx scripts/selftest.ts
 */
import { DIFFICULTY, ENEMIES, type TowerId } from '../src/game/defs'
import { DT, FINAL_WAVE, Sim, type SaveSnapshot, type SaveSnapshotV1, type SaveSnapshotV2, type SimEvent } from '../src/game/sim'
import { dailyTide, mopeValue, offerFor, TIDE_FROM, tideWave, waveBudget, weeklyNight } from '../src/game/tides'
import { WAVES } from '../src/game/waves'

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const seg = (sim: Sim, id: string) => sim.level.segs.get(id)!
const roundTrip = (sim: Sim) => Sim.restore(JSON.parse(JSON.stringify(sim.snapshot())) as SaveSnapshot)
const has = (evs: SimEvent[], t: SimEvent['t']) => evs.some((e) => e.t === t)
/** Distance along a channel of its point closest to (x, y). */
function nearest(sim: Sim, id: string, x: number, y: number): number {
  const line = seg(sim, id).line
  const p = { x: 0, y: 0, tx: 0, ty: 0 }
  let best = 0
  let bd = Infinity
  for (let s = 0; s < line.length; s += 2) {
    line.at(s, p)
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d < bd) {
      bd = d
      best = s
    }
  }
  return best
}

// ------------------------------------------------------------------ 1. mid-wave save round trip

/**
 * Waves 24 and 25 against a thin board with every kind of state a save must carry: burns, a beam, stuns,
 * brittle, dives, moths (seeded draws), clusters. A deep light pool lets Old Gloom reach its split.
 */
function lateGame(): Sim {
  const sim = new Sim('standard', {}, 11)
  sim.glow = 1e6
  const plan: [number, TowerId, number, number][] = [
    [4, 'bell', 3, 1],
    [9, 'garden', 1, 3],
    [16, 'owl', 3, 1],
    [0, 'cracker', 3, 1],
    [17, 'cracker', 1, 3],
    [10, 'wick', 1, 3],
    [2, 'wick', 3, 1],
    [11, 'bell', 1, 2],
    [15, 'beam', 0, 1],
  ]
  for (const [pad, id, a, b] of plan) {
    const t = sim.build(pad, id)!
    for (let i = 0; i < a; i++) sim.upgrade(t, 0)
    for (let i = 0; i < b; i++) sim.upgrade(t, 1)
  }
  sim.glow = 1500
  sim.lives = 5000
  sim.wave = FINAL_WAVE - 2
  sim.openSources.add('west')
  sim.recomputeRoutes()
  sim.events.length = 0
  return sim
}

/** Identical player input for both runs: an early call, lock flips, a mid-wave build. */
function drive(sim: Sim, step: number) {
  if (step === 0) sim.startWave()
  // call the final wave as soon as wave 24 stops spawning: two waves in flight
  if (step >= 60 * 12 && sim.canStartWave() && sim.wave < FINAL_WAVE) sim.startWave()
  if (step % 170 === 0) sim.flipGate(sim.gates[0])
  if (step % 290 === 0) sim.flipGate(sim.gates[1])
  if (step === 60 * 30) sim.build(14, 'cracker')
}

{
  const T1 = 60 * 25 // mid-wave, two waves in flight, Old Gloom still upstream
  const T2 = 60 * 75 // after Old Gloom has torn in two
  const END = 60 * 125
  const a = lateGame()
  let b = lateGame()
  let atT1 = { enemies: 0, projs: 0, pending: 0, bytes: 0 }
  let splitAfterT1 = false
  let restoredSplit = false
  let uidOk = true
  let checkpoints = 0
  let firstDiff = -1
  let midA = ''
  let midB = ''
  for (let step = 0; step < END; step++) {
    if (step === T1 || step === T2) {
      const snap = b.snapshot()
      if (step === T1) atT1 = { enemies: b.enemies.length, projs: b.projs.length, pending: b.wavesPending.size, bytes: JSON.stringify(snap).length }
      b = roundTrip(b)
      if (step === T2) restoredSplit = b.enemies.filter((e) => e.def.id === 'gloom').length === 2 && b.enemies.every((e) => e.def.id !== 'gloom' || !e.def.splitAtGate)
      // new Mopes and keepers after a restore never reuse a uid (probed on a throwaway copy)
      const c = roundTrip(b)
      const probe = c.spawnEnemy('drip', seg(c, 'n0'), 0, c.wave, true)
      c.glow = 1e6
      const pad = c.pads.findIndex((p) => !p.tower)
      const tw = pad >= 0 ? c.build(pad, 'wick') : null
      const ids = [...c.enemies.map((e) => e.uid), ...c.towers.map((t) => t.uid), ...c.projs.flatMap((p) => p.hit)]
      uidOk &&= new Set(c.enemies.map((e) => e.uid)).size === c.enemies.length && ids.filter((u) => u === probe.uid).length === 1 && (!tw || ids.filter((u) => u === tw.uid).length === 1)
    }
    drive(a, step)
    drive(b, step)
    a.step(DT)
    b.step(DT)
    if (step > T1 && step < T2 && a.events.some((e) => e.t === 'split')) splitAfterT1 = true
    a.events.length = 0
    b.events.length = 0
    // compare the whole state every second after the first restore, not only the (converged) end
    if (step >= T1 && step % 60 === 0) {
      checkpoints++
      if (firstDiff < 0 && JSON.stringify(a.snapshot()) !== JSON.stringify(b.snapshot())) firstDiff = step / 60
      if (step === T1 + 60 * 10) {
        midA = `lives ${a.lives} glow ${a.glow} Mopes ${a.enemies.length} wave ${a.wave}`
        midB = `lives ${b.lives} glow ${b.glow} Mopes ${b.enemies.length} wave ${b.wave}`
      }
    }
  }
  check(
    'mid-wave snapshot is a busy moment',
    atT1.enemies > 20 && atT1.projs > 0 && atT1.pending === 2,
    `${atT1.enemies} Mopes, ${atT1.projs} shots, ${atT1.pending} waves pending, ${(atT1.bytes / 1024).toFixed(1)} KB`,
  )
  check('Old Gloom split inside the compared window', splitAfterT1)
  const sa = `lives ${a.lives} glow ${a.glow} Mopes ${a.enemies.length} wave ${a.wave} over ${a.over}`
  const sb = `lives ${b.lives} glow ${b.glow} Mopes ${b.enemies.length} wave ${b.wave} over ${b.over}`
  check('restored run matches uninterrupted run 10 s after restore (lives/glow/Mopes/wave)', midA === midB, `uninterrupted: ${midA} | restored: ${midB}`)
  check('restored run matches uninterrupted run at the end (lives/glow/Mopes/wave)', sa === sb, `uninterrupted: ${sa} | restored twice: ${sb}`)
  check('restored run is bit-identical at every 1 s checkpoint (full snapshot)', firstDiff < 0, firstDiff < 0 ? `${checkpoints} checkpoints` : `first difference at ${firstDiff}s`)
  check('restored Old Gloom halves do not split again', restoredSplit)
  check('uids stay unique after restore', uidOk)
}

// ------------------------------------------------------------------ 2. v1 saves still restore

{
  const stats = JSON.parse(JSON.stringify(new Sim('standard').stats))
  stats.pops = 321
  const v1: SaveSnapshotV1 = {
    v: 1,
    difficulty: 'standard',
    challenge: {},
    wave: 12,
    glow: 555,
    lives: 20,
    seed: 7,
    towers: [
      { id: 'wick', pad: 3, a: 1, b: 0, priority: 'first', spent: 205, pops: 40 },
      { id: 'cracker', pad: 10, a: 0, b: 1, priority: 'strong', spent: 320, pops: 12 },
      { id: 'owl', pad: 5, a: 0, b: 0, priority: 'first', spent: 170, pops: 3 },
    ],
    gates: [
      { state: 1, charm: null },
      { state: 0, charm: { trait: 'shell', dir: 0 } },
    ],
    stats,
    won: false,
  }
  const s = Sim.restore(JSON.parse(JSON.stringify(v1)) as SaveSnapshot)
  const shape =
    s.wave === 12 && s.glow === 555 && s.lives === 20 && s.towers.length === 3 && s.towers[1].priority === 'strong' && s.gates[0].state === 1 && s.gates[1].charm?.trait === 'shell' && s.stats.pops === 321
  check('v1 save restores its fields', shape)
  check('v1 save opens the West Sluice from wave 11', s.openSources.has('west'))
  check('v1 save is between waves and can start the next', s.canStartWave() && !s.freeplay && s.freeplayFrom === 0 && s.enemies.length === 0)
  let ended = false
  let err = ''
  try {
    s.lives = 500 // the three saved keepers cannot hold wave 13 alone; this only checks the run goes on
    s.startWave()
    for (let i = 0; i < 60 * 150 && !s.over; i++) {
      s.step(DT)
      if (has(s.events, 'waveEnd')) ended = true
      s.events.length = 0
      if (ended) break
    }
  } catch (e) {
    err = String(e)
  }
  check('v1 save plays on through a wave', ended && !err, err || `wave ${s.wave}, lives ${s.lives}`)
  check('a restored v1 run saves as v2', s.snapshot().v === 2)
}

// ------------------------------------------------------------------ 3. victory waits for stragglers

{
  const s = new Sim('standard')
  s.wave = FINAL_WAVE
  s.wavesPending = new Set([FINAL_WAVE - 1, FINAL_WAVE])
  s.waveAlive.set(FINAL_WAVE - 1, 0)
  s.waveAlive.set(FINAL_WAVE, 0)
  const straggler = s.spawnEnemy('drip', seg(s, 'n0'), 0, FINAL_WAVE - 1)
  s.step(DT)
  const endedFinal = s.events.some((e) => e.t === 'waveEnd' && e.n === FINAL_WAVE)
  check('no victory while an early-called straggler lives', endedFinal && s.over === null && !s.won && !has(s.events, 'victory'))
  s.events.length = 0
  s.damage(straggler, 999, true, null)
  s.step(DT)
  const order = s.events.map((e) => e.t).filter((t) => t === 'waveEnd' || t === 'victory')
  check('victory once the straggler is cleared', s.over === 'won' && s.won && order.join(',') === 'waveEnd,victory', order.join(','))
  s.continueFreeplay()
  const r = roundTrip(s)
  check('free play records where it began (and survives a save)', s.freeplayFrom === FINAL_WAVE && r.freeplayFrom === FINAL_WAVE && r.freeplay && r.won && r.canStartWave())
}

// ------------------------------------------------------------------ 4. no wave-end payout after defeat, neutral final frame

{
  const s = new Sim('standard')
  s.glow = 5000
  const garden = s.build(16, 'garden')!
  for (let i = 0; i < 3; i++) s.upgrade(garden, 0) // Moon Orchard: income and +1 light a wave
  s.wave = 12
  s.lives = 1
  s.wavesPending = new Set([12])
  s.waveAlive.set(12, 0)
  const h = seg(s, 'h')
  s.spawnEnemy('drip', h, h.line.length - 0.2, 12)
  // a Gloomtoad (from an older wave) sitting on the Upper Lock jams it
  const n0 = seg(s, 'n0')
  s.spawnEnemy('toad', n0, n0.line.length - 4, 11)
  s.events.length = 0
  const glow0 = s.glow
  s.step(DT)
  const evs = s.events.map((e) => e.t)
  check('defeat pays no wave-end bonus, income or light', s.over === 'lost' && s.lives === 0 && s.glow === glow0 && !evs.includes('waveEnd') && !evs.includes('income') && !evs.includes('life'), evs.join(','))
  check('locks are unjammed on the final frame', evs.includes('jam') && s.gates.every((g) => !g.jammed) && s.beamIntensity === 0)
}

// ------------------------------------------------------------------ 5. burn, heat and hit flash

{
  const s = new Sim('standard')
  s.wave = 6
  const e = s.spawnEnemy('bloat', seg(s, 'w1'), 60, 6)
  e.hp = e.maxHp = 1000
  e.burnT = 0.1
  e.burnDps = 4
  for (let i = 0; i < 12; i++) s.step(DT)
  check('burnDps resets when the burn ends', e.burnT <= 0 && e.burnDps === 0, `burnT ${e.burnT.toFixed(3)} burnDps ${e.burnDps}`)
  // a weak burn later burns weakly
  e.burnT = 1
  e.burnDps = Math.max(e.burnDps, 1)
  const hp0 = e.hp
  for (let i = 0; i < 60; i++) s.step(DT)
  check('a later weak burn deals its own damage', Math.abs(hp0 - e.hp - 1) < 0.05, `took ${(hp0 - e.hp).toFixed(3)}`)

  e.hitT = 0
  e.heatT = 0
  s.damage(e, 0.01, true, null, true)
  check('continuous damage warms (heatT) without a white flash', e.hitT === 0 && e.heatT === 0.15)
  s.damage(e, 0.01, true, null)
  const first = e.hitT
  e.hitT = 0
  s.damage(e, 0.01, true, null)
  const throttled = e.hitT
  for (let i = 0; i < 13; i++) s.step(DT)
  s.damage(e, 0.01, true, null)
  check('discrete hits flash ~0.07 s, at most every 0.2 s', first === 0.07 && throttled === 0 && e.hitT === 0.07, `${first} / ${throttled} / ${e.hitT}`)
  let heatGone = false
  for (let i = 0; i < 12; i++) s.step(DT)
  heatGone = e.heatT <= 0
  check('heat fades once continuous damage stops', heatGone)
}

// ------------------------------------------------------------------ 6. Old Gloom's split

{
  const s = new Sim('standard')
  s.wave = FINAL_WAVE - 1 // (wave 25 itself with nothing pending would already count as won)
  const m1 = seg(s, 'm1')
  const g = s.spawnEnemy('gloom', m1, m1.line.length - 1, FINAL_WAVE)
  const full = g.maxHp
  g.route = 'u0'
  s.events.length = 0
  const evs: SimEvent[] = []
  for (let i = 0; i < 30; i++) {
    s.step(DT)
    evs.push(...s.events)
    s.events.length = 0
  }
  const halves = s.enemies.filter((e) => e.def.id === 'gloom')
  const bossSpawns = evs.filter((e) => e.t === 'spawn' && e.boss)
  check('split emits "split", no second boss "spawn" and no "phase"', has(evs, 'split') && bossSpawns.length === 0 && !has(evs, 'phase'), evs.map((e) => e.t).join(','))
  check(
    'both halves draw at 0.8, share the 520 reward and half the toughness',
    halves.length === 2 && halves.every((e) => e.visScale === 0.8 && e.reward === 260 && e.maxHp === full / 2),
    halves.map((e) => `${e.seg.id} r${e.reward} v${e.visScale} hp${e.maxHp}`).join(' '),
  )
  check('each half files under its own route', halves.map((e) => e.route).sort().join(',') === 'u0l0,u0l1')
  check('the shroud falls away at the split', halves.every((e) => !e.shrouded))
  const mill = halves.find((e) => e.seg.id === 'w2')
  const east = halves.find((e) => e.seg.id === 'e2')
  check('the half on the Mill run is rich, the East loop half is not', !!mill?.rich && !!east && !east.rich)
}

// ------------------------------------------------------------------ 10. Old Gloom's shroud and the boss ramp

{
  const s = new Sim('standard')
  s.wave = FINAL_WAVE - 1
  const g = s.spawnEnemy('gloom', seg(s, 'w1'), 100, FINAL_WAVE)
  const hp0 = g.hp
  s.damage(g, 100, true, null)
  check('a shrouded Old Gloom takes 15% damage', g.shrouded && Math.abs(hp0 - g.hp - 15) < 1e-9, `took ${(hp0 - g.hp).toFixed(3)}`)
  // burns tick through damage() too, so they are scaled the same way
  g.burnT = 1
  g.burnDps = 10
  const hp1 = g.hp
  for (let i = 0; i < 60; i++) s.step(DT)
  check('burns on a shrouded Old Gloom are scaled too', Math.abs(hp1 - g.hp - 1.5) < 0.05, `burned ${(hp1 - g.hp).toFixed(3)}`)
  s.damage(g, 1e9, true, null)
  check('the shroud never lets Old Gloom fall before its split', g.alive && Math.abs(g.hp - g.maxHp * 0.25) < 1e-6, `hp ${g.hp.toFixed(1)} of ${g.maxHp}`)
  const r = roundTrip(s).enemies.find((e) => e.def.id === 'gloom')
  check('the shroud survives a save', !!r && r.shrouded && r.hp === g.hp)
  const d = DIFFICULTY.standard
  const t10 = s.spawnEnemy('toad', seg(s, 'n0'), 0, 10)
  const t20 = s.spawnEnemy('toad', seg(s, 'n0'), 0, 20)
  const d20 = s.spawnEnemy('drip', seg(s, 'n0'), 0, 20)
  check('bosses ramp gently after wave 10', t10.maxHp === 200 && Math.abs(t20.maxHp - 200 * (1 + 10 * d.bossLate)) < 1e-9, `${t10.maxHp} / ${t20.maxHp}`)
  check('ordinary Mopes keep their own late ramp after wave 11', Math.abs(d20.maxHp - 2 * (1 + 9 * d.late)) < 1e-9, `${d20.maxHp}`)
}

// ------------------------------------------------------------------ 11. rich runs: escapees cost double

{
  const s = new Sim('standard')
  s.wave = 12
  s.lives = 25
  s.wavesPending = new Set([12])
  s.waveAlive.set(12, 0)
  const h = seg(s, 'h')
  // three Mopes near the lantern: plain, off the Mill run (rich), and a Shellback that took the Lantern run
  const plain = s.spawnEnemy('drip', h, h.line.length - 0.2, 12)
  const w2 = seg(s, 'w2')
  const viaMill = s.spawnEnemy('drip', w2, w2.line.length - 0.2, 12)
  const viaLantern = s.spawnEnemy('shell', h, h.line.length - 0.2, 12)
  viaLantern.route = 'u1l1'
  viaLantern.rich = true
  s.events.length = 0
  const leaks: Extract<SimEvent, { t: 'leak' }>[] = []
  for (let i = 0; i < 120; i++) {
    s.step(DT)
    for (const ev of s.events) if (ev.t === 'leak') leaks.push(ev)
    s.events.length = 0
  }
  check('a Mope is still marked rich after leaving the rich run', viaMill.rich && !plain.rich)
  check('rich escapees cost double light (drip 1, rich drip 2, rich shell 4)', s.lives === 25 - 1 - 2 - 4 && s.stats.leaked === 7, `lives ${s.lives}, leaked ${s.stats.leaked}`)
  check('leak events carry the doubled weight and the rich flag', leaks.map((e) => `${e.weight}${e.rich ? 'r' : ''}`).sort().join(',') === '1,2r,4r', leaks.map((e) => `${e.weight}${e.rich ? 'r' : ''}`).join(','))
  // children and spit inherit the risk
  const b = s.spawnEnemy('bloat', seg(s, 'e1'), 40, 12)
  s.damage(b, 999, true, null)
  const kids = s.enemies.filter((e) => e.def.id === 'drip' && e.seg.id === 'e1')
  check('Bloat children born on a rich run are rich', kids.length === 3 && kids.every((k) => k.rich))
  const toad = s.spawnEnemy('toad', seg(s, 'e2'), 30, 12)
  toad.rich = true
  for (let i = 0; i < 60 * 3; i++) s.step(DT)
  const spat = s.enemies.filter((e) => e.def.id === 'drip' && e.seg.id === 'e2')
  check('Gloomtoad spit inherits the rich flag', spat.length > 0 && spat.every((k) => k.rich))
  // walking onto the Lantern run marks a Mope, and the flag survives a save
  const walker = s.spawnEnemy('drip', seg(s, 'n0'), seg(s, 'n0').line.length - 0.3, 12)
  s.gates[0].state = 1
  s.step(DT)
  s.step(DT)
  const back = roundTrip(s).enemies.find((e) => e.uid === walker.uid)
  check('taking the Lantern run marks a Mope rich, and saves keep it', walker.seg.id === 'e1' && walker.rich && !!back?.rich)
}

// ------------------------------------------------------------------ 12. keeper counters and active time

{
  const s = new Sim('standard')
  s.glow = 1e5
  s.wave = 8
  const bell = s.build(3, 'bell')!
  const owl = s.build(4, 'owl')!
  const garden = s.build(5, 'garden')!
  s.upgrade(garden, 1) // Sweet Nectar: +50% glow for Mopes cheered nearby
  // a Moonbell toll counts every Mope it catches
  const e1 = seg(s, 'e1')
  const at = nearest(s, 'e1', bell.x, bell.y)
  for (let i = 0; i < 3; i++) s.spawnEnemy('bloat', e1, at - 8 + i * 8, 8).hp = 999
  bell.cd = 0
  s.step(DT)
  check('a toll counts each Mope it catches (slowed)', bell.slowed === 3 && bell.tolls === 1, `slowed ${bell.slowed}`)
  // an owl counts each hidden Mope once, not the ones the bridge already revealed
  for (const e of [...s.enemies]) e.alive = false
  s.enemies.length = 0
  const v1 = s.spawnEnemy('veil', e1, 200, 8)
  const v2 = s.spawnEnemy('veil', e1, 210, 8)
  v2.revealedPerm = true
  v1.hp = v2.hp = 999
  for (let i = 0; i < 20; i++) s.step(DT)
  check('an owl counts each hidden Mope it spots once (spotted)', owl.spotted === 1 && v1.owlSeen, `spotted ${owl.spotted}`)
  // a garden counts its wave income and its share of lure bonuses
  for (const e of s.enemies) e.alive = false
  s.enemies = []
  const near = s.spawnEnemy('drip', seg(s, 'w1'), 0, 8)
  near.x = garden.x
  near.y = garden.y
  s.damage(near, 999, true, null)
  check('lure bonuses count toward the garden (earned)', Math.abs(garden.earned - 3 * 0.5) < 1e-9, `earned ${garden.earned}`)
  s.wavesPending = new Set([8])
  s.waveAlive.set(8, 0)
  const before = garden.earned
  s.step(DT)
  check('wave income counts toward the garden (earned)', garden.earned === before + garden.stats.income)
  const snap = JSON.parse(JSON.stringify(s.snapshot())) as SaveSnapshot
  const r = Sim.restore(snap)
  const rt = (id: TowerId) => r.towers.find((t) => t.id === id)!
  check('keeper counters survive a save', rt('bell').slowed === bell.slowed && rt('owl').spotted === owl.spotted && rt('garden').earned === garden.earned)
  // active time only runs with a wave on the water
  const q = new Sim('standard')
  for (let i = 0; i < 60; i++) q.step(DT)
  const idle = q.stats.activeTime
  q.startWave()
  for (let i = 0; i < 60; i++) q.step(DT)
  check('stats.activeTime only counts while a wave is on the water', idle === 0 && Math.abs(q.stats.activeTime - 1) < 1e-9 && Math.abs(q.stats.time - 2) < 1e-9, `${idle} / ${q.stats.activeTime.toFixed(3)} of ${q.stats.time.toFixed(3)}`)
  // an older v2 save without the new fields restores with safe defaults
  s.spawnEnemy('drip', seg(s, 'h'), 5, 8).route = 'u1l1'
  const older = JSON.parse(JSON.stringify(s.snapshot())) as SaveSnapshotV2
  for (const t of older.towers) {
    delete t.slowed
    delete t.spotted
    delete t.earned
  }
  for (const e of older.enemies) {
    delete e.rich
    delete e.shrouded
    delete e.owlSeen
  }
  delete (older.stats as Partial<typeof older.stats>).activeTime
  const o = Sim.restore(older)
  const drip = o.enemies.find((e) => e.route === 'u1l1')
  check('older v2 saves restore with defaults (rich read off the route)', !!drip && drip.rich && o.towers.every((t) => t.slowed === 0 && t.spotted === 0 && t.earned === 0) && o.stats.activeTime === 0)
}

// ------------------------------------------------------------------ 7. children keep route history

{
  const s = new Sim('standard')
  s.wave = 9
  const b = s.spawnEnemy('bloat', seg(s, 'w2'), 60, 9)
  b.route = 'u1l0'
  b.lastGate = 'lower'
  s.damage(b, 999, true, null)
  const kids = s.enemies.filter((e) => e.def.id === 'drip')
  check('Bloat children inherit the route', kids.length === 3 && kids.every((k) => k.route === 'u1l0' && k.lastGate === 'lower'))
  const toad = s.spawnEnemy('toad', seg(s, 'e2'), 30, 10)
  toad.route = 'u0l1'
  toad.lastGate = 'lower'
  for (let i = 0; i < 60 * 3; i++) s.step(DT)
  const spat = s.enemies.filter((e) => e.def.id === 'drip' && e.wave === 10)
  check('Gloomtoad spit inherits the route', spat.length > 0 && spat.every((k) => k.route === 'u0l1'))
}

// ------------------------------------------------------------------ 8. charms on locked gates

{
  const s = new Sim('standard')
  s.glow = 1000
  const lowOk = s.setCharm(s.gates[1], 'shell', 0)
  const upOk = s.setCharm(s.gates[0], 'veil', 1)
  check('charms are refused on locked gates', !lowOk && !upOk && s.glow === 1000 && s.gates.every((g) => g.charm === null))
  s.wave = 4
  check('charms are sold once the gate opens', s.setCharm(s.gates[1], 'shell', 0) && s.glow === 880 && s.gates[1].charm?.trait === 'shell')
}

// ------------------------------------------------------------------ 9. distance to the Lower Lock

{
  const s = new Sim('standard')
  const m1 = seg(s, 'm1').line.length
  const parts = ['w1', 'e1', 'inlet'].map((id) => {
    const e = s.spawnEnemy('drip', seg(s, id), 10, 1)
    const d = s.distanceToGate(e, 'lower')
    const want = seg(s, id).line.length - 10 + m1
    return { id, d, ok: d !== null && Math.abs(d - want) < 0.001 }
  })
  check('distanceToGate reaches the Lower Lock from w1, e1 and the inlet', parts.every((p) => p.ok), parts.map((p) => `${p.id} ${p.d?.toFixed(1)}`).join(', '))
}

// ------------------------------------------------------------------ 13. tides: seeded, budgeted, restorable

{
  const day = dailyTide(new Date(2026, 8, 27))
  const again = dailyTide(new Date(2026, 8, 27))
  const spec = day.challenge.tide!
  const waves = (t: typeof spec) => JSON.stringify(Array.from({ length: FINAL_WAVE - t.from }, (_, i) => tideWave(t, t.from + 1 + i)))
  check('a day always brings the same tide', JSON.stringify(day) === JSON.stringify(again) && waves(spec) === waves(again.challenge.tide!))
  const week = Array.from({ length: 7 }, (_, i) => dailyTide(new Date(2026, 8, 27 + i)))
  check('each day of a week brings its own tide', new Set(week.map((o) => waves(o.challenge.tide!))).size === 7 && week.every((o) => o.rules.length >= 1))
  const weeks = Array.from({ length: 6 }, (_, i) => weeklyNight(new Date(2026, 8, 28 + i * 7)).name)
  check('the weekly rule changes every week', weeks.every((n, i) => i === 0 || n !== weeks[i - 1]), weeks.join(', '))
  check('offers rebuild from their record key', offerFor(day.id)?.name === day.name && offerFor(weeklyNight(new Date(2026, 8, 30)).id)?.id === weeklyNight(new Date(2026, 8, 30)).id)
  // each remixed wave spends about what the handmade wave pays (the first eases in at 80%)
  const worth = (n: number) => tideWave(spec, n).groups.filter((g) => !ENEMIES[g.type].boss).reduce((a, g) => a + g.count * mopeValue(g.type), 0)
  const ratios = Array.from({ length: FINAL_WAVE - spec.from }, (_, i) => spec.from + 1 + i).map((n) => worth(n) / (waveBudget(n) * (n === spec.from + 1 ? 0.8 : 1)))
  check('remixed waves keep the glow budget (0.6x to 1.3x, harder Mopes cost more)', ratios.every((r) => r > 0.6 && r < 1.3), ratios.map((r) => r.toFixed(2)).join(' '))
  const bosses = (n: number) => tideWave(spec, n).groups.filter((g) => ENEMIES[g.type].boss).map((g) => g.type).join()
  check('tides keep the canonical boss schedule', [18, 20, 23, 25].every((n) => bosses(n) === WAVES[n - 1].groups.filter((g) => ENEMIES[g.type].boss).map((g) => g.type).join()))

  const s = new Sim('standard', JSON.parse(JSON.stringify(day.challenge)), 7)
  check('a tide opens after wave 14 with its bank, the sluice open and both locks free', s.wave === TIDE_FROM && s.glow === spec.glow && s.openSources.has('west') && s.gates.every((g) => !s.gateLocked(g)) && s.waveOffset === TIDE_FROM)
  check('a tide plays its own waves', JSON.stringify(s.waveDef(TIDE_FROM + 1)) === JSON.stringify(tideWave(spec, TIDE_FROM + 1)))
  // a mid-tide save continues identically
  const plan: [number, TowerId][] = [[4, 'bell'], [10, 'cracker'], [11, 'beam'], [3, 'owl'], [12, 'wick'], [9, 'wick']]
  const setup = (x: Sim) => {
    for (const [pad, id] of plan) if (x.keeperAllowed(id)) x.build(pad, id)
    x.lives = 500
    x.startWave()
  }
  const a = new Sim('standard', JSON.parse(JSON.stringify(day.challenge)), 7)
  let b = new Sim('standard', JSON.parse(JSON.stringify(day.challenge)), 7)
  setup(a)
  setup(b)
  let diff = -1
  for (let step = 0; step < 60 * 40; step++) {
    if (step === 60 * 12) b = roundTrip(b)
    if (step % 150 === 0) {
      a.flipGate(a.gates[step % 300 === 0 ? 0 : 1])
      b.flipGate(b.gates[step % 300 === 0 ? 0 : 1])
    }
    a.step(DT)
    b.step(DT)
    a.events.length = 0
    b.events.length = 0
    if (diff < 0 && step > 60 * 12 && step % 60 === 0 && JSON.stringify(a.snapshot()) !== JSON.stringify(b.snapshot())) diff = step / 60
  }
  check('a restored tide is bit-identical to an uninterrupted one', diff < 0 && b.waveOffset === TIDE_FROM, diff < 0 ? `wave ${b.wave}, ${b.enemies.length} Mopes` : `first difference at ${diff}s`)
  const done = new Sim('standard', { id: 'daily:x', tide: spec }, 7)
  done.over = 'won'
  done.won = true
  done.continueFreeplay()
  check('challenges end at dawn: no free play', done.over === 'won' && !done.freeplay)
}

// ------------------------------------------------------------------ 14. challenge rules

{
  const trio = new Sim('standard', { keepers: ['wick', 'bell', 'owl'], noGarden: true, noCharms: true }, 7)
  trio.glow = 5000
  trio.wave = 5
  check('only the night\'s keepers can be built', !!trio.build(0, 'wick') && !trio.build(1, 'cracker') && !trio.build(2, 'garden') && !trio.keeperAllowed('beam'))
  check('no charms means no charms', !trio.charmsAllowed && !trio.setCharm(trio.gates[1], 'shell', 0))
  const swift = new Sim('standard', { swift: 1.1, thick: 4 / 3 }, 7)
  const plain = new Sim('standard', {}, 7)
  const sd = swift.spawnEnemy('shell', seg(swift, 'n0'), 0, 12)
  const pd = plain.spawnEnemy('shell', seg(plain, 'n0'), 0, 12)
  const st = swift.spawnEnemy('toad', seg(swift, 'n0'), 0, 12)
  const pt = plain.spawnEnemy('toad', seg(plain, 'n0'), 0, 12)
  check('a swift current hurries ordinary Mopes but not bosses', Math.abs(sd.speedBase - pd.speedBase * 1.1) < 1e-9 && st.speedBase === pt.speedBase)
  check('thick shells are a third tougher', Math.abs(sd.shell - (pd.shell * 4) / 3) < 1e-9 && sd.maxShell === sd.shell)
}

// ------------------------------------------------------------------ 15. tidal locks

{
  const s = new Sim('standard', { tidal: 5 }, 7)
  s.wave = 6
  const up = s.gates[0]
  const lockedDir = up.def.lockedDir
  s.flipGate(up)
  check('opening a tidal lock onto its short run starts its count', up.state !== lockedDir && up.swingT === 5 && s.stats.flips === 1)
  const evs: SimEvent[] = []
  for (let i = 0; i < 60 * 4; i++) {
    s.step(DT)
    evs.push(...s.events)
    s.events.length = 0
  }
  check('it stays open until the count runs out', up.state !== lockedDir && up.swingT > 0.9 && up.swingT < 1.1)
  const r = roundTrip(s)
  check('the count survives a save', Math.abs(r.gates[0].swingT - up.swingT) < 1e-9)
  for (let i = 0; i < 70; i++) {
    s.step(DT)
    evs.push(...s.events)
    s.events.length = 0
  }
  const swung = evs.filter((e) => e.t === 'gate' && e.auto)
  check('then it swings back on its own, without counting as a flip', up.state === lockedDir && up.swingT === 0 && swung.length === 1 && s.stats.flips === 1 && up.flips === 1)
  // closing it by hand stops the count
  up.cd = 0
  s.flipGate(up)
  up.cd = 0
  s.flipGate(up)
  check('closing a tidal lock by hand stops its count', up.state === lockedDir && up.swingT === 0)
  // a jammed tidal lock waits for the boss to pass
  up.cd = 0
  s.flipGate(up)
  const n0 = seg(s, 'n0')
  const toad = s.spawnEnemy('toad', n0, n0.line.length - 4, 6)
  s.step(DT)
  up.swingT = 0.01
  for (let i = 0; i < 6; i++) s.step(DT)
  const heldOpen = up.jammed && up.state !== lockedDir
  s.damage(toad, 1e9, true, null)
  for (let i = 0; i < 3; i++) s.step(DT)
  s.events.length = 0
  check('a jammed tidal lock waits for the boss to pass, then swings back', heldOpen && !up.jammed && up.state === lockedDir)
  const plainLock = new Sim('standard', {}, 7)
  plainLock.wave = 6
  plainLock.flipGate(plainLock.gates[0])
  check('ordinary locks never count down', plainLock.gates[0].swingT === 0)
}

// ------------------------------------------------------------------ 16. bloom journal counts

{
  const s = new Sim('standard')
  s.wave = 8
  s.damage(s.spawnEnemy('drip', seg(s, 'w1'), 50, 8), 999, true, null)
  s.damage(s.spawnEnemy('veil', seg(s, 'w1'), 60, 8), 999, true, null)
  s.damage(s.spawnEnemy('veil', seg(s, 'w1'), 70, 8), 999, true, null)
  check('each Mope cheered up is counted by kind', s.stats.cheered.drip === 1 && s.stats.cheered.veil === 2)
  const g = new Sim('standard')
  g.wave = FINAL_WAVE - 1
  const m1 = seg(g, 'm1')
  g.spawnEnemy('gloom', m1, m1.line.length - 1, FINAL_WAVE)
  for (let i = 0; i < 10; i++) g.step(DT)
  for (const e of g.enemies.filter((q) => q.def.id === 'gloom')) g.damage(e, 1e9, true, null)
  check('the two halves of Old Gloom count as one', g.stats.cheered.gloom === 1)
  const older = JSON.parse(JSON.stringify(s.snapshot())) as SaveSnapshotV2
  delete (older.stats as Partial<typeof older.stats>).cheered
  check('counts survive a save, and older saves start from zero', roundTrip(s).stats.cheered.veil === 2 && JSON.stringify(Sim.restore(older).stats.cheered) === '{}')
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
if (failed) process.exit(1)
