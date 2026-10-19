import {DT} from './sim'

/** Render frequency never changes the simulation step. Stall catch-up is bounded. */
export function advanceWatchFrame(remainder:number,seconds:number,tempo:number,step:()=>void,active:()=>boolean){
 let pending=remainder+Math.max(0,Math.min(.1,seconds))*tempo
 while(pending+1e-10>=DT&&active()){step();pending=Math.max(0,pending-DT)}
 return active()?pending:0
}
