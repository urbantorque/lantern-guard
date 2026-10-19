import type {Sim,WaveReport,LeakReport} from './sim'
import {ENEMIES,type EnemyId} from './defs'
import {enemyName} from './bestiary'
import type {BreachCause} from './watch-tactics'

export function recordBreach(report:WaveReport,leak:LeakReport,light:number){
 report.escaped??={};report.causes??={}
 report.escaped[leak.enemy]=(report.escaped[leak.enemy]??0)+light
 const cause=leak.hidden?'hidden':leak.armoured?'armour':leak.detail?.cause??'pressure'
 report.causes[cause]=(report.causes[cause]??0)+light
}

export function waveDiagnosis(s:Sim,wave=s.lastLeak?.wave??s.wave){
 const report=s.waveReports.find(r=>r.wave===wave)
 const losses=Object.entries(report?.escaped??{}).sort((a,b)=>b[1]-a[1]) as [EnemyId,number][]
 if(!losses.length)return null
 const causes=Object.entries(report?.causes??{}).sort((a,b)=>b[1]-a[1]) as [BreachCause,number][]
 const [enemy,light]=losses[0],total=losses.reduce((n,[,v])=>n+v,0),cause=causes[0]?.[0]??'pressure'
 const observation={hidden:'escaped while hidden',armour:'escaped with armour remaining',runaway:'escaped after accelerating, with no slow at the lower bend',coverage:'escaped with no damage coverage at the sampled lower bend',pressure:'escaped despite damage coverage at the lower bend'}[cause]
 return {enemy,cause,total,light,summary:`Wave ${wave}: ${total} light lost. ${enemyName(enemy)} accounted for ${light}.`,observation:`${causes[0]?.[1]??total} light lost to enemies that ${observation}.`,boss:!!ENEMIES[enemy].boss}
}
