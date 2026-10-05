import type {Sim,Tower} from './sim'

/** Sample actual paths and effective range, including a chosen sluice detour. */
export function placementReadout(s:Sim,t:Tower){
 const reach=s.effRange(t),covered={early:0,lower:0,side:0},total={early:0,lower:0,side:0}
 let shared=0,uncovered=0
 for(const seg of s.level.segs.values()){
  if(seg.id==='inlet'&&s.planningWave<(s.level.def.sources.find(q=>q.id==='west')?.openWave??99))continue
  const zone=seg.id==='inlet'?'side':['e2','h','m1'].includes(seg.id)?'lower':'early'
  for(let at=0;at<seg.line.length;at+=8){
   const p=seg.line.at(at,{x:0,y:0,tx:0,ty:0});total[zone]++
   if(Math.hypot(t.x-p.x,t.y-p.y)>reach)continue
   covered[zone]++
   if(s.towers.some(q=>q.stats.damage>0&&Math.hypot(q.x-p.x,q.y-p.y)<=s.effRange(q)))shared++;else uncovered++
  }
 }
 const zones=(Object.keys(total) as (keyof typeof total)[]).filter(k=>total[k]).map(k=>({id:k,label:{early:'Upper approach',lower:'Final bends',side:'Side inlet'}[k],percent:Math.round(covered[k]/total[k]*100)}))
 const partners=s.towers.filter(q=>q.stats.damage>0&&s.level.def.pads[q.pad]&&Math.hypot(t.x-q.x,t.y-q.y)<reach+s.effRange(q))
 const lower=zones.find(z=>z.id==='lower')?.percent??0,side=zones.find(z=>z.id==='side')
 const tradeoff=side?.percent===0?'This plot misses the side inlet. Keep a second defence downstream.':lower<8?'Strong upstream commitment. This plot leaves the final bends uncovered.':covered.early===0?'A finishing position. Enemies travel through the upper approach before this tower fires.':'Covers more than one stretch. Check sight and armour damage over the shared water.'
 const control=t.id==='bell'||t.id==='owl'
 const support=control?(shared>0?'Shares firing water with your damage towers.':partners.length?'Nearby towers do not yet share covered water.':'Build damage over this water to use its support.'):`${Math.round(uncovered*8)} units of additional water covered.`
 return {zones,tradeoff,support,shared:shared*8}
}
