export interface AudioScene {
  night:boolean
  weather:'clear'|'rain'|'mist'|'breeze'
  hero?:'sol'|'mira'|'ivo'
  wave?:number
  playing?:boolean
  boss?:boolean
}
export type Voice='bass'|'pad'|'pluck'|'bell'|'lead'|'kick'|'hat'
export interface ScoreNote {voice:Voice; midi:number; length:number; gain:number; pan:number}

// An original 32-bar piece: opening, answer, bridge and return. The second
// pass changes melody register and accompaniment, rather than looping 8 bars.
const chords=[
  [50,4],[45,4],[47,3],[43,4],[50,4],[45,4],[43,4],[45,4],
  [47,3],[43,4],[50,4],[45,4],[47,3],[40,3],[43,4],[45,4],
  [40,3],[47,3],[43,4],[50,4],[40,3],[47,3],[43,4],[45,4],
  [50,4],[45,4],[47,3],[43,4],[40,3],[45,4],[43,4],[50,4],
]
const phrases=[
  [0,-1,2,1,-1,4,2,-1], [4,-1,2,-1,1,2,0,-1],
  [2,1,-1,0,2,-1,4,3], [1,-1,0,-1,2,1,0,-1],
  [4,-1,3,2,-1,1,2,-1], [2,4,-1,5,4,-1,2,1],
  [0,2,1,-1,4,2,-1,1], [2,-1,1,-1,0,-1,-1,-1],
]
export function scoreStep(step:number,scene:AudioScene,intensity:number):ScoreNote[] {
  const beat=step%16,bar=Math.floor(step/16)%32,pass=Math.floor(step/512)%2
  const section=Math.floor(bar/8),chapter=Math.min(3,Math.floor((scene.wave??0)/10))
  const [root,third]=chords[bar],notes:ScoreNote[]=[]
  const add=(voice:Voice,midi:number,length:number,gain:number,pan=0)=>notes.push({voice,midi,length,gain,pan})
  const active=scene.playing??false,energy=Math.max(0,Math.min(1,intensity))
  const tones=[0,third,7,12,14,19],hero=scene.hero??'sol'
  if(beat===0){
    add('bass',root-12,scene.night?2.8:1.6,.13)
    for(const [i,n]of [0,7,third+12].entries())add('pad',root+n,3.5,.025,[-.5,.1,.5][i])
  }
  if(beat===8&&active&&(chapter>0||scene.boss))add('bass',root-5,1,.065)
  const phrase=phrases[(bar%8+(hero==='mira'?2:hero==='ivo'?4:0))%8]
  // Breathing room at the end of each phrase is part of the composition.
  if(beat%2===0&&!(bar%4===3&&beat>10)){
    const degree=phrase[beat/2]
    if(degree>=0){
      const octave=section===2?-12:pass&&bar%4<2?12:0
      const voice=scene.night?'bell':hero==='ivo'?'lead':'pluck'
      add(voice,root+12+tones[degree]+octave,hero==='mira'?1.7:1.05,.09,Math.sin(bar*1.7)*.22)
    }
  }
  // The accompaniment joins progressively, then thins out for the bridge.
  if((beat===3||beat===11||chapter>=2&&beat===7)&&section!==2){
    add('pluck',root+tones[(bar+beat+pass)%4],.65,.034,beat<8?-.42:.42)
  }
  if((chapter>=1||section===1)&&beat===14&&bar%2===0)add('bell',root+24+third,1.8,.033,.35)
  if(scene.boss&&beat%4===2)add('lead',root+(beat%8===2?0:7),.28,.042,-.2)
  if(active&&energy>.12){
    if(beat===0||beat===8||scene.boss&&beat===10)add('kick',36,.16,.09*(.5+energy*.5))
    if(beat===4||beat===12)add('hat',0,.07,.018+energy*.013,.15)
    if((chapter>=2||scene.boss)&&beat%4===2)add('hat',0,.035,.01,-.15)
  }
  return notes
}
export const scoreInterval=(scene:AudioScene)=>scene.boss?.19:scene.night?.23:.21
