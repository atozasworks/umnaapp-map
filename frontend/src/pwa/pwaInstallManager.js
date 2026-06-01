/** Global store for the browser's deferred PWA install prompt (beforeinstallprompt). */

let deferredPrompt = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(deferredPrompt)
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
export function triggerInstall() {
  const prompt = deferredPrompt
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

export function subscribeInstallPrompt(listener) {
  listeners.add(listener)
  listener(deferredPrompt)
  return () => listeners.delete(listener)
}
