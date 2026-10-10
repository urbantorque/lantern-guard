import assert from 'node:assert/strict'
import { Sim } from '../src/game/sim'
import { loadVillage,loadWatch,saveWatch,recordWatch,loadPlanning,writeJSON } from '../src/game/fixed-store'
import { validSnapshot } from '../src/game/save-store'

class MemoryStorage implements Storage {
  data=new Map<string,string>();fail=false
  get length(){return this.data.size}
  getItem(k:string){return this.data.get(k)??null}
  setItem(k:string,v:string){if(this.fail)throw Error('quota');this.data.set(k,v)}
  removeItem(k:string){this.data.delete(k)}
  key(n:number){return [...this.data.keys()][n]??null}
  clear(){this.data.clear()}
}
const storage=new MemoryStorage()
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true})
const fresh=()=>new Sim('standard',{fixed:1,compact:1,depth:1,guard:1,balance:1,variant:0},775)
const s=fresh()
storage.setItem('lanternlocks.run.v3','original legacy run')
storage.setItem('lanternlocks.progress.v1','original achievements')
storage.setItem('lanternlocks.settings.v1',JSON.stringify({v:2,muted:true,bigText:true,palette:'clear',reduceMotion:true,guardian:'reed'}))
assert.deepEqual(loadVillage().settings,{muted:true,largeText:true,clearPalette:true,reducedMotion:true,music:true,effects:true,ambience:true})
assert.equal(loadVillage().guardian,'reed')
assert(saveWatch(s,[],'campaign'));s.build(0,'wick');assert(saveWatch(s,[],'campaign'))
assert.equal(loadWatch('campaign')!.snapshot.towers.length,1)
storage.setItem('lanternlocks.fixed1.campaign','broken json')
assert.equal(loadWatch('campaign')!.snapshot.towers.length,0)
assert(saveWatch(s,[],'campaign'))
storage.fail=true;s.glow=81;assert(!saveWatch(s,[],'campaign'));storage.fail=false
assert.equal(loadWatch('campaign')!.snapshot.glow,290)
assert.equal(storage.getItem('lanternlocks.run.v3'),'original legacy run')
assert.equal(storage.getItem('lanternlocks.progress.v1'),'original achievements')
console.log('PASS corrupt primary recovery, failed-write recovery and untouched legacy profile/run')

const profile=loadVillage();s.wave=5;s.stats.cheered={drip:20};recordWatch(profile,s)
const oldSettings={...profile.settings} as Partial<typeof profile.settings>;delete oldSettings.ambience;oldSettings.music=false
writeJSON('profile',{...profile,settings:oldSettings});assert.equal(loadVillage().settings.ambience,false,'old atmosphere-off preference survives migration');assert.equal(loadVillage().records['0:standard:standard'].wave,5)
writeJSON('profile',{...profile,settings:{...profile.settings,music:false,ambience:true}});assert.equal(loadVillage().settings.ambience,true,'new independent preference survives reload');writeJSON('profile',profile)
recordWatch(profile,s);assert.equal(profile.journal.drip,20);assert.equal(profile.settlement,1)
s.stats.cheered.drip=10;recordWatch(profile,s);assert.equal(profile.journal.drip,20)
s.stats.cheered.drip=25;recordWatch(profile,s);assert.equal(profile.journal.drip,25)
s.challenge.practice=true;recordWatch(profile,s)
assert(profile.records['0:standard:standard']);assert(profile.records['0:standard:practice'])
assert.equal(loadVillage().journal.drip,25)
writeJSON('campaign.planning',s.snapshot());assert(loadPlanning('campaign'))
const active=fresh();active.startWave();writeJSON('campaign.planning',active.snapshot());assert.equal(loadPlanning('campaign'),null)
const bad=structuredClone(s.snapshot());bad.challenge.practice='yes' as never;assert(!validSnapshot(bad))
writeJSON('profile',{...profile,journal:{unknown:99}});assert.deepEqual(loadVillage().journal,{})
console.log('PASS idempotent journal, cosmetic milestones, separate practice records and checkpoint validation')
