import type { EnemyId, TowerId } from '../game/defs'
import type { GuardianId } from '../game/guardians'
import { compactLevel, STARTER_PLOTS } from '../game/compact'
import { buildLevel } from '../game/level'
import { drawEnemyIcon } from '../render/enemies'
import { towerPortrait } from '../render/towers'

const enemyCache = new Map<string, string>()
const towerCache = new Map<string, string>()
const mapCache = new Map<number, string>()

export function mapPreview(variant: number): string {
  if (mapCache.has(variant)) return mapCache.get(variant)!
  const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 210
  const ctx = canvas.getContext('2d')!; ctx.scale(.25, .25)
  const level = buildLevel(compactLevel(variant))
  ctx.fillStyle = ['#18352e', '#183d39', '#24344c', '#333b39'][variant]; ctx.fillRect(0, 0, 720, 840)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const segment of level.segs.values()) {
    ctx.strokeStyle = segment.feature ? '#87c7b7' : '#588b91'; ctx.lineWidth = 28
    ctx.beginPath(); segment.line.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke()
  }
  for (const i of STARTER_PLOTS) { const p = level.def.pads[i]; ctx.fillStyle = '#f5d59b'; ctx.beginPath(); ctx.arc(p.x, p.y, 19, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = '#ffbd5d'; ctx.beginPath(); ctx.arc(level.def.home.x, level.def.home.y, 23, 0, Math.PI * 2); ctx.fill()
  const url = canvas.toDataURL(); mapCache.set(variant, url); return url
}

/** Icons are baked in the current palette: drop them when it changes. */
export function clearIconCache() {
  enemyCache.clear()
  towerCache.clear()
}

/** Data URL of a Mope icon drawn with the in-game art. */
export function enemyIcon(id: EnemyId): string {
  let url = enemyCache.get(id)
  if (url) return url
  const c = document.createElement('canvas')
  c.width = c.height = 96
  const ctx = c.getContext('2d')!
  const boss = id === 'toad' || id === 'gloom'
  const r = boss ? 22 : id === 'bloat' ? 26 : id === 'wisp' ? 20 : 30
  drawEnemyIcon(ctx, id, 48, id === 'gloom' ? 50 : 52, r)
  url = c.toDataURL()
  enemyCache.set(id, url)
  return url
}

/** Data URL of a keeper portrait at the given tiers. */
export function towerIcon(id: TowerId, a = 0, b = 0, size = 128, guardian?: GuardianId): string {
  const key = `${id}.${a}.${b}.${size}.${guardian ?? ''}`
  let url = towerCache.get(key)
  if (url) return url
  // towerPortrait fits every tier, so tall upgrades are never cropped
  url = towerPortrait(id, size, 1, a, b, guardian).toDataURL()
  towerCache.set(key, url)
  return url
}
