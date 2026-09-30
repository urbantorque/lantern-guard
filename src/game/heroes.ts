import { TOWERS, type TowerDef, type TowerId, type TowerStats } from './defs'

export const HERO_IDS=['sol','mira','ivo'] as const
export type HeroId=typeof HERO_IDS[number]
export const isHero=(value:unknown):value is HeroId=>HERO_IDS.includes(value as HeroId)
interface HeroTower {name:string;trait:string;paths:[string,string]}
interface Hero {name:string;title:string;colour:string;approach:string;tradeoff:string;towers:Record<TowerId,HeroTower>}
export const HEROES:Record<HeroId,Hero>={
  sol:{name:'Sol',title:'The Emberwright',colour:'#ffb46f',approach:'Volley fire, wide explosions and ambitious daylight income.',tradeoff:'Shorter sight and weaker slows make night shelter and careful placement essential.',towers:{
    wick:{name:'Sunspoke',trait:'Extra sparks cover a crowd. Each spark hits softer and has shorter reach.',paths:['Sunburst','Burning Horizon']},
    cracker:{name:'Cinder Kiln',trait:'Wide, heavy explosions. Takes longer to reload.',paths:['Festival Shells','Furnace Rockets']},
    bell:{name:'Forge Gong',trait:'Weakens armour for nearby attackers. Its slow is gentler.',paths:['Tempered Echo','Hammerfall']},
    owl:{name:'Phoenix Roost',trait:'Reveals hidden enemies and dives at armour. Needs a closer position.',paths:['Firewatch','Ashwing']},
    garden:{name:'Sun Orchard',trait:'Bigger harvests, especially by day. Earns less from nearby defeats.',paths:['Golden Harvest','Firefly Grove']},
    beam:{name:'Heliograph',trait:'A fierce beam for tough enemies. Works best on a close bend.',paths:['Solar Lens','Twin Suns']},
    storm:{name:'Ember Relay',trait:'Lightning breaks armour. Reaches fewer enemies and reloads slowly.',paths:['Cinder Network','Furnace Arc']},
    ballista:{name:'Dawnlance',trait:'Heavy bolts leave a burning wound. Long pauses between shots.',paths:['Sunsteel','Quickfire Winch']},
  }},
  mira:{name:'Mira',title:'The Tidekeeper',colour:'#8ae2cc',approach:'Piercing shots, lasting slows and generous night shelter.',tradeoff:'Lower burst damage and smaller harvests reward overlapping defences.',towers:{
    wick:{name:'Pearl Needle',trait:'Shots pass through extra enemies. Softer hits reward lining up a crowd.',paths:['Pearl Fan','Undertow']},
    cracker:{name:'Tidal Mortar',trait:'Explosions slow a crowd. Deals less direct damage.',paths:['Foam Burst','Seeking Buoys']},
    bell:{name:'Undertow Chime',trait:'Long-lasting slows cover a wide area. Tolls less often.',paths:['Deep Current','Stillwater']},
    owl:{name:'Heron Observatory',trait:'Wide sight reveals enemies and shelters towers at night. Weaker attacks.',paths:['Moonwatch','River Wings']},
    garden:{name:'Lotus Conservatory',trait:'Slows nearby enemies while it earns glow. Smaller harvests.',paths:['Lotus Harvest','Night Bloom']},
    beam:{name:'Moonwell',trait:'A long-reaching beam that holds distant bends. Less damage up close.',paths:['Tidal Lens','Mirror Pools']},
    storm:{name:'Coral Conductor',trait:'Lightning jumps across wider gaps. Each hit is lighter.',paths:['Reef Network','Deepwater Charge']},
    ballista:{name:'Harpoon Spire',trait:'Bolts pierce and slow enemies behind the first. Less single-target damage.',paths:['Anchorhead','Tide Winch']},
  }},
  ivo:{name:'Ivo',title:'The Stormcaller',colour:'#bac2ff',approach:'Quick reloads, close formations and branching electrical attacks.',tradeoff:'Shorter reach and smaller individual hits demand reliable control and sight coverage.',towers:{
    wick:{name:'Arc Spindle',trait:'Fast, light sparks. Short reach rewards a close position.',paths:['Spark Array','Long Coil']},
    cracker:{name:'Thunder Drum',trait:'Frequent, smaller explosions. Good at keeping pressure on a crowd.',paths:['Pulse Shells','Storm Rockets']},
    bell:{name:'Static Resonator',trait:'Every fifth toll briefly stuns ordinary enemies. Its slow is gentler.',paths:['Feedback','Blackout']},
    owl:{name:'Kite Aerie',trait:'Reveals hidden enemies and speeds up nearby towers. Needs a tight formation.',paths:['Signal Mast','Storm Kites']},
    garden:{name:'Charge Grove',trait:'Attacking moths defend its bank from the start. Smaller harvests.',paths:['Stored Current','Spark Moths']},
    beam:{name:'Prism Engine',trait:'Two lighter beams split the work. Best when several enemies arrive together.',paths:['Prism Rail','Split Spectrum']},
    storm:{name:'Tesla Crown',trait:'Fast arcs reach an extra enemy. Each hit is softer.',paths:['Branching Charge','Thunderhead']},
    ballista:{name:'Railspire',trait:'Quick heavy bolts keep pressure on bosses. Shorter reach and lighter hits.',paths:['Rail Slug','Accelerator']},
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
