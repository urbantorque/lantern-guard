import { decodeRun, encodeRun, storageChanged, validSnapshot } from './save-store'
import { Sim, type SaveSnapshotV2 } from './sim'
import type { Difficulty, EnemyId } from './defs'
import { ENEMIES } from './defs'
import { loadSettings } from './progress'
import { isHero, type HeroId } from './heroes'

const PREFIX = 'lanternlocks.fixed1.'
export type Slot = 'campaign' | 'commission'
export interface FixedRecord { wave: number; light: number; won: boolean; practice: boolean }
export interface VillageProfile {
  v: 1
  guardian?: string
  lastHero?: HeroId
  records: Record<string,FixedRecord>
  credits: Record<string,{wave:number;journal:Partial<Record<EnemyId,number>>}>
  commissions: string[]
  journal: Partial<Record<EnemyId,number>>
  settlement: number
  lastMap: number
  settings: { largeText:boolean; reducedMotion:boolean; muted:boolean; clearPalette:boolean; music:boolean; effects:boolean }
}
export let storageMessage = ''
export function readJSON(key:string): unknown { try {return JSON.parse(localStorage.getItem(PREFIX+key) ?? 'null')} catch { return null } }
export function writeJSON(key:string,value:unknown) { try { localStorage.setItem(PREFIX+key,JSON.stringify(value)); storageChanged(); return true } catch {storageMessage='Saving is unavailable. Keep this tab open to preserve your current watch.'; return false} }
export function loadVillage(): VillageProfile {
  const legacy=loadSettings()
  const empty: VillageProfile = {v:1,guardian:legacy.guardian,records:{},credits:{},commissions:[],journal:{},settlement:0,lastMap:0,settings:{largeText:legacy.bigText===true,reducedMotion:legacy.reduceMotion===true||(legacy.reduceMotion===null&&typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches),muted:legacy.muted===true,clearPalette:legacy.palette==='clear',music:true,effects:true}}
  const p=readJSON('profile') as VillageProfile | null
  if(!p || p.v!==1 || !p.records || !p.credits || !Array.isArray(p.commissions) || !p.journal || !p.settings) return empty
  const nonnegative=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0
  const journal=(j:unknown)=>!!j&&typeof j==='object'&&!Array.isArray(j)&&Object.entries(j).every(([k,n])=>Object.hasOwn(ENEMIES,k)&&nonnegative(n))
  if(!nonnegative(p.settlement)||p.settlement>4||!Number.isInteger(p.lastMap)||p.lastMap<0||p.lastMap>3||!journal(p.journal)||!Object.values(p.settings).every(v=>typeof v==='boolean'))return empty
  if(!Object.values(p.records).every(r=>r&&nonnegative(r.wave)&&r.wave<=40&&nonnegative(r.light)&&typeof r.won==='boolean'&&typeof r.practice==='boolean'))return empty
  if(!Object.values(p.credits).every(c=>c&&nonnegative(c.wave)&&journal(c.journal)))return empty
  return {...empty,...p,lastHero:isHero(p.lastHero)?p.lastHero:'sol',guardian:['lantern','ember','reed','tide'].includes(p.guardian??'')?p.guardian:'lantern',commissions:p.commissions.filter(id=>['market','glass','garden'].includes(id)),settings:{...empty.settings,...p.settings}}
}
export function loadWatch(slot:Slot): {snapshot:SaveSnapshotV2;blooms:number[]} | null {
  try {
    for(const suffix of ['','.backup']) {
      const run=decodeRun(localStorage.getItem(PREFIX+slot+suffix))
      if(run?.snapshot.v===2 && run.snapshot.challenge.fixed===1) { if(suffix) storageMessage='Recovered your previous complete save.'; return {snapshot:run.snapshot,blooms:run.blooms} }
    }
  } catch {storageMessage='Saving is unavailable. Your current watch stays in this tab.'}
  return null
}
export function saveWatch(sim:Sim,blooms:number[],slot:Slot):boolean {
  const snap=sim.snapshot()
  if(!validSnapshot(snap)) { storageMessage='This watch could not be saved. Your previous save is safe.'; return false }
  try {
    const key=PREFIX+slot,old=localStorage.getItem(key)
    if(decodeRun(old)) {try {localStorage.setItem(key+'.backup',old!)} catch {/* Primary may still fit. */}}
    localStorage.setItem(key,encodeRun(snap,blooms)); storageMessage=''; storageChanged(); return true
  } catch {storageMessage='Saving is unavailable. Keep this tab open to preserve your current watch.'; return false}
}
export function recordWatch(profile:VillageProfile,sim:Sim) {
  const held=sim.wave-(sim.waveActive || sim.over==='lost'?1:0)
  const id=`${sim.seed}:${sim.challenge.variant}:${sim.difficulty}:${sim.challenge.id??'campaign'}${sim.challenge.hero?':'+sim.challenge.hero:''}`
  const credit=profile.credits[id] ?? {wave:0,journal:{}}
  for(const [enemy,count] of Object.entries(sim.stats.cheered)) {
    const e=enemy as EnemyId, n=count??0
    profile.journal[e]=(profile.journal[e]??0)+Math.max(0,n-(credit.journal[e]??0))
    credit.journal[e]=Math.max(n,credit.journal[e]??0)
  }
  credit.wave=Math.max(held,credit.wave); profile.credits[id]=credit
  // High-water marks make retries and a reload of the same seed idempotent.
  const recordKey=`${sim.challenge.id??sim.challenge.variant}:${sim.difficulty}${sim.challenge.hero?':'+sim.challenge.hero:''}:${sim.challenge.practice?'practice':'standard'}`
  const old=profile.records[recordKey]
  if(!old || held>old.wave || held===old.wave && sim.lives>old.light) profile.records[recordKey]={wave:held,light:sim.lives,won:sim.won,practice:!!sim.challenge.practice}
  if(sim.challenge.commission && sim.won && !profile.commissions.includes(sim.challenge.commission)) profile.commissions.push(sim.challenge.commission)
  if(!sim.isChallenge) profile.settlement=Math.max(profile.settlement,[5,10,30,40].filter(n=>held>=n).length)
  writeJSON('profile',profile)
}
export function bestWave(p:VillageProfile,map:number,mode:Difficulty,hero?:HeroId) { return hero?p.records[`${map}:${mode}:${hero}:standard`]?.wave??0:Math.max(0,...Object.entries(p.records).filter(([key])=>key.startsWith(`${map}:${mode}:`)&&key.endsWith(':standard')).map(([,record])=>record.wave)) }
export function legacyExists() {try {return ['lanternlocks.run.v3','lanternlocks.save.v1','lanternlocks.challenge-run.v1'].some(k=>!!localStorage.getItem(k))} catch {return false} }
export function loadPlanning(slot:Slot): SaveSnapshotV2|null { const p=readJSON(slot+'.planning'); return validSnapshot(p)&&p.v===2&&p.challenge.fixed===1&&!p.enemies.length&&!p.spawners.length?p:null }
