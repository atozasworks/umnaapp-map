import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import ApprovalStatusBadge from '../components/ApprovalStatusBadge'

const TABS = [
  { id: 'places', label: 'Places Added' },
  { id: 'pending', label: 'Pending Approvals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'photos', label: 'Photos' },
  { id: 'favorites', label: 'Favorites' },
]

function StatCard({ value, label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    primary: 'bg-primary-50 text-primary-700',
  }
  return (
    <div className={`rounded-xl px-3 py-3 text-center ${tones[tone] || tones.slate}`}>
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="text-[11px] mt-1 font-medium opacity-80">{label}</div>
    </div>
  )
}

export default function MyContributionsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('places')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/users/me/contributions')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your contributions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = data?.stats
  const badges = data?.badges || []

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-3 sm:px-4 h-14 max-w-3xl mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex-1">My Contributions</h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 space-y-4">
        {loading && <p className="text-center text-slate-500 py-12">Loading…</p>}
        {!loading && error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {/* Statistics */}
            <section className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <StatCard value={stats.totalContributions} label="Total" tone="primary" />
              <StatCard value={stats.approvedPlaces} label="Approved" tone="emerald" />
              <StatCard value={stats.pendingPlaces} label="Pending" tone="amber" />
              <StatCard value={stats.rejectedPlaces} label="Rejected" tone="red" />
              <StatCard value={stats.reviews} label="Reviews" />
              <StatCard value={stats.contributionScore} label="Score" tone="primary" />
            </section>

            {badges.length > 0 && (
              <section className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1 text-xs font-semibold">
                    🏅 {b.label}
                  </span>
                ))}
              </section>
            )}

            {/* Tabs */}
            <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map((t) => {
                const count =
                  t.id === 'places' ? data.places.all.length
                  : t.id === 'pending' ? data.places.pending.length
                  : t.id === 'reviews' ? data.reviews.length
                  : t.id === 'photos' ? data.photos.length
                  : data.favorites.length
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      tab === t.id ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label} ({count})
                  </button>
                )
              })}
            </nav>

            {/* Tab content */}
            <section className="space-y-2">
              {(tab === 'places' || tab === 'pending') &&
                (tab === 'places' ? data.places.all : data.places.pending).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/home?place=${p.id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 text-left hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{p.place_name_en || p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.category}{p.district ? ` · ${p.district}` : ''}</p>
                    </div>
                    <ApprovalStatusBadge status={p.approvalStatus} />
                  </button>
                ))}

              {tab === 'reviews' && data.reviews.map((r) => (
                <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800 truncate">{r.placeName || 'Place'}</p>
                    <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                </div>
              ))}

              {tab === 'photos' && (
                <div className="grid grid-cols-3 gap-2">
                  {data.photos.map((ph) => (
                    <img key={ph.id} src={ph.dataUrl} alt={ph.caption || ph.placeName || 'Photo'} className="aspect-square object-cover rounded-xl border border-slate-100" />
                  ))}
                </div>
              )}

              {tab === 'favorites' && data.favorites.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => navigate(`/home?lat=${f.latitude}&lng=${f.longitude}`)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 text-left hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{f.name}</p>
                    {f.category && <p className="text-xs text-slate-500 truncate">{f.category}</p>}
                  </div>
                </button>
              ))}

              {/* Empty states */}
              {tab === 'places' && data.places.all.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">You haven't added any places yet.</p>}
              {tab === 'pending' && data.places.pending.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">No places awaiting approval.</p>}
              {tab === 'reviews' && data.reviews.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">No reviews yet.</p>}
              {tab === 'photos' && data.photos.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">No photos uploaded yet.</p>}
              {tab === 'favorites' && data.favorites.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">No favorites saved yet.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
