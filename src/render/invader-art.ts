import type {Enemy} from '../game/sim'

const TAU=Math.PI*2,INK='#101e2b',BONE='#d3d2b6',RUST='#c67851'
type C=CanvasRenderingContext2D
type Point=readonly [number,number]

function path(c:C,p:readonly Point[]){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}
function line(c:C,p:readonly Point[],colour:string,width=.055){c.strokeStyle=colour;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
function plate(c:C,p:readonly Point[],colour:string,edge='#95aa9a',shade=INK){
 path(c,p);const top=Math.min(...p.map(v=>v[1])),bottom=Math.max(...p.map(v=>v[1])),g=c.createLinearGradient(-.45,top,.65,bottom+.01);g.addColorStop(0,edge);g.addColorStop(.12,colour);g.addColorStop(.55,colour);g.addColorStop(1,shade);c.fillStyle=g;c.fill();c.strokeStyle=INK;c.lineWidth=.065;c.lineJoin='round';c.stroke();line(c,p.slice(0,Math.min(3,p.length)),edge,.025)
}
function oval(c:C,x:number,y:number,rx:number,ry:number,colour:string,edge?:string){c.fillStyle=colour;c.beginPath();c.ellipse(x,y,Math.max(.003,rx),Math.max(.003,ry),0,0,TAU);c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=.045;c.stroke()}}
function hide(c:C,x:number,y:number,rx:number,ry:number,colour:string){const g=c.createRadialGradient(x-rx*.35,y-ry*.4,0,x,y,Math.max(rx,ry));g.addColorStop(0,colour);g.addColorStop(.48,colour);g.addColorStop(1,INK);c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();c.strokeStyle=INK;c.lineWidth=.06;c.stroke()}
function blade(c:C,x:number,y:number,dx:number,dy:number,w=.12,colour=BONE){
 // Hundreds of teeth share this cheap two-facet shape; avoid a gradient per tooth.
 path(c,[[x-w,y],[x+dx,y+dy],[x+w,y+.025]]);c.fillStyle=colour;c.fill();c.strokeStyle=INK;c.lineWidth=.035;c.stroke()
 path(c,[[x,y],[x+dx,y+dy],[x+w,y+.025]]);c.fillStyle='#53636788';c.fill();line(c,[[x-w,y],[x+dx,y+dy]],'#eee3c5',.018)
}
function slit(c:C,x:number,y:number,w=.19,colour='#ff8251',tilt=-.2){
 c.save();c.translate(x,y);c.rotate(tilt);oval(c,0,.012,w*.75,w*.36,INK);line(c,[[-w*.7,-.025],[w*.7,.005]],colour,w*.27);line(c,[[-w*.3,-.025],[w*.3,-.012]],'#fff0bc',w*.09);line(c,[[-w*.9,-.08],[w*.8,-.04]],'#1c2932',.08);c.restore()
}
function jaws(c:C,x:number,y:number,w:number,h:number,count=5,open=.05){
 c.save();c.translate(x,y);plate(c,[[-w*.55,-h*.25],[w*.48,-h*.15],[w*.57,h*.22+open],[-w*.42,h*.5+open]],'#121a24','#626a68')
 for(let i=0;i<count;i++){const px=-w*.42+i*w*.85/(count-1);blade(c,px,-h*.18,.015,h*(i%2?.55:.8)+open*.3,w*.043);if(i%2===0)blade(c,px+w*.04,h*.38+open,-.012,-h*.4,w*.034)}c.restore()
}
function rivets(c:C,p:readonly Point[],colour=RUST){for(const [x,y]of p){oval(c,x,y,.045,.042,INK);oval(c,x-.008,y-.011,.022,.02,colour)}}
function limb(c:C,points:readonly Point[],colour:string,width=.12){line(c,points,INK,width+.08);line(c,points,colour,width);for(const p of points.slice(1,-1))oval(c,p[0],p[1],width*.64,width*.6,'#87998a',INK);const a=points.at(-2)!,b=points.at(-1)!;blade(c,b[0],b[1],(b[0]-a[0])*.22,.11,width*.45)}
function scars(c:C,x:number,y:number,colour='#d2ddbd'){for(let i=0;i<3;i++)line(c,[[x+i*.13,y],[x-.08+i*.13,y+.2]],colour,.025)}
function smoke(c:C,x:number,y:number,t:number,still:boolean){if(still)return;for(let i=0;i<3;i++){const q=(t*.65+i/3)%1;c.save();c.globalAlpha=(1-q)*.42;oval(c,x-q*.2,y-q*.55,.09+q*.14,.07+q*.1,'#30383f');c.restore()}}

function guttermaw(c:C,_e:Enemy,t:number,col:string){
 const stride=Math.sin(t*11)*.14,jaw=Math.max(0,Math.sin(t*2))*.09
 plate(c,[[-.5,-.3],[-1.18,-.2],[-1.6,-.5+stride],[-1.3,.2+stride],[-.45,.15]],'#354b55','#718c86')
 for(const side of [-1,1])for(const x of [-.55,.33])limb(c,[[x,-.1],[x+side*.15,.17],[x+.24+stride*side,.31]],'#4b6066',.09)
 hide(c,-.2,-.27,.85,.44,col)
 for(let i=0;i<4;i++)blade(c,-.7+i*.3,-.55,-.16,-.38+i*.025,.15,'#b9c4af')
 plate(c,[[.02,-.56],[.66,-.75],[1.08,-.35],[.82,.04],[.2,-.02]],col,'#a6b4a2')
 jaws(c,.7,-.08,.79,.15,6,jaw);slit(c,.52,-.43,.17);line(c,[[.72,-.65],[1.12,-.46]],BONE,.075);scars(c,-.35,-.37)
}
function razorfin(c:C,_e:Enemy,t:number,col:string){
 const tail=Math.sin(t*21)*.28
 plate(c,[[-.8,-.2],[-1.63,-.73+tail],[-1.33,-.06],[-1.64,.61+tail],[-.7,.1]],'#263f4c','#84b3b5')
 plate(c,[[-1,-.16],[-.2,-.5],[.75,-.31],[1.65,-.02],[.7,.27],[-.75,.2]],col,'#a6d3c8')
 blade(c,-.14,-.38,-.3,-.69,.27);blade(c,.28,.2,-.12,.48,.2,'#6f9c9f')
 plate(c,[[.62,-.25],[1.76,-.02],[.6,.06]],'#c6d5c1','#f1e5bd');jaws(c,.84,.105,.66,.08,5);slit(c,.53,-.2,.12,'#ff7957',-.04)
 for(let i=0;i<3;i++)line(c,[[.02-i*.15,-.28],[-.08-i*.15,.06]],INK,.055)
}
function ironclaw(c:C,e:Enemy,t:number,col:string){
 for(const side of [-1,1])for(let i=0;i<3;i++)limb(c,[[side*.5,-.18],[side*(.92+i*.12),-.55+i*.36],[side*(1.35+i*.06),.12+i*.21+Math.sin(t*8+i*2)*.11]],'#566974',.09)
 hide(c,0,-.25,.76,.59,'#4b4650')
 for(const side of [-1,1]){const snap=.1+Math.max(0,Math.sin(t*3+side))*.18;limb(c,[[side*.6,-.35],[side*1.02,-.84],[side*1.18,-1.15]],col,.19);c.save();c.translate(side*1.18,-1.15);c.scale(side,1);plate(c,[[-.16,.13],[-.24,-.2],[.02,-.67],[.17,-.29],[.08,-.13],[.32,-.45-snap],[.41,-.08],[.17,.18]],col,'#d6ad86');c.restore()}
 if(e.shell>0){plate(c,[[-.79,-.3],[-.75,-.93],[-.33,-1.28],[.33,-1.28],[.8,-.9],[.8,-.3],[0,-.07]],col,'#d1ad8b');for(const side of [-1,1]){blade(c,side*.55,-1.02,side*.21,-.38,.17);line(c,[[side*.12,-1.13],[side*.17,-.4],[side*.6,-.28]],'#714e46',.045)}rivets(c,[[-.46,-.82],[.46,-.82],[-.46,-.42],[.46,-.42]])}
 else plate(c,[[-.62,-.4],[-.39,-.88],[.39,-.88],[.65,-.4],[0,-.18]],'#8f5550','#c9967a')
 for(const side of [-1,1])slit(c,side*.29,-.39,.19,'#ff854d',-side*.15);jaws(c,0,-.12,.49,.11,4)
}
function cinderwing(c:C,_e:Enemy,t:number,col:string){
 const beat=.55+Math.abs(Math.sin(t*15))*.6
 for(const side of [-1,1]){c.save();c.scale(side*beat,1);plate(c,[[.06,-.62],[.6,-1.05],[1.61,-1.28],[1.19,-.66],[1.51,-.5],[.91,-.27],[1.2,.22],[.49,.12],[.11,-.15]],'#443e4a',col);for(let i=0;i<3;i++)line(c,[[.17,-.47],[.63,-.66+i*.19],[1.2-i*.15,-.97+i*.43]],col,.045);plate(c,[[.12,-.11],[.67,.14],[.86,.6],[.31,.32]],'#835346','#d6a46a');c.restore()}
 for(let i=0;i<4;i++)plate(c,[[-.15,-.57+i*.19],[.15,-.57+i*.19],[.1,-.29+i*.19],[0,-.15+i*.19],[-.1,-.29+i*.19]],i%2?'#725145':'#283743',col)
 blade(c,0,.39,0,.43,.1);for(const side of [-1,1]){line(c,[[side*.08,-.67],[side*.21,-.98],[side*.34,-1.13]],BONE,.035);slit(c,side*.08,-.66,.095,'#ffb258',-side*.3)}
}
function wraithRay(c:C,_e:Enemy,t:number,col:string){
 const flex=Math.sin(t*4)*.13
 line(c,[[0,.1],[.15,.58],[-.18,1.17+flex],[.2,1.53]],INK,.11);line(c,[[0,.1],[.15,.58],[-.18,1.17+flex],[.2,1.53]],'#86b4c9',.045);blade(c,.2,1.53,.21,.22,.1,'#bfd9d6')
 for(const side of [-1,1]){plate(c,[[0,-.99],[side*.64,-.57],[side*1.66,-.36+flex],[side*1.22,.03],[side*1.38,.3],[side*.68,.18],[side*.4,.56],[0,.1]],'#34455f',col);for(let i=0;i<3;i++)line(c,[[side*.12,-.67+i*.18],[side*.69,-.35+i*.17],[side*(1.23-i*.18),-.24+i*.23]],'#80ccdf9c',.03)}
 plate(c,[[0,-1.21],[-.38,-.62],[-.2,.18],[0,.35],[.2,.18],[.38,-.62]],'#202e48','#a9dfe7');slit(c,-.18,-.56,.13,'#9ceeff',.3);slit(c,.18,-.56,.13,'#9ceeff',-.3);jaws(c,0,-.1,.25,.12,3)
}
function blightSac(c:C,_e:Enemy,t:number,col:string){
 const pulse=1+Math.sin(t*3)*.045;c.save();c.scale(pulse,pulse)
 for(let i=0;i<9;i++){const a=i*TAU/9;blade(c,Math.cos(a)*.8,-.4+Math.sin(a)*.71,Math.cos(a)*.47,Math.sin(a)*.47,.105,'#b0bba2')}
 hide(c,0,-.34,.89,.91,'#343e43')
 for(let i=0;i<3;i++){const a=i*TAU/3-Math.PI/2,x=Math.cos(a)*.44,y=-.37+Math.sin(a)*.42;hide(c,x,y,.37,.38,col);line(c,[[x-.15,y-.2],[x-.06,y],[x+.12,y+.21]],'#f3c47a',.045)}
 for(const side of [-1,1]){plate(c,[[side*.15,-1.12],[side*.62,-1.02],[side*.92,-.42],[side*.51,-.25]],'#46505a','#879584');limb(c,[[side*.48,.19],[side*.72,.38],[side*.89,.37]],'#746a58',.1);slit(c,side*.19,-.07,.115,'#ffe08f',-side*.23)}
 jaws(c,0,.2,.55,.2,5,.05+Math.sin(t*3)*.025);c.restore()
}
function leechChoir(c:C,e:Enemy,t:number,col:string){
 for(let i=0;i<5;i++){const x=(i-2)*.28;c.strokeStyle=i%2?'#4e8f86':'#91c5a1';c.lineWidth=.065;c.beginPath();c.moveTo(x,-.33);c.bezierCurveTo(x*.5,.18,x*1.7+Math.sin(t*3+i)*.25,.62,x*1.22,1.07+Math.sin(t*4+i)*.13);c.stroke();blade(c,x*1.22,1.03+Math.sin(t*4+i)*.13,-.09,.19,.045,'#b4d5ad')}
 const pulse=.7+Math.sin(t*2)*.08;hide(c,0,-.62,.68,.65,col)
 plate(c,[[-.87,-.31],[-.71,-1.03],[-.28,-1.44],[0,-1.13],[.28,-1.44],[.71,-1.03],[.87,-.31],[.32,-.5],[0,-.2],[-.32,-.5]],'#2e4450','#8aafa1')
 for(const side of [-1,1])line(c,[[side*.64,-.82],[side*.37,-.5],[side*.41,-.03]],col,.045)
 oval(c,0,-.61,.23*pulse,.33*pulse,'#a4e9aa');plate(c,[[-.22,-.92],[.22,-.92],[.14,-.46],[0,-.3],[-.14,-.46]],'#172d38','#6b9892');slit(c,-.115,-.68,.09,'#b9ffc3',.35);slit(c,.115,-.68,.09,'#b9ffc3',-.35)
 if((e.signalT??0)>0){c.strokeStyle='#b2e9ab';c.lineWidth=.035;c.beginPath();c.ellipse(0,-.48,1.05,.76,0,0,TAU);c.stroke()}
}
function obsidianCrawler(c:C,e:Enemy,t:number,col:string){
 for(let i=0;i<5;i++)limb(c,[[-.72+i*.35,.03],[-.85+i*.38,.3],[-.67+i*.38+Math.sin(t*7+i)*.1,.4]],'#59667b',.06)
 plate(c,[[-1,.1],[-.79,-.43],[.2,-.44],[1.13,-.2],[1.43,.16],[.89,.29],[-.91,.33]],'#394757','#849f9f')
 if(e.shell>0){const shell:Point[]=[[-1.01,-.62],[-.64,-1.43],[.12,-1.51],[.63,-1.01],[.48,-.3],[-.3,.09]];plate(c,shell,col,'#b1b7d7');for(let i=0;i<5;i++)line(c,[shell[i],[-.24,-.73],shell[(i+1)%6]],'#c1c3db75',.028);plate(c,[[-.57,-1.08],[.07,-1.21],[.34,-.78],[-.2,-.48],[-.49,-.69]],'#233449','#bcc2df');line(c,[[-.45,-.97],[-.08,-1.05],[.18,-.76],[-.17,-.62]],'#9eb4e6',.04);for(let i=0;i<3;i++)blade(c,-.69+i*.4,-1.27,-.2,-.33,.12,'#b5b7c9')}
 else hide(c,-.25,-.36,.61,.33,'#665065')
 for(const side of [-1,1]){line(c,[[.7,-.2],[1.03,-.39+side*.13],[1.24,-.64+side*.09]],'#77859c',.06);slit(c,1.04,-.28+side*.14,.1,'#f59980',.12)}
 plate(c,[[1.07,-.01],[1.48,-.12],[1.29,.04],[1.47,.2],[1.03,.17]],'#b0bfc0','#e0dfc6')
}
function ramSkiff(c:C,e:Enemy,t:number,col:string){
 const plated=e.shell>0
 plate(c,[[-1.24,-.32],[.68,-.48],[1.48,-.14],[1.02,.26],[-.86,.28],[-1.35,.02]],plated?col:'#53434c','#a3ada7')
 plate(c,[[.82,-.26],[1.78,-.14],[1.26,.14],[.74,.14]],'#b5b6a4','#e2d8b6');for(let i=0;i<3;i++)blade(c,-.66+i*.48,.13,.2,.2,.1,'#9aa9a2')
 plate(c,[[-.8,-.42],[-.53,-.93],[.29,-.91],[.73,-.4]],'#263943','#839a9a');line(c,[[-.43,-.71],[.22,-.7]],'#fa9560',.095);line(c,[[-.41,-.71],[.2,-.7]],'#ffd99a',.023)
 plate(c,[[-.75,-.71],[-.79,-1.3],[-.53,-1.3],[-.43,-.67]],'#36434a','#82908e');line(c,[[-.83,-1.31],[-.49,-1.31]],RUST,.09);smoke(c,-.65,-1.4,t,false)
 line(c,[[-1.12,-.1],[-1.42,-.1]],'#899887',.07);const spin=Math.sin(t*(plated?14:25))*.26;line(c,[[-1.42,-.1-spin],[-1.42,-.1+spin]],RUST,.07)
 rivets(c,[[-.94,-.1],[-.54,-.13],[-.12,-.16],[.32,-.19]]);if(!plated)line(c,[[-.85,-.03],[-.3,.02],[.18,-.03]],'#ffb76b',.04)
}
function gallowsStalker(c:C,e:Enemy,t:number,col:string){
 for(let i=0;i<4;i++){const side=i<2?-1:1,step=Math.sin(t*7+i*2)*.14;limb(c,[[side*.26,-.74],[side*(.7+i%2*.2),-.42],[side*(.87+i%2*.32),.48+step]],'#526d63',.075);blade(c,side*(.7+i%2*.2),-.42,side*.19,-.27,.095,'#bbc4a5')}
 plate(c,[[0,-1.72],[-.53,-1.13],[-.34,-.46],[0,-.14],[.38,-.51],[.52,-1.12]],e.shell>0?'#8d8060':col,'#b7c29a')
 plate(c,[[-.44,-1.16],[0,-1.38],[.44,-1.16],[.25,-.65],[0,-.82],[-.25,-.65]],'#233c3b','#7f9f82')
 for(const side of [-1,1]){line(c,[[side*.24,-1.45],[side*.51,-1.72],[side*.58,-2.1]],'#a2ae8c',.09);blade(c,side*.5,-1.74,side*.32,-.26,.1);slit(c,side*.18,-1.08,.13,'#ffbd71',-side*.23)}jaws(c,0,-.68,.29,.15,3)
}
function mireTyrant(c:C,e:Enemy,t:number,col:string){
 const breath=Math.sin(t*1.6)*.04,calling=(e.signalT??0)>0
 for(const side of [-1,1]){hide(c,side*.87,-.21,.47,.49,'#3b5a55');limb(c,[[side*.7,-.2],[side*1.2,.06],[side*1.42,.32]],'#506e60',.16);for(let i=0;i<3;i++)blade(c,side*(1.1+i*.13),.28,side*.14,.15,.07)}
 hide(c,0,-.61,1.09,.84,col)
 for(let i=0;i<5;i++){const x=(i-2)*.34;plate(c,[[x-.19,-1.11],[x-.21,-1.6],[x+.07,-1.92-(i%2)*.16],[x+.21,-1.35],[x+.19,-1.04]],'#526353','#9ba486')}
 plate(c,[[-1.06,-.59],[-.7,-1.02],[-.15,-.86],[0,-.96],[.18,-.86],[.75,-1.02],[1.06,-.59],[.76,-.27],[-.77,-.27]],'#3b4d47','#abb495')
 for(const side of [-1,1])slit(c,side*.56,-.66,.25,'#ff9b50',-side*.23)
 jaws(c,0,-.02,1.66,.34,9,(calling?.2:.07)+breath);plate(c,[[-.79,.14],[0,.34+breath],[.81,.14],[.58,.42],[-.53,.43]],'#5b7361','#bec5a0');scars(c,-.77,-.85)
 if(calling)line(c,[[-.65,.06],[-.2,.13],[.2,.13],[.65,.06]],'#efbc77',.035)
}
function leviathan(c:C,e:Enemy,t:number,col:string){
 for(let i=6;i>=0;i--){const x=(i-2)*.4,y=-.15+Math.sin(t*2.5-i*.8)*.19,sz=.62-i*.058;hide(c,x,y,sz,sz*.65,col);plate(c,[[x-.3,y-.17],[x-.13,y-.58],[x+.23,y-.54],[x+.4,y-.16],[x+.12,y-.02]],'#3a4a63','#9bb4bf');blade(c,x+.07,y-.53,.3,-.51-i*.025,.15,'#afb7b9');line(c,[[x-.2,y+.08],[x+.1,y+.19],[x+.25,y+.11]],'#7ca8b0',.035)}
 plate(c,[[-1.66,-.2],[-1.76,-.6],[-1.14,-1.03],[-.48,-.83],[-.22,-.25],[-.73,.14]],'#586e7c','#b9c7c4');blade(c,-.77,-.85,.14,-.55,.15);blade(c,-1.13,-.94,.18,-.46,.11)
 jaws(c,-1.14,-.11,1.25,.24,7,.06+Math.max(0,Math.sin(t*2))*.08);slit(c,-1.11,-.54,.22,'#ff957c',-.15);line(c,[[-1.69,-.32],[-.71,-.32]],BONE,.07)
 if(e.shrouded){c.save();c.globalAlpha=.2;oval(c,-.13,-.27,1.95,.72,'#7887b9');c.restore()}
}
function dreadnought(c:C,e:Enemy,t:number,col:string){
 c.save();c.rotate(Math.sin(t*1.4)*.018)
 plate(c,[[-1.36,-.32],[.86,-.47],[1.57,-.12],[1.11,.38],[-1,.39],[-1.49,.05]],col,'#a7b6b4')
 plate(c,[[.92,-.24],[1.9,-.03],[1.1,.16]],'#b7b8a4','#f0dab0')
 for(let i=0;i<5;i++){const x=-1.05+i*.41;plate(c,[[x,-.17],[x+.27,-.2],[x+.24,.23],[x+.04,.26]],e.shell>0?'#555867':'#493c46','#a29783');blade(c,x+.08,.24,.15,.21,.095,'#b9b69c')}
 for(const x of [-.79,-.2]){plate(c,[[x,-.43],[x-.02,-1.34],[x+.25,-1.42],[x+.31,-.43]],'#344350','#879496');line(c,[[x-.04,-1.36],[x+.28,-1.43]],RUST,.09);smoke(c,x+.1,-1.5,t,false)}
 plate(c,[[.34,-.37],[.31,-1.43],[.94,-1.34],[1.1,-.35]],'#364753','#a3ae9e');line(c,[[.47,-1.12],[.85,-1.1]],'#f79061',.1);line(c,[[.51,-1.12],[.77,-1.105]],'#ffd299',.028)
 for(let i=0;i<2;i++){line(c,[[.9,-.64-i*.23],[1.26,-.61-i*.23]],'#1d2b37',.13);line(c,[[.92,-.67-i*.23],[1.24,-.64-i*.23]],'#96a6a2',.03)}
 line(c,[[.6,-1.41],[.57,-2.02]],'#a9b5a4',.045);plate(c,[[.59,-2.02],[1.15,-1.88],[.99,-1.77],[1.16,-1.66],[.59,-1.72]],'#8b4b48','#c58063');rivets(c,[[-1.03,.03],[-.62,.03],[-.21,.03],[.2,.03],[.61,.03]]);c.restore()
}
function thornMatriarch(c:C,e:Enemy,t:number,col:string){
 const signalling=(e.signalT??0)>0,exposed=(e.exposedT??0)>0
 for(let i=0;i<6;i++){const a=i*TAU/6,sway=Math.sin(t*2+i)*.12;limb(c,[[Math.cos(a)*.45,-.1+Math.sin(a)*.3],[Math.cos(a)*1.13,-.1+Math.sin(a)*.55],[Math.cos(a+sway)*1.55,.16+Math.sin(a)*.68]],'#354f50',.105)}
 c.save();c.translate(0,-.72);c.rotate(Math.sin(t*.8)*.045)
 for(let i=0;i<7;i++){const a=i*TAU/7,flex=Math.sin(t*1.7+i)*.035;c.save();c.rotate(a);if(exposed)c.translate(0,-.22);plate(c,[[-.23,-.37],[-.39,-.79],[-.29,-1.19],[.1,-1.57-flex],[.03,-1.06],[.37,-1.27],[.25,-.63],[.14,-.39]],i%2?'#4a3548':col,'#c08b92');line(c,[[-.13,-.51],[-.21,-.89],[.01,-1.29]],'#db8d846b',.03);c.restore()}
 hide(c,0,0,.62,.61,'#263643');for(let i=0;i<11;i++){const a=i*TAU/11;c.save();c.rotate(a);blade(c,0,-.51,.06,.29,.105,'#d9c8a9');c.restore()}
 const pulse=(exposed?.34:.2)+Math.sin(t*3)*.025;hide(c,0,0,pulse,pulse*1.3,exposed?'#fff0b7':signalling?'#c3f0ad':'#e78c77');oval(c,-.05,-.04,.038,.06,'#fff0ca')
 if(signalling){c.strokeStyle='#b6efa7';c.lineWidth=.045;c.beginPath();c.arc(0,0,.73,0,TAU);c.stroke()}c.restore()
}
function dredger(c:C,_e:Enemy,t:number,col:string,open:number){
 for(let i=0;i<5;i++){const x=(i-2)*.37;limb(c,[[x,-.08],[x+Math.sin(t*3+i)*.1,.33],[x-.11,.53]],'#775c53',.12)}
 hide(c,0,-.57,.92,.9,'#38323b');const heat=open>.2?'#ffb65e':'#77504d';hide(c,0,-.63,.62,.62,heat)
 for(let i=0;i<8;i++){const a=i*TAU/8+t*.16;c.save();c.translate(0,-.63);c.rotate(a);plate(c,[[-.09,-.48],[.13,-.5],[.04,-.2],[-.1,-.3]],'#47414a','#d4baa0');c.restore()}
 for(const side of [-1,1]){
  c.save();c.translate(side*open*.43,-open*.11);c.rotate(side*open*.07);plate(c,[[side*.02,-1.51],[side*.54,-1.44],[side*.96,-1.06],[side*1.06,-.47],[side*.82,.11],[side*.2,.2],[side*.39,-.5]],col,'#d9c6a5');for(let i=0;i<3;i++){const y=-1.16+i*.35;plate(c,[[side*.43,y-.08],[side*.78,y-.04],[side*.89,y+.18],[side*.49,y+.11]],'#726656','#bfa783');blade(c,side*.8,y,side*.34,-.28,.1,'#c9c3a9')}c.restore()
  limb(c,[[side*.67,-.14],[side*1.16,-.48],[side*1.28,-.81]],'#736052',.16);plate(c,[[side*1.12,-.67],[side*1.49,-1.06],[side*1.43,-.51],[side*1.15,-.39]],'#a49c86','#e4d7b1');slit(c,side*.31,-.08,.17,'#ffbd73',-side*.25)
 }
 if(open>.2){c.save();c.globalAlpha=open*.5;oval(c,0,-.63,.24+Math.sin(t*5)*.025,.3,'#fff0a6');c.restore()}
}

/** Anatomy is authored independently; ID, damage and vulnerability stay in Sim. */
export function drawInvader(c:C,e:Enemy,time:number,colour:string,shellOpen:number){
 switch(e.def.id){
  case 'drip':guttermaw(c,e,time,colour);break
  case 'skitter':razorfin(c,e,time,colour);break
  case 'shell':ironclaw(c,e,time,colour);break
  case 'wisp':cinderwing(c,e,time,colour);break
  case 'veil':wraithRay(c,e,time,colour);break
  case 'bloat':blightSac(c,e,time,colour);break
  case 'mender':leechChoir(c,e,time,colour);break
  case 'vshell':obsidianCrawler(c,e,time,colour);break
  case 'skiff':ramSkiff(c,e,time,colour);break
  case 'reedling':gallowsStalker(c,e,time,colour);break
  case 'toad':mireTyrant(c,e,time,colour);break
  case 'gloom':leviathan(c,e,time,colour);break
  case 'warden':dreadnought(c,e,time,colour);break
  case 'bloomheart':thornMatriarch(c,e,time,colour);break
  case 'dredger':dredger(c,e,time,colour,shellOpen);break
 }
}
