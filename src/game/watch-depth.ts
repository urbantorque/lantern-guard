import type { EnemyId, TowerId, TowerStats } from './defs'
import type { WaveDef } from './waves'
import type { Sim, Tower } from './sim'

/** Opt-in rules for new watches. Existing fixed-path saves retain their balance. */
export const DEPTH_RULES = 1 as const
export const SUN_CAPACITY = 18
export const SUN_PULSE_COST = 6
export const SUN_PULSE_SECONDS = 4
export const SUN_HELP = 'Stores 3 daylight charges. At night, each charge gives nearby towers +12% fire rate for 4s and reveals a wider area.'

export const EXPEDITION_UNLOCK: Record<TowerId, number> = { wick:1, cracker:1, bell:2, owl:3, garden:4, beam:5, storm:7, ballista:9 }
export const expeditionBonus=(wave:number)=>125+wave*35
export const EXPEDITIONS = [
  { id:'sunforge', name:'The Sunforge Run', variant:0, seed:81047, waves:12, glow:760, reward:'Copper rooftops', desc:'Break the convoy. Wide blasts and armour piercing both shine.', boss:'toad' as EnemyId, theme:'convoy' },
  { id:'moonwake', name:'The Moonwake Crossing', variant:2, seed:82047, waves:12, glow:760, reward:'Moonstone lanterns', desc:'Keep the hidden fleet in sight. Shared light rewards careful placement.', boss:'gloom' as EnemyId, theme:'veil' },
  { id:'stormglass', name:'The Stormglass Passage', variant:1, seed:83047, waves:12, glow:760, reward:'Prismatic windows', desc:'Separate the escort from its captain. Control and chain attacks thrive.', boss:'warden' as EnemyId, theme:'escort' },
] as const
export type ExpeditionId = typeof EXPEDITIONS[number]['id']
export const isExpedition = (id: unknown): id is ExpeditionId => EXPEDITIONS.some(e=>e.id===id)
export function featuredExpedition(now = new Date()) {
  return EXPEDITIONS[Math.floor(now.getTime() / (7*86400000)) % EXPEDITIONS.length]
}

export interface Encounter { name:string; hint:string }
export function encounterAt(n:number, seed:number):Encounter {
  if(n===10)return {name:'Gloomtoad procession',hint:'An escort arrives at half health. Save some crowd damage for it.'}
  if(n===25)return {name:'The dividing current',hint:'Gloom splits downstream. Cover both sides of the meeting stone.'}
  if(n===30)return {name:'Captain and escort',hint:'Clear the four escorts to break the shield. Blasts or chains both work.'}
  if(n===40)return {name:'The last bloom',hint:'A three-second warning precedes healing. Concentrate damage around the pulse.'}
  if(n<6)return {name:'First lanterns',hint:'Cover a bend, then choose a stream for your first tower.'}
  const beat=(n+Math.abs(seed)%3)%4
  return beat===0?{name:'Armoured convoy',hint:'Armour leads, runners follow. Piercing or blasts break the front; slows catch the tail.'}
    :beat===1?{name:'Crosscurrent',hint:'Staggered arrivals stretch your coverage. Guard the shared downstream bend.'}
    :beat===2?{name:'Lantern procession',hint:'A close formation rewards blasts, chains or sustained control.'}
    :{name:'Quiet current',hint:'A lighter crossing. Strengthen your defence before the next surge.'}
}

/** Reshape authored arrivals, without introducing a counter before its original lesson. */
export function depthWave(base:WaveDef,n:number,seed:number):WaveDef {
  const lessons:Record<number,string>={8:'Hidden procession',11:'The second inlet',16:'Veiled armour',21:'A branching storm',26:'Siege crossing',31:'Crown the defence'}
  if(n<7 || lessons[n] || [10,25,30,40].includes(n))return {...base,encounter:lessons[n]??encounterAt(n,seed).name,note:lessons[n]||n<7?base.note:encounterAt(n,seed).hint}
  const beat=(n+Math.abs(seed)%3)%4
  const groups=base.groups.map((g,i)=>({...g,
    count:Math.max(1,Math.round(g.count*(beat===3?.88:1))),
    gap:g.gap*(beat===2?.83:beat===3?1.12:1),
    at:g.at+(beat===1?i*1.4:0),
  }))
  if(beat===0){
    // Reorder existing groups only: armour leads and fast enemies trail it.
    const first=Math.min(...groups.map(g=>g.at))
    for(const g of groups){if(g.type==='shell'||g.type==='vshell')g.at=first;if(g.type==='skitter'||g.type==='skiff')g.at=Math.max(g.at,first+4)}
  }
  return {groups,encounter:encounterAt(n,seed).name,note:encounterAt(n,seed).hint}
}

export function expeditionWave(id:ExpeditionId,n:number):WaveDef {
  const e=EXPEDITIONS.find(e=>e.id===id)!
  const groups:WaveDef['groups']=[{type:'drip',count:7+n,gap:.75,at:0}]
  if(n>=2)groups.push({type:n>=8?'skiff':'skitter',count:3+Math.floor(n/2),gap:.8,at:4})
  if(n>=3)groups.push({type:n>=8?'vshell':'shell',count:2+Math.floor(n/3),gap:1.4,at:1})
  if(n>=4)groups.push({type:e.theme==='veil'?'veil':'wisp',count:4+n,gap:.42,at:8,...(n>=6?{src:'west' as const}:{})})
  if(n>=7&&e.theme==='escort')groups.push({type:'mender',count:2,gap:2,at:7})
  if(n===6||n===10)for(const g of groups)g.count=Math.max(1,Math.floor(g.count*.75))
  if(n===e.waves)groups.push({type:e.boss,count:1,gap:1,at:4})
  const boss=encounterAt(e.boss==='toad'?10:e.boss==='gloom'?25:30,e.seed)
  return {groups,encounter:n<=2?'First lanterns':n===e.waves?boss.name:n===6||n===10?'Quiet current':e.theme==='convoy'?'Armoured convoy':e.theme==='veil'&&n>=4?'Hidden procession':'The escort fleet',note:n===e.waves?boss.hint:n===3?'Armour arrives. Blasts and piercing sparks both break it.':n===4?(e.theme==='veil'?'The first hidden fleet approaches. A scout keeps it in sight.':'A close procession. Blasts and slows both catch the crowd.'):n===6?'The side inlet opens. Cover the shared path.':n===7?'Hidden armour arrives next. Prepare sight and heavy damage.':n>=8?'Hidden armour leads fast skiffs. Cover a shared bend with sight, control and damage.':'Upgrade your first tower, then add coverage around the bend.'}
}

/** Each crown extends the chosen stream, including its tradeoff. */
export function specialiseCrown(s:TowerStats,id:TowerId,b:number) {
  switch(id){
    case 'wick': if(b){s.heavy=true;s.pierce+=2;s.count=1}else{s.count+=2;s.damage*=.86}break
    case 'cracker': if(b){s.burn+=8;s.burnDur=Math.max(3,s.burnDur);s.splash*=.85}else{s.splash+=18;s.damage*=.93}break
    case 'bell': if(b){s.revealPerm=true;s.brittle=true}else{s.stunEvery=Math.max(2,s.stunEvery-1);s.slowDur+=1}break
    case 'owl': if(b){s.auraRate+=.06}else{s.dive*=1.45;s.interval*=.85}break
    case 'garden': if(b){s.gardenSlow=Math.max(.18,s.gardenSlow);s.mothEvery=Math.min(s.mothEvery||3,2.5)}else{s.income+=20;s.lifePerWave=0}break
    case 'beam': if(b){s.beams+=1;s.damage*=.76}else{s.pierce+=2;s.heavy=true}break
    case 'storm': if(b){s.heavy=true;s.damage*=1.2;s.interval*=1.12}else{s.count+=2;s.damage*=.88}break
    case 'ballista': if(b){s.pierce+=2;s.interval*=.85;s.damage*=.9}else{s.burn+=12;s.burnDur=Math.max(3,s.burnDur);s.damage*=1.15;s.interval*=1.1}break
  }
  return s
}
export const CROWN_HELP:Record<TowerId,readonly[string,string]>={
  wick:['Two extra sparks per volley. Lighter individual hits.','One armour-breaking spark pierces a long line.'],
  cracker:['Wider explosions catch crowded formations.','Guided hits leave a stronger burn; smaller blasts.'],
  bell:['Longer slows and more frequent stuns.','Permanently reveals foes and weakens their armour.'],
  owl:['Faster attacks and heavier armour dives.','Stronger support, with stored sunlight for night pulses.'],
  garden:['Larger harvests; gives up light restoration.','Faster moths and a slowing garden.'],
  beam:['Armour-breaking beam pierces two more foes.','An extra beam divides damage across more targets.'],
  storm:['Two more chain jumps, with lighter hits.','Heavier armour hits, with a longer reload.'],
  ballista:['Heavy siege hits leave a lasting burn.','Faster bolts pierce two more foes.'],
}

export const LANDMARKS = [
  {id:'moonwell',name:'Moon spring',help:'At night, reveals nearby foes for 4s every 12s.',colour:'#a0ecff',segment:'w1',fraction:.52,dx:-48,dy:0,radius:104},
  {id:'stormgarden',name:'Storm garden',help:'Nearby Storm towers deal +5% damage; +12% in rain.',colour:'#cea8ff',segment:'m1',fraction:.65,dx:62,dy:0,radius:150},
  {id:'sunterrace',name:'Sun terrace',help:'Nearby Gardens earn +12% during daylight.',colour:'#ffd589',segment:'w1',fraction:.52,dx:48,dy:0,radius:145},
  {id:'tidebell',name:'Tide bell',help:'Nearby foes move 8% slower at night, 4% by day.',colour:'#8df2bd',segment:'e2',fraction:.65,dx:55,dy:0,radius:104},
] as const
type Landmark=Omit<typeof LANDMARKS[number],'help'>&{help:string;x:number;y:number}
const landmarkCache=new WeakMap<Sim['level'],Landmark>()
export function landmark(sim:Sim):Landmark{
  const cached=landmarkCache.get(sim.level);if(cached)return cached
  const def=LANDMARKS[sim.challenge.variant??0],seg=sim.level.segs.get(def.segment)!
  const p=seg.line.at(seg.line.length*def.fraction,{x:0,y:0,tx:0,ty:0})
  const preferred={x:p.x+def.dx,y:p.y+def.dy}
  const candidates=[]
  for(const radius of [68,88,112,140])for(let i=0;i<16;i++){
    const x=p.x+Math.cos(i*Math.PI/8)*radius,y=p.y+Math.sin(i*Math.PI/8)*radius
    if(x<88||x>632||y<12||y>798||sim.pads.some(p=>(p.x-x)**2+(p.y-y)**2<62**2))continue
    const fromWater=Math.min(...[...sim.level.segs.values()].map(s=>s.line.distanceTo(x,y)))
    if(fromWater<49||fromWater>90)continue
    candidates.push({x,y,score:(x-preferred.x)**2+(y-preferred.y)**2})
  }
  candidates.sort((a,b)=>a.score-b.score)
  const help=sim.challenge.livingWatch?[
    'At night, reveals nearby foes for 6s every 12s. Defend both sides of the spring.',
    'Nearby Storm damage +5% by day, +15% at night or +12% in rain. Bonuses do not stack.',
    'Nearby Gardens earn +20% by day, but 15% less at night. Invest before dusk.',
    'Nearby foes move 14% slower at night, 4% by day. Save the basin for heavy damage.',
  ][sim.challenge.variant??0]:def.help
  const result={...def,help,...(candidates[0]??preferred)};landmarkCache.set(sim.level,result);return result
}
export function nearLandmark(sim:Sim,p:{x:number;y:number}){
  const l=landmark(sim);return (p.x-l.x)**2+(p.y-l.y)**2<=l.radius**2
}
export function hasSunReserve(t:Pick<Tower,'id'|'b'>){return t.id==='owl'&&t.b>=2}
