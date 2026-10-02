import type { Difficulty, TowerId } from './defs'
import type { HeroId } from './heroes'
import type { WaveDef } from './waves'

/** New campaigns/expeditions opt in. Published saves and weekly seeds retain their rules. */
export const REFINEMENT_RULES=1 as const
export const restorationLimit=(difficulty:Difficulty)=>difficulty==='relaxed'?12:difficulty==='nightfall'?3:6
export const lateRewardScale=(wave:number,short:boolean)=>short?1:1-Math.min(.12,Math.max(0,wave-15)*.006)
export const lateUpgradeScale=(stage:number,short:boolean)=>stage<2?1:short?1.06:1.12

export const HERO_BUILDS:Record<HeroId,readonly {name:string;tip:string;tradeoff:string;pair:string;branches:Partial<Record<TowerId,0|1>>}[]>={
  sol:[
    {name:'Wildfire',tip:'Pair guided rockets with heavy bolts.',tradeoff:'Needs heavy support against shells.',pair:'00',branches:{cracker:1,bell:0,beam:0,storm:0,ballista:0}},
    {name:'Ignition',tip:'Pair fire with heavy bolts.',tradeoff:'Fewer shots to catch loose runners.',pair:'11',branches:{cracker:1,bell:0,beam:1,storm:1,ballista:0}},
  ],
  mira:[
    {name:'Still tide',tip:'Pair freezing chimes with blasts.',tradeoff:'Longer chime reloads.',pair:'00',branches:{cracker:0,bell:0,beam:0,storm:0,ballista:0}},
    {name:'Undertow',tip:'Pair wide chimes with beams.',tradeoff:'Bosses cannot be pushed.',pair:'11',branches:{cracker:0,bell:1,beam:0,storm:1,ballista:1}},
  ],
  ivo:[
    {name:'Chainworks',tip:'Pair long arcs with heavy bolts.',tradeoff:'Each strike is lighter.',pair:'00',branches:{cracker:0,bell:0,beam:0,storm:0,ballista:0}},
    {name:'Capacitor',tip:'Pair heavy arcs with chimes.',tradeoff:'Shorter chains and a slower reload.',pair:'11',branches:{cracker:0,bell:1,beam:0,storm:1,ballista:0}},
  ],
}

/** Hand-timed set pieces use known enemies and existing fixed entrances. */
export function refinedWave(base:WaveDef,n:number,short=false):WaveDef{
  const groups=base.groups.map(g=>({...g}))
  if(n===1)return {...base,note:'Build beside the upper bend. Watch how long enemies stay in reach.'}
  if(n===3)return {...base,note:'Fast fins are coming. Place a chime beside your damage towers.'}
  if(n===4&&!short)return {...base,note:'Choose a tower specialisation. Its new weapon changes how it fights.'}
  if(n===(short?6:18)){
    let lead=groups.find(g=>g.type==='shell'||g.type==='vshell')
    if(!lead){lead={type:'shell',count:3,gap:1.5,at:0,src:'north'};groups.push(lead)}
    lead.at=0;lead.gap=1.5
    for(const g of groups)if(g!==lead)g.at=Math.max(5,g.at)
    const healer=groups.find(g=>g.type==='mender')
    if(healer){healer.src=lead.src;healer.at=2;healer.count=Math.min(2,healer.count)}
    else groups.push({type:'mender',count:1,gap:1,at:2,src:lead.src})
    return {...base,groups,encounter:'The glass procession',note:'Break the leading shells to uncover the Bloom Jelly.'}
  }
  if(n===(short?9:23)){
    for(const g of groups){if(['shell','vshell','bloat'].includes(g.type)){g.at=0;g.gap=Math.max(1,g.gap)}else{g.at+=6;g.gap*=.88}}
    return {...base,groups,encounter:'The second wake',note:'A slow front, then a fast wake. Keep a chime near the lower bend.'}
  }
  if(!short&&n===28){
    for(const [i,g]of groups.entries()){g.at=i%2?8:0;g.gap=Math.max(.22,g.gap*.75)}
    return {...base,groups,encounter:'Lantern migration',note:'Two close arrivals, eight seconds apart. Spread your blast coverage.'}
  }
  if(!short&&[19,24,29,36].includes(n)){
    // Thin the total formation: rounding each small group separately erased the reduction.
    let remove=Math.floor(groups.reduce((sum,g)=>sum+g.count,0)*.12)
    while(remove-->0){const largest=[...groups].sort((a,b)=>b.count-a.count)[0];if(!largest||largest.count<=1)break;largest.count--}
    return {...base,groups,encounter:'Calm water',note:'A lighter crossing. Prepare your next specialist.'}
  }
  return base
}
