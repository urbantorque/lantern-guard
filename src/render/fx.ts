import { TAU, vrand } from '../core/math'
import type { EnemyId } from '../game/defs'
import { drawCheer } from './enemies'
import { glowSprite, P, withAlpha } from './palette'

export type PKind = 'spark' | 'ink' | 'ring' | 'firefly' | 'text' | 'shard' | 'flash' | 'mote' | 'note' | 'cheer' | 'petal' | 'pillar' | 'orbit' | 'link'

export interface Particle {
  kind: PKind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  rot: number
  vr: number
  grav: number
  drag: number
  tx: number
  ty: number
  text: string
  lw: number
  /** Mope drawn by a 'cheer' particle. */
  enemy?: EnemyId
  /** Fireflies: called on arrival. Cheers: called when the beat ends. */
  onArrive?: () => void
}

const MAX = 1100
const FONT = '"DM Sans Variable", ui-sans-serif, system-ui, sans-serif'

export class Fx {
  list: Particle[] = []
  /** 0..1, lowers particle counts for "calm effects". */
  density = 1
  shake = 0
  shakeEnabled = true
  /** Multiplier so world-space text stays legible when the map is drawn small. */
  textScale = 1
  /** Smallest world font size that still renders at 13 CSS px. */
  minText = 0

  add(p: Partial<Particle> & { kind: PKind; x: number; y: number }): Particle | null {
    if (this.list.length >= MAX) {
      // drop the oldest cosmetic particle to stay inside the budget
      const i = this.list.findIndex((q) => q.kind === 'spark' || q.kind === 'mote' || q.kind === 'ink' || q.kind === 'petal')
      if (i < 0) return null
      this.list.splice(i, 1)
    }
    const q: Particle = {
      vx: 0,
      vy: 0,
      life: 1,
      max: 1,
      size: 4,
      color: P.amber,
      rot: 0,
      vr: 0,
      grav: 0,
      drag: 0,
      tx: 0,
      ty: 0,
      text: '',
      lw: 2,
      ...p,
    }
    q.max = q.life
    this.list.push(q)
    return q
  }

  burst(x: number, y: number, color: string, n: number, speed = 160, size = 3, life = 0.5) {
    n = Math.max(1, Math.round(n * this.density))
    for (let i = 0; i < n; i++) {
      const a = vrand(0, TAU)
      const s = vrand(speed * 0.3, speed)
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: vrand(life * 0.6, life), size: vrand(size * 0.6, size), color, drag: 3 })
    }
  }

  /** Droplets that arc and fall (light by default so they read on dark water). */
  inkSplat(x: number, y: number, n: number, size = 5, color: string = P.cream) {
    n = Math.round(n * this.density)
    for (let i = 0; i < n; i++) {
      const a = vrand(0, TAU)
      const s = vrand(40, 170)
      this.add({ kind: 'ink', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: vrand(0.35, 0.6), size: vrand(size * 0.5, size), color, drag: 4, grav: 260 })
    }
  }

  ring(x: number, y: number, r: number, color: string, life = 0.45, lw = 3) {
    this.add({ kind: 'ring', x, y, size: r, life, color, lw })
  }

  flash(x: number, y: number, r: number, color: string, life = 0.25) {
    this.add({ kind: 'flash', x, y, size: r, life, color })
  }

  text(x: number, y: number, text: string, color: string, size = 22, life = 1.1) {
    this.add({ kind: 'text', x, y, vy: -38 * this.textScale, text, color, size: Math.max(size * this.textScale, this.minText), life })
  }

  shards(x: number, y: number, color: string, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = vrand(0, TAU)
      const s = vrand(90, 220)
      this.add({ kind: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: vrand(0.5, 0.8), size: vrand(4, 8), color, rot: vrand(0, TAU), vr: vrand(-12, 12), grav: 520, drag: 1.2 })
    }
  }

  /** The happy "cheered up" Mope beat; onDone fires as it bursts. */
  cheer(x: number, y: number, id: EnemyId, dur: number, onDone?: () => void) {
    this.add({ kind: 'cheer', x, y, enemy: id, life: dur, vy: -14, onArrive: onDone })
  }

  /** Soft petals in a family colour that drift outward, sink a little and fade. */
  petals(x: number, y: number, color: string, n: number, size = 4.5, speed = 90) {
    n = Math.max(1, Math.round(n * this.density))
    const a0 = vrand(0, TAU)
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * TAU + vrand(-0.3, 0.3)
      const s = vrand(speed * 0.5, speed)
      this.add({ kind: 'petal', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - 30, life: vrand(0.7, 1.05), size: vrand(size * 0.8, size * 1.15), color, rot: a, vr: vrand(-7, 7), grav: 55, drag: 3.2 })
    }
  }

  /** Vertical light pillar (tier-3 upgrades, victory). */
  pillar(x: number, y: number, color: string, h = 320, life = 1.1) {
    this.add({ kind: 'pillar', x, y, size: h, color, life })
  }

  /** A slowly turning ground ring of glowing dots. */
  orbit(x: number, y: number, r: number, color: string, n = 10, life = 1.3) {
    this.add({ kind: 'orbit', x, y, size: r, color, lw: n, life, vr: 2.6, rot: vrand(0, TAU) })
  }

  update(dt: number) {
    const L = this.list
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]
      p.life -= dt
      if (p.kind === 'firefly') {
        // wander briefly, then home to the glow counter
        const age = p.max - p.life
        if (age > 0.35) {
          const dx = p.tx - p.x
          const dy = p.ty - p.y
          const d = Math.hypot(dx, dy) || 1
          const want = 520 + age * 900
          p.vx += ((dx / d) * want - p.vx) * Math.min(1, dt * 6)
          p.vy += ((dy / d) * want - p.vy) * Math.min(1, dt * 6)
          if (d < 18 || d < Math.hypot(p.vx, p.vy) * dt) {
            p.onArrive?.()
            L.splice(i, 1)
            continue
          }
        } else {
          p.vx *= 1 - dt * 2
          p.vy = p.vy * (1 - dt * 2) - 30 * dt
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.life <= 0) {
          p.onArrive?.()
          L.splice(i, 1)
        }
        continue
      }
      if (p.life <= 0) {
        L.splice(i, 1)
        if (p.kind === 'cheer') p.onArrive?.()
        continue
      }
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt)
        p.vx *= k
        p.vy *= k
      }
      p.vy += p.grav * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5)
  }

  drawBase(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const k = p.life / p.max
      switch (p.kind) {
        case 'link': {
          ctx.globalAlpha = k * .85; ctx.strokeStyle = p.color; ctx.lineWidth = p.lw; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(p.x, p.y)
          ctx.lineTo((p.x + p.tx) / 2 + 4, (p.y + p.ty) / 2 - 4); ctx.lineTo(p.tx, p.ty); ctx.stroke()
          break
        }
        case 'cheer': {
          ctx.globalAlpha = 1
          drawCheer(ctx, p.enemy!, p.x, p.y, 1 - k)
          break
        }
        case 'petal': {
          ctx.globalAlpha = Math.min(1, k * 1.8) * 0.9
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.5 * (0.6 + 0.4 * Math.abs(Math.sin(p.rot * 1.3))), p.rot, 0, TAU)
          ctx.fill()
          break
        }
        case 'ink': {
          ctx.globalAlpha = Math.min(1, k * 1.6) * 0.8
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, TAU)
          ctx.fill()
          break
        }
        case 'shard': {
          ctx.globalAlpha = Math.min(1, k * 2)
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.moveTo(-p.size, -p.size * 0.4)
          ctx.lineTo(p.size * 0.8, -p.size * 0.7)
          ctx.lineTo(p.size * 0.5, p.size * 0.6)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
          break
        }
        case 'ring': {
          const t = 1 - k
          ctx.globalAlpha = k * 0.9
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.lw * (0.4 + k)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (0.25 + 0.75 * easeOut(t)), 0, TAU)
          ctx.stroke()
          break
        }
        case 'text': {
          const t = 1 - k
          ctx.globalAlpha = Math.min(1, k * 2.5)
          const s = p.size * (t < 0.12 ? 0.6 + (t / 0.12) * 0.5 : 1.1 - Math.min(0.1, (t - 0.12) * 0.4))
          ctx.font = `700 ${s}px ${FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.lineWidth = Math.max(4, s * 0.22)
          ctx.strokeStyle = 'rgba(8,19,25,0.85)'
          ctx.strokeText(p.text, p.x, p.y)
          ctx.fillStyle = p.color
          ctx.fillText(p.text, p.x, p.y)
          break
        }
      }
    }
    ctx.globalAlpha = 1
  }

  drawGlow(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const k = p.life / p.max
      switch (p.kind) {
        case 'spark': {
          const s = p.size * (0.5 + k)
          ctx.globalAlpha = Math.min(1, k * 1.5)
          const spr = glowSprite(p.color, 32)
          ctx.drawImage(spr, p.x - s * 2, p.y - s * 2, s * 4, s * 4)
          break
        }
        case 'mote': {
          ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8
          const spr = glowSprite(p.color, 32)
          ctx.drawImage(spr, p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4)
          break
        }
        case 'flash': {
          ctx.globalAlpha = k * k
          const spr = glowSprite(p.color, 64)
          const s = p.size * (1.2 - k * 0.2)
          ctx.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2)
          break
        }
        case 'cheer': {
          // warm halo behind the happy Mope
          ctx.globalAlpha = 0.35 * k
          ctx.drawImage(glowSprite(P.amberHi, 64), p.x - 28, p.y - 28, 56, 56)
          break
        }
        case 'pillar': {
          // rises fast, then thins out
          const t = 1 - k
          const grow = Math.min(1, t * 6)
          const h = p.size * grow
          const w = 46 * (0.55 + k * 0.45)
          ctx.globalAlpha = Math.min(1, k * 1.6) * 0.75
          const spr = glowSprite(p.color, 64)
          ctx.drawImage(spr, p.x - w, p.y - h, w * 2, h * 1.25)
          ctx.globalAlpha = Math.min(1, k * 1.6) * 0.8
          ctx.drawImage(glowSprite('#ffffff', 64), p.x - w * 0.28, p.y - h * 0.92, w * 0.56, h * 1.1)
          break
        }
        case 'orbit': {
          const n = p.lw
          const r = p.size * (0.7 + 0.3 * easeOut(1 - k))
          ctx.globalAlpha = Math.min(1, k * 2)
          const spr = glowSprite(p.color, 32)
          for (let i = 0; i < n; i++) {
            const a = p.rot + (i / n) * TAU
            const dx = Math.cos(a) * r
            const dy = Math.sin(a) * r * 0.45
            const s = 5 + (Math.sin(a) + 1) * 2.5
            ctx.drawImage(spr, p.x + dx - s, p.y + dy - s, s * 2, s * 2)
          }
          break
        }
        case 'firefly': {
          ctx.globalAlpha = 1
          const spr = glowSprite(P.amber, 32)
          ctx.drawImage(spr, p.x - 12, p.y - 12, 24, 24)
          ctx.fillStyle = withAlpha(P.amberHi, 1)
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.4, 0, TAU)
          ctx.fill()
          break
        }
      }
    }
    ctx.globalAlpha = 1
  }
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
