import type { EnemyId, TowerId } from '../game/defs'
import { drawEnemyIcon } from '../render/enemies'
import { towerPortrait } from '../render/towers'

const enemyCache = new Map<string, string>()
const towerCache = new Map<string, string>()

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
export function towerIcon(id: TowerId, a = 0, b = 0, size = 128): string {
  const key = `${id}.${a}.${b}.${size}`
  let url = towerCache.get(key)
  if (url) return url
  // towerPortrait fits every tier, so tall upgrades are never cropped
  url = towerPortrait(id, size, 1, a, b).toDataURL()
  towerCache.set(key, url)
  return url
}
