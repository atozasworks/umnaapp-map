/** Global store for the browser's deferred PWA install prompt (beforeinstallprompt). */

const INSTALLED_KEY = 'umna-pwa-installed'

let deferredPrompt = null
let installed = false
const listeners = new Set()
let snapshot = { canInstall: false, installed: false }
const serverSnapshot = { canInstall: false, installed: false }

function readStoredInstalled() {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}

function writeStoredInstalled(value) {
  try {
    if (value) localStorage.setItem(INSTALLED_KEY, '1')
    else localStorage.removeItem(INSTALLED_KEY)
  } catch {
    /* ignore */
  }
}

function publish() {
  const nextCanInstall = deferredPrompt != null
  if (snapshot.canInstall === nextCanInstall && snapshot.installed === installed) return
  snapshot = { canInstall: nextCanInstall, installed }
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      /* ignore listener errors */
    }
  })
}

/** Call once at app startup — before React render — so the event is never missed. */
export function initPwaInstallCapture() {
  if (typeof window === 'undefined' || window.__pwaInstallCaptureInit) return
  window.__pwaInstallCaptureInit = true

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function getDeferredInstallPrompt() {
  return deferredPrompt
}

export function canTriggerInstall() {
  return deferredPrompt != null
}

/**
 * Opens the native install dialog. Must run synchronously inside a user click handler.
 * @returns {{ ok: true, userChoice: Promise<{ outcome: string }> } | { ok: false }}
 */
export function getInstallSnapshot() {
  return snapshot
}

export function getInstallServerSnapshot() {
  return serverSnapshot
}

export function canTriggerInstall() {
  return deferredPrompt != null
}

export function isAppInstalled() {
  return installed
  if (!prompt) return { ok: false }

  // Do not await before prompt() — breaks the user-gesture requirement in Chromium.
  prompt.prompt()

  const userChoice = prompt.userChoice.then((choice) => {
    if (choice.outcome === 'accepted') {
      deferredPrompt = null
      notify()
    }
    return choice
  })

  return { ok: true, userChoice }
}

      installed = true
      writeStoredInstalled(true)
      publish()
  listeners.add(listener)
  listener(deferredPrompt)
  return () => listeners.delete(listener)
}
