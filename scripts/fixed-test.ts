import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { Sim,DT,type SaveSnapshotV2 } from '../src/game/sim'
import { validSnapshot,encodeRun,decodeRun } from '../src/game/save-store'
import { TOWER_ORDER } from '../src/game/defs'
import { COMMISSIONS } from '../src/game/fixed'
import { runFixed, type Strategy } from './fixed-bot'

const fresh=(variant=0)=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant},1047)
const exact=(s:Sim)=>{
  const snap=JSON.parse(JSON.stringify(s.snapshot())) as SaveSnapshotV2
  assert(validSnapshot(snap),'snapshot valid')
  assert(decodeRun(encodeRun(snap,[])))
  const restored=Sim.restore(snap);assert.deepEqual(restored.snapshot(),snap)
  for(let i=0;i<120;i++){s.step(DT);restored.step(DT);s.events=[];restored.events=[]}
  assert.deepEqual(restored.snapshot(),s.snapshot())
}
for(let v=0;v<4;v++) {
  const s=fresh(v);assert.equal(s.gates.length,0)
  for(const seg of s.level.segs.values()){assert(!('gate' in seg.next));assert(!seg.feature);assert.equal(seg.bonus,1)}
  for(const seg of s.level.segs.values())if('seg' in seg.next){
    const next=s.level.segs.get(seg.next.seg)!,a=seg.line.at(seg.line.length,{x:0,y:0,tx:0,ty:0}),b=next.line.at(0,{x:0,y:0,tx:0,ty:0})
    assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-6,`map ${v}: ${seg.id} joins ${next.id}`)
    if(seg.id!=='inlet')assert(a.tx*b.tx+a.ty*b.ty>.93,`map ${v}: tangent through ${seg.id} is smooth`)
  }
  for(const p of s.pads)for(const seg of s.level.segs.values())assert(seg.line.distanceTo(p.x,p.y)>36,`map ${v} plot ${s.pads.indexOf(p)} intersects ${seg.id}`)
  for(let n=1;n<=40;n++)for(const g of s.waveDef(n).groups)assert(s.level.def.sources.some(source=>source.id===(g.src??'north')&&source.openWave<=n))
  exact(s)
}
console.log('PASS four fixed connected maps, plot clearance, source timing and save boundary')
for(const id of TOWER_ORDER)for(const branch of [0,1] as const){
  const s=fresh();s.wave=30;s.glow=50000
  const t=s.build(0,id)!;assert(t);assert(s.upgrade(t,0));assert(s.upgrade(t,branch));assert.equal(s.upgradeCost(t,branch===0?1:0),null)
  assert(s.upgrade(t,branch));assert(s.refine(t));assert(!s.refine(t));assert(!s.upgrade(t,branch));exact(s)
}
console.log('PASS every tower and branch has exactly five stages; no crosspaths')
const busy=fresh();busy.glow=1000;busy.build(0,'wick');busy.startWave();busy.step(DT)
assert(!busy.canStartWave());assert.equal(busy.earlyBonus(),0);assert(busy.build(3,'cracker'));assert(busy.upgrade(busy.towers[0],0));assert(!busy.relocate(busy.towers[0],3));assert(busy.relocate(busy.towers[0],6));exact(busy)
const boss=fresh();boss.wave=24;boss.glow=10000;boss.startWave()
for(let i=0;i<2500;i++){boss.step(DT);boss.events=[]}
assert(boss.enemies.some(e=>e.def.id==='gloom'&&!e.shrouded));exact(boss)
assert(boss.enemies.filter(e=>e.def.id==='gloom').every(e=>!e.def.spawn&&!e.def.jams))
console.log('PASS live upgrades, construction and relocation, no overlapping waves, boss split and exact mid-boss resume')

const bond=fresh();bond.wave=5;bond.glow=10000
const bell=bond.build(0,'bell')!,cracker=bond.build(3,'cracker')!
assert(bond.bond(bell,cracker));assert(!bond.bond(bell,cracker));assert.equal(bond.bonds.length,1)
const e=bond.spawnEnemy('shell',bond.level.segs.get('w1')!,400,6)
e.x=270;e.y=350;e.slowT=2;bell.fireT=bond.time;e.shell=100;e.hp=100
bond.damage(e,2,true,cracker);assert.equal(e.shell,92);assert.equal(bond.bonds[0].activations,1)
bond.damage(e,2,true,cracker);assert.equal(e.shell,90);exact(bond)
const malformed=JSON.parse(JSON.stringify(bond.snapshot()));malformed.bonds.push({...malformed.bonds[0]});assert(!validSnapshot(malformed))
console.log('PASS shared-coverage Bonds, single membership, bounded trigger and cooldown persistence')

mkdirSync('artifacts',{recursive:true})
const results:unknown[]=[]
for(const seed of [1047,4099])for(const difficulty of ['relaxed','standard','nightfall'] as const)for(let variant=0;variant<4;variant++)for(const strategy of ['mixed','no-beam','no-garden','no-bonds'] as Strategy[]) {
  if(process.env.FIXED_MODE&&difficulty!==process.env.FIXED_MODE)continue
  const s=new Sim(difficulty,{fixed:1,compact:1,guard:1,depth:1,balance:1,variant},seed)
  runFixed(s,strategy,q=>{
    assert(validSnapshot(q.snapshot()),`valid planning wave ${q.wave}`)
    if(seed===1047&&difficulty==='standard'&&variant===0&&strategy==='mixed'&&[0,15,30,39].includes(q.wave))writeFileSync(`artifacts/fixed-wave-${q.wave}.json`,JSON.stringify(q.snapshot()))
  })
  const row={seed,difficulty,variant,strategy,wave:s.wave,light:s.lives,won:s.won,spent:s.towers.reduce((n,t)=>n+t.spent,0),towers:s.towers.map(t=>`${t.id}:${t.a}:${t.b}:${t.refinement??0}`)};results.push(row);console.log(JSON.stringify(row))
  // Standard supports every tested omission. Nightfall uses the mixed build as
  // its completion gate; the omission runs measure its narrower margin.
  if(!process.env.FIXED_DIAGNOSTIC&&(difficulty!=='nightfall'||strategy==='mixed'))assert(s.won,`${seed} ${difficulty} map ${variant} ${strategy} must remain viable`)
}
for(const c of COMMISSIONS){
  const s=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:c.variant,commission:c.id,blockedPad:c.blockedPad,id:`commission:${c.id}:fixed1`,skirmish:{from:c.from,to:c.to,glow:c.glow,seed:c.seed}})
  assert(validSnapshot(s.snapshot()),'commission snapshot');runFixed(s);assert(s.won,`${c.id} commission remains viable`);results.push({commission:c.id,wave:s.wave,light:s.lives,won:s.won});console.log(`commission ${c.id}: ${s.wave}, ${s.lives} light`)
}
const neglected=fresh();neglected.build(0,'wick')
while(!neglected.over&&neglected.wave<40){assert(neglected.startWave());let steps=0;while(neglected.waveActive&&!neglected.over&&steps++<36000){neglected.step(DT);neglected.events=[]}assert(steps<36000)}
assert(!neglected.won&&neglected.wave<16,'spending and role coverage must matter')
console.log(`PASS neglected defence fails at wave ${neglected.wave}; 96 paid-build runs and three commissions checked`)
writeFileSync('artifacts/fixed-balance.json',JSON.stringify(results,null,2))
