/** Changes canvas resolution only. Game speed, layout and touch coordinates are untouched. */
export class FrameBudget {
  cap=1.6
  private average=0
  private samples=0
  private cooldown=0
  observe(milliseconds:number,mobile:boolean){
    if(!mobile||!Number.isFinite(milliseconds)||milliseconds<0)return false
    this.average=this.samples?this.average*.96+milliseconds*.04:milliseconds
    this.samples++
    if(this.cooldown>0){this.cooldown--;return false}
    if(this.samples<120)return false
    const next=this.average>22?1.25:this.average<11?1.6:this.cap
    if(next===this.cap)return false
    this.cap=next;this.cooldown=1200;return true
  }
}
