/** Event admission, separate from Web Audio, keeps a crowd from masking tells. */
export class CombatMix {
  private window=-Infinity
  private count=0
  private focusUntil=0
  focus(now:number,seconds:number){this.focusUntil=Math.max(this.focusUntil,now+seconds)}
  focused(now:number){return now<this.focusUntil}
  admit(now:number,priority=false){
    if(priority)return true
    if(this.focused(now))return false
    if(now-this.window>=.12){this.window=now;this.count=0}
    return ++this.count<=4
  }
}
export const BOSS_VOICES:Record<string,{root:number;partials:number[];filter:number;metal:boolean}>={
  toad:{root:73.42,partials:[1,1.49,2.02],filter:460,metal:false},
  dredger:{root:65.41,partials:[1,2.76,4.07],filter:1150,metal:true},
  gloom:{root:98,partials:[1,.502,1.007],filter:330,metal:false},
  warden:{root:49,partials:[1,3.01,5.4],filter:760,metal:true},
  bloomheart:{root:110,partials:[1,1.189,1.498],filter:1900,metal:false},
}
