import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs'
import {resolve,relative} from 'node:path'
import {deflateRawSync,inflateRawSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'

const root=resolve('dist-crazygames'),out='release/crazygames'
const walk=dir=>readdirSync(dir).sort().flatMap(n=>{const p=resolve(dir,n);return statSync(p).isDirectory()?walk(p):[p]})
const files=walk(root).map(path=>({name:relative(root,path).replaceAll('\\','/'),data:readFileSync(path)}))
assert(files.some(f=>f.name==='index.html'),'index.html must be at the ZIP root')
assert(files.length<=1500,'CrazyGames file count limit')
const total=files.reduce((n,f)=>n+f.data.length,0)
assert(total<=20_000_000,'Keep the complete Basic Launch bundle below the mobile 20 MB limit')
const html=files.find(f=>f.name==='index.html').data.toString()
assert(!/\b(?:src|href)=["'](?:https?:|\/)/.test(html),'Entry resources must use relative paths')
assert(!html.includes('rel="preload"'),'Portal entry must not preload the unused title illustration')
const crc32=data=>{let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
// Portable ZIP writer: deflated entries, UTF-8 paths, fixed DOS date, no external tool dependency.
const local=[],central=[];let offset=0
for(const f of files){
 const name=Buffer.from(f.name),compressed=deflateRawSync(f.data),crc=crc32(f.data)
 assert.deepEqual(inflateRawSync(compressed),f.data)
 const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(f.data.length,22);h.writeUInt16LE(name.length,26)
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);h.copy(c,6,4,30);c.writeUInt32LE(offset,42)
 local.push(h,name,compressed);central.push(c,name);offset+=h.length+name.length+compressed.length
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
const zip=Buffer.concat([...local,directory,end]);mkdirSync(out,{recursive:true});writeFileSync(`${out}/nightward-basic.zip`,zip)
const git=arg=>execFileSync('git',arg,{encoding:'utf8'}).trim()
const manifest={edition:'CrazyGames Basic Launch',sdk:false,advertising:false,entry:'index.html',campaignWaves:40,sourceCommit:git(['rev-parse','HEAD']),trackedChanges:!!git(['status','--porcelain','--untracked-files=no']),fileCount:files.length,uncompressedBytes:total,zipBytes:zip.length,zipSha256:createHash('sha256').update(zip).digest('hex'),files:files.map(f=>({path:f.name,bytes:f.data.length,sha256:createHash('sha256').update(f.data).digest('hex')}))}
writeFileSync(`${out}/build-manifest.json`,JSON.stringify(manifest,null,2)+'\n')
console.log(`Packaged ${out}/nightward-basic.zip: ${files.length} files, ${(total/1e6).toFixed(2)} MB unpacked, ${(zip.length/1e6).toFixed(2)} MB ZIP. No SDK or ads.`)
