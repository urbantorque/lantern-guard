import type {Challenge,SaveSnapshotV2,Sim} from './sim'
import type {EnemyId,TowerId} from './defs'
import type {HeroId} from './heroes'
import type {Group,WaveDef} from './waves'

/** A separate rules boundary: published short missions and watches keep their balance. */
export const SIEGE_VERSION=1 as const
export const SIEGE_WAVES=40
export const SIEGE_GLOW=440
export const SIEGE_INLET=17
export const SIEGE_PASSAGE=16
export const SIEGE_ACTS=[
 {name:'First Lights',from:1,to:8,boss:'toad',brief:'Establish the first firing line. Catch runners, break armour and interrupt the captain.',reward:'The market shutters reopen.',resident:'Nessa',line:'I kept the stall keys. I hoped someone would come back.'},
 {name:'The Iron Procession',from:9,to:16,boss:'dredger',brief:'Break repair convoys and invest in specialists. The Dredger opens its core at two bends.',reward:'The market awnings rise. The observatory lens is repaired.',resident:'Edda',line:'The lens still knows how to find a ship in the dark.'},
 {name:'Moon Gates',from:17,to:24,boss:'gloom',brief:'Reopen a passage, prepare for the side inlet and hold hidden fleets in the light.',reward:'Evening stalls light up. The observatory dome reopens.',resident:'Nessa',line:'The baker came. We stayed open until the last lamp went out.'},
 {name:'The Broken Waterway',from:25,to:32,boss:'warden',brief:'Armour and fast escorts attack both banks. Give your signature a partner.',reward:'The garden terraces are cleared and the water beds planted.',resident:'Jori',line:'The children chose lilies. I planted enough for both banks.'},
 {name:'Last Bloom',from:33,to:40,boss:'bloomheart',brief:'Hold the complete defence against coordinated fleets. Break the Matriarch’s healing signal.',reward:'The beacon relights. Night flowers open across the district.',resident:'Jori',line:'Leave a lamp by the water. I want to see what opens tonight.'},
] as const
export const siegeAct=(wave:number)=>SIEGE_ACTS[Math.max(0,Math.min(4,Math.floor((wave-1)/8)))]
export const siegeBoundary=(wave:number)=>wave>=0&&wave<40&&wave%8===0
export function siegeChallenge(hero:HeroId='mira',seed=27041):Challenge {
 return {fixed:1,compact:1,guard:1,depth:1,balance:1,watchDepth:1,watchCraft:1,livingWatch:1,refinedWatch:1,watchExperience:1,watchTactics:1,watchMastery:1,watchDirector:2,siege:SIEGE_VERSION,hero,variant:0,id:'siege1',skirmish:{from:0,to:40,glow:SIEGE_GLOW,seed}}
}
export function siegeTowerWave(c:Challenge,id:TowerId):number|undefined {
 if(!c.siege)return undefined
 return ({wick:1,bell:c.hero==='mira'?1:2,cracker:c.hero==='sol'?2:4,storm:c.hero==='ivo'?3:11,garden:9,owl:12,beam:13,ballista:19})[id]
}
/** Original plot/bond thresholds are mapped explicitly; no early Crown rush. */
export const siegeUnlock=(c:Challenge,n:number)=>c.siege?({6:5,11:17,16:17,21:25,26:29,31:33} as Record<number,number>)[n]??n:undefined
export const siegeReward=(wave:number)=>95+wave*9+(wave%8===0?130:0)
export const siegeHeld=(s:Pick<Sim,'wave'|'waveActive'|'over'>)=>Math.max(0,s.wave-(s.waveActive||s.over==='lost'?1:0))
export const siegeCheckpointWave=(s:Pick<Sim,'wave'|'waveActive'|'over'>)=>Math.min(32,Math.floor(siegeHeld(s)/8)*8)
export function sameSiege(a:SaveSnapshotV2,b:SaveSnapshotV2){
 return a.challenge.siege===1&&b.challenge.siege===1&&a.seed===b.seed&&a.difficulty===b.difficulty&&a.challenge.hero===b.challenge.hero&&a.challenge.id===b.challenge.id
}
export const SIEGE_RESTORATION={market:[8,16,24],observatory:[16,24,40],gardens:[24,32,40]} as const
export const SIEGE_PREPARATIONS:Record<number,string>={
 1:'Your defence stays with you for all 40 waves. Place sparks beside the upper bend; add control over the same water.',
 4:'Choose a keeper signature. Bank its command when you can afford to pause that tower, then release into a useful target.',
 8:'The Brood Captain links an escort before calling reinforcements. Break that tether or interrupt its signal.',
 9:'First Lights held. Your towers, glow and remaining light carry on. Repair convoys are approaching; prepare heavy damage.',
 16:'The Dredger exposes its core at two marked bends. Hold it in overlapping damage. After this wave, choose a permanent passage.',
 17:'The second entrance opens. The arches reveal hidden fleets for six seconds. Place sight and finishing damage below the meeting point. Crowns are now available.',
 24:'The Leviathan divides at the meeting stone. Keep finishing damage beyond it.',
 25:'Moon Gates held. Both banks now face coordinated attacks. Strengthen the gaps around your first Crowns.',
 32:'Four linked escorts protect the Dreadnought. Clear or separate the escort, then focus the exposed hull.',
 33:'The waterway held. The final eight waves combine hidden armour, repair lines and fast flanks. Your first towers still guard the canal.',
 40:'The Matriarch heals while signalling. Break its tether or interrupt the channel, then strike the exposed core.',
}
const g=(type:EnemyId,count:number,gap=.8,at=0,src:Group['src']='north'):Group=>({type,count,gap,at,src})
const w=(encounter:string,note:string,...groups:Group[]):WaveDef=>({encounter,note,groups})
export const SIEGE_ENCOUNTERS:WaveDef[]=[
 w('Light the bend','Place your first damage tower beside the upper bend.',g('drip',10,1.4)),
 w('Fast water','Slowing runners gives sparks another volley.',g('drip',8,1),g('skitter',5,1.2,7)),
 w('Shared water','Let control and damage cover the same bend.',g('drip',18,.6),g('skitter',6,.8,9)),
 w('A signature in the dark','Choose a signature and try its held command.',g('drip',20,.4),g('shell',2,2,6)),
 w('Copper at the gate','A small armoured front tests heavy damage.',g('shell',4,1.7),g('drip',16,.55,5)),
 w('The first packed wake','Blast the crowd behind the front.',g('shell',5,1.4),g('wisp',24,.28,6),g('skitter',6,.9,13)),
 w('Before the captain','A shorter crossing. Strengthen the firing line.',g('shell',4,2),g('skitter',8,1,8)),
 w('The Brood Captain','Break its linked escort or interrupt the call.',g('toad',1,1,5),g('shell',4,1.5),g('wisp',24,.3,9)),
 w('Iron on the horizon','Your existing defence faces a heavier front.',g('shell',9,1.4),g('wisp',28,.3,6)),
 w('The sheltered surgeon','Break the armour before its repairs catch up.',g('shell',10,1.2),g('mender',1,1,5),g('skitter',12,.65,11)),
 w('Long firing lines','A long column rewards piercing shots.',g('shell',13,1.3),g('wisp',34,.25,5)),
 w('Separate hulls','Spread-out armour gives splash fewer neighbours.',g('shell',12,2),g('skiff',6,1.8,7)),
 w('Twin repair tenders','Keep pressure on the column as each healer arrives.',g('shell',14,1.3),g('mender',2,5,4),g('wisp',32,.3,10)),
 w('The foundry closes ranks','Armour leads a fast packed wake.',g('shell',17,1),g('skiff',9,.9,7),g('wisp',36,.24,10)),
 w('Water before the engine','A shorter front. Prepare the Dredger’s firing windows.',g('shell',11,1.8),g('skiff',7,1.5,8)),
 w('The Dredger','Commit heavy damage when its core opens at the bends.',g('dredger',1,1,5),g('shell',14,1.2),g('mender',1,1,9),g('wisp',32,.3,12)),
 w('Through the moon gates','A small hidden fleet teaches the arches. Side runners follow.',g('veil',18,.65),g('shell',8,1.5,5),g('skitter',6,.9,12,'west')),
 w('Between the lights','Keep attacks covering the exit from each revealing arch.',g('veil',26,.55),g('shell',12,1.4,5),g('wisp',18,.4,10,'west')),
 w('Shadow and shell','Hidden armour needs shared sight and heavy damage.',g('vshell',9,1.6),g('veil',22,.6,5),g('skiff',7,1.3,12,'west')),
 w('Two dark entrances','The lower arch serves both approaches.',g('vshell',10,1.5),g('veil',22,.6,4,'west'),g('skitter',12,.6,13)),
 w('The hidden repair line','Expose the front before the healer arrives.',g('vshell',12,1.4),g('mender',2,4,5),g('veil',26,.5,10,'west')),
 w('Converging wakes','Two dense fleets meet downstream.',g('shell',18,1.1),g('wisp',42,.25,5,'west'),g('vshell',8,1.5,12)),
 w('Before the dividing current','A smaller crossing. Reinforce beyond the meeting stone.',g('vshell',11,2),g('skiff',9,1.5,8,'west')),
 w('The Umbra Leviathan','Its divided forms need a second line of damage.',g('gloom',1,1,5),g('vshell',13,1.5),g('veil',28,.5,9,'west')),
 w('The broken waterway','A heavy northern fleet draws fire before the lower wake.',g('shell',20,1.1),g('mender',2,4,5),g('skiff',12,.9,12,'west')),
 w('Ranks without neighbours','Isolated heavy targets test focused damage.',g('vshell',17,2),g('skiff',13,1.5,7,'west')),
 w('The crowded crossing','A dense escort returns on both banks.',g('shell',20,1),g('wisp',48,.24,5,'west'),g('mender',2,4,8)),
 w('Repair from below','Protect the lower bend against its own repair convoy.',g('vshell',14,1.4),g('shell',13,1.3,5,'west'),g('mender',2,3,9,'west')),
 w('Steel and splinters','Splitting hulls leave a second crowd behind the front.',g('vshell',16,1.4),g('bloat',13,1.2,4),g('skiff',14,1,12,'west')),
 w('Two-bank siege','Heavy northern armour, then a crowded side assault.',g('vshell',20,1.3),g('mender',2,4,5),g('wisp',50,.23,9,'west'),g('skiff',10,1.1,17,'west')),
 w('Before the shield','A shorter front. Prepare escort-clearing fire.',g('vshell',14,1.9),g('skiff',12,1.4,8,'west')),
 w('The Dreadnought','Four linked escorts shield the hull. Break the screen.',g('warden',1,1,5),g('vshell',18,1.3),g('wisp',42,.26,10,'west')),
 w('The garden under siege','The last eight waves test the entire defence.',g('vshell',21,1.3),g('mender',2,3,6),g('skiff',16,1,11,'west')),
 w('Twin repair lines','Each bank carries its own surgeon.',g('vshell',16,1.3),g('mender',2,3,6),g('shell',18,1.2,3,'west'),g('mender',1,1,10,'west')),
 w('Broken formation','Widely spaced hulls stretch every firing window.',g('vshell',23,1.9),g('skiff',19,1.3,8,'west')),
 w('The last crowded basin','Clear the wake before its repair escort arrives.',g('shell',26,1),g('wisp',62,.22,5,'west'),g('mender',3,3,10),g('bloat',12,1.2,15,'west')),
 w('The veiled advance','Sight and heavy damage must serve both banks.',g('vshell',23,1.3),g('veil',40,.45,3,'west'),g('skiff',18,1,14,'west')),
 w('The Matriarch’s screen','Sheltered surgeons lead a coordinated final assault.',g('vshell',26,1.2),g('mender',3,3,6),g('wisp',58,.23,8,'west'),g('skiff',16,.9,17,'west')),
 w('The garden holds its breath','A shorter fleet. Spend your last reserve and prepare a command.',g('vshell',18,1.8),g('skiff',14,1.4,9,'west')),
 w('Last Bloom','Break the healing tether, interrupt the signal and strike the exposed core.',g('bloomheart',1,1,6),g('vshell',24,1.3),g('mender',3,4,9),g('skiff',20,1,14,'west')),
]
export const siegeWave=(n:number)=>SIEGE_ENCOUNTERS[Math.max(0,Math.min(39,n-1))]
