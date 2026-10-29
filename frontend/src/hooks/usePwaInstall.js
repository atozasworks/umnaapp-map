import { useCallback, useState, useSyncExternalStore } from 'react'
import {
  getInstallServerSnapshot,
  getInstallSnapshot,
  subscribeInstallPrompt,
  triggerInstall,
} from '../pwa/pwaInstallManager'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream
}

function subscribeCanInstall(onStoreChange) {
  return subscribeInstallPrompt(() => onStoreChange())
}

function getCanInstallSnapshot() {
  return getInstallSnapshot()
}

/**
 * @param {string} dismissStorageKey - sessionStorage key when user dismisses
 */
export function usePwaInstall(dismissStorageKey = 'pwa-install-dismissed') {
  const installState = useSyncExternalStore(
    subscribeCanInstall,
    getCanInstallSnapshot,
    getInstallServerSnapshot,
  )
  const canInstall = installState.canInstall
  const isInstalled = isStandaloneMode() || installState.installed

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissStorageKey) === '1'
    } catch {
      return false
    }
  })

  const isStandalone = isStandaloneMode()

  const isStandalone = isStandaloneMode()
  const isIos = isIosSafari()

  /** Run directly from onClick — opens native install UI immediately when available. */
  const promptInstall = useCallback(() => {
    const result = triggerInstall()
    if (!result.ok) return { ok: false }
    return { ok: true, userChoice: result.userChoice }
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      sessionStorage.setItem(dismissStorageKey, '1')
    } catch {
      /* ignore */
    }
  }, [dismissStorageKey])

  return {
    isInstalled,
    isIos,
    dismissed,
    dismiss,
    promptInstall,
    showPopup: !isInstalled && !dismissed,
    promptInstall,
    showPopup: !isStandalone && !dismissed,
  }
}
