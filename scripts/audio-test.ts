import assert from 'node:assert/strict'
import { Sound,profileSound } from '../src/core/audio'
import { scoreStep,scoreInterval } from '../src/core/watch-score'

// Exercise the scheduler without playing sound or depending on a sound device.
class Param {
  value=0
  values:number[]=[]
  setValueAtTime(v:number){this.value=v;this.values.push(v)}
  setTargetAtTime(v:number){this.setValueAtTime(v)}
  exponentialRampToValueAtTime(v:number){assert(v>0);this.setValueAtTime(v)}
}
class Node {
  gain=new Param();frequency=new Param();detune=new Param();Q=new Param();delayTime=new Param();pan=new Param()
  threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param()
  starts:number[]=[];stops:number[]=[];type='';buffer:unknown;loop=false
  connect<T>(node:T):T{return node}
  disconnect(){}
  start(t=0){this.starts.push(t)}
  stop(t=0){this.stops.push(t)}
}
class Context {
  currentTime=0;sampleRate=8000;state='running';destination=new Node();nodes:Node[]=[]
  private node(){const n=new Node();this.nodes.push(n);return n}
  createDynamicsCompressor(){return this.node()}
  createGain(){return this.node()}
  createDelay(){return this.node()}
  createStereoPanner(){return this.node()}
  createOscillator(){return this.node()}
  createBiquadFilter(){return this.node()}
  createBufferSource(){return this.node()}
  createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)}}
  async resume(){this.state='running'}
  async suspend(){this.state='suspended'}
}
const visibility={hidden:false}
const preferences={muted:false,music:true,effects:true}
assert(profileSound(preferences,true).muted);assert(!preferences.muted);assert(!profileSound(preferences).muted)
assert.equal(profileSound({...preferences,music:false}).music,0);assert(profileSound({...preferences,music:false}).sfx>0)
Object.defineProperty(globalThis,'document',{value:visibility,configurable:true})
Object.defineProperty(globalThis,'window',{value:{AudioContext:Context},configurable:true})
const silent=new Sound();silent.settings.muted=true;silent.unlock();assert.equal(silent.ctx,null)
const sound=new Sound();sound.unlock();const ctx=sound.ctx as unknown as Context
const noBeam=ctx.nodes.length;sound.beam(0);assert.equal(ctx.nodes.length,noBeam,'idle menus do not start a beam oscillator')
const ambience=ctx.nodes.length;sound.tick(.016,0);assert(ctx.nodes.length>ambience,'title screen starts a composed melody')
const first=ctx.nodes.length;sound.tick(.016,0);assert.equal(ctx.nodes.length,first,'same frame cannot duplicate notes')
for(let i=0;i<10;i++){ctx.currentTime+=.1;sound.tick(.1,.5)}
assert(ctx.nodes.length>first,'notes continue through rests in the first phrase')
ctx.currentTime=100;const beforeResume=ctx.nodes.length;sound.tick(.016,0);assert(ctx.nodes.length-beforeResume<60,'a stalled frame never replays a music backlog')
const dayNotes=ctx.nodes.flatMap(n=>n.frequency.values)
const duskStart=ctx.nodes.length
for(let i=0;i<40;i++){ctx.currentTime+=.21;sound.tick(.21,0,{night:true,weather:'rain'})}
const nightNotes=ctx.nodes.slice(duskStart).flatMap(n=>n.frequency.values)
assert(nightNotes.length>0);assert.notDeepEqual(nightNotes,dayNotes,'dusk changes the arrangement')
ctx.currentTime+=1;const effectStart=ctx.nodes.length;sound.spark();assert(ctx.nodes.length>effectStart,'the first shot is audible')
const once=ctx.nodes.length;sound.spark();assert.equal(ctx.nodes.length,once,'rapid fire remains capped')
sound.impact();sound.zap();sound.bolt();assert(ctx.nodes.length>once)
sound.settings.muted=true;sound.applySettings();const muted=ctx.nodes.length
sound.tick(.1,1);sound.spark();sound.upgrade();sound.waveStart();assert.equal(ctx.nodes.length,muted,'mute schedules no new notes or effects')
sound.settings.muted=false;visibility.hidden=true
sound.tick(.1,1);sound.build();sound.spark();assert.equal(ctx.nodes.length,muted,'background tabs stay silent')
sound.suspend();assert.equal(ctx.state,'suspended');sound.unlock();assert.equal(ctx.state,'suspended','hidden gesture cannot resume audio')
visibility.hidden=false;sound.unlock();assert.equal(ctx.state,'running','visible gesture restores sound')
for(const kind of ['shell','wisp','drip']){ctx.currentTime+=1;const before=ctx.nodes.length;sound.creaturePop(kind);assert(ctx.nodes.length>before,'each material has a defeat sound');const once=ctx.nodes.length;sound.creaturePop(kind);assert.equal(ctx.nodes.length,once,'defeat cues share a rate cap')}
visibility.hidden=true;const quiet=ctx.nodes.length;sound.creaturePop('warden',3);assert.equal(ctx.nodes.length,quiet,'new material sounds respect background silence');visibility.hidden=false
sound.settings.music=0;ctx.currentTime=200;const noMusic=ctx.nodes.length;sound.tick(.1,0);assert.equal(ctx.nodes.length,noMusic,'soundtrack can be disabled independently')
console.log('PASS title music, audio-clock timing, day/night arrangements, first-shot feedback, rate caps, mute and background suspension')

const scene={night:false,weather:'clear' as const,hero:'sol' as const,wave:1,playing:true}
const phrase=(from:number,overrides={})=>Array.from({length:128},(_,i)=>scoreStep(from+i,{...scene,...overrides},.6))
assert.notDeepEqual(phrase(0),phrase(0,{overture:true}),'expedition mastery adds an original answering line')
assert.notDeepEqual(phrase(0),phrase(128),'the answer differs from the opening')
assert.notDeepEqual(phrase(0),phrase(256),'the bridge changes register and texture')
assert.notDeepEqual(phrase(0),phrase(512),'the second pass varies the melody')
assert.notDeepEqual(phrase(0),phrase(0,{hero:'mira'}),'hero melodies differ')
assert.notDeepEqual(phrase(0),phrase(0,{hero:'ivo'}),'Ivo has a distinct part')
assert.notDeepEqual(phrase(0),phrase(0,{night:true}),'night switches instrumentation')
assert.notDeepEqual(phrase(0),phrase(0,{wave:30}),'later chapters add accompaniment')
assert.notDeepEqual(phrase(0),phrase(0,{boss:true}),'bosses add a pulse and bass response')
assert(scoreInterval({...scene,boss:true})<scoreInterval(scene))
for(const hero of ['sol','mira','ivo'] as const)for(const night of [false,true])for(let i=0;i<1024;i++){
  const notes=scoreStep(i,{...scene,hero,night,wave:35,boss:true},1)
  assert(notes.length<=8,'bounded simultaneous voices')
  for(const n of notes){assert(n.gain>0&&n.gain<=.15);assert(n.length>0&&n.length<=4);assert(n.pan>=-1&&n.pan<=1)}
}
console.log('PASS original 32-bar form, second-pass variations, three hero parts, chapter layers and boss pulse')
