import assert from 'node:assert/strict'
import { Sim, type Tower, type Enemy } from '../src/game/sim'
import { boardPoint, worldPoint, elevated, boardBounds } from '../src/render/board-view'
import { Renderer } from '../src/render/renderer'

const fresh=(map=0)=>new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant:map},1047)
const s=fresh();s.wave=30;s.glow=50000
for(let i=0;i<s.pads.length;i++)s.unlockPlot(i)
const gun=s.build(0,'wick')!,mortar=s.build(3,'cracker')!,bolt=s.build(4,'ballista')!,scout=s.build(1,'owl')!
const api=s as unknown as {buildGrid():void;pickTarget(t:Tower,r:number,exclude?:Enemy):Enemy|null}
const spawn=(id:Enemy['def']['id'],x:number,y:number,remaining:number)=>{
  const e=s.spawnEnemy(id,s.level.segs.get('w1')!,0,1);e.x=x;e.y=y;e.remaining=remaining;return e
}
const front=spawn('drip',100,100,300),heavy=spawn('shell',300,300,700)
const cluster=[spawn('drip',400,100,800),spawn('drip',405,108,820),spawn('drip',412,115,840)]
const hidden=spawn('veil',160,180,400);api.buildGrid()
gun.priority='last';assert.equal(api.pickTarget(gun,2000),front,'fixed aiming ignores an old manual priority')
assert.equal(api.pickTarget(bolt,2000),heavy,'heavy bolts seek durable targets')
assert.equal(api.pickTarget(mortar,2000),cluster[0],'blasts favour groups instead of one isolated enemy')
assert.equal(api.pickTarget(scout,2000),hidden,'scouts seek unrevealed hidden foes')
assert.notEqual(api.pickTarget(scout,2000,hidden),hidden,'split attacks respect exclusions')
front.remaining=12;assert.equal(api.pickTarget(bolt,2000),front,'an imminent leak overrides value targeting')
front.alive=false;api.buildGrid();assert.notEqual(api.pickTarget(gun,2000),front,'dead enemies cannot be targeted')
s.enemies=[hidden];api.buildGrid();assert.equal(api.pickTarget(gun,2000),null,'ordinary towers cannot acquire hidden enemies')

for(let map=0;map<4;map++)for(const wide of [false,true]){
  const sim=fresh(map),bounds=boardBounds(wide)
  for(const p of [...sim.pads,sim.level.def.home]){
    const projected=boardPoint(p.x,p.y,wide),roundTrip=worldPoint(projected.x,projected.y,wide)
    assert(Math.hypot(roundTrip.x-p.x,roundTrip.y-p.y)<1e-8,'screen picking reverses board projection')
    assert(projected.x>=bounds.x&&projected.x<=bounds.x+bounds.w&&projected.y>=bounds.y&&projected.y<=bounds.y+bounds.h,'all plots and the goal fit')
    const muzzle=elevated(p.x,p.y,100,wide),screenMuzzle=boardPoint(muzzle.x,muzzle.y,wide)
    assert(Math.abs(screenMuzzle.x-projected.x)<1e-8);assert(Math.abs(screenMuzzle.y-projected.y+100)<1e-8,'projectiles meet upright sprites at the same height')
  }
}

// Exercise the production event handler without a browser or audible device.
const renderer=Object.create(Renderer.prototype) as Renderer
const fx=renderer.fx={list:[],density:1,ring(){},flash(){},petals(){},burst(){},text(){}} as unknown as Renderer['fx']
renderer.settings={calmFx:true,reduceMotion:false,shake:false}
Object.assign(renderer,{addBloom(){},fixedLandscape:false})
s.events=[{t:'pop',x:100,y:100,tx:1,ty:0,enemy:'drip',lured:false,family:'amber',boss:false,size:12,reward:4},{t:'income',x:100,y:100,amount:30}]
renderer.handleEvents(s);assert.equal(fx.list.length,0,'defeats and income create no travelling currency particles')
console.log('PASS automatic role targeting, exclusions, hidden enemies, imminent leaks, four-map camera picking and quiet rewards')
