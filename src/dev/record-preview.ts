/** Development-only capture of the actual battlefield and its visible HUD text.
 * No simulation fixtures, effects or data are added to the recording. */
export async function recordPreview(){
 const source=document.querySelector<HTMLCanvasElement>('#canvas')!
 const portrait=innerHeight>innerWidth,canvas=document.createElement('canvas')
 canvas.width=portrait?1080:1920;canvas.height=portrait?1620:1080
 const c=canvas.getContext('2d')!,stream=canvas.captureStream(30),chunks:Blob[]=[]
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))
 if(!mime)throw Error('This browser cannot record a WebM preview.')
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000})
 const text=(id:string)=>document.getElementById(id)?.textContent?.trim()??''
 const started=performance.now(),duration=16_000
 const paint=()=>{
  const w=canvas.width,h=canvas.height,head=portrait?120:100,foot=portrait?132:94
  c.fillStyle='#101e2b';c.fillRect(0,0,w,h)
  const scale=Math.min(w/source.width,(h-head-foot)/source.height),sw=source.width*scale,sh=source.height*scale
  c.drawImage(source,(w-sw)/2,head+(h-head-foot-sh)/2,sw,sh)
  c.textBaseline='middle';c.textAlign='left';c.fillStyle='#efd29a';c.font='600 38px sans-serif';c.fillText('NIGHTWARD',36,head/2)
  c.textAlign='right';c.font='28px sans-serif';c.fillStyle='#e4ece4';c.fillText(text('wave').replace(/\s+/g,' '),w-36,head/2)
  c.textAlign='left';c.font='26px sans-serif';c.fillStyle='#e4ece4';c.fillText(text('forecast').replace(/\s+/g,' '),36,h-foot/2,portrait?w-72:w*.58)
  if(!portrait){c.textAlign='right';c.fillStyle='#efd29a';c.fillText(`${text('light')} light   ·   ${text('glow')} glow`,w-36,h-foot/2)}
  if(performance.now()-started<duration)requestAnimationFrame(paint);else recorder.stop()
 }
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
 const done=new Promise<void>(resolve=>{recorder.onstop=()=>{
  stream.getTracks().forEach(t=>t.stop())
  const url=URL.createObjectURL(new Blob(chunks,{type:mime})),a=document.createElement('a');a.href=url;a.download=`nightward-${portrait?'portrait':'landscape'}-resubmission.webm`;a.textContent='Download '+(portrait?'portrait':'landscape')+' preview';document.querySelector('.qa-bar')?.append(a);resolve()
 }})
 recorder.start();paint();await done
}

export async function exportCover(format:string){
 const sizes:Record<string,[number,number]>={landscape:[1920,1080],portrait:[800,1200],square:[800,800]}
 const size=sizes[format];if(!size)return
 const {drawCover}=await import('../../scripts/crazygames-cover')
 const canvas=document.createElement('canvas');[canvas.width,canvas.height]=size;drawCover(canvas)
 canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cover-${format}.png`;a.textContent='Download '+format+' cover';document.querySelector('.qa-bar')?.append(a)},'image/png')
}
