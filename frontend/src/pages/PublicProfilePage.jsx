import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

function formatJoined(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/users/${id}/public`)
      setData(res.data)
    } catch (err) {
      setError(err.response?.status === 404 ? 'User not found.' : (err.response?.data?.error || 'Failed to load profile.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const user = data?.user
  const stats = data?.stats
  const badges = data?.badges || []

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-3 sm:px-4 h-14 max-w-2xl mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex-1">Profile</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-3 sm:px-4 py-5 space-y-4">
        {loading && <p className="text-center text-slate-500 py-12">Loading…</p>}
        {!loading && error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">{error}</div>
        )}

        {!loading && !error && data?.private && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">🔒</div>
            <p className="text-base font-semibold text-slate-700">{user?.name}</p>
            <p className="text-sm text-slate-500 mt-1">This profile is private.</p>
          </div>
        )}

        {!loading && !error && data && !data.private && user && (
          <>
            <section className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500">Joined {formatJoined(user.joinedDate)}</p>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white border border-slate-100 px-3 py-3 text-center">
                <div className="text-xl font-bold text-slate-800">{stats.approvedPlaces}</div>
                <div className="text-[11px] text-slate-500 mt-1">Places</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 px-3 py-3 text-center">
                <div className="text-xl font-bold text-slate-800">{stats.reviews}</div>
                <div className="text-[11px] text-slate-500 mt-1">Reviews</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 px-3 py-3 text-center">
                <div className="text-xl font-bold text-slate-800">{stats.photos}</div>
                <div className="text-[11px] text-slate-500 mt-1">Photos</div>
              </div>
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

            {data.contributions?.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Recent contributions</h2>
                <ul className="space-y-2">
                  {data.contributions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/home?place=${p.id}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 text-left hover:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{p.place_name_en || p.name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.category}{p.district ? ` · ${p.district}` : ''}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.reviews?.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Recent reviews</h2>
                <ul className="space-y-2">
                  {data.reviews.map((r) => (
                    <li key={r.id} className="p-3 bg-white rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-800 truncate">{r.placeName || 'Place'}</p>
                        <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      </div>
                      {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
