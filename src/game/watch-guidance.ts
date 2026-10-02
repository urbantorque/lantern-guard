import type { Sim } from './sim'
import { enemyName } from './bestiary'
import { BESTIARY } from './bestiary'

export function watchLesson(s:Sim,seen:readonly string[]=[]){
  if(s.challenge.refinedWatch)return openingLesson(s,seen)
  if(!s.challenge.watchCraft||s.wave>10)return null
  const hints=[
    {id:'bend',when:s.towers.length===1,text:'Cover a bend. Enemies spend longer in tower range.'},
    {id:'hidden',when:s.enemies.some(e=>e.alive&&e.def.hidden)&&!s.towers.some(t=>t.id==='owl'),text:'Glass creatures are hidden. Add a scout so nearby towers can hit them.'},
    {id:'night',when:!s.sky.night&&s.sky.phaseLeft<18,text:'Night is close. Scouts shelter nearby towers from lost reach.'},
    {id:'branch',when:s.towers.some(t=>t.a+t.b===1)&&s.wave>=3,text:'Choose a tower’s specialisation. Its other branch closes for this watch.'},
  ]
  return hints.find(h=>h.when&&!seen.includes(h.id))??null
}
export function watchInsights(s:Sim):string[]{
  const top=[...s.towers].sort((a,b)=>(b.damageDealt??0)-(a.damageDealt??0))[0]
  const lines=top&&(top.damageDealt??0)>0?[`${top.def.name} led damage: ${Math.round(top.damageDealt??0).toLocaleString()}.`]:[]
  const seen=s.towers.reduce((n,t)=>n+t.spotted,0),slows=s.towers.reduce((n,t)=>n+t.slowed,0)
  if(seen)lines.push(`Scouts revealed ${seen} hidden foes.`)
  else if(slows)lines.push(`Chimes landed ${slows} slowing hits.`)
  const leak=Object.entries(s.stats.leaksBy).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]
  if(leak)lines.push(`${enemyName(leak[0] as keyof typeof s.stats.leaksBy)} cost the most light: ${leak[1]}.`)
  if(s.challenge.livingWatch&&leak)return [...lines.slice(0,2),`Next watch: ${BESTIARY[leak[0] as keyof typeof BESTIARY].counter}`]
  return lines.slice(0,3)
}

/** One lesson at a time; live threats outrank optional advice. Nothing pauses combat. */
function openingLesson(s:Sim,seen:readonly string[]){
  if(s.over||s.wave>10)return null
  const heavy=s.towers.some(t=>t.stats.heavy||t.id==='cracker'),scout=s.towers.some(t=>t.id==='owl')
  const specialised=s.towers.find(t=>Math.max(t.a,t.b)>=2)
  return [
    {id:'refined-hidden',when:s.enemies.some(e=>e.alive&&e.def.hidden)&&!scout,text:'Glass creatures need sight. Add a scout beside your attacks.'},
    {id:'refined-armour',when:s.wave>=5&&!heavy,text:'Copper shells resist sparks. Build a blast tower before the next wave.'},
    {id:'refined-night',when:!s.sky.night&&s.sky.phaseLeft<20&&s.keeperAllowed('owl')&&s.towers.some(t=>['cracker','storm','ballista'].includes(t.id)&&!s.sheltered(t)),text:'Night is close. A nearby scout preserves your heavy towers’ reach.'},
    {id:'refined-place',when:!s.towers.length,text:'Tap the lit plot. The upper bend gives your first tower more time to fire.'},
    {id:'refined-slow',when:s.wave>=3&&!s.towers.some(t=>t.id==='bell'),text:'Fins move fast. Put a chime where your attacks overlap.'},
    {id:'refined-branch',when:s.wave>=2&&!specialised&&s.towers.some(t=>(s.specialiseCost(t)??Infinity)<=s.glow),text:'Tap your tower and choose a specialisation. Its weapon changes immediately.'},
    {id:'refined-chosen',when:!!specialised&&s.wave<=5,text:'Your specialisation is active. Watch its new weapon handle the next crowd.'},
    {id:'refined-flow',when:s.towers.length===1&&s.wave<=2,text:'Keep building while the watch runs. Waves follow automatically.'},
  ].find(h=>h.when&&!seen.includes(h.id))??null
}
