import {existsSync,readFileSync,writeFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
const out='release/crazygames',read=p=>JSON.parse(readFileSync(p,'utf8')),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
const manifest=read(`${out}/build-manifest.json`),browser=read('artifacts/crazygames/resubmission-browser.json'),media=read('artifacts/crazygames/media-report.json')
const publisher=existsSync(`${out}/publisher-status.json`)?read(`${out}/publisher-status.json`):null
const submittedBuild=publisher?.zipSha256===manifest.zipSha256
assert.equal(manifest.zipSha256,hash(`${out}/nightward-basic.zip`))
assert(manifest.files.some(f=>f.path==='THIRD-PARTY-NOTICES.txt'),'Include the bundled font, icon and runtime licence notices')
for(const f of manifest.files){const unpacked=execFileSync('tar',['-xOf',`${out}/nightward-basic.zip`,f.path],{maxBuffer:25_000_000});assert.equal(createHash('sha256').update(unpacked).digest('hex'),f.sha256,'ZIP extraction: '+f.path)}
assert.equal(browser.version,2,'Use current resubmission evidence, not the original launch report')
assert.equal(browser.zipSha256,manifest.zipSha256,'Browser evidence must identify this exact ZIP')
assert.equal(browser.sourceCommit,manifest.sourceCommit)
assert.equal(browser.viewports.length,12,'Check the full portal viewport matrix')
for(const v of browser.viewports){assert(v.battlefieldFits&&v.controlsFit&&v.noHorizontalOverflow,`Layout ${v.width}x${v.height}`)}
for(const k of ['paidFirstPlacement','automaticWave1','pausedReloadVisible','stationaryInspectors','signatureChoices','directCommand','firstBossForecast','finalVictory','menuNavigation','reducedMotionUi','savedVolume','skippableTips'])assert.equal(browser.flows[k],true,k)
assert.deepEqual(browser.consoleErrors,[])
assert.equal(browser.humanPlaytest,false);assert.equal(browser.physicalDeviceTested,false)
assert.equal(media.length,2)
for(const v of media){assert(v.file.endsWith('.mp4'),'The submission form requires MP4 or MOV');assert(v.duration>=15&&v.duration<=20);assert.equal(v.audioTracks,0);assert.equal(v.bytes,statSync(v.file).size)}
const covers=[]
for(const [name,w,h]of [['landscape',1920,1080],['portrait',800,1200],['square',800,800]]){const file=`${out}/cover-${name}.png`,png=readFileSync(file);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);covers.push({file,width:w,height:h,bytes:png.length,sha256:hash(file)})}
const rows=readFileSync(`${out}/newcomer-sessions.csv`,'utf8').trim().split(/\r?\n/).map(r=>r.split(','));assert.equal(rows.length,9);for(const row of rows)assert.equal(row.length,rows[0].length,'Consistent playtest CSV columns')
writeFileSync(`${out}/browser-validation.json`,JSON.stringify(browser,null,2)+'\n')
writeFileSync(`${out}/media-validation.json`,JSON.stringify({covers,previews:media.map(v=>({...v,sha256:hash(v.file)}))},null,2)+'\n')
writeFileSync(`${out}/readiness.json`,JSON.stringify({edition:'CrazyGames Basic Launch resubmission',zipSha256:manifest.zipSha256,sourceCommit:manifest.sourceCommit,automatedChecks:'passed',browserChecks:'passed',campaignWaves:40,campaignRules:'siege2; siege1 saves preserved',ads:false,sdk:false,humanPlaytest:'pending',physicalMobileTest:'pending',humanAudioListening:'pending',publisherSubmission:submittedBuild?publisher.status:'prepared; not submitted',publisherSubmittedOn:submittedBuild?publisher.submittedOn:null,previousSubmissionStatus:publisher?.status??'unknown',remaining:['Observe eight newcomer sessions using newcomer-sessions.csv','Verify intended physical browser/device support','Listen to the mix on speakers and headphones','Upload this candidate and check the hosted QA preview','Review and submit this build through the CrazyGames developer portal']},null,2)+'\n')
console.log('PASS resubmission pack: exact ZIP and source, twelve viewport layouts, observed UI flows, three covers, two silent previews and unfilled human playtest sheet.')
