import assert from 'node:assert/strict'
import { Sim } from '../src/game/sim'
import { districtLayout } from '../src/render/district-layout'

for(let variant=0;variant<4;variant++){
  const sim=new Sim('standard',{fixed:1,compact:1,guard:1,depth:1,balance:1,variant,hero:'sol'},1047)
  const before=JSON.stringify(sim.snapshot()),props=districtLayout(sim)
  const houses=props.filter(p=>p.kind==='house'),trees=props.filter(p=>p.kind==='tree')
  assert(houses.length>0&&houses.length<=7,`map ${variant}: restrained but inhabited scenery`)
  assert(trees.length<=10,`map ${variant}: tree budget`)
  for(const prop of props){
    // Projected decorations must not cover any present or future tower or its touch target.
    const left=prop.x-(prop.kind==='house'?26:18),right=prop.x+(prop.kind==='house'?50:36)
    const top=prop.y-(prop.kind==='house'?65:45),bottom=prop.y+18
    for(const pad of sim.pads)assert(right<pad.x-45||left>pad.x+45||bottom<pad.y-120||top>pad.y+36,`map ${variant}: scenery overlaps tower space`)
    for(const seg of sim.level.segs.values())assert(seg.line.distanceTo(prop.x,prop.y)>(prop.kind==='house'?65:46),`map ${variant}: canal banks must stay clear`)
  }
  assert.equal(JSON.stringify(sim.snapshot()),before,'scenery must not consume gameplay randomness or mutate saves')
  console.log(`PASS map ${variant}: ${houses.length} houses, ${trees.length} trees; all 12 tower spaces and routes clear`)
}
