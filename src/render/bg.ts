import { Rng, TAU } from '../core/math'
import type { Polyline } from '../core/path'
import { WORLD_H, WORLD_W, type BuiltLevel, type Segment } from '../game/level'
import { drawGlyph } from './glyphs'
import { glowSprite, P, withAlpha } from './palette'

export const BG_PAD_X = 260
export const BG_PAD_Y = 160
export const CANAL_W = 58
export const BANK_W = 80

export interface Decor {
  kind: 'tree' | 'house' | 'reeds' | 'lamp' | 'rock' | 'flowers' | 'lily' | 'gold'
  x: number
  y: number
  s: number
  r: number
}

export interface MillGeo {
  /** wheel centre and radius */
  x: number
  y: number
  r: number
  /** waterline: the wheel's lower third sits below it */
  water: number
  /** hut centre */
  hx: number
  hy: number
  /** outward normal x (which side the bank is on) */
  nx: number
}

/** The Mill wheel stands in the edge of its channel on the outer bank, its hut behind it. */
export function millGeo(seg: Segment): MillGeo {
  const p = seg.line.at(seg.feature!.at, { x: 0, y: 0, tx: 0, ty: 0 })
  const nx = -p.ty
  const ny = p.tx
  const r = 26
  const x = p.x + nx * 25
  const y = p.y + ny * 25
  return { x, y, r, water: y + r / 3, hx: x + nx * (r + 24) - p.tx * 16, hy: y + ny * (r + 24) - p.ty * 16, nx }
}

export interface BridgeGeo {
  x: number
  y: number
  /** rotation that lays the deck across the channel (local x spans the water) */
  ang: number
  half: number
  /** deck width along the channel */
  w: number
}

export function bridgeGeo(seg: Segment): BridgeGeo {
  const p = seg.line.at(seg.feature!.at, { x: 0, y: 0, tx: 0, ty: 0 })
  return { x: p.x, y: p.y, ang: Math.atan2(p.ty, p.tx) + Math.PI / 2, half: CANAL_W / 2 + 16, w: 22 }
}

/** Decor layout is deterministic so the village looks the same every run. */
export function layoutDecor(level: BuiltLevel): Decor[] {
  const rng = new Rng(1337)
  const lines = [...level.segs.values()].map((s) => s.line)
  // keep the landmarks' footprints free
  const keepOut: { x: number; y: number; r: number }[] = []
  for (const seg of level.segs.values()) {
    if (seg.feature?.kind === 'crack') {
      const m = millGeo(seg)
      keepOut.push({ x: m.hx, y: m.hy - 8, r: 40 }, { x: m.x, y: m.y, r: m.r + 10 })
    } else if (seg.feature?.kind === 'reveal') {
      const b = bridgeGeo(seg)
      for (const e of [-1, 1]) keepOut.push({ x: b.x + Math.cos(b.ang) * b.half * e, y: b.y + Math.sin(b.ang) * b.half * e, r: 20 })
    }
  }
  const clearOf = (x: number, y: number, d: number) => {
    for (const k of keepOut) if (Math.hypot(k.x - x, k.y - y) < k.r + d * 0.5) return false
    for (const l of lines) if (l.distanceTo(x, y) < d) return false
    for (const p of level.def.pads) if (Math.hypot(p.x - x, p.y - y) < d + 6) return false
    for (const g of level.def.gates) if (Math.hypot(g.x - x, g.y - y) < d + 30) return false
    if (Math.hypot(level.def.home.x - x, level.def.home.y - y) < d + 70) return false
    return true
  }
  const out: Decor[] = []
  const tryPlace = (kind: Decor['kind'], n: number, minD: number, x0: number, x1: number, y0: number, y1: number, s0: number, s1: number) => {
    let placed = 0
    for (let i = 0; i < n * 30 && placed < n; i++) {
      const x = rng.range(x0, x1)
      const y = rng.range(y0, y1)
      const s = rng.range(s0, s1)
      if (!clearOf(x, y, minD + s * 0.6)) continue
      if (out.some((o) => Math.hypot(o.x - x, o.y - y) < (o.s + s) * 0.55 + 6)) continue
      out.push({ kind, x, y, s, r: rng.range(0, TAU) })
      placed++
    }
  }
  tryPlace('house', 7, 70, -120, WORLD_W + 120, -40, WORLD_H + 60, 58, 74)
  tryPlace('tree', 30, 52, -220, WORLD_W + 220, -120, WORLD_H + 140, 34, 64)
  tryPlace('rock', 16, 44, -100, WORLD_W + 100, -60, WORLD_H + 80, 10, 20)
  tryPlace('flowers', 14, 48, -60, WORLD_W + 60, 0, WORLD_H + 40, 14, 22)
  // reeds and lamps hug the banks
  for (const l of lines) {
    for (let s = 60; s < l.length - 40; s += rng.range(70, 130)) {
      const p = l.at(s, { x: 0, y: 0, tx: 0, ty: 0 })
      const side = rng.next() < 0.5 ? -1 : 1
      const off = BANK_W / 2 + rng.range(4, 14)
      const x = p.x - p.ty * off * side
      const y = p.y + p.tx * off * side
      if (!clearOf(x, y, BANK_W / 2 - 2)) continue
      if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 26)) continue
      out.push({ kind: rng.next() < 0.22 ? 'lamp' : 'reeds', x, y, s: rng.range(12, 20), r: rng.range(0, TAU) })
    }
    for (let s = 90; s < l.length - 60; s += rng.range(120, 220)) {
      const p = l.at(s, { x: 0, y: 0, tx: 0, ty: 0 })
      const side = rng.next() < 0.5 ? -1 : 1
      const off = CANAL_W / 2 - 8
      out.push({ kind: 'lily', x: p.x - p.ty * off * side, y: p.y + p.tx * off * side, s: rng.range(6, 10), r: rng.range(0, TAU) })
    }
  }
  // rich runs: golden flowers line both banks
  for (const seg of level.segs.values()) {
    if (seg.bonus <= 1) continue
    const l = seg.line
    for (let s = 40; s < l.length - 30; s += rng.range(26, 40)) {
      const p = l.at(s, { x: 0, y: 0, tx: 0, ty: 0 })
      for (const side of [-1, 1]) {
        if (rng.next() < 0.35) continue
        const off = BANK_W / 2 + rng.range(-8, 2)
        out.push({ kind: 'gold', x: p.x - p.ty * off * side, y: p.y + p.tx * off * side, s: rng.range(3.5, 5.5), r: rng.range(0, TAU) })
      }
    }
  }
  out.sort((a, b) => a.y - b.y)
  return out
}

function strokeLine(ctx: CanvasRenderingContext2D, l: Polyline) {
  ctx.beginPath()
  ctx.moveTo(l.pts[0].x, l.pts[0].y)
  for (let i = 1; i < l.pts.length; i++) ctx.lineTo(l.pts[i].x, l.pts[i].y)
  ctx.stroke()
}

/**
 * Renders the static world into an offscreen canvas at `scale` device pixels
 * per world unit, covering the world plus generous margins for letterboxing.
 */
export function renderBackground(level: BuiltLevel, decor: Decor[], scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  const w = WORLD_W + BG_PAD_X * 2
  const h = WORLD_H + BG_PAD_Y * 2
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.translate(BG_PAD_X, BG_PAD_Y)

  // ground
  const grd = ctx.createLinearGradient(0, -BG_PAD_Y, 0, WORLD_H + BG_PAD_Y)
  grd.addColorStop(0, '#0a1a20')
  grd.addColorStop(0.5, P.night2)
  grd.addColorStop(1, '#0b1a1f')
  ctx.fillStyle = grd
  ctx.fillRect(-BG_PAD_X, -BG_PAD_Y, w, h)
  const rng = new Rng(99)
  for (let i = 0; i < 26; i++) {
    const x = rng.range(-BG_PAD_X, WORLD_W + BG_PAD_X)
    const y = rng.range(-BG_PAD_Y, WORLD_H + BG_PAD_Y)
    const r = rng.range(90, 220)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, withAlpha(rng.next() < 0.5 ? P.moss2 : P.moss, 0.55))
    g.addColorStop(1, withAlpha(P.moss, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // grass speckle
  for (let i = 0; i < 1400; i++) {
    const x = rng.range(-BG_PAD_X, WORLD_W + BG_PAD_X)
    const y = rng.range(-BG_PAD_Y, WORLD_H + BG_PAD_Y)
    ctx.fillStyle = withAlpha(rng.next() < 0.5 ? '#2c5a4d' : '#0a1418', rng.range(0.15, 0.45))
    ctx.fillRect(x, y, rng.range(1, 2.4), rng.range(2, 5))
  }

  const lines = [...level.segs.values()].map((s) => s.line)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // bank shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = BANK_W + 16
  ctx.save()
  ctx.translate(0, 6)
  for (const l of lines) strokeLine(ctx, l)
  ctx.restore()
  // stone bank
  ctx.strokeStyle = P.stoneLo
  ctx.lineWidth = BANK_W + 4
  for (const l of lines) strokeLine(ctx, l)
  ctx.strokeStyle = P.stone
  ctx.lineWidth = BANK_W
  for (const l of lines) strokeLine(ctx, l)
  ctx.strokeStyle = withAlpha(P.stoneHi, 0.6)
  ctx.lineWidth = BANK_W - 6
  ctx.setLineDash([3, 16])
  for (const l of lines) strokeLine(ctx, l)
  ctx.setLineDash([])
  // bank stones
  for (const l of lines) {
    for (let s = 0; s < l.length; s += 13) {
      const p = l.at(s, { x: 0, y: 0, tx: 0, ty: 0 })
      for (const side of [-1, 1]) {
        const off = BANK_W / 2 - 6 + rng.range(-2, 2)
        const x = p.x - p.ty * off * side
        const y = p.y + p.tx * off * side
        ctx.fillStyle = rng.next() < 0.5 ? P.stoneHi : '#34505a'
        ctx.beginPath()
        ctx.ellipse(x, y, rng.range(4, 7), rng.range(3, 5), rng.range(0, TAU), 0, TAU)
        ctx.fill()
      }
    }
  }
  // water
  ctx.strokeStyle = P.water0
  ctx.lineWidth = CANAL_W
  for (const l of lines) strokeLine(ctx, l)
  ctx.strokeStyle = P.water1
  ctx.lineWidth = CANAL_W - 14
  for (const l of lines) strokeLine(ctx, l)
  ctx.strokeStyle = withAlpha(P.water2, 0.55)
  ctx.lineWidth = CANAL_W - 32
  for (const l of lines) strokeLine(ctx, l)
  // edge foam
  ctx.strokeStyle = withAlpha('#9ff3e6', 0.08)
  ctx.lineWidth = CANAL_W - 4
  ctx.setLineDash([10, 22])
  for (const l of lines) strokeLine(ctx, l)
  ctx.setLineDash([])

  // home pool under the Great Lantern
  const hx = level.def.home.x
  const hy = level.def.home.y
  ctx.fillStyle = P.stoneLo
  ctx.beginPath()
  ctx.ellipse(hx, hy + 8, 92, 58, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = P.stone
  ctx.beginPath()
  ctx.ellipse(hx, hy + 4, 86, 52, 0, 0, TAU)
  ctx.fill()
  const pg = ctx.createRadialGradient(hx, hy, 4, hx, hy, 74)
  pg.addColorStop(0, '#2a8f8e')
  pg.addColorStop(1, P.water0)
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.ellipse(hx, hy + 2, 72, 42, 0, 0, TAU)
  ctx.fill()

  // north spring culvert
  const spring = level.segs.get('n0')!.line.pts[0]
  drawCulvert(ctx, spring.x, spring.y + 50)
  // landmark footings: bridge abutments, the mill's wheel pit and hut
  for (const seg of level.segs.values()) {
    if (seg.feature?.kind === 'reveal') drawAbutments(ctx, bridgeGeo(seg))
    else if (seg.feature?.kind === 'crack') drawMillHut(ctx, millGeo(seg))
  }

  // decor
  for (const d of decor) drawDecor(ctx, d, rng)

  // lamp glows baked in
  ctx.globalCompositeOperation = 'lighter'
  for (const d of decor) {
    if (d.kind === 'lamp') {
      const spr = glowSprite(P.amber, 64)
      ctx.globalAlpha = 0.5
      ctx.drawImage(spr, d.x - 40, d.y - 58, 80, 80)
    }
    if (d.kind === 'house') {
      const spr = glowSprite(P.amber, 64)
      ctx.globalAlpha = 0.3
      ctx.drawImage(spr, d.x - d.s, d.y - d.s * 0.6, d.s * 2, d.s * 2)
    }
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  // vignette
  const vg = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.85)
  vg.addColorStop(0, 'rgba(4,10,14,0)')
  vg.addColorStop(1, 'rgba(4,10,14,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(-BG_PAD_X, -BG_PAD_Y, w, h)
  return c
}

function drawCulvert(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = P.stoneLo
  ctx.beginPath()
  ctx.roundRect(x - 62, y - 70, 124, 70, 14)
  ctx.fill()
  ctx.fillStyle = P.stone
  ctx.beginPath()
  ctx.roundRect(x - 58, y - 68, 116, 62, 12)
  ctx.fill()
  ctx.fillStyle = '#050c10'
  ctx.beginPath()
  ctx.moveTo(x - 32, y - 4)
  ctx.lineTo(x - 32, y - 30)
  ctx.arc(x, y - 30, 32, Math.PI, 0)
  ctx.lineTo(x + 32, y - 4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = P.stoneHi
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y - 30, 36, Math.PI, 0)
  ctx.stroke()
}

function drawAbutments(ctx: CanvasRenderingContext2D, b: BridgeGeo) {
  ctx.save()
  ctx.translate(b.x, b.y)
  ctx.rotate(b.ang)
  for (const e of [-1, 1]) {
    const x = e * (b.half - 3)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.roundRect(x - 9, -b.w / 2 - 3, 18, b.w + 12, 4)
    ctx.fill()
    ctx.fillStyle = P.stoneLo
    ctx.beginPath()
    ctx.roundRect(x - 9, -b.w / 2 - 6, 18, b.w + 12, 4)
    ctx.fill()
    ctx.fillStyle = P.stoneHi
    ctx.beginPath()
    ctx.roundRect(x - 7, -b.w / 2 - 4, 14, b.w + 6, 3)
    ctx.fill()
  }
  ctx.restore()
}

function drawMillHut(ctx: CanvasRenderingContext2D, m: MillGeo) {
  // wheel pit: water cut into the bank under the wheel's lower third
  const side = m.nx < 0 ? -1 : 1
  const inner = m.x - side * 2
  const outer = m.x + side * (m.r + 7)
  const px = Math.min(inner, outer)
  const pw = Math.abs(outer - inner)
  const top = m.water - 3
  const ph = m.r * 0.67 + 9
  ctx.fillStyle = P.stoneLo
  ctx.beginPath()
  ctx.roundRect(side < 0 ? px - 3 : px + 7, top - 3, pw - 4, ph + 6, 5)
  ctx.fill()
  ctx.fillStyle = P.water0
  ctx.beginPath()
  ctx.roundRect(px, top, pw, ph, side < 0 ? [5, 0, 0, 5] : [0, 5, 5, 0])
  ctx.fill()
  const x = m.hx
  const y = m.hy
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x + 4, y + 17, 28, 8, 0, 0, TAU)
  ctx.fill()
  // stone footing and timber walls
  ctx.fillStyle = P.stoneHi
  ctx.beginPath()
  ctx.roundRect(x - 24, y + 8, 48, 9, 3)
  ctx.fill()
  ctx.fillStyle = '#3b2a1e'
  ctx.beginPath()
  ctx.roundRect(x - 22, y - 14, 44, 26, 4)
  ctx.fill()
  ctx.strokeStyle = 'rgba(20,12,8,0.6)'
  ctx.lineWidth = 1.2
  for (let i = -8; i <= 8; i += 8) {
    ctx.beginPath()
    ctx.moveTo(x - 22, y + i * 0.6)
    ctx.lineTo(x + 22, y + i * 0.6)
    ctx.stroke()
  }
  // door and a lit window
  ctx.fillStyle = '#23170f'
  ctx.beginPath()
  ctx.roundRect(x - 15, y - 3, 10, 15, [4, 4, 0, 0])
  ctx.fill()
  ctx.fillStyle = P.amberHi
  ctx.beginPath()
  ctx.roundRect(x + 5, y - 7, 10, 9, 2)
  ctx.fill()
  // roof
  ctx.fillStyle = '#5a3526'
  ctx.beginPath()
  ctx.moveTo(x - 28, y - 12)
  ctx.lineTo(x, y - 38)
  ctx.lineTo(x + 28, y - 12)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#6e4232'
  ctx.beginPath()
  ctx.moveTo(x - 28, y - 12)
  ctx.lineTo(x, y - 38)
  ctx.lineTo(x + 2, y - 12)
  ctx.closePath()
  ctx.fill()
  // coral crack sign: this landmark cracks shells
  ctx.fillStyle = '#1a1210'
  ctx.beginPath()
  ctx.arc(x, y - 21, 9.5, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = P.coral
  ctx.lineWidth = 1.6
  ctx.stroke()
  drawGlyph(ctx, 'coral', x, y - 21, 7, P.coral)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.35
  ctx.drawImage(glowSprite(P.amber, 64), x - 10, y - 22, 40, 40)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function drawDecor(ctx: CanvasRenderingContext2D, d: Decor, rng: Rng) {
  switch (d.kind) {
    case 'tree': {
      const s = d.s
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(d.x + 6, d.y + s * 0.35, s * 0.9, s * 0.45, 0, 0, TAU)
      ctx.fill()
      const blobs = 5
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = ['#0f2a26', '#143630', '#1c4a3e'][layer]
        for (let i = 0; i < blobs; i++) {
          const a = d.r + (i / blobs) * TAU
          const rr = s * (0.42 - layer * 0.1)
          ctx.beginPath()
          ctx.arc(d.x + Math.cos(a) * rr * 0.8 - layer * 3, d.y + Math.sin(a) * rr * 0.6 - layer * 5, s * (0.46 - layer * 0.11), 0, TAU)
          ctx.fill()
        }
      }
      // moonlit rim
      ctx.fillStyle = withAlpha('#5fb39a', 0.18)
      ctx.beginPath()
      ctx.arc(d.x - s * 0.18, d.y - s * 0.3, s * 0.22, 0, TAU)
      ctx.fill()
      break
    }
    case 'house': {
      const s = d.s
      const x = d.x
      const y = d.y
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(x + 5, y + s * 0.42, s * 0.62, s * 0.2, 0, 0, TAU)
      ctx.fill()
      // walls
      ctx.fillStyle = '#2d3a44'
      ctx.beginPath()
      ctx.roundRect(x - s * 0.42, y - s * 0.2, s * 0.84, s * 0.6, 5)
      ctx.fill()
      ctx.fillStyle = '#3a4a55'
      ctx.fillRect(x - s * 0.42, y - s * 0.2, s * 0.84, 5)
      // roof
      ctx.fillStyle = '#4a2d34'
      ctx.beginPath()
      ctx.moveTo(x - s * 0.55, y - s * 0.16)
      ctx.lineTo(x, y - s * 0.62)
      ctx.lineTo(x + s * 0.55, y - s * 0.16)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#62383f'
      ctx.beginPath()
      ctx.moveTo(x - s * 0.55, y - s * 0.16)
      ctx.lineTo(x, y - s * 0.62)
      ctx.lineTo(x + s * 0.05, y - s * 0.16)
      ctx.closePath()
      ctx.fill()
      // windows
      const win = (wx: number, wy: number) => {
        ctx.fillStyle = P.amberHi
        ctx.beginPath()
        ctx.roundRect(wx - 5, wy - 6, 10, 12, 3)
        ctx.fill()
        ctx.fillStyle = '#b4691c'
        ctx.fillRect(wx - 0.75, wy - 6, 1.5, 12)
      }
      win(x - s * 0.2, y + s * 0.08)
      if (rng.next() < 0.7) win(x + s * 0.2, y + s * 0.08)
      // chimney
      ctx.fillStyle = '#2a2025'
      ctx.fillRect(x + s * 0.18, y - s * 0.52, 8, 16)
      break
    }
    case 'reeds': {
      ctx.strokeStyle = '#2f5c45'
      ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.22 + Math.sin(d.r + i) * 0.1
        ctx.beginPath()
        ctx.moveTo(d.x + (i - 2) * 2, d.y)
        ctx.quadraticCurveTo(d.x + (i - 2) * 3, d.y - d.s * 0.6, d.x + Math.cos(a) * d.s, d.y + Math.sin(a) * d.s)
        ctx.stroke()
      }
      ctx.fillStyle = '#5b3b2a'
      ctx.beginPath()
      ctx.ellipse(d.x + 1, d.y - d.s * 0.85, 2.2, 5, 0.1, 0, TAU)
      ctx.fill()
      break
    }
    case 'lamp': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(d.x + 3, d.y + 2, 7, 3, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#20282e'
      ctx.fillRect(d.x - 1.5, d.y - 24, 3, 24)
      ctx.fillStyle = '#2d363d'
      ctx.beginPath()
      ctx.roundRect(d.x - 6, d.y - 34, 12, 12, 3)
      ctx.fill()
      ctx.fillStyle = P.amberHi
      ctx.beginPath()
      ctx.roundRect(d.x - 4, d.y - 32, 8, 8, 2)
      ctx.fill()
      break
    }
    case 'rock': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(d.x + 2, d.y + d.s * 0.3, d.s, d.s * 0.45, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#26363d'
      ctx.beginPath()
      ctx.ellipse(d.x, d.y, d.s, d.s * 0.7, d.r * 0.2, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#34494f'
      ctx.beginPath()
      ctx.ellipse(d.x - d.s * 0.25, d.y - d.s * 0.2, d.s * 0.5, d.s * 0.3, d.r * 0.2, 0, TAU)
      ctx.fill()
      break
    }
    case 'flowers': {
      for (let i = 0; i < 6; i++) {
        const a = d.r + i * 1.3
        const rr = d.s * 0.5 * ((i * 37) % 10) / 10
        const x = d.x + Math.cos(a) * rr
        const y = d.y + Math.sin(a) * rr
        ctx.fillStyle = '#1f4a3a'
        ctx.beginPath()
        ctx.arc(x, y + 2, 3, 0, TAU)
        ctx.fill()
        ctx.fillStyle = i % 2 ? '#e7c9ff' : '#bfe8ff'
        ctx.globalAlpha = 0.75
        ctx.beginPath()
        ctx.arc(x, y, 2.2, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      break
    }
    case 'gold': {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.5
      ctx.drawImage(glowSprite(P.gold, 32), d.x - d.s * 3, d.y - d.s * 3, d.s * 6, d.s * 6)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = P.gold
      for (let i = 0; i < 5; i++) {
        const a = d.r + (i / 5) * TAU
        ctx.beginPath()
        ctx.ellipse(d.x + Math.cos(a) * d.s * 0.55, d.y + Math.sin(a) * d.s * 0.55, d.s * 0.55, d.s * 0.3, a, 0, TAU)
        ctx.fill()
      }
      ctx.fillStyle = '#fff6dc'
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.s * 0.3, 0, TAU)
      ctx.fill()
      break
    }
    case 'lily': {
      ctx.fillStyle = '#1f5a45'
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.s, d.r, d.r + TAU - 0.7)
      ctx.lineTo(d.x, d.y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = withAlpha('#7fd3a8', 0.25)
      ctx.beginPath()
      ctx.arc(d.x - 1, d.y - 1, d.s * 0.5, 0, TAU)
      ctx.fill()
      break
    }
  }
}
