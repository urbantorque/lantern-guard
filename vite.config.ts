import { defineConfig } from 'vite'

export default defineConfig(({mode})=>({
  base: './',
  plugins:mode==='crazygames'?[{name:'portal-entry',transformIndexHtml:(html:string)=>html.replace(/\s*<link rel="preload"[^>]*>/g,'')}]:[],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', assetsInlineLimit: 0, outDir:mode==='crazygames'?'dist-crazygames':'dist' },
}))
