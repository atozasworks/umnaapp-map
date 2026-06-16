import { useState } from 'react'
import api from '../services/api'

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'other', label: 'Other' },
]

/**
 * Business ownership claim form. A user submits proof-of-association details;
 * an admin reviews the claim in the admin panel and approves or rejects it.
 */
export default function ClaimBusinessModal({ place, existingClaim, onClose, onSubmitted }) {
  const [role, setRole] = useState(existingClaim?.role || 'owner')
  const [contactPhone, setContactPhone] = useState('')
  const [message, setMessage] = useState(existingClaim?.message || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const placeName = place?.place_name_en || place?.name || 'this place'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const { data } = await api.post(`/map/places/${place.id}/claim`, {
        role,
        contactPhone: contactPhone.trim() || undefined,
        message: message.trim() || undefined,
      })
      onSubmitted?.(data.claim)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to submit claim.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-slate-800">Claim this business</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-500">
            Tell us how you're associated with <span className="font-semibold text-slate-700">{placeName}</span>.
            An admin will review your request and verify ownership.
          </p>

          {existingClaim?.status === 'rejected' && (
            <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
              Your previous claim was not approved{existingClaim.reviewNote ? `: ${existingClaim.reviewNote}` : '.'} You can submit again.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your role</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    role === r.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact phone (optional)</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="So we can verify you"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Anything that helps us verify your association with this business…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : existingClaim ? 'Resubmit claim' : 'Submit claim'}
          </button>
        </form>
      </div>
    </div>
  )
}
