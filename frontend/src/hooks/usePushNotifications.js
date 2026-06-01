import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
  return arr
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false)
  const [enabledOnServer, setEnabledOnServer] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(ok)
    if (!ok) return

    api
      .get('/notifications/push/vapid-public-key')
      .then(({ data }) => setEnabledOnServer(Boolean(data.enabled && data.publicKey)))
      .catch(() => setEnabledOnServer(false))

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {})
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported) return false
    setBusy(true)
    setError(null)
    try {
      const { data: keyData } = await api.get('/notifications/push/vapid-public-key')
      if (!keyData.enabled || !keyData.publicKey) {
        throw new Error('Push notifications are not configured on the server')
      }

      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        })
      }

      const json = subscription.toJSON()
      await api.post('/notifications/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
      })
      setSubscribed(true)
      return true
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not enable push notifications')
      return false
    } finally {
      setBusy(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await api.delete('/notifications/push/unsubscribe', {
          data: { endpoint: subscription.endpoint },
        })
        await subscription.unsubscribe()
      } else {
        await api.delete('/notifications/push/unsubscribe')
      }
      setSubscribed(false)
      return true
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not disable push notifications')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return {
    supported,
    enabledOnServer,
    subscribed,
    permission,
    busy,
    error,
    subscribe,
    unsubscribe,
    canPrompt: supported && enabledOnServer && permission !== 'denied',
  }
}
