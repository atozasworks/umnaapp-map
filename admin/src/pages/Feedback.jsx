import { useEffect, useState } from 'react'
import { fetchFeedbacks } from '../lib/api'

export default function Feedback() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await fetchFeedbacks({ page, limit })
        if (!cancelled) {
          setItems(data.feedback || [])
          setTotal(data.total || 0)
        }
      } catch (e) {
        console.error('Failed to load feedback', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, limit])

  return (
    <div>
      <h1 className="text-2xl font-semibold">User Feedback</h1>
      <p className="text-sm text-admin-muted mt-1">Recent feedback submissions from users.</p>

      <div className="mt-6">
        <div className="overflow-auto rounded-lg border border-admin-border">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-admin-950 text-admin-muted">
              <tr>
                <th className="w-48 p-2 text-left">Submitted</th>
                <th className="w-48 p-2 text-left">User</th>
                <th className="w-40 p-2 text-left">Email</th>
                <th className="w-24 p-2 text-left">Category</th>
                <th className="w-12 p-2 text-left">Rating</th>
                <th className="p-2 text-left">Subject & Message</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-admin-muted">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-admin-muted">No feedback found.</td>
                </tr>
              ) : (
                items.map((f) => (
                  <tr key={f.id} className="border-t border-admin-border">
                    <td className="p-2 text-admin-muted text-xs">{new Date(f.createdAt).toLocaleString()}</td>
                    <td className="p-2 font-medium">{f.userName || '—'}</td>
                    <td className="p-2 text-sm text-admin-muted">{f.userEmail}</td>
                    <td className="p-2">{f.category}</td>
                    <td className="p-2">{f.rating ?? '—'}</td>
                    <td className="p-2">
                      <div className="font-semibold">{f.subject}</div>
                      <div className="text-admin-muted text-sm mt-1 whitespace-pre-wrap">{f.message?.length > 300 ? f.message.slice(0, 300) + '…' : f.message}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-admin-muted">
          <div>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded px-3 py-1 bg-admin-950 text-admin-muted disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page * limit >= total}
              className="rounded px-3 py-1 bg-admin-950 text-admin-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
