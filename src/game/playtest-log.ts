type Fields=Record<string,string|number|boolean>
export interface PlaytestEntry {at:number;event:string;data:Fields}
export interface PlaytestSession {started:string;context:Fields;events:PlaytestEntry[]}
const KEY='nightward.playtest.v1',OPT='nightward.playtest.enabled'
const clean=(fields:Fields)=>Object.fromEntries(Object.entries(fields).slice(0,16).filter(([key,v])=>/^[a-zA-Z][\w-]{0,30}$/.test(key)&&(typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))).map(([k,v])=>[k,typeof v==='string'?v.slice(0,120):v]))
/** Opt-in, bounded and device-local. Contains game events only; never sends data. */
export class PlaytestLog {
  enabled=false
  private sessions:PlaytestSession[]=[]
  private current:PlaytestSession|null=null
  private elapsed=0
  constructor(private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null,private date=()=>new Date().toISOString()){
    try{this.enabled=storage?.getItem(OPT)==='1';const saved=JSON.parse(storage?.getItem(KEY)??'[]');if(Array.isArray(saved))this.sessions=saved.filter(s=>s&&typeof s.started==='string'&&s.context&&Array.isArray(s.events)).slice(-8)}catch{/* Recording must never block play. */}
  }
  setEnabled(value:boolean){this.enabled=value;this.current=null;try{this.storage?.setItem(OPT,value?'1':'0')}catch{} }
  start(context:Fields){if(!this.enabled)return;this.current={started:this.date(),context:clean(context),events:[]};this.elapsed=0;this.sessions.push(this.current);this.sessions=this.sessions.slice(-8);this.record('session-start',context);this.flush()}
  tick(seconds:number){if(this.enabled&&this.current&&Number.isFinite(seconds))this.elapsed+=Math.max(0,seconds)}
  record(event:string,data:Fields={}){if(!this.enabled||!this.current)return;this.current.events.push({at:Math.round(this.elapsed*100)/100,event:event.slice(0,60),data:clean(data)});if(this.current.events.length>600)this.current.events.splice(0,this.current.events.length-600)}
  flush(){if(!this.enabled)return;try{this.storage?.setItem(KEY,JSON.stringify(this.sessions))}catch{}}
  clear(){this.sessions=[];this.current=null;try{this.storage?.removeItem(KEY)}catch{}}
  export(){this.flush();return JSON.stringify({schema:1,scope:'device-local game events',sessions:this.sessions},null,2)}
}
export function localPlaytest(){try{return new PlaytestLog(localStorage)}catch{return new PlaytestLog(null)}}
