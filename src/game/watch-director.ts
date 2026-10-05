import type { Challenge, Sim, Tower } from './sim'
import type { EnemyId, TowerId } from './defs'
import type { Group, WaveDef } from './waves'
import type { LevelDef } from './level'
import {storyMission,storyUnlock,storyReward} from './story'

/** Authored watches are opt-in. Historical saves retain their original rules. */
export const DIRECTOR_RULES = 2 as const
export const CAMPAIGN_WAVES = [1,2,3,4,6,8,9,10,11,13,16,18,21,22,24,25,26,28,30,33,35,37,39,40] as const
export const shortCampaign = (c:Challenge) => !!c.watchDirector && !c.expedition && !c.endurance && !c.story
export const campaignBeat = (c:Challenge,n:number) => shortCampaign(c) ? CAMPAIGN_WAVES[Math.max(0,Math.min(23,n-1))] : n
export const campaignUnlock = (c:Challenge,n:number) => storyUnlock(c,n)??(shortCampaign(c) ? Math.max(1,CAMPAIGN_WAVES.findIndex(w=>w>=n)+1) : n)
/** Transfer the removed waves' clear income into the retained encounter. */
export function campaignReward(c:Challenge,n:number){
  if(c.story)return storyReward(c,n)??0
  if(!shortCampaign(c))return 125+n*15
  const previous=n>1?campaignBeat(c,n-1):0,current=campaignBeat(c,n)
  let reward=0;for(let beat=previous+1;beat<=current;beat++)reward+=125+beat*15
  return reward
}
export const routeWave = (c:Challenge) => c.story?storyMission(c)?.passage??99:c.expedition ? 6 : c.endurance ? 20 : 12
export type Passage = 'convoy' | 'runners'
export type CommandPhase = 'charging' | 'held' | 'spent'
export interface WatchCommand {wave:number;tower:number;phase:CommandPhase}
export interface DirectorState {passage:Passage|null;command:WatchCommand|null;commands:number;owner?:number;target?:number}
export const freshDirector = ():DirectorState => ({passage:null,command:null,commands:0})
export const passagePending = (s:Pick<Sim,'challenge'|'director'|'wave'|'waveActive'|'over'>) => !!s.director && !s.director.passage && s.wave===routeWave(s.challenge) && !s.waveActive && !s.over
export const PASSAGES = [
  {id:'convoy',name:'Intercept the convoy',reward:'180 glow now',risk:'Extra armoured fronts for the next three waves.',plan:'Invest the advance in heavy damage. Break the front before its escort arrives.'},
  {id:'runners',name:'Guard the side channels',reward:'90 extra glow after each of three waves',risk:'Two extra runner groups, arriving from different entrances.',plan:'Keep control and a finishing tower downstream. The reward arrives after each hold.'},
] as const

export const COMMANDS = {
  sol:{tower:'cracker' as TowerId,name:'Ignition',hold:'Bank ignition',release:'Ignite burns',help:'Bank a Blast shot, stopping that tower. Ignite visible burns in its reach for 2.5 times up to 2 seconds of remaining fire. That fire is consumed.'},
  mira:{tower:'bell' as TowerId,name:'Stillwater',hold:'Hold pulse',release:'Release tide',help:'Hold a Chime pulse, stopping that tower. Release a 1.25s freeze and a longer slow. A signalling boss is interrupted and exposed for 4s.'},
  ivo:{tower:'storm' as TowerId,name:'Discharge',hold:'Bank discharge',release:'Focus discharge',help:'Bank a lightning volley, stopping that tower. Release its energy into one armour-piercing hit. Capacitor waits for its third volley; Forked current gives up its chain.'},
} as const
export function commandTower(s:Sim):Tower|null {
  const hero=s.challenge.hero;if(!s.director||!hero)return null
  const held=s.director.command
  if(held)return s.towers.find(t=>t.uid===held.tower)??null
  if(s.challenge.watchDirector===2&&s.director.owner)return s.towers.find(t=>t.uid===s.director!.owner)??null
  return s.towers.filter(t=>t.id===COMMANDS[hero].tower).sort((a,b)=>b.stats.damage-a.stats.damage||a.uid-b.uid)[0]??null
}
export function commandTargets(s:Sim){
  const t=commandTower(s);if(!t)return []
  return s.enemies.filter(e=>e.alive&&Math.hypot(e.x-t.x,e.y-t.y)<=s.effRange(t)&&s.canSee(e,t.stats.detect)&&(s.challenge.hero!=='sol'||e.burnT>0&&e.burnDps>0))
}

const g=(type:EnemyId,count:number,gap=.8,at=0,src:Group['src']='north'):Group=>({type,count,gap,at,src})
const wave=(encounter:string,note:string,...groups:Group[]):WaveDef=>({encounter,note,groups})
/** Every expedition teaches, tests and combines one spatial problem. */
export function authoredExpedition(c:Challenge,n:number):WaveDef {
  const common:Record<number,WaveDef>={
    1:wave('The first crossing','Cover a long bend. Leave room for control beside your opening damage.',g('drip',14,.8)),
    2:wave('Fast water','Runners follow the first group. A Chime buys your attacks another volley.',g('drip',8),g('skitter',6,.85,5)),
    3:wave('Choose your signature','Armour arrives in a small front. Choose the signature that will shape your defence.',g('shell',3,1.8),g('drip',10,.65,4)),
  }
  if(common[n])return common[n]
  const sun:Record<number,WaveDef>={
    4:wave('Hammer and wake','Shells lead a tight wake. Blasts break the front; piercing shots catch the column.',g('shell',5,1.25),g('wisp',18,.25,4)),
    5:wave('The sheltered surgeon','A healer follows the shells. Break the front early or catch the whole convoy downstream.',g('shell',5,1.5),g('mender',1,1,3),g('skitter',7,.65,8)),
    6:wave('Two banks','The side inlet opens. Give the lower bend its own damage and control.',g('shell',4,1.4),g('drip',10,.65,3,'west'),g('skitter',5,.8,9,'west')),
    7:wave('The iron advance','A long armoured column rewards heavy hits along its length.',g('shell',7,1.6),g('wisp',17,.35,6)),
    8:wave('A veiled vanguard','Hidden armour leads. Shared Scout sight lets blasts and heavy shots work together.',g('vshell',4,1.6),g('shell',5,1.4,3),g('skitter',8,.8,9,'west')),
    9:wave('Break the repair line','Two healers follow separated armour. Concentrate early damage or hold a later bend.',g('shell',7,1.5),g('mender',2,3,4),g('skiff',5,1.2,10)),
    10:wave('The scattered fleet','Widely spaced targets reward sustained damage. Prepare a crown for the final bend.',g('vshell',5,2.5),g('skiff',7,1.65,5,'west')),
    11:wave('The late flank','Armour commits upstream. Fast side arrivals follow ten seconds later.',g('vshell',5,1.3),g('bloat',5,1.2,3),g('skiff',8,.7,10,'west')),
    12:wave('The Dredger','Its core opens at the two marked bends. Slow it there and commit your burst while it is exposed.',g('dredger',1,1,3),g('shell',6,1.4),g('wisp',20,.3,7),g('skiff',5,1.2,12,'west')),
  }
  const moon:Record<number,WaveDef>={
    4:wave('Through the moon gates','Hidden fleets pass two revealing arches. Cover the lit water, or extend it with a Scout.',g('veil',12,.6),g('drip',8,.8,5)),
    5:wave('Between the lights','Separated hidden groups stretch sight coverage. Each arch reveals foes for six seconds.',g('veil',8,.6),g('veil',8,.6,9),g('shell',4,1.5,5)),
    6:wave('An unlit approach','The side fleet bypasses the upper arch. Cover the lower arch with damage.',g('veil',9,.6),g('veil',7,.75,5,'west'),g('skitter',5,.8,9,'west')),
    7:wave('Shadow and shell','Sight alone cannot break armour. Put heavy damage over the revealing arches.',g('vshell',5,1.6),g('veil',12,.45,5)),
    8:wave('Twin processions','The two entrances arrive together. A long sight line can serve both groups.',g('veil',10,.6),g('veil',10,.6,2,'west'),g('vshell',4,1.7,5)),
    9:wave('The hidden surgeon','A healer trails hidden armour. Reveal the front before the healing catches it.',g('vshell',6,1.5),g('mender',2,2.5,4),g('veil',10,.5,9,'west')),
    10:wave('Moonlit intervals','Loose hidden arrivals cross the arches separately. Cover their exit from the light.',g('veil',12,1.4),g('vshell',4,2.2,5,'west')),
    11:wave('The closing veil','Armour and runners share the lower light. Check sight at the final bend.',g('vshell',6,1.6),g('skiff',6,.9,6,'west'),g('veil',12,.55,9)),
    12:wave('The Umbra Leviathan','The Leviathan divides at the meeting stone. Put finishing damage beyond it.',g('gloom',1,1,3),g('veil',16,.55),g('vshell',5,1.5,7,'west'),g('skiff',4,1,12)),
  }
  const storm:Record<number,WaveDef>={
    4:wave('The return crossing','The upper island sees the fleet twice. Long reach makes both passes count.',g('wisp',22,.25),g('shell',5,1.35,5)),
    5:wave('Linked ranks','A close escort rewards chains. Isolated stragglers need a finishing weapon.',g('shell',5,1.5),g('wisp',18,.3,3),g('skitter',5,1.7,11)),
    6:wave('Below the island','The side inlet bypasses both upper passes. Invest in the lower basin.',g('shell',4,1.3),g('skitter',8,.65,4,'west'),g('wisp',12,.3,8,'west')),
    7:wave('The repair escort','Healers reinforce a tight column. Burst its escort before it regroups.',g('shell',6,1.2),g('mender',2,2,3),g('wisp',20,.3,5)),
    8:wave('Broken circuit','Widely spaced armour gives chains few neighbours. Heavy first hits remain useful.',g('vshell',5,2.8),g('skiff',7,2,4,'west')),
    9:wave('Converging fleets','Two escorts converge on the lower basin. Split control or cover their meeting point.',g('shell',6,1.4),g('mender',1,1,5),g('wisp',22,.3,8,'west'),g('skiff',4,1.3,12)),
    10:wave('The long interval','A small isolated front. Crown the defence before the captain arrives.',g('vshell',5,2.2),g('skiff',6,1.7,6,'west')),
    11:wave('The captain’s screen','Break the leading shells and keep a heavy weapon free for the isolated rear.',g('shell',7,1.1),g('mender',2,2,3),g('vshell',4,2,10),g('skiff',6,.8,10,'west')),
    12:wave('The Dreadnought','Four linked escorts shield the captain. Clear or separate them, then focus the exposed hull.',g('warden',1,1,3),g('wisp',22,.3),g('vshell',5,1.6,7),g('skiff',5,1,12,'west')),
  }
  return (c.expedition==='moonwake'?moon:c.expedition==='stormglass'?storm:sun)[n]??sun[12]
}

export function passageWave(base:WaveDef,n:number,c:Challenge,state:DirectorState|null):WaveDef {
  const start=routeWave(c)
  if(!state?.passage||n<=start||n>start+3)return base
  if(state.passage==='convoy')return {...base,encounter:`Convoy · ${base.encounter}`,groups:[g(c.expedition==='moonwake'?'vshell':'shell',3,1.65),...base.groups.map(q=>({...q,at:q.at+3}))]}
  return {...base,encounter:`Side channels · ${base.encounter}`,clearBonus:(base.clearBonus??0)+90,groups:[...base.groups.map(q=>({...q})),g('skitter',5,.65,8),g('skitter',5,.65,14,'west')]}
}

/** A continuous U-turn gives the central island two separated firing passes. */
export function directorLevel(level:LevelDef):LevelDef {
  const def=structuredClone(level)
  if(def.name!=='Reed Crossing')return def
  const shapes:Record<string,number[][]>={
    n0:[[100,0],[100,150]],
    w1:[[100,150],[95,305],[150,395],[270,430],[390,390],[440,300],[440,170],[530,110],[625,170],[650,320],[650,460]],
    m1:[[650,460],[560,490],[470,490]],
    e2:[[470,490],[430,580],[285,590],[150,620],[110,690],[190,770],[360,760]],
    h:[[360,760],[360,820]],
    inlet:[[720,460],[685,460],[650,460]],
  }
  for(const seg of def.segments){seg.pts=shapes[seg.id].map(([x,y])=>({x,y}));seg.curve=undefined;if(seg.id==='inlet')seg.next={seg:'m1'}}
  for(const seg of def.segments){const next='seg' in seg.next?def.segments.find(q=>q.id===(seg.next as {seg:string}).seg):undefined;const prev=def.segments.find(q=>q.id!=='inlet'&&'seg' in q.next&&q.next.seg===seg.id);seg.curve={...(prev?{before:prev.pts[prev.pts.length-2]}:{}),...(next?{after:next.pts[1]}:{})}}
  def.pads=[[245,260],[275,65],[605,550],[325,275],[535,300],[465,655],[340,500],[100,495],[630,755],[345,680],[250,815],[465,810]].map(([x,y])=>({x,y}))
  def.home={x:360,y:846};def.bounds={x:0,y:-105,w:740,h:1010}
  return def
}

export const MOON_ARCHES=[{seg:'w1',fraction:.47},{seg:'e2',fraction:.38}] as const
export const hasMoonArches=(c:Challenge)=>!!c.watchDirector&&(c.expedition==='moonwake'||c.mission==='moon-gates'||c.mission==='broken-formation')
export function directorPreparation(c:Challenge,n:number):string|null {
  if(c.expedition&&n===4&&c.expedition==='moonwake')return 'Hidden fleets approach. Inspect the two revealing moon gates.'
  if(c.expedition&&n===6)return 'The side inlet opens. Prepare a second line of defence.'
  if(c.expedition&&n===12)return 'Final encounter. Prepare your crown and deliberate command.'
  if(shortCampaign(c)&&[8,16,24].includes(n))return ['The first captain arrives. Prepare crowd control.','The Leviathan divides. Cover beyond the meeting stone.','The Matriarch arrives. Interrupt its healing or break the escort.'][[8,16,24].indexOf(n)]
  if(shortCampaign(c)&&n===9)return 'The side inlet opens. Protect the lower bank.'
  return null
}
