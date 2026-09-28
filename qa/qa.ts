import compactFixtures from './compact-fixtures.json'
import gardensFixtures from './gardens-fixtures.json'
import { sound } from '../src/core/audio'
import refinementFixtures from './refinement-fixtures.json'
import fixtures from './fixtures.json'
import growthFixtures from './growth-fixtures.json'
import guardFixtures from './guard-fixtures.json'
import journeyFixtures from './journey-fixtures.json'
import continuityFixtures from './continuity-fixtures.json'
import { Sim, DT, type SaveSnapshot } from '../src/game/sim'
import { clearRun, loadSettings, saveRun, saveSettings, saveCheckpoint } from '../src/game/progress'
import { selectSlot } from '../src/game/save-store'
import { Renderer } from '../src/render/renderer'

if (!import.meta.env.DEV) throw new Error('QA fixtures require the development server')
sound.settings.muted = true
const backupKey = 'qa.original-test-data'
const backup = () => {
  if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('lanternlocks.')).map(k => [k, localStorage.getItem(k)]))))
}
document.querySelectorAll<HTMLButtonElement>('[data-fixture]').forEach(b => b.onclick = () => {
  backup()
  saveSettings({ ...loadSettings(), muted: true })
  const all: Record<string, unknown> = { ...fixtures, ...growthFixtures, ...guardFixtures, ...journeyFixtures, ...continuityFixtures, ...refinementFixtures, ...gardensFixtures, ...compactFixtures }
  const snapshot = all[b.dataset.fixture!] as SaveSnapshot
  selectSlot(snapshot.challenge.id ? 'challenge' : 'campaign')
  clearRun()
  if (b.dataset.fixture === 'retry-loss') saveCheckpoint(Sim.restore(continuityFixtures['retry-checkpoint'] as SaveSnapshot), [])
  if (b.dataset.fixture === 'compact-start') localStorage.removeItem('lanternlocks.coach.v1')
  if (b.dataset.fixture === 'new-journey') localStorage.removeItem('lanternlocks.coach.v1')
  else saveRun(snapshot)
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
function benchmark(button: HTMLButtonElement, snapshot: SaveSnapshot) {
  button.disabled = true
  const sim = Sim.restore(snapshot)
  const renderer = new Renderer(document.querySelector<HTMLCanvasElement>('#bench')!)
  renderer.attach(sim)
  if (sim.challenge.gardens) renderer.setZone('gardens')
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

document.querySelector<HTMLButtonElement>('#benchmark')!.onclick = () => benchmark(document.querySelector<HTMLButtonElement>('#benchmark')!, fixtures.reedbank as SaveSnapshot)
document.querySelector<HTMLButtonElement>('#benchmark-gardens')!.onclick = () => benchmark(document.querySelector<HTMLButtonElement>('#benchmark-gardens')!, gardensFixtures['gardens-busy'] as SaveSnapshot)
