// Turns the Vite build in dist/ into a page for the claude.ai Artifact host:
// the host supplies <html>/<head>/<body>, so we keep the title, stylesheet
// link, body markup and module script, and publish assets alongside.
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const title = html.match(/<title>[\s\S]*?<\/title>/)[0]
const styles = [...html.matchAll(/<link rel="stylesheet"[^>]*>/g)].map((m) => m[0])
const scripts = [...html.matchAll(/<script type="module"[^>]*><\/script>/g)].map((m) => m[0])
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script type="module"[^>]*><\/script>/g, '')
const out = [title, '<meta name="theme-color" content="#081319" />', ...styles, body.trim(), ...scripts].join('\n')
const outDir = path.resolve('dist-artifact')
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true })
fs.writeFileSync(path.join(outDir, 'lanternlocks.html'), out)
const files = {}
for (const f of fs.readdirSync(path.join(dist, 'assets'))) {
  fs.copyFileSync(path.join(dist, 'assets', f), path.join(outDir, 'assets', f))
  files[`assets/${f}`] = path.join(outDir, 'assets', f)
}
fs.copyFileSync(path.join(dist, 'icon.svg'), path.join(outDir, 'icon.svg'))
files['icon.svg'] = path.join(outDir, 'icon.svg')
fs.writeFileSync(path.join(outDir, 'files.json'), JSON.stringify(files, null, 2))
console.log(out.slice(0, 400))
console.log(Object.keys(files))
