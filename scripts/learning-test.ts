import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {siegeChallenge} from '../src/game/siege'
import {PreparationHistory,teachingPlot,reserveWarning} from '../src/game/watch-learning'
import {recordBreach,waveDiagnosis} from '../src/game/wave-diagnosis'
import {recoveryPlan} from '../src/game/watch-coach'
import {validSnapshot} from '../src/game/save-store'
import {earnedRestoration,RESTORATIONS} from '../src/game/restoration'

function clearWave(s:Sim){assert(s.startWave());let ticks=0;while(s.waveActive&&!s.over&&ticks++<18000)s.step(DT);assert(ticks<18000);assert(!s.over)}
let s=new Sim('standard',siegeChallenge('sol',542),542)
assert(s.build(0,'wick'));clearWave(s)
assert.equal(Math.floor(s.glow),322)
const history=new PreparationHistory(),before=history.capture(s),budget=s.glow
assert.match(reserveWarning(s,209),/Leaves 113 glow.*Chime costs 150/)
assert(s.specialise(s.towers[0],0));history.commit(before,s)
assert.equal(Math.floor(s.glow),113);assert.equal(history.size,1)
const undo=history.take(s)!;assert(validSnapshot(undo));s=Sim.restore(undo)
assert.equal(s.glow,budget);assert.equal(s.towers[0].a,0);assert.equal(s.towers[0].b,0)
const chime=teachingPlot(s,'bell');assert(chime&&chime.shared>0&&s.padAvailable(chime.index))
assert(s.build(chime.index,'bell'));assert.equal(reserveWarning(s,209),'')
clearWave(s)
const blast=teachingPlot(s,'cracker');assert(blast&&blast.shared>0)
assert(s.build(blast.index,'cracker'));clearWave(s)
console.log(`PASS guided paid opening: wave ${s.wave}, ${s.lives} light, ${Math.floor(s.glow)} glow`)
assert.equal(s.finalWave,40)
assert.equal(s.relocationCost(),0)
const destination=s.pads.findIndex((p,i)=>!p.tower&&s.padAvailable(i));assert(destination>=0)
const cash=s.glow;assert(s.relocate(s.towers[0],destination));assert.equal(s.glow,cash);assert.equal(s.relocationCost(),25)
assert(validSnapshot(s.snapshot()));assert.equal(Sim.restore(s.snapshot()).relocationCost(),25)
const old=new Sim('standard',{...siegeChallenge('sol'),siege:1});assert.equal(old.relocationCost(),25)
const hard=new Sim('nightfall',siegeChallenge('sol'));assert.equal(hard.relocationCost(),25)
history.commit(history.capture(s),s);assert.equal(history.size,0,'No-op has no undo')
const prep=history.capture(s),count=s.towers.length;s.sell(s.towers[0]);assert.equal(s.towers.length,count-1);history.commit(prep,s)
assert(history.size);s.startWave();assert.equal(history.take(s),null,'Combat is never undone')

const evidence=new Sim('standard',siegeChallenge('sol'));evidence.wave=3
evidence.waveReports=[{wave:3,damage:{},slowSplashHits:0}]
const armour={enemy:'shell' as const,wave:3,light:2,hidden:false,armoured:true,route:''}
recordBreach(evidence.waveReports[0],armour,2);recordBreach(evidence.waveReports[0],armour,2)
evidence.lastLeak={enemy:'drip',wave:3,light:1,hidden:false,armoured:false,route:''}
recordBreach(evidence.waveReports[0],evidence.lastLeak,1)
const diagnosis=waveDiagnosis(evidence)!;assert.equal(diagnosis.total,5);assert.equal(diagnosis.enemy,'shell');assert.equal(diagnosis.cause,'armour')
const snapshot=evidence.snapshot();assert(validSnapshot(snapshot));assert.deepEqual(waveDiagnosis(Sim.restore(snapshot)),diagnosis)
evidence.waveReports[0].escaped!.shell=9;assert.equal(snapshot.waveReports![0].escaped!.shell,4,'Snapshot evidence owns its data')
const invalid=structuredClone(snapshot);invalid.waveReports![0].escaped!.shell=-1;assert(!validSnapshot(invalid))
const checkpoint=new Sim('standard',siegeChallenge('sol'));checkpoint.wave=2
let advice=recoveryPlan(checkpoint,evidence.lastLeak,Sim.restore(snapshot))!;assert.equal(advice.tower,'cracker');assert(advice.canBuy);assert(advice.plot!==undefined)
checkpoint.glow=0;advice=recoveryPlan(checkpoint,evidence.lastLeak,evidence)!;assert(!advice.canBuy);assert.equal(advice.plot,undefined);assert.match(advice.budget,/you have 0/)
checkpoint.wave=0;advice=recoveryPlan(checkpoint,evidence.lastLeak,evidence)!;assert.match(advice.budget,/opens at wave 3/)

const city=new Sim('standard',siegeChallenge('sol'));city.build(0,'wick');city.wave=4;city.startWave()
assert.equal(earnedRestoration(city,'market'),0);city.spawners=[];city.enemies=[];city.wavesPending.clear();assert.equal(earnedRestoration(city,'market'),1)
for(const [wave,id,stage] of [[8,'market',2],[16,'observatory',1],[24,'observatory',2],[32,'gardens',2],[40,'gardens',3]] as const){city.wave=wave;assert.equal(earnedRestoration(city,id),stage);assert(RESTORATIONS[wave])}
console.log('PASS full-value preparation undo, real shared coverage, limited free move, legacy costs, saved whole-wave evidence, affordable recovery and earned restoration')
