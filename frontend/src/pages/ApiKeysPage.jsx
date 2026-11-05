import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/AppLogo'
import api from '../services/api'

const FEATURES = [
  {
    id: 'map',
    title: 'Map',
    detail: 'Embed the interactive map: zoom, pan, and place markers.',
  },
  {
    id: 'places',
    title: 'Places',
    detail: 'Search places and read place data from another app.',
  },
  {
    id: 'directions',
    title: 'Directions',
    detail: 'Calculate road distance and duration between two points.',
  },
]

const EMPTY_FORM = { name: '', features: { map: true, places: false, directions: false } }

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

async function copyText(text) {
  await navigator.clipboard.writeText(text)
}

export default function ApiKeysPage() {
  const navigate = useNavigate()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [busyId, setBusyId] = useState('')
  const [editing, setEditing] = useState(null)

  const origin = 'https://umnaapp.com'
  const sampleKey = keys.find((k) => k.status === 'active')?.key || 'YOUR_API_KEY'

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  const load = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/api-keys')
      setKeys(data.keys || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const examples = useMemo(
    () => [
      {
        id: 'map',
        title: 'Map',
        feature: 'Map',
        code: `<iframe
  src="${origin}/embedded-map?key=${sampleKey}&lat=12.97&lng=77.59&zoom=12"
  style="width:100%;height:480px;border:0"
  allow="geolocation"
  title="UMNAAPP Maps">
</iframe>`,
      },
      {
        id: 'sdk',
        title: 'JavaScript SDK',
        feature: 'Map',
        code: `<div id="map" style="width:100%;height:480px"></div>
<script src="${origin}/sdk.js?key=${sampleKey}"></script>
<script>
  const map = UmnaMaps.embed('#map', {
    center: { lat: 12.97, lng: 77.59 },
    zoom: 12,
  });
</script>`,
      },
      {
        id: 'places',
        title: 'Places search',
        feature: 'Places',
        code: `const res = await fetch('${origin}/api/public/search?q=Majestic', {
  headers: { 'X-Api-Key': '${sampleKey}' },
});
const data = await res.json();`,
      },
      {
        id: 'directions',
        title: 'Directions / distance',
        feature: 'Directions',
        code: `const res = await fetch(
  '${origin}/api/public/route?start=12.9716,77.5946&end=12.9352,77.6245&profile=driving',
  { headers: { 'X-Api-Key': '${sampleKey}' } }
);
const route = await res.json();
const km = (route.distance / 1000).toFixed(1);`,
      },
    ],
    [origin, sampleKey]
  )

  const toggleFeature = (id) => {
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [id]: !prev.features[id] },
    }))
  }

  const selectedFeatures = (source) =>
    FEATURES.filter((f) => source[f.id]).map((f) => f.id)

  const handleCreate = async () => {
    const features = selectedFeatures(form.features)
    if (!form.name.trim()) {
      setError('Give the key a name')
      return
    }
    if (!features.length) {
      setError('Select at least one feature')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post('/api-keys', { name: form.name.trim(), features })
      setKeys((prev) => [data.key, ...prev])
      setRevealed((prev) => ({ ...prev, [data.key.id]: true }))
      setCreating(false)
      setForm(EMPTY_FORM)
      showToast('API key created')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create API key')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (id, action) => {
    setBusyId(id + action)
    setError('')
    try {
      if (action === 'delete') {
        await api.delete(`/api-keys/${id}`)
        setKeys((prev) => prev.filter((k) => k.id !== id))
        showToast('API key deleted')
      } else if (action === 'revoke') {
        const { data } = await api.post(`/api-keys/${id}/revoke`)
        setKeys((prev) => prev.map((k) => (k.id === id ? data.key : k)))
        showToast('API key revoked')
      } else if (action === 'regenerate') {
        const { data } = await api.post(`/api-keys/${id}/regenerate`)
        setKeys((prev) => prev.map((k) => (k.id === id ? data.key : k)))
        setRevealed((prev) => ({ ...prev, [id]: true }))
        showToast('New key generated. The old key no longer works.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed')
    } finally {
      setBusyId('')
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    const features = selectedFeatures(editing.features)
    if (!editing.name.trim() || !features.length) {
      setError('Name and at least one feature are required')
      return
    }
    setBusyId(editing.id + 'edit')
    setError('')
    try {
      const { data } = await api.patch(`/api-keys/${editing.id}`, {
        name: editing.name.trim(),
        features,
      })
      setKeys((prev) => prev.map((k) => (k.id === editing.id ? data.key : k)))
      setEditing(null)
      showToast('API key updated')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update API key')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
            aria-label="Back to map"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <AppLogo decorative imgClassName="h-7 w-auto" />
          <h1 className="text-base font-semibold">API Keys</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Credentials</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Create a key, choose Map, Places, and Directions, then paste the key into another app.
              A key can call only the features you enable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setError('')
            }}
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Create API key
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <p className="px-4 py-8 text-sm text-slate-500">Loading keys…</p>
          ) : keys.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">No API keys yet. Create one to use the map from another app.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {keys.map((item) => {
                const open = revealed[item.id]
                const masked = item.key
                  ? `${item.key.slice(0, 16)}…${item.key.slice(-4)}`
                  : `${item.keyPrefix} (full key not stored)`
                return (
                  <li key={item.id} className="px-4 py-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{item.name}</p>
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                              item.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Created {formatWhen(item.createdAt)}
                          {' · '}
                          {item.requestCount || 0} requests
                          {item.lastUsedAt ? ` · Last used ${formatWhen(item.lastUsedAt)}` : ''}
                          {' · '}
                          {item.rateLimitPerMin}/min
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.features.map((f) => (
                          <span key={f} className="text-xs font-medium bg-sky-50 text-sky-800 px-2 py-1 rounded-lg capitalize">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <code className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs break-all">
                        {open ? item.key || 'Regenerate this key to copy a new secret.' : masked}
                      </code>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          onClick={() => setRevealed((prev) => ({ ...prev, [item.id]: !open }))}
                        >
                          {open ? 'Hide' : 'View'}
                        </button>
                        <button
                          type="button"
                          disabled={!item.key}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                          onClick={() => item.key && copyText(item.key).then(() => showToast('Copied'))}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={item.status !== 'active' || busyId === item.id + 'edit'}
                        className="text-xs font-medium text-slate-700 disabled:opacity-40"
                        onClick={() =>
                          setEditing({
                            id: item.id,
                            name: item.name,
                            features: {
                              map: item.features.includes('map'),
                              places: item.features.includes('places'),
                              directions: item.features.includes('directions'),
                            },
                          })
                        }
                      >
                        Edit features
                      </button>
                      <button
                        type="button"
                        disabled={item.status !== 'active' || !!busyId}
                        className="text-xs font-medium text-slate-700 disabled:opacity-40"
                        onClick={() => {
                          if (window.confirm('Generate a new secret? The current key will stop working immediately.')) {
                            runAction(item.id, 'regenerate')
                          }
                        }}
                      >
                        Regenerate
                      </button>
                      <button
                        type="button"
                        disabled={item.status !== 'active' || !!busyId}
                        className="text-xs font-medium text-amber-700 disabled:opacity-40"
                        onClick={() => {
                          if (window.confirm('Revoke this key? Apps using it will be rejected.')) {
                            runAction(item.id, 'revoke')
                          }
                        }}
                      >
                        Revoke
                      </button>
                      <button
                        type="button"
                        disabled={!!busyId}
                        className="text-xs font-medium text-rose-600 disabled:opacity-40"
                        onClick={() => {
                          if (window.confirm('Delete this key permanently?')) runAction(item.id, 'delete')
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Use the key in another app</h2>
            <p className="text-sm text-slate-500 mt-1">
              Send the key as the <code className="text-xs">X-Api-Key</code> header or as <code className="text-xs">?key=</code>.
              Calling a feature that is not enabled returns HTTP 403.
            </p>
          </div>
          <div className="grid gap-3">
            {examples.map((example) => (
              <article key={example.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold">{example.title}</h3>
                    <p className="text-xs text-slate-500">Requires {example.feature}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                    onClick={() => copyText(example.code).then(() => showToast('Example copied'))}
                  >
                    Copy
                  </button>
                </div>
                <pre className="px-4 py-3 text-xs leading-relaxed overflow-x-auto bg-slate-950 text-slate-100">{example.code}</pre>
              </article>
            ))}
          </div>
        </section>
      </main>

      {creating && (
        <Modal title="Create API key" onClose={() => setCreating(false)}>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="My website"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-4"
          />
          <p className="text-sm font-medium mb-2">Features</p>
          <div className="space-y-2 mb-5">
            {FEATURES.map((feature) => (
              <label key={feature.id} className="flex gap-3 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.features[feature.id]}
                  onChange={() => toggleFeature(feature.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold">{feature.title}</span>
                  <span className="block text-xs text-slate-500">{feature.detail}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleCreate}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Generate key'}
          </button>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit features" onClose={() => setEditing(null)}>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={editing.name}
            onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-4"
          />
          <div className="space-y-2 mb-5">
            {FEATURES.map((feature) => (
              <label key={feature.id} className="flex gap-3 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.features[feature.id]}
                  onChange={() =>
                    setEditing((prev) => ({
                      ...prev,
                      features: { ...prev.features, [feature.id]: !prev.features[feature.id] },
                    }))
                  }
                  className="mt-1"
                />
                <span className="text-sm font-semibold">{feature.title}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={busyId === editing.id + 'edit'}
            onClick={saveEdit}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save
          </button>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 text-white text-sm px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-500" aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
