import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  canTriggerInstall,
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
  return canTriggerInstall()
}

function getCanInstallServerSnapshot() {
  return false
}

/**
 * @param {string} dismissStorageKey - sessionStorage key when user dismisses
 */
export function usePwaInstall(dismissStorageKey = 'pwa-install-dismissed') {
  const canInstall = useSyncExternalStore(
    subscribeCanInstall,
    getCanInstallSnapshot,
    getCanInstallServerSnapshot,
  )

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissStorageKey) === '1'
    } catch {
      return false
    }
  })

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
    canInstall,
    isStandalone,
    isIos,
    dismissed,
    dismiss,
    promptInstall,
    showPopup: !isStandalone && !dismissed,
  }
}
