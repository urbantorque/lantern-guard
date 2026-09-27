/**
 * Lanternlocks colour language.
 * Night neutrals (teal-navy) carry the world; warm lantern amber is the single
 * UI accent. Each keeper owns a hue, and the Mopes it counters wear that hue as
 * markings, so "orange shell goes to the orange keeper" reads at a glance.
 */
export const P = {
  night0: '#081319',
  night1: '#0c1c24',
  night2: '#11262e',
  moss: '#15312f',
  moss2: '#1b3b35',
  stone: '#2a3e46',
  stoneHi: '#3f5963',
  stoneLo: '#1b2a31',
  water0: '#0c3a44',
  water1: '#135560',
  water2: '#1d7a80',
  flow: '#7fe8dc',
  flowDim: '#2b6d70',
  amber: '#ffb547',
  amberHi: '#ffd98a',
  cream: '#f6ecd6',
  ink: '#1c1428',
  inkRim: '#3d3259',
  inkHi: '#5a4c80',
  eye: '#fff5dc',
  coral: '#ff7a59',
  ice: '#9fd8ff',
  lime: '#c9f07a',
  pale: '#fff1b8',
  lilac: '#cdb8ff',
  pink: '#ff8fb8',
  gold: '#ffd36e',
  danger: '#ff5d5d',
}

/** Colour of each family (keepers and the Mopes they counter share it). */
export const FAMILY_COLOR: Record<string, string> = {
  amber: P.amber,
  coral: P.coral,
  ice: P.ice,
  lime: P.lime,
  lilac: P.lilac,
  gold: P.gold,
  pink: P.pink,
}

/** Marking colour for each Mope: matches the keeper that counters it best. */
export const ENEMY_MARK: Record<string, string> = {
  drip: P.amber,
  skitter: P.ice,
  shell: P.coral,
  veil: P.lime,
  bloat: P.lilac,
  wisp: P.coral,
  mender: P.pink,
  vshell: P.lime,
  toad: P.lilac,
  gloom: P.lilac,
}

// ------------------------------------------------------------------ colour-vision-safe palette

type FamilyKey = 'amber' | 'coral' | 'ice' | 'lime' | 'lilac' | 'pink'
const STANDARD: Record<FamilyKey, string> = { amber: P.amber, coral: P.coral, ice: P.ice, lime: P.lime, lilac: P.lilac, pink: P.pink }
/**
 * Family colours that stay apart for players with colour-vision differences. Checked under simulated
 * protanopia, deuteranopia and tritanopia (Machado 2009, full severity): the closest pair is 10 OKLab units
 * apart (the standard set falls to 3.4, Moonbell ice against Lighthouse lilac), and every colour keeps 6:1
 * or better against the night. The glyphs still carry the family either way.
 */
const CLEAR: Record<FamilyKey, string> = { amber: '#dcae12', coral: '#ec7462', ice: '#58c0dc', lime: '#9cff8c', lilac: '#9a7cfb', pink: '#fde6fc' }
const MOPE_FAMILY: Record<string, FamilyKey> = { drip: 'amber', skitter: 'ice', shell: 'coral', veil: 'lime', bloat: 'lilac', wisp: 'coral', mender: 'pink', vshell: 'lime', toad: 'lilac', gloom: 'lilac' }

export type PaletteMode = 'standard' | 'clear'
let paletteMode: PaletteMode = 'standard'
export const currentPalette = () => paletteMode

/**
 * Swaps the family colours in place. The lantern amber stays the one UI accent in both sets; only the
 * Wickling family's markings change. Returns true if anything changed (callers then drop baked art).
 */
export function setPalette(mode: PaletteMode): boolean {
  if (mode === paletteMode) return false
  paletteMode = mode
  const src = mode === 'clear' ? CLEAR : STANDARD
  P.coral = src.coral
  P.ice = src.ice
  P.lime = src.lime
  P.lilac = src.lilac
  P.pink = src.pink
  for (const f of Object.keys(src) as FamilyKey[]) FAMILY_COLOR[f] = src[f]
  for (const [id, f] of Object.entries(MOPE_FAMILY)) ENEMY_MARK[id] = src[f]
  return true
}

const glowCache = new Map<string, HTMLCanvasElement>()

/** Pre-rendered soft radial glow sprite; draw with 'lighter' compositing. */
export function glowSprite(color: string, size = 64): HTMLCanvasElement {
  const key = color + size
  let c = glowCache.get(key)
  if (c) return c
  c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, withAlpha(color, 1))
  grd.addColorStop(0.25, withAlpha(color, 0.55))
  grd.addColorStop(0.6, withAlpha(color, 0.14))
  grd.addColorStop(1, withAlpha(color, 0))
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  glowCache.set(key, c)
  return c
}

export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

export function mix(a: string, b: string, t: number): string {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  const r = Math.round(parseInt(pa.slice(0, 2), 16) * (1 - t) + parseInt(pb.slice(0, 2), 16) * t)
  const g = Math.round(parseInt(pa.slice(2, 4), 16) * (1 - t) + parseInt(pb.slice(2, 4), 16) * t)
  const bl = Math.round(parseInt(pa.slice(4, 6), 16) * (1 - t) + parseInt(pb.slice(4, 6), 16) * t)
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')
}
