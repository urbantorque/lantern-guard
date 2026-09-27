export interface Vec {
  x: number
  y: number
}

export const TAU = Math.PI * 2

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => (v - a) / (b - a)
export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.sqrt(dist2(ax, ay, bx, by))

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
export const easeOutElastic = (t: number) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
}

/** Damped spring toward target; returns new [value, velocity]. */
export function spring(value: number, vel: number, target: number, dt: number, stiffness = 180, damping = 14): [number, number] {
  const f = (target - value) * stiffness - vel * damping
  vel += f * dt
  value += vel * dt
  return [value, vel]
}

/** Small, fast, seedable PRNG (mulberry32). */
export class Rng {
  private s: number
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next()
  }
  int(a: number, b: number) {
    return Math.floor(this.range(a, b + 1))
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
}

/** Visual-only randomness (never used by the simulation). */
export const vrand = (a = 0, b = 1) => a + (b - a) * Math.random()
