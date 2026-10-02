import type { Sim } from './sim'
import { enemyName } from './bestiary'

export function watchLesson(s:Sim,seen:readonly string[]=[]){
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
  return lines.slice(0,3)
}
