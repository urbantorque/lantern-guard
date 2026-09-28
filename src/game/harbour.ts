import { LEVEL, type LevelDef } from './level'
import type { WaveDef, Group } from './waves'
import type { Enemy, Sim } from './sim'

export const HARBOUR_END = 33
export const WARDEN_ESCORT_RANGE = 170
export const WARDEN_GUARD_TAKEN = .6

export function wardenEscorts(sim: Sim, boss: Enemy): Enemy[] {
  if (!(sim.challenge.harbourEncounters || sim.challenge.compact) || !boss.alive || boss.phase !== 2) return []
  return sim.enemies.filter(e => e.alive && e.escortOf === boss.uid && (e.x - boss.x) ** 2 + (e.y - boss.y) ** 2 <= WARDEN_ESCORT_RANGE ** 2)
}

export function wardenStatus(sim: Sim): string | null {
  if (!(sim.challenge.harbourEncounters || sim.challenge.compact)) return null
  const boss = sim.enemies.find(e => e.alive && e.def.id === 'warden')
  if (!boss) return null
  if (boss.phase === 1) return 'Warden signalling escorts · crowd bursts break their guard'
  if (boss.phase === 2) {
    const count = wardenEscorts(sim, boss).length
    return count ? `Warden guarded · ${count} linked Skiffs · clear them for full damage` : 'Warden exposed · keep your heavy towers firing'
  }
  return boss.phase >= 3 ? 'Warden surging · guard down, cover the remaining route' : 'Warden advancing · escorts at 70% health, surge at 35%'
}

export const HARBOUR_ENCOUNTERS = ['First arrivals', 'Veiled convoy', 'Crowded crossing', 'Heavy passage', 'Hidden cargo', 'Two fronts', 'Last convoy', 'The Harbour Warden']
export const HARBOUR_PADS = [{ x: 210, y: -285 }, { x: 470, y: -275 }, { x: 300, y: -135 }, { x: 535, y: -65 }]
export function harbourLevel(base: LevelDef): LevelDef {
  return { ...base, name: 'Wickwater & Lantern Harbour',
    segments: [...base.segments, { id: 'harbour', pts: [{ x: 360, y: -420 }, { x: 250, y: -380 }, { x: 150, y: -330 }, { x: 150, y: -200 }, { x: 350, y: -190 }, { x: 505, y: -185 }, { x: 600, y: -110 }, { x: 550, y: -25 }, { x: 430, y: -10 }, { x: 360, y: -40 }], next: { seg: 'n0' } }],
    sources: base.sources.map(s => s.id === 'north' ? { ...s, seg: 'harbour', name: 'Lantern Harbour' } : s),
    pads: [...LEVEL.pads, ...HARBOUR_PADS],
  }
}
const g = (type: Group['type'], count: number, gap: number, at = 0, src?: Group['src']): Group => ({ type, count, gap, at, src })
/** Eight authored waves, with a cleared-board planning break before each one. */
export const HARBOUR_WAVES: WaveDef[] = [
  { groups: [g('skiff', 8, 2), g('wisp', 35, .16, 7)], note: 'Skiffs accelerate when their armour breaks. Pair a heavy tower with Moonbell; your old canal is the second line of defence.' },
  { groups: [g('skiff', 12, 1.3), g('veil', 16, .6, 5), g('shell', 12, .8, 12, 'west')], note: 'Hidden escorts approach from the harbour. Owl sight and heavy hits work together.' },
  { groups: [g('bloat', 16, .9), g('wisp', 85, .09, 4), g('skiff', 10, .9, 16, 'west')], note: 'A crowded crossing. Splash and slowing towers can share the same bend.' },
  { groups: [g('toad', 2, 8), g('skiff', 16, .9, 3), g('mender', 7, 1.8, 8, 'west')], note: 'Gloomtoads lead the convoy. Your original locks and towers still matter.' },
  { groups: [g('vshell', 18, .8), g('skiff', 20, .65, 5), g('veil', 20, .5, 14, 'west')], note: 'Hidden armour on both entrances. Check sight coverage on your lower branches.' },
  { groups: [g('wisp', 110, .08), g('skiff', 22, .7, 4, 'west'), g('bloat', 16, .9, 14)], note: 'Two fronts. Use View canal to inspect your established defence.' },
  { groups: [g('toad', 2, 7, 0, 'west'), g('skiff', 24, .7), g('mender', 10, 1.3, 10), g('vshell', 15, .75, 18, 'west')], note: 'The last convoy. Prepare heavy damage for the Harbour Warden next.' },
  { groups: [g('warden', 1, 1), g('skiff', 16, 1.1, 6), g('vshell', 16, .9, 10, 'west'), g('mender', 6, 2, 18)], note: 'The Harbour Warden launches Skiffs and surges at half health. Long coverage and slowing support give you time.' },
]

/** New chapters opt in; old mid-wave saves retain their exact group indices and timing. */
export const HARBOUR_WAVES_V2: WaveDef[] = HARBOUR_WAVES.map((wave, index) => ({
  ...wave,
  note: `${HARBOUR_ENCOUNTERS[index]}. ${wave.note}`,
}))
// Three distinct clusters let splash builds exploit a bend, with room to recover between them.
HARBOUR_WAVES_V2[2] = {
  groups: [g('bloat', 16, .9), g('wisp', 28, .045, 4), g('wisp', 29, .045, 9), g('wisp', 28, .045, 14), g('skiff', 10, .9, 16, 'west')],
  note: 'Crowded crossing. Three tight Wisp groups from the harbour; Skiffs follow from the west. Hold a bend with Moonbell and splash.',
}
// Equal population, alternating pressure: a reason to keep both parts of the defence useful.
HARBOUR_WAVES_V2[5] = {
  groups: [g('wisp', 55, .065), g('skiff', 11, .6, 6, 'west'), g('bloat', 16, .9, 14), g('wisp', 55, .065, 20), g('skiff', 11, .6, 26, 'west')],
  note: 'Two fronts. Harbour crowds alternate with west-inlet Skiffs. Check both approaches before starting.',
}
HARBOUR_WAVES_V2[6].note = 'Last convoy. The Warden follows next: heavy hits hurt it, while crowd bursts clear its linked Skiff escorts.'
HARBOUR_WAVES_V2[7].note = 'Warden: at 70% health it signals four escorts. Linked Skiffs reduce damage by 40%; clear them with bursts. At 35%, it drops its guard and surges.'
