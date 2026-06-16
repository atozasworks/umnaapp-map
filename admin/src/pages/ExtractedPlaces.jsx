import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchExtractedPlaces,
  fetchPlaceDetail,
  updatePlace,
  deletePlace,
  approvePlace,
  rejectPlace,
  bulkPlaceAction,
  fetchPlaceHistory,
  restorePlaceVersion,
} from '../lib/api'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

/** ISO timestamp → yyyy-mm-dd for <input type="date">. */
function toDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function osmEmbedUrl(lat, lng) {
  const pad = 0.01
  const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
}

function DetailRow({ label, children }) {
  if (children == null || children === '' || children === '—') return null
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-admin-muted">{label}</dt>
      <dd className="text-sm text-slate-200 break-words">{children}</dd>
    </div>
  )
}

function JsonSection({ title, data }) {
  if (data == null) return null
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  if (!text || text === '[]' || text === '{}') return null
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <pre className="max-h-48 overflow-auto rounded-lg border border-admin-border bg-admin-850/60 p-3 font-mono text-[11px] text-slate-300">
        {text}
      </pre>
    </section>
  )
}

function formatOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') return null
  const lines = []
  if (hours.open_now != null) {
    lines.push(`Open now: ${hours.open_now ? 'Yes' : 'No'}`)
  }
  if (Array.isArray(hours.weekday_text)) {
    lines.push(...hours.weekday_text)
  }
  return lines.length ? lines : null
}

const AUDIT_FIELD_LABELS = {
  placeNameEn: 'Name',
  placeNameLocal: 'Local name',
  category: 'Category',
  latitude: 'Latitude',
  longitude: 'Longitude',
  zoomLevel: 'Zoom level',
  approvalStatus: 'Approval status',
  source: 'Source',
  description: 'Description',
  phone: 'Phone',
  website: 'Website',
  fullAddress: 'Full address',
  vicinity: 'Vicinity',
  village: 'Village',
  taluk: 'Taluk',
  district: 'District',
  state: 'State',
  country: 'Country',
  pincode: 'Pincode',
  rating: 'Rating',
  reviewCount: 'Review count',
  businessStatus: 'Business status',
  googleMapsUrl: 'Google Maps URL',
  festivalStartDate: 'Festival start',
  festivalEndDate: 'Festival end',
  festivalRecurrence: 'Festival recurrence',
}

const AUDIT_ACTION_META = {
  created: { label: 'Place added', icon: '✨', cls: 'bg-emerald-500/20 text-emerald-300' },
  updated: { label: 'Place edited', icon: '✏️', cls: 'bg-blue-500/20 text-blue-300' },
  approved: { label: 'Approved', icon: '✅', cls: 'bg-emerald-500/20 text-emerald-300' },
  rejected: { label: 'Rejected', icon: '🚫', cls: 'bg-red-500/20 text-red-300' },
  deleted: { label: 'Deleted', icon: '🗑️', cls: 'bg-red-500/20 text-red-300' },
  restored: { label: 'Version restored', icon: '♻️', cls: 'bg-violet-500/20 text-violet-300' },
}

function fmtAuditVal(v) {
  if (v === null || v === undefined || v === '') return '—'
  const s = String(v)
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

function auditChangeRows(changes) {
  if (!changes || typeof changes !== 'object') return []
  return Object.entries(changes)
    .filter(([k]) => k in AUDIT_FIELD_LABELS)
    .map(([k, val]) => {
      const isDiff = val && typeof val === 'object' && ('old' in val || 'new' in val)
      return {
        key: k,
        label: AUDIT_FIELD_LABELS[k] || k,
        old: isDiff ? val.old : undefined,
        new: isDiff ? val.new : val,
        isDiff,
      }
    })
}

function PlaceHistorySection({ placeId, onRestored }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [restoringId, setRestoringId] = useState(null)
  const [openId, setOpenId] = useState(null)

  const loadHistory = useCallback(async () => {
    if (!placeId) return
    setLoading(true)
    setErr('')
    try {
      const { history: rows } = await fetchPlaceHistory(placeId)
      setHistory(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [placeId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  async function handleRestore(auditId) {
    if (!window.confirm('Restore this version? Current values will be overwritten and recorded in history.')) return
    setRestoringId(auditId)
    setErr('')
    try {
      await restorePlaceVersion(placeId, auditId)
      await loadHistory()
      onRestored?.()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
        Provenance &amp; audit trail
      </h3>
      {err && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {err}
        </div>
      )}
      {loading ? (
        <p className="text-xs text-admin-muted">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="text-xs text-admin-muted">No recorded history yet.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((entry) => {
            const meta = AUDIT_ACTION_META[entry.action] || { label: entry.action, icon: '•', cls: 'bg-admin-850 text-slate-300' }
            const rows = auditChangeRows(entry.changes)
            const canRestore =
              entry.snapshot &&
              typeof entry.snapshot === 'object' &&
              (entry.action === 'created' || entry.action === 'updated' || entry.action === 'restored')
            const open = openId === entry.id
            return (
              <li key={entry.id} className="rounded-lg border border-admin-border bg-admin-850/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-xs text-slate-300">{entry.actorName || 'Unknown'}</span>
                    <span className="text-[10px] uppercase tracking-wide text-admin-muted">{entry.actorType}</span>
                  </div>
                  <span className="text-[11px] text-admin-muted">{fmtDate(entry.createdAt)}</span>
                </div>
                {entry.note && <p className="mt-1 text-[11px] italic text-admin-muted">{entry.note}</p>}
                <div className="mt-1.5 flex items-center gap-3">
                  {rows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : entry.id)}
                      className="text-[11px] font-medium text-cyan-400 hover:underline"
                    >
                      {open ? 'Hide details' : `View ${rows.length} field${rows.length !== 1 ? 's' : ''}`}
                    </button>
                  )}
                  {canRestore && (
                    <button
                      type="button"
                      disabled={restoringId === entry.id}
                      onClick={() => handleRestore(entry.id)}
                      className="text-[11px] font-medium text-violet-300 hover:underline disabled:opacity-50"
                    >
                      {restoringId === entry.id ? 'Restoring…' : 'Restore this version'}
                    </button>
                  )}
                </div>
                {open && rows.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {rows.map((row) => (
                      <div key={row.key} className="rounded-md border border-admin-border bg-admin-900/60 px-2.5 py-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-admin-muted">{row.label}</p>
                        {row.isDiff ? (
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-red-300 line-through">{fmtAuditVal(row.old)}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-emerald-300">{fmtAuditVal(row.new)}</span>
                          </div>
                        ) : (
                          <p className="mt-0.5 text-xs text-slate-200">{fmtAuditVal(row.new)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function PlaceDetailPanel({ placeId, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})

  const load = useCallback(async () => {
    if (!placeId) return
    setLoading(true)
    setErr('')
    try {
      const { place } = await fetchPlaceDetail(placeId)
      setDetail(place)
      setForm({
        place_name_en: place.name || '',
        place_name_local: place.place_name_local || '',
        category: place.category || '',
        full_address: place.full_address || '',
        phone: place.phone || '',
        website: place.website || '',
        description: place.description || '',
        village: place.village || '',
        taluk: place.taluk || '',
        district: place.district || '',
        state: place.state || '',
        country: place.country || '',
        pincode: place.pincode || '',
        festival_start_date: toDateInput(place.festival_start_date),
        festival_end_date: toDateInput(place.festival_end_date),
        festival_recurrence: place.festival_recurrence || 'yearly',
      })
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [placeId])

  useEffect(() => {
    load()
  }, [load])

  async function saveEdit() {
    setBusy(true)
    setErr('')
    try {
      const payload = { ...form }
      // Convert festival date inputs (yyyy-mm-dd) to full ISO timestamps.
      if (form.category === 'Festival') {
        payload.festival_start_date = form.festival_start_date
          ? new Date(`${form.festival_start_date}T00:00:00`).toISOString()
          : null
        payload.festival_end_date = (form.festival_end_date || form.festival_start_date)
          ? new Date(`${form.festival_end_date || form.festival_start_date}T23:59:59`).toISOString()
          : null
        payload.festival_recurrence = form.festival_recurrence === 'none' ? 'none' : 'yearly'
      }
      await updatePlace(placeId, payload)
      setEdit(false)
      await load()
      onUpdated?.()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusy(false)
    }
  }

  async function runAction(action) {
    setBusy(true)
    setErr('')
    try {
      if (action === 'approve') await approvePlace(placeId)
      else if (action === 'reject') await rejectPlace(placeId)
      else if (action === 'delete') {
        if (!window.confirm('Delete this place permanently?')) {
          setBusy(false)
          return
        }
        await deletePlace(placeId)
        onUpdated?.()
        onClose()
        return
      }
      await load()
      onUpdated?.()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusy(false)
    }
  }

  const p = detail
  const photos = Array.isArray(p?.google_photos) ? p.google_photos : []
  const reviews = Array.isArray(p?.google_reviews) ? p.google_reviews : []
  const nearby = Array.isArray(p?.nearby_places) ? p.nearby_places : []
  const googleTypes = Array.isArray(p?.google_types) ? p.google_types : []
  const hourLines = formatOpeningHours(p?.opening_hours)
  const userPhotos = Array.isArray(p?.photos) ? p.photos : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-admin-border bg-admin-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{p?.name || 'Place details'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-admin-muted hover:bg-admin-850 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && <p className="text-sm text-admin-muted">Loading…</p>}
          {err && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}
          {!loading && p && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-admin-850 px-2.5 py-0.5 text-xs text-slate-300">{p.category}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    p.approvalStatus === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : p.approvalStatus === 'rejected'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {p.approvalStatus}
                </span>
                {p.google_place_id && (
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
                    {p.google_place_id}
                  </span>
                )}
              </div>

              {edit ? (
                <div className="space-y-3 rounded-xl border border-admin-border bg-admin-850/50 p-4">
                  {[
                    ['place_name_en', 'Name (EN)'],
                    ['place_name_local', 'Name (local)'],
                    ['category', 'Category'],
                    ['full_address', 'Address'],
                    ['phone', 'Phone'],
                    ['website', 'Website'],
                    ['village', 'Village'],
                    ['taluk', 'Taluk'],
                    ['district', 'District'],
                    ['state', 'State'],
                    ['country', 'Country'],
                    ['pincode', 'Pincode'],
                  ].map(([key, label]) => (
                    <label key={key} className="block text-xs text-admin-muted">
                      {label}
                      <input
                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-900 px-3 py-2 text-sm text-white"
                        value={form[key] || ''}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </label>
                  ))}
                  <label className="block text-xs text-admin-muted">
                    Description
                    <textarea
                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-900 px-3 py-2 text-sm text-white"
                      rows={3}
                      value={form.description || ''}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </label>
                  {form.category === 'Festival' && (
                    <div className="space-y-3 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3">
                      <p className="text-xs font-semibold text-fuchsia-300">🎪 Festival window</p>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-xs text-admin-muted">
                          Start date
                          <input
                            type="date"
                            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-900 px-3 py-2 text-sm text-white"
                            value={form.festival_start_date || ''}
                            onChange={(e) => setForm((f) => ({ ...f, festival_start_date: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-admin-muted">
                          End date
                          <input
                            type="date"
                            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-900 px-3 py-2 text-sm text-white"
                            value={form.festival_end_date || ''}
                            min={form.festival_start_date || undefined}
                            onChange={(e) => setForm((f) => ({ ...f, festival_end_date: e.target.value }))}
                          />
                        </label>
                      </div>
                      <label className="block text-xs text-admin-muted">
                        Repeats
                        <select
                          className="mt-1 w-full rounded-lg border border-admin-border bg-admin-900 px-3 py-2 text-sm text-white"
                          value={form.festival_recurrence || 'yearly'}
                          onChange={(e) => setForm((f) => ({ ...f, festival_recurrence: e.target.value }))}
                        >
                          <option value="yearly">Every year (same dates)</option>
                          <option value="none">One-time only</option>
                        </select>
                      </label>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={saveEdit}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdit(false)}
                      className="rounded-lg border border-admin-border px-4 py-2 text-sm text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                      Place identity
                    </h3>
                    <dl className="space-y-3">
                      <DetailRow label="Name (EN)">{p.place_name_en || p.name}</DetailRow>
                      <DetailRow label="Name (local)">{p.place_name_local}</DetailRow>
                      <DetailRow label="Category">{p.category}</DetailRow>
                      <DetailRow label="Google type">{p.google_type}</DetailRow>
                      <DetailRow label="Google types">
                        {googleTypes.length > 0 ? googleTypes.join(', ') : null}
                      </DetailRow>
                      <DetailRow label="Google place ID">
                        {p.google_place_id ? (
                          <span className="font-mono text-xs">{p.google_place_id}</span>
                        ) : null}
                      </DetailRow>
                      <DetailRow label="Source">{p.source}</DetailRow>
                    </dl>
                  </section>

                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                      Location
                    </h3>
                    <dl className="space-y-3">
                      <DetailRow label="Full address">{p.full_address}</DetailRow>
                      <DetailRow label="Vicinity">{p.vicinity}</DetailRow>
                      <DetailRow label="Village">{p.village}</DetailRow>
                      <DetailRow label="Taluk">{p.taluk}</DetailRow>
                      <DetailRow label="District">{p.district}</DetailRow>
                      <DetailRow label="State">{p.state}</DetailRow>
                      <DetailRow label="Country">{p.country}</DetailRow>
                      <DetailRow label="Pincode">{p.pincode}</DetailRow>
                      <DetailRow label="Coordinates">
                        <span className="font-mono text-xs">
                          {p.latitude?.toFixed(6)}, {p.longitude?.toFixed(6)} · zoom {p.zoomLevel}
                        </span>
                      </DetailRow>
                    </dl>
                  </section>

                  {(p.category === 'Festival' || p.festival_start_date) && (
                    <section>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
                        🎪 Festival window
                      </h3>
                      <dl className="space-y-3">
                        <DetailRow label="Start">{fmtDate(p.festival_start_date)}</DetailRow>
                        <DetailRow label="End">{fmtDate(p.festival_end_date)}</DetailRow>
                        <DetailRow label="Repeats">
                          {p.festival_recurrence === 'yearly' ? 'Every year' : p.festival_recurrence === 'none' ? 'One-time only' : null}
                        </DetailRow>
                        {p.festival && (
                          <DetailRow label="Next / status">
                            {p.festival.active
                              ? `Live now · ${p.festival.daysUntilEnd} day(s) left`
                              : `Starts in ${p.festival.daysUntilStart} day(s)`}
                          </DetailRow>
                        )}
                      </dl>
                    </section>
                  )}

                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                      Contact & links
                    </h3>
                    <dl className="space-y-3">
                      <DetailRow label="Phone">{p.phone}</DetailRow>
                      <DetailRow label="Website">
                        {p.website ? (
                          <a href={p.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                            {p.website}
                          </a>
                        ) : null}
                      </DetailRow>
                      <DetailRow label="Google Maps">
                        {p.google_maps_url ? (
                          <a
                            href={p.google_maps_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            Open in Google Maps
                          </a>
                        ) : p.google_place_id ? (
                          <a
                            href={`https://www.google.com/maps/place/?q=place_id:${p.google_place_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            Open by place ID
                          </a>
                        ) : null}
                      </DetailRow>
                    </dl>
                  </section>

                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                      Google ratings
                    </h3>
                    <dl className="space-y-3">
                      <DetailRow label="Rating">
                        {p.rating != null ? `${p.rating} ★` : null}
                      </DetailRow>
                      <DetailRow label="Review count">{p.review_count != null ? String(p.review_count) : null}</DetailRow>
                      <DetailRow label="Business status">{p.business_status}</DetailRow>
                      <DetailRow label="Description">{p.description}</DetailRow>
                    </dl>
                  </section>

                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-admin-muted">
                      Workflow
                    </h3>
                    <dl className="space-y-3">
                      <DetailRow label="Approval">{p.approvalStatus}</DetailRow>
                      {p.approvalStatus === 'pending' && p.pendingDaysRemaining != null ? (
                        <DetailRow label="Days until auto-approve">
                          {p.pendingDaysRemaining} {p.pendingDaysRemaining === 1 ? 'day' : 'days'}
                          {p.autoApproveDays != null ? ` (${p.autoApproveDays}-day period)` : ''}
                        </DetailRow>
                      ) : null}
                      <DetailRow label="Approved at">{fmtDate(p.approvedAt)}</DetailRow>
                      <DetailRow label="Auto-approve at">{fmtDate(p.autoApproveAt || p.auto_approve_at)}</DetailRow>
                      <DetailRow label="Contributor">
                        {p.user_name || '—'} {p.user_email ? `(${p.user_email})` : ''}
                      </DetailRow>
                      <DetailRow label="Extracted at">{fmtDate(p.extracted_at)}</DetailRow>
                      <DetailRow label="Created">{fmtDate(p.createdAt)}</DetailRow>
                      <DetailRow label="Updated">{fmtDate(p.updatedAt)}</DetailRow>
                    </dl>
                  </section>
                </>
              )}

              {hourLines?.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-white">Opening hours</h3>
                  <ul className="space-y-1 text-xs text-admin-muted">
                    {hourLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}

              <JsonSection title="Opening hours (periods)" data={p?.opening_hours?.periods} />

              {reviews.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-white">Google reviews</h3>
                  <ul className="space-y-3">
                    {reviews.map((r, i) => (
                      <li key={i} className="rounded-lg border border-admin-border bg-admin-850/40 p-3 text-sm">
                        <div className="font-medium text-slate-200">
                          {r.author_name} · {r.rating}★
                        </div>
                        <p className="mt-1 text-admin-muted">{r.text}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {nearby.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-white">Nearby places</h3>
                  <ul className="space-y-2">
                    {nearby.map((np, i) => (
                      <li key={i} className="rounded-lg border border-admin-border bg-admin-850/40 px-3 py-2 text-sm text-slate-200">
                        {np.name || np.place_name_en || JSON.stringify(np)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {userPhotos.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-white">User-uploaded photos</h3>
                  <ul className="space-y-1 text-xs text-admin-muted">
                    {userPhotos.map((ph) => (
                      <li key={ph.id}>
                        {ph.caption || 'Photo'} · {fmtDate(ph.createdAt)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {photos.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-white">Google photos</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {photos.map((ph, i) =>
                      ph.url ? (
                        <img
                          key={i}
                          src={ph.url}
                          alt=""
                          className="aspect-video w-full rounded-lg object-cover ring-1 ring-admin-border"
                        />
                      ) : null
                    )}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-sm font-semibold text-white">Map</h3>
                <iframe
                  title="Map location"
                  className="h-48 w-full rounded-xl border border-admin-border"
                  src={osmEmbedUrl(p.latitude, p.longitude)}
                  loading="lazy"
                />
              </section>

              <PlaceHistorySection placeId={placeId} onRestored={() => { load(); onUpdated?.() }} />
            </div>
          )}
        </div>

        {p && !edit && (
          <div className="flex flex-wrap gap-2 border-t border-admin-border p-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEdit(true)}
              className="rounded-lg border border-admin-border px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-admin-850"
            >
              Edit
            </button>
            {p.approvalStatus === 'pending' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction('approve')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction('reject')}
                  className="rounded-lg bg-amber-600/90 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Reject
                </button>
              </>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction('delete')}
              className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExtractedPlaces() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [hasGoogle, setHasGoogle] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [detailId, setDetailId] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      const res = await fetchExtractedPlaces({
        page,
        limit: 50,
        q: q.trim() || undefined,
        status: status || undefined,
        category: category || undefined,
        source: source || undefined,
        hasGoogle: hasGoogle ? '1' : undefined,
      })
      setData(res)
      setSelected(new Set())
    } catch (e) {
      setData(null)
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [page, q, status, category, source, hasGoogle])

  useEffect(() => {
    load()
  }, [load])

  const places = data?.places ?? []
  const allSelected = places.length > 0 && places.every((p) => selected.has(p.id))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(places.map((p) => p.id)))
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulk(action) {
    const ids = [...selected]
    if (!ids.length) return
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} places?`)) return
    setBusy(true)
    setErr('')
    try {
      await bulkPlaceAction(ids, action)
      await load()
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setBusy(false)
    }
  }

  const categories = useMemo(() => data?.categories ?? [], [data])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Extracted places</h1>
        <p className="mt-2 max-w-3xl text-sm text-admin-muted">
          Full Google Maps extraction data: search, filter, review details, approve, edit, or bulk manage.
        </p>
      </header>

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-admin-border bg-admin-900/50 p-4">
        <label className="min-w-[180px] flex-1 text-xs text-admin-muted">
          Search
          <input
            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white"
            placeholder="Name, address, village, place ID…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="text-xs text-admin-muted">
          Status
          <select
            className="mt-1 block rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="text-xs text-admin-muted">
          Category
          <select
            className="mt-1 block max-w-[160px] rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-admin-muted">
          Source
          <select
            className="mt-1 block rounded-lg border border-admin-border bg-admin-850 px-3 py-2 text-sm text-white"
            value={source}
            onChange={(e) => {
              setSource(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All</option>
            <option value="contribution">Contribution</option>
            <option value="saved">Saved</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hasGoogle}
            onChange={(e) => {
              setHasGoogle(e.target.checked)
              setPage(1)
            }}
          />
          Google ID only
        </label>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-xl border border-admin-border bg-admin-850 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-admin-800 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
          <span className="text-sm text-cyan-200">{selected.size} selected</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk('approve')}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Approve all
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk('reject')}
            className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Reject all
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => bulk('delete')}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Delete all
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-admin-border bg-admin-900/50">
        {loading ? (
          <p className="p-8 text-sm text-admin-muted">Loading…</p>
        ) : places.length === 0 ? (
          <p className="p-8 text-sm text-admin-muted">No places match your filters.</p>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border text-xs uppercase tracking-wider text-admin-muted">
                <th className="px-3 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-3 py-3 font-medium">Place</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Google type</th>
                <th className="px-3 py-3 font-medium">Address / village</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Rating</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Days left</th>
                <th className="px-3 py-3 font-medium">Extracted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {places.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer text-slate-200 hover:bg-admin-850/60"
                  onClick={() => setDetailId(p.id)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">{p.name}</div>
                    {p.google_place_id && (
                      <div className="mt-0.5 font-mono text-[10px] text-admin-muted">
                        {p.google_place_id.slice(0, 24)}…
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-admin-muted">{p.category}</td>
                  <td className="max-w-[120px] truncate px-3 py-3 text-admin-muted" title={p.google_type}>
                    {p.google_type || '—'}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-3 text-admin-muted" title={p.full_address}>
                    {p.full_address || [p.village, p.district].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-admin-muted">{p.phone || '—'}</td>
                  <td className="px-3 py-3 text-admin-muted">
                    {p.rating != null ? `${p.rating} (${p.review_count ?? 0})` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        p.approvalStatus === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : p.approvalStatus === 'rejected'
                            ? 'bg-red-500/15 text-red-300'
                            : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {p.approvalStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-admin-muted">
                    {p.approvalStatus === 'pending' && p.pendingDaysRemaining != null ? (
                      <span className={p.pendingDaysRemaining <= 1 ? 'text-amber-300' : ''}>
                        {p.pendingDaysRemaining} {p.pendingDaysRemaining === 1 ? 'day' : 'days'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-admin-muted">
                    {fmtDate(p.extracted_at || p.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-admin-muted">
          <span>
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-admin-border px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-admin-border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {detailId && (
        <PlaceDetailPanel placeId={detailId} onClose={() => setDetailId(null)} onUpdated={load} />
      )}
    </div>
  )
}
