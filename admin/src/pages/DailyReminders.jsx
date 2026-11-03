import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDailyReminders, sendDailyRemindersNow } from '../lib/api'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value ?? '—'}</p>
      {hint ? <p className="mt-1 text-xs text-admin-muted">{hint}</p> : null}
    </div>
  )
}

export default function DailyReminders() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [banner, setBanner] = useState(null)
  const pollRef = useRef(null)

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setErr('')
      setLoading(true)
    }
    try {
      const data = await fetchDailyReminders()
      setStats(data)
      return data
    } catch (e) {
      if (!quiet) setErr(e.response?.data?.error || e.message)
      return null
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const data = await load({ quiet: true })
      const run = data?.run
      if (!run || run.status !== 'running') {
        stopPolling()
        setSending(false)
        if (run?.status === 'done') {
          setBanner({
            kind: run.failed > 0 ? 'warn' : 'ok',
            text: `Drip finished — sent ${run.sent}, failed ${run.failed}, total ${run.total}.`,
            error: run.firstError || null,
          })
        }
      }
    }, 8000)
  }, [load, stopPolling])

  useEffect(() => {
    load()
    return stopPolling
  }, [load, stopPolling])

  useEffect(() => {
    if (stats?.run?.status === 'running') {
      setSending(true)
      startPolling()
    }
  }, [stats?.run?.status, startPolling])

  async function onSend() {
    const run = stats?.run
    const dripSize = run?.dripSize || 3
    const intervalMin = run?.intervalMinutes || 15
    const eligible = stats?.withEmail != null ? stats.withEmail - (stats.optedOut || 0) : null
    const msg =
      eligible != null
        ? `Start reminder drip for about ${eligible} user(s)?\n\nSends ${dripSize} emails now, then ${dripSize} every ${intervalMin} minutes automatically until done.`
        : `Start reminder drip?\n\nSends ${dripSize} emails now, then ${dripSize} every ${intervalMin} minutes until done.`
    if (!window.confirm(msg)) return

    setSending(true)
    setErr('')
    setBanner(null)
    try {
      const data = await sendDailyRemindersNow()
      setBanner({
        kind: 'ok',
        text:
          data.message ||
          `Drip started — ${data.dripSize || 3} users every ${data.intervalMinutes || 15} minutes.`,
      })
      await load({ quiet: true })
      startPolling()
    } catch (e) {
      setSending(false)
      setErr(e.response?.data?.error || e.message)
    }
  }

  const run = stats?.run
  const runRunning = run?.status === 'running'
  const dripSize = run?.dripSize || 3
  const intervalMin = run?.intervalMinutes || 15

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Daily reminders
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-admin-muted">
            Send reminders only from this admin screen. A click starts a drip of{' '}
            <span className="font-semibold text-slate-300">{dripSize} users</span> every{' '}
            <span className="font-semibold text-slate-300">{intervalMin} minutes</span> until the queue is
            finished.
          </p>
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={sending || loading || runRunning}
          className="inline-flex items-center justify-center rounded-xl bg-admin-accent px-5 py-2.5 text-sm font-semibold text-admin-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending || runRunning ? 'Drip running…' : 'Send reminder'}
        </button>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {stats?.error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {stats.error}
        </div>
      )}

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            banner.kind === 'warn'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {banner.text}
          {banner.error ? (
            <div className="mt-2 text-xs opacity-90">SMTP error: {banner.error}</div>
          ) : null}
        </div>
      )}

      {runRunning && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <div>
            Drip in progress — sent <strong>{run.sent}</strong> / {run.total}
            {run.failed ? `, failed ${run.failed}` : ''}, remaining{' '}
            <strong>{run.remaining ?? '—'}</strong>.
          </div>
          <div className="mt-1 text-sky-200/90">
            Next {dripSize} users at <strong>{fmtDate(run.nextBatchAt)}</strong>
            {run.waitingUntil ? ` · cooling down until ${fmtDate(run.waitingUntil)}` : ''}.
            Leave this running — no need to click again.
          </div>
        </div>
      )}

      {loading && !stats ? (
        <p className="text-sm text-admin-muted">Loading reminder stats…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total users" value={stats?.totalUsers} />
            <StatCard label="With email" value={stats?.withEmail} />
            <StatCard label="Opted out" value={stats?.optedOut} hint="Won't receive reminders" />
            <StatCard
              label="Eligible today"
              value={stats?.eligibleToday}
              hint="Not mailed yet today"
            />
            <StatCard label="Sent today" value={stats?.sentToday} hint="Including auto + manual" />
          </div>

          <section className="rounded-xl border border-admin-border bg-admin-900/40">
            <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Recent reminder activity</h2>
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="text-xs font-medium text-admin-accent hover:underline disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-admin-850/80 text-xs uppercase tracking-wide text-admin-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Last sent</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {(stats?.recent || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-admin-muted">
                        No reminders sent yet.
                      </td>
                    </tr>
                  ) : (
                    (stats.recent || []).map((u) => (
                      <tr key={u.id} className="text-slate-300">
                        <td className="px-4 py-3 font-medium text-white">{u.name || '—'}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3 tabular-nums">{fmtDate(u.lastDailyReminderAt)}</td>
                        <td className="px-4 py-3">
                          {u.dailyReminderOptOut ? (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                              Opted out
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
