import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {Sim,DT,type Challenge} from '../src/game/sim'
import {HERO_IDS,type HeroId} from '../src/game/heroes'
import {siegeChallenge,firstShopOpen} from '../src/game/siege'
import {validSnapshot} from '../src/game/save-store'
import {COMMANDS,commandReady,commandTargets,campaignReward} from '../src/game/watch-director'
import {techniqueOffers} from '../src/game/watch-craft'
import {saveActCheckpoint,retrySiegeAct} from '../src/game/siege-store'
import {bossBreachText} from '../src/game/watch-clarity'
import {ENEMIES} from '../src/game/defs'
import {planComposition} from './second-compositions'
import {commandMoment} from './director-command-bot'

const legacy:Challenge={...siegeChallenge('sol'),siege:1,id:'siege1',skirmish:{from:0,to:40,glow:440,seed:27041}}
const old=new Sim('standard',legacy)
assert.equal(old.glow,440);assert.equal(old.waveDef(1).groups[0].count,10)
assert.equal(old.keeperWave('cracker'),2);assert.equal(campaignReward(old.challenge,8),297)
assert(old.build(0,'wick'));assert(old.startWave())
for(let i=0;i<240;i++)old.step(DT)
const oldSnap=old.snapshot();assert(validSnapshot(oldSnap))
const resumed=Sim.restore(structuredClone(oldSnap));assert.deepEqual(resumed.snapshot(),oldSnap)
for(let i=0;i<360;i++){old.step(DT);resumed.step(DT)}
assert.deepEqual(resumed.snapshot(),old.snapshot())
console.log('PASS published siege1 balance, income, unlocks and exact active-save continuation')
const malformed=structuredClone(oldSnap);Object.assign(malformed.challenge,{siege:'2',id:'siege2',skirmish:{...malformed.challenge.skirmish,glow:330}});assert(!validSnapshot(malformed),'Rule version must be a number')

// Isolate each command against a visible armoured target, with no artificial income.
for(const hero of HERO_IDS){
 const s=new Sim('standard',siegeChallenge(hero));s.wave=3
 assert(s.chooseTechnique(techniqueOffers(s)[0].id));const t=s.build(0,COMMANDS[hero].tower)!;assert(t)
 assert(s.startWave());s.spawners=[]
 const points=[...s.level.segs.values()].flatMap(seg=>Array.from({length:Math.floor(seg.line.length/8)},(_,i)=>{const at=i*8,p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});return {seg,at,d:Math.hypot(t.x-p.x,t.y-p.y)}})).sort((a,b)=>a.d-b.d)
 const p=points[0],e=s.spawnEnemy('shell',p.seg,p.at,4);e.hp=e.maxHp=100000;e.shell=e.maxShell=100000;e.speedBase=0
 assert(!s.bankCommand(),'Cannot activate before charge completes')
 for(let i=0;i<330;i++)s.step(DT)
 assert(t.fireT>0,'Command charging must not stop automatic fire');assert(commandReady(s));assert(commandTargets(s).length)
 e.burnT=0;e.burnDps=0
 const snap=s.snapshot();assert(validSnapshot(snap));const copy=Sim.restore(structuredClone(snap))
 const health=e.hp+e.shell,cd=t.cd;assert(s.bankCommand());assert(copy.bankCommand())
 assert.equal(t.cd,cd,'Activating does not delay the next automatic attack')
 assert.equal(s.director!.command!.phase,'spent');assert.equal(s.director!.commands,1);assert(!s.bankCommand());assert(!s.releaseCommand())
 if(hero==='mira'){assert(e.stunT>=1.25);assert(e.slowT>0)}else assert(e.hp+e.shell<health,'Sol also works before a burn upgrade; Ivo pierces armour')
 for(let i=0;i<60;i++){s.step(DT);copy.step(DT)}assert.deepEqual(copy.snapshot(),s.snapshot())
}
console.log('PASS three automatic-charge commands, real effects, uninterrupted attacks, once-per-wave limit and exact reload')

// Drive an escape through the real movement/leak path; no private method bypass.
for(const difficulty of ['relaxed','standard','nightfall'] as const)for(const [id,cost] of [['toad',8],['dredger',10],['bloomheart',12]] as const){
 const s=new Sim(difficulty,siegeChallenge());s.wave=7;assert(s.startWave());s.spawners=[]
 const last=[...s.level.segs.values()].find(seg=>'home' in seg.next)??s.level.segs.get('h')!
 const e=s.spawnEnemy(id,last,last.line.length-.01,8);e.speedBase=100;e.phase=99;e.shell=0
 const light=s.lives;for(let i=0;i<3&&e.alive;i++)s.step(DT)
 const actualCost=difficulty==='nightfall'?ENEMIES[id].weight:cost
 assert(!e.alive);assert.equal(s.lives,Math.max(0,light-actualCost))
 assert.equal(s.over,actualCost>=light?'lost':null)
 assert.equal(bossBreachText(s,id),actualCost>=999?'Boss escape causes immediate defeat.':`Boss escape costs ${actualCost} light.`)
}
console.log('PASS actual boss breaches cost 8/10/12 light; Nightfall retains original costs; forecast matches the damage')

class MemoryStorage implements Storage{data=new Map<string,string>();get length(){return this.data.size}getItem(k:string){return this.data.get(k)??null}setItem(k:string,v:string){this.data.set(k,v)}removeItem(k:string){this.data.delete(k)}clear(){this.data.clear()}key(n:number){return [...this.data.keys()][n]??null}}
Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true})
const checkpoint=new Sim('standard',siegeChallenge());checkpoint.wave=7;assert(checkpoint.build(0,'wick'));assert(saveActCheckpoint(checkpoint,[1]))
const before=checkpoint.snapshot();assert(checkpoint.startWave());checkpoint.over='lost';checkpoint.lives=0
const retry=retrySiegeAct(checkpoint)!;assert(retry);assert.equal(retry.sim.wave,7);assert.equal(retry.sim.glow,before.glow);assert.deepEqual(retry.sim.snapshot().towers,before.towers)
const shop={challenge:siegeChallenge(),wave:5,waveActive:true,over:null};assert(!firstShopOpen(shop));shop.waveActive=false;assert(firstShopOpen(shop))
console.log('PASS pre-boss checkpoint preserves the paid defence; first storefront opens only after wave 5 is held')

// Paid opening comparisons are separate from synthetic contract fixtures above.
function opening(hero:HeroId,adaptive:boolean){
 const s=new Sim('standard',siegeChallenge(hero));const waves=[]
 mkdirSync('artifacts/resubmission',{recursive:true})
 while(!s.over&&s.wave<8){
  if(hero==='sol'&&adaptive&&[3,5,7].includes(s.wave))writeFileSync(`artifacts/resubmission/prepare-${s.wave}.json`,JSON.stringify(s.snapshot()))
  if(adaptive){const offer=techniqueOffers(s);if(offer.length)s.chooseTechnique(offer[1].id);planComposition(s,1)}
  else if(!s.towers.length){assert(s.build(0,'wick'));assert(s.build(3,'wick'))}
  assert(s.startWave());let ticks=0
  while(s.waveActive&&!s.over&&ticks++<36000){if(adaptive)commandMoment(s);s.step(DT);s.events=[];if(adaptive&&ticks%240===0)planComposition(s,1)}
  assert(ticks<36000);waves.push({wave:s.wave,light:s.lives,glow:Math.round(s.glow)})
 }
 return {hero,adaptive,wave:s.wave,light:s.lives,seconds:Math.round(s.time),waves}
}
const rows=HERO_IDS.flatMap(hero=>[opening(hero,false),opening(hero,true)])
mkdirSync('artifacts/resubmission',{recursive:true});writeFileSync('artifacts/resubmission/opening-balance.json',JSON.stringify(rows,null,2))
for(const hero of HERO_IDS){const passive=rows.find(r=>r.hero===hero&&!r.adaptive)!,active=rows.find(r=>r.hero===hero&&r.adaptive)!;assert(active.wave===8&&active.light>0,`${hero} has a paid opening`);assert(passive.light<active.light,`${hero}: adapting must outperform two idle Sparks`)}
console.log('PASS each keeper has a paid 8-wave opening; adaptation outperforms two idle Sparks')
console.log(JSON.stringify(rows.map(({waves,...r})=>r)))
