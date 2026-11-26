import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const POLL_MS = 3000

const STEP_LABEL = {
  start: 'Starting…',
  import: 'Step 1 of 2 — downloading open place data',
  add: 'Step 2 of 2 — checking duplicates and adding places',
}

/**
 * Admin only: add every catalogue place of the typed region to the map in one go.
 * The server downloads the area's open data, removes duplicates and adds the
 * places in the background; this box only starts the job and shows its progress.
 */
const RegionAutoAddBox = ({ regionString, hasCountry }) => {
  const [job, setJob] = useState(null)
  const [limits, setLimits] = useState({ maxAreaKm2: null, maxPlaces: null })
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [reviewOnly, setReviewOnly] = useState(false)
  const timerRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/map/open-places/auto-add')
      setJob(data.job || null)
      setLimits({ maxAreaKm2: data.maxAreaKm2, maxPlaces: data.maxPlaces })
    } catch {
      /* keep the last known state; the next poll tries again */
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const running = job?.status === 'running'
  useEffect(() => {
    if (!running) return undefined
    timerRef.current = setInterval(refresh, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [running, refresh])

  const start = async () => {
    if (!hasCountry) {
      setError('Country is required (e.g. India).')
      return
    }
    const ok = window.confirm(
      `Add all open-data places in "${regionString}" to the map?\n\n` +
        (reviewOnly
          ? 'Every place will wait for admin approval.'
          : 'High-confidence places become visible to everyone at once; the rest wait for admin approval.')
    )
    if (!ok) return
    setStarting(true)
    setError('')
    try {
      const { data } = await api.post('/map/open-places/auto-add', { region: regionString, reviewOnly })
      setJob(data.job)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start. Try again.')
      if (err.response?.data?.job) setJob(err.response.data.job)
    } finally {
      setStarting(false)
    }
  }

  const s = job?.summary
  return (
    <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <button
          type="button"
          onClick={start}
          disabled={starting || running || !regionString}
          title="Admin: add every place of this region to the map, no selection needed"
          className="h-8 shrink-0 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? 'Working…' : starting ? 'Starting…' : 'Extract & add all'}
        </button>
        <label className="flex items-center gap-1 text-[11px] text-slate-700">
          <input
            type="checkbox"
            checked={reviewOnly}
            onChange={(e) => setReviewOnly(e.target.checked)}
            disabled={running}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Hold all for approval
        </label>
        <span className="text-[10px] font-medium uppercase tracking-wide text-indigo-700">Admin</span>
      </div>

      {!job && !error && (
        <p className="mt-1.5 text-[10px] leading-snug text-slate-600">
          Adds the region&apos;s places straight to the map, without picking them one by one
          {limits.maxPlaces ? ` (area up to ${limits.maxAreaKm2} km², 300 places per run)` : ''}.
        </p>
      )}

      {error && <p className="mt-1.5 text-[11px] font-medium text-red-700">{error}</p>}

      {job && (
        <div className="mt-1.5 text-[11px] leading-snug text-slate-700" role="status">
          <p className="truncate font-semibold text-slate-800" title={job.regionName}>
            {job.regionName}
          </p>
          {running && (
            <>
              <p>{STEP_LABEL[job.step] || 'Working…'}</p>
              {job.message && <p className="truncate text-slate-500">{job.message}</p>}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">This takes several minutes. You can close this panel.</p>
            </>
          )}
          {job.status === 'failed' && <p className="font-medium text-red-700">Failed: {job.error}</p>}
          {job.status === 'done' && s && (
            <>
              <p>
                Checked {s.checked} · <span className="font-semibold text-emerald-700">{s.approved} added</span> ·{' '}
                <span className="font-semibold text-amber-700">{s.review} waiting for approval</span> · {s.duplicates}{' '}
                duplicates · {s.skipped} skipped
                {s.failed ? ` · ${s.failed} failed` : ''}
              </p>
              {s.checked === 0 && s.remaining === 0 && (
                <p className="text-slate-500">Nothing new: every open-data place of this area was handled earlier.</p>
              )}
              {s.remaining > 0 && (
                <p className="font-medium text-indigo-700">
                  {s.remaining} more place(s) are waiting — press the button again to continue.
                </p>
              )}
              {s.approved + s.review > 0 && (
                <p className="text-slate-500">Reload the map to see the new places.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default RegionAutoAddBox
