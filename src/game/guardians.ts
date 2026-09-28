import { TOWERS, type TowerId } from './defs'

export type GuardianId = 'lantern' | 'ember' | 'reed' | 'tide'
export const GUARDIANS: Record<GuardianId, { name: string; description: string; tower?: TowerId; signature?: string; role: string; feat?: string; unlock: string }> = {
  lantern: { name: 'Lantern Keeper', role: 'Original towers', description: 'Use the original towers. A good place to start.', unlock: 'Always available' },
  ember: { name: 'Ember Keeper', tower: 'cracker', signature: 'Ember Cracker', role: 'Leaves fire', feat: 'crowned', description: 'Crackers leave fire on the ground, but their explosions deal 40% less damage.', unlock: 'Buy a level 3 tower upgrade' },
  reed: { name: 'Reed Keeper', tower: 'wick', signature: 'Reed Wick', role: 'Bouncing shots', feat: 'full-bloom', description: 'Wickling shots bounce to a second enemy, but each hit deals 25% less damage.', unlock: 'Defeat 1,200 enemies in one game' },
  tide: { name: 'Tide Keeper', tower: 'bell', signature: 'Tide Bell', role: 'Stronger slows', feat: 'groundskeeper', description: 'Moonbells slow enemies more, but take 25% longer between attacks.', unlock: 'Buy 3 building plots in one game' },
}
export const guardianUnlocked = (id: GuardianId, feats: Record<string, boolean>) => !GUARDIANS[id].feat || !!feats[GUARDIANS[id].feat!]
export function signatureFor(id: TowerId, guardian?: GuardianId) {
  const g = GUARDIANS[guardian ?? 'lantern']
  return g.tower === id ? g : undefined
}
export const towerName = (id: TowerId, guardian?: GuardianId) => signatureFor(id, guardian)?.signature ?? TOWERS[id].name
