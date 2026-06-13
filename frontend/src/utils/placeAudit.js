/**
 * Shared helpers for rendering a place's provenance / audit trail.
 * Mirrors the audited field set defined on the backend (services/placeAudit.js).
 */

export const AUDIT_FIELD_META = {
  placeNameEn: { label: 'Name', type: 'text' },
  placeNameLocal: { label: 'Local name', type: 'text' },
  category: { label: 'Category', type: 'text' },
  latitude: { label: 'Latitude', type: 'coord' },
  longitude: { label: 'Longitude', type: 'coord' },
  zoomLevel: { label: 'Zoom level', type: 'number' },
  approvalStatus: { label: 'Approval status', type: 'status' },
  source: { label: 'Source', type: 'text' },
  description: { label: 'Description', type: 'text' },
  phone: { label: 'Phone', type: 'text' },
  website: { label: 'Website', type: 'text' },
  fullAddress: { label: 'Full address', type: 'text' },
  vicinity: { label: 'Vicinity', type: 'text' },
  village: { label: 'Village', type: 'text' },
  taluk: { label: 'Taluk', type: 'text' },
  district: { label: 'District', type: 'text' },
  state: { label: 'State', type: 'text' },
  country: { label: 'Country', type: 'text' },
  pincode: { label: 'Pincode', type: 'text' },
  rating: { label: 'Rating', type: 'number' },
  reviewCount: { label: 'Review count', type: 'number' },
  businessStatus: { label: 'Business status', type: 'text' },
  googleMapsUrl: { label: 'Google Maps URL', type: 'text' },
  festivalStartDate: { label: 'Festival start', type: 'date' },
  festivalEndDate: { label: 'Festival end', type: 'date' },
  festivalRecurrence: { label: 'Festival recurrence', type: 'text' },
}

export const ACTION_META = {
  created: { label: 'Place added', icon: '✨', color: '#0F9D58', tone: 'green' },
  updated: { label: 'Place edited', icon: '✏️', color: '#4285F4', tone: 'blue' },
  approved: { label: 'Approved', icon: '✅', color: '#0F9D58', tone: 'green' },
  rejected: { label: 'Rejected', icon: '🚫', color: '#DC2626', tone: 'red' },
  deleted: { label: 'Deleted', icon: '🗑️', color: '#DC2626', tone: 'red' },
  restored: { label: 'Version restored', icon: '♻️', color: '#7C3AED', tone: 'purple' },
}

export function actionMeta(action) {
  return ACTION_META[action] || { label: action || 'Change', icon: '•', color: '#64748B', tone: 'slate' }
}

export function fieldLabel(key) {
  return AUDIT_FIELD_META[key]?.label || key
}

export function actorTypeLabel(type) {
  if (type === 'admin') return 'Moderator'
  if (type === 'system') return 'System'
  return 'Contributor'
}

/** Format an audited value for display based on its field type. */
export function formatAuditValue(key, value) {
  if (value === null || value === undefined || value === '') return '—'
  const type = AUDIT_FIELD_META[key]?.type || 'text'
  switch (type) {
    case 'coord':
      return Number(value).toFixed(6)
    case 'number':
      return String(value)
    case 'status':
      return String(value).charAt(0).toUpperCase() + String(value).slice(1)
    case 'date': {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return String(value)
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    default: {
      const s = String(value)
      return s.length > 160 ? `${s.slice(0, 160)}…` : s
    }
  }
}

/** Convert a changes object `{ field: { old, new } }` into an array of rows. */
export function changesToRows(changes) {
  if (!changes || typeof changes !== 'object') return []
  return Object.entries(changes)
    .filter(([key]) => key in AUDIT_FIELD_META)
    .map(([key, val]) => {
      const isDiff = val && typeof val === 'object' && ('old' in val || 'new' in val)
      return {
        key,
        label: fieldLabel(key),
        old: isDiff ? val.old : undefined,
        new: isDiff ? val.new : val,
        isDiff,
      }
    })
}

/** Relative "time ago" string for timeline entries. */
export function timeAgo(dateInput) {
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return ''
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatAuditTimestamp(dateInput) {
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
