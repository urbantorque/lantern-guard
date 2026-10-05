import type {Challenge,Sim} from './sim'
import type {EnemyId,TowerId} from './defs'
import type {HeroId} from './heroes'
import type {WaveDef,Group} from './waves'
import type {VillageProfile} from './fixed-store'

export type MissionId='first-lights'|'copper-procession'|'moon-gates'|'below-island'|'repair-convoy'|'broken-formation'|'restore-waterway'|'last-bloom'
export interface Mission {id:MissionId;name:string;map:number;waves:WaveDef[];glow:number;seed:number;inlet:number;passage?:number;keeper?:HeroId;brief:string;reward:string;resident:string;line:string;preparations:Record<number,string>}
const g=(type:EnemyId,count:number,gap=.9,at=0,src:Group['src']='north'):Group=>({type,count,gap,at,src})
const w=(encounter:string,note:string,...groups:Group[]):WaveDef=>({encounter,note,groups})
export const MISSIONS:Mission[]=[
 {id:'first-lights',name:'First Lights',map:0,glow:380,seed:17041,inlet:99,keeper:'mira',brief:'Keep the market approach safe. Damage and slowing towers work best over the same bend.',reward:'Night Market · reopen the shutters',resident:'Nessa, market keeper',line:'I kept the stall keys. I hoped someone would come back.',preparations:{1:'Build a spark tower beside the upper bend. When you are ready, let the first group through.',2:'Fast boats approach. A Chime over the same water gives your sparks more time.',4:'Your pulse is ready to hold. Banking stops the Chime; release it when the crowd reaches your damage towers.',6:'The Brood Captain links an escort before its call. Release a held pulse during the signal to interrupt it.'},waves:[
  w('Light the bend','Build your first spark tower on the lit plot.',g('drip',10,1.5)),
  w('Fast water','Slowing the runners gives your sparks another volley.',g('drip',6,1.1),g('skitter',6,1.3,6)),
  w('Shared water','Keep your Chime and sparks covering the same water.',g('drip',16,.65),g('skitter',6,.9,10)),
  w('Hold the pulse','Bank the Chime, then release as the group enters your attacks.',g('drip',22,.3),g('skitter',8,.7,12)),
  w('Room to prepare','A smaller fleet. Strengthen your towers before the captain arrives.',g('drip',12,1.3),g('skitter',4,1.4,8)),
  w('The first captain','Interrupt the glowing call, or destroy its linked escort. The exposed captain takes stronger heavy hits.',g('toad',1,1,5),g('drip',16,.6),g('skitter',7,.8,14)),
 ]},
]
export const mission=(id:unknown)=>MISSIONS.find(m=>m.id===id)
export const storyMission=(c:Challenge)=>c.story===1?mission(c.mission):undefined
export function storyChallenge(id:MissionId,hero:HeroId='mira'):Challenge{
 const m=mission(id);if(!m)throw Error('Unknown campaign mission')
 return {fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:2,story:1,mission:m.id,hero:m.keeper??hero,variant:m.map,id:`story1:${m.id}`,skirmish:{from:0,to:m.waves.length,glow:m.glow,seed:m.seed}}
}
export function storyTowerWave(c:Challenge,id:TowerId){
 const m=storyMission(c);if(!m)return undefined
 if(m.id==='first-lights')return id==='wick'?1:id==='bell'?2:99
 return ({wick:1,cracker:1,bell:1,owl:2,garden:3,storm:2,beam:4,ballista:5})[id]
}
export const storyUnlock=(c:Challenge,original:number)=>storyMission(c)?original<=3?1:original<=6?2:original<=11?3:original<=16?5:original<=21?6:original<=26?7:8:undefined
export const storyReward=(c:Challenge,n:number)=>storyMission(c)?(c.mission==='first-lights'?150:210)+n*(c.mission==='first-lights'?45:70):undefined
export function storyWave(c:Challenge,n:number){const m=storyMission(c);return m?.waves[Math.max(0,Math.min(m.waves.length-1,n-1))]}
export function missionWon(p:Pick<VillageProfile,'records'>,id:MissionId){return Object.entries(p.records).some(([key,r])=>key.startsWith(`story1:${id}:`)&&key.endsWith(':standard')&&r.won&&!r.practice)}
export const nextMission=(p:Pick<VillageProfile,'records'>)=>MISSIONS.find(m=>!missionWon(p,m.id))??MISSIONS[MISSIONS.length-1]
export const missionOpen=(p:Pick<VillageProfile,'records'>,id:MissionId)=>{const i=MISSIONS.findIndex(m=>m.id===id);return i===0||i>0&&missionWon(p,MISSIONS[i-1].id)}
export function storyLesson(s:Sim){
 if(s.challenge.mission!=='first-lights'||s.over)return null
 if(!s.towers.length)return {id:'story-place',text:'Tap the lit plot. Place a spark tower to cover the upper bend.'}
 if(s.wave>=1&&!s.towers.some(t=>t.id==='bell'))return {id:'story-control',text:'Add a Chime where your sparks can shoot. Slowing buys another volley.'}
 if(s.wave>=4&&!s.director?.commands)return {id:'story-command',text:s.director?.command?.phase==='held'?'Release your held pulse when the crowd enters your damage towers.':'Hold a pulse. Your Chime stops firing until you release it.'}
 if(s.wave>=2&&s.towers.every(t=>!t.a&&!t.b))return {id:'story-upgrade',text:'Tap a tower to specialise it. Compare reach with stronger attacks.'}
 return null
}
