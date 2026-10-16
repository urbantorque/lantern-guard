import {spawnSync} from 'node:child_process'
import {mkdirSync,statSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'

const ffmpeg=process.env.FFMPEG_PATH||'artifacts/crazygames/encoder/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
const run=args=>{const result=spawnSync(ffmpeg,args,{encoding:'utf8',maxBuffer:8_000_000});if(result.error)throw result.error;assert.equal(result.status,0,result.stderr);return result}
const reports=[]
mkdirSync('artifacts/crazygames',{recursive:true})
for(const [name,width,height]of [['landscape',1920,1080],['portrait',1080,1620]]){
 const file=`release/crazygames/preview-${name}.mp4`
 if(!process.argv.includes('--verify-only'))run(['-hide_banner','-loglevel','error','-y','-i',`release/crazygames/preview-${name}.webm`,'-loop','1','-framerate','30','-i',`release/crazygames/cover-${name}.png`,'-filter_complex',`[1:v]scale=${width}:${height},setsar=1[cover];[0:v][cover]overlay=enable='lt(t,0.18)':shortest=1[v]`,'-map','[v]','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',file])
 const info=spawnSync(ffmpeg,['-hide_banner','-i',file],{encoding:'utf8'}).stderr||''
 const durationParts=info.match(/Duration: (\d+):(\d+):([\d.]+)/)
 assert(durationParts,info)
 const duration=+durationParts[1]*3600 + +durationParts[2]*60 + +durationParts[3]
 assert(duration>=15&&duration<=20,`Video duration: ${duration}`)
 assert(info.includes('Video: h264'),info)
 assert(info.includes(`${width}x${height}`),info)
 assert(!info.includes('Audio:'),'Preview must be silent')
 assert(statSync(file).size<50_000_000,'Video size limit')
 run(['-hide_banner','-loglevel','error','-i',file,'-f','null','-'])
 run(['-hide_banner','-loglevel','error','-y','-ss','6','-i',file,'-frames:v','1',`artifacts/crazygames/preview-frame-${name}-mp4.png`])
 reports.push({file,bytes:statSync(file).size,duration,width,height,audioTracks:0,codec:'h264',container:'mp4',decodedEntireFile:true})
 console.log(`PASS ${name}: H.264 MP4, ${width}x${height}, ${duration}s, silent, fully decoded`)
}
writeFileSync('artifacts/crazygames/media-report.json',JSON.stringify(reports,null,2)+'\n')
