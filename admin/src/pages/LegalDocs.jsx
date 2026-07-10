import { useCallback, useEffect, useState } from 'react'
import { fetchLegalDocuments, updateLegalDocument } from '../lib/api'

function fmtDate(iso) {
  if (!iso) return 'Not saved yet'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const TABS = [
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms & Conditions' },
]

export default function LegalDocs() {
  const [tab, setTab] = useState('privacy')
  const [docs, setDocs] = useState({})
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [notify, setNotify] = useState(true)
  const [result, setResult] = useState(null)

  const load = useCallback(async () => {
    setErr('')
    setResult(null)
    setLoading(true)
    try {
      const list = await fetchLegalDocuments()
      const byType = {}
      const draftByType = {}
      for (const d of list) {
        byType[d.type] = d
        draftByType[d.type] = { title: d.title, content: d.content }
      }
      setDocs(byType)
      setDrafts(draftByType)
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const current = docs[tab]
  const draft = drafts[tab] || { title: '', content: '' }
  const dirty =
    current && (draft.title !== current.title || draft.content !== current.content)

  function updateDraft(patch) {
    setDrafts((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patch } }))
  }

  async function onSave() {
    if (!draft.content.trim()) {
      setErr('Content cannot be empty')
      return
    }
    setSaving(true)
    setErr('')
    setResult(null)
    try {
      const data = await updateLegalDocument(tab, {
        title: draft.title,
        content: draft.content,
        notify,
      })
      setDocs((prev) => ({ ...prev, [tab]: data.document }))
      setDrafts((prev) => ({
        ...prev,
        [tab]: { title: data.document.title, content: data.document.content },
      }))
      setResult({
        notified: data.notified,
        version: data.document.version,
      })
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Legal documents</h1>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          Edit the <span className="font-semibold text-slate-300">Privacy Policy</span> and{' '}
          <span className="font-semibold text-slate-300">Terms &amp; Conditions</span> shown to users in the app.
          When you save with notifications enabled, <span className="font-semibold text-slate-300">every user is
          emailed</span> that the policy changed. Use a line starting with{' '}
          <code className="rounded bg-admin-850 px-1 text-admin-accent">#</code> for section headings.
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Saved as version {result.version}.{' '}
          {result.notified
            ? 'Users are being emailed about the change in the background.'
            : 'Email notification was skipped.'}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-admin-border bg-admin-850 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                setErr('')
                setResult(null)
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.key ? 'bg-admin-accent/20 text-admin-accent' : 'text-admin-muted hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading || saving}
          className="rounded-xl border border-admin-border bg-admin-850 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-admin-800 disabled:opacity-50"
        >
          Reload
        </button>
      </div>

      {loading ? (
        <p className="p-8 text-sm text-admin-muted">Loading…</p>
      ) : (
        <div className="space-y-6 rounded-2xl border border-admin-border bg-admin-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-admin-muted">
            <div>
              Current version:{' '}
              <span className="font-semibold text-slate-300">{current?.version ?? 1}</span>
              {current?.fromDefault && (
                <span className="ml-2 rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">
                  Default (not yet saved to DB)
                </span>
              )}
            </div>
            <div>Last updated: {fmtDate(current?.updatedAt)}</div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-admin-muted">
              Title
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              className="w-full rounded-xl border border-admin-border bg-admin-850 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-admin-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-admin-muted">
              Content
            </label>
            <textarea
              value={draft.content}
              onChange={(e) => updateDraft({ content: e.target.value })}
              rows={22}
              spellCheck
              className="w-full resize-y rounded-xl border border-admin-border bg-admin-850 px-3 py-3 font-mono text-sm leading-relaxed text-slate-100 outline-none transition focus:border-admin-accent"
            />
            <p className="mt-1.5 text-xs text-admin-muted">
              {draft.content.length.toLocaleString()} characters
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-admin-border pt-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="h-4 w-4 rounded border-admin-border bg-admin-850 accent-admin-accent"
              />
              Email all users about this change
            </label>
            <div className="flex items-center gap-3">
              {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !draft.content.trim()}
                className="rounded-xl bg-admin-accent px-5 py-2.5 text-sm font-semibold text-admin-900 transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save & notify users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
