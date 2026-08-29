import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { usePushNotifications } from '../hooks/usePushNotifications'

const CATEGORIES = [
  { key: 'placeApproved', label: 'Place approvals', desc: 'When a place you added is approved.' },
  { key: 'placeAdded', label: 'New community places', desc: 'When someone adds a new place near you.' },
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
      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? 'bg-sky-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
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
    <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(14,165,233,0.12)] overflow-hidden">
      {/* Master push switch */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-md shadow-sky-500/25 flex items-center justify-center flex-shrink-0 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 tracking-tight">Push notifications</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {!push.supported
                ? 'Not supported on this device/browser.'
                : !push.enabledOnServer
                  ? 'Not configured on the server yet.'
                  : push.permission === 'denied'
                    ? 'Blocked in browser settings — allow notifications to enable.'
                    : 'Get alerts even when the app is closed.'}
            </p>
          </div>
        </div>
        <Toggle
          checked={pushOn}
          disabled={push.busy || !push.canPrompt}
          onChange={handleMasterToggle}
        />
      </div>

      {/* Category preferences */}
      <div className="border-t border-slate-100">
        <div className="px-5 pt-3.5 pb-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Notify me about</p>
        </div>
        {loading ? (
          <div className="px-5 py-4 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-5 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c.key} className="px-5 py-3.5 flex items-center justify-between gap-3 border-t border-slate-50 first:border-t-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{c.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.desc}</p>
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
        <p className="px-5 py-3.5 text-[11px] text-slate-400 border-t border-slate-100 leading-relaxed">
          Muting a category stops both in-app and push alerts for it. You&apos;ll always be told about your own place
          submissions.
        </p>
      </div>
    </div>
  )
}
