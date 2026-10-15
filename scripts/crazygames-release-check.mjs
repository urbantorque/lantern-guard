import {readFileSync,writeFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
const out='release/crazygames',read=p=>JSON.parse(readFileSync(p,'utf8')),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
const manifest=read(`${out}/build-manifest.json`),browser=read('artifacts/crazygames/browser-report.json'),media=read('artifacts/crazygames/media-report.json')
assert.equal(manifest.zipSha256,hash(`${out}/nightward-basic.zip`))
assert(manifest.files.some(f=>f.path==='THIRD-PARTY-NOTICES.txt'),'Include the bundled font, icon and runtime licence notices')
for(const f of manifest.files){const unpacked=execFileSync('tar',['-xOf',`${out}/nightward-basic.zip`,f.path],{maxBuffer:25_000_000});assert.equal(createHash('sha256').update(unpacked).digest('hex'),f.sha256,'ZIP extraction: '+f.path)}
assert.equal(browser.viewports.length,12,'Run the full portal QA, not --smoke')
for(const v of browser.viewports){assert(v.firstPlacement&&v.fortyWaves&&v.resumeExact&&v.upgradesVisible);assert.deepEqual(v.errors,[]);assert.deepEqual(v.bad,[]);assert.deepEqual(v.external,[])}
for(const k of ['continuity8to9','freeActRetry','lateForecast','completedSavePreserved','damagedSavePreserved'])assert.equal(browser[k],true)
assert.equal(media.length,2)
for(const v of media){assert(v.duration>=15&&v.duration<=20);assert.equal(v.audioTracks,0);assert.equal(v.bytes,statSync(v.file).size)}
const covers=[]
for(const [name,w,h]of [['landscape',1920,1080],['portrait',800,1200],['square',800,800]]){const file=`${out}/cover-${name}.png`,png=readFileSync(file);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);covers.push({file,width:w,height:h,bytes:png.length,sha256:hash(file)})}
const rows=readFileSync(`${out}/newcomer-sessions.csv`,'utf8').trim().split(/\r?\n/).map(r=>r.split(','));assert.equal(rows.length,9);for(const row of rows)assert.equal(row.length,rows[0].length,'Consistent playtest CSV columns')
writeFileSync(`${out}/browser-validation.json`,JSON.stringify(browser,null,2)+'\n')
writeFileSync(`${out}/media-validation.json`,JSON.stringify({covers,previews:media.map(v=>({...v,sha256:hash(v.file)}))},null,2)+'\n')
writeFileSync(`${out}/readiness.json`,JSON.stringify({edition:'CrazyGames Basic Launch',zipSha256:manifest.zipSha256,sourceCommit:manifest.sourceCommit,automatedChecks:'passed',campaignWaves:40,ads:false,sdk:false,humanPlaytest:'pending',physicalMobileTest:'pending',publisherSubmission:'not submitted',remaining:['Observe eight newcomer sessions using newcomer-sessions.csv','Verify intended physical browser/device support','Account owner uploads and submits through CrazyGames developer portal']},null,2)+'\n')
console.log('PASS launch pack: ZIP hash, twelve viewports, campaign continuity, free retries, three covers, two silent previews and playtest sheet.')
