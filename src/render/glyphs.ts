import { TAU } from '../core/math'
import { FAMILY_COLOR } from './palette'

/**
 * Every family has a shape as well as a colour, so the x1.5 colour match never
 * relies on hue alone: flame (amber), burst (coral), snowflake (ice), eye (lime),
 * sparkle (lilac), flower (gold), plus (pink).
 */
export type GlyphFamily = 'amber' | 'coral' | 'ice' | 'lime' | 'lilac' | 'gold' | 'pink'

export const GLYPH_NAME: Record<GlyphFamily, string> = {
  amber: 'flame',
  coral: 'burst',
  ice: 'snowflake',
  lime: 'eye',
  lilac: 'sparkle',
  gold: 'flower',
  pink: 'plus',
}

/** Draws a family glyph centred at (x, y) with radius r in the given colour. */
export function drawGlyph(ctx: CanvasRenderingContext2D, family: string, x: number, y: number, r: number, color = '#ffffff', holeColor?: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (family as GlyphFamily) {
    case 'amber': {
      ctx.beginPath()
      ctx.moveTo(0, -r)
      ctx.bezierCurveTo(r * 0.75, -r * 0.2, r * 0.7, r * 0.75, 0, r * 0.8)
      ctx.bezierCurveTo(-r * 0.7, r * 0.75, -r * 0.75, -r * 0.2, 0, -r)
      ctx.fill()
      break
    }
    case 'coral': {
      ctx.beginPath()
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU - Math.PI / 2
        const rr = i % 2 ? r * 0.42 : r
        const px = Math.cos(a) * rr
        const py = Math.sin(a) * rr
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'ice': {
      ctx.lineWidth = Math.max(1, r * 0.26)
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r)
        ctx.stroke()
      }
      break
    }
    case 'lime': {
      ctx.beginPath()
      ctx.moveTo(-r, 0)
      ctx.quadraticCurveTo(0, -r * 0.95, r, 0)
      ctx.quadraticCurveTo(0, r * 0.95, -r, 0)
      ctx.closePath()
      ctx.fill()
      // the pupil is painted, never cut: cutting would punch a hole in the map canvas
      if (holeColor) {
        ctx.fillStyle = holeColor
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.3, 0, TAU)
        ctx.fill()
      }
      break
    }
    case 'lilac': {
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU - Math.PI / 2
        const rr = i % 2 ? r * 0.28 : r
        const px = Math.cos(a) * rr
        const py = Math.sin(a) * rr
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'gold': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2
        ctx.beginPath()
        ctx.arc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.42, 0, TAU)
        ctx.fill()
      }
      break
    }
    case 'pink': {
      const w = r * 0.42
      ctx.fillRect(-w, -r, w * 2, r * 2)
      ctx.fillRect(-r, -w, r * 2, w * 2)
      break
    }
  }
  ctx.restore()
}

const urlCache = new Map<string, string>()
/** Badges are baked in the current palette: drop them when it changes. */
export const clearGlyphCache = () => urlCache.clear()

/** A round family badge (coloured disc with a dark glyph) as a data URL for DOM use. */
export function glyphBadgeURL(family: string, size = 48): string {
  const key = family + size
  const hit = urlCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const r = size / 2
  ctx.fillStyle = 'rgba(8,19,25,0.9)'
  ctx.beginPath()
  ctx.arc(r, r, r, 0, TAU)
  ctx.fill()
  ctx.fillStyle = FAMILY_COLOR[family] ?? '#ffffff'
  ctx.beginPath()
  ctx.arc(r, r, r * 0.84, 0, TAU)
  ctx.fill()
  drawGlyph(ctx, family, r, r, r * 0.5, '#13212a', FAMILY_COLOR[family])
  const url = c.toDataURL()
  urlCache.set(key, url)
  return url
}
