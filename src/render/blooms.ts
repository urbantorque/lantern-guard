import { TAU } from '../core/math'
import { FAMILY_COLOR, glowSprite, P } from './palette'

/**
 * Blooms: what a cheered-up Mope leaves on the bank. The family decides the
 * colour; the bloom set (a cosmetic earned by play) decides the shape. The
 * renderer paints them into its bloom layer and the journal paints swatches
 * with the same code, so what the journal shows is what the banks grow.
 */

export const BLOOM_FAMS = ['amber', 'coral', 'ice', 'lime', 'lilac', 'gold', 'pink'] as const
export const famIndex = (family: string) => Math.max(0, BLOOM_FAMS.indexOf(family as (typeof BLOOM_FAMS)[number]))

export type BloomStyle = 'wild' | 'lily' | 'pearl' | 'moss' | 'moon' | 'reed'
export const BLOOM_STYLES: BloomStyle[] = ['wild', 'lily', 'pearl', 'moss', 'moon', 'reed']
export const asBloomStyle = (id: string): BloomStyle => (BLOOM_STYLES.includes(id as BloomStyle) ? (id as BloomStyle) : 'wild')

export interface BloomShape {
  x: number
  y: number
  /** index into BLOOM_FAMS */
  fam: number
  size: number
  rot: number
  /** 0-2 flower shapes, 3 bush */
  kind: number
}

const bloomCols: string[] = []
/** Family colour at ~60% saturation so blooms never compete with Mopes. */
export function bloomColor(fam: number): string {
  let c = bloomCols[fam]
  if (c) return c
  const hex = (FAMILY_COLOR[BLOOM_FAMS[fam]] ?? P.amber).replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const l = r * 0.3 + g * 0.59 + b * 0.11
  const d = (v: number) => Math.round(l + (v - l) * 0.6).toString(16).padStart(2, '0')
  c = '#' + d(r) + d(g) + d(b)
  bloomCols[fam] = c
  return c
}

/** Bloom colours and swatches follow the palette: drop them when it changes. */
export function clearBloomColors() {
  bloomCols.length = 0
  swatchCache.clear()
}

const LILY = '#e6c27c'
const SILVER = '#d8e0ec'
const STAR = '#f2ebc8'
/** Sea-glass beads, soft enough to sit under any Mope. */
const SEA = ['#98d6cc', '#a4c9e6', '#b5e1c2', '#9dcde0', '#c5e6d8', '#8ec4d8', '#badaf0']

/** The colour a set's bloom glows and dots its bushes with. */
function setColor(style: BloomStyle, fam: number): string {
  switch (style) {
    case 'reed':
      return '#d6d699'
    case 'lily':
      return LILY
    case 'pearl':
      return SEA[fam % SEA.length]
    case 'moss':
      return STAR
    case 'moon':
      return SILVER
    default:
      return bloomColor(fam)
  }
}

/** Paints one bloom centred on (b.x, b.y). glow adds the soft additive halo (skipped when regrowing a bush in place). */
export function paintBloom(c: CanvasRenderingContext2D, b: BloomShape, style: BloomStyle, glow: boolean) {
  const col = bloomColor(b.fam)
  const main = setColor(style, b.fam)
  const s = b.size
  c.save()
  c.translate(b.x, b.y)
  if (glow) {
    c.globalCompositeOperation = 'lighter'
    c.globalAlpha = style === 'moon' ? 0.2 : 0.15
    c.drawImage(glowSprite(main, 32), -s * 2.2, -s * 2.2, s * 4.4, s * 4.4)
    c.globalCompositeOperation = 'source-over'
  }
  if (b.kind === 3) {
    paintBush(c, b, style, col, main)
    c.restore()
    return
  }
  c.rotate(b.rot)
  switch (style) {
    case 'reed': {
      c.globalAlpha = 0.85
      c.strokeStyle = '#668f60'
      c.lineWidth = Math.max(1, s * 0.15)
      for (let i = -1; i <= 1; i++) {
        const x = i * s * 0.5
        const y = -s * (i === 0 ? 1.2 : 0.7)
        c.beginPath(); c.moveTo(0, s * 0.6); c.quadraticCurveTo(x, 0, x, y); c.stroke()
        c.fillStyle = i === 0 ? col : main
        c.beginPath(); c.ellipse(x, y, s * 0.2, s * 0.35, i * 0.25, 0, TAU); c.fill()
      }
      break
    }
    case 'lily':
      leaf(c, s, 1.2)
      c.globalAlpha = 0.82
      c.fillStyle = LILY
      for (let i = 0, n = b.kind === 0 ? 6 : b.kind === 1 ? 5 : 3; i < n; i++) {
        const a = (i / n) * TAU
        c.beginPath()
        c.moveTo(0, 0)
        c.quadraticCurveTo(Math.cos(a - 0.4) * s * 0.75, Math.sin(a - 0.4) * s * 0.75, Math.cos(a) * s * 1.2, Math.sin(a) * s * 1.2)
        c.quadraticCurveTo(Math.cos(a + 0.4) * s * 0.75, Math.sin(a + 0.4) * s * 0.75, 0, 0)
        c.fill()
      }
      c.globalAlpha = 0.95
      c.fillStyle = col
      c.beginPath()
      c.arc(0, 0, s * 0.3, 0, TAU)
      c.fill()
      break
    case 'pearl': {
      c.globalAlpha = 0.3
      c.fillStyle = '#000000'
      c.beginPath()
      c.ellipse(s * 0.1, s * 0.35, s * 0.95, s * 0.5, 0, 0, TAU)
      c.fill()
      const n = 3 + b.kind
      for (let i = 0; i <= n; i++) {
        const centre = i === n
        const a = (i / n) * TAU
        const x = centre ? 0 : Math.cos(a) * s * 0.52
        const y = centre ? 0 : Math.sin(a) * s * 0.52
        const r = s * (centre ? 0.36 : 0.3)
        c.globalAlpha = 0.88
        c.fillStyle = centre ? col : SEA[(b.fam + i) % SEA.length]
        c.beginPath()
        c.arc(x, y, r, 0, TAU)
        c.fill()
        c.globalAlpha = 0.55
        c.fillStyle = '#ffffff'
        c.beginPath()
        c.arc(x - r * 0.32, y - r * 0.32, r * 0.3, 0, TAU)
        c.fill()
      }
      break
    }
    case 'moss': {
      c.globalAlpha = 0.9
      c.fillStyle = '#245a3e'
      c.beginPath()
      c.ellipse(0, s * 0.15, s * 1.05, s * 0.6, 0, 0, TAU)
      c.fill()
      c.fillStyle = '#2f6c49'
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + 0.4
        c.beginPath()
        c.arc(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.26, s * 0.42, 0, TAU)
        c.fill()
      }
      c.globalAlpha = 0.95
      const n = 2 + b.kind
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 1
        star(c, Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.32, s * 0.44, i === 0 ? col : STAR)
      }
      break
    }
    default: {
      // wildflowers, and moonpetals in silver with a heart in the family colour
      leaf(c, s, 1)
      const moon = style === 'moon'
      c.globalAlpha = moon ? 0.72 : 0.75
      c.fillStyle = moon ? SILVER : col
      const petals = b.kind === 0 ? 5 : b.kind === 1 ? 4 : 6
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * TAU
        c.beginPath()
        c.ellipse(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.55, s * 0.32, a, 0, TAU)
        c.fill()
      }
      c.globalAlpha = moon ? 0.95 : 0.75
      c.fillStyle = moon ? col : '#efe6cc'
      c.beginPath()
      c.arc(0, 0, s * (moon ? 0.34 : 0.3), 0, TAU)
      c.fill()
    }
  }
  c.restore()
}

function leaf(c: CanvasRenderingContext2D, s: number, len: number) {
  c.globalAlpha = 0.8
  c.fillStyle = '#1e4a38'
  c.beginPath()
  c.ellipse(s * 0.9 * len, s * 0.6, s * 0.9 * len, s * 0.35, 0.5, 0, TAU)
  c.fill()
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  c.fillStyle = color
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

/** A small bush: where a stretch of bank is full, new blooms grow the nearest one instead. */
function paintBush(c: CanvasRenderingContext2D, b: BloomShape, style: BloomStyle, col: string, main: string) {
  const s = b.size
  c.globalAlpha = 0.95
  c.fillStyle = style === 'moss' ? '#1d4633' : '#163a2e'
  c.beginPath()
  c.ellipse(1, s * 0.35, s * 1.05, s * 0.6, 0, 0, TAU)
  c.fill()
  c.fillStyle = style === 'moss' ? '#26573e' : '#1f4d3b'
  for (let i = 0; i < 4; i++) {
    const a = b.rot + (i / 4) * TAU
    c.beginPath()
    c.arc(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.3 - s * 0.1, s * 0.5, 0, TAU)
    c.fill()
  }
  const n = 3 + Math.floor(s / 3)
  for (let i = 0; i < n; i++) {
    const a = b.rot * 3 + i * 2.4
    const rr = s * 0.62 * (((i * 37) % 10) / 10)
    const x = Math.cos(a) * rr
    const y = Math.sin(a) * rr * 0.7 - s * 0.1
    // the family colour shows on the first dot of every set, so bushes still say what they came from
    const dot = i === 0 || style === 'wild' ? col : style === 'pearl' ? SEA[(b.fam + i) % SEA.length] : main
    c.globalAlpha = style === 'wild' ? 0.75 : 0.85
    if (style === 'moss') star(c, x, y, 2.2 + s * 0.1, dot)
    else {
      c.fillStyle = dot
      c.beginPath()
      c.arc(x, y, 1.7 + s * 0.08, 0, TAU)
      c.fill()
    }
  }
}

// ------------------------------------------------------------------ journal swatches

const swatchCache = new Map<string, string>()

/** One bloom of a family in a set, as a data URL (journal cards). */
export function bloomIconURL(fam: number, style: BloomStyle, px = 64): string {
  const key = `i:${fam}:${style}:${px}`
  const hit = swatchCache.get(key)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = cv.height = px
  const c = cv.getContext('2d')
  if (!c) return ''
  const k = px / 32
  c.scale(k, k)
  paintBloom(c, { x: 15, y: 15, fam, size: 9, rot: 0.35, kind: 0 }, style, true)
  const url = cv.toDataURL()
  swatchCache.set(key, url)
  return url
}

/** A strip of bank flowering in a set: one bloom per keeper family and a bush (bloom set rows). */
export function bloomSetURL(style: BloomStyle, w = 144, h = 56): string {
  const key = `s:${style}:${w}x${h}`
  const hit = swatchCache.get(key)
  if (hit) return hit
  const dpr = 2
  const cv = document.createElement('canvas')
  cv.width = w * dpr
  cv.height = h * dpr
  const c = cv.getContext('2d')
  if (!c) return ''
  c.scale(dpr, dpr)
  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#15312f')
  g.addColorStop(1, '#10262a')
  c.fillStyle = g
  c.beginPath()
  c.roundRect(0, 0, w, h, 10)
  c.fill()
  // [family, x, y, size, kind] on a 144 x 56 strip: four flowers large enough to read, and a bush
  const spots: [number, number, number, number, number][] = [
    [0, 20, 24, 9.5, 0],
    [2, 52, 33, 9, 1],
    [4, 84, 22, 9.5, 2],
    [1, 112, 34, 9, 0],
    [3, 132, 16, 7.5, 3],
  ]
  for (const [fam, x, y, size, kind] of spots) paintBloom(c, { x: (x / 144) * w, y: (y / 56) * h, fam, size, rot: x * 0.07, kind }, style, true)
  const url = cv.toDataURL()
  swatchCache.set(key, url)
  return url
}
