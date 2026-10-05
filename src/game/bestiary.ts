import { ENEMIES, type EnemyId } from './defs'

/** Fixed-edition names, forms and counters. Identity does not depend on colour. */
export const BESTIARY:Record<EnemyId,{name:string;form:string;role:string;counter:string}>={
  drip:{name:'Guttermaw',form:'A saw-backed canal beast with an armoured brow and a snapping jaw.',role:'Raider',counter:'Cover a long bend with sparks.'},
  skitter:{name:'Razorfin',form:'A spear-headed predator with knife fins and a forked whip tail.',role:'Sprinter',counter:'Slows give your towers more time.'},
  shell:{name:'Ironclaw',form:'A riveted carapace, six hooked legs and two shearing pincers.',role:'Armoured',counter:'Blasts and heavy hits crack its shell.'},
  wisp:{name:'Cinderwing',form:'A razor-winged parasite with ember veins and a barbed abdomen.',role:'Swarm',counter:'Wide blasts and chains catch the flock.'},
  veil:{name:'Wraith Ray',form:'A bone-masked shadow with torn fins and a trailing stinger.',role:'Hidden',counter:'A scout reveals it to nearby towers.'},
  bloat:{name:'Blight Sac',form:'Three swollen brood chambers inside a cage of black chitin and spines.',role:'Splits on defeat',counter:'Leave coverage for its three Guttermaws.'},
  mender:{name:'Leech Choir',form:'A hooded parasite with a luminous core and five barbed tendrils.',role:'Healer',counter:'Concentrate damage around its companions.'},
  vshell:{name:'Obsidian Crawler',form:'A faceted black shell over a low, many-legged scavenger.',role:'Hidden armour',counter:'Pair a scout with heavy damage.'},
  skiff:{name:'Ramming Skiff',form:'A furnace-driven raider with a serrated iron prow.',role:'Armoured sprinter',counter:'It accelerates after its hull breaks. Add slows.'},
  reedling:{name:'Gallows Stalker',form:'A thorn-masked stalker on four scythe legs.',role:'Growing armour',counter:'Hit early, before it reaches the meeting stone.'},
  toad:{name:'Mire Tyrant',form:'A broad, fang-jawed brute carrying a palisade of bone spines.',role:'Brood keeper',counter:'An escort arrives at half health. Keep blasts ready.'},
  gloom:{name:'Umbra Leviathan',form:'A horned abyssal serpent with seven armoured segments and a sawtooth spine.',role:'Dividing giant',counter:'It splits at the stone. Cover the route beyond it.'},
  warden:{name:'Dreadnought',form:'A twin-stack siege ship with a plated ram and a burning visor.',role:'Escorted captain',counter:'Four nearby escorts guard it. Clear them for full damage.'},
  bloomheart:{name:'Thorn Matriarch',form:'A hooked thorn crown around a tooth-lined heart, walking on scythe roots.',role:'Healing giant',counter:'It signals a healing pulse. Burst down its neighbours.'},
  dredger:{name:'The Dredger',form:'A colossal burrowing engine with hooked forelimbs and a hinged shell over its grinding core.',role:'Bend ambush',counter:'Its core opens at the marked bends. Overlap damage there.'},
}
export const enemyName=(id:EnemyId)=>BESTIARY[id].name
const displayNames=new Map<string,string>()
for(const [id,def]of Object.entries(ENEMIES)){
  const name=BESTIARY[id as EnemyId].name
  displayNames.set(def.name,name);displayNames.set(name,name)
}
const oldNames:Partial<Record<EnemyId,string>>={drip:'Pebble Pup',skitter:'Needlefin',shell:'Ironback Crab',wisp:'Lantern Moth',veil:'Glass Ray',bloat:'Brinebelly',mender:'Bloom Jelly',vshell:'Mirror Snail',skiff:'Rivet Racer',reedling:'Stiltroot',toad:'Mossjaw'}
for(const [id,name]of Object.entries(oldNames))displayNames.set(name,BESTIARY[id as EnemyId].name)
const namePattern=new RegExp(`\\b(${[...displayNames.keys()].sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(s)?\\b`,'g')
export function bestiaryText(text:string){
  // One pass also protects already-translated names such as Ramming Skiff.
  return text.replace(namePattern,(_match,source:string,plural:string)=>{const name=displayNames.get(source)!;return plural?(/[^aeiou]y$/.test(name)?name.slice(0,-1)+'ies':name+'s'):name}).replace(/\bGloom\b/g,'Leviathan')
}
