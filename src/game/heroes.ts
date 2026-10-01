import { TOWERS, type TowerDef, type TowerId, type TowerStats } from './defs'

export const HERO_IDS=['sol','mira','ivo'] as const
export type HeroId=typeof HERO_IDS[number]
export const isHero=(value:unknown):value is HeroId=>HERO_IDS.includes(value as HeroId)
interface HeroTower {name:string;trait:string;paths:[string,string]}
interface Hero {name:string;title:string;colour:string;approach:string;tradeoff:string;towers:Record<TowerId,HeroTower>}
export const HEROES:Record<HeroId,Hero>={
  sol:{name:'Sol',title:'The Emberwright',colour:'#ffb46f',approach:'Volley fire, wide explosions and ambitious daylight income.',tradeoff:'Shorter sight and weaker slows make night shelter and careful placement essential.',towers:{
    wick:{name:'Sunspoke',trait:'Extra sparks. Lighter hits and shorter reach.',paths:['Sunburst','Burning Horizon']},
    cracker:{name:'Cinder Kiln',trait:'Wide, heavy blasts. Slower reload.',paths:['Festival Shells','Furnace Rockets']},
    bell:{name:'Forge Gong',trait:'Weakens armour. Gentler slow.',paths:['Tempered Echo','Hammerfall']},
    owl:{name:'Phoenix Roost',trait:'Reveals foes and dives at armour. Shorter reach.',paths:['Firewatch','Ashwing']},
    garden:{name:'Sun Orchard',trait:'Bigger harvests. Less glow from nearby kills.',paths:['Golden Harvest','Firefly Grove']},
    beam:{name:'Heliograph',trait:'Stronger beam. Shorter reach.',paths:['Solar Lens','Twin Suns']},
    storm:{name:'Ember Relay',trait:'Breaks armour. Fewer targets and slower reload.',paths:['Cinder Network','Furnace Arc']},
    ballista:{name:'Dawnlance',trait:'Heavy, burning bolts. Slower reload.',paths:['Sunsteel','Quickfire Winch']},
  }},
  mira:{name:'Mira',title:'The Tidekeeper',colour:'#8ae2cc',approach:'Piercing shots, lasting slows and generous night shelter.',tradeoff:'Lower burst damage and smaller harvests reward overlapping defences.',towers:{
    wick:{name:'Pearl Needle',trait:'Pierces extra foes. Lighter hits.',paths:['Pearl Fan','Undertow']},
    cracker:{name:'Tidal Mortar',trait:'Blasts slow crowds. Lighter damage.',paths:['Foam Burst','Seeking Buoys']},
    bell:{name:'Undertow Chime',trait:'Wider, lasting slows. Slower tolls.',paths:['Deep Current','Stillwater']},
    owl:{name:'Heron Observatory',trait:'Wider sight and night shelter. Weaker attacks.',paths:['Moonwatch','River Wings']},
    garden:{name:'Lotus Conservatory',trait:'Slows nearby foes. Smaller harvests.',paths:['Lotus Harvest','Night Bloom']},
    beam:{name:'Moonwell',trait:'Longer reach. Lighter damage.',paths:['Tidal Lens','Mirror Pools']},
    storm:{name:'Coral Conductor',trait:'Wider chain jumps. Lighter hits.',paths:['Reef Network','Deepwater Charge']},
    ballista:{name:'Harpoon Spire',trait:'Pierces and slows foes. Lighter hits.',paths:['Anchorhead','Tide Winch']},
  }},
  ivo:{name:'Ivo',title:'The Stormcaller',colour:'#bac2ff',approach:'Quick reloads, close formations and branching electrical attacks.',tradeoff:'Shorter reach and smaller individual hits demand reliable control and sight coverage.',towers:{
    wick:{name:'Arc Spindle',trait:'Faster sparks. Lighter hits and shorter reach.',paths:['Spark Array','Long Coil']},
    cracker:{name:'Thunder Drum',trait:'Faster blasts. Smaller bursts.',paths:['Pulse Shells','Storm Rockets']},
    bell:{name:'Static Resonator',trait:'Every fifth toll stuns. Gentler slow.',paths:['Feedback','Blackout']},
    owl:{name:'Kite Aerie',trait:'Reveals foes and boosts nearby fire rate. Shorter reach.',paths:['Signal Mast','Storm Kites']},
    garden:{name:'Charge Grove',trait:'Moths attack from the start. Smaller harvests.',paths:['Stored Current','Spark Moths']},
    beam:{name:'Prism Engine',trait:'Two beams. Lighter damage and shorter reach.',paths:['Prism Rail','Split Spectrum']},
    storm:{name:'Tesla Crown',trait:'Faster arcs hit an extra foe. Lighter hits.',paths:['Branching Charge','Thunderhead']},
    ballista:{name:'Railspire',trait:'Faster heavy bolts. Shorter reach and lighter hits.',paths:['Rail Slug','Accelerator']},
  }},
}

const definitions=new Map<string,TowerDef>()
export function heroTower(id:TowerId,hero?:HeroId):TowerDef{
  if(!hero)return TOWERS[id]
  const key=hero+':'+id,old=definitions.get(key);if(old)return old
  const base=TOWERS[id],kit=HEROES[hero].towers[id]
  const result={...base,name:kit.name,blurb:kit.trait,hue:HEROES[hero].colour,paths:base.paths.map((path,i)=>({...path,name:kit.paths[i]})) as TowerDef['paths']}
  definitions.set(key,result);return result
}

/** Applied after upgrades, so every rank retains its hero's strengths and costs. */
export function heroStats(s:TowerStats,id:TowerId,hero?:HeroId):TowerStats{
  if(hero==='sol')switch(id){
    case 'wick':s.count++;s.damage*=.68;s.range*=.92;s.spread=Math.max(.18,s.spread);break
    case 'cracker':s.splash*=1.22;s.damage*=1.1;s.interval*=1.18;break
    case 'bell':s.brittle=true;s.slow=Math.max(.1,s.slow-.08);break
    case 'owl':s.dive=Math.max(3,s.dive*1.2);s.range*=.92;break
    case 'garden':s.income=Math.round(s.income*1.18);s.lure*=.5;break
    case 'beam':s.damage*=1.18;s.range*=.9;break
    case 'storm':s.heavy=true;s.count=Math.max(2,s.count-1);s.interval*=1.15;break
    case 'ballista':s.damage*=1.22;s.interval*=1.25;s.burn=Math.max(2,s.burn);s.burnDur=Math.max(2,s.burnDur);break
  }
  if(hero==='mira')switch(id){
    case 'wick':s.pierce++;s.damage*=.95;break
    case 'cracker':s.damage*=.95;break
    case 'bell':s.slowDur*=1.35;s.range*=1.08;s.interval*=1.08;break
    case 'owl':s.range*=1.12;s.damage*=.85;s.dive*=.85;break
    case 'garden':s.income=Math.round(s.income*.88);s.gardenSlow=Math.max(.12,s.gardenSlow);break
    case 'beam':s.range*=1.15;s.damage*=.88;break
    case 'storm':s.splash*=1.25;s.damage*=.9;break
    case 'ballista':s.pierce++;s.damage*=.85;break
  }
  if(hero==='ivo')switch(id){
    case 'wick':s.interval*=.78;s.damage*=.92;s.range*=.95;break
    case 'cracker':s.interval*=.78;s.damage*=.94;s.splash*=.9;break
    case 'bell':s.stunEvery=s.stunEvery?Math.min(s.stunEvery,5):5;s.stunDur=Math.max(.25,s.stunDur);s.slow=Math.max(.1,s.slow-.08);break
    case 'owl':s.auraRate=Math.max(.05,s.auraRate);s.range*=.9;break
    case 'garden':s.income=Math.round(s.income*.85);s.mothEvery=s.mothEvery?Math.min(2.4,s.mothEvery):2.4;s.damage=Math.max(1,s.damage);s.detect=true;break
    case 'beam':s.beams=2;s.damage*=.66;s.range*=.92;break
    case 'storm':s.count++;s.interval*=.9;s.damage*=.82;break
    case 'ballista':s.interval*=.76;s.damage*=.82;s.range*=.92;break
  }
  return s
}

/** On-hit control belongs to the water kit, independently of cosmetic projectile colour. */
export function heroHitSlow(hero:HeroId|undefined,id:TowerId){return hero==='mira'&&(id==='cracker'||id==='ballista')?{amount:.18,duration:1.2}:null}
