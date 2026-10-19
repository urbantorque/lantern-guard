import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const bundledPackages = [
  '@fontsource-variable/dm-sans',
  '@phosphor-icons/core',
  '@capacitor/core',
  '@capacitor/app',
  '@capacitor/haptics',
  '@capacitor/preferences',
]

export default defineConfig(({mode})=>({
  base: './',
  plugins:[
    {
      name:'third-party-notices',
      generateBundle() {
        const notices = bundledPackages.map(name => {
          const root = new URL(`./node_modules/${name}/`, import.meta.url)
          const {version} = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
          return `${name} ${version}\n${'='.repeat(72)}\n${readFileSync(new URL('LICENSE', root), 'utf8').trim()}`
        })
        this.emitFile({type:'asset',fileName:'THIRD-PARTY-NOTICES.txt',source:`Third-party components distributed with Nightward\n\n${notices.join('\n\n\n')}\n`})
        this.emitFile({type:'asset',fileName:'icon.svg',source:readFileSync(new URL('./public/icon.svg',import.meta.url))})
      },
    },
    ...(mode==='crazygames'?[{name:'portal-entry',transformIndexHtml:(html:string)=>html.replace(/\s*<link rel="preload"[^>]*>/g,'')}]:[]),
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  // The title is rendered from gameplay art. Historical illustrations remain in
  // source, but are no longer downloaded or shipped with either release build.
  build: { target: 'es2022', assetsInlineLimit: 0, copyPublicDir:false, outDir:mode==='crazygames'?'dist-crazygames':'dist' },
}))
