import { useState, useEffect, useMemo } from 'react'
import { useTranslate } from '../lib/i18n'
import api from '../services/api'

const FEEDBACK_CATEGORIES = [
  'General',
  'Bug Report',
  'Feature Request',
  'Map / Places',
  'Account / Login',
  'Performance',
  'Other',
]

const FeedbackModal = ({ isOpen, onClose, user }) => {
  const tTitle = useTranslate('Send Feedback')
  const tSubtitle = useTranslate('We would love to hear what you think.')
  const tName = useTranslate('Your name')
  const tEmail = useTranslate('Email')
  const tCategory = useTranslate('Category')
  const tSubject = useTranslate('Subject')
  const tSubjectPh = useTranslate('Short summary (optional)')
  const tMessage = useTranslate('Message')
  const tMessagePh = useTranslate('Describe your feedback, issue or suggestion...')
  const tRating = useTranslate('How would you rate the app?')
  const tCancel = useTranslate('Cancel')
  const tSubmit = useTranslate('Send Feedback')
  const tSending = useTranslate('Sending...')
  const tThanks = useTranslate('Thank you! Your feedback has been received.')
  const tClose = useTranslate('Close')
  const tCharsLeft = useTranslate('characters left')
  const tRequired = useTranslate('Please write at least a few words.')
  const tAutofillNote = useTranslate('Name and email are taken from your account.')

  const initialCategory = useMemo(() => FEEDBACK_CATEGORIES[0], [])

  const [category, setCategory] = useState(initialCategory)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory)
      setSubject('')
      setMessage('')
      setRating(0)
      setHoverRating(0)
      setSubmitting(false)
      setSuccess(false)
      setError('')
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const userName = user?.name || ''
  const userEmail = user?.email || ''
  const MAX = 5000
  const charsLeft = MAX - message.length

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (message.trim().length < 5) {
      setError(tRequired)
      return
    }
    try {
      setSubmitting(true)
      await api.post('/feedback', {
        subject: subject.trim(),
        message: message.trim(),
        category,
        rating: rating || null,
      })
      setSuccess(true)
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send feedback. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 sm:bg-black/50 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/30 overflow-hidden animate-slide-up sm:animate-fade-in max-h-[92vh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-primary-50/80 to-primary-100/40">
          <div className="min-w-0">
            <h2
              id="feedback-modal-title"
              className="text-lg font-bold text-slate-800 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {tTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{tSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 -mr-1 rounded-lg hover:bg-white/70 active:bg-white text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            aria-label={tClose}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800">{tThanks}</h3>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-semibold shadow-md transition-colors"
            >
              {tClose}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4"
          >
            {/* Name + Email (autofilled, readonly) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {tName}
                </label>
                <input
                  type="text"
                  value={userName}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {tEmail}
                </label>
                <input
                  type="email"
                  value={userEmail}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">{tAutofillNote}</p>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {tCategory}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                {tRating}
              </label>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star === rating ? 0 : star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className="p-1 rounded transition-transform hover:scale-110"
                      aria-label={`${star} star`}
                    >
                      <svg
                        className={`w-7 h-7 ${active ? 'text-amber-400' : 'text-slate-300'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {tSubject}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={tSubjectPh}
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {tMessage} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                placeholder={tMessagePh}
                rows={5}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y min-h-[110px]"
              />
              <div className="flex justify-end text-[11px] text-slate-400 mt-1">
                {charsLeft} {tCharsLeft}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
              >
                {tCancel}
              </button>
              <button
                type="submit"
                disabled={submitting || message.trim().length < 5}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting && (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                {submitting ? tSending : tSubmit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default FeedbackModal
