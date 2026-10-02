export interface AudioScene {
  night:boolean
  weather:'clear'|'rain'|'mist'|'breeze'
  hero?:'sol'|'mira'|'ivo'
  wave?:number
  playing?:boolean
  boss?:boolean
  overture?:boolean
  district?:number
  outcome?:'won'|'lost'|null
}
export type Voice='bass'|'pad'|'pluck'|'bell'|'lead'|'kick'|'hat'|'marimba'|'reed'|'brush'|'strings'|'felt'|'harp'
export interface ScoreNote {voice:Voice; midi:number; length:number; gain:number; pan:number}

// An original 32-bar piece: opening, answer, bridge and return. The second
// pass changes melody register and accompaniment, rather than looping 8 bars.
const chords=[
  [50,4],[45,4],[47,3],[43,4],[50,4],[45,4],[43,4],[45,4],
  [47,3],[43,4],[50,4],[45,4],[47,3],[40,3],[43,4],[45,4],
  [40,3],[47,3],[43,4],[50,4],[40,3],[47,3],[43,4],[45,4],
  [50,4],[45,4],[47,3],[43,4],[40,3],[45,4],[43,4],[50,4],
]
// Each hero has a composed eight-bar theme. -1 is a deliberate breath.
const themes={
  sol:[
    [0,-1,2,1,-1,4,2,-1],[4,-1,2,-1,1,2,0,-1],
    [2,1,-1,0,2,-1,4,3],[1,-1,0,-1,2,1,0,-1],
    [4,-1,3,2,-1,1,2,-1],[2,4,-1,5,4,-1,2,1],
    [0,2,1,-1,4,2,-1,1],[2,-1,1,-1,0,-1,-1,-1],
  ],
  mira:[
    [4,-1,-1,2,3,-1,1,-1],[2,-1,1,-1,0,-1,-1,2],
    [3,-1,4,-1,2,1,-1,-1],[1,-1,-1,0,-1,2,0,-1],
    [5,-1,4,-1,3,-1,2,-1],[4,3,-1,2,-1,1,-1,2],
    [2,-1,0,-1,1,-1,2,-1],[1,-1,-1,0,-1,-1,-1,-1],
  ],
  ivo:[
    [0,2,-1,0,-1,3,-1,2],[1,-1,3,2,-1,1,-1,0],
    [2,4,-1,2,1,-1,3,-1],[2,-1,1,0,-1,2,-1,-1],
    [3,1,-1,4,-1,2,0,-1],[2,-1,5,4,-1,3,-1,1],
    [0,2,-1,3,2,-1,1,-1],[2,-1,1,-1,0,-1,-1,-1],
  ],
}
export function scoreStep(step:number,scene:AudioScene,intensity:number):ScoreNote[] {
  const beat=step%16,bar=Math.floor(step/16)%32,pass=Math.floor(step/512)%2
  const section=Math.floor(bar/8),chapter=Math.min(3,Math.floor((scene.wave??0)/10))
  const district=Math.max(0,Math.min(3,scene.district??0))
  // Each waterway has a harmonic route and motif, with a 64-bar return variation.
  const chordBar=(bar+[0,8,16,24][district])%32
  const [root,third]=chords[chordBar],notes:ScoreNote[]=[]
  const add=(voice:Voice,midi:number,length:number,gain:number,pan=0)=>{
    // Deterministic phrasing: softer offbeats and a gradual answer within each phrase.
    const touch=beat%4===0?1:beat%2===0?.9:.8
    notes.push({voice,midi:Math.max(0,Math.min(91,midi)),length,gain:gain*touch,pan})
  }
  const active=scene.playing??false,energy=Math.max(0,Math.min(1,intensity))
  const tones=[0,third,7,12,14,19],hero=scene.hero??'sol'
  if(scene.outcome){
    // Leave room for the result fanfare, then settle into an unhurried coda.
    if(beat===0){add('bass',root-12,2.8,.09);add('strings',root+(scene.outcome==='won'?third:3),3.4,.055,-.2)}
    if(beat===4||beat===12)add('bell',root+12+(beat===4?7:0),2.2,.05,.2)
    return notes
  }
  if(beat===0){
    add('bass',root-12,scene.night?2.8:1.6,.13)
    for(const [i,n]of [0,7,third+12].entries())add(section===2?'strings':'pad',root+n,3.5,.023,[-.5,.1,.5][i])
  }
  if(beat===8&&active&&(chapter>0||scene.boss))add('bass',root-5,1,.065)
  const phrase=themes[hero][(bar+district*2)%8]
  // Breathing room at the end of each phrase is part of the composition.
  if(beat%2===0&&!(bar%4===3&&beat>10)&&!(energy>.75&&beat===6)){
    const degree=phrase[beat/2]
    if(degree>=0){
      const octave=section===2?-12:pass&&bar%4<2?12:0
      const voice:Voice=scene.night?(section===2?'reed':'felt'):hero==='ivo'?'marimba':hero==='mira'?'harp':'felt'
      add(voice,root+12+tones[degree]+octave,hero==='mira'?1.8:1.25,energy>.75?.067:.085,Math.sin(bar*1.7)*.22)
    }
  }
  // The accompaniment joins progressively, then thins out for the bridge.
  if((beat===3||beat===11||chapter>=2&&beat===7)&&section!==2&&energy<.8){
    add(hero==='mira'?'felt':'harp',root+tones[(bar+beat+pass)%4],.85,.03,beat<8?-.42:.42)
  }
  if((chapter>=1||section===1)&&beat===14&&bar%2===0&&energy<.8)add('bell',root+24+third,1.8,.033,.35)
  if(scene.boss&&beat%4===2)add('lead',root+(beat%8===2?0:7),.28,.042,-.2)
  // An answering phrase in the second half leaves the lead room to breathe.
  if(section>=2&&bar%2===1&&(beat===5||beat===13))add(scene.night?'marimba':'reed',root+tones[(bar+district+pass)%4],.85,.04,beat===5?-.38:.38)
  // A four-bar hero signature answers the main melody. It changes register at dusk.
  const signatures={sol:[0,4,7,12],mira:[7,5,2,0],ivo:[0,7,2,9]}
  if(bar%8>=4&&beat===10&&energy<.7)add('strings',root+(scene.night?0:12)+signatures[hero][bar%4],1.8,.045,-.25)
  if(bar%8===7&&beat===12&&energy<.8){
    add('felt',root+12,1.9,.048,-.12)
    add('harp',root+7,1.6,.025,.18)
  }
  // Earned district arrangement: a restrained answering line, once per phrase.
  if(scene.overture&&bar%4===2&&(beat===5||beat===9||beat===13))add(scene.night?'bell':'lead',root+12+[7,third+12,12][(beat-5)/4],1.25,.038,beat===9?.3:-.3)
  if(active&&energy>.12){
    if(beat===0||beat===8||scene.boss&&beat===10)add('kick',36,.16,.09*(.5+energy*.5))
    if(beat===4||beat===12)add(scene.night?'brush':'hat',0,scene.night?.18:.07,.018+energy*.013,.15)
    if((chapter>=2||scene.boss)&&beat%4===2)add('hat',0,.035,.01,-.15)
  }
  return notes
}
export const scoreInterval=(scene:AudioScene)=>scene.outcome?.28:scene.boss?.19:scene.night?.23:.21
