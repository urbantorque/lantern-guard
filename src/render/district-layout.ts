import type { Sim } from '../game/sim'

export interface DistrictProp { x:number; y:number; kind:'house'|'tree'; style:number }
const layouts=new WeakMap<Sim['level'],readonly DistrictProp[]>()

/** Reserve the full tower silhouette, including plots revealed later in the watch. */
export function sceneryClear(s:Sim,x:number,y:number,r:number){
  return Math.hypot(s.level.def.home.x-x,s.level.def.home.y-y)>r+100
    && s.pads.every(p=>Math.abs(p.x-x)>r+70||y<p.y-145-r||y>p.y+72+r)
    && [...s.level.segs.values()].every(seg=>seg.line.distanceTo(x,y)>r+42)
}

/** Small authored edge clusters leave the playable centre open on every waterway. */
export function districtLayout(s:Sim):readonly DistrictProp[]{
  const cached=layouts.get(s.level);if(cached)return cached
  const props:DistrictProp[]=[]
  const houses=[[575,106],[642,145],[590,222],[66,121],[62,570],[120,661],[68,754],[641,468],[635,610],[70,290],[538,57],[163,100]]
  for(const [x,y] of houses){
    if(props.length>=7)break
    if(sceneryClear(s,x,y,40)&&props.every(p=>Math.hypot(p.x-x,p.y-y)>82))props.push({x,y,kind:'house',style:props.length%5})
  }
  const trees=[[46,37],[115,54],[690,58],[676,239],[40,212],[683,355],[34,643],[134,736],[645,827],[80,819],[181,174],[538,315],[685,680],[30,520],[499,36],[175,806]]
  let count=0
  for(const [x,y] of trees){
    if(count>=10)break
    if(sceneryClear(s,x,y,16)&&props.every(p=>Math.hypot(p.x-x,p.y-y)>(p.kind==='house'?58:40))){props.push({x,y,kind:'tree',style:count%3});count++}
  }
  props.sort((a,b)=>a.y-b.y);layouts.set(s.level,props);return props
}
