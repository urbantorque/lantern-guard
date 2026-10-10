import assert from 'node:assert/strict'
import {battlePaused,forecastWave,preparationSummary} from '../src/game/watch-clarity'
import {Sim} from '../src/game/sim'
import {siegeChallenge} from '../src/game/siege'
for(const panel of ['menu','settings','forecast','bestiary','surge-help','district'])assert(battlePaused(false,panel))
for(const panel of ['','tower','build','placement','plot']){assert(!battlePaused(false,panel));assert(battlePaused(true,panel))}
const s=new Sim('standard',siegeChallenge());assert.equal(forecastWave(s),1);assert(preparationSummary(s).includes('Spark'))
s.wave=17;assert.equal(forecastWave(s),18);assert.equal(forecastWave(s,true),17)
s.wave=40;assert.equal(forecastWave(s),40);assert.equal(forecastWave(s,true),40)
const short={wave:12,waveOffset:10,finalWave:16};assert.equal(forecastWave(short),13);assert.equal(forecastWave(short,true),12)
console.log('PASS planning and forecast boundaries')
