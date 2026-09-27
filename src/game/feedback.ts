import { ENEMIES } from './defs'
import type { Sim } from './sim'

/** Only describe facts captured when the enemy escaped; don't guess a failed tower. */
export function leakAdvice(sim: Sim): string {
  const leak = sim.lastLeak
  if (!leak) return ''
  const lower = /l([01])/.exec(leak.route)
  const branch = lower ? sim.gates[1].def.labels[Number(lower[1])] : 'the final channel'
  const problem = leak.hidden ? 'still hidden' : leak.armoured ? 'with armour intact' : 'with health left'
  const suggestion = leak.hidden ? 'Cover that water with an Owl and an attacking tower.' : leak.armoured ? 'Add heavy hits along that route.' : 'Check damage coverage and upgrades on that branch.'
  return `${ENEMIES[leak.enemy].name} escaped via ${branch}, ${problem}. ${suggestion}`
}
