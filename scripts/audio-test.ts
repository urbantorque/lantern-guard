import assert from 'node:assert/strict'
import { Sound,profileSound } from '../src/core/audio'

// Exercise the scheduler without playing sound or depending on a sound device.
class Param {
  value=0
  values:number[]=[]
  setValueAtTime(v:number){this.value=v;this.values.push(v)}
  setTargetAtTime(v:number){this.setValueAtTime(v)}
  exponentialRampToValueAtTime(v:number){assert(v>0);this.setValueAtTime(v)}
}
class Node {
  gain=new Param();frequency=new Param();detune=new Param();Q=new Param();delayTime=new Param()
  threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param()
  starts:number[]=[];stops:number[]=[];type='';buffer:unknown;loop=false
  connect<T>(node:T):T{return node}
  start(t=0){this.starts.push(t)}
  stop(t=0){this.stops.push(t)}
}
class Context {
  currentTime=0;sampleRate=8000;state='running';destination=new Node();nodes:Node[]=[]
  private node(){const n=new Node();this.nodes.push(n);return n}
  createDynamicsCompressor(){return this.node()}
  createGain(){return this.node()}
  createDelay(){return this.node()}
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
ctx.currentTime=.35;sound.tick(.016,.5);assert(ctx.nodes.length>first)
ctx.currentTime=100;const beforeResume=ctx.nodes.length;sound.tick(.016,0);assert(ctx.nodes.length-beforeResume<25,'a stalled frame never replays a music backlog')
const dayNotes=ctx.nodes.flatMap(n=>n.frequency.values)
const duskStart=ctx.nodes.length;sound.tick(.016,0,{night:true,weather:'rain'})
const nightNotes=ctx.nodes.slice(duskStart).flatMap(n=>n.frequency.values)
assert(nightNotes.length>0);assert.notDeepEqual(nightNotes,dayNotes,'dusk changes the arrangement')
ctx.currentTime=101;const effectStart=ctx.nodes.length;sound.spark();assert(ctx.nodes.length>effectStart,'the first shot is audible')
const once=ctx.nodes.length;sound.spark();assert.equal(ctx.nodes.length,once,'rapid fire remains capped')
sound.impact();sound.zap();sound.bolt();assert(ctx.nodes.length>once)
sound.settings.muted=true;sound.applySettings();const muted=ctx.nodes.length
sound.tick(.1,1);sound.spark();sound.upgrade();sound.waveStart();assert.equal(ctx.nodes.length,muted,'mute schedules no new notes or effects')
sound.settings.muted=false;visibility.hidden=true
sound.tick(.1,1);sound.build();sound.spark();assert.equal(ctx.nodes.length,muted,'background tabs stay silent')
sound.suspend();assert.equal(ctx.state,'suspended');sound.unlock();assert.equal(ctx.state,'suspended','hidden gesture cannot resume audio')
visibility.hidden=false;sound.unlock();assert.equal(ctx.state,'running','visible gesture restores sound')
sound.settings.music=0;ctx.currentTime=200;const noMusic=ctx.nodes.length;sound.tick(.1,0);assert.equal(ctx.nodes.length,noMusic,'soundtrack can be disabled independently')
console.log('PASS title music, audio-clock timing, day/night arrangements, first-shot feedback, rate caps, mute and background suspension')
