import { ENEMIES, type EnemyId } from './defs'

/** Fixed-edition names, forms and counters. Identity does not depend on colour. */
export const BESTIARY:Record<EnemyId,{name:string;form:string;role:string;counter:string}>={
  drip:{name:'Pebble Pup',form:'A squat stone salamander with a paddle tail.',role:'Wanderer',counter:'Cover a long bend with sparks.'},
  skitter:{name:'Needlefin',form:'A long, narrow fish with a forked tail.',role:'Sprinter',counter:'Slows give your towers more time.'},
  shell:{name:'Ironback Crab',form:'Six legs and a broad copper carapace.',role:'Armoured',counter:'Blasts and heavy hits crack its shell.'},
  wisp:{name:'Lantern Moth',form:'Four bright wings around a tiny lantern.',role:'Swarm',counter:'Wide blasts and chains catch the flock.'},
  veil:{name:'Glass Ray',form:'A translucent kite with a long ribbon tail.',role:'Hidden',counter:'A scout reveals it to nearby towers.'},
  bloat:{name:'Brinebelly',form:'A round puffer with spines and tiny fins.',role:'Splits on defeat',counter:'Leave coverage for its three Pebble Pups.'},
  mender:{name:'Bloom Jelly',form:'A flower-shaped bell trailing luminous tendrils.',role:'Healer',counter:'Concentrate damage around its companions.'},
  vshell:{name:'Mirror Snail',form:'A spiral glass shell over a low, slow body.',role:'Hidden armour',counter:'Pair a scout with heavy damage.'},
  skiff:{name:'Rivet Racer',form:'A tiny steam launch with a chimney and screw.',role:'Armoured sprinter',counter:'It accelerates after its hull breaks. Add slows.'},
  reedling:{name:'Stiltroot',form:'A walking seedpod on four long reed legs.',role:'Growing armour',counter:'Hit early, before it reaches the meeting stone.'},
  toad:{name:'Mossjaw',form:'A broad amphibian carrying a mossy island.',role:'Brood keeper',counter:'An escort arrives at half health. Keep blasts ready.'},
  gloom:{name:'Umbra Leviathan',form:'A long sea serpent with an arched spine.',role:'Dividing giant',counter:'It splits at the stone. Cover the route beyond it.'},
  warden:{name:'Harbour Warden',form:'An ironclad ship with twin stacks and a watchtower.',role:'Escorted captain',counter:'Four nearby escorts guard it. Clear them for full damage.'},
  bloomheart:{name:'Thorn Matriarch',form:'A many-petalled carnivorous flower on root limbs.',role:'Healing giant',counter:'It signals a healing pulse. Burst down its neighbours.'},
  dredger:{name:'The Dredger',form:'An enormous burrowing nautilus with hinged armour.',role:'Bend ambush',counter:'Its core opens at the marked bends. Overlap damage there.'},
}
export const enemyName=(id:EnemyId)=>BESTIARY[id].name
export function bestiaryText(text:string){
  for(const [id,def]of Object.entries(ENEMIES).sort((a,b)=>b[1].name.length-a[1].name.length)){
    const name=BESTIARY[id as EnemyId].name
    text=text.replace(new RegExp(`\\b${def.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(s)?\\b`,'g'),(_match,plural)=>plural?(/[^aeiou]y$/.test(name)?name.slice(0,-1)+'ies':name+'s'):name)
  }
  return text.replace(/\bGloom\b/g,'Leviathan')
}
