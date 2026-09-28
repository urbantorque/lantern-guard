import type { TowerId } from './defs'

export type GuardianId = 'lantern' | 'ember' | 'reed'
export const GUARDIANS: Record<GuardianId, { name: string; description: string; tower?: TowerId; feat?: string; unlock: string }> = {
  lantern: { name: 'Lantern Keeper', description: 'Familiar tower abilities, with full impact damage.', unlock: 'Always available' },
  ember: { name: 'Ember Keeper', tower: 'cracker', feat: 'crowned', description: 'Crackers trade 40% of impact damage for lingering ground fire. Overlapping fire does not stack.', unlock: 'Buy any tier-three upgrade' },
  reed: { name: 'Reed Keeper', tower: 'wick', feat: 'full-bloom', description: 'Wickling sparks trade 25% damage for one bounce to a nearby second enemy.', unlock: 'Cheer 1,200 Mopes in one defence' },
}
export const guardianUnlocked = (id: GuardianId, feats: Record<string, boolean>) => !GUARDIANS[id].feat || !!feats[GUARDIANS[id].feat!]
