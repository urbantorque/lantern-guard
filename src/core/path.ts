import type { Vec } from './math'

/**
 * A smooth polyline with an arc-length table. Built from control points via a
 * centripetal-ish Catmull-Rom pass so hand-authored canals read as organic curves.
 */
export class Polyline {
  readonly pts: Vec[]
  readonly cum: number[]
  readonly length: number

  constructor(control: Vec[], samplesPerSpan = 14) {
    this.pts = catmullRom(control, samplesPerSpan)
    this.cum = [0]
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1]
      const b = this.pts[i]
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y))
    }
    this.length = this.cum[this.cum.length - 1]
  }

  /** Position and unit tangent at arc length s (clamped). */
  at(s: number, out: { x: number; y: number; tx: number; ty: number }) {
    const cum = this.cum
    if (s <= 0) s = 0
    if (s >= this.length) s = this.length
    // binary search for span
    let lo = 0
    let hi = cum.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (cum[mid] <= s) lo = mid
      else hi = mid
    }
    const a = this.pts[lo]
    const b = this.pts[hi]
    const span = cum[hi] - cum[lo] || 1
    const t = (s - cum[lo]) / span
    out.x = a.x + (b.x - a.x) * t
    out.y = a.y + (b.y - a.y) * t
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    out.tx = dx / len
    out.ty = dy / len
    return out
  }

  /** Closest distance from point to the polyline (brute force, used for layout checks). */
  distanceTo(x: number, y: number): number {
    let best = Infinity
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1]
      const b = this.pts[i]
      const abx = b.x - a.x
      const aby = b.y - a.y
      const l2 = abx * abx + aby * aby || 1
      let t = ((x - a.x) * abx + (y - a.y) * aby) / l2
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const px = a.x + abx * t
      const py = a.y + aby * t
      const d = Math.hypot(x - px, y - py)
      if (d < best) best = d
    }
    return best
  }
}

function catmullRom(p: Vec[], n: number): Vec[] {
  if (p.length < 3) return p.map((v) => ({ ...v }))
  const out: Vec[] = []
  const get = (i: number) => p[Math.max(0, Math.min(p.length - 1, i))]
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    for (let j = 0; j < n; j++) {
      const t = j / n
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push({ ...p[p.length - 1] })
  return out
}
