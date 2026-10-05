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
 {id:'copper-procession',name:'Copper Procession',map:1,glow:560,seed:17042,inlet:99,brief:'An armoured column is crossing the old foundry. Break its front and catch the wake behind it.',reward:'Night Market · raise the awnings',resident:'Nessa, market keeper',line:'Two stalls opened this morning. Tomorrow I will ask the baker.',preparations:{1:'Armour resists small hits. Put a Blast beside your opening sparks.',3:'Choose a keeper signature. Commit to its strength, then cover the weakness with a second weapon.',8:'The Dredger opens its core at the marked bends. Hold it there and focus heavy damage.'},waves:[
  w('Iron at the gate','A small armoured front tests your opening.',g('shell',2,2),g('drip',12,.65,4)),
  w('Wake behind the hull','Blasts punish the tightly packed wake.',g('shell',4,1.6),g('wisp',18,.25,5)),
  w('Choose your weapon','Specialise your defence before the ranks thicken.',g('shell',5,1.5),g('skitter',8,.8,7)),
  w('The iron column','Piercing shots can meet the column along its length.',g('shell',8,1.2),g('wisp',22,.3,7)),
  w('Repair tender','The surgeon follows the front. Break the escort before it is repaired.',g('shell',6,1.5),g('mender',1,1,4),g('drip',14,.6,10)),
  w('Separated hulls','Widely spaced armour gives splash fewer neighbours.',g('shell',9,2.2),g('skiff',4,1.8,8)),
  w('The last escort','Strengthen a heavy weapon for the Dredger.',g('shell',10,1.1),g('wisp',24,.3,5),g('mender',1,1,9)),
  w('The Dredger','Its two marked exposure bends are your best firing windows.',g('dredger',1,1,5),g('shell',7,1.5),g('wisp',22,.3,9)),
 ]},
 {id:'moon-gates',name:'Moon Gates',map:2,glow:640,seed:17043,inlet:5,brief:'Hidden fleets pass through two revealing arches. Build where the light lasts, and cover the side approach.',reward:'Canal Observatory · repair the lens',resident:'Edda, lens keeper',line:'The lens is cracked. It still knows how to find a ship in the dark.',preparations:{1:'The two arches reveal hidden enemies for six seconds. Place damage just beyond their light.',3:'A Scout extends sight beyond the arches. Its sight can serve neighbouring towers.',5:'A second entrance opens below the upper arch. Check the lower bend before starting.',8:'The Leviathan divides at the meeting stone. Keep finishing damage beyond it.'},waves:[
  w('First light through glass','Hidden boats become visible at the arches.',g('veil',8,.9),g('drip',10,.8,6)),
  w('Between the arches','Cover the water after the light.',g('veil',14,.6),g('skitter',6,.8,8)),
  w('Shadow and shell','Revealed armour still needs heavy hits.',g('vshell',3,2),g('veil',14,.55,6)),
  w('Dark intervals','Loose groups test the length of your sight line.',g('veil',18,1.2),g('shell',5,1.8,7)),
  w('The unlit inlet','Side arrivals bypass the first arch.',g('veil',12,.6),g('veil',9,.8,5,'west'),g('skitter',5,1,12,'west')),
  w('The hidden surgeon','Find the armour before the healer catches it.',g('vshell',6,1.7),g('mender',1,1,5),g('veil',12,.65,9,'west')),
  w('Both banks at dusk','The two approaches converge below the light.',g('vshell',6,1.5),g('veil',16,.6,3,'west'),g('skiff',5,1.3,12)),
  w('The Umbra Leviathan','Its divided forms need a second line of defence.',g('gloom',1,1,5),g('veil',16,.6),g('vshell',5,1.6,9,'west')),
 ]},
 {id:'below-island',name:'Below the Island',map:3,glow:760,seed:17044,inlet:3,brief:'The island sees the northern fleet twice. The side inlet skips it entirely. Protect both approaches.',reward:'Waterfront Gardens · clear the terraces',resident:'Jori, gardener',line:'Under the silt, the old steps were still there.',preparations:{1:'Long reach makes both passes around the island count.',3:'The inlet opens now. Put damage and control below the island before the next wave.',6:'A quiet front gives you room to prepare a Crown.',8:'Destroy or separate the Dreadnought’s escort to expose its hull.'},waves:[
  w('The return crossing','The upper island sees this fleet twice.',g('wisp',24,.3),g('shell',4,1.6,6)),
  w('Linked ranks','Chains find neighbours in the escort.',g('shell',6,1.4),g('wisp',26,.28,4)),
  w('Below the island','The side fleet bypasses both upper passes.',g('shell',4,1.6),g('skitter',10,.7,3,'west'),g('wisp',16,.35,9,'west')),
  w('Converging wakes','Both fleets meet at the lower basin.',g('shell',6,1.5),g('wisp',26,.3,6,'west'),g('skiff',6,1.2,12)),
  w('The lower repair line','A protected surgeon enters downstream.',g('shell',6,1.3,0,'west'),g('mender',1,1,4,'west'),g('skitter',12,.7,9)),
  w('A moment between fleets','A smaller front. Prepare a Crown or reinforce the outlet.',g('shell',6,2),g('skiff',5,1.8,8,'west')),
  w('Split the defence','Armour upstream, a fast escort below.',g('vshell',7,1.6),g('wisp',30,.3,4,'west'),g('skiff',7,.9,11,'west')),
  w('The Dreadnought','Four linked escorts protect its hull. Break the screen first.',g('warden',1,1,5),g('wisp',28,.3),g('shell',7,1.5,7,'west')),
 ]},
 {id:'repair-convoy',name:'Repair Convoy',map:1,glow:690,seed:17045,inlet:5,brief:'Surgeons keep the convoy moving. Break the repair line with early burst or concentrate fire at a later bend.',reward:'Night Market · light the evening stalls',resident:'Nessa, market keeper',line:'The baker came. We stayed open until the last lamp went out.',preparations:{1:'The first healer is sheltered behind armour. Use strong targeting or catch the whole column in one blast.',5:'The repair fleet now uses both entrances. Keep a finishing weapon at the outlet.',8:'Expect widely spaced heavies before the final crowded assault.',10:'The captain’s signal can be interrupted. Keep a command ready, or break its linked escort.'},waves:[
  w('Sheltered surgeon','The healer follows an armoured front.',g('shell',4,1.5),g('mender',1,1,4),g('drip',14,.6,7)),
  w('Repair in the wake','Concentrated splash breaks the escort.',g('shell',7,1.2),g('mender',1,1,5),g('wisp',26,.3,7)),
  w('Two tenders','Separated healers require sustained pressure.',g('shell',8,1.6),g('mender',2,5,4),g('skitter',12,.8,10)),
  w('Long convoy','Piercing damage rewards a long firing line.',g('shell',12,1.1),g('mender',2,4,6),g('skiff',6,1.6,12)),
  w('Repair below the bridge','The side convoy reaches the last bend sooner.',g('shell',6,1.4),g('shell',6,1.4,3,'west'),g('mender',1,1,6,'west')),
  w('Hidden maintenance','Reveal the front to make heavy damage count.',g('vshell',7,1.5),g('mender',2,3,5),g('veil',16,.7,9,'west')),
  w('Packed berths','A crowded wake gives bursts and chains a target.',g('shell',10,1.2),g('wisp',36,.25,4,'west'),g('mender',2,3,7)),
  w('Empty water between','Isolated heavies test a different weapon.',g('vshell',8,2.6),g('skiff',8,2,6,'west')),
  w('The last repair screen','Break the screen before the captain arrives.',g('shell',12,1.2),g('mender',3,2.5,5),g('skiff',10,1,12,'west')),
  w('The convoy captain','Destroy the escort or interrupt the signal.',g('warden',1,1,6),g('shell',10,1.2),g('mender',2,3,8),g('wisp',30,.3,10,'west')),
 ]},
 {id:'broken-formation',name:'Broken Formation',map:2,glow:740,seed:17046,inlet:4,brief:'Dense escorts alternate with isolated armour. A signature needs a partner that covers its weak encounters.',reward:'Canal Observatory · reopen the dome',resident:'Edda, lens keeper',line:'I can turn the dome again. Tonight the whole canal will see its light.',preparations:{1:'A crowd opens this watch. The next fleet will be spaced apart.',4:'A second entrance opens. Compare coverage at the meeting point.',7:'Armour follows hidden runners. Let sight and heavy damage share a bend.',10:'The Dredger’s exposure windows reward a saved command and focused heavy hits.'},waves:[
  w('Close ranks','Crowd weapons find a full escort.',g('wisp',32,.24),g('shell',5,1.4,6)),
  w('Broken formation','Isolated armour offers few chain targets.',g('shell',8,2.5),g('skiff',4,2,8)),
  w('Ranks reform','The crowd returns behind its repair tender.',g('shell',8,1.2),g('wisp',32,.25,4),g('mender',1,1,7)),
  w('Separate approaches','Side runners bypass the upper defence.',g('shell',6,2),g('skiff',10,1.7,4,'west')),
  w('The crowded meeting','Both wakes meet below the island.',g('wisp',32,.3),g('wisp',26,.3,5,'west'),g('shell',9,1.3,8)),
  w('No neighbours','Heavy first hits matter against separated armour.',g('vshell',8,2.8),g('skiff',8,2,7,'west')),
  w('Hidden front','Sight and heavy damage need shared water.',g('veil',22,.6),g('vshell',9,1.5,6),g('skitter',10,.8,12,'west')),
  w('Repair at the crossing','A dense repair convoy converges below.',g('shell',10,1.2),g('mender',2,3,5),g('wisp',32,.3,8,'west')),
  w('The final interval','A loose front before the captain. Check your outlet.',g('vshell',10,2.2),g('skiff',10,1.7,5,'west')),
  w('Open the core','Concentrate on the Dredger at its marked bends.',g('dredger',1,1,5),g('vshell',8,1.6),g('wisp',32,.3,9,'west')),
 ]},
 {id:'restore-waterway',name:'Restore the Waterway',map:0,glow:740,seed:17047,inlet:5,passage:4,brief:'Reopen the market route. Choose a permanent passage between waves, then defend the consequences.',reward:'Waterfront Gardens · plant the water beds',resident:'Jori, gardener',line:'The children chose lilies. I planted enough for both banks.',preparations:{1:'Build a defence that can move its attention downstream.',4:'After this wave, compare both route previews. Your choice stays fixed for the rest of the mission.',5:'The inlet is open. The new route and its arrivals are shown before you start.',10:'The Brood Captain tests your control and your final line of damage.'},waves:[
  w('Back to the market','Armour and runners share the bend.',g('shell',5,1.5),g('skitter',14,.7,5)),
  w('The old repair route','A surgeon follows a dense escort.',g('shell',8,1.3),g('mender',1,1,5),g('wisp',24,.3,8)),
  w('The covered approach','Scouts open hidden armour to heavy fire.',g('vshell',6,1.7),g('veil',16,.7,5)),
  w('Before the crossing','Finish this fleet, then choose how the canal reopens.',g('shell',10,1.4),g('skiff',7,1.6,8)),
  w('The chosen waterway','Use your passage reward to cover the new route.',g('shell',8,1.4),g('wisp',22,.35,6,'west')),
  w('A divided convoy','The repair line follows the longer approach.',g('vshell',7,1.6),g('mender',2,3,5),g('skiff',8,1.2,9,'west')),
  w('The last extra fleet','This is the final wave carrying your passage’s extra arrivals.',g('shell',10,1.3),g('wisp',30,.3,5,'west')),
  w('Reopened banks','Prepare your Crown for the final pair of fleets.',g('vshell',9,2),g('skiff',9,1.6,7,'west')),
  w('Market under siege','Hidden armour leads a packed repair escort.',g('vshell',10,1.4),g('mender',2,3,6),g('wisp',36,.25,10,'west')),
  w('The returning captain','Break the tether or interrupt the call, then finish the exposed captain.',g('toad',2,7,4),g('vshell',9,1.5),g('skiff',10,1.2,10,'west')),
 ]},
 {id:'last-bloom',name:'Last Bloom',map:3,glow:880,seed:17048,inlet:4,passage:6,brief:'The Matriarch is coming for the gardens. Combine sight, control and focused damage across both banks.',reward:'The whole district · a night in bloom',resident:'Jori, gardener',line:'Leave a lamp by the water. I want to see what opens tonight.',preparations:{1:'This final watch combines the problems you have learned. Give your signature a partner.',4:'The side inlet opens. Check sight and damage below the island.',6:'After this fleet, choose the final passage. Inspect both route previews.',10:'A quieter fleet gives you time to prepare your final Crown.',12:'The Matriarch heals while signalling. Interrupt it or break its tether, then strike the exposed core.'},waves:[
  w('The last watch begins','A dense front arrives behind armour.',g('shell',6,1.4),g('wisp',28,.3,4)),
  w('Repair in shadow','Reveal the front before the healer arrives.',g('vshell',6,1.7),g('mender',1,1,5),g('veil',16,.65,8)),
  w('Separated steel','An isolated front tests focused damage.',g('vshell',8,2.2),g('skiff',8,1.8,6)),
  w('Two dark entrances','Side boats skip the upper defence.',g('veil',18,.65),g('vshell',7,1.7,4,'west'),g('skiff',8,1.2,10,'west')),
  w('The crowded basin','Both repair escorts converge downstream.',g('shell',10,1.3),g('mender',2,3,5),g('wisp',34,.3,7,'west')),
  w('Choose the last passage','The route you choose will remain fixed.',g('vshell',10,1.6),g('skiff',10,1.4,7,'west')),
  w('The siege enters','Cover the new route before spending on another Crown.',g('shell',12,1.2),g('mender',2,3,6),g('veil',20,.6,9,'west')),
  w('Twin repair lines','Each approach carries its own surgeon.',g('vshell',8,1.5),g('mender',1,1,5),g('shell',8,1.4,4,'west'),g('mender',1,1,9,'west')),
  w('Broken siege','Spaced armour interrupts the crowded rhythm.',g('vshell',11,2.4),g('skiff',11,1.8,8,'west')),
  w('The garden holds its breath','A smaller fleet. Prepare your last upgrades.',g('vshell',8,2.2),g('skiff',7,1.8,9,'west')),
  w('The Matriarch’s screen','Keep a command available for the final signal.',g('vshell',12,1.4),g('mender',3,3,5),g('wisp',40,.25,9,'west')),
  w('Last Bloom','Interrupt the healing signal, break the tether and strike while the core is exposed.',g('bloomheart',1,1,6),g('vshell',10,1.5),g('mender',2,4,9),g('skiff',12,1.2,12,'west')),
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
 if(s.planningWave>=2&&!s.towers.some(t=>t.id==='bell'))return {id:'story-control',text:'Add a Chime where your sparks can shoot. Slowing buys another volley.'}
 if(s.wave>=4&&!s.director?.commands)return {id:'story-command',text:s.director?.command?.phase==='held'?'Release your held pulse when the crowd enters your damage towers.':'Hold a pulse. Your Chime stops firing until you release it.'}
 if(s.wave>=2&&s.towers.every(t=>!t.a&&!t.b))return {id:'story-upgrade',text:'Tap a tower to specialise it. Compare reach with stronger attacks.'}
 return null
}
