import type {Sim} from './sim'
import {ENEMIES,type EnemyId,type TowerId} from './defs'
import {siegeHeld,SIEGE_ACTS} from './siege'
import {ROLE_NAMES} from './watch-clarity'

/** These cues describe live mechanics, never simulated damage or invented percentages. */
export const COACH:Record<string,{tower:TowerId;enemy?:EnemyId;title:string;effect:string}>={
 'siege2-place':{tower:'wick',title:'Cover the bend',effect:'Gold water is in range. More covered water means more shots.'},
 'siege2-slow':{tower:'bell',enemy:'skitter',title:'Give your Spark more time',effect:'Build Chime before upgrading Spark. Shared coverage slows runners under fire.'},
 'siege2-armour':{tower:'cracker',enemy:'shell',title:'Break the shell',effect:'Save for a Blast before more upgrades. It hits armour hard over the same bend.'},
 'siege2-hidden':{tower:'owl',enemy:'veil',title:'Reveal the fleet',effect:'Scout reveals hidden enemies so your damage towers can hit them.'},
 'siege2-night':{tower:'owl',title:'Save sunlight for night',effect:'Support Scouts store daylight and spend it on nearby attacks at night.'},
 'siege2-healer':{tower:'cracker',enemy:'mender',title:'Break the repair escort',effect:'Heavy damage and interrupts stop a healer from undoing your attacks.'},
 'siege2-upgrade':{tower:'wick',title:'Change the weapon',effect:'Select a tower, then choose a specialisation for the next threat.'},
}

export function threatPlan(s:Sim,wave=s.planningWave):{title:string;text:string;tower:TowerId}|null{
 if(!s.challenge.siege)return null
 const ids=new Set(s.waveDef(Math.min(s.finalWave,Math.max(1,wave))).groups.map(g=>g.type))
 if(ids.has('dredger'))return {title:'Ambush the exposed core',text:'Stack Blast or Beam coverage at the two marked bends. Slow the Dredger while its core is open.',tower:'cracker'}
 if(ids.has('gloom'))return {title:'Prepare for the split',text:'Put Scout sight and a Beam or Bolt beyond the stone. Chains need a finishing weapon against separated targets.',tower:'beam'}
 if(ids.has('warden'))return {title:'Clear the escorts first',text:'Overlap Blast and Chime coverage. The Dreadnought loses its shield when its escorts fall.',tower:'cracker'}
 if(ids.has('bloomheart'))return {title:'Interrupt the healing signal',text:'Watch the bright tether. Break its escort or interrupt the Matriarch, then strike the open core.',tower:'bell'}
 if(ids.has('toad'))return {title:'Stop the brood call',text:'Break the glowing escort or interrupt the Mire Tyrant. Save your command for the signal.',tower:'bell'}
 if(ids.has('veil')||ids.has('vshell'))return {title:'Keep the fleet in sight',text:'Place a Scout where your attacks overlap. Hidden enemies need to be revealed before most towers can hit.',tower:'owl'}
 if(ids.has('mender'))return {title:'Break the repair convoy',text:'Concentrate heavy damage on the escort. Chime control keeps the convoy under fire.',tower:'cracker'}
 if(ids.has('shell')||ids.has('vshell'))return {title:'Armour incoming',text:'Build or specialise a Blast over your main firing bend. Sparks alone struggle against shells.',tower:'cracker'}
 if(ids.has('skiff')||ids.has('skitter'))return {title:'Catch the runners',text:'Put a Chime beside your damage towers. Shared coverage buys extra hits.',tower:'bell'}
 return {title:'Hold the firing line',text:'Cover a long bend, then strengthen the water nearest the lantern.',tower:'wick'}
}

export function recoveryPlan(s:Sim,leak=s.lastLeak){
 if(!leak)return null
 const cause=leak.detail?.cause??(leak.hidden?'hidden':leak.armoured?'armour':'pressure')
 const boss=ENEMIES[leak.enemy].boss?threatPlan(s,leak.wave):null
 const tower:TowerId=boss?.tower??(cause==='hidden'?'owl':cause==='armour'?'cracker':cause==='runaway'?'bell':'wick')
 const action={hidden:'Add Scout sight over your finishing towers.',armour:'Add or specialise a Blast on the final bend.',runaway:'Overlap a Chime with your finishing damage.',coverage:'Add damage over the final bend.',pressure:'Specialise your finishing damage and save the command for the crowded front.'}[cause]
 const point=leak.detail?{x:leak.detail.x,y:leak.detail.y}:s.level.def.home
 const plots=s.pads.map((p,index)=>({index,distance:Math.hypot(p.x-point.x,p.y-point.y)})).filter(p=>s.padAvailable(p.index)&&!s.pads[p.index].tower).sort((a,b)=>a.distance-b.distance)
 return {tower,role:ROLE_NAMES[tower],text:boss?.text??action,point,plot:plots[0]?.index,cause}
}

export function campaignMilestone(s:Sim){
 if(!s.challenge.siege)return null
 const held=siegeHeld(s)
 const milestones=[{wave:5,title:'Reopen the first shop',done:'First shop reopened'},...SIEGE_ACTS.map((a,i)=>({wave:a.to,title:['Reopen the night market','Repair the observatory','Light the moon gates','Plant the waterfront gardens','Relight the beacon'][i],done:a.reward}))]
 const next=milestones.find(m=>m.wave>held)
 return next?{...next,left:next.wave-held,label:`${next.title} · ${next.wave-held} ${next.wave-held===1?'wave':'waves'} to hold`}:{wave:40,title:'The city is awake',done:'The city is awake',left:0,label:'The city is awake · 40 waves held'}
}
