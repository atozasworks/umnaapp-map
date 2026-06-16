import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { usePushNotifications } from '../hooks/usePushNotifications'

const CATEGORIES = [
  { key: 'placeApproved', label: 'Place approvals', desc: 'When a place you added is approved.' },
  { key: 'placeAdded', label: 'New community places', desc: 'When someone adds a new place.' },
  { key: 'festival', label: 'Festivals & jatres', desc: 'When a festival near you is happening.' },
  { key: 'businessClaim', label: 'Business claims', desc: 'Updates on your ownership claims.' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-primary-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/**
 * Notification preferences: master push enable/disable (browser subscription +
 * server push flag) and per-category mute toggles. Used inside Settings.
 */
export default function NotificationSettings({ onToast }) {
  const push = usePushNotifications()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)

  const notify = useCallback((msg, type) => onToast?.(msg, type), [onToast])

  useEffect(() => {
    let alive = true
    api
      .get('/notifications/preferences')
      .then(({ data }) => { if (alive) setPrefs(data.preferences) })
      .catch(() => { if (alive) setPrefs(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const savePref = useCallback(async (key, value) => {
    setSavingKey(key)
    const prev = prefs
    setPrefs((p) => ({ ...p, [key]: value }))
    try {
      const { data } = await api.put('/notifications/preferences', { [key]: value })
      setPrefs(data.preferences)
    } catch (err) {
      setPrefs(prev)
      notify(err.response?.data?.error || 'Failed to save preference', 'error')
    } finally {
      setSavingKey(null)
    }
  }, [prefs, notify])

  const handleMasterToggle = useCallback(async (next) => {
    if (next) {
      const ok = await push.subscribe()
      if (!ok) {
        notify(push.error || 'Could not enable push notifications', 'error')
        return
      }
      await savePref('pushEnabled', true)
      notify('Push notifications enabled')
    } else {
      await push.unsubscribe()
      await savePref('pushEnabled', false)
      notify('Push notifications disabled')
    }
  }, [push, savePref, notify])

  const pushOn = push.subscribed && prefs?.pushEnabled !== false

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Master push switch */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">Push notifications</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {!push.supported
              ? 'Not supported on this device/browser.'
              : !push.enabledOnServer
                ? 'Not configured on the server yet.'
                : push.permission === 'denied'
                  ? 'Blocked in browser settings — allow notifications to enable.'
                  : 'Get alerts even when the app is closed.'}
          </p>
        </div>
        <Toggle
          checked={pushOn}
          disabled={push.busy || !push.canPrompt}
          onChange={handleMasterToggle}
        />
      </div>

      {/* Category preferences */}
      <div className="border-t border-slate-200">
        <div className="px-5 pt-3 pb-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notify me about</p>
        </div>
        {loading ? (
          <div className="px-5 py-4 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c.key} className="px-5 py-3 flex items-center justify-between gap-3 border-t border-slate-50 first:border-t-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{c.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                </div>
                <Toggle
                  checked={prefs ? prefs[c.key] !== false : true}
                  disabled={savingKey === c.key}
                  onChange={(v) => savePref(c.key, v)}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
          Muting a category stops both in-app and push alerts for it. You'll always be told about your own place
          submissions.
        </p>
      </div>
    </div>
  )
}
