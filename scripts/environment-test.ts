import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Sim, DT, type SaveSnapshotV2 } from '../src/game/sim'
import { validSnapshot } from '../src/game/save-store'
import { skyAt,weatherAt,skyReach,skyDamage,skyRate,skySpeed,gardenYield,clockText,DAY_SECONDS,NIGHT_SECONDS,WEATHER_SECONDS } from '../src/game/environment'
import { runFixed } from './fixed-bot'

const fresh=(variant=0,seed=1047)=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant},seed)
const near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-6,`${a} ~= ${b}`)
const cycle=DAY_SECONDS+NIGHT_SECONDS
assert(!skyAt(DAY_SECONDS-.001,1).night);assert(skyAt(DAY_SECONDS,1).night);assert(!skyAt(cycle,1).night)
assert.equal(skyAt(cycle,1).cycle,2);assert.equal(clockText(100),'1:40')
assert.equal(skyAt(WEATHER_SECONDS-.001,1047).nextWeather,skyAt(WEATHER_SECONDS,1047).weather)
assert.deepEqual(Array.from({length:100},(_,i)=>weatherAt(1047,i)),Array.from({length:100},(_,i)=>weatherAt(1047,i)))
assert(new Set(Array.from({length:100},(_,i)=>weatherAt(1047,i))).size===4)
assert(Array.from({length:10},(_,i)=>weatherAt(1047,i)).some((w,i)=>w!==weatherAt(4099,i)))
const day={...skyAt(0,1047),weather:'clear' as const},night={...skyAt(DAY_SECONDS,1047),weather:'clear' as const}
near(gardenYield(day),1.4);near(gardenYield(night),.55)
near((DAY_SECONDS*gardenYield(day)+NIGHT_SECONDS*gardenYield(night))/cycle,184/180)
near(skyReach('ballista',day,false),1.12);near(skyReach('ballista',night,false),.85)
near(skyReach('ballista',night,true),1);near(skyReach('wick',night,false),1)
near(skyDamage('beam',night),1.12);near(skyRate('wick',night),1.12);near(skySpeed(night),1.08)
near(skyReach('cracker',{...night,weather:'mist'},false),.85*.96)
near(skyDamage('storm',{...night,weather:'rain'}),1.08)
console.log('PASS exact day/night boundaries, seeded forecast and bounded weather effects')

const s=fresh();for(let i=0;i<600;i++)s.step(DT);assert.equal(s.climate.elapsed,0)
s.wave=30;s.glow=20000;s.climate.elapsed=DAY_SECONDS-.01
if(!s.padAvailable(1))assert(s.unlockPlot(1))
const wick=s.build(0,'wick')!,cracker=s.build(1,'cracker')!;s.build(3,'owl')
assert(s.sheltered(wick));assert(!s.sheltered(cracker))
s.startWave();s.step(DT);assert(s.sky.night)
const snap:SaveSnapshotV2=JSON.parse(JSON.stringify(s.snapshot()));assert(validSnapshot(snap))
const restored=Sim.restore(snap)
for(let i=0;i<1000;i++){s.step(DT);restored.step(DT);s.events=[];restored.events=[]}
assert.deepEqual(s.snapshot(),restored.snapshot())
assert.deepEqual(s.sky,restored.sky)
const planning=fresh();planning.wave=10;planning.glow=10000;planning.build(0,'garden')
const before=planning.glow;for(let i=0;i<1000;i++)planning.step(DT)
assert.equal(planning.glow,before);assert.equal(planning.climate.gardenExposure,0)
const invalid=structuredClone(snap);invalid.climate!.gardenExposure=invalid.climate!.waveSeconds*5;assert(!validSnapshot(invalid))
console.log('PASS paused/planning clock freeze, no idle farming, persisted harvest exposure and exact transition resume')

// A controlled one-second wave spends half its time in each light condition.
const harvest=fresh();harvest.wave=10;harvest.glow=10000;const garden=harvest.build(0,'garden')!
harvest.startWave();harvest.spawners=[];harvest.enemies=[]
harvest.climate={elapsed:DAY_SECONDS+.5,waveSeconds:1,gardenExposure:(1.4+.55)/2}
const saved=harvest.snapshot();assert(validSnapshot(saved));const harvestRestored=Sim.restore(saved)
harvest.step(DT);harvestRestored.step(DT)
assert.equal(garden.earned,Math.round(garden.stats.income*.975));assert.deepEqual(harvest.snapshot(),harvestRestored.snapshot())
const noWeather={...night,weather:'clear' as const}
assert(skyDamage('storm',{...night,weather:'rain'})/skyDamage('storm',noWeather)<1.1)
console.log('PASS time-weighted Garden payout across dusk, including a save before payment')

mkdirSync('artifacts',{recursive:true})
const rows=[]
for(const seed of [1047,4099])for(let variant=0;variant<4;variant++)for(const strategy of ['mixed','greedy'] as const){
  const sim=fresh(variant,seed);runFixed(sim,strategy)
  const row={seed,variant,strategy,wave:sim.wave,light:sim.lives,won:sim.won,combatSeconds:Math.round(sim.climate.elapsed),cycles:sim.sky.cycle,gardenEarned:Math.round(sim.towers.filter(t=>t.id==='garden').reduce((n,t)=>n+t.earned,0))}
  rows.push(row);console.log(JSON.stringify(row))
}
const mixed=rows.filter(r=>r.strategy==='mixed'),greedy=rows.filter(r=>r.strategy==='greedy')
assert(mixed.every(r=>r.won),'balanced standard strategy survives both tested forecasts on all maps')
assert(mixed.reduce((n,r)=>n+r.light,0)>=greedy.reduce((n,r)=>n+r.light,0),'early two-Garden greed must not dominate a balanced defence')
writeFileSync('artifacts/environment-balance.json',JSON.stringify(rows,null,2))
