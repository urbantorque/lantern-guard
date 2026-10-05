import type { Enemy, LeakReport, SaveSnapshotV2, Sim, Tower } from './sim'
import type { WaveDef } from './waves'
import { bondName, BOND_HELP } from './fixed'

/** New watches opt in. Resumed watches and published weekly seeds keep their rules. */
export const TACTICS_RULES = 1 as const
export const EXPOSED_BONUS = 1.2

export function tacticalWave(base:WaveDef,n:number,short:boolean):WaveDef {
  const beat=short?({5:1,8:2,11:3} as Record<number,number>)[n]:({18:1,23:2,33:3} as Record<number,number>)[n]
  if(!beat)return base
  // Preserve the encounter's headcount and economy; author timing and formations.
  const groups=base.groups.map(g=>({...g}))
  if(beat===1){
    for(const g of groups){g.src='north';g.at=['shell','vshell'].includes(g.type)?0:g.type==='mender'?2:7;g.gap=Math.max(.7,g.gap)}
    return {...base,groups,encounter:'Breakwater convoy',note:'Armour leads a close convoy. Catch it in shared Chime and Blast reach; a crowded second formation follows.'}
  }
  if(beat===2){
    // Trade two ordinary enemies for one healer, keeping this a tactical test.
    const ordinary=groups.find(g=>g.type==='drip'&&g.count>=3)
    if(ordinary&&!groups.some(g=>g.type==='mender')){ordinary.count-=2;groups.push({type:'mender',count:1,gap:1,at:2.5,src:'north'})}
    for(const g of groups){g.src='north';g.at=g.type==='mender'?2.5:['shell','vshell'].includes(g.type)?0:9;g.gap=Math.max(.8,g.gap)}
    return {...base,groups,encounter:'The sheltered surgeon',note:'Armour screens a healer. Keep heavy damage and sight together, then catch the runners following behind.'}
  }
  for(const g of groups){const runner=['skitter','skiff','veil','wisp'].includes(g.type);g.src=runner?'west':'north';g.at=runner?10:0;g.gap=Math.max(.65,g.gap)}
  return {...base,groups,encounter:'The late flank',note:'The main convoy commits first. Fast arrivals enter from the side inlet later in the wave. Leave control and a finishing tower on the shared lower bend.'}
}

export function bondHelp(s:Sim,a:Tower['id'],b:Tower['id']):string {
  const name=bondName(a,b,true)
  if(s.challenge.watchTactics&&name==='Shatterburst')return 'A blast cracks up to 3 slowed, armoured foes over shared water: 12 armour each and 3s exposed to heavy hits (+20%). Every 4s.'
  if(s.challenge.watchTactics&&name==='Beacon Volley')return 'A bolt aimed inside Scout sight becomes a luminous lance: +30% damage, armour piercing and 2 extra pierces. Every 4s; straight after its first hit.'
  return name?BOND_HELP[name]:''
}

export function crownTechnique(s:Sim,t:Pick<Tower,'id'>):{name:string;help:string}|null {
  if(!s.challenge.watchTactics)return null
  const has=(id:Sim['techniques'][number])=>s.techniques.includes(id)
  if(t.id==='cracker'&&has('long-embers'))return {name:'Wildfire · Ashfall',help:'Your burning defeats leave a 2.5s fire pool and spread fresh 3s burns. Up to 3 pools per Blast; scattered foes still escape the chain.'}
  if(t.id==='cracker'&&has('flashpoint'))return {name:'Flashpoint · Backdraft',help:'Ignition splashes 40% of its stored-fire bonus onto 2 nearby foes. Every 4s; needs an existing burn.'}
  if(t.id==='storm'&&has('capacitor'))return {name:'Capacitor · Thunderhead',help:'The third volley breaks armour and staggers up to 3 nearby ordinary foes for 0.6s. The two charging volleys keep their normal damage.'}
  if(t.id==='storm'&&has('forked-current'))return {name:'Forked current · Cascade',help:'Defeating the first target extends that lightning chain by 2 jumps. Tough first targets give no extra jumps.'}
  if(t.id==='bell'&&has('tidal-echo'))return {name:'Undertow · Dragnet',help:'Pushed foes are exposed to heavy hits (+20%) for 3s. Place heavy damage over the return stretch; bosses resist the push.'}
  if(t.id==='bell'&&has('deep-freeze'))return {name:'Still tide · Icebreak',help:'Frozen foes are exposed to heavy hits (+20%) for 3s. A successful boss interruption creates a 4s opening.'}
  return null
}

export type BreachCause='hidden'|'armour'|'runaway'|'coverage'|'pressure'
export interface BreachDetail {cause:BreachCause;x:number;y:number;segment:string;hp:number;shell:number;damageTowers:number;controlTowers:number}
/** Record observations at the last bend, not a claim about an unknowable single cause. */
export function breachDetail(s:Sim,e:Enemy):BreachDetail {
  const seg=s.level.segs.get('e2')??e.seg
  const p=seg.line.at(seg.line.length*.72,{x:0,y:0,tx:0,ty:0})
  const covering=s.towers.filter(t=>Math.hypot(t.x-p.x,t.y-p.y)<=s.effRange(t))
  const damageTowers=covering.filter(t=>t.stats.damage>0||t.stats.mothEvery>0).length
  const controlTowers=covering.filter(t=>t.stats.slow>0||t.stats.gardenSlow>0).length
  const cause:BreachCause=e.def.hidden&&!e.revealedPerm&&e.seenT<=0?'hidden':e.shell>0?'armour':e.def.id==='skiff'&&!controlTowers?'runaway':!damageTowers?'coverage':'pressure'
  return {cause,x:p.x,y:p.y,segment:seg.id,hp:Math.max(0,e.hp),shell:e.shell,damageTowers,controlTowers}
}
export function breachAdvice(leak:LeakReport):string {
  const d=leak.detail
  if(!d)return ''
  return ({hidden:'It reached the lantern unseen. Extend Scout sight across the lower damage towers.',armour:`It still carried ${Math.ceil(d.shell)} armour. Add heavy damage or a Chime–Blast Bond before the last bend.`,runaway:'Its armour had broken, but the marked bend had no slowing tower. Put a Chime beside the finishing damage.',coverage:'The marked bend had no damage tower in reach. Add a finishing tower there or extend its night reach.',pressure:`It reached the lantern with ${Math.ceil(d.hp)} health. ${d.controlTowers?'Control covered the marked bend; strengthen its finishing damage.':'Add a slow over the marked bend to buy the finishing towers another volley.'}`} as const)[d.cause]
}

/** A checkpoint from another seed, mode, hero or wave must never become a rehearsal. */
export function matchingCheckpoint(run:SaveSnapshotV2,p:SaveSnapshotV2|null):p is SaveSnapshotV2 {
  return !!p&&run.over==='lost'&&!p.over&&!p.won&&p.wave===run.wave-1&&p.seed===run.seed&&p.difficulty===run.difficulty&&JSON.stringify(p.challenge)===JSON.stringify(run.challenge)&&!p.enemies.length&&!p.spawners.length&&!p.wavesPending.length&&p.lives>0
}
