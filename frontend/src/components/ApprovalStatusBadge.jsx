/**
 * Small pill showing a place's moderation state. Reused across place details,
 * user contributions, and admin views so the visual language is consistent.
 */
const STYLES = {
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
}

export default function ApprovalStatusBadge({ status, className = '' }) {
  const key = String(status || 'approved').toLowerCase()
  const s = STYLES[key]
  if (!s) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold flex-shrink-0 ${s.cls} ${className}`}
    >
      {s.label}
    </span>
  )
}
