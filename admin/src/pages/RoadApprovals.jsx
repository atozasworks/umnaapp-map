import { useCallback, useEffect, useState } from 'react'
import { fetchRoads, reviewRoad } from '../lib/api'

const tabs = ['pending', 'approved', 'rejected']
const dateLabel = (value) => value ? new Date(value).toLocaleString() : '—'

export default function RoadApprovals() {
  const [status, setStatus] = useState('pending')
  const [roads, setRoads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchRoads(status)
      setRoads(data.roads || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load roads')
      setRoads([])
    } finally { setLoading(false) }
  }, [status])

  useEffect(() => { load() }, [load])

  const decide = async (road, action) => {
    setBusyId(road.id)
    try {
      await reviewRoad(road.id, action)
      await load()
    } catch (err) {
      setError(err.response?.data?.error || err.message || `Could not ${action} road`)
    } finally { setBusyId(null) }
  }

  return <section className="space-y-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-admin-accent">Community contributions</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Road approvals</h1>
      <p className="mt-1 text-sm text-admin-muted">Review GPS recorded roads and approve them to show their geometry on the map.</p>
    </header>
    <div className="flex gap-2 border-b border-admin-border">
      {tabs.map((value) => <button key={value} onClick={() => setStatus(value)} className={`border-b-2 px-4 py-2 text-sm capitalize ${status === value ? 'border-admin-accent text-white' : 'border-transparent text-admin-muted hover:text-white'}`}>{value}</button>)}
    </div>
    {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
    {loading ? <p className="text-sm text-admin-muted">Loading roads…</p> : roads.length === 0 ? <div className="rounded-xl border border-admin-border bg-admin-900/50 p-8 text-center text-sm text-admin-muted">No {status} road submissions.</div> : <div className="grid gap-4 xl:grid-cols-2">
      {roads.map((road) => <article key={road.id} className="overflow-hidden rounded-xl border border-admin-border bg-admin-900/60">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-border p-4">
          <div><h2 className="text-lg font-semibold text-white">{road.name}</h2><p className="mt-1 text-xs text-admin-muted">Submitted {dateLabel(road.createdAt)} · {road.userName || 'Unknown contributor'} {road.userEmail ? `(${road.userEmail})` : ''}</p></div>
          <span className="rounded bg-amber-500/15 px-2 py-1 text-xs capitalize text-amber-200">{road.approvalStatus}</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Detail label="Road type" value={road.roadType} /><Detail label="Surface" value={road.surface} /><Detail label="Direction" value={road.direction} /><Detail label="Speed limit" value={road.speedLimit ? `${road.speedLimit} km/h` : 'Not provided'} />
          <Detail label="GPS points" value={road.geometry?.coordinates?.length || 0} /><Detail label="Geometry" value={road.geometry?.type || 'Unavailable'} />
          <div className="sm:col-span-2"><Detail label="Description" value={road.description || 'No description'} /></div>
          {Array.isArray(road.photos) && road.photos.length > 0 && <div className="sm:col-span-2"><p className="mb-2 text-xs uppercase tracking-wide text-admin-muted">Photos</p><div className="flex flex-wrap gap-2">{road.photos.map((photo, index) => <a key={index} href={photo} target="_blank" rel="noreferrer"><img src={photo} alt={`${road.name} road ${index + 1}`} className="h-24 w-24 rounded-lg object-cover" /></a>)}</div></div>}
        </div>
        {status === 'pending' && <footer className="flex justify-end gap-2 border-t border-admin-border p-4"><button disabled={busyId === road.id} onClick={() => decide(road, 'reject')} className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-50">Reject</button><button disabled={busyId === road.id} onClick={() => decide(road, 'approve')} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{busyId === road.id ? 'Saving…' : 'Approve road'}</button></footer>}
      </article>)}
    </div>}
  </section>
}

function Detail({ label, value }) { return <div><p className="text-xs uppercase tracking-wide text-admin-muted">{label}</p><p className="mt-1 break-words text-sm text-slate-100">{value}</p></div> }
