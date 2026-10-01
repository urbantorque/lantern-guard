import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Preferences } from '@capacitor/preferences'
import { onStorageChanged } from '../game/save-store'

const NATIVE_KEY = 'lanternlocks-durable-v1'
const REVISION = 'lanternlocks.revision'
let writing = false
let pending: string | null = null

/** Native preferences survive a WebKit website-data purge. Nothing leaves the device. */
export async function initializePlatform() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { value } = await Preferences.get({ key: NATIVE_KEY })
    if (value) {
      const backup: unknown = JSON.parse(value)
      if (backup && typeof backup === 'object' && 'revision' in backup && 'entries' in backup) {
        const b = backup as { revision: number; entries: Record<string, string> }
        if (typeof b.revision === 'number' && b.entries && typeof b.entries === 'object' && b.revision > Number(localStorage.getItem(REVISION) ?? 0)) {
          const entries = Object.entries(b.entries)
          if (entries.every(([k, v]) => k.startsWith('lanternlocks.') && typeof v === 'string')) {
            for (const k of Object.keys(localStorage).filter(k => k.startsWith('lanternlocks.'))) localStorage.removeItem(k)
            for (const [k, v] of entries) localStorage.setItem(k, v)
            localStorage.setItem(REVISION, String(b.revision))
          }
        }
      }
    }
  } catch { /* Browser save remains usable if the native mirror is unavailable. */ }
  onStorageChanged(() => {
    try {
      const revision = Date.now()
      localStorage.setItem(REVISION, String(revision))
      const entries = Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('lanternlocks.')).map(k => [k, localStorage.getItem(k)!]))
      pending = JSON.stringify({ revision, entries })
      void flushNativeSave()
    } catch { reportNativeSaveFailure() }
  })
}

function reportNativeSaveFailure() {
  window.dispatchEvent(new Event('native-save-failed'))
}

export async function flushNativeSave() {
  if (writing || !Capacitor.isNativePlatform()) return
  writing = true
  try {
    while (pending !== null) {
      const value = pending
      pending = null
      try { await Preferences.set({ key: NATIVE_KEY, value }) }
      catch { pending ??= value; reportNativeSaveFailure(); break }
    }
  } finally { writing = false }
}

/** Background time never advances a night. Legacy callers can retain manual resume. */
export function watchAppState(suspend: () => void, resume: () => void = () => {}) {
  const background = () => { suspend(); void flushNativeSave() }
  document.addEventListener('visibilitychange', () => { if (document.hidden) background();else resume() })
  window.addEventListener('pagehide', background)
  window.addEventListener('pageshow', resume)
  if (Capacitor.isNativePlatform()) {
    void NativeApp.addListener('appStateChange', ({ isActive }) => { if (!isActive) background();else resume() })
  }
}

let lastHaptic = 0
export function platformHaptic(ms: number) {
  if (performance.now() - lastHaptic < 75) return
  lastHaptic = performance.now()
  if (Capacitor.isNativePlatform()) {
    void Haptics.impact({ style: ms >= 30 ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
  } else if ('vibrate' in navigator) {
    try { navigator.vibrate(ms) } catch { /* unsupported */ }
  }
}
