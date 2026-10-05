import type { Sim } from '../game/sim'
import { buildLevel } from '../game/level'
import { fixedLevel } from '../game/fixed'
import { passageLevel, passageDescription } from '../game/second-watch'
import type { Passage } from '../game/watch-director'

export function passagePreview(s:Sim,id:Passage){
  const level=buildLevel(passageLevel(fixedLevel(s.challenge.variant,true,true),id))
  return `<svg class="passage-map" viewBox="-40 -60 830 970" role="img" aria-label="${passageDescription(id).name}: ${id==='convoy'?'gold plot 13 beside the island':'gold detour from the side entrance'}"><rect x="-40" y="-60" width="830" height="970" fill="#102c38"/>${[...level.segs.values()].map(seg=>`<polyline fill="none" stroke="${id==='runners'&&seg.id==='inlet'?'#efcc86':'#6faaa9'}" stroke-width="22" stroke-linejoin="round" points="${seg.line.pts.map(p=>`${p.x},${p.y}`).join(' ')}"/>`).join('')}${level.def.pads.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===12?24:13}" fill="${i===12?'#efcc86':'#aebbb2'}"/>${i===12?`<text x="${p.x}" y="${p.y+9}" text-anchor="middle" font-size="26" fill="#102c38">13</text>`:''}`).join('')}</svg>`
}

export const SECOND_SIGNATURES:Record<string,{benefit:string;cost:string;tip:string}>={
  'long-embers':{benefit:'Burning defeats spread fire. Another Blast covering the recipient relays it at full strength for 3 seconds.',cost:'Direct Blast hits are lighter. Spread investment across overlapping fire towers.',tip:'Two guided-fire Blasts on consecutive banks, with control over their shared water.'},
  flashpoint:{benefit:'A different heavy tower detonates existing burns. Bolt finishers convert stored fire at 3.25×.',cost:'The fire source cannot consume its own burn. Keep a finisher in shared reach.',tip:'One fire setter feeding a heavily upgraded Siege Bolt and a Scout for Beacon Volley.'},
  'deep-freeze':{benefit:'Every third Chime pulse freezes ordinary foes. Use the pause to land wide blasts.',cost:'Chimes reload more slowly. Cover their downtime.',tip:'A concentrated Chime and wide Blast battery around the first shared bend.'},
  'tidal-echo':{benefit:'Every third toll pushes slowed foes back 65 units and exposes them for 3 seconds.',cost:'Bosses resist displacement. Keep heavy damage for the captain.',tip:'Wide Chimes at successive bends send foes back through piercing beams.'},
  'forked-current':{benefit:'Longer lightning chains clear crowded formations. A crowned first-target kill earns two extra jumps.',cost:'Each hit is lighter. Use two separated chain towers to cover both entrances.',tip:'Distributed long-chain Storm towers, with Blasts breaking the armoured screen.'},
  capacitor:{benefit:'Every third volley is a heavy discharge. Crowning a Storm raises its charged hit to 3.45×.',cost:'Fewer jumps and slower reloads. Invest deeply in one battery.',tip:'One crowned heavy-arc Storm over Chime control, with a piercing finisher downstream.'},
}
