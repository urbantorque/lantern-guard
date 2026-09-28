import { easeOutBack, TAU } from '../core/math'
import { TOWERS, type TowerId } from '../game/defs'
import { signatureFor, type GuardianId } from '../game/guardians'
import { drawGlyph } from './glyphs'
import { FAMILY_COLOR, glowSprite, mix, P, withAlpha } from './palette'

/*
 * Keeper art. At phone scale (render scale ~0.5) a detail must be about 12
 * world units to read, so every upgrade tier follows one grammar:
 * T1 adds an accessory in the keeper's hue, T2 changes the silhouette,
 * T3 transforms the keeper and wraps it in a glow of its hue.
 */

export interface TowerLook {
  guardian?: GuardianId
  id: TowerId
  a: number
  b: number
  angle: number
  /** seconds since last attack */
  since: number
  /** seconds since built */
  age: number
  /** seconds since last upgrade */
  upAge: number
  t: number
  seed: number
}

export const PAD_R = 34

/** A keeper's family colour: its hue on the map, its pad and its effects. */
export function keeperHue(id: TowerId): string {
  return FAMILY_COLOR[TOWERS[id].family] ?? P.amber
}

/**
 * Stone pad. An occupied pad given a hue gets a soft ground glow and a hue rim
 * on its front edge; tier 3 adds a brighter pulsing ring.
 */
export function drawPad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: 'empty' | 'selected' | 'buildable' | 'occupied',
  t: number,
  hue?: string,
  tier = 0,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x + 2, y + 7, PAD_R + 2, PAD_R * 0.55, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = P.stoneLo
  ctx.beginPath()
  ctx.ellipse(x, y + 3, PAD_R, PAD_R * 0.6, 0, 0, TAU)
  ctx.fill()
  const g = ctx.createLinearGradient(x, y - PAD_R * 0.6, x, y + PAD_R * 0.6)
  g.addColorStop(0, '#46606a')
  g.addColorStop(1, '#2c424b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, PAD_R - 2, PAD_R * 0.56, 0, 0, TAU)
  ctx.fill()
  // flagstone seams
  ctx.strokeStyle = 'rgba(15,28,34,0.55)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x - PAD_R * 0.5, y - PAD_R * 0.28)
  ctx.lineTo(x + PAD_R * 0.1, y + PAD_R * 0.1)
  ctx.lineTo(x + PAD_R * 0.6, y - PAD_R * 0.2)
  ctx.moveTo(x + PAD_R * 0.1, y + PAD_R * 0.1)
  ctx.lineTo(x - PAD_R * 0.05, y + PAD_R * 0.5)
  ctx.stroke()
  if (state === 'empty' || state === 'buildable' || state === 'selected') {
    const pulse = state === 'selected' ? 1 : 0.5 + 0.5 * Math.sin(t * 2.4 + x * 0.05)
    ctx.strokeStyle = state === 'selected' ? P.amber : withAlpha(P.amberHi, state === 'buildable' ? 0.25 + pulse * 0.3 : 0.14)
    ctx.lineWidth = state === 'selected' ? 3 : 2
    ctx.setLineDash(state === 'selected' ? [] : [5, 6])
    ctx.lineDashOffset = -t * 8
    ctx.beginPath()
    ctx.ellipse(x, y, PAD_R - 7, PAD_R * 0.56 - 5, 0, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = state === 'selected' ? P.amber : withAlpha(P.amberHi, state === 'buildable' ? 0.55 : 0.25)
    ctx.fillRect(x - 6, y - 1.5, 12, 3)
    ctx.fillRect(x - 1.5, y - 6, 3, 12)
  } else if (hue) {
    ctx.save()
    // soft pool of the keeper's light on the stone
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha *= tier >= 3 ? 0.34 : 0.25
    ctx.translate(x, y)
    ctx.scale(1, 0.58)
    ctx.drawImage(glowSprite(hue, 64), -PAD_R * 1.15, -PAD_R * 1.15, PAD_R * 2.3, PAD_R * 2.3)
    ctx.restore()
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = withAlpha(hue, 0.9)
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(x, y + 3, PAD_R - 1.2, PAD_R * 0.6 - 1.2, 0, 0.12 * Math.PI, 0.88 * Math.PI)
    ctx.stroke()
    if (tier >= 3) {
      const k = 0.7 + 0.3 * Math.sin(t * 2.4 + x * 0.05)
      ctx.beginPath()
      ctx.ellipse(x, y, PAD_R - 5, PAD_R * 0.56 - 4, 0, 0, TAU)
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = withAlpha(hue, 0.4 * k)
      ctx.lineWidth = 7
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = withAlpha(hue, 0.95)
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** Cute face. s is the eye offset; eyes are about s wide, so s >= 4 reads on a phone. */
const face = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, lookX = 0, blink = false) => {
  ctx.fillStyle = '#2a1a12'
  ctx.beginPath()
  for (const side of [-1, 1]) {
    const ex = x + side * s + lookX
    const rx = blink ? s * 0.5 : s * 0.44
    ctx.moveTo(ex + rx, y)
    ctx.ellipse(ex, y, rx, blink ? s * 0.14 : s * 0.6, 0, 0, TAU)
  }
  ctx.fill()
  if (!blink) {
    ctx.fillStyle = '#fff8e8'
    ctx.beginPath()
    for (const side of [-1, 1]) {
      const ex = x + side * s + lookX - s * 0.14
      ctx.moveTo(ex + s * 0.17, y - s * 0.22)
      ctx.arc(ex, y - s * 0.22, s * 0.17, 0, TAU)
    }
    ctx.fill()
  }
  ctx.strokeStyle = '#2a1a12'
  ctx.lineWidth = Math.max(1, s * 0.28)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x + lookX, y + s * 0.5, s * 0.5, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  // cheeks
  ctx.fillStyle = 'rgba(255,120,90,0.42)'
  ctx.beginPath()
  ctx.moveTo(x - s * 1.65 + lookX + s * 0.42, y + s * 0.62)
  ctx.arc(x - s * 1.65 + lookX, y + s * 0.62, s * 0.42, 0, TAU)
  ctx.moveTo(x + s * 1.65 + lookX + s * 0.42, y + s * 0.62)
  ctx.arc(x + s * 1.65 + lookX, y + s * 0.62, s * 0.42, 0, TAU)
  ctx.fill()
}

/** Additive glow that respects the caller's alpha (the build preview ghost is drawn at ~55%). */
const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) => {
  const prevA = ctx.globalAlpha
  const prevOp = ctx.globalCompositeOperation
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.max(0, Math.min(1, prevA * a))
  ctx.drawImage(glowSprite(color, 64), x - r, y - r, r * 2, r * 2)
  ctx.globalAlpha = prevA
  ctx.globalCompositeOperation = prevOp
}

/** The lime "eye" family mark, drawn solid (the shared glyph punches its pupil out, which would hole the map). */
function eyeMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, pupil: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - r, y)
  ctx.quadraticCurveTo(x, y - r * 0.95, x + r, y)
  ctx.quadraticCurveTo(x, y + r * 0.95, x - r, y)
  ctx.fill()
  ctx.fillStyle = pupil
  ctx.beginPath()
  ctx.arc(x, y, r * 0.34, 0, TAU)
  ctx.fill()
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, seed: number, hot = false) {
  const fl = 1 + Math.sin(t * 13 + seed) * 0.08 + Math.sin(t * 7.3 + seed * 2) * 0.06
  glow(ctx, x, y - s * 0.4, s * 3.2, hot ? P.coral : P.amber, 0.55)
  ctx.fillStyle = hot ? '#ff9a5c' : P.amber
  ctx.beginPath()
  ctx.moveTo(x, y - s * 1.9 * fl)
  ctx.bezierCurveTo(x + s * 0.9, y - s * 0.8, x + s * 0.75, y + s * 0.2, x, y + s * 0.25)
  ctx.bezierCurveTo(x - s * 0.75, y + s * 0.2, x - s * 0.9, y - s * 0.8, x, y - s * 1.9 * fl)
  ctx.fill()
  ctx.fillStyle = '#fff3cf'
  ctx.beginPath()
  ctx.ellipse(x, y - s * 0.2, s * 0.32, s * 0.55 * fl, 0, 0, TAU)
  ctx.fill()
}

interface CandleOpts {
  hot?: boolean
  face?: boolean
  /** Hot Wax: molten orange wax down the whole candle */
  molten?: boolean
  /** Long Wick: amber collar with a glowing wick */
  collar?: boolean
  /** Beacon Wick: brass crown around the flame */
  crown?: boolean
  flame?: number
}

/** x fraction of width, length fraction of height, drip width */
const DRIPS: [number, number, number][] = [
  [-0.34, 0.92, 4.8],
  [0.3, 0.66, 4.4],
  [0.02, 0.26, 3.8],
  [0.43, 0.4, 3.2],
]

function candle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, seed: number, o: CandleOpts = {}) {
  const top = y - h
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  g.addColorStop(0, '#e8d3a8')
  g.addColorStop(0.5, '#fff4dc')
  g.addColorStop(1, '#cdb183')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x - w / 2, top, w, h, [w * 0.35, w * 0.35, 3, 3])
  ctx.fill()
  if (o.molten) {
    // molten wax runs the full length and pools at the foot
    ctx.fillStyle = '#ff9245'
    ctx.beginPath()
    ctx.ellipse(x, y - 1, w * 0.74, 4.5, 0, 0, TAU)
    ctx.roundRect(x - w / 2, top, w, 6, [w * 0.35, w * 0.35, 0, 0])
    for (const [xf, lf, dw] of DRIPS) {
      const dx = x + xf * w
      const end = top + 3 + lf * (h - 6)
      ctx.roundRect(dx - dw / 2, top + 2, dw, end - top - 2, dw / 2)
      ctx.moveTo(dx + dw * 0.62, end)
      ctx.arc(dx, end, dw * 0.62, 0, TAU)
    }
    ctx.fill()
    ctx.fillStyle = 'rgba(255,214,160,0.8)'
    ctx.beginPath()
    for (const [xf, lf, dw] of DRIPS) {
      if (dw < 4) continue
      ctx.roundRect(x + xf * w - dw * 0.3, top + 5, dw * 0.28, lf * (h - 6) * 0.8, dw * 0.14)
    }
    ctx.fill()
  } else {
    ctx.fillStyle = o.hot ? '#ffb07a' : '#fff4dc'
    ctx.beginPath()
    ctx.ellipse(x - w * 0.25, top + 5, w * 0.12, 5, 0, 0, TAU)
    ctx.ellipse(x + w * 0.22, top + 7, w * 0.1, 7, 0, 0, TAU)
    ctx.fill()
  }
  if (o.collar) {
    ctx.fillStyle = P.amber
    ctx.beginPath()
    ctx.roundRect(x - w / 2 - 1.5, top + 5, w + 3, 5.5, 2.75)
    ctx.fill()
    ctx.fillStyle = P.amberHi
    ctx.fillRect(x - w / 2 + 1, top + 6, w - 2, 1.5)
  }
  if (o.face) face(ctx, x, y - h * 0.42, Math.max(2.4, w * 0.22), 0, ((t + seed) % 4) < 0.12)
  // wick
  ctx.strokeStyle = '#3a2618'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x, top - 4)
  ctx.stroke()
  if (o.collar) glow(ctx, x, top - 2, w * 1.1, P.amber, 0.6)
  if (o.crown) beaconCrown(ctx, x, top, w, t)
  flame(ctx, x, top - 5, o.flame ?? Math.max(3.5, w * 0.28), t, seed, o.hot)
}

function beaconCrown(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, t: number) {
  const cw = w / 2 + 4
  glow(ctx, x, top - 12, 46, P.amber, 0.5 + Math.sin(t * 3) * 0.08)
  const g = ctx.createLinearGradient(x - cw, 0, x + cw, 0)
  g.addColorStop(0, '#c9822f')
  g.addColorStop(0.5, P.amberHi)
  g.addColorStop(1, '#b8742a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - cw, top + 4)
  ctx.lineTo(x - cw - 3, top - 15)
  ctx.lineTo(x - cw * 0.45, top - 5)
  ctx.lineTo(x, top - 13)
  ctx.lineTo(x + cw * 0.45, top - 5)
  ctx.lineTo(x + cw + 3, top - 15)
  ctx.lineTo(x + cw, top + 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fff3cf'
  ctx.beginPath()
  ctx.arc(x - cw - 3, top - 15, 2.6, 0, TAU)
  ctx.moveTo(x + cw + 5.6, top - 15)
  ctx.arc(x + cw + 3, top - 15, 2.6, 0, TAU)
  ctx.fill()
}

export function drawTower(ctx: CanvasRenderingContext2D, x: number, y: number, L: TowerLook) {
  // Broad pennants distinguish specialised paths even when portrait details are small.
  if (Math.max(L.a, L.b) >= 2) {
    ctx.save(); ctx.strokeStyle = '#e6d6ad'; ctx.fillStyle = keeperHue(L.id); ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x - 28, y + 2); ctx.lineTo(x - 28, y - 47); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - 28, y - 47); ctx.lineTo(x - 9, y - 47)
    if (L.b > L.a) { ctx.lineTo(x - 16, y - 39); ctx.lineTo(x - 9, y - 31) } else ctx.lineTo(x - 9, y - 31)
    ctx.lineTo(x - 28, y - 31); ctx.closePath(); ctx.fill()
    if (Math.max(L.a, L.b) === 3) { ctx.fillStyle = P.cream; ctx.fillRect(x - 26, y - 43, 12, 4) }
    ctx.restore()
  }
  const pop = L.age < 0.4 ? easeOutBack(L.age / 0.4) : 1
  const upK = L.upAge < 0.35 ? Math.sin((L.upAge / 0.35) * Math.PI) : 0
  const kick = L.since < 0.12 ? 1 - L.since / 0.12 : 0
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(pop * (1 + upK * 0.12), pop * (1 - upK * 0.1 + kick * 0.05))
  switch (L.id) {
    case 'wick':
      drawWick(ctx, L, kick)
      break
    case 'cracker':
      drawCracker(ctx, L, kick)
      break
    case 'bell':
      drawBell(ctx, L)
      break
    case 'owl':
      drawOwl(ctx, L, kick)
      break
    case 'beam':
      drawLighthouse(ctx, L)
      break
    case 'garden':
      drawGarden(ctx, L)
      break
  }
  if (signatureFor(L.id, L.guardian)) {
    // Broad, quiet silhouette changes remain legible at phone size.
    ctx.lineWidth = 3.5; ctx.lineCap = 'round'
    if (L.guardian === 'ember') {
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#ff864f'; ctx.beginPath()
        ctx.moveTo(side * 20, -5); ctx.quadraticCurveTo(side * 36, -14, side * 23, -31)
        ctx.quadraticCurveTo(side * 14, -13, side * 20, -5); ctx.fill()
      }
    } else if (L.guardian === 'reed') {
      ctx.strokeStyle = '#9ed589'
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 15, 0); ctx.quadraticCurveTo(side * 28, -17, side * 21, -38); ctx.stroke()
        ctx.fillStyle = '#d3e6a4'; ctx.fillRect(side * 21 - 3, -37, 6, 12)
      }
    } else {
      ctx.strokeStyle = '#7bdef1'
      for (const offset of [0, 8]) { ctx.beginPath(); ctx.moveTo(-27, offset - 9); ctx.bezierCurveTo(-10, offset - 20, 10, offset + 2, 27, offset - 9); ctx.stroke() }
    }
  }
  ctx.restore()
  if (upK > 0) glow(ctx, x, y - 24, 72, keeperHue(L.id), upK * 0.75)
}

function drawWick(ctx: CanvasRenderingContext2D, L: TowerLook, kick: number) {
  const { a, b, t, seed } = L
  const hot = b >= 2
  const h = (b >= 1 ? 42 : 30) + (b >= 3 ? 4 : 0) - kick * 3
  const w = 20 + (b >= 2 ? 2 : 0)
  const sideFlame = 4.8
  if (a >= 3) {
    // Candelabra: brass arms carry four more candles, bathed in amber
    glow(ctx, 0, -26, 60, P.amber, 0.34 + Math.sin(t * 2 + seed) * 0.05)
    ctx.strokeStyle = '#d99a45'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-30, -14)
    ctx.quadraticCurveTo(0, 12, 30, -14)
    ctx.moveTo(-17, -27)
    ctx.quadraticCurveTo(0, -6, 17, -27)
    ctx.stroke()
    ctx.fillStyle = P.amber
    ctx.beginPath()
    for (const [cx, cy] of [[-30, -14], [30, -14], [-17, -27], [17, -27]]) {
      ctx.moveTo(cx + 8, cy + 1)
      ctx.ellipse(cx, cy + 1, 8, 3, 0, 0, TAU)
    }
    ctx.fill()
    candle(ctx, -30, -14, 12, 17, t, seed + 1, { hot, flame: sideFlame })
    candle(ctx, 30, -14, 12, 17, t, seed + 2, { hot, flame: sideFlame })
    candle(ctx, -17, -27, 11, 13, t, seed + 3, { hot, flame: sideFlame })
    candle(ctx, 17, -27, 11, 13, t, seed + 4, { hot, flame: sideFlame })
  } else if (a >= 1) {
    // Twin Wick / Tri-Candle: bold side candles on amber saucers
    for (const sd of a >= 2 ? [-1, 1] : [-1]) {
      const cx = sd * 20
      ctx.fillStyle = '#c9863a'
      ctx.beginPath()
      ctx.ellipse(cx, 6, 10, 4, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = P.amber
      ctx.beginPath()
      ctx.ellipse(cx, 4.5, 9, 3.2, 0, 0, TAU)
      ctx.fill()
      candle(ctx, cx, 4, 13, sd < 0 ? 22 : 26, t, seed + (sd < 0 ? 1 : 2), { hot, flame: sideFlame })
    }
  }
  candle(ctx, 0, 6, w, h, t, seed, {
    hot,
    face: true,
    molten: b >= 2,
    collar: b >= 1,
    crown: b >= 3,
    flame: b >= 3 ? 8 : b >= 1 ? 6.8 : 5.6,
  })
}

function drawCracker(ctx: CanvasRenderingContext2D, L: TowerLook, kick: number) {
  const { a, b, t, angle, seed } = L
  const finale = a >= 3
  const rocket = b >= 2
  if (finale || b >= 3) glow(ctx, 0, -28, 60, P.coral, 0.34 + Math.sin(t * 3 + seed) * 0.06)
  // wooden tub
  ctx.fillStyle = '#4a2f1f'
  ctx.beginPath()
  ctx.ellipse(0, 3, 23, 11, 0, 0, TAU)
  ctx.fill()
  const tg = ctx.createLinearGradient(-21, 0, 21, 0)
  tg.addColorStop(0, '#6a4429')
  tg.addColorStop(0.45, '#8f603c')
  tg.addColorStop(1, '#5a3a24')
  ctx.fillStyle = tg
  ctx.beginPath()
  ctx.roundRect(-21, -14, 42, 18, [3, 3, 9, 9])
  ctx.fill()
  // rim: gold on the Grand Finale
  ctx.fillStyle = finale ? P.gold : '#3d2718'
  ctx.beginPath()
  ctx.roundRect(-23, -17, 46, 5.5, 2.75)
  ctx.fill()
  if (finale) {
    drawGlyph(ctx, 'lilac', -15.5, -4, 5.5, P.gold)
    drawGlyph(ctx, 'lilac', 15.5, -4, 5.5, P.gold)
  }
  face(ctx, 0, -5, 4.2, Math.cos(angle) * 1.5, ((t + seed) % 5) < 0.1)
  // Sparkler Tail: a fizzing sparkler planted in the tub
  if (b >= 1) {
    const sx = 19
    const sy = -38
    ctx.strokeStyle = '#9aa3aa'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(15, -15)
    ctx.lineTo(sx, sy)
    ctx.stroke()
    const fl = 1 + Math.sin(t * 23 + seed) * 0.15
    glow(ctx, sx, sy, 20, P.coral, 0.8)
    drawGlyph(ctx, 'coral', sx, sy, 7.5 * fl, '#ffd2bd')
    ctx.fillStyle = '#fff0d0'
    for (let i = 0; i < 3; i++) {
      const sa = t * 9 + i * 2.1
      const px = sx + Math.cos(sa) * 12
      const py = sy + Math.sin(sa) * 8
      glow(ctx, px, py, 7, P.amberHi, 0.8)
      ctx.beginPath()
      ctx.arc(px, py, 1.7, 0, TAU)
      ctx.fill()
    }
  }
  // tubes aim at the target
  const n = finale || b >= 3 ? 3 : a >= 2 ? 2 : 1
  const aim = Math.max(-Math.PI + 0.4, Math.min(-0.4, angle))
  for (let i = 0; i < n; i++) {
    const off = i - (n - 1) / 2
    const big = finale && off === 0
    const wd = big ? 19 : n === 3 ? 12.5 : a >= 1 ? 15 : 11
    const len = (big ? 36 : rocket ? 30 : 26) - kick * 6
    ctx.save()
    ctx.translate(off * (n === 3 ? 13 : 14), -15)
    ctx.rotate(aim + Math.PI / 2 + off * 0.14)
    if (rocket) {
      // fins
      ctx.fillStyle = '#c94a32'
      ctx.beginPath()
      ctx.moveTo(-wd / 2, -2)
      ctx.lineTo(-wd / 2 - 6, 3)
      ctx.lineTo(-wd / 2, -13)
      ctx.moveTo(wd / 2, -2)
      ctx.lineTo(wd / 2 + 6, 3)
      ctx.lineTo(wd / 2, -13)
      ctx.fill()
    }
    const g = ctx.createLinearGradient(-wd / 2, 0, wd / 2, 0)
    g.addColorStop(0, big ? '#b9791f' : '#b3452f')
    g.addColorStop(0.5, big ? P.gold : P.coral)
    g.addColorStop(1, big ? '#a26a1a' : '#9a3624')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(-wd / 2, -len, wd, len, 3)
    ctx.fill()
    ctx.fillStyle = big ? '#fff1c0' : '#ffe3b0'
    ctx.fillRect(-wd / 2, -len * 0.55, wd, 3.5)
    if (big) ctx.fillRect(-wd / 2, -len * 0.3, wd, 2.5)
    ctx.fillStyle = '#2b1a12'
    ctx.beginPath()
    ctx.ellipse(0, -len, wd / 2, 2.8, 0, 0, TAU)
    ctx.fill()
    if (a >= 1) {
      // Big Bang: a bright ring around the mouth
      glow(ctx, 0, -len - 2, wd, big ? P.gold : P.coral, 0.55)
      ctx.strokeStyle = big ? '#fff3c4' : '#ffd2a0'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(0, -len, wd / 2 + 0.5, 3.4, 0, 0, TAU)
      ctx.stroke()
    }
    if (rocket) {
      // rocket nose peeking out
      ctx.fillStyle = P.cream
      ctx.beginPath()
      ctx.moveTo(-wd / 2 + 1.5, -len)
      ctx.quadraticCurveTo(-wd / 2 + 1.5, -len - 8, 0, -len - 13)
      ctx.quadraticCurveTo(wd / 2 - 1.5, -len - 8, wd / 2 - 1.5, -len)
      ctx.fill()
      ctx.fillStyle = P.coral
      ctx.beginPath()
      ctx.moveTo(-3, -len - 8.5)
      ctx.quadraticCurveTo(0, -len - 11, 0, -len - 13)
      ctx.quadraticCurveTo(0, -len - 11, 3, -len - 8.5)
      ctx.fill()
    }
    ctx.restore()
  }
}

/** Bell body hanging from (0,0), s = size multiplier. */
function bellBody(ctx: CanvasRenderingContext2D, s: number, heavy: boolean, frost: boolean) {
  const g = ctx.createLinearGradient(-14 * s, 0, 14 * s, 0)
  g.addColorStop(0, frost ? '#8cc3e6' : '#8fc7ec')
  g.addColorStop(0.45, '#eef9ff')
  g.addColorStop(1, heavy ? '#4f86ad' : '#6aa6cf')
  // crown loop
  ctx.fillStyle = '#4f6f86'
  ctx.beginPath()
  ctx.roundRect(-3 * s, -2, 6 * s, 7, 2)
  ctx.fill()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-6 * s, 4)
  ctx.quadraticCurveTo(-8 * s, 10, -10 * s, 22 * s)
  ctx.quadraticCurveTo(-15 * s, 30 * s, -16 * s, 32 * s)
  ctx.lineTo(16 * s, 32 * s)
  ctx.quadraticCurveTo(15 * s, 30 * s, 10 * s, 22 * s)
  ctx.quadraticCurveTo(8 * s, 10, 6 * s, 4)
  ctx.closePath()
  ctx.fill()
  if (heavy) {
    // Deep Toll: a thick banded rim
    ctx.fillStyle = '#2f5878'
    ctx.beginPath()
    ctx.roundRect(-16.5 * s, 32 * s - 5, 33 * s, 7, 3)
    ctx.fill()
    ctx.fillStyle = '#bfe6ff'
    ctx.fillRect(-15 * s, 32 * s - 2.5, 30 * s, 2)
  } else {
    ctx.fillStyle = '#3e6e8e'
    ctx.fillRect(-16 * s, 30 * s, 32 * s, 3)
  }
}

/** Tubular chimes on a crossbar off one arch leg (Chime path). */
function chimeSet(ctx: CanvasRenderingContext2D, side: number, x0: number, y0: number, t: number, swing: number, lit: boolean) {
  ctx.strokeStyle = '#7f9fb4'
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + side * 23, y0)
  ctx.stroke()
  const lens = [21, 16, 11.5]
  for (let i = 0; i < 3; i++) {
    const cx = x0 + side * (7.5 + i * 6.5)
    const sw = Math.sin(t * 2.6 + i * 1.3 + side) * 0.07 + swing * 0.6
    const len = lens[i]
    ctx.save()
    ctx.translate(cx, y0)
    ctx.rotate(sw)
    ctx.strokeStyle = '#3c5566'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, 3.5)
    ctx.stroke()
    const g = ctx.createLinearGradient(-2.6, 0, 2.6, 0)
    g.addColorStop(0, lit ? '#9fd8ff' : '#6f8fa6')
    g.addColorStop(0.45, lit ? '#ffffff' : '#e6f6ff')
    g.addColorStop(1, lit ? '#9fd8ff' : '#8fb8d4')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(-2.6, 3, 5.2, len, 2.6)
    ctx.fill()
    if (lit) glow(ctx, 0, 3 + len, 10, P.ice, 0.75)
    ctx.restore()
  }
}

function drawBell(ctx: CanvasRenderingContext2D, L: TowerLook) {
  const { a, b, t, since, seed } = L
  const swing = since < 1 ? Math.sin(since * 14) * (1 - since) * 0.35 : Math.sin(t * 1.3 + seed) * 0.03
  const big = a >= 1
  const aw = big ? 24 : 21
  const legTop = big ? -34 : -30
  const apex = legTop - 10
  if (a >= 3 || b >= 3) glow(ctx, 0, apex - (a >= 3 ? 12 : 0), 60, P.ice, 0.4 + Math.sin(t * 2.5 + seed) * 0.07)
  // arch frame, frosted toward the ice hue
  const ag = ctx.createLinearGradient(0, 6, 0, apex - 20)
  ag.addColorStop(0, '#6f8fa6')
  ag.addColorStop(1, a >= 3 ? '#d6eefc' : '#a9cde6')
  ctx.lineCap = 'round'
  ctx.strokeStyle = ag
  ctx.lineWidth = 6.5
  ctx.beginPath()
  ctx.moveTo(-aw, 6)
  ctx.lineTo(-aw, legTop)
  ctx.quadraticCurveTo(0, legTop - 20, aw, legTop)
  ctx.lineTo(aw, 6)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(236,249,255,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-aw + 1.5, 3)
  ctx.lineTo(-aw + 1.5, legTop)
  ctx.quadraticCurveTo(0, legTop - 17.5, aw - 1.5, legTop)
  ctx.stroke()
  ctx.fillStyle = '#4f6b80'
  ctx.beginPath()
  ctx.roundRect(-aw - 5, 3, 10, 5, 2)
  ctx.roundRect(aw - 5, 3, 10, 5, 2)
  ctx.fill()
  // Ringing Hit: a second, smaller bell in a cote on top of the arch
  if (a >= 2) {
    ctx.strokeStyle = ag
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-9, apex + 2)
    ctx.lineTo(-9, apex - 11)
    ctx.quadraticCurveTo(0, apex - 24, 9, apex - 11)
    ctx.lineTo(9, apex + 2)
    ctx.stroke()
    ctx.save()
    ctx.translate(0, apex - 17)
    ctx.rotate(-swing * 1.4)
    bellBody(ctx, 0.4, false, a >= 3)
    ctx.restore()
  }
  // Stillbell: a crown of frost crystals
  if (a >= 3) {
    const cy = apex - 18
    ctx.fillStyle = '#ecf9ff'
    ctx.strokeStyle = P.ice
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (const [ang, len] of [[0, 15], [-0.6, 12], [0.6, 12], [-1.15, 9], [1.15, 9]]) {
      const dx = Math.sin(ang)
      const dy = -Math.cos(ang)
      const px = -dy * 2.6
      const py = dx * 2.6
      ctx.moveTo(dx * 4, cy + dy * 4)
      ctx.lineTo(dx * (len * 0.55) + px, cy + dy * (len * 0.55) + py)
      ctx.lineTo(dx * len, cy + dy * len)
      ctx.lineTo(dx * (len * 0.55) - px, cy + dy * (len * 0.55) - py)
      ctx.closePath()
    }
    ctx.fill()
    ctx.stroke()
  }
  // Chime path: tubular chimes hang off the legs
  if (b >= 1) chimeSet(ctx, 1, aw, legTop + 6, t, swing, b >= 3)
  if (b >= 2) chimeSet(ctx, -1, -aw, legTop + 6, t, swing, b >= 3)
  if (b >= 3) {
    // Bellwether: a frost star finial
    ctx.strokeStyle = ag
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, apex)
    ctx.lineTo(0, apex - 6)
    ctx.stroke()
    glow(ctx, 0, apex - 12, 18, P.ice, 0.8)
    drawGlyph(ctx, 'ice', 0, apex - 12, 8, '#eaf8ff')
  }
  // the bell
  const s = a >= 3 ? 1.28 : big ? 1.22 : 1
  ctx.save()
  ctx.translate(0, apex + 3)
  ctx.rotate(swing)
  bellBody(ctx, s, big, a >= 3)
  face(ctx, 0, 18 * s, 4 * (big ? 1.12 : 1))
  // clapper
  ctx.fillStyle = '#35556b'
  ctx.beginPath()
  ctx.arc(Math.sin(swing * 3) * 5, 33 * s + 1, 3.8, 0, TAU)
  ctx.fill()
  if (a >= 3) {
    // icicles along the rim
    ctx.fillStyle = '#f0faff'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const fx = -16 + i * 8
      ctx.moveTo(fx - 2.6, 32 * s + 1)
      ctx.lineTo(fx, 32 * s + 7 + (i % 2) * 3)
      ctx.lineTo(fx + 2.6, 32 * s + 1)
    }
    ctx.fill()
  }
  ctx.restore()
  if (since < 0.3) glow(ctx, 0, -20, 50, P.ice, (0.3 - since) * 2)
}

function drawOwl(ctx: CanvasRenderingContext2D, L: TowerLook, kick: number) {
  const { a, b, t, angle, seed } = L
  // post
  ctx.fillStyle = '#3b2c22'
  ctx.fillRect(-4, -14, 8, 20)
  ctx.fillStyle = '#4f3b2c'
  ctx.beginPath()
  ctx.roundRect(-15, -18, 30, 7, 3)
  ctx.fill()
  const lookX = Math.cos(angle) * 3
  const lookY = Math.sin(angle) * 2
  const bob = Math.sin(t * 2 + seed) * 1.2 - kick * 3
  ctx.save()
  ctx.translate(0, -34 + bob)
  // wings
  if (a >= 3) {
    // Great Horned: wings spread wide, lime-tipped
    const f = Math.sin(t * 4 + seed) * 3
    glow(ctx, 0, -6, 56, P.lime, 0.32)
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#5b4636'
      ctx.beginPath()
      ctx.moveTo(side * 9, -6)
      ctx.quadraticCurveTo(side * 24, -26 - f, side * 42, -20 - f)
      ctx.lineTo(side * 38, -11 - f * 0.6)
      ctx.lineTo(side * 42, -4 - f * 0.3)
      ctx.lineTo(side * 33, -2)
      ctx.lineTo(side * 35, 5)
      ctx.lineTo(side * 25, 3)
      ctx.lineTo(side * 25, 10)
      ctx.quadraticCurveTo(side * 16, 12, side * 9, 10)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#7a5f48'
      ctx.beginPath()
      ctx.moveTo(side * 10, -4)
      ctx.quadraticCurveTo(side * 22, -19 - f, side * 34, -15 - f)
      ctx.quadraticCurveTo(side * 24, -6, side * 12, 4)
      ctx.fill()
      ctx.fillStyle = P.lime
      ctx.beginPath()
      for (const [fx, fy] of [[42, -20 - f], [42, -4 - f * 0.3], [35, 5], [25, 10]]) {
        ctx.moveTo(side * fx + 2.6, fy)
        ctx.arc(side * fx, fy, 2.6, 0, TAU)
      }
      ctx.fill()
    }
  } else if (a >= 1) {
    // Sharp Talons: wings raised, ready to strike
    ctx.fillStyle = '#4e3b2d'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * 9, -8)
      ctx.quadraticCurveTo(side * 21, -25, side * 28, -18)
      ctx.quadraticCurveTo(side * 27, 0, side * 11, 13)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = '#7a5f48'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const side of [-1, 1]) {
      ctx.moveTo(side * 13, -10)
      ctx.quadraticCurveTo(side * 22, -18, side * 26, -16)
    }
    ctx.stroke()
  }
  // Parliament: a lime halo of watching eyes behind the head
  if (b >= 3) {
    glow(ctx, 0, -10, 54, P.lime, 0.4 + Math.sin(t * 2.2 + seed) * 0.06)
    ctx.strokeStyle = P.lime
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, -10, 26, 0, TAU)
    ctx.stroke()
    for (const d of [-1.3, -0.55, 0.55, 1.3]) {
      const ang = -Math.PI / 2 + d
      const ex = Math.cos(ang) * 26
      const ey = -10 + Math.sin(ang) * 26
      ctx.fillStyle = '#1a2410'
      ctx.beginPath()
      ctx.arc(ex, ey, 5, 0, TAU)
      ctx.fill()
      eyeMark(ctx, ex, ey, 4.2, P.lime, '#1a2410')
    }
  }
  // body
  const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 20)
  g.addColorStop(0, '#9b8266')
  g.addColorStop(1, '#5a4535')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 2, 15, 18, 0, 0, TAU)
  ctx.fill()
  // belly
  ctx.fillStyle = '#d8c3a0'
  ctx.beginPath()
  ctx.ellipse(0, 8, 9, 10, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#a58c6c'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(Math.cos(0.2) * 4, 4 + i * 4 + Math.sin(0.2) * 4)
    ctx.arc(0, 4 + i * 4, 4, 0.2, Math.PI - 0.2)
  }
  ctx.stroke()
  // ear tufts
  ctx.fillStyle = '#5a4535'
  ctx.beginPath()
  for (const side of [-1, 1]) {
    ctx.moveTo(side * 6, -12)
    ctx.lineTo(side * 15, -23 - (a >= 2 ? 3 : 0))
    ctx.lineTo(side * 13, -9)
  }
  ctx.fill()
  // face disc + glowing eyes
  ctx.fillStyle = '#c9b08c'
  ctx.beginPath()
  ctx.ellipse(-6, -5, 7.5, 7.5, 0, 0, TAU)
  ctx.ellipse(6, -5, 7.5, 7.5, 0, 0, TAU)
  ctx.fill()
  glow(ctx, 0, -5, 26, P.lime, 0.45 + Math.sin(t * 2.2) * 0.1)
  for (const side of [-1, 1]) {
    ctx.fillStyle = P.lime
    ctx.beginPath()
    ctx.arc(side * 6 + lookX * 0.4, -5 + lookY * 0.4, 4.8, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#1a2410'
    ctx.beginPath()
    ctx.arc(side * 6 + lookX, -5 + lookY, 2.4, 0, TAU)
    ctx.fill()
  }
  if (a >= 2) {
    // Ironbeak: steel helm with a nasal guard that masks the beak
    const hg = ctx.createLinearGradient(-14, -22, 14, -4)
    hg.addColorStop(0, '#e4edf1')
    hg.addColorStop(0.5, '#9fb3bd')
    hg.addColorStop(1, '#5f727d')
    ctx.fillStyle = '#6f828d'
    ctx.beginPath()
    ctx.moveTo(-3, -21)
    ctx.lineTo(0, -31)
    ctx.lineTo(3, -21)
    ctx.fill()
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.moveTo(-15.5, -7)
    ctx.quadraticCurveTo(-15.5, -22, 0, -23)
    ctx.quadraticCurveTo(15.5, -22, 15.5, -7)
    ctx.lineTo(3.2, -10.5)
    ctx.lineTo(2.8, 3)
    ctx.lineTo(0, 7.5)
    ctx.lineTo(-2.8, 3)
    ctx.lineTo(-3.2, -10.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#44545d'
    ctx.beginPath()
    ctx.arc(-9, -13.5, 1.4, 0, TAU)
    ctx.moveTo(10.4, -13.5)
    ctx.arc(9, -13.5, 1.4, 0, TAU)
    ctx.fill()
  } else {
    ctx.fillStyle = '#e3a84a'
    ctx.beginPath()
    ctx.moveTo(-2.8, 0)
    ctx.lineTo(2.8, 0)
    ctx.lineTo(0, 5.5)
    ctx.fill()
  }
  // Keen Eyes: big round spectacles
  if (b >= 1) {
    ctx.fillStyle = 'rgba(236,255,210,0.16)'
    ctx.strokeStyle = '#f2dc98'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(-6 + 7.8, -5)
    ctx.arc(-6, -5, 7.8, 0, TAU)
    ctx.moveTo(6 + 7.8, -5)
    ctx.arc(6, -5, 7.8, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-13.8, -6)
    ctx.lineTo(-16, -10)
    ctx.moveTo(13.8, -6)
    ctx.lineTo(16, -10)
    ctx.stroke()
  }
  // Night Watch: a tall watchman's hat with a lime band
  if (b >= 2) {
    ctx.fillStyle = '#2f4a70'
    ctx.beginPath()
    ctx.ellipse(0, -16, 19, 4.5, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#39598a'
    ctx.beginPath()
    ctx.moveTo(-12, -17)
    ctx.quadraticCurveTo(-7, -30, 5, -40)
    ctx.quadraticCurveTo(4, -28, 12, -17)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = P.lime
    ctx.beginPath()
    ctx.moveTo(-11.6, -18)
    ctx.lineTo(11.6, -18)
    ctx.lineTo(10.6, -22.5)
    ctx.lineTo(-10.4, -22.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = P.gold
    ctx.beginPath()
    ctx.arc(5, -40, 3, 0, TAU)
    ctx.fill()
  }
  // feet: lime talons on the Hunter path
  if (a >= 1) {
    // hooked talons gripping the perch
    ctx.fillStyle = P.lime
    ctx.beginPath()
    for (const side of [-1, 1]) {
      for (const dir of [-1, 1]) {
        // a crescent hook curling outward over the perch
        const cx = side * 7.5 + dir * 3.4
        ctx.moveTo(cx - dir * 2.2, 17)
        ctx.lineTo(cx + dir * 2.2, 17)
        ctx.quadraticCurveTo(cx + dir * 5.5, 21, cx + dir * 3.6, 26)
        ctx.quadraticCurveTo(cx + dir * 1.2, 21.5, cx - dir * 2.2, 17)
      }
    }
    ctx.fill()
  } else {
    ctx.fillStyle = '#e3a84a'
    ctx.beginPath()
    for (const side of [-1, 1]) {
      ctx.moveTo(side * 5 - 3, 18)
      ctx.lineTo(side * 5, 22.5)
      ctx.lineTo(side * 5 + 3, 18)
    }
    ctx.fill()
  }
  ctx.restore()
}

function drawLighthouse(ctx: CanvasRenderingContext2D, L: TowerLook) {
  const { a, b, t, seed } = L
  const h = b >= 1 ? 50 : 38
  const top = -h
  const twin = b >= 3
  const glass = b >= 2 ? P.lime : P.lilac
  const lampY = top - 9
  if (a >= 3 || b >= 3) glow(ctx, 0, lampY, 66, P.lilac, 0.42 + Math.sin(t * 2 + seed) * 0.06)
  // Sunbeam: turning sun rays behind the lamp
  if (a >= 3) {
    ctx.save()
    ctx.translate(0, lampY)
    ctx.rotate(t * 0.35)
    for (const odd of [0, 1]) {
      ctx.fillStyle = odd ? P.gold : P.lilac
      ctx.beginPath()
      for (let i = odd; i < 12; i += 2) {
        const ang = (i / 12) * TAU
        const r1 = odd ? 25 : 20
        ctx.moveTo(Math.cos(ang - 0.16) * 11, Math.sin(ang - 0.16) * 11)
        ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1)
        ctx.lineTo(Math.cos(ang + 0.16) * 11, Math.sin(ang + 0.16) * 11)
      }
      ctx.fill()
    }
    ctx.restore()
  }
  // base rock
  ctx.fillStyle = '#34464e'
  ctx.beginPath()
  ctx.ellipse(0, 3, 22, 10, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#41565f'
  ctx.beginPath()
  ctx.ellipse(-4, 0, 13, 5.5, 0, 0, TAU)
  ctx.fill()
  // striped tower; the face sits on a cream band
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(-15, 3)
  ctx.lineTo(-10, top)
  ctx.lineTo(10, top)
  ctx.lineTo(15, 3)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = '#f2e6cc'
  ctx.fillRect(-16, top - 2, 32, h + 6)
  ctx.fillStyle = '#2f6f78'
  for (let y = top + 4; y < -22; y += 9) ctx.fillRect(-16, y, 32, 5)
  ctx.fillRect(-16, -2, 32, 6)
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.fillRect(4, top - 2, 14, h + 6)
  ctx.restore()
  face(ctx, 0, -13, 4)
  // Night Lens: a lime eye badge that sees Veils
  if (b >= 2) {
    const by = twin ? -31 : -30
    ctx.fillStyle = '#16262d'
    ctx.beginPath()
    ctx.arc(0, by, 7.2, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = P.lime
    ctx.lineWidth = 1.6
    ctx.stroke()
    eyeMark(ctx, 0, by, 5.4, P.lime, '#16262d')
  }
  // gallery
  const gw = a >= 1 ? 20 : twin ? 19 : 13
  ctx.fillStyle = '#23343b'
  ctx.beginPath()
  ctx.roundRect(-gw, top - 3, gw * 2, 5, 2)
  ctx.fill()
  // lamp room(s)
  const lw = twin ? 13 : a >= 2 ? 17 : 15
  for (const lx of twin ? [-8.5, 8.5] : [0]) {
    const gg = ctx.createLinearGradient(lx - lw / 2, 0, lx + lw / 2, 0)
    gg.addColorStop(0, mix(glass, '#5a4c80', 0.25))
    gg.addColorStop(0.5, mix(glass, '#ffffff', 0.55))
    gg.addColorStop(1, mix(glass, '#5a4c80', 0.25))
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.roundRect(lx - lw / 2, top - 15, lw, 12, 2.5)
    ctx.fill()
    glow(ctx, lx, lampY, 24 + a * 6, glass, 0.6 + Math.sin(t * 4) * 0.08)
    ctx.strokeStyle = 'rgba(35,52,59,0.7)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(lx, top - 15)
    ctx.lineTo(lx, top - 3)
    ctx.stroke()
    if (a >= 3) {
      // gold dome
      const dr = lw / 2 + 1.5
      const dg = ctx.createLinearGradient(lx - dr, 0, lx + dr, 0)
      dg.addColorStop(0, '#c98f2e')
      dg.addColorStop(0.45, '#fff0b0')
      dg.addColorStop(1, '#b07a22')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(lx, top - 15, dr, Math.PI, TAU)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(lx - 1.8, top - 14 - dr)
      ctx.lineTo(lx, top - 20 - dr)
      ctx.lineTo(lx + 1.8, top - 14 - dr)
      ctx.fill()
    } else {
      ctx.fillStyle = '#23343b'
      ctx.beginPath()
      ctx.moveTo(lx - lw / 2 - 2.5, top - 15)
      ctx.lineTo(lx, top - 24)
      ctx.lineTo(lx + lw / 2 + 2.5, top - 15)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(lx, top - 25, 2, 0, TAU)
      ctx.fill()
    }
  }
  // Lens Polish: brass gallery rail
  if (a >= 1) {
    ctx.strokeStyle = '#e0b25a'
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-gw, top - 8)
    ctx.lineTo(gw, top - 8)
    for (let i = 0; i <= 6; i++) {
      const px = -gw + (i * gw * 2) / 6
      ctx.moveTo(px, top - 8)
      ctx.lineTo(px, top - 2)
    }
    ctx.stroke()
  }
  // Piercing Ray: a big lens with flare spikes
  if (a >= 2) {
    const k = 1 + Math.sin(t * 3 + seed) * 0.08
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = withAlpha('#efe8ff', 0.85)
    ctx.beginPath()
    for (const [dx, dy, len, wd] of [[0, -1, 24 * k, 3.4], [0, 1, 18 * k, 3.4], [-1, 0, 26 * k, 3], [1, 0, 26 * k, 3]]) {
      ctx.moveTo(-dy * wd, lampY + dx * wd)
      ctx.lineTo(dx * len, lampY + dy * len)
      ctx.lineTo(dy * wd, lampY - dx * wd)
    }
    ctx.fill()
    ctx.restore()
    const lr = a >= 3 ? 9.5 : 8.5
    const lg = ctx.createRadialGradient(-2, lampY - 2, 1, 0, lampY, lr)
    lg.addColorStop(0, '#ffffff')
    lg.addColorStop(1, glass)
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.arc(0, lampY, lr, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#e0b25a'
    ctx.lineWidth = 2.6
    ctx.stroke()
  }
}

function drawGarden(ctx: CanvasRenderingContext2D, L: TowerLook) {
  const { a, b, t, seed } = L
  if (a >= 3 || b >= 3) glow(ctx, 0, -20, 58, P.gold, 0.32 + Math.sin(t * 2 + seed) * 0.05)
  // soil bed; Night Bloom raises it in a plank box
  if (a >= 2) {
    ctx.fillStyle = '#5c3e26'
    ctx.beginPath()
    ctx.ellipse(0, 4, 32, 16, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#936640'
    ctx.beginPath()
    ctx.ellipse(0, -1, 32, 15.5, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#4a311e'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (const px of [-20, -7, 7, 20]) {
      ctx.moveTo(px, 11 - Math.abs(px) * 0.2)
      ctx.lineTo(px, 17 - Math.abs(px) * 0.25)
    }
    ctx.stroke()
  } else {
    ctx.fillStyle = '#3b2a1f'
    ctx.beginPath()
    ctx.ellipse(0, 0, 28, 15, 0, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = '#4c3727'
  ctx.beginPath()
  ctx.ellipse(0, -2, 25, 12, 0, 0, TAU)
  ctx.fill()
  // leaves
  ctx.fillStyle = '#2f6b4b'
  ctx.beginPath()
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU
    const lx = Math.cos(ang) * 14
    const ly = -4 + Math.sin(ang) * 6
    ctx.moveTo(lx + 9, ly)
    ctx.ellipse(lx, ly, 9, 4.5, ang, 0, TAU)
  }
  ctx.fill()
  // Moth Guard: a lantern post for the moths
  if (b >= 2) {
    ctx.strokeStyle = '#6b5a45'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-23, 0)
    ctx.lineTo(-23, -40)
    ctx.lineTo(-13, -40)
    ctx.stroke()
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-13, -40)
    ctx.lineTo(-13, -35)
    ctx.stroke()
    glow(ctx, -13, -30, 16, P.gold, 0.7)
    ctx.fillStyle = '#6b5a45'
    ctx.fillRect(-17.5, -36, 9, 2.5)
    ctx.fillStyle = P.gold
    ctx.beginPath()
    ctx.roundRect(-16.5, -34, 7, 9, 2)
    ctx.fill()
  }
  // glowing bulbs
  const bulbs = 3 + a * 2
  const br = a >= 1 ? 5.2 : 4.6
  const stem = a >= 2 ? 16 : 11
  for (let i = 0; i < bulbs; i++) {
    const ang = (i / bulbs) * TAU + 0.4
    const rr = 9 + (i % 2) * 7
    const bx = Math.cos(ang) * rr
    const by = -stem + 1 + Math.sin(ang) * rr * 0.45 - (i % 3) * 3
    ctx.strokeStyle = '#3f8a5f'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(bx, by + stem)
    ctx.lineTo(bx, by)
    ctx.stroke()
    const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i)
    glow(ctx, bx, by, 13, P.gold, 0.5 * pulse)
    ctx.fillStyle = P.gold
    ctx.beginPath()
    ctx.arc(bx, by, br, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff6d0'
    ctx.beginPath()
    ctx.arc(bx - br * 0.25, by - br * 0.25, br * 0.42, 0, TAU)
    ctx.fill()
  }
  if (a >= 1) {
    // Moth Beds: a string of gold fairy lights along the front of the bed
    const rx = a >= 2 ? 31 : 26
    const ry = a >= 2 ? 15 : 13
    const cy = a >= 2 ? 1 : 0
    ctx.strokeStyle = '#2a4a33'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(0, cy, rx, ry, 0, 0.08 * Math.PI, 0.92 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = '#fff2c2'
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const ang = (0.14 + (i / 5) * 0.72) * Math.PI
      const lx = Math.cos(ang) * rx
      const ly = cy + Math.sin(ang) * ry + 1.5
      glow(ctx, lx, ly, 8, P.gold, 0.8)
      ctx.moveTo(lx + 2.8, ly)
      ctx.arc(lx, ly, 2.8, 0, TAU)
    }
    ctx.fill()
  }
  if (a >= 3) {
    // Moon Orchard: a moon tree
    ctx.strokeStyle = '#6b5a45'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(0, -36)
    ctx.moveTo(0, -24)
    ctx.lineTo(-9, -31)
    ctx.moveTo(0, -20)
    ctx.lineTo(9, -27)
    ctx.stroke()
    glow(ctx, 0, -42, 36, P.gold, 0.6)
    ctx.fillStyle = P.pale
    ctx.beginPath()
    ctx.arc(0, -42, 10, 0, TAU)
    ctx.fill()
    ctx.fillStyle = P.gold
    ctx.beginPath()
    ctx.arc(-9, -32, 4, 0, TAU)
    ctx.moveTo(13, -28)
    ctx.arc(9, -28, 4, 0, TAU)
    ctx.fill()
  }
  if (b >= 1) {
    // Sweet Nectar: a honey pot
    ctx.fillStyle = '#b86b3a'
    ctx.beginPath()
    ctx.ellipse(21, -8, 8.5, 8, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#d98a4e'
    ctx.beginPath()
    ctx.ellipse(18.5, -10, 3, 4, -0.4, 0, TAU)
    ctx.fill()
    glow(ctx, 21, -15, 12, P.gold, 0.6)
    ctx.fillStyle = P.gold
    ctx.beginPath()
    ctx.roundRect(14, -18, 14, 4.5, 2)
    ctx.roundRect(22.5, -15, 3.6, 8, 1.8)
    ctx.fill()
  }
  if (b >= 3) {
    // Moonflower bloom
    ctx.strokeStyle = '#3f8a5f'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(0, -22)
    ctx.stroke()
    ctx.fillStyle = withAlpha('#f4ecff', 0.95)
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + t * 0.2
      const px = Math.cos(ang) * 10
      const py = -28 + Math.sin(ang) * 10
      ctx.moveTo(px + 9, py)
      ctx.ellipse(px, py, 9, 5, ang, 0, TAU)
    }
    ctx.fill()
    glow(ctx, 0, -28, 32, P.gold, 0.55)
    ctx.fillStyle = P.gold
    ctx.beginPath()
    ctx.arc(0, -28, 5, 0, TAU)
    ctx.fill()
  }
  // resident moths
  const moths = b >= 2 ? 3 : 1
  const wing = b >= 2 ? 3.4 : 2.6
  ctx.fillStyle = '#fff1c8'
  for (let i = 0; i < moths; i++) {
    const ma = t * (1.4 + i * 0.3) + i * 2
    const mx = Math.cos(ma) * (22 + i * 4)
    const my = -26 + Math.sin(ma * 1.3) * 8
    const flap = wing * 0.6 + Math.abs(Math.sin(t * 20 + i)) * wing * 0.6
    glow(ctx, mx, my, 10, P.amberHi, 0.8)
    ctx.beginPath()
    ctx.ellipse(mx - wing * 0.8, my, wing, flap, 0, 0, TAU)
    ctx.moveTo(mx + wing * 1.8, my)
    ctx.ellipse(mx + wing * 0.8, my, wing, flap, 0, 0, TAU)
    ctx.fill()
  }
}

/** Rough extent above the base [top, half width] of a keeper, for portrait framing. */
function extent(id: TowerId, a: number, b: number): [number, number] {
  switch (id) {
    case 'wick':
      return [b >= 3 ? 64 : b >= 1 ? 58 : a >= 3 ? 56 : 46, a >= 3 ? 37 : a >= 1 ? 30 : 16]
    case 'cracker':
      return [b >= 2 ? 60 : 52, 30]
    case 'bell':
      return [a >= 3 ? 76 : a >= 2 ? 66 : b >= 3 ? 58 : a >= 1 ? 48 : 44, b >= 1 ? (a >= 1 ? 24 : 21) + 25 : 28]
    case 'owl':
      return [b >= 2 ? 76 : a >= 2 ? 66 : 58, a >= 3 ? 46 : a >= 1 ? 30 : 18]
    case 'beam':
      return [(b >= 1 ? 50 : 38) + (a >= 3 ? 30 : 27), a >= 2 ? 27 : 22]
    case 'garden':
      return [a >= 3 ? 54 : b >= 2 ? 42 : 36, 32]
  }
}
/** Render a tower portrait to a canvas for UI buttons. */
export function towerPortrait(id: TowerId, size: number, dpr: number, a = 0, b = 0, guardian?: GuardianId): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = Math.round(size * dpr)
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  // frame each keeper so tall tiers are not cropped; small ones keep the classic 84-unit frame
  const [top, half] = extent(id, a, b)
  const f = Math.max(84, top + 22, half * 2 + 6)
  const k = size / f
  ctx.scale(k, k)
  drawTower(ctx, f / 2, f - 18, { id, a, b, guardian, angle: -Math.PI / 2 - 0.5, since: 9, age: 9, upAge: 9, t: 1.2, seed: 1 })
  return c
}
