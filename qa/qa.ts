import fixtures from './fixtures.json'
import growthFixtures from './growth-fixtures.json'
import guardFixtures from './guard-fixtures.json'
import { Sim, DT, type SaveSnapshot } from '../src/game/sim'
import { clearRun, loadSettings, saveRun, saveSettings } from '../src/game/progress'
import { Renderer } from '../src/render/renderer'

if (!import.meta.env.DEV) throw new Error('QA fixtures require the development server')
const backupKey = 'qa.original-test-data'
const backup = () => {
  if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('lanternlocks.')).map(k => [k, localStorage.getItem(k)]))))
}
document.querySelectorAll<HTMLButtonElement>('[data-fixture]').forEach(b => b.onclick = () => {
  backup()
  saveSettings({ ...loadSettings(), muted: true })
  clearRun()
  const all: Record<string, unknown> = { ...fixtures, ...growthFixtures, ...guardFixtures }
  saveRun(all[b.dataset.fixture!] as SaveSnapshot)
  location.assign('/')
})
document.querySelector<HTMLButtonElement>('#restore')!.onclick = () => {
  const previous = localStorage.getItem(backupKey)
  if (!previous) return
  for (const key of Object.keys(localStorage).filter(k => k.startsWith('lanternlocks.'))) localStorage.removeItem(key)
  for (const [k, v] of Object.entries(JSON.parse(previous))) localStorage.setItem(k, String(v))
  saveSettings({ ...loadSettings(), muted: true })
  localStorage.removeItem(backupKey)
  location.assign('/')
}
document.querySelector<HTMLButtonElement>('#benchmark')!.onclick = () => {
  const button = document.querySelector<HTMLButtonElement>('#benchmark')!
  button.disabled = true
  const sim = Sim.restore(fixtures.reedbank as SaveSnapshot)
  const renderer = new Renderer(document.querySelector<HTMLCanvasElement>('#bench')!)
  renderer.attach(sim)
  renderer.resize(375, 560, Math.min(2, devicePixelRatio))
  const costs: number[] = []
  const result = document.querySelector<HTMLOutputElement>('#result')!
  let peak = 0
  const frame = () => {
    const start = performance.now()
    sim.step(DT)
    renderer.handleEvents(sim)
    renderer.draw(sim, DT, { selection: null, preview: null, armed: null, hint: null, paused: false })
    peak = Math.max(peak, sim.enemies.length)
    costs.push(performance.now() - start)
    if (costs.length < 300) { requestAnimationFrame(frame); return }
    const steady = costs.slice(30).sort((a, b) => a - b)
    result.textContent = `300 frames; peak ${peak} Mopes. Frame work median ${steady[Math.floor(steady.length / 2)].toFixed(2)} ms; p95 ${steady[Math.floor(steady.length * 0.95)].toFixed(2)} ms. Desktop browser measurement, not an iPhone result.`
    button.disabled = false
  }
  result.textContent = 'Measuring 300 late-wave frames...'
  requestAnimationFrame(frame)
}
