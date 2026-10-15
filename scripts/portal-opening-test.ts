import assert from 'node:assert/strict'
import {Sim,DT} from '../src/game/sim'
import {siegeChallenge} from '../src/game/siege'
// The portal's suggested first purchase must be a viable start without coaching or extra money.
for(const seed of [1047,27041,90173]){
 const s=new Sim('standard',siegeChallenge('sol',seed),seed),budget=s.glow
 assert(s.build(0,'wick'));assert(s.glow<budget);s.startWave()
 let steps=0;while(s.waveActive&&!s.over&&steps++<18000)s.step(DT)
 assert(!s.over&&s.wave===1&&!s.waveActive,'One suggested Spark survives the first wave')
 assert.equal(s.lives,25,'The recommended opening keeps all light')
 assert.equal(s.finalWave,40);console.log(`PASS suggested portal opening ${seed}: ${s.lives} light, ${Math.floor(s.glow)} glow, 40-wave campaign`)
}
