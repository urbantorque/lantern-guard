import { compactLevel, compactWave } from './compact'
import { computeStats, TOWERS, type TowerId, type EnemyId } from './defs'
import type { WaveDef } from './waves'
import type { Tower } from './sim'

/** Published rules boundary. Historical replays continue using their original simulator. */
export const FIXED_VERSION = 1
export const FIXED_UNLOCK: Record<TowerId, number> = { wick: 1, cracker: 1, bell: 3, owl: 6, garden: 11, beam: 16, storm: 21, ballista: 26 }
export const STAGES = ['Base', 'Improved', 'Specialised', 'Mastered', 'Crowned'] as const
export const ACTS = ['First lanterns', 'A gathering mist', 'The district wakes', 'Light through armour', 'The long watch', 'Harbour bells', 'Wild gardens', 'Before the dawn']
export const MAP_HELP = ['Broad bends reward shared coverage.', 'Both entrances meet early. Build around the upper bend.', 'A mirrored reach rewards a fresh opening.', 'The side inlet joins late. Leave room for a lower defence.']
export const FIXED_TIPS: Record<EnemyId, string> = {
  drip: 'A gentle opening. Place a Wickling beside the stream.', skitter: 'Fast. A Moonbell buys your damage towers more time.',
  shell: 'Armoured. Crackers and heavy upgrades break shells.', veil: 'Hidden. An Owl reveals enemies across its sight range.',
  bloat: 'Splits into three Drips. Leave a little coverage downstream.', wisp: 'A close crowd. Cracker blasts catch several at once.',
  mender: 'Heals nearby enemies. Concentrate damage around a shared bend.', vshell: 'Hidden and armoured. Combine sight with heavy damage.',
  toad: 'Calls an escort burst at half health. Keep splash damage nearby.', gloom: 'Splits at the central stone into two smaller forms on the same path.',
  skiff: 'Accelerates when its armour breaks. Slow it within your firing line.', warden: 'Four escorts shield it. Clear them before focusing the Warden.',
  reedling: 'Grows armour at the meeting stone. Hit early or bring heavy damage.', bloomheart: 'Heals its neighbours after a three-second warning. It cannot heal itself.',
}

export function fixedLevel(variant = 0) {
  const level = compactLevel(variant)
  // Keep only the authored long route. There are no hidden alternate channels or switches.
  level.segments = level.segments.filter(s => !['e1', 'w2'].includes(s.id)).map(s => ({ ...s, bonus: 1, feature: undefined,
    next: 'gate' in s.next ? { seg: s.next.gate === 'upper' ? 'w1' : 'e2' } : s.next }))
  level.gates = []
  // The main route shares curve tangents at every join. The inlet blends into
  // that route without changing its direction or adding a switching mechanic.
  for(const segment of level.segments){
    const next='seg' in segment.next?level.segments.find(s=>s.id===(segment.next as {seg:string}).seg):undefined
    const previous=level.segments.find(s=>s.id!=='inlet'&&'seg' in s.next&&s.next.seg===segment.id)
    segment.curve={...(previous?{before:previous.pts[previous.pts.length-2]}:{}),...(next?{after:next.pts[1]}:{})}
  }
  // Reserve headroom for a crowned Lighthouse even on the northernmost plot.
  level.bounds = { x: 0, y: -105, w: 720, h: 960 }
  const mirror = variant === 2
  const positions = variant === 3
    ? [[170,220],[370,180],[75,490],[285,295],[620,340],[515,585],[365,570],[170,600],[540,780],[655,755],[280,795],[420,795]]
    : variant === 1
      ? [[175,255],[305,40],[70,420],[310,310],[610,390],[530,615],[425,555],[205,465],[645,770],[340,610],[270,785],[465,815]]
      : [[235,250],[270,65],[80,440],[300,340],[590,395],[490,650],[430,550],[215,455],[625,745],[320,610],[270,785],[450,795]]
  level.pads = positions.map(([x,y]) => ({ x: mirror ? 720-x : x, y }))
  return level
}

const NOTES: Record<number, string> = {
  1: 'Build beside the upper bend. The first wave follows in four seconds.',
  2: 'Build and upgrade as enemies arrive. The next wave follows automatically.',
  3: 'Moonbells are ready. Slow enemies where another tower can hit them.',
  4: 'Compare a tower’s two streams. Choose a specialisation now, or improve its foundation first.',
  5: 'Your first five waves. Keep a reserve for the armoured enemies coming next.',
  6: 'Armour arrives. Crackers break shells. Your first tower Bond and the Lamp Owl are ready.',
  8: 'Hidden Veils arrive. Place an Owl beside your damage towers.',
  10: 'Gloomtoad calls an escort at half health. A Cracker can catch the crowd.',
  11: 'The side inlet opens. Guard the shared lower path before investing in a Garden.',
  16: 'Lighthouses and Mastered upgrades are ready. Hidden armour needs sight and heavy hits together.',
  21: 'Storm towers and a second Bond are ready. Spread coverage between both entrances.',
  25: 'Old Gloom splits at the meeting stone. Its two halves follow the same fixed path.',
  26: 'Ballistas are ready. Heavy bolts trade firing speed for a strong single hit.',
  30: 'The Warden is shielded by four escorts. Clear the escorts to uncover it.',
  31: 'Crowned upgrades are ready. Choose a few specialists to anchor your final defence.',
  35: 'Leave enough coverage for fast enemies after their armour breaks.',
  40: 'Bloomheart signals its healing pulse for three seconds. Clear its neighbours before it lands.',
}
export function fixedWave(n: number, variant: number, seed: number): WaveDef {
  const base = compactWave(n, variant, seed)
  const groups = base.groups.map(g => ({ ...g }))
  // Teach armour after the first act, one new counter at a time.
  if (n === 5) for (const g of groups) if (g.type === 'shell') g.type = 'drip'
  // A breath before the new hidden-armour lesson, rather than a sudden crowd spike.
  if (n === 15) for (const g of groups) g.count = Math.max(1,Math.ceil(g.count*.82))
  if (n > 11 && !groups.some(g => ['gloom','warden','bloomheart','toad'].includes(g.type))) {
    groups.forEach((g,i) => { g.at += ((seed + n) % 3) * (i % 2) * .7 })
  }
  return { groups, note: NOTES[n] ?? 'Check the forecast, then strengthen the bank that needs it most.' }
}
export const stageOf = (t: Pick<Tower,'a'|'b'|'refinement'>) => t.refinement ? 4 : Math.max(t.a,t.b)
export const upgradePrice = (t: Pick<Tower,'id'|'a'|'b'|'refinement'>) => {
  const stage = stageOf(t)
  return stage >= 4 ? null : Math.round(TOWERS[t.id].cost * [0.6, 1.3, 2.3, 3.4][stage])
}
export function fixedStats(id: TowerId, a: number, b: number, crown = 0) {
  const stage = Math.max(a,b), s = computeStats(id, stage >= 2 ? a : 0, stage >= 2 ? b : 0)
  if (stage >= 1) { s.damage *= 1.25; s.interval *= .9; s.range += 12 }
  if (id === 'bell' || id === 'owl') s.range += 20
  if (id === 'beam') { s.damage *= .9; if(s.beamLine) s.pierce = 3 }
  if (id === 'ballista') s.damage *= stage < 3 ? 1.35 : 1.15
  if (id === 'garden') { s.income = [32,44, b ? 44 : 64, b ? 56 : 92][Math.min(stage,3)]; s.lure = Math.min(.25,s.lure) }
  if (crown) {
    s.damage *= 1.3; s.interval *= .9; s.range += 18
    if(id==='wick') s.pierce += 2
    if(id==='cracker') s.splash += 18
    if(id==='bell') s.slow = Math.min(.75,s.slow+.08)
    if(id==='owl') s.auraRange += .08
    if(id==='garden') { s.income += 24; s.lifePerWave = 1 }
    if(id==='storm') s.count++
    if(id==='ballista') s.damage *= 1.15
  }
  return s
}

export interface Bond { a: number; b: number; readyAt: number; activations: number }
export const bondName = (a: TowerId, b: TowerId, expanded=false) => [a,b].includes('bell') && [a,b].includes('cracker') ? 'Shatterburst'
  : [a,b].includes('owl') && [a,b].includes('wick') ? 'Guiding Light'
  : expanded&&[a,b].includes('garden')&&[a,b].includes('storm')?'Wild Current'
  : expanded&&[a,b].includes('owl')&&[a,b].includes('ballista')?'Beacon Volley'
  : expanded&&[a,b].includes('bell')&&[a,b].includes('beam')?'Moonbeam':null
export const BOND_HELP = {
  Shatterburst: 'A blast strips 6 armour from a slowed foe. Every 4s.',
  'Guiding Light': 'A guided spark breaks armour. Every 2s.',
  'Wild Current': 'A chain hit slows its target by 25% for 2s. Every 3s.',
  'Beacon Volley': 'A guided bolt burns for 6 damage/s for 2s. Every 4s.',
  Moonbeam: 'A beam strips 8 armour from a slowed foe. Every 4s.',
}

export const COMMISSIONS = [
  { id:'market', name:'Room for the market', from:10,to:15,glow:2600,variant:0,seed:1047,desc:'Protect five waves while leaving plot 7 empty for the market stall.', reward:'Market awnings', blockedPad:6 },
  { id:'glass', name:'The glassmaker’s watch', from:15,to:20,glow:3900,variant:1,seed:2047,desc:'Five waves of hidden armour. A fixed budget rewards shared sight and heavy damage.', reward:'Glass lanterns', blockedPad:-1 },
  { id:'garden', name:'A garden worth keeping', from:10,to:15,glow:2200,variant:3,seed:3047,desc:'Begin with a Garden. Protect five waves without selling it.', reward:'Moonflower beds', blockedPad:-1 },
] as const
