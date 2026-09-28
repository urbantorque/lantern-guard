import { clamp, TAU } from '../core/math'
import { ENEMIES, type EnemyId } from '../game/defs'
import type { Enemy } from '../game/sim'
import { drawGlyph } from './glyphs'
import { ENEMY_MARK, glowSprite, mix, P, withAlpha } from './palette'

/** Scale factor applied to all Mope visuals (sim radii stay authoritative). */
export const ENEMY_VIS = 1.3

/** Animation loop length (seconds) per Mope; 8 baked frames cover one loop. */
const PERIOD: Record<EnemyId, number> = { drip: 1.57, skitter: 0.29, shell: 1.57, veil: 1.05, bloat: 1.26, wisp: 0.8, mender: 1.96, vshell: 1.57, toad: 2.86, gloom: 2.6, skiff: 1.57, warden: 2.6, reedling: 1.57, bloomheart: 2.6 }
const FRAMES = 8

const GLYPH_INK = '#13212a'
/** Closed lids are lighter ink with a dark seam: pale strokes are kept for damage cracks. */
const LID = '#4a3d6e'
const LASH = '#0b0712'
const GAUZE = '#e6f2d4'
const WISP_TAIL = '#ff4f22'
const LILAC_LO = '#6f5aa8'

// Draw-mode state, set only for the duration of one body draw.
/** drawCheer: >= 0 is how far the body has brightened toward cream; -1 is off. */
let cheer = -1
/** buildSprite: eye spots and the body rim are logged relative to (logX, logY) for live blinks and flashes. */
let eyeLog: number[] | null = null
let rimLog: number[] | null = null
let logX = 0
let logY = 0
/** buildSprite: additive layers (the Wisp's tail) go to their own canvas so they stay additive on screen. */
let addCtx: CanvasRenderingContext2D | null = null

const rimInk = () => (cheer >= 0 ? mix(P.inkRim, P.cream, cheer) : P.inkRim)
const logRim = (x: number, y: number, rx: number, ry: number) => {
  if (rimLog && rimLog.length === 0) rimLog.push(x - logX, y - logY, rx, ry)
}

interface EyeStyle {
  color?: string
  mood?: 'grump' | 'calm' | 'sad'
  /** Narrow almond eyes (the Veil peeking out of its sheet). */
  slit?: boolean
  /** Cheer mode: draw the small smile under the eyes. */
  smile?: boolean
}

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, spread: number, size: number, lookX: number, lookY: number, blink: boolean, st: EyeStyle = {}) {
  if (cheer >= 0) {
    happyEyes(ctx, x, y, spread, size, st.smile !== false)
    return
  }
  const color = st.color ?? P.eye
  const mood = st.mood ?? 'grump'
  for (let side = -1; side <= 1; side += 2) {
    const ex = x + side * spread
    if (eyeLog) eyeLog.push(ex - logX, y - logY, size)
    if (blink) lid(ctx, ex, y, size)
    else if (st.slit) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(ex, y, size * 1.15, size * 0.5, -side * 0.32, 0, TAU)
      ctx.fill()
      ctx.fillStyle = P.ink
      ctx.beginPath()
      ctx.ellipse(ex + lookX * size * 0.35, y + lookY * size * 0.12, size * 0.2, size * 0.42, 0, 0, TAU)
      ctx.fill()
    } else {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(ex, y, size, size * 1.15, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = P.ink
      ctx.beginPath()
      ctx.arc(ex + lookX * size * 0.35, y + lookY * size * 0.35 + size * 0.1, size * 0.55, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(ex + lookX * size * 0.35 - size * 0.2, y + lookY * size * 0.35 - size * 0.15, size * 0.18, 0, TAU)
      ctx.fill()
    }
    // brows give each Mope its attitude
    if (mood !== 'calm') {
      ctx.strokeStyle = P.ink
      ctx.lineWidth = Math.max(1.5, size * 0.4)
      ctx.lineCap = 'round'
      ctx.beginPath()
      const tilt = mood === 'grump' ? side * 0.45 : -side * 0.35
      ctx.moveTo(ex - size * 1.1, y - size * 1.3 - tilt * size)
      ctx.lineTo(ex + size * 1.1, y - size * 1.3 + tilt * size)
      ctx.stroke()
    }
  }
}

/** A closed eye: a lid in lighter ink with a curved seam. */
function lid(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = LID
  ctx.beginPath()
  ctx.ellipse(x, y, s * 1.15, s * 1.28, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = LASH
  ctx.lineWidth = Math.max(1.2, s * 0.3)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x, y - s * 0.45, s * 0.95, 0.35, Math.PI - 0.35)
  ctx.stroke()
}

/** Cheered-up face: '^ ^' eyes, pink blush and a small smile. */
function happyEyes(ctx: CanvasRenderingContext2D, x: number, y: number, spread: number, size: number, smile: boolean) {
  const ink = mix(P.eye, '#2a1f3d', clamp(cheer * 2 - 0.4, 0, 1))
  for (let side = -1; side <= 1; side += 2) {
    const ex = x + side * spread
    ctx.fillStyle = withAlpha(P.pink, 0.75)
    ctx.beginPath()
    ctx.ellipse(ex + side * size * 0.45, y + size * 1.2, size * 0.62, size * 0.36, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(1.4, size * 0.42)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(ex, y + size * 0.45, size * 0.85, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  }
  if (smile) {
    ctx.beginPath()
    ctx.arc(x, y + size * 0.55, Math.max(size * 0.8, spread * 0.42), Math.PI * 0.2, Math.PI * 0.8)
    ctx.stroke()
  }
}

const hasGlyph = (id: EnemyId, r: number) => ENEMIES[id].radius >= 15 && r >= 12

/** Family glyph in dark ink on a marking; `under` is the marking colour (the lime eye's pupil). */
function markGlyph(ctx: CanvasRenderingContext2D, id: EnemyId, x: number, y: number, gr: number, under: string) {
  const fam = ENEMIES[id].family
  if (fam !== 'lime') {
    drawGlyph(ctx, fam, x, y, gr, GLYPH_INK)
    return
  }
  // same eye as drawGlyph, but the pupil is painted: destination-out would punch through the canvas
  ctx.fillStyle = GLYPH_INK
  ctx.beginPath()
  ctx.moveTo(x - gr, y)
  ctx.quadraticCurveTo(x, y - gr * 0.95, x + gr, y)
  ctx.quadraticCurveTo(x, y + gr * 0.95, x - gr, y)
  ctx.fill()
  ctx.fillStyle = under
  ctx.beginPath()
  ctx.arc(x, y, gr * 0.3, 0, TAU)
  ctx.fill()
}

const shadow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  ctx.fillStyle = 'rgba(2,10,14,0.45)'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.72, r * 0.95, r * 0.34, 0, 0, TAU)
  ctx.fill()
}

const innerFirefly = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) => {
  const a0 = ctx.globalAlpha
  const pulse = 0.55 + 0.45 * Math.sin(t * 5)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = a0 * 0.35 * pulse
  const spr = glowSprite(P.amber, 32)
  ctx.drawImage(spr, x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2)
  ctx.globalAlpha = a0
  ctx.globalCompositeOperation = 'source-over'
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, wob: number, t: number, peak = 0) {
  ctx.beginPath()
  const n = 18
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU
    const w = 1 + Math.sin(a * 3 + t * 4) * wob
    let px = x + Math.cos(a) * rx * w
    let py = y + Math.sin(a) * ry * w
    if (peak > 0) {
      const up = Math.max(0, -Math.sin(a))
      py -= Math.pow(up, 6) * peak
      px += Math.cos(a) * -Math.pow(up, 6) * rx * 0.25
    }
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** Fills the current path with ink. A live flash adds white light and a white rim but keeps the ink. */
function inkFill(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flash = false) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.2)
  if (cheer >= 0) {
    g.addColorStop(0, mix(P.inkHi, P.cream, Math.min(1, cheer * 1.15)))
    g.addColorStop(0.55, mix(P.ink, P.cream, cheer))
    g.addColorStop(1, mix('#120d1b', P.cream, cheer * 0.85))
  } else {
    g.addColorStop(0, P.inkHi)
    g.addColorStop(0.55, P.ink)
    g.addColorStop(1, '#120d1b')
  }
  ctx.fillStyle = g
  ctx.fill()
  if (flash) {
    const a0 = ctx.globalAlpha
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = a0 * 0.32
    ctx.fillStyle = '#b8aae6'
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = a0
  }
  ctx.strokeStyle = flash ? '#ffffff' : rimInk()
  ctx.lineWidth = flash ? 2 : 1.6
  ctx.stroke()
}

export interface EnemyDrawOpts {
  hiddenAlpha: number
  showBars: boolean
}

const isHidden = (e: Enemy) => !!e.def.hidden && !e.revealedPerm && e.seenT <= 0

const GLOOM_EYES: [number, number, number, number][] = [
  // x, y, size (in r), blink phase: each eye blinks on its own beat
  [-0.36, -0.2, 0.2, 0],
  [0.36, -0.2, 0.2, 1.3],
  [0, -0.44, 0.11, 0.55],
  [-0.66, 0.02, 0.1, 2.0],
  [0.66, 0.02, 0.1, 0.9],
  [-0.56, -0.4, 0.07, 1.7],
  [0.56, -0.4, 0.07, 2.35],
]

/**
 * The Mope itself: body, family marking and face, with no status overlays.
 * `live` draws blinks from the Mope's age; baked sprites keep their eyes open.
 */
function drawBody(ctx: CanvasRenderingContext2D, e: Enemy, t: number, flash: boolean, live: boolean) {
  const id = e.def.id
  const r = e.def.radius * ENEMY_VIS
  const mark = ENEMY_MARK[id]
  const age = e.age
  const lookX = e.tx
  const lookY = e.ty
  const blink = live && ((age * 0.7 + e.uid * 0.37) % 3.2) < 0.12
  const glyph = hasGlyph(id, r)
  const x = e.x
  let y = e.y
  const a0 = ctx.globalAlpha

  if (cheer < 0) shadow(ctx, x, y, r)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (id) {
    case 'reedling':
    case 'bloomheart': {
      const big = id === 'bloomheart'
      ctx.beginPath(); ctx.ellipse(x, y, r * .85, r, 0, 0, TAU); inkFill(ctx, x, y, r, flash)
      logRim(x, y, r * .85, r)
      ctx.strokeStyle = mark; ctx.lineWidth = big ? 5 : 3; ctx.stroke()
      ctx.fillStyle = big ? P.pink : P.lime
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.ellipse(x + i * r * .4, y - r * .72, r * .27, r * .62, i * .65, 0, TAU); ctx.fill()
      }
      eyes(ctx, x, y + r * .06, r * .33, r * .17, lookX, lookY, blink)
      if (glyph) drawGlyph(ctx, e.def.family, x, y + r * .57, r * .16, mark)
      break
    }
    case 'skiff':
    case 'warden': {
      const big = id === 'warden'
      ctx.beginPath()
      ctx.moveTo(x - r, y - r * .35)
      ctx.quadraticCurveTo(x, y - r * .9, x + r, y - r * .35)
      ctx.lineTo(x + r * .65, y + r * .65)
      ctx.quadraticCurveTo(x, y + r, x - r * .65, y + r * .65)
      ctx.closePath()
      inkFill(ctx, x, y, r, flash)
      ctx.strokeStyle = mark
      ctx.lineWidth = big ? 4 : 2.5
      ctx.stroke()
      logRim(x, y, r, r * .8)
      ctx.fillStyle = mark
      ctx.beginPath()
      ctx.moveTo(x - r * .6, y - r * .35)
      ctx.lineTo(x - r * .6, y - r * (big ? 1.15 : .7))
      ctx.lineTo(x - r * .15, y - r * .65)
      ctx.lineTo(x + r * .15, y - r * (big ? 1.25 : .9))
      ctx.lineTo(x + r * .6, y - r * .65)
      ctx.lineTo(x + r * .6, y - r * .35)
      ctx.closePath()
      ctx.fill()
      eyes(ctx, x, y, r * .34, r * .16, lookX, lookY, blink)
      if (glyph) drawGlyph(ctx, e.def.family, x, y + r * .48, r * .17, mark)
      break
    }
    case 'drip': {
      const hop = Math.abs(Math.sin(age * 6 + e.uid))
      const squash = 1 + (1 - hop) * 0.12
      y -= hop * 4
      const rx = r * squash
      const ry = r / squash
      blob(ctx, x, y, rx, ry, 0.03, age + e.uid, r * 0.55)
      inkFill(ctx, x, y, r, flash)
      logRim(x, y - r * 0.12, rx, ry * 1.1)
      // amber wax cap dripping off its peak: the Wickling's colour
      ctx.save()
      ctx.clip()
      waxCap(ctx, x, y - r * 0.42, rx * 1.1, r, mark)
      ctx.restore()
      blob(ctx, x, y, rx, ry, 0.03, age + e.uid, r * 0.55)
      ctx.strokeStyle = flash ? '#ffffff' : rimInk()
      ctx.lineWidth = 1.6
      ctx.stroke()
      innerFirefly(ctx, x, y + r * 0.35, r, age + e.uid)
      if (cheer < 0) {
        ctx.fillStyle = mark
        for (let s = -1; s <= 1; s += 2) {
          ctx.beginPath()
          ctx.arc(x + s * r * 0.64, y + r * 0.3, r * 0.14, 0, TAU)
          ctx.fill()
        }
      }
      eyes(ctx, x, y - r * 0.02, r * 0.36, r * 0.24, lookX, lookY, blink)
      break
    }
    case 'skitter': {
      const run = age * 22 + e.uid
      // legs, tipped with ice
      ctx.lineWidth = 2.2
      for (let i = 0; i < 4; i++) {
        const side = i < 2 ? -1 : 1
        const ph = Math.sin(run + i * 1.7) * 4
        const lx = x + side * r * 0.9
        const ly = y + (i % 2 ? 4 : -2)
        const fx = lx + side * 4 + ph * 0.5
        const fy = ly + 6 + ph * 0.3
        ctx.strokeStyle = P.inkRim
        ctx.beginPath()
        ctx.moveTo(x + side * r * 0.4, y + 1)
        ctx.quadraticCurveTo(lx + side * 3, ly - 6, fx, fy)
        ctx.stroke()
        ctx.fillStyle = mark
        ctx.beginPath()
        ctx.arc(fx, fy, 2.4, 0, TAU)
        ctx.fill()
      }
      blob(ctx, x, y - 2, r * 1.15, r * 0.82, 0.02, age)
      inkFill(ctx, x, y - 2, r, flash)
      logRim(x, y - 2, r * 1.15, r * 0.82)
      // two thick ice chevrons pointing the way it runs: the Moonbell's colour
      const d = lookX >= 0 ? 1 : -1
      ctx.strokeStyle = mark
      ctx.lineWidth = 3.6
      for (const k of [-0.3, 0.14]) {
        const cx = x + k * r * d
        const cy = y - r * 0.5
        ctx.beginPath()
        ctx.moveTo(cx - d * r * 0.14, cy - r * 0.25)
        ctx.lineTo(cx + d * r * 0.12, cy)
        ctx.lineTo(cx - d * r * 0.14, cy + r * 0.25)
        ctx.stroke()
      }
      innerFirefly(ctx, x, y, r, age)
      eyes(ctx, x + lookX * 3, y + r * 0.16, r * 0.34, r * 0.21, lookX, lookY, blink)
      if (cheer >= 0) break
      // speed streaks
      ctx.strokeStyle = withAlpha(P.ice, 0.35)
      ctx.lineWidth = 1.5
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 5
        ctx.beginPath()
        ctx.moveTo(x - lookX * (r + 4) - lookY * off, y - lookY * (r + 4) + lookX * off)
        ctx.lineTo(x - lookX * (r + 14 + i * 3) - lookY * off, y - lookY * (r + 14 + i * 3) + lookX * off)
        ctx.stroke()
      }
      break
    }
    case 'shell':
    case 'vshell': {
      const veiled = id === 'vshell'
      const bob = Math.sin(age * 4 + e.uid) * 1.5
      // body peeking below
      blob(ctx, x + lookX * 4, y + 3 + bob, r * 0.75, r * 0.55, 0.03, age)
      inkFill(ctx, x, y + 3, r * 0.7, flash)
      if (e.shell > 0) {
        const sx = x - lookX * 2
        const sy = y - r * 0.2 + bob
        drawShell(ctx, id, sx, sy, r, e.shell / e.maxShell, flash, veiled, mark, glyph)
        logRim(sx, sy - r * 0.15, r * 0.95, r * 0.75)
        eyes(ctx, x + lookX * r * 0.55, y + r * 0.1 + bob, r * 0.2, r * 0.15, lookX, lookY, blink)
      } else {
        blob(ctx, x, y - 2 + bob, r * 0.8, r * 0.8, 0.04, age, r * 0.3)
        inkFill(ctx, x, y - 2, r * 0.8, flash)
        logRim(x, y - 2 + bob, r * 0.8, r * 0.8)
        innerFirefly(ctx, x, y + 2, r, age)
        // the broken top of its shell stays on like a hat, so the colour survives the crack
        brokenCap(ctx, id, x, y - 2 + bob - r * 0.5, r, veiled, mark, glyph)
        eyes(ctx, x, y + bob, r * 0.28, r * 0.2, lookX, lookY, blink, { mood: 'sad' })
      }
      break
    }
    case 'veil': {
      // a veil moth: an ink drop under a draped gauze sheet
      const ph = age * (TAU / PERIOD.veil) + e.uid
      y += Math.sin(ph) * 2.5 - 4
      veilWings(ctx, x, y, r, Math.sin(ph * 2), mark)
      blob(ctx, x, y + r * 0.05, r * 0.72, r * 0.78, 0.03, age, r * 0.25)
      inkFill(ctx, x, y + r * 0.05, r * 0.8, flash)
      innerFirefly(ctx, x, y + r * 0.25, r, age)
      veilSheet(ctx, x, y, r, ph)
      const gg = ctx.createLinearGradient(x, y - r, x, y + r * 0.8)
      gg.addColorStop(0, withAlpha(cheer >= 0 ? P.cream : GAUZE, 0.8))
      gg.addColorStop(0.6, withAlpha(GAUZE, 0.62))
      gg.addColorStop(1, withAlpha(GAUZE, 0.42))
      ctx.fillStyle = gg
      ctx.fill()
      ctx.strokeStyle = flash ? '#ffffff' : withAlpha(GAUZE, 0.7)
      ctx.lineWidth = 1.2
      ctx.stroke()
      logRim(x, y - r * 0.1, r * 0.88, r * 0.9)
      // soft folds in the gauze
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 1.4
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath()
        ctx.moveTo(x + s * r * 0.3, y + r * 0.14)
        ctx.quadraticCurveTo(x + s * r * 0.34, y + r * 0.42, x + s * r * 0.5 + Math.sin(ph + s) * 1.5, y + r * 0.68)
        ctx.stroke()
      }
      // lime hem trim: the Lamp Owl's colour
      ctx.strokeStyle = mark
      ctx.lineWidth = 4
      ctx.beginPath()
      veilHem(ctx, x, y, r, ph, true)
      ctx.stroke()
      // lime eyes peek out through a slit in the sheet
      ctx.fillStyle = '#120c1c'
      ctx.beginPath()
      ctx.moveTo(x - r * 0.62, y - r * 0.12)
      ctx.quadraticCurveTo(x, y - r * 0.46, x + r * 0.62, y - r * 0.12)
      ctx.quadraticCurveTo(x, y + r * 0.2, x - r * 0.62, y - r * 0.12)
      ctx.fill()
      eyes(ctx, x + lookX * r * 0.08, y - r * 0.13 + lookY * r * 0.03, r * 0.27, r * 0.16, lookX, lookY, blink, { color: mark, mood: 'calm', slit: true })
      veilAntennae(ctx, x, y, r, ph, mark)
      break
    }
    case 'bloat': {
      const jig = Math.sin(age * 5 + e.uid) * 0.05
      const rx = r * (1 + jig)
      const ry = r * (1 - jig)
      blob(ctx, x, y - 2, rx, ry, 0.035, age)
      inkFill(ctx, x, y - 2, r, flash)
      logRim(x, y - 2, rx, ry)
      // lilac stitched belt round its middle: the Lighthouse's colour
      const by = y + r * 0.1
      ctx.save()
      ctx.clip()
      const bg = ctx.createLinearGradient(x - r, 0, x + r, 0)
      bg.addColorStop(0, '#8a74c9')
      bg.addColorStop(0.5, mix(mark, '#ffffff', 0.2))
      bg.addColorStop(1, '#8a74c9')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.moveTo(x - r * 1.2, by - r * 0.17)
      ctx.quadraticCurveTo(x, by + r * 0.13, x + r * 1.2, by - r * 0.17)
      ctx.lineTo(x + r * 1.2, by + r * 0.15)
      ctx.quadraticCurveTo(x, by + r * 0.45, x - r * 1.2, by + r * 0.15)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = LILAC_LO
      ctx.lineWidth = 1.4
      ctx.stroke()
      ctx.strokeStyle = '#3a2d5c'
      ctx.lineWidth = 1.5
      ctx.setLineDash([2.6, 3])
      ctx.beginPath()
      ctx.moveTo(x - r * 1.2, by - r * 0.01)
      ctx.quadraticCurveTo(x, by + r * 0.29, x + r * 1.2, by - r * 0.01)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      // buckle
      const cy = by + r * 0.14
      ctx.fillStyle = mix(mark, '#ffffff', 0.25)
      ctx.beginPath()
      ctx.arc(x, cy, r * 0.27, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = LILAC_LO
      ctx.lineWidth = 1.8
      ctx.stroke()
      if (glyph) markGlyph(ctx, id, x, cy, clamp(r * 0.2, 4, 8), mark)
      eyes(ctx, x, y - r * 0.38, r * 0.3, r * 0.17, lookX, lookY, blink)
      break
    }
    case 'wisp': {
      // additive tapered coral tail with embers drifting off it
      const w = TAU / PERIOD.wisp
      const sway = Math.sin(age * w + e.uid) * r * 0.45
      const px = -lookY
      const py = lookX
      const tl = r * 3
      const tx = x - lookX * tl + px * sway
      const ty = y - lookY * tl + py * sway
      const mx = x - lookX * tl * 0.5
      const my = y - lookY * tl * 0.5
      const tc = addCtx ?? ctx
      const ta = tc.globalAlpha
      if (!addCtx) tc.globalCompositeOperation = 'lighter'
      // a hotter coral than the head, kept strong along most of its length:
      // added faintly onto teal water, coral turns brown
      const g = tc.createLinearGradient(x, y, tx, ty)
      g.addColorStop(0, withAlpha(WISP_TAIL, 0.95))
      g.addColorStop(0.55, withAlpha(WISP_TAIL, 0.75))
      g.addColorStop(0.85, withAlpha(WISP_TAIL, 0.3))
      g.addColorStop(1, withAlpha(WISP_TAIL, 0))
      tc.fillStyle = g
      tc.beginPath()
      tc.moveTo(x + px * r * 0.85, y + py * r * 0.85)
      tc.quadraticCurveTo(mx + px * (r * 0.55 + sway), my + py * (r * 0.55 + sway), tx, ty)
      tc.quadraticCurveTo(mx - px * (r * 0.55 - sway), my - py * (r * 0.55 - sway), x - px * r * 0.85, y - py * r * 0.85)
      tc.closePath()
      tc.fill()
      // hot core
      const cx = x - lookX * tl * 0.6 + px * sway * 0.5
      const cy = y - lookY * tl * 0.6 + py * sway * 0.5
      const cg = tc.createLinearGradient(x, y, cx, cy)
      cg.addColorStop(0, withAlpha(P.amberHi, 0.7))
      cg.addColorStop(1, withAlpha(P.amberHi, 0))
      tc.fillStyle = cg
      tc.beginPath()
      tc.moveTo(x + px * r * 0.4, y + py * r * 0.4)
      tc.quadraticCurveTo(mx + px * (r * 0.2 + sway * 0.4), my + py * (r * 0.2 + sway * 0.4), cx, cy)
      tc.quadraticCurveTo(mx - px * (r * 0.2 - sway * 0.4), my - py * (r * 0.2 - sway * 0.4), x - px * r * 0.4, y - py * r * 0.4)
      tc.closePath()
      tc.fill()
      for (let i = 0; i < 3; i++) {
        const u = (age / PERIOD.wisp + i / 3) % 1
        const d = tl * (0.25 + u * 0.8)
        const jit = Math.sin(i * 2.1 + u * 5) * r * 0.5 + sway * u
        tc.globalAlpha = ta * (1 - u)
        tc.fillStyle = P.amberHi
        tc.beginPath()
        tc.arc(x - lookX * d + px * jit, y - lookY * d + py * jit, 1.9 - u * 0.9, 0, TAU)
        tc.fill()
      }
      tc.globalAlpha = ta
      tc.globalCompositeOperation = 'source-over'
      // coral head: the Cracker's colour
      blob(ctx, x, y, r, r, 0.08, age * 2 + e.uid)
      const hg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.15)
      hg.addColorStop(0, cheer >= 0 ? P.cream : '#ffc9b4')
      hg.addColorStop(0.5, mark)
      hg.addColorStop(1, '#b8442a')
      ctx.fillStyle = hg
      ctx.fill()
      ctx.strokeStyle = flash ? '#ffffff' : '#4a1a12'
      ctx.lineWidth = 1.6
      ctx.stroke()
      logRim(x, y, r, r)
      eyes(ctx, x + lookX * 1.5, y + lookY * 1.2, r * 0.36, r * 0.2, lookX, lookY, blink, { color: '#241018' })
      break
    }
    case 'mender': {
      const bob = Math.sin(age * 3.2 + e.uid) * 2
      blob(ctx, x, y - 2 + bob, r, r * 0.95, 0.03, age)
      inkFill(ctx, x, y - 2 + bob, r, flash)
      logRim(x, y - 2 + bob, r, r * 0.95)
      // sprout
      ctx.strokeStyle = mark
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(x, y - r + bob)
      ctx.quadraticCurveTo(x + 2, y - r - 8 + bob, x - 1, y - r - 12 + bob)
      ctx.stroke()
      ctx.fillStyle = mark
      ctx.beginPath()
      ctx.ellipse(x - 6, y - r - 10 + bob, 6, 3.2, -0.5, 0, TAU)
      ctx.ellipse(x + 5, y - r - 12 + bob, 6, 3.2, 0.5, 0, TAU)
      ctx.fill()
      // pink first-aid badge on its belly: the family colour
      const cy = y + r * 0.36 + bob
      const bw = r * 0.4
      const bh = r * 0.34
      ctx.fillStyle = mark
      ctx.beginPath()
      ctx.roundRect(x - bw, cy - bh, bw * 2, bh * 2, r * 0.12)
      ctx.fill()
      ctx.strokeStyle = '#b8456f'
      ctx.lineWidth = 1.6
      ctx.stroke()
      if (glyph) markGlyph(ctx, id, x, cy, clamp(r * 0.26, 4, 8), mark)
      eyes(ctx, x, y - r * 0.28 + bob, r * 0.32, r * 0.2, lookX, lookY, blink, { mood: 'calm' })
      break
    }
    case 'toad': {
      const bob = Math.sin(age * 2.2) * 2
      const gulp = e.spawnCd < 0.35
      y += bob
      blob(ctx, x, y, r * 1.2, r * 0.82, 0.02, age)
      inkFill(ctx, x, y, r, flash)
      // warts
      ctx.fillStyle = withAlpha(P.inkHi, 0.9)
      for (let i = 0; i < 6; i++) {
        const a = -0.4 - i * 0.45
        ctx.beginPath()
        ctx.arc(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.5, 3 + (i % 2) * 1.5, 0, TAU)
        ctx.fill()
      }
      // lilac belly plate: the Lighthouse's colour
      const py = y + r * 0.5
      const pg = ctx.createRadialGradient(x - r * 0.15, py - r * 0.12, 2, x, py, r * 0.7)
      pg.addColorStop(0, cheer >= 0 ? P.cream : '#efe8ff')
      pg.addColorStop(0.45, mark)
      pg.addColorStop(1, '#8e78cf')
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.ellipse(x, py, r * 0.66, r * 0.27, 0, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = LILAC_LO
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.strokeStyle = withAlpha(LILAC_LO, 0.6)
      ctx.lineWidth = 1.4
      for (let s = -1; s <= 1; s += 2) {
        for (const k of [0.3, 0.47]) {
          ctx.beginPath()
          ctx.moveTo(x + s * r * k, py - r * 0.17)
          ctx.quadraticCurveTo(x + s * r * (k + 0.07), py, x + s * r * k, py + r * 0.17)
          ctx.stroke()
        }
      }
      if (glyph) markGlyph(ctx, id, x, py, clamp(r * 0.27, 5, 8), mark)
      // bulging eyes
      for (let s = -1; s <= 1; s += 2) {
        ctx.fillStyle = P.ink
        ctx.beginPath()
        ctx.arc(x + s * r * 0.55, y - r * 0.62, r * 0.36, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = flash ? '#ffffff' : P.inkRim
        ctx.lineWidth = 1.6
        ctx.stroke()
      }
      // reed crown with lilac cattail tips
      for (let i = -1; i <= 1; i++) {
        const sway = Math.sin(age * 2.2 + i) * 2
        const bx = x + i * 7
        const by = y - r * 0.74
        const tx = x + i * 12 + sway
        const ty = y - r * 1.26 - (i === 0 ? 6 : 0)
        ctx.strokeStyle = '#3c7a58'
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.quadraticCurveTo(bx + i * 2, (by + ty) / 2, tx, ty)
        ctx.stroke()
        const ang = Math.atan2(ty - by, tx - bx)
        ctx.fillStyle = mark
        ctx.beginPath()
        ctx.ellipse(tx + Math.cos(ang) * 4, ty + Math.sin(ang) * 4, 6.5, 3.2, ang, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = LILAC_LO
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
      eyes(ctx, x, y - r * 0.64, r * 0.55, r * 0.22, lookX, lookY, blink, { color: P.pale, smile: false })
      // mouth
      if (cheer >= 0) {
        ctx.strokeStyle = mix(P.eye, '#2a1f3d', clamp(cheer * 2 - 0.4, 0, 1))
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x - r * 0.5, y + r * 0.02)
        ctx.quadraticCurveTo(x, y + r * 0.34, x + r * 0.5, y + r * 0.02)
        ctx.stroke()
      } else if (gulp) {
        ctx.fillStyle = '#0a0610'
        ctx.beginPath()
        ctx.ellipse(x, y + r * 0.14, r * 0.42, r * 0.16, 0, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = mark
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        ctx.strokeStyle = '#8d7cc0'
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.moveTo(x - r * 0.72, y + r * 0.16)
        ctx.quadraticCurveTo(x - r * 0.62, y + r * 0.04, x - r * 0.4, y + r * 0.08)
        ctx.quadraticCurveTo(x, y + r * 0.14, x + r * 0.4, y + r * 0.08)
        ctx.quadraticCurveTo(x + r * 0.62, y + r * 0.04, x + r * 0.72, y + r * 0.16)
        ctx.stroke()
      }
      break
    }
    case 'gloom': {
      const pulse = 1 + Math.sin(age * (e.phase === 2 ? 5 : 2.4)) * 0.04
      const R = r * pulse
      // tendrils
      ctx.strokeStyle = cheer >= 0 ? mix(P.ink, P.cream, cheer * 0.8) : P.ink
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + age * 0.3
        const len = r * (1.25 + Math.sin(age * 2 + i) * 0.15)
        ctx.lineWidth = 8 - (i % 3)
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.6)
        ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * len, y + Math.sin(a + 0.4) * len * 0.8, x + Math.cos(a + 0.2) * len * 1.1, y + Math.sin(a + 0.2) * len * 0.9)
        ctx.stroke()
      }
      blob(ctx, x, y, R, r * 0.9 * pulse, 0.05, age)
      inkFill(ctx, x, y, r, flash)
      gloomCrown(ctx, e, x, y, R, r, t, mark, glyph)
      // cracks of light as it weakens
      const f = e.hp / e.maxHp
      if (f < 0.66 && cheer < 0) {
        ctx.strokeStyle = withAlpha(P.pale, 0.8)
        ctx.lineWidth = 2
        for (let i = 0; i < (f < 0.33 ? 6 : 3); i++) {
          const a = i * 1.9 + 0.4
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2)
          ctx.lineTo(x + Math.cos(a + 0.3) * r * 0.55, y + Math.sin(a + 0.3) * r * 0.5)
          ctx.lineTo(x + Math.cos(a + 0.1) * r * 0.85, y + Math.sin(a + 0.1) * r * 0.75)
          ctx.stroke()
        }
      }
      // many eyes, each blinking on its own beat
      for (const [sx, sy, sr, bp] of GLOOM_EYES) {
        const ex = x + sx * r
        const ey = y + sy * r
        const s = sr * r
        if (cheer >= 0) {
          ctx.strokeStyle = mix(P.eye, '#2a1f3d', clamp(cheer * 2 - 0.4, 0, 1))
          ctx.lineWidth = Math.max(1.6, s * 0.35)
          ctx.beginPath()
          ctx.arc(ex, ey + s * 0.45, s * 0.85, Math.PI * 1.15, Math.PI * 1.85)
          ctx.stroke()
        } else if (live && ((age * 0.9 + bp) % 2.6) < 0.13) lid(ctx, ex, ey, s)
        else {
          ctx.fillStyle = P.pale
          ctx.beginPath()
          ctx.ellipse(ex, ey, s, s * 1.1, 0, 0, TAU)
          ctx.fill()
          ctx.fillStyle = P.ink
          ctx.beginPath()
          ctx.arc(ex + lookX * s * 0.4, ey + lookY * s * 0.4, s * 0.5, 0, TAU)
          ctx.fill()
        }
      }
      gloomMouth(ctx, e, x, y, r)
      break
    }
  }

  ctx.globalAlpha = a0
  ctx.globalCompositeOperation = 'source-over'
}

// ------------------------------------------------------------------ parts

const WAX_DRIPS: [number, number][] = [
  [0.6, 0.22],
  [0, 0.34],
  [-0.64, 0.26],
]

/** Wax cap for the Drip: everything above a drippy edge at yb (clipped to the body by the caller). */
function waxCap(ctx: CanvasRenderingContext2D, x: number, yb: number, w: number, r: number, color: string) {
  const g = ctx.createLinearGradient(x, yb - r * 1.2, x, yb + r * 0.3)
  g.addColorStop(0, mix(color, '#ffffff', cheer >= 0 ? 0.6 : 0.4))
  g.addColorStop(0.55, color)
  g.addColorStop(1, mix(color, '#7a3d10', 0.35))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - w, yb - r * 1.4)
  ctx.lineTo(x + w, yb - r * 1.4)
  ctx.lineTo(x + w, yb)
  for (const [dx, len] of WAX_DRIPS) {
    const cx = x + dx * w
    const hw = r * 0.13
    ctx.lineTo(cx + hw * 1.7, yb)
    ctx.bezierCurveTo(cx + hw * 0.9, yb, cx + hw * 1.2, yb + len * r, cx, yb + len * r)
    ctx.bezierCurveTo(cx - hw * 1.2, yb + len * r, cx - hw * 0.9, yb, cx - hw * 1.7, yb)
  }
  ctx.lineTo(x - w, yb)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.36, yb - r * 0.28, r * 0.09, r * 0.18, 0.6, 0, TAU)
  ctx.fill()
}

function drawShell(ctx: CanvasRenderingContext2D, id: EnemyId, x: number, y: number, r: number, f: number, flash: boolean, veiled: boolean, mark: string, glyph: boolean) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 2, x, y, r * 1.1)
  g.addColorStop(0, veiled ? '#f1ffd6' : '#ffd0bd')
  g.addColorStop(0.5, mark)
  g.addColorStop(1, veiled ? '#4d6e2a' : '#8a3322')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.95, r * 0.8, 0, Math.PI * 0.95, Math.PI * 2.05)
  ctx.quadraticCurveTo(x, y + r * 0.45, x - r * 0.95, y + r * 0.05)
  ctx.fill()
  ctx.strokeStyle = flash ? '#ffffff' : veiled ? '#314a1a' : '#5c2014'
  ctx.lineWidth = 1.8
  ctx.stroke()
  // spiral ridge, opening round the family glyph
  ctx.strokeStyle = veiled ? '#314a1a' : '#5c2014'
  ctx.beginPath()
  for (let i = 0; i <= 20; i++) {
    const a = i * 0.36
    const rr = r * 0.64 * (1 - i / 34)
    const px = x + Math.cos(a) * rr
    const py = y - r * 0.12 + Math.sin(a) * rr * 0.72
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  if (glyph) markGlyph(ctx, id, x, y - r * 0.12, clamp(r * 0.24, 4, 8), mark)
  // cracks appear as the shell weakens
  if (f < 0.75) {
    ctx.strokeStyle = '#2a0f09'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x - r * 0.2, y - r * 0.75)
    ctx.lineTo(x - r * 0.05, y - r * 0.4)
    ctx.lineTo(x - r * 0.25, y - r * 0.15)
    if (f < 0.45) {
      ctx.moveTo(x + r * 0.5, y - r * 0.5)
      ctx.lineTo(x + r * 0.25, y - r * 0.2)
      ctx.lineTo(x + r * 0.45, y + r * 0.05)
    }
    if (f < 0.2) {
      ctx.moveTo(x - r * 0.7, y - r * 0.2)
      ctx.lineTo(x - r * 0.4, y - r * 0.05)
    }
    ctx.stroke()
  }
}

/** The top of a cracked shell, worn like a hat. */
function brokenCap(ctx: CanvasRenderingContext2D, id: EnemyId, x: number, y: number, r: number, veiled: boolean, mark: string, glyph: boolean) {
  const w = r * 0.62
  const h = r * 0.44
  const g = ctx.createRadialGradient(x - w * 0.3, y - h * 0.7, 1, x, y - h * 0.3, w * 1.2)
  g.addColorStop(0, veiled ? '#f1ffd6' : '#ffd0bd')
  g.addColorStop(0.5, mark)
  g.addColorStop(1, veiled ? '#4d6e2a' : '#8a3322')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - w, y)
  ctx.ellipse(x, y, w, h, 0, Math.PI, TAU)
  for (let i = 1; i <= 6; i++) ctx.lineTo(x + w - (i / 6) * w * 2, y + (i % 2 ? r * 0.16 : r * 0.02))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = veiled ? '#314a1a' : '#5c2014'
  ctx.lineWidth = 1.6
  ctx.stroke()
  if (glyph) markGlyph(ctx, id, x, y - h * 0.38, clamp(h * 0.5, 3.5, 6), mark)
}

/** Scalloped, softly waving hem of the Veil's sheet, right to left. */
function veilHem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ph: number, start: boolean) {
  const n = 24
  const w = r * 1.05
  const hy = y + r * 0.62
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const px = x + w - u * w * 2
    const py = hy + Math.abs(Math.sin(u * Math.PI * 4)) * r * 0.16 + Math.sin(u * TAU + ph) * r * 0.06
    if (i === 0 && start) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
}

/** Path of the Veil's draped sheet (also its hidden outline). */
function veilSheet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ph: number) {
  ctx.beginPath()
  ctx.moveTo(x - r * 0.85, y - r * 0.15)
  ctx.arc(x, y - r * 0.15, r * 0.85, Math.PI, TAU)
  ctx.quadraticCurveTo(x + r * 0.92, y + r * 0.3, x + r * 1.05, y + r * 0.62 + Math.sin(ph) * r * 0.06)
  veilHem(ctx, x, y, r, ph, false)
  ctx.quadraticCurveTo(x - r * 0.92, y + r * 0.3, x - r * 0.85, y - r * 0.15)
  ctx.closePath()
}

function veilWings(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, flap: number, mark: string) {
  const sp = 0.75 + 0.25 * flap
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath()
    ctx.moveTo(x + s * r * 0.4, y - r * 0.35)
    ctx.bezierCurveTo(x + s * r * (0.7 + 0.5 * sp), y - r * 1.1, x + s * r * (1.25 + 0.35 * sp), y - r * 0.8, x + s * r * (1.1 + 0.35 * sp), y - r * 0.15)
    ctx.bezierCurveTo(x + s * r * (1.05 + 0.3 * sp), y + r * 0.25, x + s * r * 0.8, y + r * 0.5, x + s * r * 0.45, y + r * 0.2)
    ctx.closePath()
    ctx.fillStyle = withAlpha(mark, 0.3)
    ctx.fill()
    ctx.strokeStyle = mark
    ctx.lineWidth = 1.8
    ctx.stroke()
    // eyespot
    const ex = x + s * r * (0.88 + 0.3 * sp)
    const ey = y - r * 0.45
    ctx.fillStyle = mark
    ctx.beginPath()
    ctx.arc(ex, ey, r * 0.11, 0, TAU)
    ctx.fill()
    ctx.fillStyle = P.ink
    ctx.beginPath()
    ctx.arc(ex, ey, r * 0.05, 0, TAU)
    ctx.fill()
  }
}

function veilAntennae(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ph: number, mark: string) {
  for (let s = -1; s <= 1; s += 2) {
    const tx = x + s * r * 0.62
    const ty = y - r * 1.48 + Math.sin(ph * 2 + s) * 1.2
    ctx.strokeStyle = withAlpha(GAUZE, 0.9)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x + s * r * 0.2, y - r * 0.9)
    ctx.quadraticCurveTo(x + s * r * 0.16, y - r * 1.38, tx, ty)
    ctx.stroke()
    ctx.fillStyle = mark
    ctx.beginPath()
    ctx.ellipse(tx, ty, r * 0.17, r * 0.075, s * 0.6, 0, TAU)
    ctx.fill()
  }
}

/** Old Gloom's crown: a lilac circlet of snuffed candles with smoking lilac-tipped wicks. */
function gloomCrown(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, R: number, r: number, t: number, mark: string, glyph: boolean) {
  const bx = R * 0.86
  const by = R * 0.78
  const bw = r * 0.12
  ctx.strokeStyle = LILAC_LO
  ctx.lineWidth = bw + 3
  ctx.beginPath()
  ctx.ellipse(x, y, bx, by, 0, Math.PI * 1.3, Math.PI * 1.7)
  ctx.stroke()
  ctx.strokeStyle = mark
  ctx.lineWidth = bw
  ctx.stroke()
  const tips: number[] = []
  const angs = [1.35, 1.43, 1.57, 1.65]
  for (let i = 0; i < 4; i++) {
    const a = angs[i] * Math.PI
    const px = x + Math.cos(a) * bx
    const py = y + Math.sin(a) * by
    const rot = a + Math.PI / 2
    const w = r * 0.1
    const h = r * (i === 0 || i === 3 ? 0.13 : 0.19)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rot)
    ctx.fillStyle = mark
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h, w, h + bw * 0.5, 2.5)
    ctx.fill()
    ctx.strokeStyle = LILAC_LO
    ctx.lineWidth = 1.6
    ctx.stroke()
    // a wax drip down the side
    ctx.fillStyle = mix(mark, '#ffffff', 0.35)
    ctx.beginPath()
    ctx.ellipse(-w * 0.2, -h + r * 0.04, w * 0.14, r * 0.04, 0, 0, TAU)
    ctx.fill()
    // bent, snuffed wick
    const lx = w * 0.42
    const ly = -h - r * 0.08
    ctx.strokeStyle = '#1a1424'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(0, -h)
    ctx.quadraticCurveTo(-w * 0.15, -h - r * 0.06, lx, ly)
    ctx.stroke()
    ctx.fillStyle = mark
    ctx.beginPath()
    ctx.arc(lx, ly, 2.4, 0, TAU)
    ctx.fill()
    ctx.restore()
    tips.push(px + lx * Math.cos(rot) - ly * Math.sin(rot), py + lx * Math.sin(rot) + ly * Math.cos(rot))
  }
  // faint smoke curling off the wicks
  if (cheer < 0) {
    ctx.fillStyle = '#b9aed0'
    const a0 = ctx.globalAlpha
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const u = (t * 0.45 + i * 0.27 + j * 0.5 + e.uid * 0.1) % 1
        ctx.globalAlpha = a0 * 0.22 * (1 - u)
        ctx.beginPath()
        ctx.arc(tips[i * 2] + Math.sin(t * 1.5 + i + u * 3) * 5 * u, tips[i * 2 + 1] - u * r * 0.45, 1.5 + u * r * 0.08, 0, TAU)
        ctx.fill()
      }
    }
    ctx.globalAlpha = a0
  }
  // medallion with the family glyph
  const my = y - by
  ctx.fillStyle = mix(mark, '#ffffff', 0.2)
  ctx.beginPath()
  ctx.arc(x, my, r * 0.14, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = LILAC_LO
  ctx.lineWidth = 2
  ctx.stroke()
  if (glyph) markGlyph(ctx, e.def.id, x, my, clamp(r * 0.11, 5, 8), mark)
}

/** Old Gloom's wide frown; it opens as the next Veil is about to be spat out. */
function gloomMouth(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, r: number) {
  if (cheer >= 0) {
    ctx.strokeStyle = mix(P.eye, '#2a1f3d', clamp(cheer * 2 - 0.4, 0, 1))
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(x, y + r * 0.1, r * 0.3, Math.PI * 0.2, Math.PI * 0.8)
    ctx.stroke()
    return
  }
  const open = e.spawnCd < 0.6 ? 1 - e.spawnCd / 0.6 : 0
  const lx = x - r * 0.42
  const rx = x + r * 0.42
  const my = y + r * 0.44
  ctx.beginPath()
  ctx.moveTo(lx, my)
  ctx.quadraticCurveTo(x, y + r * (0.14 - open * 0.1), rx, my)
  ctx.quadraticCurveTo(x, y + r * (0.22 + open * 0.32), lx, my)
  ctx.closePath()
  ctx.fillStyle = '#07040c'
  ctx.fill()
  ctx.strokeStyle = '#5d4d86'
  ctx.lineWidth = 2
  ctx.stroke()
  if (open > 0) {
    const a0 = ctx.globalAlpha
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = a0 * 0.55 * open
    const s = r * 0.32
    ctx.drawImage(glowSprite(P.lilac, 32), x - s, y + r * 0.36 - s * 0.6, s * 2, s * 1.2)
    ctx.globalAlpha = a0
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ------------------------------------------------------------------ live layers

function drawOverlays(ctx: CanvasRenderingContext2D, e: Enemy, t: number, o: EnemyDrawOpts, r: number, hidden: boolean) {
  const x = e.x
  const y = e.y
  const a = hidden ? o.hiddenAlpha : 1
  ctx.globalAlpha = a
  if (e.def.heal) {
    const pr = e.def.heal.radius * (0.9 + 0.1 * Math.sin(t * 3 + e.uid))
    ctx.strokeStyle = withAlpha(P.pink, 0.14)
    ctx.lineWidth = 2
    ctx.setLineDash([6, 8])
    ctx.lineDashOffset = t * 12
    ctx.beginPath()
    ctx.arc(x, y, pr, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // status overlays
  if (e.slowT > 0 && e.slowF > 0) {
    ctx.strokeStyle = withAlpha(P.ice, 0.75)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.72, r * 1.05, r * 0.38, 0, 0, TAU)
    ctx.stroke()
  }
  if (e.stunT > 0) {
    ctx.fillStyle = P.ice
    for (let i = 0; i < 3; i++) {
      const an = t * 5 + (i * TAU) / 3
      ctx.beginPath()
      ctx.arc(x + Math.cos(an) * r * 0.8, y - r - 6 + Math.sin(an) * 3, 2.5, 0, TAU)
      ctx.fill()
    }
  }
  if (e.burnT > 0) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.8 * a
    const spr = glowSprite(P.coral, 32)
    for (let i = 0; i < 2; i++) {
      const fx = x + Math.sin(t * 9 + i * 3 + e.uid) * r * 0.5
      const fy = y - r * 0.4 - ((t * 40 + i * 12) % 14)
      ctx.drawImage(spr, fx - 7, fy - 7, 14, 14)
    }
    ctx.globalAlpha = a
    ctx.globalCompositeOperation = 'source-over'
  }
  if (e.brittleT > 0) {
    ctx.strokeStyle = withAlpha(P.ice, 0.9)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x - r * 0.4, y - r * 0.5)
    ctx.lineTo(x - r * 0.1, y - r * 0.1)
    ctx.lineTo(x - r * 0.3, y + r * 0.2)
    ctx.moveTo(x - r * 0.1, y - r * 0.1)
    ctx.lineTo(x + r * 0.3, y - r * 0.25)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // health bars only where they carry information
  if (o.showBars && !hidden) {
    const big = e.def.boss || e.maxHp >= 9 || e.maxShell > 0
    const hurt = e.hp < e.maxHp - 0.01 || (e.maxShell > 0 && e.shell < e.maxShell)
    if (big && (hurt || e.def.boss)) {
      const w = e.def.boss ? r * 2 : Math.max(22, r * 1.6)
      const bx = x - w / 2
      const by = y - r - (e.def.boss ? 22 : 12)
      ctx.fillStyle = 'rgba(6,14,18,0.8)'
      ctx.beginPath()
      ctx.roundRect(bx - 2, by - 2, w + 4, e.maxShell > 0 ? 10 : 7, 3)
      ctx.fill()
      ctx.fillStyle = e.def.boss ? P.pale : P.amberHi
      ctx.fillRect(bx, by, w * Math.max(0, e.hp / e.maxHp), 3)
      if (e.maxShell > 0) {
        ctx.fillStyle = P.coral
        ctx.fillRect(bx, by + 4, w * Math.max(0, e.shell / e.maxShell), 3)
      }
    }
  }
}

/** Continuous damage (beam, burn): a warm additive glow and two sizzle sparks, never a white body. */
function heatGlow(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, r: number, t: number, a: number) {
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.35 * a
  const s = r * 1.4
  ctx.drawImage(glowSprite(P.pale, 64), x - s, y - s, s * 2, s * 2)
  ctx.globalAlpha = 0.9 * a
  ctx.fillStyle = P.pale
  for (let i = 0; i < 2; i++) {
    const u = (t * 2.3 + i * 0.5 + e.uid * 0.17) % 1
    ctx.beginPath()
    ctx.arc(x + Math.sin(t * 5 + i * 2.6 + e.uid) * r * 0.6, y - r * 0.3 - u * r * 0.9, 0.6 + 1.5 * (1 - u), 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/** Revealed hidden Mopes wear a soft lime glow. */
function revealGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.4 + Math.sin(t * 6) * 0.08
  const s = r * 1.7
  ctx.drawImage(glowSprite(P.lime, 64), x - s, y - s, s * 2, s * 2)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * Hidden Mopes: the body stays faint, but a crisp dashed lime outline and a small
 * eye-slash are drawn at full strength so the player can still route them.
 */
function hiddenMark(ctx: CanvasRenderingContext2D, e: Enemy, t: number, vs: number, ageQ: number) {
  const r = e.def.radius * ENEMY_VIS
  ctx.save()
  ctx.translate(e.x, e.y)
  ctx.scale(vs, vs)
  ctx.globalAlpha = 0.9 + 0.1 * Math.sin(t * 2.2 + e.uid)
  ctx.strokeStyle = P.lime
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.setLineDash([5, 4])
  ctx.lineDashOffset = -t * 14
  let top: number
  if (e.def.id === 'veil') {
    // matches the baked frame (same age, uid 0)
    const ph = ageQ * (TAU / PERIOD.veil)
    const vy = Math.sin(ph) * 2.5 - 4
    veilSheet(ctx, 0, vy, r, ph)
    top = vy - r * 1.55
  } else {
    const bob = Math.sin(ageQ * 4) * 1.5
    ctx.beginPath()
    ctx.ellipse(0, -r * 0.16 + bob, r * 1.02, r * 0.88, 0, 0, TAU)
    top = -r * 1.04 + bob
  }
  ctx.stroke()
  ctx.setLineDash([])
  // eye-slash: "keepers can't see this one"
  const my = top - 7
  ctx.lineCap = 'round'
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? P.lime : 'rgba(8,19,25,0.8)'
    ctx.lineWidth = pass ? 1.6 : 3.8
    ctx.beginPath()
    ctx.moveTo(-6, my)
    ctx.quadraticCurveTo(0, my - 5.5, 6, my)
    ctx.quadraticCurveTo(0, my + 5.5, -6, my)
    ctx.moveTo(-5, my + 4.5)
    ctx.lineTo(5, my - 4.5)
    ctx.stroke()
  }
  ctx.fillStyle = P.lime
  ctx.beginPath()
  ctx.arc(-1.6, my + 1.3, 1.3, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** Vector path drawn straight to the screen (bosses, and a fallback when a sprite can't be baked). */
function drawLive(ctx: CanvasRenderingContext2D, e: Enemy, t: number, a: number, vs: number) {
  ctx.save()
  if (vs !== 1) {
    ctx.translate(e.x, e.y)
    ctx.scale(vs, vs)
    ctx.translate(-e.x, -e.y)
  }
  ctx.globalAlpha = a
  drawBody(ctx, e, t, e.hitT > 0, true)
  ctx.restore()
}

// ------------------------------------------------------------------ sprite cache

interface Sprite {
  cv: HTMLCanvasElement
  /** Additive layer (the Wisp's tail), drawn with 'lighter' under the body. */
  add: HTMLCanvasElement | null
  half: number
  /** Eye spots (dx, dy, size) relative to the centre, for live blinks. */
  eyes: number[]
  /** Body ellipse (dx, dy, rx, ry) for the live flash rim. */
  rim: number[]
  bytes: number
  used: number
}

const ID_IX: Record<EnemyId, number> = { drip: 0, skitter: 1, shell: 2, veil: 3, bloat: 4, wisp: 5, mender: 6, vshell: 7, toad: 8, gloom: 9, skiff: 10, warden: 11, reedling: 12, bloomheart: 13 }
/** Canvas memory budget for baked frames (iOS WebKit caps total canvas memory). */
const SPRITE_BUDGET = 32 * 1024 * 1024

/** Bake resolution cap in device px per world unit (4K screens get slightly upscaled frames). */
const MAX_BAKE_PX = 2.5

const spriteCache = new Map<number, Sprite>()
let spriteBytes = 0
let spritePx = 1
/** Shrinks when the frames in use alone overflow the budget, so the cache never thrashes. */
let bakeScale = 1
let lastFlushT = -Infinity
/** After a failed bake (canvas memory exhausted), draw vectors live until this render time. */
let bakeOffUntil = -Infinity

function dropSprite(k: number, s: Sprite) {
  spriteCache.delete(k)
  spriteBytes -= s.bytes
  // release the backing store now rather than at GC time (matters on iOS)
  s.cv.width = s.cv.height = 0
  if (s.add) s.add.width = s.add.height = 0
}

function flushSprites() {
  for (const [k, s] of spriteCache) dropSprite(k, s)
  spriteBytes = 0
}

/** Frees frames not drawn in the last second; if that is not enough, starts over. */
function evictSprites(t: number) {
  for (const [k, s] of spriteCache) if (s.used < t - 1) dropSprite(k, s)
  if (spriteBytes <= SPRITE_BUDGET * 0.7) return
  flushSprites()
  // two overflows close together: the working set is too big, so bake smaller
  if (t - lastFlushT < 3) bakeScale = Math.max(0.5, bakeScale * 0.8)
  lastFlushT = t
}

/** Baked frames carry the palette's markings: start over when it changes. */
export function resetEnemySprites() {
  flushSprites()
}

/** Device pixels per world unit; sprites are rebuilt when this changes. */
export function setEnemySpriteScale(px: number) {
  const q = Math.round(px * 100) / 100
  if (q === spritePx) return
  spritePx = q
  bakeScale = 1
  flushSprites()
}

/** Debug: number of baked frames, their canvas memory in bytes, and the bake resolution. */
export function enemySpriteStats() {
  return { count: spriteCache.size, bytes: spriteBytes, px: Math.min(spritePx, MAX_BAKE_PX) * bakeScale }
}

function spriteHalf(id: EnemyId, r: number): number {
  switch (id) {
    case 'drip':
      return r * 1.6 + 6
    case 'skitter':
      return r + 22
    case 'shell':
    case 'vshell':
      return r * 1.2 + 6
    case 'veil':
      return r * 1.7 + 8
    case 'bloat':
      return r * 1.15 + 6
    case 'wisp':
      return r * 3.3
    case 'mender':
      return r + 20
    default:
      return r * 1.8
  }
}

/**
 * Mopes are drawn from pre-rendered frames: gradients and glows are baked once,
 * so a crowded late wave costs one drawImage per Mope plus live overlays.
 * Blinks, hit flashes, heat and the hidden outline are drawn live on top, and the
 * bosses (few, big and busy) are drawn as vectors every frame.
 */
export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number, o: EnemyDrawOpts) {
  const id = e.def.id
  const vs = e.visScale > 0 ? e.visScale : 1
  const r = e.def.radius * ENEMY_VIS * vs
  const hidden = isHidden(e)
  const a = hidden ? o.hiddenAlpha : 1
  const x = e.x
  const y = e.y
  if (e.def.boss) drawLive(ctx, e, t, 1, vs)
  else {
    const P0 = PERIOD[id]
    const fi = Math.floor((e.age / P0 + e.uid * 0.37) * FRAMES) % FRAMES
    const ageQ = (fi / FRAMES) * P0
    const dir = ((Math.round(Math.atan2(e.ty, e.tx) / (Math.PI / 4)) % 8) + 8) % 8
    let stage = 0
    if (e.maxShell > 0) {
      const f = e.shell / e.maxShell
      stage = e.shell <= 0 ? 4 : f >= 0.75 ? 0 : f >= 0.45 ? 1 : f >= 0.2 ? 2 : 3
    }
    if (e.def.hidden && !hidden) {
      const gy = id === 'veil' ? Math.sin(ageQ * (TAU / P0)) * 2.5 - 4 : -r * 0.15
      revealGlow(ctx, x, y + gy * vs, r, t)
    }
    const key = ((ID_IX[id] * FRAMES + fi) * 8 + dir) * 5 + stage
    let spr = spriteCache.get(key)
    if (!spr && t >= bakeOffUntil) {
      const built = buildSprite(e, fi, dir, stage, t)
      if (built) {
        spr = built
        spriteCache.set(key, spr)
      } else {
        // out of canvas memory: free what we hold and draw vectors for a while
        flushSprites()
        bakeOffUntil = t + 2
      }
    }
    if (spr) {
      spr.used = t
      const h = spr.half * vs
      if (spr.add) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = a
        ctx.drawImage(spr.add, x - h, y - h, h * 2, h * 2)
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.globalAlpha = a
      ctx.drawImage(spr.cv, x - h, y - h, h * 2, h * 2)
      if (((e.age * 0.7 + e.uid * 0.37) % 3.2) < 0.12) {
        const ey = spr.eyes
        for (let i = 0; i < ey.length; i += 3) lid(ctx, x + ey[i] * vs, y + ey[i + 1] * vs, ey[i + 2] * vs)
      }
      if (e.hitT > 0) {
        // hit flash: the same frame again, added as light, plus a thin white rim
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.5 * a
        ctx.drawImage(spr.cv, x - h, y - h, h * 2, h * 2)
        ctx.globalCompositeOperation = 'source-over'
        const rm = spr.rim
        if (rm.length === 4) {
          ctx.globalAlpha = 0.9 * a
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.ellipse(x + rm[0] * vs, y + rm[1] * vs, rm[2] * vs + 0.6, rm[3] * vs + 0.6, 0, Math.PI * 0.85, Math.PI * 2.15)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    } else drawLive(ctx, e, t, a, vs)
    if (hidden) hiddenMark(ctx, e, t, vs, ageQ)
  }
  if (e.heatT > 0) heatGlow(ctx, e, x, y, r, t, a)
  drawOverlays(ctx, e, t, o, r, hidden)
}

/** A stand-in Mope for baking, icons and cheers. */
function fakeEnemy(e: Partial<Enemy> & { def: Enemy['def'] }): Enemy {
  return {
    uid: 0,
    hp: 1,
    maxHp: 1,
    shell: 0,
    maxShell: 0,
    x: 0,
    y: 0,
    tx: 0,
    ty: 1,
    age: 0,
    hitT: 0,
    seenT: 1,
    revealedPerm: true,
    stunT: 0,
    burnT: 0,
    brittleT: 0,
    slowT: 0,
    slowF: 0,
    spawnCd: 9,
    phase: 0,
    heatT: 0,
    visScale: 1,
    ...e,
  } as Enemy
}

function newCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')
  if (!g) cv.width = cv.height = 0
  return [cv, g]
}

function buildSprite(e: Enemy, fi: number, dir: number, stage: number, t: number): Sprite | null {
  const id = e.def.id
  const r = e.def.radius * ENEMY_VIS
  const half = spriteHalf(id, r)
  const size = Math.max(4, Math.ceil(half * 2 * Math.min(spritePx, MAX_BAKE_PX) * bakeScale))
  const layered = id === 'wisp'
  const bytes = size * size * 4 * (layered ? 2 : 1)
  if (spriteBytes + bytes > SPRITE_BUDGET) evictSprites(t)
  const [cv, g] = newCanvas(size)
  if (!g) return null
  const [add, ag] = layered ? newCanvas(size) : [null, null]
  if (layered && !ag) {
    cv.width = cv.height = 0
    return null
  }
  ag?.scale(size / (half * 2), size / (half * 2))
  g.scale(size / (half * 2), size / (half * 2))
  const an = dir * (Math.PI / 4)
  const fake = fakeEnemy({
    def: e.def,
    shell: e.maxShell > 0 ? ([0.9, 0.6, 0.3, 0.1, 0][stage] ?? 0) : 0,
    maxShell: e.maxShell > 0 ? 1 : 0,
    x: half,
    y: half,
    tx: Math.cos(an),
    ty: Math.sin(an),
    age: (fi / FRAMES) * PERIOD[id],
    phase: e.phase,
  })
  const eyesOut: number[] = []
  const rimOut: number[] = []
  eyeLog = eyesOut
  rimLog = rimOut
  logX = half
  logY = half
  addCtx = ag
  try {
    drawBody(g, fake, fake.age, false, false)
  } finally {
    eyeLog = rimLog = null
    addCtx = null
  }
  spriteBytes += bytes
  return { cv, add, half, eyes: eyesOut, rim: rimOut, bytes, used: t }
}

/** Small icon of a Mope used in UI chips (wave preview, gate queue, journal). */
export function drawEnemyIcon(ctx: CanvasRenderingContext2D, id: EnemyId, x: number, y: number, size: number) {
  const def = ENEMIES[id]
  const shelled = !!def.shell
  const fake = fakeEnemy({ def: { ...def, radius: size / ENEMY_VIS }, uid: 3, x, y, age: 0.4, shell: shelled ? 1 : 0, maxShell: shelled ? 1 : 0 })
  drawBody(ctx, fake, 0.4, false, false)
}

/**
 * A Mope being cheered up, at progress k in [0, 1]: a happy squash, '^ ^' eyes,
 * a smile and blush, its family marking, brightening toward cream as it fades out.
 */
export function drawCheer(ctx: CanvasRenderingContext2D, id: EnemyId, x: number, y: number, k: number) {
  const kk = clamp(k, 0, 1)
  if (kk >= 1) return
  const def = ENEMIES[id]
  const r = def.radius * ENEMY_VIS
  const q = 0.15 * Math.cos(kk * 9) * Math.exp(-kk * 5)
  const foot = y + r * 0.6
  ctx.save()
  ctx.globalAlpha *= 1 - kk
  ctx.translate(x, foot)
  ctx.scale(1 + q, 1 - q)
  ctx.translate(-x, -foot)
  cheer = Math.min(0.85, kk * 1.3)
  try {
    drawBody(ctx, fakeEnemy({ def, x, y, age: 0.3 }), 0.3, false, false)
  } finally {
    cheer = -1
    ctx.restore()
  }
}

export { ENEMY_MARK }
