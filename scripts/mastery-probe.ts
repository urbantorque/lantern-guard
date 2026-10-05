import {Sim,DT,type Challenge} from '../src/game/sim'
import {HERO_BUILDS} from '../src/game/watch-refinement'
import {techniqueOffers} from '../src/game/watch-craft'
import {planFixed} from './fixed-bot'
const rules:Challenge={fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,hero:'ivo',variant:3}
for(const [buildIndex,build] of HERO_BUILDS.ivo.entries())for(const variant of [1,3]){
 const s=new Sim('standard',{...rules,variant},1047)
 while(!s.over&&s.wave<40){planFixed(s,'mixed',build.branches);const offers=techniqueOffers(s);if(offers.length)s.chooseTechnique(offers[buildIndex].id);s.startWave();let steps=0,last=s.stats.leaked
 while(s.waveActive&&!s.over&&steps++<36000){s.step(DT);if(s.stats.leaked>last){console.log(build.name,variant,s.wave,JSON.stringify(s.lastLeak));last=s.stats.leaked}s.events=[];if(steps%480===0)planFixed(s,'mixed',build.branches)}
 }
 console.log(build.name,variant,'TOTAL',s.stats.leaked)
}
