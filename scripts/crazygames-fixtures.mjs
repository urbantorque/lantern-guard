import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
// Run balance:siege first to regenerate these from the paid campaign reference build.
const out='qa/fixtures/crazygames';mkdirSync(out,{recursive:true})
for(const name of ['boundary-8','boundary-24','active-16','active-17','final']){
 const value=JSON.parse(readFileSync(`artifacts/siege/${name}.json`,'utf8'))
 assert.equal(value.challenge.siege,1);assert.equal(value.challenge.skirmish.to,40)
 writeFileSync(`${out}/${name}.json`,JSON.stringify(value)+'\n')
}
console.log('Saved five paid campaign snapshots for reproducible portal checks and captures.')
